/**
 * 고도화된 학습 시스템
 *
 * 예측 실패 시 단순 가중치 조정을 넘어:
 *   1. 기술적 지표 세팅의 문제점 진단
 *   2. 거시경제 데이터 반영 오류 검토
 *   3. 각 서브모델(모멘텀/평균회귀/변동성/교차상관/펀더멘털)별 심층 원인 분석
 *   4. 가중투표 방식의 구조적 문제 검토
 *   5. 부족하거나 개선되어야 할 영역 도출
 *   6. 왜 맞추지 못했는지 근본 원인 규명
 *   7. 값의 오류/잘못된 세팅 여부 진단
 */

import { Direction, ModelVote } from "./models";
import { EnsembleConfig, SubModelVotes, AIPrediction, normalizeWeights } from "./ensemble";
import { PriceBar, calcSMA, calcEMA, calcRSI, calcATR, calcMACD, calcBollingerBands, calcROC, calcFibonacciLevels, calcMFI, calcKeltnerChannels, calcAroon, calcElderRay, calcTrix, calcCoppockCurve, calcMassIndex, calcPivotPoints } from "./indicators";

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

/** 개별 모델 진단 결과 */
export interface ModelDiagnosis {
  modelName: string;
  predicted: Direction;
  actual: Direction;
  wasCorrect: boolean;
  confidence: number;
  // 진단 상세
  issues: DiagnosisIssue[];
  // 개선 제안
  improvements: string[];
}

/** 진단된 이슈 */
export interface DiagnosisIssue {
  category: "지표_세팅" | "데이터_부족" | "값_오류" | "감도_문제" | "구조적_한계" | "외부_충격";
  severity: "심각" | "주의" | "경미";
  description: string;
  suggestedFix: string;
}

/** 앙상블 구조 진단 */
export interface EnsembleDiagnosis {
  // 가중투표 문제점
  votingIssues: string[];
  // 모델 간 충돌
  modelConflicts: string[];
  // 가중치 분포 문제
  weightDistributionIssue: string | null;
  // 다수결 오류 (다수가 틀린 경우)
  majorityWrong: boolean;
  // 소수 정답 모델 (소수만 맞았을 때)
  correctMinorityModels: string[];
}

/** 근본 원인 분석 */
export interface RootCauseAnalysis {
  primaryCause: string;
  secondaryCauses: string[];
  marketCondition: string;
  wasUnpredictable: boolean;
  unpredictableReason?: string;
}

export interface LearningResult {
  cycleId: string;
  assetId: string;
  predictedDirection: string;
  actualDirection: string;
  wasCorrect: boolean;
  missedFactors: string[];

  // 각 모델별 성과 (기존 호환)
  modelPerformance: {
    momentum: boolean;
    meanReversion: boolean;
    volatility: boolean;
    correlation: boolean;
    fundamental: boolean;
  };

  // 고도화된 진단
  modelDiagnoses: ModelDiagnosis[];
  ensembleDiagnosis: EnsembleDiagnosis;
  rootCause: RootCauseAnalysis;

  // 강화학습 점수
  modelScores: ModelScore[];
  totalScore: number;

  weightAdjustment: EnsembleConfig;
  lesson: string; // 종합 리포트 (한국어)

  // ── 고도화 확장 필드 ──
  advancedScores: AdvancedModelScore[];       // 고도화 점수
  performanceTrends?: ModelPerformanceTrend[]; // 모델 추세 분석
  adaptiveLearningRate: number;                // 현재 적응 학습률
  marketRegime: string;                        // 감지된 시장 레짐
  metaStats?: MetaLearningStats;               // 메타학습 통계
}

/** 고도화 점수 결과 */
export interface AdvancedModelScore {
  modelName: string;
  baseScore: number;            // 기존 기본 점수
  confidenceCalibrationBonus: number; // 확신도 보정 보너스/패널티
  regimeMultiplier: number;     // 시장 레짐 배수
  timelinessBonus: number;      // 적시성 보너스
  riskAdjustedScore: number;    // 위험 조정 점수
  streakBonus: number;          // 연속 성과 보너스
  finalScore: number;           // 최종 종합 점수
  reason: string;               // 점수 산출 사유
}

/** 적응 학습률 설정 */
export interface AdaptiveLearningConfig {
  baseRate: number;          // 0.003 기본값
  recentAccuracy: number;    // 0-1 최근 정확도
  marketVolatility: string;  // "low" | "normal" | "high" | "extreme"
  learningMomentum: number;  // -1 ~ 1, 양수 = 개선 중
}

/** 모델 성과 추세 */
export interface ModelPerformanceTrend {
  modelName: string;
  recentAccuracy: number;     // 최근 10건 정확도
  overallAccuracy: number;    // 전체 정확도
  trend: "improving" | "stable" | "degrading";
  confidenceCalibration: number; // 확신도↔결과 일치도
  bestMarketRegime: string;
  worstMarketRegime: string;
}

/** 모델 간 시너지 분석 결과 */
export interface ModelSynergyResult {
  pair: [string, string];
  agreementRate: number;      // 동의 비율
  bothCorrectRate: number;    // 동시 정답 비율
  synergyScore: number;       // 양수 = 좋은 조합, 음수 = 중복
}

/** 메타학습 통계 */
export interface MetaLearningStats {
  categoryFrequency: Record<string, number>;    // 진단 카테고리별 빈도
  modelTrajectories: Record<string, string>;    // 모델별 개선 궤적 ("improving" | "stable" | "degrading")
  marketConditionAccuracy: Record<string, number>; // 시장 상태별 정확도
  bestModelCombination: string;                 // 최고 성과 모델 조합
  worstModelCombination: string;                // 최저 성과 모델 조합
  avgScoresByModel: Record<string, { avg: number; trend: string }>; // 모델별 평균 점수 및 추세
}

export interface PredictionOutcome {
  prediction: AIPrediction;
  actualDirection: Direction;
  actualReturnPercent: number;
  postData?: PriceBar[];
  preData?: PriceBar[]; // 예측 시점의 데이터 (지표 재검증용)
}

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const WEIGHT_REWARD_BASE = 0.02;
const WEIGHT_PENALTY_BASE = -0.02;
const MIN_WEIGHT = 0.05;

// ─── 강화학습 점수 시스템 ──────────────────────────────────────────────────────

/** 모델별 강화학습 점수 계산 */
export interface ModelScore {
  modelName: string;
  score: number;        // 이번 라운드 획득 점수
  reason: string;       // 점수 사유
}

/**
 * 성공한 예측에 대해 점수를 부여하고, 실패에는 감점한다.
 * 점수는 가중치 조정 강도에 직접 반영된다.
 *
 * 점수 체계:
 * - 기본 적중: +10점
 * - 고확신 적중 (confidence >= 70%): +5점 보너스
 * - 어려운 시장에서 적중 (변동률 > 3%): +5점 보너스
 * - 방향 정확 + 강도 정확 (변동성확대 적중): +8점 보너스
 * - 소수파로서 맞춤 (다른 모델은 틀림): +10점 보너스
 * - 연속 적중 보너스 (streakCount 기반): +3점 * streak
 * - 기본 오답: -8점
 * - 고확신 오답 (confidence >= 70%): -5점 추가 감점
 * - 심각한 진단 이슈: -3점 * 이슈 수
 */
function calculateModelScore(
  diag: ModelDiagnosis,
  actual: Direction,
  actualReturn: number,
  isMinorityCorrect: boolean,
): ModelScore {
  let score = 0;
  const reasons: string[] = [];

  if (diag.wasCorrect) {
    // ── 적중 보상 ──
    score += 10;
    reasons.push("적중 +10");

    // 고확신 적중 보너스
    if (diag.confidence >= 70) {
      score += 5;
      reasons.push(`고확신(${diag.confidence}%) 적중 +5`);
    } else if (diag.confidence >= 55) {
      score += 2;
      reasons.push(`중확신 적중 +2`);
    }

    // 어려운 시장에서 적중 (변동률이 큰 시장)
    if (Math.abs(actualReturn) > 3) {
      score += 5;
      reasons.push(`고변동(${actualReturn > 0 ? "+" : ""}${actualReturn.toFixed(1)}%) 시장 적중 +5`);
    } else if (Math.abs(actualReturn) > 1.5) {
      score += 2;
      reasons.push(`변동 시장 적중 +2`);
    }

    // 변동성확대를 정확히 맞춤
    if (actual === "변동성확대" && diag.predicted === "변동성확대") {
      score += 8;
      reasons.push("변동성확대 정확 예측 +8");
    }

    // 소수파 적중 보너스 (다른 모델들이 틀렸는데 이 모델만 맞음)
    if (isMinorityCorrect) {
      score += 10;
      reasons.push("소수파 적중 보너스 +10");
    }

    // 보합 시장에서 보합 예측 (상대적으로 쉬움 → 낮은 보상)
    if (actual === "보합" && diag.predicted === "보합" && Math.abs(actualReturn) < 0.3) {
      score -= 3; // 너무 쉬운 적중은 보상 감소
      reasons.push("보합↔보합(미미한 변동) -3");
    }
  } else {
    // ── 오답 감점 ──
    score -= 8;
    reasons.push("오답 -8");

    // 고확신 오답은 추가 감점 (과신 페널티)
    if (diag.confidence >= 70) {
      score -= 5;
      reasons.push(`고확신(${diag.confidence}%) 오답 과신 패널티 -5`);
    }

    // 심각한 이슈가 있는 오답
    const severeCount = diag.issues.filter((i) => i.severity === "심각").length;
    if (severeCount > 0) {
      score -= severeCount * 3;
      reasons.push(`심각 이슈 ${severeCount}건 -${severeCount * 3}`);
    }

    // 반대 방향 오답 (상승↔하락)은 추가 감점
    if (
      (diag.predicted === "상승" && actual === "하락") ||
      (diag.predicted === "하락" && actual === "상승")
    ) {
      score -= 3;
      reasons.push("방향 완전 반대 -3");
    }
  }

  return {
    modelName: diag.modelName,
    score,
    reason: reasons.join(", "),
  };
}

// ─── 시장 레짐 감지 ──────────────────────────────────────────────────────────

