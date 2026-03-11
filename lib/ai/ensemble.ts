/**
 * 앙상블 모델
 * 5개 서브모델의 투표를 가중 결합하고, AI 토론 + 배심원 평가를 거쳐 최종 예측을 생성한다.
 *
 * 파이프라인: 서브모델 투표 → 12라운드 토론 → 30인 배심원 심의 → 최종 예측
 */

import { PriceBar } from "./indicators";
import {
  Direction,
  ModelVote,
  CrossAssetInput,
  momentumModel,
  meanReversionModel,
  volatilityModel,
  correlationModel,
  fundamentalModel,
} from "./models";
import type { CollectedData } from "./dataCollector";
import type { FundamentalSignal } from "./fundamentalAnalysis";
import { type AdvancedSignals } from "./advancedAnalysis";
import type { HistoricalPatternResult } from "./historicalPatternAnalysis";
import { runDebate, type DebateResult } from "./debateSystem";
import { runJuryDeliberation, type JuryDebateInput, type JuryDeliberation } from "./jurySystem";

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

export interface EnsembleConfig {
  momentumWeight: number;       // default 0.25
  meanReversionWeight: number;  // default 0.20
  volatilityWeight: number;     // default 0.15
  correlationWeight: number;    // default 0.20
  fundamentalWeight: number;    // default 0.20
}

export interface SubModelVotes {
  momentum: ModelVote;
  meanReversion: ModelVote;
  volatility: ModelVote;
  correlation: ModelVote;
  fundamental: ModelVote;
}

export interface TimingPrediction {
  entrySignal: "강력매수" | "매수" | "관망" | "매도" | "강력매도";
  expectedPeakDays: number;   // 예상 고점까지 남은 일수
  expectedTroughDays: number; // 예상 저점까지 남은 일수
  expectedReturnPercent: number; // 예상 수익률 (%)
  stopLossPercent: number;    // 손절 기준 (%)
  holdingPeriodDays: number;  // 권장 보유 기간 (일)
  trendDurationDays: number;  // 예상 추세 지속 기간 (일)
  entryTiming: string;        // 진입 타이밍 설명
  exitTiming: string;         // 이탈 타이밍 설명
  riskReward: number;         // 리스크/리워드 비율
}

export interface AIPrediction {
  assetId: string;
  direction: Direction;
  probability: number;     // 0-100
  confidence: number;      // 0-100
  rationale: string;       // 종합 한국어 분석
  subModelVotes: SubModelVotes;
  generatedAt: string;     // ISO date
  cycleId: string;
  timingPrediction?: TimingPrediction | null;
  historicalAnalysis?: {
    regime: string;
    regimeConfidence: number;
    historicalBias: {
      direction: "상승" | "하락" | "보합";
      strength: number;
      similarPeriodCount: number;
      avgReturnAfter: number;
      winRate: number;
    };
    patterns: Array<{ name: string; signal: string }>;
  } | null;
  debateResult?: {
    agreementLevel: string;
    consensusDirection: Direction;
    consensusConfidence: number;
    keyArguments: string[];
    resolvedConflicts: string[];
    unresolvedConflicts: string[];
  } | null;
  juryVerdict?: {
    finalVerdict: string;
    finalConfidence: number;
    verdictSummary: { trust: number; partialTrust: number; doubt: number; distrust: number };
    dissentingCount: number;
  } | null;
}

// ─── 기본 설정 ────────────────────────────────────────────────────────────────

export const DEFAULT_ENSEMBLE_CONFIG: EnsembleConfig = {
  momentumWeight: 0.25,
  meanReversionWeight: 0.20,
  volatilityWeight: 0.15,
  correlationWeight: 0.20,
  fundamentalWeight: 0.20,
};

// ─── 헬퍼 함수 ────────────────────────────────────────────────────────────────

/**
 * 가중치 합이 1.0이 되도록 정규화한다.
 */
