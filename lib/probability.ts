import type { Issue, Expert, ScenarioType } from "@/types";
import { calculateIssueCredibility } from "./credibility";

/**
 * 알고리즘 기반 시나리오 확률 계산
 *
 * 원리:
 * 1. 이슈의 forecasts(전문가 개별 예측)를 수집
 * 2. 각 전문가의 이슈별 신뢰도 × 과거 적중도로 예측 확률을 가중 평균
 * 3. 전체 합이 100%가 되도록 정규화
 *
 * forecasts가 없는 시나리오는 supportingExperts의 신뢰도로 추정
 */

export interface AlgoProbabilityResult {
  scenarioId: string;
  scenarioType: ScenarioType;
  algorithmProbability: number;   // 알고리즘 산출 확률 (%)
  editorProbability: number;      // 편집자 설정 확률 (%)
  expertCount: number;            // 참여 전문가 수
  confidence: "high" | "medium" | "low"; // 데이터 신뢰 수준
  avgExpertCredibility: number;   // 참여 전문가 평균 신뢰도
}

export interface ProbabilityBreakdown {
  expertId: string;
  expertName: string;
  credibility: number;
  accuracy: number;
  weight: number;             // 최종 가중치
  forecastProbability: number; // 해당 전문가의 시나리오 확률 예측
}

/**
 * 전문가 가중치 산출
 * 신뢰도(60%) + 과거 적중도(40%)의 혼합으로 예측 신뢰성 반영
 */
function getExpertWeight(expert: Expert, issue: Issue): number {
  const issueCredibility = calculateIssueCredibility(expert, issue.tags);
  return (issueCredibility * 0.6 + expert.accuracyScore * 0.4) / 100;
}

/**
 * 이슈별 전체 시나리오에 대한 알고리즘 확률 계산
 */
export function calculateAlgorithmProbabilities(
  issue: Issue,
  allExperts: Expert[]
): AlgoProbabilityResult[] {
  const expertMap = new Map(allExperts.map((e) => [e.id, e]));

  // scenarioId → 가중 합산 데이터
  const weights: Map<
    string,
    { weightedSum: number; totalWeight: number; expertIds: string[] }
  > = new Map();

  for (const s of issue.scenarios) {
    weights.set(s.id, { weightedSum: 0, totalWeight: 0, expertIds: [] });
  }

  // ── Step 1: forecasts 기반 가중 평균 ──────────────────────────────────
  for (const fc of issue.forecasts) {
    const expert = expertMap.get(fc.expertId);
    if (!expert) continue;

    // forecasts의 scenario 필드는 ScenarioType, 시나리오의 type과 매칭
    const matchedScenario = issue.scenarios.find((s) => s.type === fc.scenario);
    if (!matchedScenario) continue;

    const w = getExpertWeight(expert, issue);
    const entry = weights.get(matchedScenario.id)!;
    entry.weightedSum += fc.probability * w;
    entry.totalWeight += w;
    if (!entry.expertIds.includes(fc.expertId)) {
      entry.expertIds.push(fc.expertId);
    }
  }

  // ── Step 2: forecasts 없는 시나리오는 supportingExperts로 보완 ──────
  for (const s of issue.scenarios) {
    const entry = weights.get(s.id)!;
    if (entry.totalWeight > 0) continue; // 이미 forecast 데이터 있음

    for (const eid of s.supportingExperts) {
      const expert = expertMap.get(eid);
      if (!expert) continue;

      const w = getExpertWeight(expert, issue);
      // 편집자 확률을 전문가의 암묵적 예측으로 사용
      entry.weightedSum += s.probability * w;
      entry.totalWeight += w;
      if (!entry.expertIds.includes(eid)) entry.expertIds.push(eid);
    }
  }

  // ── Step 3: 가중 평균 산출 & 정규화 ───────────────────────────────────
  const rawProbs: { scenarioId: string; raw: number }[] = [];
  let totalRaw = 0;

  for (const s of issue.scenarios) {
    const entry = weights.get(s.id)!;
    const raw =
      entry.totalWeight > 0
        ? entry.weightedSum / entry.totalWeight
        : s.probability; // 데이터 없으면 편집자 값 그대로
    rawProbs.push({ scenarioId: s.id, raw });
    totalRaw += raw;
  }

  // 정규화 (합계 = 100%)
  return rawProbs.map(({ scenarioId, raw }) => {
    const s = issue.scenarios.find((sc) => sc.id === scenarioId)!;
    const entry = weights.get(scenarioId)!;
    const algorithmProbability =
      totalRaw > 0 ? Math.round((raw / totalRaw) * 100) : s.probability;

    const participatingExperts = entry.expertIds
      .map((id) => expertMap.get(id))
      .filter(Boolean) as Expert[];

    const avgCred =
      participatingExperts.length > 0
        ? Math.round(
            participatingExperts.reduce((sum, e) => sum + e.credibilityScore, 0) /
              participatingExperts.length
          )
        : 0;

    const confidence: "high" | "medium" | "low" =
      participatingExperts.length >= 2
        ? "high"
        : participatingExperts.length === 1
        ? "medium"
        : "low";

    return {
      scenarioId,
      scenarioType: s.type,
      algorithmProbability,
      editorProbability: s.probability,
      expertCount: participatingExperts.length,
      confidence,
      avgExpertCredibility: avgCred,
    };
  });
}