/** 시장 레짐을 데이터 기반으로 감지 */
function detectMarketRegime(preData?: PriceBar[]): string {
  if (!preData || preData.length < 20) return "불명";

  const atr14 = calcATR(preData, 14);
  const sma20 = calcSMA(preData, 20);
  const sma50 = calcSMA(preData, Math.min(50, preData.length));
  const rsi = calcRSI(preData);

  // 변동성 수준 판별
  const lastPrice = preData[preData.length - 1].close;
  const atrPercent = atr14 != null && lastPrice > 0 ? (atr14 / lastPrice) * 100 : 0;
  const isHighVol = atrPercent > 3;
  const isExtremeVol = atrPercent > 5;

  // 추세 판별
  const isTrending = sma20 != null && sma50 != null && Math.abs((sma20 - sma50) / sma50) > 0.02;
  const isUpTrend = sma20 != null && sma50 != null && sma20 > sma50;

  // RSI 기반 과열/과매도
  const isOverbought = rsi != null && rsi > 70;
  const isOversold = rsi != null && rsi < 30;

  if (isExtremeVol) return "극고변동";
  if (isHighVol) return "고변동";
  if (isTrending && isUpTrend) return "상승추세";
  if (isTrending && !isUpTrend) return "하락추세";
  if (isOverbought) return "과열";
  if (isOversold) return "과매도";
  return "횡보";
}

/** 시장 변동성 수준 분류 */
function classifyVolatility(preData?: PriceBar[]): "low" | "normal" | "high" | "extreme" {
  if (!preData || preData.length < 15) return "normal";
  const atr14 = calcATR(preData, 14);
  const lastPrice = preData[preData.length - 1].close;
  if (atr14 == null || lastPrice <= 0) return "normal";
  const atrPercent = (atr14 / lastPrice) * 100;
  if (atrPercent > 5) return "extreme";
  if (atrPercent > 3) return "high";
  if (atrPercent < 1) return "low";
  return "normal";
}

// ─── 모델별 연속 성과 추적 (모듈 수준 상태) ──────────────────────────────────

/** 모델별 연속 적중/미스 스트릭 추적 */
const modelStreaks: Record<string, { hitStreak: number; missStreak: number }> = {
  "모멘텀": { hitStreak: 0, missStreak: 0 },
  "평균회귀": { hitStreak: 0, missStreak: 0 },
  "변동성": { hitStreak: 0, missStreak: 0 },
  "교차상관": { hitStreak: 0, missStreak: 0 },
  "펀더멘털": { hitStreak: 0, missStreak: 0 },
};

/** 스트릭 업데이트 */
function updateStreak(modelName: string, wasCorrect: boolean): { hitStreak: number; missStreak: number } {
  if (!modelStreaks[modelName]) {
    modelStreaks[modelName] = { hitStreak: 0, missStreak: 0 };
  }
  if (wasCorrect) {
    modelStreaks[modelName].hitStreak += 1;
    modelStreaks[modelName].missStreak = 0;
  } else {
    modelStreaks[modelName].missStreak += 1;
    modelStreaks[modelName].hitStreak = 0;
  }
  return { ...modelStreaks[modelName] };
}

// ─── 고도화 점수 시스템 ──────────────────────────────────────────────────────

/**
 * 고도화된 모델 점수 계산
 *
 * 기존 calculateModelScore 결과를 보완하여 다음을 추가:
 * 1. 확신도 보정 (confidence calibration): 확신도↔실제 변동 크기 일치도
 * 2. 시장 레짐 인식: 추세/횡보/고변동 시장별 모델 가중 배수
 * 3. 적시성 점수: 예측 방향이 빠르게 맞았는지
 * 4. 위험 조정 점수: 샤프 비율 유사 — 일관성 보상, 운 좋은 단발 적중 감점
 * 5. 연속 성과 추적: 연속 적중 보너스 / 연속 미스 감점
 */
function calculateAdvancedModelScore(
  diag: ModelDiagnosis,
  actual: Direction,
  actualReturn: number,
  baseScore: number,
  marketRegime: string,
  postData?: PriceBar[],
): AdvancedModelScore {
  const reasons: string[] = [];

  // ── 1. 확신도 보정 보너스/패널티 ──
  let confidenceCalibrationBonus = 0;
  const absReturn = Math.abs(actualReturn);
  const confidenceNorm = diag.confidence / 100; // 0~1

  if (diag.wasCorrect) {
    // 고확신 + 큰 변동 = 잘 맞춘 것 → +7
    if (diag.confidence >= 65 && absReturn > 2) {
      confidenceCalibrationBonus = 7;
      reasons.push(`고확신(${diag.confidence}%)+큰변동(${absReturn.toFixed(1)}%) 적중 +7`);
    }
    // 적절한 확신도와 적절한 변동 → +3
    else if (Math.abs(confidenceNorm - Math.min(absReturn / 5, 1)) < 0.2) {
      confidenceCalibrationBonus = 3;
      reasons.push("확신도↔변동크기 잘 매칭 +3");
    }
  } else {
    // 저확신 + 큰 변동 = 기회 놓침 → -4
    if (diag.confidence < 40 && absReturn > 2) {
      confidenceCalibrationBonus = -4;
      reasons.push(`저확신(${diag.confidence}%)+큰변동 기회 놓침 -4`);
    }
    // 고확신 + 완전히 틀림 → -6
    else if (diag.confidence >= 70 && absReturn > 1.5) {
      confidenceCalibrationBonus = -6;
      reasons.push(`고확신(${diag.confidence}%) 크게 오판 -6`);
    }
  }

  // ── 2. 시장 레짐 인식 배수 ──
  let regimeMultiplier = 1.0;
  const modelName = diag.modelName;

  // 추세 시장에서 모멘텀/교차상관 모델 보너스
  if ((marketRegime === "상승추세" || marketRegime === "하락추세") &&
      (modelName === "모멘텀" || modelName === "교차상관")) {
    regimeMultiplier = 1.5;
    reasons.push(`추세시장(${marketRegime}) ${modelName} 1.5배`);
  }
  // 횡보 시장에서 평균회귀 모델 보너스
  if (marketRegime === "횡보" && modelName === "평균회귀") {
    regimeMultiplier = 1.5;
    reasons.push("횡보시장 평균회귀 1.5배");
  }
  // 고변동 시장에서 변동성 모델 보너스
  if ((marketRegime === "고변동" || marketRegime === "극고변동") && modelName === "변동성") {
    regimeMultiplier = 1.5;
    reasons.push(`${marketRegime} 변동성모델 1.5배`);
  }

  // ── 3. 적시성 점수 ──
  let timelinessBonus = 0;
  if (diag.wasCorrect && postData && postData.length >= 3) {
    // 예측 방향이 초반 1/3 기간 내에 맞았는지 확인
    const earlyThird = Math.max(1, Math.floor(postData.length / 3));
    const earlyData = postData.slice(0, earlyThird);
    const startPrice = postData[0].close;
    let earlyMatch = false;

    for (const bar of earlyData) {
      const earlyReturn = ((bar.close - startPrice) / startPrice) * 100;
      if (actual === "상승" && earlyReturn > 0.5) { earlyMatch = true; break; }
      if (actual === "하락" && earlyReturn < -0.5) { earlyMatch = true; break; }
    }

    if (earlyMatch) {
      timelinessBonus = 3;
      reasons.push("초기 적중(1/3 기간 내) +3");
    }
  }

  // ── 4. 위험 조정 점수 (샤프 비율 유사) ──
  // 일관성 보상: 기본 점수가 양수이고 확신도가 중간 → 안정적
  let riskAdjustedScore = 0;
  if (diag.wasCorrect && diag.confidence >= 40 && diag.confidence <= 70) {
    riskAdjustedScore = 2; // 적정 확신도의 안정적 적중
    reasons.push("적정확신도 안정 적중 +2");
  } else if (diag.wasCorrect && diag.confidence > 85) {
    riskAdjustedScore = -1; // 과도한 확신은 운 요소 의심
    reasons.push("과도확신(운 요소) -1");
  }

  // ── 5. 연속 성과 추적 ──
  const streak = updateStreak(modelName, diag.wasCorrect);
  let streakBonus = 0;
  if (streak.hitStreak >= 2) {
    streakBonus = 3 * (streak.hitStreak - 1); // 2연속부터 보너스
    reasons.push(`${streak.hitStreak}연속적중 +${streakBonus}`);
  } else if (streak.missStreak >= 2) {
    streakBonus = -2 * (streak.missStreak - 1); // 2연속부터 감점
    reasons.push(`${streak.missStreak}연속미스 ${streakBonus}`);
  }

  // ── 최종 점수 종합 ──
  const regimeAdjustedBase = baseScore * regimeMultiplier;
  const finalScore = regimeAdjustedBase + confidenceCalibrationBonus + timelinessBonus + riskAdjustedScore + streakBonus;

  return {
    modelName,
    baseScore,
    confidenceCalibrationBonus,
    regimeMultiplier,
    timelinessBonus,
    riskAdjustedScore,
    streakBonus,
    finalScore: Math.round(finalScore * 100) / 100,
    reason: reasons.join(", ") || "기본 점수만 적용",
  };
}

// ─── 적응 학습률 시스템 ──────────────────────────────────────────────────────

/**
 * 적응 학습률 계산
 *
 * 상황에 따라 학습 속도를 동적으로 조절:
 * - 정확도 낮음(< 40%): 학습률 상향 → 빠르게 실수에서 배움
 * - 정확도 높음(> 70%): 학습률 하향 → 좋은 가중치 보존
 * - 고변동 시장: 학습률 30% 감소 → 노이즈 과반응 방지
 * - 개선 중(모멘텀 > 0.3): 학습률 20% 감소 → 작동하는 것 보존
 * - 악화 중(모멘텀 < -0.3): 학습률 40% 증가 → 긴급 교정
 */
function calculateAdaptiveLearningRate(config: AdaptiveLearningConfig): number {
  let rate = config.baseRate;

  // 정확도 기반 조정
  if (config.recentAccuracy < 0.4) {
    rate = 0.005; // 실수에서 빠르게 배움
  } else if (config.recentAccuracy > 0.7) {
    rate = 0.002; // 좋은 가중치 보존
  }

  // 시장 변동성 기반 조정
  if (config.marketVolatility === "high" || config.marketVolatility === "extreme") {
    rate *= 0.7; // 30% 감소 — 노이즈 과반응 방지
  }

  // 학습 모멘텀 기반 조정
  if (config.learningMomentum > 0.3) {
    rate *= 0.8; // 20% 감소 — 개선 중이면 보존
  } else if (config.learningMomentum < -0.3) {
    rate *= 1.4; // 40% 증가 — 악화 시 긴급 교정
  }

  // 최소/최대 학습률 보호
  return Math.max(0.001, Math.min(0.008, rate));
}

// ─── 모델별 심층 진단 ──────────────────────────────────────────────────────────

function isModelCorrect(vote: ModelVote, actual: Direction): boolean {
  return vote.direction === actual || (vote.direction === "보합" && actual === "보합");
}

/**
 * 모멘텀 모델 진단
 */
