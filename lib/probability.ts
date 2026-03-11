import type { Issue, ScenarioType } from "@/types";

/**
 * AI 기반 시나리오 확률 계산
 * 전문가 시스템 제거 후 시나리오 자체 확률값 기반으로 동작
 */

export interface AlgoProbabilityResult {
  scenarioId: string;
  scenarioType: ScenarioType;
  algorithmProbability: number;
  editorProbability: number;
  expertCount: number;
  confidence: "high" | "medium" | "low";
  avgExpertCredibility: number;
}

export interface ProbabilityBreakdown {
  expertId: string;
  expertName: string;
  credibility: number;
  accuracy: number;
  weight: number;
  forecastProbability: number;
}

/**
 * 시나리오 확률 계산 (시나리오 자체 확률 기반)
 */
export function calculateAlgorithmProbabilities(
  issue: Issue,
  _allExperts: unknown[] = []
): AlgoProbabilityResult[] {
  const total = issue.scenarios.reduce((sum, s) => sum + s.probability, 0);

  return issue.scenarios.map((s) => ({
    scenarioId: s.id,
    scenarioType: s.type,
    algorithmProbability: total > 0 ? Math.round((s.probability / total) * 100) : s.probability,
    editorProbability: s.probability,
    expertCount: 0,
    confidence: "medium" as const,
    avgExpertCredibility: 0,
  }));
}

export function getProbabilityBreakdown(
  _issue: Issue,
  _scenarioId: string,
  _allExperts: unknown[] = []
): ProbabilityBreakdown[] {
  return [];
}

export function getProbabilityDelta(result: AlgoProbabilityResult): number {
  return result.algorithmProbability - result.editorProbability;
}

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