export function normalizeWeights(config: EnsembleConfig): EnsembleConfig {
  const total =
    config.momentumWeight +
    config.meanReversionWeight +
    config.volatilityWeight +
    config.correlationWeight +
    (config.fundamentalWeight ?? 0);

  if (total === 0) return { ...DEFAULT_ENSEMBLE_CONFIG };

  return {
    momentumWeight: config.momentumWeight / total,
    meanReversionWeight: config.meanReversionWeight / total,
    volatilityWeight: config.volatilityWeight / total,
    correlationWeight: config.correlationWeight / total,
    fundamentalWeight: (config.fundamentalWeight ?? 0) / total,
  };
}

/**
 * 방향별 가중 점수를 집계하여 최종 방향을 결정한다.
 */
function resolveDirection(
  votes: SubModelVotes,
  weights: EnsembleConfig,
  historicalBiasEntry?: { direction: Direction; confidence: number; weight: number },
): { direction: Direction; weightedConfidence: number } {
  const directionScores: Record<Direction, number> = {
    "상승": 0,
    "하락": 0,
    "보합": 0,
    "변동성확대": 0,
  };

  // 각 모델의 투표를 방향별로 가중 점수에 반영
  const entries: [keyof SubModelVotes, number, ModelVote][] = [
    ["momentum", weights.momentumWeight, votes.momentum],
    ["meanReversion", weights.meanReversionWeight, votes.meanReversion],
    ["volatility", weights.volatilityWeight, votes.volatility],
    ["correlation", weights.correlationWeight, votes.correlation],
    ["fundamental", weights.fundamentalWeight, votes.fundamental],
  ];

  let totalWeightedConfidence = 0;

  for (const [, weight, vote] of entries) {
    // 점수 = 모델 가중치 × 모델 확신도
    const score = weight * vote.confidence;
    directionScores[vote.direction] += score;
    totalWeightedConfidence += weight * vote.confidence;
  }

  // 역사적 패턴 바이어스를 6번째 입력으로 추가
  if (historicalBiasEntry) {
    const score = historicalBiasEntry.weight * historicalBiasEntry.confidence;
    directionScores[historicalBiasEntry.direction] += score;
    totalWeightedConfidence += historicalBiasEntry.weight * historicalBiasEntry.confidence;
  }

  // 최다 점수 방향 선택
  let bestDirection: Direction = "보합";
  let bestScore = -1;
  for (const [dir, score] of Object.entries(directionScores) as [Direction, number][]) {
    if (score > bestScore) {
      bestScore = score;
      bestDirection = dir;
    }
  }

  return {
    direction: bestDirection,
    weightedConfidence: totalWeightedConfidence,
  };
}

/**
 * 4개 모델의 근거를 종합하여 한국어 분석 리포트를 생성한다.
 */
function generateCombinedRationale(
  votes: SubModelVotes,
  finalDirection: Direction,
  probability: number,
  historicalPatternResult?: HistoricalPatternResult | null,
): string {
  const directionLabel: Record<Direction, string> = {
    "상승": "상승",
    "하락": "하락",
    "보합": "보합(횡보)",
    "변동성확대": "변동성 확대",
  };

  const parts: string[] = [];

  parts.push(`종합 판단: ${directionLabel[finalDirection]} (확률 ${probability}%)`);
  parts.push("");
  parts.push(`▸ 모멘텀 분석: ${votes.momentum.rationale}`);
  parts.push(`  → 판단: ${votes.momentum.direction} (확신도 ${votes.momentum.confidence}%)`);
  parts.push("");
  parts.push(`▸ 평균회귀 분석: ${votes.meanReversion.rationale}`);
  parts.push(`  → 판단: ${votes.meanReversion.direction} (확신도 ${votes.meanReversion.confidence}%)`);
  parts.push("");
  parts.push(`▸ 변동성 분석: ${votes.volatility.rationale}`);
  parts.push(`  → 판단: ${votes.volatility.direction} (확신도 ${votes.volatility.confidence}%)`);
  parts.push("");
  parts.push(`▸ 상관관계 분석: ${votes.correlation.rationale}`);
  parts.push(`  → 판단: ${votes.correlation.direction} (확신도 ${votes.correlation.confidence}%)`);
  parts.push("");
  parts.push(`▸ 펀더멘털 분석: ${votes.fundamental.rationale}`);
  parts.push(`  → 판단: ${votes.fundamental.direction} (확신도 ${votes.fundamental.confidence}%)`);

  if (historicalPatternResult) {
    parts.push("");
    parts.push(`▸ 역사적 패턴 분석: ${historicalPatternResult.rationale}`);
    parts.push(`  → 시장 레짐: ${historicalPatternResult.regime} (확신도 ${historicalPatternResult.regimeConfidence}%)`);
    parts.push(`  → 역사적 바이어스: ${historicalPatternResult.historicalBias.direction} (강도 ${historicalPatternResult.historicalBias.strength}%, 승률 ${historicalPatternResult.historicalBias.winRate.toFixed(1)}%)`);
    parts.push(`  → 유사 기간: ${historicalPatternResult.historicalBias.similarPeriodCount}건, 평균 수익률: ${historicalPatternResult.historicalBias.avgReturnAfter > 0 ? "+" : ""}${historicalPatternResult.historicalBias.avgReturnAfter.toFixed(2)}%`);
  }

  return parts.join("\n");
}