function diagnoseMomentum(
  vote: ModelVote,
  actual: Direction,
  preData?: PriceBar[],
  postData?: PriceBar[],
): ModelDiagnosis {
  const issues: DiagnosisIssue[] = [];
  const improvements: string[] = [];
  const correct = isModelCorrect(vote, actual);

  if (!correct && preData && preData.length >= 20) {
    // SMA 교차 상태 점검
    const sma10 = calcSMA(preData, 10);
    const sma50 = calcSMA(preData, Math.min(50, preData.length));
    if (sma10 != null && sma50 != null) {
      const crossRatio = (sma10 - sma50) / sma50;
      if (Math.abs(crossRatio) < 0.005) {
        issues.push({
          category: "감도_문제",
          severity: "주의",
          description: `SMA 교차 비율 ${(crossRatio * 100).toFixed(2)}%로 매우 근접. 교차 구간에서 노이즈에 취약`,
          suggestedFix: "SMA 교차 판단 시 최소 괴리율 임계값(예: 0.5%) 추가하여 오신호 필터링",
        });
        improvements.push("SMA 교차 최소 괴리율 필터 도입 검토");
      }
    }

    // RSI 위치 점검
    const rsi = calcRSI(preData);
    if (rsi != null) {
      if (vote.direction === "상승" && rsi > 65 && actual === "하락") {
        issues.push({
          category: "지표_세팅",
          severity: "심각",
          description: `RSI ${rsi.toFixed(1)}로 이미 과열 구간이었으나 모멘텀이 상승 판단. 과매수 필터 부재`,
          suggestedFix: "모멘텀 모델에 RSI>65 시 상승 신호 감쇄 로직 추가",
        });
        improvements.push("모멘텀 모델에 RSI 과열 경고 필터 통합");
      }
      if (vote.direction === "하락" && rsi < 35 && actual === "상승") {
        issues.push({
          category: "지표_세팅",
          severity: "심각",
          description: `RSI ${rsi.toFixed(1)}로 과매도 구간이었으나 모멘텀이 하락 판단. 반등 가능성 미반영`,
          suggestedFix: "모멘텀 모델에 RSI<35 시 하락 신호 감쇄 로직 추가",
        });
        improvements.push("모멘텀 모델에 과매도 반등 경고 필터 통합");
      }
    }

    // MACD 히스토그램 방향 점검
    const macd = calcMACD(preData);
    if (macd != null) {
      if (vote.direction === "상승" && macd.histogram < 0 && actual === "하락") {
        issues.push({
          category: "값_오류",
          severity: "주의",
          description: `MACD 히스토그램 음수(${macd.histogram.toFixed(3)})였으나 상승 예측. 다른 지표가 MACD를 오버라이드`,
          suggestedFix: "MACD 히스토그램 부호와 최종 판단 일치 여부 교차검증 추가",
        });
      }
    }

    // ROC 갑작스런 반전 점검
    if (postData && postData.length >= 5) {
      const preROC = calcROC(preData, 5);
      const postROC = calcROC(postData, 5);
      if (preROC != null && postROC != null) {
        if ((preROC > 2 && postROC < -2) || (preROC < -2 && postROC > 2)) {
          issues.push({
            category: "외부_충격",
            severity: "심각",
            description: `ROC가 ${preROC.toFixed(1)}% → ${postROC.toFixed(1)}%로 급반전. 예측 시점 이후 급격한 추세 전환 발생`,
            suggestedFix: "변동성 모델과 연계하여 급반전 가능성 사전 경고 시스템 강화",
          });
          improvements.push("ROC 급반전 감지 및 사전 경고 메커니즘 추가");
        }
      }
    }

    // ── 고도화: Aroon 지표 불일치 점검 ──
    const aroon = calcAroon(preData);
    if (aroon != null) {
      // Aroon이 강한 추세를 보였으나 모델이 반대 예측
      if (aroon.up > 80 && vote.direction === "하락" && actual === "상승") {
        issues.push({
          category: "지표_세팅",
          severity: "심각",
          description: `Aroon Up ${aroon.up.toFixed(0)}으로 강한 상승추세였으나 하락 예측. Aroon 지표 미반영`,
          suggestedFix: "모멘텀 모델에 Aroon 지표를 추세 확인 필터로 통합",
        });
        improvements.push("Aroon 지표 기반 추세 확인 로직 추가");
      }
      if (aroon.down > 80 && vote.direction === "상승" && actual === "하락") {
        issues.push({
          category: "지표_세팅",
          severity: "심각",
          description: `Aroon Down ${aroon.down.toFixed(0)}으로 강한 하락추세였으나 상승 예측. Aroon 하락 신호 무시`,
          suggestedFix: "Aroon Down > 80 시 상승 신호 감쇄 로직 추가",
        });
        improvements.push("Aroon 하락 경고 필터 도입");
      }
    }

    // ── 고도화: TRIX 장기 모멘텀 괴리 점검 ──
    const trix = calcTrix(preData);
    if (trix != null) {
      if (trix > 0 && vote.direction === "하락" && actual === "상승") {
        issues.push({
          category: "감도_문제",
          severity: "주의",
          description: `TRIX ${trix.toFixed(4)} 양수(장기 상승 모멘텀)였으나 하락 예측. 장기 모멘텀과 단기 판단 괴리`,
          suggestedFix: "TRIX 장기 모멘텀 방향과 최종 판단 교차검증 추가",
        });
        improvements.push("TRIX 장기 모멘텀 교차검증 도입");
      }
      if (trix < 0 && vote.direction === "상승" && actual === "하락") {
        issues.push({
          category: "감도_문제",
          severity: "주의",
          description: `TRIX ${trix.toFixed(4)} 음수(장기 하락 모멘텀)였으나 상승 예측. 장기 모멘텀 역행`,
          suggestedFix: "TRIX 음수 구간에서 상승 신호 감쇄 처리",
        });
        improvements.push("TRIX 역행 시 신호 감쇄 로직");
      }
    }

    // ── 고도화: Elder Ray 충돌 점검 ──
    const elderRay = calcElderRay(preData);
    if (elderRay != null) {
      if (elderRay.bullPower < 0 && elderRay.bearPower < 0 && vote.direction === "상승" && actual === "하락") {
        issues.push({
          category: "값_오류",
          severity: "주의",
          description: `Elder Ray: Bull(${elderRay.bullPower.toFixed(2)}), Bear(${elderRay.bearPower.toFixed(2)}) 모두 음수인데 상승 예측. 매수세 부재 간과`,
          suggestedFix: "Elder Ray bull/bear power 동시 음수 시 상승 판단 경고 추가",
        });
        improvements.push("Elder Ray 매수/매도 세력 분석 반영");
      }
    }

    // ── 고도화: Coppock Curve 사이클 위치 점검 ──
    const coppock = calcCoppockCurve(preData);
    if (coppock != null) {
      if (coppock < -5 && vote.direction === "하락" && actual === "상승") {
        issues.push({
          category: "감도_문제",
          severity: "경미",
          description: `Coppock Curve ${coppock.toFixed(2)}로 극저점 — 반등 사이클 진입 가능성을 모멘텀 모델이 미감지`,
          suggestedFix: "Coppock Curve 극저점에서 반등 가능성 가산점 부여",
        });
        improvements.push("Coppock Curve 사이클 바닥 감지 로직 추가");
      }
    }
  }

  if (!correct && issues.length === 0) {
    issues.push({
      category: "구조적_한계",
      severity: "경미",
      description: "명확한 지표 오류 없이 방향 오판. 시장 노이즈 또는 이벤트 리스크",
      suggestedFix: "모멘텀 모델의 최종 판단 시 확신도 임계값 강화 검토",
    });
  }

  return { modelName: "모멘텀", predicted: vote.direction, actual, wasCorrect: correct, confidence: vote.confidence, issues, improvements };
}

/**
 * 평균회귀 모델 진단
 */
