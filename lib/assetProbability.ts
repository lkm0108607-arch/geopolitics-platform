import type { Asset, AssetPrediction, AssetConsensusResult, PredictionDirection } from "@/types";

/**
 * AI 기반 자산 컨센서스 계산
 * 전문가 시스템 제거 후 예측 데이터 자체를 기반으로 방향/확률 산출
 */

function directionToScore(direction: PredictionDirection): number {
  switch (direction) {
    case "상승": return 1;
    case "하락": return -1;
    case "보합": return 0;
    case "변동성확대": return 0;
  }
}

function scoreToDirection(score: number, volatilityRatio: number): PredictionDirection {
  if (volatilityRatio > 0.4) return "변동성확대";
  if (score > 0.25) return "상승";
  if (score < -0.25) return "하락";
  return "보합";
}

/**
 * 자산별 AI 컨센서스 계산
 */
export function calculateAssetConsensus(
  asset: Asset,
  predictions: AssetPrediction[],
  _allExperts: unknown[] = []
): AssetConsensusResult {
  const activePredictions = predictions.filter((p) => p.assetId === asset.id && p.result === "미결");

  let weightedSum = 0;
  let bullCount = 0;
  let bearCount = 0;
  let neutralCount = 0;
  let volatilityCount = 0;

  for (const pred of activePredictions) {
    const score = directionToScore(pred.direction);
    const weight = (pred.confidence / 100);
    weightedSum += score * weight;

    if (pred.direction === "상승") bullCount++;
    else if (pred.direction === "하락") bearCount++;
    else if (pred.direction === "변동성확대") volatilityCount++;
    else neutralCount++;
  }

  const total = activePredictions.length;
  const avgScore = total > 0 ? weightedSum / total : 0;
  const volRatio = total > 0 ? volatilityCount / total : 0;
  const direction = scoreToDirection(avgScore, volRatio);

  const confidence = total > 0
    ? Math.round(Math.abs(avgScore) * 100 * Math.min(1, total / 3))
    : 0;

  return {
    assetId: asset.id,
    direction,
    confidence: Math.min(confidence, 100),
    bullCount,
    bearCount,
    neutralCount: neutralCount + volatilityCount,
    avgExpertCredibility: 0,
    topPredictions: activePredictions.slice(0, 5),
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