function generateCycleId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "");
  const random = Math.random().toString(36).slice(2, 8);
  return `cycle_${dateStr}_${timeStr}_${random}`;
}

// ─── 타이밍 예측 생성 ─────────────────────────────────────────────────────────

function generateTimingPrediction(
  direction: Direction,
  probability: number,
  confidence: number,
  data: PriceBar[],
  votes: SubModelVotes,
  debateResult: DebateResult | null,
  juryResult: JuryDeliberation | null,
  historicalResult: HistoricalPatternResult | null,
): TimingPrediction {
  // 모멘텀 강도와 변동성으로 추세 지속 기간 추정
  const recentData = data.slice(-20);
  const avgPrice = recentData.reduce((s, d) => s + d.close, 0) / recentData.length;
  const latestPrice = data[data.length - 1].close;
  const priceDeviation = ((latestPrice - avgPrice) / avgPrice) * 100;

  // 변동성 계산 (최근 20일 표준편차)
  const returns = [];
  for (let i = 1; i < recentData.length; i++) {
    returns.push((recentData[i].close - recentData[i - 1].close) / recentData[i - 1].close * 100);
  }
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const volatility = Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length);

  // 모멘텀 확신도로 추세 강도 판단
  const momentumConf = votes.momentum.confidence;
  const meanRevConf = votes.meanReversion.confidence;

  // 추세 지속 기간 추정 (모멘텀이 강하면 길고, 평균회귀가 강하면 짧음)
  let trendDuration = 7; // 기본 7일
  if (momentumConf > 70) trendDuration += 7;
  if (momentumConf > 60) trendDuration += 3;
  if (meanRevConf > 70) trendDuration -= 4;
  if (volatility > 2) trendDuration -= 2;

  // 역사적 패턴 반영
  if (historicalResult?.historicalBias) {
    const { avgReturnAfter, winRate } = historicalResult.historicalBias;
    if (winRate > 0.7) trendDuration += 5;
    if (Math.abs(avgReturnAfter) > 0.03) trendDuration += 3;
  }

  trendDuration = Math.max(3, Math.min(30, trendDuration));

  // 예상 수익률 계산
  let expectedReturn = probability * 0.05 * (confidence / 100);

  // 배심원/토론 보정
  if (juryResult) {
    const mult: Record<string, number> = { "신뢰": 1.3, "부분신뢰": 1.0, "의심": 0.7, "불신": 0.4 };
    expectedReturn *= mult[juryResult.finalVerdict] ?? 1.0;
  }
  if (debateResult?.consensus.agreementLevel === "만장일치") expectedReturn *= 1.2;
  if (direction === "하락") expectedReturn = -expectedReturn;

  // 손절 기준 (변동성 기반)
  const stopLoss = Math.max(1.0, volatility * 1.5);

  // 리스크/리워드 비율
  const riskReward = Math.abs(expectedReturn) / stopLoss;

  // 고점/저점까지 남은 일수 추정
  let peakDays: number;
  let troughDays: number;
  if (direction === "상승") {
    peakDays = Math.round(trendDuration * 0.7);
    troughDays = Math.max(1, Math.round(trendDuration * 0.3));
  } else if (direction === "하락") {
    troughDays = Math.round(trendDuration * 0.7);
    peakDays = Math.max(1, Math.round(trendDuration * 0.3));
  } else {
    peakDays = Math.round(trendDuration * 0.5);
    troughDays = Math.round(trendDuration * 0.5);
  }

  // 진입 시그널 결정
  let entrySignal: TimingPrediction["entrySignal"] = "관망";
  const totalScore = (probability / 100) * 0.4 + (confidence / 100) * 0.3;
  let bonusScore = 0;
  if (juryResult) {
    const b: Record<string, number> = { "신뢰": 0.3, "부분신뢰": 0.15, "의심": -0.1, "불신": -0.3 };
    bonusScore += b[juryResult.finalVerdict] ?? 0;
  }
  if (debateResult) {
    const b: Record<string, number> = { "만장일치": 0.2, "다수결": 0.1, "분열": -0.05, "교착": -0.15 };
    bonusScore += b[debateResult.consensus.agreementLevel] ?? 0;
  }
  const finalScore = totalScore + bonusScore;

  if (direction === "상승") {
    if (finalScore >= 0.75) entrySignal = "강력매수";
    else if (finalScore >= 0.55) entrySignal = "매수";
  } else if (direction === "하락") {
    if (finalScore >= 0.75) entrySignal = "강력매도";
    else if (finalScore >= 0.55) entrySignal = "매도";
  }

  // 보유 기간
  let holdingPeriod = trendDuration;
  if (entrySignal === "관망") holdingPeriod = 0;

  // 진입/이탈 타이밍 설명 생성
  let entryTiming: string;
  let exitTiming: string;

  if (entrySignal === "강력매수") {
    entryTiming = `현재가 매수 적기. ${peakDays}일 내 고점 도달 예상. 분할매수로 진입 권장.`;
    exitTiming = `목표 수익률 +${Math.abs(expectedReturn).toFixed(1)}% 도달 시 50% 익절. 잔여분은 추세 확인 후 청산. 손절 기준: -${stopLoss.toFixed(1)}%`;
  } else if (entrySignal === "매수") {
    entryTiming = `소량 진입 후 ${Math.round(peakDays * 0.5)}일 내 추가 확인 시 비중 확대. 약 ${peakDays}일 후 고점 예상.`;
    exitTiming = `+${Math.abs(expectedReturn).toFixed(1)}% 도달 시 일부 익절. 추세 약화 시 전량 청산. 손절: -${stopLoss.toFixed(1)}%`;
  } else if (entrySignal === "강력매도") {
    entryTiming = `보유 시 즉시 매도 검토. ${troughDays}일 내 저점 도달 예상. 신규 매수 금지.`;
    exitTiming = `${Math.abs(expectedReturn).toFixed(1)}% 추가 하락 예상. 반등 시 추가 매도 기회. 하락 추세 ${trendDuration}일 지속 전망.`;
  } else if (entrySignal === "매도") {
    entryTiming = `보유분 일부 매도로 리스크 축소. ${troughDays}일 내 추가 하락 가능성.`;
    exitTiming = `하락 모멘텀 약화 확인 후 재진입 검토. 현재 추세 약 ${trendDuration}일 지속 전망.`;
  } else {
    entryTiming = `신규 진입 보류. 시장 방향 확인 후 재평가. 약 ${Math.min(peakDays, troughDays)}일 내 방향성 확인 예상.`;
    exitTiming = `명확한 방향성 확인까지 포지션 유지 또는 축소. ${trendDuration}일 이내 재평가 필요.`;
  }

  return {
    entrySignal,
    expectedPeakDays: peakDays,
    expectedTroughDays: troughDays,
    expectedReturnPercent: Math.round(expectedReturn * 10) / 10,
    stopLossPercent: Math.round(stopLoss * 10) / 10,
    holdingPeriodDays: holdingPeriod,
    trendDurationDays: trendDuration,
    entryTiming,
    exitTiming,
    riskReward: Math.round(riskReward * 100) / 100,
  };
}