function diagnoseMeanReversion(
  vote: ModelVote,
  actual: Direction,
  preData?: PriceBar[],
): ModelDiagnosis {
  const issues: DiagnosisIssue[] = [];
  const improvements: string[] = [];
  const correct = isModelCorrect(vote, actual);

  if (!correct && preData && preData.length >= 20) {
    const rsi = calcRSI(preData);
    const bb = calcBollingerBands(preData);

    // RSI 극단값에서 회귀 예측 실패 → 추세가 극단값을 지속한 경우
    if (rsi != null) {
      if (rsi > 70 && vote.direction === "하락" && actual === "상승") {
        issues.push({
          category: "구조적_한계",
          severity: "심각",
          description: `RSI ${rsi.toFixed(1)}에서 하락(회귀) 예측했으나 과매수 상태가 지속. 강한 추세에서 RSI 70+ 유지 가능`,
          suggestedFix: "과매수 RSI 기준값을 동적으로 조정 (강추세 시 80으로 상향)",
        });
        improvements.push("추세 강도에 따른 RSI 과매수/과매도 동적 임계값 도입");
      }
      if (rsi < 30 && vote.direction === "상승" && actual === "하락") {
        issues.push({
          category: "구조적_한계",
          severity: "심각",
          description: `RSI ${rsi.toFixed(1)}에서 상승(반등) 예측했으나 하락 지속. 강한 하락추세에서 과매도 연장`,
          suggestedFix: "하락추세 판별 후 과매도 반등 신호 감쇄 적용",
        });
        improvements.push("하락추세 감지 시 평균회귀 신호 약화 로직 추가");
      }
    }

    // 볼린저 밴드 이탈 지속
    if (bb != null) {
      if (bb.percentB > 1.0 && vote.direction === "하락" && actual === "상승") {
        issues.push({
          category: "지표_세팅",
          severity: "주의",
          description: `BB %B ${(bb.percentB * 100).toFixed(0)}%에서 하락 예측했으나 밴드 워킹 발생. 강추세에서 밴드 상단 주행 가능`,
          suggestedFix: "볼린저 밴드 워킹(band walking) 감지 로직 추가 — 밴드 이탈 3일 이상 시 회귀 신호 비활성화",
        });
        improvements.push("볼린저 밴드 워킹 감지 및 회귀 신호 비활성화 조건 추가");
      }
    }

    // ── 고도화: 피보나치 수준 근접도 점검 ──
    const fib = calcFibonacciLevels(preData);
    if (fib != null && fib.levels.length > 0) {
      const lastPrice = preData[preData.length - 1].close;
      const nearestFibDist = Math.min(...fib.levels.map(lv => lv > 0 ? Math.abs((lastPrice - lv) / lv) : Infinity));
      if (nearestFibDist < 0.01) { // 1% 이내 피보나치 수준
        issues.push({
          category: "지표_세팅",
          severity: "주의",
          description: `가격이 피보나치 수준에서 ${(nearestFibDist * 100).toFixed(2)}% 이내였으나 회귀 방향 오판. 피보나치 지지/저항 미반영`,
          suggestedFix: "피보나치 되돌림 수준을 평균회귀 판단에 보조 지표로 활용",
        });
        improvements.push("피보나치 되돌림 수준 기반 회귀 타겟 보정");
      }
    }

    // ── 고도화: MFI 다이버전스 점검 ──
    const mfi = calcMFI(preData);
    if (mfi != null) {
      if (mfi > 80 && vote.direction === "상승" && actual === "하락") {
        issues.push({
          category: "감도_문제",
          severity: "주의",
          description: `MFI ${mfi.toFixed(1)}로 과매수 — 자금 유입 과다 상태에서 상승 예측 오판. MFI 다이버전스 미감지`,
          suggestedFix: "MFI 과매수 구간(> 80)에서 상승 신호 감쇄 적용",
        });
        improvements.push("MFI 과매수/과매도 다이버전스 감지 추가");
      }
      if (mfi < 20 && vote.direction === "하락" && actual === "상승") {
        issues.push({
          category: "감도_문제",
          severity: "주의",
          description: `MFI ${mfi.toFixed(1)}로 과매도 — 자금 유출 극단에서 하락 예측 오판. 반등 자금 유입 가능성 무시`,
          suggestedFix: "MFI < 20 시 하락 신호 약화 및 반등 가능성 가산",
        });
        improvements.push("MFI 극단값 반전 신호 통합");
      }
    }

    // ── 고도화: 켈트너 채널 스퀴즈 상태 점검 ──
    const keltner = calcKeltnerChannels(preData);
    const bbForSqueeze = calcBollingerBands(preData);
    if (keltner != null && bbForSqueeze != null) {
      // 볼린저 밴드가 켈트너 채널 안에 들어감 = 스퀴즈 상태
      const isSqueezing = bbForSqueeze.upper < keltner.upper && bbForSqueeze.lower > keltner.lower;
      if (isSqueezing) {
        issues.push({
          category: "감도_문제",
          severity: "주의",
          description: "켈트너-볼린저 스퀴즈 상태(변동성 극도 수축)에서 회귀 예측 실패. 스퀴즈 해소 방향 오판",
          suggestedFix: "스퀴즈 상태 감지 시 방향 판단을 모멘텀 지표에 위임하는 로직 추가",
        });
        improvements.push("켈트너-볼린저 스퀴즈 감지 및 해소 방향 예측 개선");
      }
    }

    // ── 고도화: 피벗 포인트 근접도 점검 ──
    const pivots = calcPivotPoints(preData);
    if (pivots != null) {
      const lastPricePivot = preData[preData.length - 1].close;
      const pivotLevels = [pivots.pivot, pivots.r1, pivots.r2, pivots.s1, pivots.s2];
      const nearestPivotDist = Math.min(...pivotLevels.map(lv => Math.abs((lastPricePivot - lv) / lv)));
      if (nearestPivotDist < 0.005) { // 0.5% 이내 피벗 포인트
        issues.push({
          category: "지표_세팅",
          severity: "경미",
          description: `가격이 피벗 포인트에서 ${(nearestPivotDist * 100).toFixed(2)}% 이내. 피벗 수준 반등/돌파 미판별`,
          suggestedFix: "피벗 포인트 지지/저항을 평균회귀 판단의 목표가 설정에 활용",
        });
        improvements.push("피벗 포인트 기반 회귀 목표가 보정");
      }
    }
  }

  if (!correct && issues.length === 0) {
    issues.push({
      category: "데이터_부족",
      severity: "경미",
      description: "평균회귀 모델 오판 — 근본 원인 특정 불가",
      suggestedFix: "더 많은 오실레이터(Williams %R, CCI 등)와 교차검증 강화",
    });
  }

  return { modelName: "평균회귀", predicted: vote.direction, actual, wasCorrect: correct, confidence: vote.confidence, issues, improvements };
}

/**
 * 변동성 모델 진단
 */
function diagnoseVolatility(
  vote: ModelVote,
  actual: Direction,
  preData?: PriceBar[],
  actualReturn?: number,
): ModelDiagnosis {
  const issues: DiagnosisIssue[] = [];
  const improvements: string[] = [];
  const correct = isModelCorrect(vote, actual);

  if (!correct && preData && preData.length >= 15) {
    const atr14 = calcATR(preData, 14);
    const atr5 = calcATR(preData, 5);

    if (atr14 != null && atr5 != null && atr14 !== 0) {
      const ratio = atr5 / atr14;

      // 변동성 축소 예측 → 실제 폭발
      if (ratio < 0.8 && actual === "변동성확대") {
        issues.push({
          category: "감도_문제",
          severity: "심각",
          description: `ATR 비율 ${ratio.toFixed(2)}로 변동성 축소 판단했으나 이후 변동성 폭발. 축소 후 폭발 패턴 미감지`,
          suggestedFix: "변동성 수축 지속 기간 + 볼린저 밴드 폭 동시 모니터링으로 폭발 사전 경고 강화",
        });
        improvements.push("변동성 수축→폭발 전환 패턴 감지 로직 추가");
      }

      // 큰 수익률 변동을 예측 못한 경우
      if (actualReturn != null && Math.abs(actualReturn) > 5 && vote.direction === "보합") {
        issues.push({
          category: "감도_문제",
          severity: "심각",
          description: `보합 예측이었으나 실제 ${actualReturn > 0 ? "+" : ""}${actualReturn.toFixed(1)}% 변동. 대규모 이벤트 감지 실패`,
          suggestedFix: "VIX 급등, 뉴스 이벤트 등 외부 충격 지표와 변동성 모델 연계 강화",
        });
        improvements.push("외부 이벤트 리스크 감지와 변동성 모델 연계");
      }
    }

    // ── 고도화: 켈트너 채널 스퀴즈 미스 점검 ──
    const keltnerVol = calcKeltnerChannels(preData);
    const bbVol = calcBollingerBands(preData);
    if (keltnerVol != null && bbVol != null) {
      const isSqueezing = bbVol.upper < keltnerVol.upper && bbVol.lower > keltnerVol.lower;
      if (isSqueezing && actual === "변동성확대") {
        issues.push({
          category: "감도_문제",
          severity: "심각",
          description: "켈트너-볼린저 스퀴즈(변동성 극도 수축) 상태였으나 후속 변동성 폭발 미감지. 스퀴즈 해소 패턴 누락",
          suggestedFix: "스퀴즈 지속 기간 모니터링 + 해소 시 변동성 확대 경고 자동 발생",
        });
        improvements.push("켈트너-볼린저 스퀴즈→폭발 전환 감지 로직 강화");
      }
    }

    // ── 고도화: Mass Index 반전 신호 누락 점검 ──
    const massIndex = calcMassIndex(preData);
    if (massIndex != null) {
      // Mass Index > 27 후 < 26.5 하락 = 반전 신호 ("reversal bulge")
      if (massIndex > 26.5) {
        issues.push({
          category: "지표_세팅",
          severity: "주의",
          description: `Mass Index ${massIndex.toFixed(2)}로 반전 벌지 구간 — 변동성 반전 신호를 모델이 미반영`,
          suggestedFix: "Mass Index 반전 벌지(>27→<26.5) 감지 시 변동성 방향 전환 경고 추가",
        });
        improvements.push("Mass Index 반전 벌지 패턴 감지 도입");
      }
    }

    // ── 고도화: 거래량 확인 실패 점검 ──
    if (preData.length >= 10) {
      const recentVolumes = preData.slice(-5).map(b => b.volume ?? 0);
      const prevVolumes = preData.slice(-10, -5).map(b => b.volume ?? 0);
      const avgRecent = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
      const avgPrev = prevVolumes.reduce((a, b) => a + b, 0) / prevVolumes.length;

      if (avgPrev > 0) {
        const volChange = (avgRecent - avgPrev) / avgPrev;
        if (volChange > 0.5) {
          issues.push({
            category: "감도_문제",
            severity: "주의",
            description: `거래량 ${(volChange * 100).toFixed(0)}% 급증했으나 변동성 모델이 방향 판단 오류. 거래량 확인 실패`,
            suggestedFix: "거래량 급변(50%+)을 변동성 확대 선행 지표로 반영",
          });
          improvements.push("거래량 급변 기반 변동성 사전 경고 추가");
        }
      }
    }
  }

  if (!correct && issues.length === 0) {
    issues.push({
      category: "구조적_한계",
      severity: "경미",
      description: "변동성 판단 오류 — 세부 원인 특정 불가",
      suggestedFix: "변동성 체제 분류(극저/저/보통/고/극고) 세분화 검토",
    });
  }

  return { modelName: "변동성", predicted: vote.direction, actual, wasCorrect: correct, confidence: vote.confidence, issues, improvements };
}

/**
 * 교차상관 모델 진단
 */
function diagnoseCorrelation(
  vote: ModelVote,
  actual: Direction,
): ModelDiagnosis {
  const issues: DiagnosisIssue[] = [];
  const improvements: string[] = [];
  const correct = isModelCorrect(vote, actual);

  if (!correct) {
    issues.push({
      category: "구조적_한계",
      severity: "주의",
      description: `상관관계 기반 예측 '${vote.direction}'이 실제 '${actual}'과 불일치. 상관관계 일시 붕괴 또는 레짐 변경 가능성`,
      suggestedFix: "상관관계 매트릭스의 동적 업데이트 — 최근 30일 롤링 상관계수 적용 검토",
    });
    improvements.push("정적 상관계수 → 롤링 상관계수로 전환 검토");

    if (vote.confidence > 60) {
      issues.push({
        category: "감도_문제",
        severity: "주의",
        description: `확신도 ${vote.confidence}%로 높았으나 오판. 높은 상관관계 신뢰도에 대한 과신`,
        suggestedFix: "상관관계 모델의 최대 확신도 캡을 현행보다 낮추거나, 상관계수의 최근 안정성 검증 추가",
      });
      improvements.push("상관관계 확신도 상한 조정 검토");
    }
  }

  // ── 고도화: 상관관계 레짐 변경 감지 ──
  if (!correct) {
    issues.push({
      category: "구조적_한계",
      severity: "경미",
      description: "상관관계 레짐 변경 가능성 — 과거 상관관계가 최근 시장 구조 변화로 무효화되었을 수 있음",
      suggestedFix: "상관계수 안정성 검증: 최근 10일 vs 30일 vs 60일 상관계수 비교하여 레짐 변경 감지",
    });
    improvements.push("다중 기간 상관관계 안정성 검증 로직 추가");

    // 교차자산 다이버전스 감지
    issues.push({
      category: "데이터_부족",
      severity: "경미",
      description: "교차자산 다이버전스(관련 자산이 반대 방향 이동) 발생 가능성. 상관관계 일시 붕괴 패턴",
      suggestedFix: "주요 관련 자산 간 단기 다이버전스 감지 시 상관관계 모델 확신도 자동 하향",
    });
    improvements.push("교차자산 다이버전스 감지 및 확신도 자동 조정");
  }

  return { modelName: "교차상관", predicted: vote.direction, actual, wasCorrect: correct, confidence: vote.confidence, issues, improvements };
}

