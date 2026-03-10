import type { Asset, AssetPrediction, AssetConsensusResult, Expert, PredictionDirection } from "@/types";
import { calculateIssueCredibility } from "./credibility";

/**
 * 자산별 전문가 컨센서스 계산 (적중률 압도적 가중)
 *
 * 10만명 전문가 풀에서 각 자산별 전문가들의 과거 예측 적중률을 분석하고,
 * 적중률이 높은 전문가의 현재 전망에 압도적으로 큰 가중치를 부여.
 *
 * 가중치 = (과거 적중도 × 0.8) + (자산 관련 도메인 신뢰도 × 0.2)
 * → 적중률이 전체 확률 산출의 80%를 좌우
 */

/** 자산 카테고리 → 관련 전문가 도메인 매핑 */
const ASSET_DOMAIN_MAP: Record<string, string[]> = {
  // 금리
  "us-fed-rate": ["금리통화정책", "거시경제", "국제금융"],
  "us-10y-yield": ["금리통화정책", "채권", "거시경제"],
  "kr-base-rate": ["금리통화정책", "한국경제", "거시경제"],
  // 환율
  "usd-krw": ["외환", "한국경제", "국제금융", "거시경제"],
  "dxy": ["외환", "국제금융", "거시경제"],
  "usd-jpy": ["외환", "국제금융"],
  // 원자재
  "gold": ["원자재", "거시경제", "국제금융"],
  "wti-oil": ["원자재", "에너지", "거시경제"],
  "copper": ["원자재", "거시경제", "글로벌공급망"],
  // 지수
  "kospi": ["주식시장", "한국경제", "거시경제"],
  "sp500": ["주식시장", "거시경제", "국제금융"],
  "nasdaq": ["주식시장", "AI기술", "반도체"],
  "kosdaq": ["주식시장", "한국경제"],
  // 산업
  "semiconductor": ["반도체", "AI기술", "글로벌공급망"],
  "ai-tech": ["AI기술", "주식시장", "거시경제"],
  "ev-battery": ["에너지", "글로벌공급망", "원자재"],
  "bio-pharma": ["헤지펀드", "주식시장", "거시경제"],
  "defense": ["군사안보", "지정학리스크", "경제안보"],
  "shipbuilding": ["글로벌공급망", "에너지", "한국경제"],
};

/**
 * 자산에 대한 전문가 가중치 산출
 * ★ 과거 적중률(80%) + 도메인 신뢰도(20%)
 * 적중률이 압도적으로 가중치를 좌우 — 맞춘 사람의 말이 가장 중요
 */
function getAssetExpertWeight(expert: Expert, assetId: string): number {
  const domains = ASSET_DOMAIN_MAP[assetId] || [];
  const issueCredibility = calculateIssueCredibility(expert, domains);
  return (expert.accuracyScore * 0.8 + issueCredibility * 0.2) / 100;
}

/**
 * 방향 → 숫자 변환 (가중 평균 계산용)
 * 상승: +1, 하락: -1, 보합: 0, 변동성확대: 0 (방향 중립)
 */
function directionToScore(direction: PredictionDirection): number {
  switch (direction) {
    case "상승": return 1;
    case "하락": return -1;
    case "보합": return 0;
    case "변동성확대": return 0;
  }
}

/**
 * 가중 평균 점수 → 방향 변환
 */
function scoreToDirection(score: number, volatilityWeight: number): PredictionDirection {
  if (volatilityWeight > 0.4) return "변동성확대";
  if (score > 0.25) return "상승";
  if (score < -0.25) return "하락";
  return "보합";
}

/**
 * 자산별 전문가 컨센서스 계산
 */
export function calculateAssetConsensus(
  asset: Asset,
  predictions: AssetPrediction[],
  allExperts: Expert[]
): AssetConsensusResult {
  const expertMap = new Map(allExperts.map((e) => [e.id, e]));
  const activePredictions = predictions.filter((p) => p.assetId === asset.id && p.result === "미결");

  let weightedSum = 0;
  let totalWeight = 0;
  let bullCount = 0;
  let bearCount = 0;
  let neutralCount = 0;
  let volatilityWeight = 0;
  let totalVolatilityW = 0;
  const credibilities: number[] = [];

  for (const pred of activePredictions) {
    const expert = expertMap.get(pred.expertId);
    if (!expert) continue;

    const weight = getAssetExpertWeight(expert, asset.id);
    const score = directionToScore(pred.direction);

    weightedSum += score * weight * (pred.confidence / 100);
    totalWeight += weight;

    if (pred.direction === "상승") bullCount++;
    else if (pred.direction === "하락") bearCount++;
    else if (pred.direction === "변동성확대") {
      volatilityWeight += weight;
      neutralCount++;
    } else neutralCount++;

    totalVolatilityW += weight;
    credibilities.push(expert.credibilityScore);
  }

  const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const volRatio = totalVolatilityW > 0 ? volatilityWeight / totalVolatilityW : 0;
  const direction = scoreToDirection(avgScore, volRatio);

  const confidence = totalWeight > 0
    ? Math.round(Math.abs(avgScore) * 100 * Math.min(1, activePredictions.length / 3))
    : 0;

  const avgCred = credibilities.length > 0
    ? Math.round(credibilities.reduce((a, b) => a + b, 0) / credibilities.length)
    : 0;

  // 신뢰도 상위 예측 (가중치 기준 정렬)
  const topPredictions = activePredictions
    .filter((p) => expertMap.has(p.expertId))
    .map((p) => ({ pred: p, weight: getAssetExpertWeight(expertMap.get(p.expertId)!, asset.id) }))
    .filter((x) => x.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((x) => x.pred);

  return {
    assetId: asset.id,
    direction,
    confidence: Math.min(confidence, 100),
    bullCount,
    bearCount,
    neutralCount,
    avgExpertCredibility: avgCred,
    topPredictions,
  };
}

/**
 * 자산 예측 적중률 계산
 */
export function calculateAssetAccuracy(assetId: string, predictions: AssetPrediction[]) {
  const resolved = predictions.filter((p) => p.assetId === assetId && p.result && p.result !== "미결");
  if (resolved.length === 0) return { total: 0, correct: 0, partial: 0, incorrect: 0, rate: 0 };

  const correct = resolved.filter((p) => p.result === "적중").length;
  const partial = resolved.filter((p) => p.result === "부분적중").length;
  const incorrect = resolved.filter((p) => p.result === "불일치").length;

  return {
    total: resolved.length,
    correct,
    partial,
    incorrect,
    rate: Math.round(((correct + partial * 0.5) / resolved.length) * 100),
  };
}