/**
 * 단일 시나리오의 확률 산출 상세 근거 반환
 */
export function getProbabilityBreakdown(
  issue: Issue,
  scenarioId: string,
  allExperts: Expert[]
): ProbabilityBreakdown[] {
  const expertMap = new Map(allExperts.map((e) => [e.id, e]));
  const scenario = issue.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) return [];

  const breakdown: ProbabilityBreakdown[] = [];

  // forecasts에서 해당 시나리오 지지 전문가 찾기
  for (const fc of issue.forecasts) {
    if (fc.scenario !== scenario.type) continue;
    const expert = expertMap.get(fc.expertId);
    if (!expert) continue;

    const issueCredibility = calculateIssueCredibility(expert, issue.tags);
    const weight = getExpertWeight(expert, issue);

    breakdown.push({
      expertId: expert.id,
      expertName: expert.name,
      credibility: issueCredibility,
      accuracy: expert.accuracyScore,
      weight: Math.round(weight * 100) / 100,
      forecastProbability: fc.probability,
    });
  }

  // forecast 없는 supportingExperts
  for (const eid of scenario.supportingExperts) {
    if (breakdown.find((b) => b.expertId === eid)) continue; // 이미 있음
    const expert = expertMap.get(eid);
    if (!expert) continue;

    const issueCredibility = calculateIssueCredibility(expert, issue.tags);
    const weight = getExpertWeight(expert, issue);

    breakdown.push({
      expertId: expert.id,
      expertName: expert.name,
      credibility: issueCredibility,
      accuracy: expert.accuracyScore,
      weight: Math.round(weight * 100) / 100,
      forecastProbability: scenario.probability,
    });
  }

  return breakdown.sort((a, b) => b.weight - a.weight);
}

/** 확률 변화량 (알고리즘 - 편집자) */
export function getProbabilityDelta(result: AlgoProbabilityResult): number {
  return result.algorithmProbability - result.editorProbability;
}

/** 신뢰도 레이블 */
export function getConfidenceLabel(confidence: "high" | "medium" | "low"): {
  label: string;
  color: string;
} {
  switch (confidence) {
    case "high":
      return { label: "데이터 충분", color: "text-emerald-400" };
    case "medium":
      return { label: "데이터 보통", color: "text-yellow-400" };
    case "low":
      return { label: "데이터 부족", color: "text-slate-500" };
  }
}