/**
 * 펀더멘털 모델 진단
 */
function diagnoseFundamental(
  vote: ModelVote,
  actual: Direction,
): ModelDiagnosis {
  const issues: DiagnosisIssue[] = [];
  const improvements: string[] = [];
  const correct = isModelCorrect(vote, actual);

  if (!correct) {
    if (vote.confidence < 30) {
      issues.push({
        category: "데이터_부족",
        severity: "주의",
        description: `펀더멘털 모델 확신도 ${vote.confidence}%로 매우 낮음. 거시경제 데이터 수집 실패 또는 부족 가능성`,
        suggestedFix: "거시경제 데이터 소스 다각화 — 추가 API(FRED, 한국은행 등) 연동 검토",
      });
      improvements.push("거시경제 데이터 소스 확대 (FRED, BOK API 등)");
    } else {
      issues.push({
        category: "지표_세팅",
        severity: "주의",
        description: `펀더멘털 분석이 '${vote.direction}'이었으나 실제 '${actual}'. 거시경제 시그널 해석 오류 가능`,
        suggestedFix: "자산별 펀더멘털 시그널의 가중치 재검토. VIX, 수익률곡선 등 핵심 시그널 영향력 재보정",
      });
      improvements.push("자산별 펀더멘털 시그널 가중치 재보정");
    }

    // 뉴스 심리가 반대로 작용했을 가능성
    if (vote.rationale.includes("뉴스 심리")) {
      issues.push({
        category: "값_오류",
        severity: "경미",
        description: "뉴스 심리 분석이 실제 시장 반응과 불일치. 키워드 기반 감성분석의 한계",
        suggestedFix: "뉴스 감성분석 키워드 사전 업데이트 및 역발상(contrarian) 필터 추가",
      });
      improvements.push("뉴스 감성분석 정확도 개선");
    }
  }

  // ── 고도화: 스마트 머니 플로우 모순 점검 ──
  if (!correct) {
    issues.push({
      category: "데이터_부족",
      severity: "경미",
      description: "스마트 머니 플로우(기관 투자자 자금 흐름)와 펀더멘털 판단 모순 가능성. 기관 자금 흐름 데이터 미반영",
      suggestedFix: "기관 매매 동향, CMF(Chaikin Money Flow) 등 자금 흐름 지표를 펀더멘털 모델에 보조 입력으로 추가",
    });
    improvements.push("스마트 머니 플로우 데이터 통합 검토");

    // 다중 오실레이터 합의 무시 점검
    issues.push({
      category: "감도_문제",
      severity: "경미",
      description: "다중 오실레이터(RSI, MFI, Stochastic 등) 합의를 펀더멘털 판단에서 무시했을 가능성",
      suggestedFix: "기술적 오실레이터 3개 이상 동일 방향 시 펀더멘털 판단 교차검증 추가",
    });
    improvements.push("다중 오실레이터 합의 기반 교차검증 추가");

    // Coppock Curve 사이클 불일치 점검
    issues.push({
      category: "구조적_한계",
      severity: "경미",
      description: "Coppock Curve 경기 사이클 위치와 펀더멘털 판단 불일치 가능성 — 장기 사이클 전환점 미감지",
      suggestedFix: "Coppock Curve를 경기 사이클 보조 지표로 펀더멘털 모델에 반영",
    });
    improvements.push("Coppock Curve 경기 사이클 반영");
  }

  return { modelName: "펀더멘털", predicted: vote.direction, actual, wasCorrect: correct, confidence: vote.confidence, issues, improvements };
}

// ─── 앙상블 구조 진단 ──────────────────────────────────────────────────────────

function diagnoseEnsemble(
  votes: SubModelVotes,
  finalDirection: Direction,
  actual: Direction,
  wasCorrect: boolean,
): EnsembleDiagnosis {
  const votingIssues: string[] = [];
  const modelConflicts: string[] = [];
  let weightDistributionIssue: string | null = null;
  const correctMinorityModels: string[] = [];

  const models: [string, ModelVote][] = [
    ["모멘텀", votes.momentum],
    ["평균회귀", votes.meanReversion],
    ["변동성", votes.volatility],
    ["교차상관", votes.correlation],
    ["펀더멘털", votes.fundamental],
  ];

  // 다수결 분석
  const correctModels = models.filter(([, v]) => v.direction === actual);
  const wrongModels = models.filter(([, v]) => v.direction !== actual);
  const majorityWrong = wrongModels.length > correctModels.length;

  if (majorityWrong && !wasCorrect) {
    votingIssues.push(
      `5개 모델 중 ${wrongModels.length}개가 오판 (${wrongModels.map(([n]) => n).join(", ")}). 다수결 오류 발생`,
    );
  }

  // 소수 정답 모델
  if (!wasCorrect && correctModels.length > 0) {
    for (const [name] of correctModels) {
      correctMinorityModels.push(name);
    }
    votingIssues.push(
      `${correctMinorityModels.join(", ")} 모델이 올바른 방향을 예측했으나 가중치 부족으로 최종 판단에 반영되지 않음`,
    );
  }

  // 모델 간 충돌 감지
  const directions = new Set(models.map(([, v]) => v.direction));
  if (directions.size >= 4) {
    modelConflicts.push("5개 모델이 4개 이상 서로 다른 방향 예측 — 시장 불확실성 극대화 상태");
  } else if (directions.size === 3) {
    modelConflicts.push("5개 모델이 3개 방향으로 분산 — 시장 방향성 불분명");
  }

  // 고확신 모델이 틀렸는지 체크
  const highConfWrong = models.filter(
    ([, v]) => v.confidence > 70 && v.direction !== actual,
  );
  if (highConfWrong.length > 0) {
    votingIssues.push(
      `고확신(70%+) 모델 오판: ${highConfWrong.map(([n, v]) => `${n}(${v.confidence}%)`).join(", ")}. 확신도 보정 필요`,
    );
  }

  // 저확신 모델이 맞았는지 체크
  const lowConfCorrect = models.filter(
    ([, v]) => v.confidence < 40 && v.direction === actual,
  );
  if (lowConfCorrect.length > 0) {
    votingIssues.push(
      `저확신(<40%) 모델이 정답: ${lowConfCorrect.map(([n, v]) => `${n}(${v.confidence}%)`).join(", ")}. 해당 모델의 가중치 상향 검토`,
    );
  }

  return {
    votingIssues,
    modelConflicts,
    weightDistributionIssue,
    majorityWrong,
    correctMinorityModels,
  };
}

// ─── 근본 원인 분석 ────────────────────────────────────────────────────────────

function analyzeRootCause(
  prediction: AIPrediction,
  actual: Direction,
  actualReturn: number,
  diagnoses: ModelDiagnosis[],
  ensembleDiag: EnsembleDiagnosis,
  preData?: PriceBar[],
  postData?: PriceBar[],
): RootCauseAnalysis {
  const secondaryCauses: string[] = [];

  // 예측 불가 이벤트 판별
  if (Math.abs(actualReturn) > 8) {
    return {
      primaryCause: `극단적 시장 변동 (${actualReturn > 0 ? "+" : ""}${actualReturn.toFixed(1)}%) — 예측 모델의 일반적 범위를 벗어난 이벤트 리스크`,
      secondaryCauses: ["이벤트 리스크(실적발표, 정책변동, 지정학 등) 미반영 가능성 높음"],
      marketCondition: "극단적 변동",
      wasUnpredictable: true,
      unpredictableReason: "8% 이상의 급변은 기술적 분석 모델의 일반적 예측 범위를 초과",
    };
  }

  // 모든 모델이 틀린 경우
  if (diagnoses.every((d) => !d.wasCorrect)) {
    const allIssues = diagnoses.flatMap((d) => d.issues);
    const severeIssues = allIssues.filter((i) => i.severity === "심각");

    if (severeIssues.length > 0) {
      return {
        primaryCause: `전 모델 오판 — 핵심 원인: ${severeIssues[0].description}`,
        secondaryCauses: severeIssues.slice(1).map((i) => i.description),
        marketCondition: "구조적 변환점",
        wasUnpredictable: false,
      };
    }

    return {
      primaryCause: "전 모델 동시 오판 — 시장 레짐 전환 또는 예측 불가 외부 이벤트",
      secondaryCauses: ["모든 서브모델의 기본 가정(추세지속, 평균회귀 등)이 동시에 무효화"],
      marketCondition: "레짐 전환",
      wasUnpredictable: true,
      unpredictableReason: "모든 분석 프레임워크가 동시에 실패 — 시장의 근본적 구조 변화 시사",
    };
  }

  // 과반 모델 오판
  if (ensembleDiag.majorityWrong) {
    secondaryCauses.push("가중투표에서 다수파가 오판 방향을 지지");
    if (ensembleDiag.correctMinorityModels.length > 0) {
      secondaryCauses.push(
        `${ensembleDiag.correctMinorityModels.join(", ")} 모델이 올바른 방향을 제시했으나 소수파로 무시됨`,
      );
    }

    return {
      primaryCause: `다수결 오류 — ${diagnoses.filter((d) => !d.wasCorrect).length}개 모델이 잘못된 방향 지지`,
      secondaryCauses,
      marketCondition: "혼조 시장",
      wasUnpredictable: false,
    };
  }

  // 특정 모델의 과도한 영향
  const wrongHighConf = diagnoses.filter((d) => !d.wasCorrect && d.confidence > 70);
  if (wrongHighConf.length > 0) {
    return {
      primaryCause: `고확신 모델의 오판 — ${wrongHighConf.map((d) => `${d.modelName}(${d.confidence}%)`).join(", ")}이 잘못된 방향을 강하게 지지`,
      secondaryCauses: wrongHighConf.flatMap((d) => d.issues.map((i) => i.description)),
      marketCondition: "신호 왜곡",
      wasUnpredictable: false,
    };
  }

  // ── 고도화: 지표 충돌 감지 ──
  const allIssueCategories = diagnoses.flatMap(d => d.issues.map(i => i.category));
  const conflictCount = allIssueCategories.filter(c => c === "값_오류" || c === "감도_문제").length;
  if (conflictCount >= 3) {
    secondaryCauses.push(`지표 간 충돌 ${conflictCount}건 감지 — 핵심 지표들이 서로 모순된 신호를 발생`);
  }

  // ── 고도화: 타이밍 분석 (방향은 맞았으나 타이밍이 틀린 경우) ──
  const predictionWasCorrect = prediction.direction === actual;
  if (!predictionWasCorrect && postData && postData.length >= 5) {
    const predDir = prediction.direction;
    const startPrice = postData[0].close;
    // 후반부에 예측 방향이 맞았는지 확인
    const laterData = postData.slice(Math.floor(postData.length / 2));
    let eventuallyCorrect = false;
    for (const bar of laterData) {
      const ret = ((bar.close - startPrice) / startPrice) * 100;
      if (predDir === "상승" && ret > 1) { eventuallyCorrect = true; break; }
      if (predDir === "하락" && ret < -1) { eventuallyCorrect = true; break; }
    }
    if (eventuallyCorrect) {
      secondaryCauses.push("타이밍 오류 — 예측 방향은 후반에 맞았으나 판정 시점에서는 반대. 예측 기간 조정 검토 필요");
    }
  }

  // ── 고도화: 확신도 분포 분석 ──
  const avgConfidence = diagnoses.reduce((sum, d) => sum + d.confidence, 0) / diagnoses.length;
  const lowConfModels = diagnoses.filter(d => d.confidence < 40).length;
  if (lowConfModels >= 3) {
    secondaryCauses.push(`${lowConfModels}개 모델이 저확신(< 40%) — 시장의 진정한 불확실성 상태. 예측 자체를 보류했어야 할 가능성`);
  }

  // ── 고도화: 고도화 지표 실패 분석 ──
  const advancedIndicatorIssues = diagnoses.flatMap(d => d.issues)
    .filter(i => i.description.includes("Aroon") || i.description.includes("TRIX") ||
                 i.description.includes("피보나치") || i.description.includes("MFI") ||
                 i.description.includes("켈트너") || i.description.includes("Elder Ray") ||
                 i.description.includes("Coppock") || i.description.includes("Mass Index") ||
                 i.description.includes("피벗"));
  if (advancedIndicatorIssues.length > 0) {
    secondaryCauses.push(`고도화 지표 ${advancedIndicatorIssues.length}건 실패 감지 — ${advancedIndicatorIssues.map(i => i.description.split(" ")[0]).join(", ")} 등에서 개선 여지`);
  }

  // 기본 원인
  const allImprovements = diagnoses.flatMap((d) => d.improvements);
  return {
    primaryCause: `종합적 판단 오류 — 개별 모델의 미세 오차가 앙상블에서 누적`,
    secondaryCauses: [...secondaryCauses, ...(allImprovements.length > 0 ? allImprovements.slice(0, 3) : ["전반적 모델 세밀도 개선 필요"])],
    marketCondition: "일반",
    wasUnpredictable: false,
  };
}