// ─── 메인 앙상블 함수 ─────────────────────────────────────────────────────────

export interface EnsembleInput {
  assetId: string;
  data: PriceBar[];
  crossAssets?: CrossAssetInput[];
  config?: Partial<EnsembleConfig>;
  cycleId?: string;
  collectedData?: CollectedData | null;
  fundamentalSignals?: FundamentalSignal | null;
  advancedSignals?: AdvancedSignals | null;
  historicalPatternResult?: HistoricalPatternResult | null;
}

/**
 * 앙상블 예측을 수행한다.
 *
 * @param input - 대상 자산 데이터 및 교차자산 데이터
 * @returns 종합 AI 예측 결과
 */
export function runEnsemble(input: EnsembleInput): AIPrediction {
  const {
    assetId,
    data,
    crossAssets = [],
    config: partialConfig,
    cycleId,
    collectedData = null,
    fundamentalSignals = null,
    advancedSignals = null,
    historicalPatternResult = null,
  } = input;

  // 가중치 설정
  const rawConfig: EnsembleConfig = {
    ...DEFAULT_ENSEMBLE_CONFIG,
    ...partialConfig,
  };

  // 역사적 패턴 분석 결과가 있으면 가중치에 suggestedWeightAdjustment 적용
  if (historicalPatternResult?.suggestedWeightAdjustment) {
    const adj = historicalPatternResult.suggestedWeightAdjustment;
    rawConfig.momentumWeight *= adj.momentum;
    rawConfig.meanReversionWeight *= adj.meanReversion;
    rawConfig.volatilityWeight *= adj.volatility;
    rawConfig.correlationWeight *= adj.correlation;
    rawConfig.fundamentalWeight *= adj.fundamental;
  }

  const weights = normalizeWeights(rawConfig);

  // 1. 각 서브모델 실행
  const momentumVote = momentumModel(data, input.advancedSignals ?? undefined);
  const meanReversionVote = meanReversionModel(data, input.advancedSignals ?? undefined);
  const volatilityVote = volatilityModel(data, input.advancedSignals ?? undefined);

  // 상관관계 모델은 교차자산 데이터 포함
  const allAssets: CrossAssetInput[] = [
    { assetId, data },
    ...crossAssets,
  ];
  const correlationVote = correlationModel(assetId, allAssets);

  // 펀더멘털/매크로 모델
  const fundamentalVote = fundamentalModel(assetId, collectedData, fundamentalSignals);

  const subModelVotes: SubModelVotes = {
    momentum: momentumVote,
    meanReversion: meanReversionVote,
    volatility: volatilityVote,
    correlation: correlationVote,
    fundamental: fundamentalVote,
  };

  // 역사적 패턴의 modelReliability로 각 모델의 확신도 보정
  if (historicalPatternResult?.modelReliability) {
    const rel = historicalPatternResult.modelReliability;
    subModelVotes.momentum = { ...subModelVotes.momentum, confidence: subModelVotes.momentum.confidence * (rel.momentum / 100) };
    subModelVotes.meanReversion = { ...subModelVotes.meanReversion, confidence: subModelVotes.meanReversion.confidence * (rel.meanReversion / 100) };
    subModelVotes.volatility = { ...subModelVotes.volatility, confidence: subModelVotes.volatility.confidence * (rel.volatility / 100) };
    subModelVotes.correlation = { ...subModelVotes.correlation, confidence: subModelVotes.correlation.confidence * (rel.correlation / 100) };
    subModelVotes.fundamental = { ...subModelVotes.fundamental, confidence: subModelVotes.fundamental.confidence * (rel.fundamental / 100) };
  }

  // 2. AI 토론 실행 (12라운드)
  let debateResultData: DebateResult | null = null;
  let juryDeliberationData: JuryDeliberation | null = null;
  try {
    debateResultData = runDebate(subModelVotes, data, advancedSignals, collectedData);

    // 3. 배심원 심의 실행 (30인 배심원)
    const juryInput: JuryDebateInput = {
      predictedDirection: debateResultData.consensus.direction,
      confidence: debateResultData.consensus.confidence,
      bullishArguments: debateResultData.keyArguments.filter((a) => a.includes("상승") || a.includes("매수") || a.includes("강세")),
      bearishArguments: debateResultData.keyArguments.filter((a) => a.includes("하락") || a.includes("매도") || a.includes("약세")),
      consensusLevel: debateResultData.consensus.agreementLevel === "만장일치" ? "강한합의"
        : debateResultData.consensus.agreementLevel === "다수결" ? "합의"
        : debateResultData.consensus.agreementLevel === "분열" ? "약한합의"
        : "불일치",
      summary: debateResultData.keyArguments.join("; "),
    };
    juryDeliberationData = runJuryDeliberation(juryInput, data, advancedSignals, collectedData);
  } catch (err) {
    console.error("토론/배심원 실행 실패 (기존 앙상블로 계속):", err);
  }

  // 4. 가중 투표로 최종 방향 결정
  // 역사적 바이어스를 6번째 입력으로 추가 (가중치 0.15, 기존 모델 가중치를 비례 축소)
  let historicalBiasEntry: { direction: Direction; confidence: number; weight: number } | undefined;
  let adjustedWeights = weights;

  if (historicalPatternResult?.historicalBias) {
    const bias = historicalPatternResult.historicalBias;
    const historicalWeight = 0.15;
    const scaleFactor = 1 - historicalWeight;

    adjustedWeights = {
      momentumWeight: weights.momentumWeight * scaleFactor,
      meanReversionWeight: weights.meanReversionWeight * scaleFactor,
      volatilityWeight: weights.volatilityWeight * scaleFactor,
      correlationWeight: weights.correlationWeight * scaleFactor,
      fundamentalWeight: weights.fundamentalWeight * scaleFactor,
    };

    historicalBiasEntry = {
      direction: bias.direction as Direction,
      confidence: bias.strength,
      weight: historicalWeight,
    };
  }

  const { direction, weightedConfidence } = resolveDirection(subModelVotes, adjustedWeights, historicalBiasEntry);

  // 3. 확률 및 확신도 계산
  // probability: 해당 방향의 가중 점수 비율
  const allDirections: Direction[] = ["상승", "하락", "보합", "변동성확대"];
  const dirScores: Record<Direction, number> = { "상승": 0, "하락": 0, "보합": 0, "변동성확대": 0 };
  const entries: [number, ModelVote][] = [
    [adjustedWeights.momentumWeight, subModelVotes.momentum],
    [adjustedWeights.meanReversionWeight, subModelVotes.meanReversion],
    [adjustedWeights.volatilityWeight, subModelVotes.volatility],
    [adjustedWeights.correlationWeight, subModelVotes.correlation],
    [adjustedWeights.fundamentalWeight, subModelVotes.fundamental],
  ];
  for (const [w, v] of entries) {
    dirScores[v.direction] += w * v.confidence;
  }
  // 역사적 바이어스도 확률 계산에 반영
  if (historicalBiasEntry) {
    dirScores[historicalBiasEntry.direction] += historicalBiasEntry.weight * historicalBiasEntry.confidence;
  }
  const totalScore = allDirections.reduce((sum, d) => sum + dirScores[d], 0);
  const probability = totalScore > 0
    ? Math.round((dirScores[direction] / totalScore) * 100)
    : 25;

  // confidence: 가중 평균 확신도
  const confidence = Math.round(weightedConfidence);

  // 5. 역사적 분석 결과 포함
  const historicalAnalysis = historicalPatternResult
    ? {
        regime: String(historicalPatternResult.regime),
        regimeConfidence: historicalPatternResult.regimeConfidence,
        historicalBias: historicalPatternResult.historicalBias,
        patterns: historicalPatternResult.patterns.map((p) => ({
          name: String(p.name ?? ""),
          signal: String(p.currentSignal ?? ""),
        })),
      }
    : null;

  // 배심원 판정에 따른 확신도 보정
  let adjustedConfidence = confidence;
  let adjustedProbability = probability;
  if (juryDeliberationData) {
    const juryVerdict = juryDeliberationData.finalVerdict;
    if (juryVerdict === "불신") {
      adjustedConfidence = Math.round(confidence * 0.6);
      adjustedProbability = Math.round(probability * 0.7);
    } else if (juryVerdict === "의심") {
      adjustedConfidence = Math.round(confidence * 0.8);
      adjustedProbability = Math.round(probability * 0.85);
    } else if (juryVerdict === "부분신뢰") {
      adjustedConfidence = Math.round(confidence * 0.9);
    }
    // "신뢰"일 경우 보정 없음
  }

  // 토론 결과와 배심원 판정이 앙상블 방향과 다른 경우, 토론 합의가 강하면 방향 수정
  let finalDirection = direction;
  if (debateResultData && debateResultData.consensus.agreementLevel === "만장일치"
    && debateResultData.consensus.direction !== direction
    && debateResultData.consensus.confidence > 70) {
    finalDirection = debateResultData.consensus.direction;
  }

  const rationale = generateCombinedRationale(subModelVotes, finalDirection, adjustedProbability, historicalPatternResult);

  // 토론/배심원 정보를 근거에 추가
  let fullRationale = rationale;
  if (debateResultData) {
    fullRationale += `\n\n▸ AI 토론 결과: ${debateResultData.consensus.agreementLevel} (${debateResultData.consensus.direction}, 확신도 ${debateResultData.consensus.confidence}%)`;
    if (debateResultData.keyArguments.length > 0) {
      fullRationale += `\n  → 핵심 논점: ${debateResultData.keyArguments.slice(0, 3).join(", ")}`;
    }
  }
  if (juryDeliberationData) {
    fullRationale += `\n▸ 배심원 판정: ${juryDeliberationData.finalVerdict} (확신도 ${juryDeliberationData.finalConfidence}%)`;
    const vs = juryDeliberationData.verdictSummary;
    fullRationale += `\n  → 신뢰 ${vs.trust}명 / 부분신뢰 ${vs.partialTrust}명 / 의심 ${vs.doubt}명 / 불신 ${vs.distrust}명`;
  }

  // 6. 타이밍 예측 생성
  const timingPrediction = generateTimingPrediction(
    finalDirection,
    adjustedProbability,
    adjustedConfidence,
    data,
    subModelVotes,
    debateResultData,
    juryDeliberationData,
    historicalPatternResult,
  );

  return {
    assetId,
    direction: finalDirection,
    probability: Math.min(adjustedProbability, 95),
    confidence: Math.min(adjustedConfidence, 95),
    rationale: fullRationale,
    subModelVotes,
    generatedAt: new Date().toISOString(),
    cycleId: cycleId ?? generateCycleId(),
    timingPrediction,
    historicalAnalysis,
    debateResult: debateResultData ? {
      agreementLevel: debateResultData.consensus.agreementLevel,
      consensusDirection: debateResultData.consensus.direction,
      consensusConfidence: debateResultData.consensus.confidence,
      keyArguments: debateResultData.keyArguments,
      resolvedConflicts: debateResultData.resolvedConflicts,
      unresolvedConflicts: debateResultData.unresolvedConflicts,
    } : null,
    juryVerdict: juryDeliberationData ? {
      finalVerdict: juryDeliberationData.finalVerdict,
      finalConfidence: juryDeliberationData.finalConfidence,
      verdictSummary: juryDeliberationData.verdictSummary,
      dissentingCount: juryDeliberationData.dissentingOpinions.length,
    } : null,
  };
}