// ─── 가중치 조정 (강화학습 점수 기반) ─────────────────────────────────────────

function adjustWeights(
  currentWeights: EnsembleConfig,
  diagnoses: ModelDiagnosis[],
  ensembleDiag: EnsembleDiagnosis,
  modelScores: ModelScore[],
): EnsembleConfig {
  const adjusted: EnsembleConfig = { ...currentWeights };

  const keyMap: Record<string, keyof EnsembleConfig> = {
    "모멘텀": "momentumWeight",
    "평균회귀": "meanReversionWeight",
    "변동성": "volatilityWeight",
    "교차상관": "correlationWeight",
    "펀더멘털": "fundamentalWeight",
  };

  // 점수 기반 가중치 조정: 점수를 가중치 변동으로 변환
  // 점수 범위: 대략 -20 ~ +30 → 가중치 변동: -0.06 ~ +0.09
  const SCORE_TO_WEIGHT = 0.003; // 점수 1점 = 가중치 0.3% 변동

  for (const ms of modelScores) {
    const key = keyMap[ms.modelName];
    if (!key) continue;

    const delta = ms.score * SCORE_TO_WEIGHT;
    adjusted[key] = Math.max(adjusted[key] + delta, MIN_WEIGHT);
  }

  return normalizeWeights(adjusted);
}

// ─── 고도화 가중치 조정 (적응 학습률 + 모멘텀 기반) ──────────────────────────

/** 이전 가중치 기록 (스무딩용) */
let previousWeights: EnsembleConfig | null = null;

/** 모델별 최근 점수 기록 (회복 부스트용) */
const recentModelScores: Record<string, number[]> = {};

/**
 * 고도화된 가중치 조정
 *
 * 개선 사항:
 * - 적응 학습률 적용
 * - 모멘텀 기반 조정 (현재 점수뿐 아니라 변화 방향 고려)
 * - 가중치 하한 보호 (8%)
 * - 가중치 상한 보호 (35%)
 * - 회복 부스트 (감점 후 개선된 모델에 추가 보상)
 * - 스무딩: new_weight = 0.7 * calculated + 0.3 * previous (급격한 변동 방지)
 */
function adjustWeightsAdvanced(
  currentWeights: EnsembleConfig,
  diagnoses: ModelDiagnosis[],
  ensembleDiag: EnsembleDiagnosis,
  advancedScores: AdvancedModelScore[],
  adaptiveRate: number,
): EnsembleConfig {
  const adjusted: EnsembleConfig = { ...currentWeights };
  const MIN_WEIGHT_ADV = 0.08;  // 최소 8%
  const MAX_WEIGHT_ADV = 0.35;  // 최대 35%

  const keyMap: Record<string, keyof EnsembleConfig> = {
    "모멘텀": "momentumWeight",
    "평균회귀": "meanReversionWeight",
    "변동성": "volatilityWeight",
    "교차상관": "correlationWeight",
    "펀더멘털": "fundamentalWeight",
  };

  for (const as of advancedScores) {
    const key = keyMap[as.modelName];
    if (!key) continue;

    // 적응 학습률 기반 점수→가중치 변환
    const delta = as.finalScore * adaptiveRate;

    // 모멘텀 기반 추가 조정: 최근 점수 기록과 비교
    if (!recentModelScores[as.modelName]) {
      recentModelScores[as.modelName] = [];
    }
    recentModelScores[as.modelName].push(as.finalScore);
    if (recentModelScores[as.modelName].length > 10) {
      recentModelScores[as.modelName].shift();
    }

    const scores = recentModelScores[as.modelName];
    let momentumAdjust = 0;
    if (scores.length >= 3) {
      const recent3Avg = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const olderAvg = scores.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, scores.length - 3);
      const scoreMomentum = recent3Avg - olderAvg;
      momentumAdjust = scoreMomentum * adaptiveRate * 0.5; // 모멘텀 방향 50% 추가 반영
    }

    // 회복 부스트: 최근 감점 후 양의 점수 → 추가 보상
    let recoveryBoost = 0;
    if (scores.length >= 2) {
      const prevScore = scores[scores.length - 2];
      if (prevScore < -5 && as.finalScore > 5) {
        recoveryBoost = adaptiveRate * 3; // 회복 보상
      }
    }

    let rawWeight = adjusted[key] + delta + momentumAdjust + recoveryBoost;

    // 하한/상한 보호
    rawWeight = Math.max(rawWeight, MIN_WEIGHT_ADV);
    rawWeight = Math.min(rawWeight, MAX_WEIGHT_ADV);

    // 스무딩: 70% 계산값 + 30% 이전값 (급격한 변동 방지)
    if (previousWeights) {
      rawWeight = 0.7 * rawWeight + 0.3 * previousWeights[key];
    }

    adjusted[key] = rawWeight;
  }

  // 이전 가중치 기록
  previousWeights = { ...adjusted };

  return normalizeWeights(adjusted);
}

// ─── 모델 성과 추세 분석 ─────────────────────────────────────────────────────

/**
 * 모델별 성과 추세 분석
 *
 * 최근 결과들을 기반으로 각 모델의:
 * - 최근 정확도 vs 전체 정확도
 * - 개선/안정/악화 추세
 * - 확신도 보정 정확도
 * - 최적/최악 시장 레짐
 */
function analyzeModelTrend(recentResults: LearningResult[], modelName: string): ModelPerformanceTrend {
  const modelKey = modelName as keyof LearningResult["modelPerformance"];
  const nameMap: Record<string, keyof LearningResult["modelPerformance"]> = {
    "모멘텀": "momentum",
    "평균회귀": "meanReversion",
    "변동성": "volatility",
    "교차상관": "correlation",
    "펀더멘털": "fundamental",
  };
  const perfKey = nameMap[modelName] || "momentum";

  // 전체 정확도
  const total = recentResults.length;
  const correctAll = recentResults.filter(r => r.modelPerformance[perfKey]).length;
  const overallAccuracy = total > 0 ? correctAll / total : 0;

  // 최근 10건 정확도
  const recent10 = recentResults.slice(-10);
  const correctRecent = recent10.filter(r => r.modelPerformance[perfKey]).length;
  const recentAccuracy = recent10.length > 0 ? correctRecent / recent10.length : 0;

  // 추세 판별
  let trend: "improving" | "stable" | "degrading" = "stable";
  if (recentAccuracy - overallAccuracy > 0.1) trend = "improving";
  else if (overallAccuracy - recentAccuracy > 0.1) trend = "degrading";

  // 확신도 보정 정확도: 확신도가 높을 때 정답, 낮을 때 오답이면 보정 잘 된 것
  let calibrationScore = 0;
  let calibrationCount = 0;
  for (const r of recentResults) {
    const diag = r.modelDiagnoses.find(d => d.modelName === modelName);
    if (diag) {
      const confNorm = diag.confidence / 100;
      const outcomeScore = diag.wasCorrect ? 1 : 0;
      calibrationScore += 1 - Math.abs(confNorm - outcomeScore);
      calibrationCount++;
    }
  }
  const confidenceCalibration = calibrationCount > 0 ? calibrationScore / calibrationCount : 0.5;

  // 시장 레짐별 성과 (marketRegime 필드 활용)
  const regimePerf: Record<string, { correct: number; total: number }> = {};
  for (const r of recentResults) {
    const regime = r.marketRegime || "불명";
    if (!regimePerf[regime]) regimePerf[regime] = { correct: 0, total: 0 };
    regimePerf[regime].total++;
    const diag = r.modelDiagnoses.find(d => d.modelName === modelName);
    if (diag?.wasCorrect) regimePerf[regime].correct++;
  }

  let bestRegime = "불명";
  let worstRegime = "불명";
  let bestRate = -1;
  let worstRate = 2;
  for (const [regime, perf] of Object.entries(regimePerf)) {
    const rate = perf.total > 0 ? perf.correct / perf.total : 0;
    if (rate > bestRate) { bestRate = rate; bestRegime = regime; }
    if (rate < worstRate) { worstRate = rate; worstRegime = regime; }
  }

  return {
    modelName,
    recentAccuracy,
    overallAccuracy,
    trend,
    confidenceCalibration,
    bestMarketRegime: bestRegime,
    worstMarketRegime: worstRegime,
  };
}

// ─── 모델 간 시너지 분석 ─────────────────────────────────────────────────────

/**
 * 모델 쌍별 시너지 분석
 *
 * - 동의율: 두 모델이 같은 방향 예측한 비율
 * - 동시 정답율: 동의했을 때 둘 다 맞은 비율
 * - 시너지 점수: 양수 = 좋은 조합, 음수 = 중복/무의미
 */
function analyzeModelSynergies(results: LearningResult[]): ModelSynergyResult[] {
  const modelNames = ["모멘텀", "평균회귀", "변동성", "교차상관", "펀더멘털"];
  const synergies: ModelSynergyResult[] = [];

  for (let i = 0; i < modelNames.length; i++) {
    for (let j = i + 1; j < modelNames.length; j++) {
      const nameA = modelNames[i];
      const nameB = modelNames[j];
      let agreements = 0;
      let bothCorrect = 0;
      let total = 0;

      for (const r of results) {
        const diagA = r.modelDiagnoses.find(d => d.modelName === nameA);
        const diagB = r.modelDiagnoses.find(d => d.modelName === nameB);
        if (!diagA || !diagB) continue;
        total++;

        if (diagA.predicted === diagB.predicted) {
          agreements++;
          if (diagA.wasCorrect && diagB.wasCorrect) {
            bothCorrect++;
          }
        }
      }

      const agreementRate = total > 0 ? agreements / total : 0;
      const bothCorrectRate = agreements > 0 ? bothCorrect / agreements : 0;
      // 시너지 점수: 동의 시 정답률이 높고, 동의율이 적절(0.3~0.7)하면 시너지 높음
      // 너무 높은 동의율 = 중복
      const diversityBonus = 1 - Math.abs(agreementRate - 0.5) * 2; // 0.5일 때 최대
      const synergyScore = (bothCorrectRate - 0.5) * 2 * diversityBonus;

      synergies.push({
        pair: [nameA, nameB],
        agreementRate: Math.round(agreementRate * 1000) / 1000,
        bothCorrectRate: Math.round(bothCorrectRate * 1000) / 1000,
        synergyScore: Math.round(synergyScore * 1000) / 1000,
      });
    }
  }

  return synergies.sort((a, b) => b.synergyScore - a.synergyScore);
}

// ─── 메타학습 통계 ───────────────────────────────────────────────────────────

/**
 * 메타학습 통계 수집
 *
 * 배치 학습 결과를 종합하여:
 * - 진단 카테고리별 빈도
 * - 모델별 개선 궤적
 * - 시장 상태별 정확도
 * - 최고/최저 모델 조합
 * - 모델별 평균 점수 및 추세
 */
function collectMetaLearningStats(results: LearningResult[]): MetaLearningStats {
  // 카테고리별 빈도
  const categoryFrequency: Record<string, number> = {};
  for (const r of results) {
    for (const d of r.modelDiagnoses) {
      for (const issue of d.issues) {
        categoryFrequency[issue.category] = (categoryFrequency[issue.category] || 0) + 1;
      }
    }
  }

  // 모델별 개선 궤적
  const modelNames = ["모멘텀", "평균회귀", "변동성", "교차상관", "펀더멘털"];
  const modelTrajectories: Record<string, string> = {};
  for (const name of modelNames) {
    const trend = analyzeModelTrend(results, name);
    modelTrajectories[name] = trend.trend;
  }

  // 시장 상태별 정확도
  const marketConditionAccuracy: Record<string, number> = {};
  const conditionCounts: Record<string, { correct: number; total: number }> = {};
  for (const r of results) {
    const regime = r.marketRegime || "불명";
    if (!conditionCounts[regime]) conditionCounts[regime] = { correct: 0, total: 0 };
    conditionCounts[regime].total++;
    if (r.wasCorrect) conditionCounts[regime].correct++;
  }
  for (const [regime, counts] of Object.entries(conditionCounts)) {
    marketConditionAccuracy[regime] = counts.total > 0 ? Math.round((counts.correct / counts.total) * 1000) / 1000 : 0;
  }

  // 모델 조합 성과 분석
  const comboPerf: Record<string, { correct: number; total: number }> = {};
  for (const r of results) {
    const correctModels = r.modelDiagnoses.filter(d => d.wasCorrect).map(d => d.modelName).sort().join("+");
    const key = correctModels || "전모델오답";
    if (!comboPerf[key]) comboPerf[key] = { correct: 0, total: 0 };
    comboPerf[key].total++;
    if (r.wasCorrect) comboPerf[key].correct++;
  }

  let bestCombo = "없음";
  let worstCombo = "없음";
  let bestComboRate = -1;
  let worstComboRate = 2;
  for (const [combo, perf] of Object.entries(comboPerf)) {
    if (perf.total < 2) continue; // 최소 2건 이상
    const rate = perf.correct / perf.total;
    if (rate > bestComboRate) { bestComboRate = rate; bestCombo = combo; }
    if (rate < worstComboRate) { worstComboRate = rate; worstCombo = combo; }
  }

  // 모델별 평균 점수 및 추세
  const avgScoresByModel: Record<string, { avg: number; trend: string }> = {};
  for (const name of modelNames) {
    const scores = results.flatMap(r => r.advancedScores?.filter(s => s.modelName === name).map(s => s.finalScore) || []);
    if (scores.length === 0) {
      // advancedScores가 아직 없는 경우 기존 modelScores 사용
      const fallbackScores = results.flatMap(r => r.modelScores.filter(s => s.modelName === name).map(s => s.score));
      const avg = fallbackScores.length > 0 ? fallbackScores.reduce((a, b) => a + b, 0) / fallbackScores.length : 0;
      avgScoresByModel[name] = { avg: Math.round(avg * 100) / 100, trend: modelTrajectories[name] || "stable" };
    } else {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      avgScoresByModel[name] = { avg: Math.round(avg * 100) / 100, trend: modelTrajectories[name] || "stable" };
    }
  }

  return {
    categoryFrequency,
    modelTrajectories,
    marketConditionAccuracy,
    bestModelCombination: bestCombo,
    worstModelCombination: worstCombo,
    avgScoresByModel,
  };
}

// ─── 종합 리포트 생성 ──────────────────────────────────────────────────────────

function generateDetailedLesson(
  prediction: AIPrediction,
  actual: Direction,
  actualReturn: number,
  diagnoses: ModelDiagnosis[],
  ensembleDiag: EnsembleDiagnosis,
  rootCause: RootCauseAnalysis,
  wasCorrect: boolean,
  newWeights: EnsembleConfig,
  scores: ModelScore[],
  totalScore: number,
): string {
  const parts: string[] = [];

  // 헤더
  if (wasCorrect) {
    parts.push(`✅ 예측 성공: ${prediction.assetId} — "${prediction.direction}" 예측 적중 (실제 ${actualReturn > 0 ? "+" : ""}${actualReturn.toFixed(1)}%)`);
  } else {
    parts.push(`❌ 예측 실패: ${prediction.assetId} — "${prediction.direction}" 예측 → 실제 "${actual}" (${actualReturn > 0 ? "+" : ""}${actualReturn.toFixed(1)}%)`);
  }

  // 모델별 성과
  parts.push("\n─── 서브모델별 진단 ───");
  for (const diag of diagnoses) {
    const status = diag.wasCorrect ? "✓" : "✗";
    parts.push(`${status} ${diag.modelName}: ${diag.predicted} (확신도 ${diag.confidence.toFixed(0)}%)`);
    if (diag.issues.length > 0) {
      for (const issue of diag.issues) {
        parts.push(`  [${issue.severity}][${issue.category}] ${issue.description}`);
        parts.push(`  → 개선: ${issue.suggestedFix}`);
      }
    }
  }

  // 앙상블 진단
  if (ensembleDiag.votingIssues.length > 0 || ensembleDiag.modelConflicts.length > 0) {
    parts.push("\n─── 앙상블 구조 진단 ───");
    for (const issue of ensembleDiag.votingIssues) parts.push(`• ${issue}`);
    for (const conflict of ensembleDiag.modelConflicts) parts.push(`• ${conflict}`);
  }

  // 근본 원인
  if (!wasCorrect) {
    parts.push("\n─── 근본 원인 분석 ───");
    parts.push(`주요 원인: ${rootCause.primaryCause}`);
    if (rootCause.secondaryCauses.length > 0) {
      parts.push(`부차적 원인:`);
      for (const cause of rootCause.secondaryCauses) parts.push(`  - ${cause}`);
    }
    parts.push(`시장 상태: ${rootCause.marketCondition}`);
    if (rootCause.wasUnpredictable && rootCause.unpredictableReason) {
      parts.push(`※ ${rootCause.unpredictableReason}`);
    }
  }

  // 개선 종합
  const allImprovements = [...new Set(diagnoses.flatMap((d) => d.improvements))];
  if (allImprovements.length > 0) {
    parts.push("\n─── 개선 사항 ───");
    for (const imp of allImprovements) parts.push(`→ ${imp}`);
  }

  // 강화학습 점수
  parts.push(`\n─── 강화학습 점수 (총 ${totalScore > 0 ? "+" : ""}${totalScore}점) ───`);
  for (const ms of scores) {
    const sign = ms.score > 0 ? "+" : "";
    parts.push(`  ${ms.modelName}: ${sign}${ms.score}점 (${ms.reason})`);
  }

  // 새 가중치
  parts.push(`\n─── 조정된 가중치 ───`);
  parts.push(`  모멘텀: ${(newWeights.momentumWeight * 100).toFixed(1)}%`);
  parts.push(`  평균회귀: ${(newWeights.meanReversionWeight * 100).toFixed(1)}%`);
  parts.push(`  변동성: ${(newWeights.volatilityWeight * 100).toFixed(1)}%`);
  parts.push(`  교차상관: ${(newWeights.correlationWeight * 100).toFixed(1)}%`);
  parts.push(`  펀더멘털: ${(newWeights.fundamentalWeight * 100).toFixed(1)}%`);

  return parts.join("\n");
}

// ─── 메인 학습 함수 ───────────────────────────────────────────────────────────

export function learn(
  outcome: PredictionOutcome,
  currentWeights: EnsembleConfig,
): LearningResult {
  const { prediction, actualDirection, actualReturnPercent, postData, preData } = outcome;
  const wasCorrect = prediction.direction === actualDirection;

  // 1. 각 모델별 심층 진단
  const votes = prediction.subModelVotes;
  const modelDiagnoses: ModelDiagnosis[] = [
    diagnoseMomentum(votes.momentum, actualDirection, preData, postData),
    diagnoseMeanReversion(votes.meanReversion, actualDirection, preData),
    diagnoseVolatility(votes.volatility, actualDirection, preData, actualReturnPercent),
    diagnoseCorrelation(votes.correlation, actualDirection),
    diagnoseFundamental(votes.fundamental, actualDirection),
  ];

  // 2. 앙상블 구조 진단
  const ensembleDiagnosis = diagnoseEnsemble(
    votes,
    prediction.direction,
    actualDirection,
    wasCorrect,
  );

  // 3. 근본 원인 분석
  const rootCause = analyzeRootCause(
    prediction,
    actualDirection,
    actualReturnPercent,
    modelDiagnoses,
    ensembleDiagnosis,
    preData,
    postData,
  );

  // 4. 강화학습 점수 계산 (기존)
  const minorityCorrectSet = new Set(ensembleDiagnosis.correctMinorityModels);
  const modelScores: ModelScore[] = modelDiagnoses.map((diag) =>
    calculateModelScore(
      diag,
      actualDirection,
      actualReturnPercent,
      minorityCorrectSet.has(diag.modelName),
    ),
  );
  const totalScore = modelScores.reduce((sum, ms) => sum + ms.score, 0);

  // 4-1. 시장 레짐 감지
  const marketRegime = detectMarketRegime(preData);

  // 4-2. 고도화 점수 계산
  const advancedScores: AdvancedModelScore[] = modelDiagnoses.map((diag, idx) =>
    calculateAdvancedModelScore(
      diag,
      actualDirection,
      actualReturnPercent,
      modelScores[idx].score,
      marketRegime,
      postData,
    ),
  );

  // 4-3. 적응 학습률 계산
  const volatilityLevel = classifyVolatility(preData);
  const correctModelsCount = modelDiagnoses.filter(d => d.wasCorrect).length;
  const recentAccuracy = correctModelsCount / modelDiagnoses.length;
  // 학습 모멘텀: 고도화 점수의 평균 방향으로 추정
  const avgAdvScore = advancedScores.reduce((s, a) => s + a.finalScore, 0) / advancedScores.length;
  const learningMomentum = Math.max(-1, Math.min(1, avgAdvScore / 20)); // 정규화

  const adaptiveLearningRate = calculateAdaptiveLearningRate({
    baseRate: 0.003,
    recentAccuracy,
    marketVolatility: volatilityLevel,
    learningMomentum,
  });

  // 5. 고도화 가중치 조정 (적응 학습률 + 모멘텀 기반)
  const weightAdjustment = adjustWeightsAdvanced(
    currentWeights,
    modelDiagnoses,
    ensembleDiagnosis,
    advancedScores,
    adaptiveLearningRate,
  );

  // 6. 놓친 요인 (기존 호환용)
  const missedFactors = modelDiagnoses
    .filter((d) => !d.wasCorrect)
    .flatMap((d) => d.issues.map((i) => `[${d.modelName}] ${i.description}`));

  // 7. 모델 성과 (기존 호환용)
  const modelPerformance = {
    momentum: modelDiagnoses[0].wasCorrect,
    meanReversion: modelDiagnoses[1].wasCorrect,
    volatility: modelDiagnoses[2].wasCorrect,
    correlation: modelDiagnoses[3].wasCorrect,
    fundamental: modelDiagnoses[4].wasCorrect,
  };

  // 8. 종합 리포트
  const lesson = generateDetailedLesson(
    prediction,
    actualDirection,
    actualReturnPercent,
    modelDiagnoses,
    ensembleDiagnosis,
    rootCause,
    wasCorrect,
    weightAdjustment,
    modelScores,
    totalScore,
  );

  return {
    cycleId: prediction.cycleId,
    assetId: prediction.assetId,
    predictedDirection: prediction.direction,
    actualDirection,
    wasCorrect,
    missedFactors,
    modelPerformance,
    modelDiagnoses,
    ensembleDiagnosis,
    rootCause,
    modelScores,
    totalScore,
    weightAdjustment,
    lesson,
    // ── 고도화 확장 필드 ──
    advancedScores,
    adaptiveLearningRate,
    marketRegime,
  };
}

// ─── 배치 학습 ──────────────────────────────────────────────────────────────

export function batchLearn(
  outcomes: PredictionOutcome[],
  initialWeights: EnsembleConfig,
): { results: LearningResult[]; finalWeights: EnsembleConfig; summary: string } {
  let currentWeights = { ...initialWeights };
  const results: LearningResult[] = [];
  let correctCount = 0;

  for (const outcome of outcomes) {
    const result = learn(outcome, currentWeights);
    results.push(result);
    currentWeights = result.weightAdjustment;
    if (result.wasCorrect) correctCount++;
  }

  const accuracy = outcomes.length > 0
    ? ((correctCount / outcomes.length) * 100).toFixed(1)
    : "0.0";

  // 전체 이슈 통계
  const allIssues = results.flatMap((r) => r.modelDiagnoses.flatMap((d) => d.issues));
  const severeCount = allIssues.filter((i) => i.severity === "심각").length;
  const warningCount = allIssues.filter((i) => i.severity === "주의").length;

  // 모델별 누적 점수 (기존)
  const modelTotalScores: Record<string, number> = {};
  for (const r of results) {
    for (const ms of r.modelScores) {
      modelTotalScores[ms.modelName] = (modelTotalScores[ms.modelName] || 0) + ms.score;
    }
  }
  const batchTotalScore = Object.values(modelTotalScores).reduce((a, b) => a + b, 0);

  // ── 고도화: 모델별 고도화 누적 점수 ──
  const advancedTotalScores: Record<string, number> = {};
  for (const r of results) {
    for (const as of (r.advancedScores || [])) {
      advancedTotalScores[as.modelName] = (advancedTotalScores[as.modelName] || 0) + as.finalScore;
    }
  }

  // ── 고도화: 메타학습 통계 수집 ──
  const metaStats = collectMetaLearningStats(results);

  // ── 고도화: 성과 추세 분석 ──
  const modelNames = ["모멘텀", "평균회귀", "변동성", "교차상관", "펀더멘털"];
  const performanceTrends = modelNames.map(name => analyzeModelTrend(results, name));

  // ── 고도화: 모델 시너지 분석 ──
  const synergies = analyzeModelSynergies(results);

  // 결과에 메타 통계 및 추세 정보 추가 (마지막 결과에)
  if (results.length > 0) {
    const lastResult = results[results.length - 1];
    lastResult.metaStats = metaStats;
    lastResult.performanceTrends = performanceTrends;
  }

  const allImprovements = [...new Set(results.flatMap((r) => r.modelDiagnoses.flatMap((d) => d.improvements)))];

  // ── 고도화: 평균 적응 학습률 ──
  const avgAdaptiveRate = results.length > 0
    ? results.reduce((s, r) => s + (r.adaptiveLearningRate || 0.003), 0) / results.length
    : 0.003;

  const summary = [
    `═══ 배치 학습 리포트 (고도화) ═══`,
    `총 ${outcomes.length}건 학습 완료 | 정확도: ${accuracy}% (${correctCount}/${outcomes.length})`,
    `총 강화학습 점수: ${batchTotalScore > 0 ? "+" : ""}${batchTotalScore}점`,
    `평균 적응 학습률: ${avgAdaptiveRate.toFixed(4)}`,
    `발견된 이슈: 심각 ${severeCount}건, 주의 ${warningCount}건`,
    ``,
    `─── 모델별 기본 누적 점수 ───`,
    ...Object.entries(modelTotalScores)
      .sort(([, a], [, b]) => b - a)
      .map(([name, score]) => `  ${name}: ${score > 0 ? "+" : ""}${score}점`),
    ``,
    `─── 모델별 고도화 누적 점수 ───`,
    ...Object.entries(advancedTotalScores)
      .sort(([, a], [, b]) => b - a)
      .map(([name, score]) => `  ${name}: ${score > 0 ? "+" : ""}${score.toFixed(1)}점`),
    ``,
    `─── 모델별 성과 추세 ───`,
    ...performanceTrends.map(t =>
      `  ${t.modelName}: 최근${(t.recentAccuracy * 100).toFixed(0)}% / 전체${(t.overallAccuracy * 100).toFixed(0)}% [${t.trend === "improving" ? "개선중" : t.trend === "degrading" ? "악화중" : "안정"}] 최적레짐:${t.bestMarketRegime} 최악레짐:${t.worstMarketRegime}`),
    ``,
    `─── 모델 시너지 TOP 3 ───`,
    ...synergies.slice(0, 3).map(s =>
      `  ${s.pair[0]}+${s.pair[1]}: 동의율${(s.agreementRate * 100).toFixed(0)}% 동시정답${(s.bothCorrectRate * 100).toFixed(0)}% 시너지${s.synergyScore > 0 ? "+" : ""}${s.synergyScore.toFixed(3)}`),
    ``,
    `─── 진단 카테고리 빈도 ───`,
    ...Object.entries(metaStats.categoryFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, freq]) => `  ${cat}: ${freq}건`),
    ``,
    `─── 시장 상태별 정확도 ───`,
    ...Object.entries(metaStats.marketConditionAccuracy)
      .map(([regime, acc]) => `  ${regime}: ${(acc * 100).toFixed(1)}%`),
    ``,
    `최고 모델 조합: ${metaStats.bestModelCombination}`,
    `최저 모델 조합: ${metaStats.worstModelCombination}`,
    ``,
    `조정된 가중치:`,
    `  모멘텀: ${(currentWeights.momentumWeight * 100).toFixed(1)}%`,
    `  평균회귀: ${(currentWeights.meanReversionWeight * 100).toFixed(1)}%`,
    `  변동성: ${(currentWeights.volatilityWeight * 100).toFixed(1)}%`,
    `  교차상관: ${(currentWeights.correlationWeight * 100).toFixed(1)}%`,
    `  펀더멘털: ${(currentWeights.fundamentalWeight * 100).toFixed(1)}%`,
    ``,
    allImprovements.length > 0
      ? `우선 개선 사항:\n${allImprovements.slice(0, 5).map((i) => `  → ${i}`).join("\n")}`
      : "특별한 개선 사항 없음",
  ].join("\n");

  return { results, finalWeights: currentWeights, summary };
}
