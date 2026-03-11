/**
 * 30인 AI 배심원 시스템
 *
 * 토론 엔진의 결과를 평가하고 예측에 대한 최종 판정을 내린다.
 * 5개 카테고리에 걸쳐 30명의 전문 배심원이 독립적으로 평가한 후
 * 가중 투표를 통해 최종 신뢰도 판정을 산출한다.
 */

import type { Direction } from "./models";
import {
  PriceBar,
  calcRSI,
  calcMACD,
  calcBollingerBands,
  calcATR,
  calcSMA,
  calcEMA,
  calcROC,
} from "./indicators";
import type { AdvancedSignals } from "./advancedAnalysis";
import type { CollectedData } from "./dataCollector";

// ═══════════════════════════════════════════════════════════════════════════════
// 배심원용 토론 결과 입력 타입
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 배심원 시스템이 사용하는 토론 결과 형태.
 * debateSystem.ts의 JuryDebateInput를 변환하여 전달한다.
 */
export interface JuryDebateInput {
  /** 예측 방향 */
  predictedDirection: Direction;
  /** 예측 신뢰도 (0-100) */
  confidence: number;
  /** 상승 측 논거 */
  bullishArguments: string[];
  /** 하락 측 논거 */
  bearishArguments: string[];
  /** 토론 합의 수준 */
  consensusLevel: "강한합의" | "합의" | "약한합의" | "불일치";
  /** 토론 근거 요약 */
  summary: string;
  /** 개별 모델 투표 결과 */
  votes?: Array<{
    modelName: string;
    direction: Direction;
    confidence: number;
    rationale: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 배심원 시스템 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

/** 배심원 고유 식별자 */
export type JurorId = string;

/** 배심원 카테고리 (5개 전문 영역) */
export type JurorCategory =
  | "기술적분석"
  | "거시경제"
  | "리스크관리"
  | "행동경제학"
  | "통계계량";

/** 배심원 판정 결과 */
export type JurorVerdict = "신뢰" | "부분신뢰" | "의심" | "불신";

/** 개별 배심원의 평가 결과 */
export interface JurorEvaluation {
  jurorId: JurorId;
  jurorName: string;
  category: JurorCategory;
  verdict: JurorVerdict;
  confidence: number; // 0-100
  reasoning: string;
  keyFactors: string[];
  credibilityScore: number; // 0-1, 해당 배심원의 과거 정확도 기반 신뢰 점수
}

/** 판정 요약 집계 */
export interface VerdictSummary {
  trust: number;        // "신뢰" 투표 수
  partialTrust: number; // "부분신뢰" 투표 수
  doubt: number;        // "의심" 투표 수
  distrust: number;     // "불신" 투표 수
}

/** 카테고리별 판정 분석 */
export interface CategoryBreakdown {
  category: JurorCategory;
  verdicts: VerdictSummary;
  averageConfidence: number;
  dominantVerdict: JurorVerdict;
  weight: number;
}

/** 반대 의견 */
export interface DissentingOpinion {
  jurorId: JurorId;
  jurorName: string;
  category: JurorCategory;
  verdict: JurorVerdict;
  reasoning: string;
}

/** 배심원단 심의 결과 (최종 출력) */
export interface JuryDeliberation {
  evaluations: JurorEvaluation[];
  verdictSummary: VerdictSummary;
  finalVerdict: JurorVerdict;
  finalConfidence: number;
  categoryBreakdown: CategoryBreakdown[];
  dissentingOpinions: DissentingOpinion[];
}

/** 배심원 학습 결과 */
export interface JuryLearningResult {
  jurorId: JurorId;
  previousAccuracy: number;
  adjustments: string[];
  newSpecialtyFocus: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 배심원 정의 (30명, 5개 카테고리)
// ═══════════════════════════════════════════════════════════════════════════════

/** 개별 배심원 프로필 */
interface JurorProfile {
  id: JurorId;
  name: string;
  category: JurorCategory;
  /** 과거 정확도 기반 신뢰 점수 (런타임에서 학습으로 갱신) */
  credibilityScore: number;
}

/**
 * 카테고리별 가중치
 * 최종 판정 계산 시 카테고리 영향력을 결정한다.
 */
const CATEGORY_WEIGHTS: Record<JurorCategory, number> = {
  기술적분석: 0.30,
  거시경제: 0.25,
  리스크관리: 0.20,
  행동경제학: 0.10,
  통계계량: 0.15,
};

/** 판정별 수치 점수 (가중 합산에 사용) */
const VERDICT_SCORES: Record<JurorVerdict, number> = {
  신뢰: 1.0,
  부분신뢰: 0.6,
  의심: 0.3,
  불신: 0.0,
};

/** 전체 30명 배심원 프로필 */
const JUROR_PROFILES: JurorProfile[] = [
  // ─── 기술적 분석 (8명) ───
  { id: "tech-rsi", name: "RSI전문가", category: "기술적분석", credibilityScore: 0.75 },
  { id: "tech-macd", name: "MACD전문가", category: "기술적분석", credibilityScore: 0.75 },
  { id: "tech-bollinger", name: "볼린저밴드전문가", category: "기술적분석", credibilityScore: 0.75 },
  { id: "tech-ma", name: "이동평균전문가", category: "기술적분석", credibilityScore: 0.75 },
  { id: "tech-candle", name: "캔들패턴전문가", category: "기술적분석", credibilityScore: 0.70 },
  { id: "tech-volume", name: "거래량전문가", category: "기술적분석", credibilityScore: 0.70 },
  { id: "tech-fibonacci", name: "피보나치전문가", category: "기술적분석", credibilityScore: 0.70 },
  { id: "tech-elliott", name: "엘리어트파동전문가", category: "기술적분석", credibilityScore: 0.65 },

  // ─── 거시경제 (7명) ───
  { id: "macro-rate", name: "금리전문가", category: "거시경제", credibilityScore: 0.75 },
  { id: "macro-inflation", name: "인플레이션전문가", category: "거시경제", credibilityScore: 0.75 },
  { id: "macro-fx", name: "환율전문가", category: "거시경제", credibilityScore: 0.70 },
  { id: "macro-commodity", name: "원자재전문가", category: "거시경제", credibilityScore: 0.70 },
  { id: "macro-employment", name: "고용전문가", category: "거시경제", credibilityScore: 0.70 },
  { id: "macro-gdp", name: "GDP전문가", category: "거시경제", credibilityScore: 0.70 },
  { id: "macro-trade", name: "무역수지전문가", category: "거시경제", credibilityScore: 0.65 },

  // ─── 리스크 관리 (5명) ───
  { id: "risk-var", name: "VaR전문가", category: "리스크관리", credibilityScore: 0.75 },
  { id: "risk-volatility", name: "변동성전문가", category: "리스크관리", credibilityScore: 0.75 },
  { id: "risk-correlation", name: "상관관계전문가", category: "리스크관리", credibilityScore: 0.70 },
  { id: "risk-liquidity", name: "유동성전문가", category: "리스크관리", credibilityScore: 0.70 },
  { id: "risk-systematic", name: "체계적위험전문가", category: "리스크관리", credibilityScore: 0.70 },

  // ─── 행동경제학 (5명) ───
  { id: "behav-crowd", name: "군중심리전문가", category: "행동경제학", credibilityScore: 0.65 },
  { id: "behav-overreaction", name: "과잉반응전문가", category: "행동경제학", credibilityScore: 0.65 },
  { id: "behav-anchoring", name: "앵커링전문가", category: "행동경제학", credibilityScore: 0.65 },
  { id: "behav-loss-aversion", name: "손실회피전문가", category: "행동경제학", credibilityScore: 0.65 },
  { id: "behav-confirmation", name: "확증편향전문가", category: "행동경제학", credibilityScore: 0.60 },

  // ─── 통계/계량 (5명) ───
  { id: "stat-regression", name: "회귀분석전문가", category: "통계계량", credibilityScore: 0.70 },
  { id: "stat-timeseries", name: "시계열전문가", category: "통계계량", credibilityScore: 0.70 },
  { id: "stat-bayesian", name: "베이지안전문가", category: "통계계량", credibilityScore: 0.70 },
  { id: "stat-montecarlo", name: "몬테카를로전문가", category: "통계계량", credibilityScore: 0.70 },
  { id: "stat-ml", name: "머신러닝전문가", category: "통계계량", credibilityScore: 0.65 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 헬퍼 함수
// ═══════════════════════════════════════════════════════════════════════════════

/** 값을 지정 범위로 제한 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** 수치 점수를 판정으로 변환 */
function scoreToVerdict(score: number): JurorVerdict {
  if (score >= 0.75) return "신뢰";
  if (score >= 0.50) return "부분신뢰";
  if (score >= 0.25) return "의심";
  return "불신";
}

/** 최근 N일 수익률 계산 */
function recentReturn(data: PriceBar[], lookback: number): number | null {
  if (data.length < lookback + 1) return null;
  const current = data[data.length - 1].close;
  const previous = data[data.length - 1 - lookback].close;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/** 단순 표준편차 계산 */
function calcStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** 토론 결과의 방향 일관성 점수 (0-1) */
function assessDirectionConsistency(debateResult: JuryDebateInput): number {
  const { consensusLevel, confidence } = debateResult;
  const consensusMap: Record<string, number> = {
    "강한합의": 1.0,
    "합의": 0.75,
    "약한합의": 0.50,
    "불일치": 0.25,
  };
  const consensusScore = consensusMap[consensusLevel] ?? 0.5;
  return (consensusScore * 0.6 + (confidence / 100) * 0.4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 개별 배심원 평가 로직
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 기술적 분석 배심원 (8명) ─────────────────────────────────────────────────

function evaluateRSI(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  profile: JurorProfile,
): JurorEvaluation {
  const rsi = calcRSI(data);
  const factors: string[] = [];
  let score = 0.5; // 기본 중립

  if (rsi !== null) {
    factors.push(`현재 RSI: ${rsi.toFixed(1)}`);

    const predicted = debateResult.predictedDirection;
    if (predicted === "상승") {
      if (rsi < 30) {
        score = 0.9;
        factors.push("RSI 과매도 영역에서 상승 예측은 강하게 지지됨");
      } else if (rsi < 50) {
        score = 0.7;
        factors.push("RSI 중립 이하에서 상승 여력 존재");
      } else if (rsi > 70) {
        score = 0.2;
        factors.push("RSI 과매수 영역에서 추가 상승 예측은 위험");
      } else {
        score = 0.55;
        factors.push("RSI 중립 상단, 상승 예측에 약간 우호적");
      }
    } else if (predicted === "하락") {
      if (rsi > 70) {
        score = 0.9;
        factors.push("RSI 과매수 영역에서 하락 예측은 강하게 지지됨");
      } else if (rsi > 50) {
        score = 0.7;
        factors.push("RSI 중립 이상에서 하락 반전 가능성 존재");
      } else if (rsi < 30) {
        score = 0.2;
        factors.push("RSI 과매도 영역에서 추가 하락 예측은 위험");
      } else {
        score = 0.55;
        factors.push("RSI 중립 하단, 하락 예측에 약간 우호적");
      }
    } else {
      // 보합/변동성확대
      if (rsi > 40 && rsi < 60) {
        score = 0.8;
        factors.push("RSI 중립 구간, 보합 예측 지지");
      } else {
        score = 0.4;
        factors.push("RSI가 극단 방향으로 치우쳐 있어 보합 예측에 의문");
      }
    }
  } else {
    factors.push("RSI 계산 불가 (데이터 부족)");
    score = 0.5;
  }

  return {
    jurorId: profile.id,
    jurorName: profile.name,
    category: profile.category,
    verdict: scoreToVerdict(score),
    confidence: Math.round(score * 100),
    reasoning: `RSI 기반 분석: ${factors.join(". ")}`,
    keyFactors: factors,
    credibilityScore: profile.credibilityScore,
  };
}

function evaluateMACD(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  profile: JurorProfile,
): JurorEvaluation {
  const macd = calcMACD(data);
  const factors: string[] = [];
  let score = 0.5;

  if (macd !== null) {
    const { macdLine, histogram, signalLine } = macd;
    factors.push(`MACD선: ${macdLine.toFixed(2)}, 히스토그램: ${histogram.toFixed(2)}`);

    const predicted = debateResult.predictedDirection;
    const isBullishMACD = macdLine > signalLine && histogram > 0;
    const isBearishMACD = macdLine < signalLine && histogram < 0;

    if (predicted === "상승") {
      if (isBullishMACD) {
        score = 0.85;
        factors.push("MACD 상승 크로스 확인 -- 상승 예측 강하게 지지");
      } else if (histogram > 0) {
        score = 0.65;
        factors.push("히스토그램 양수이나 크로스 미확인");
      } else {
        score = 0.25;
        factors.push("MACD 하락 신호 중 -- 상승 예측에 반대");
      }
    } else if (predicted === "하락") {
      if (isBearishMACD) {
        score = 0.85;
        factors.push("MACD 하락 크로스 확인 -- 하락 예측 강하게 지지");
      } else if (histogram < 0) {
        score = 0.65;
        factors.push("히스토그램 음수이나 크로스 미확인");
      } else {
        score = 0.25;
        factors.push("MACD 상승 신호 중 -- 하락 예측에 반대");
      }
    } else {
      score = Math.abs(histogram) < 0.5 ? 0.7 : 0.4;
      factors.push(
        Math.abs(histogram) < 0.5
          ? "히스토그램 약세, 보합 예측 지지"
          : "MACD에 방향성 존재, 보합 예측에 의문",
      );
    }
  } else {
    factors.push("MACD 계산 불가 (데이터 부족)");
  }

  return {
    jurorId: profile.id,
    jurorName: profile.name,
    category: profile.category,
    verdict: scoreToVerdict(score),
    confidence: Math.round(score * 100),
    reasoning: `MACD 기반 분석: ${factors.join(". ")}`,
    keyFactors: factors,
    credibilityScore: profile.credibilityScore,
  };
}

function evaluateBollinger(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  profile: JurorProfile,
): JurorEvaluation {
  const bb = calcBollingerBands(data);
  const factors: string[] = [];
  let score = 0.5;

  if (bb !== null) {
    factors.push(`%B: ${(bb.percentB * 100).toFixed(1)}%, 밴드폭: ${(bb.width * 100).toFixed(1)}%`);

    const predicted = debateResult.predictedDirection;
    if (predicted === "상승") {
      if (bb.percentB <= 0.0) {
        score = 0.85;
        factors.push("밴드 하단 이탈 후 반등 기대, 상승 예측 강하게 지지");
      } else if (bb.percentB < 0.3) {
        score = 0.7;
        factors.push("밴드 하단부 위치, 상승 여력 충분");
      } else if (bb.percentB >= 1.0) {
        score = 0.2;
        factors.push("밴드 상단 돌파 상태, 추가 상승보다 되돌림 예상");
      } else {
        score = 0.5;
        factors.push("밴드 중간 영역, 중립적");
      }
    } else if (predicted === "하락") {
      if (bb.percentB >= 1.0) {
        score = 0.85;
        factors.push("밴드 상단 돌파 후 되돌림 기대, 하락 예측 강하게 지지");
      } else if (bb.percentB > 0.7) {
        score = 0.7;
        factors.push("밴드 상단부 위치, 하락 전환 가능성");
      } else if (bb.percentB <= 0.0) {
        score = 0.2;
        factors.push("밴드 하단 이탈 상태, 추가 하락보다 반등 예상");
      } else {
        score = 0.5;
        factors.push("밴드 중간 영역, 중립적");
      }
    } else {
      // 보합/변동성확대
      if (bb.width < 0.03) {
        score = debateResult.predictedDirection === "변동성확대" ? 0.8 : 0.4;
        factors.push("밴드 극도 수축, 돌파 임박 가능성");
      } else if (bb.percentB > 0.3 && bb.percentB < 0.7) {
        score = 0.75;
        factors.push("밴드 중앙부 위치, 보합 예측 지지");
      } else {
        score = 0.45;
        factors.push("밴드 극단 접근, 보합보다 방향성 가능성");
      }
    }
  } else {
    factors.push("볼린저밴드 계산 불가 (데이터 부족)");
  }

  return {
    jurorId: profile.id,
    jurorName: profile.name,
    category: profile.category,
    verdict: scoreToVerdict(score),
    confidence: Math.round(score * 100),
    reasoning: `볼린저밴드 기반 분석: ${factors.join(". ")}`,
    keyFactors: factors,
    credibilityScore: profile.credibilityScore,
  };
}

function evaluateMovingAverage(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  profile: JurorProfile,
): JurorEvaluation {
  const factors: string[] = [];
  let score = 0.5;

  const sma20 = calcSMA(data, 20);
  const sma50 = calcSMA(data, 50);
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  const currentPrice = data.length > 0 ? data[data.length - 1].close : null;

  if (currentPrice !== null && sma20 !== null) {
    const aboveSma20 = currentPrice > sma20;
    const aboveSma50 = sma50 !== null ? currentPrice > sma50 : null;
    const goldenCross = ema12 !== null && ema26 !== null ? ema12 > ema26 : null;

    factors.push(`현재가 vs SMA20: ${aboveSma20 ? "상위" : "하위"}`);
    if (aboveSma50 !== null) factors.push(`현재가 vs SMA50: ${aboveSma50 ? "상위" : "하위"}`);
    if (goldenCross !== null) factors.push(`EMA12/26 ${goldenCross ? "골든크로스" : "데드크로스"}`);

    const predicted = debateResult.predictedDirection;
    let bullishCount = 0;
    let totalSignals = 0;

    if (aboveSma20) bullishCount++;
    totalSignals++;
    if (aboveSma50 !== null) {
      if (aboveSma50) bullishCount++;
      totalSignals++;
    }
    if (goldenCross !== null) {
      if (goldenCross) bullishCount++;
      totalSignals++;
    }

    const bullishRatio = totalSignals > 0 ? bullishCount / totalSignals : 0.5;

    if (predicted === "상승") {
      score = 0.3 + bullishRatio * 0.6;
      factors.push(
        bullishRatio > 0.6
          ? "이동평균 정렬이 상승 예측을 지지"
          : "이동평균 정렬이 상승 예측과 불일치",
      );
    } else if (predicted === "하락") {
      score = 0.3 + (1 - bullishRatio) * 0.6;
      factors.push(
        bullishRatio < 0.4
          ? "이동평균 정렬이 하락 예측을 지지"
          : "이동평균 정렬이 하락 예측과 불일치",
      );
    } else {
      score = bullishRatio > 0.3 && bullishRatio < 0.7 ? 0.7 : 0.4;
      factors.push("이동평균 혼조, 보합 판단");
    }
  } else {
    factors.push("이동평균 계산 불가 (데이터 부족)");
  }

  return {
    jurorId: profile.id,
    jurorName: profile.name,
    category: profile.category,
    verdict: scoreToVerdict(score),
    confidence: Math.round(score * 100),
    reasoning: `이동평균 기반 분석: ${factors.join(". ")}`,
    keyFactors: factors,
    credibilityScore: profile.credibilityScore,
  };
}

function evaluateCandlePattern(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  profile: JurorProfile,
): JurorEvaluation {
  const factors: string[] = [];
  let score = 0.5;

  if (data.length >= 3) {
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    const prevPrev = data[data.length - 3];

    const lastBody = last.close - (data[data.length - 2]?.close ?? last.close);
    const prevBody = prev.close - prevPrev.close;

    // 간단한 캔들 패턴 감지
    const isBullishEngulfing = lastBody > 0 && prevBody < 0 && Math.abs(lastBody) > Math.abs(prevBody);
    const isBearishEngulfing = lastBody < 0 && prevBody > 0 && Math.abs(lastBody) > Math.abs(prevBody);

    const hasLongLowerShadow =
      last.low !== undefined && last.close > last.low &&
      (last.close - last.low) > Math.abs(lastBody) * 2;
    const hasLongUpperShadow =
      last.high !== undefined && last.high > last.close &&
      (last.high - last.close) > Math.abs(lastBody) * 2;

    if (isBullishEngulfing) factors.push("상승 장악형 캔들 패턴 감지");
    if (isBearishEngulfing) factors.push("하락 장악형 캔들 패턴 감지");
    if (hasLongLowerShadow) factors.push("긴 하단 꼬리 (매수세 유입 신호)");
    if (hasLongUpperShadow) factors.push("긴 상단 꼬리 (매도 압력 신호)");

    const predicted = debateResult.predictedDirection;
    if (predicted === "상승") {
      if (isBullishEngulfing || hasLongLowerShadow) {
        score = 0.8;
      } else if (isBearishEngulfing || hasLongUpperShadow) {
        score = 0.25;
      } else {
        score = 0.5;
        factors.push("뚜렷한 캔들 패턴 없음");
      }
    } else if (predicted === "하락") {
      if (isBearishEngulfing || hasLongUpperShadow) {
        score = 0.8;
      } else if (isBullishEngulfing || hasLongLowerShadow) {
        score = 0.25;
      } else {
        score = 0.5;
        factors.push("뚜렷한 캔들 패턴 없음");
      }
    } else {
      score = 0.55;
      factors.push("보합 예측에 대한 캔들 패턴 중립");
    }
  } else {
    factors.push("캔들 패턴 분석 불가 (데이터 부족)");
  }

  return {
    jurorId: profile.id,
    jurorName: profile.name,
    category: profile.category,
    verdict: scoreToVerdict(score),
    confidence: Math.round(score * 100),
    reasoning: `캔들패턴 기반 분석: ${factors.join(". ")}`,
    keyFactors: factors,
    credibilityScore: profile.credibilityScore,
  };
}

function evaluateVolume(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  profile: JurorProfile,
  advancedSignals?: AdvancedSignals | null,
): JurorEvaluation {
  const factors: string[] = [];
  let score = 0.5;

  // 거래량 데이터 확인
  const volumes = data.map((d) => d.volume ?? 0);
  const hasVolume = volumes.some((v) => v > 0);

  if (hasVolume && data.length >= 20) {
    const recentVol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volRatio = avgVol > 0 ? recentVol / avgVol : 1;

    factors.push(`최근 거래량 비율: ${volRatio.toFixed(2)}x (20일 평균 대비)`);

    const priceChange = recentReturn(data, 5);
    const predicted = debateResult.predictedDirection;

    // 거래량이 가격 방향을 확인하는지 평가
    if (predicted === "상승") {
      if (volRatio > 1.5 && priceChange !== null && priceChange > 0) {
        score = 0.85;
        factors.push("거래량 급증과 함께 가격 상승 -- 상승 추세 강하게 확인");
      } else if (volRatio > 1.2) {
        score = 0.65;
        factors.push("거래량 증가로 시장 관심 확대");
      } else if (volRatio < 0.7) {
        score = 0.35;
        factors.push("거래량 감소 중 -- 상승 추세 지속 의문");
      } else {
        score = 0.5;
      }
    } else if (predicted === "하락") {
      if (volRatio > 1.5 && priceChange !== null && priceChange < 0) {
        score = 0.85;
        factors.push("거래량 급증과 함께 가격 하락 -- 하락 추세 강하게 확인");
      } else if (volRatio > 1.2) {
        score = 0.6;
        factors.push("거래량 증가는 변동성 확대를 시사");
      } else if (volRatio < 0.7) {
        score = 0.4;
        factors.push("거래량 감소 중 -- 본격적 하락 추세 의문");
      } else {
        score = 0.5;
      }
    } else {
      score = volRatio < 0.8 ? 0.7 : 0.45;
      factors.push(volRatio < 0.8 ? "낮은 거래량은 보합 예측을 지지" : "거래량이 보합과 불일치");
    }
  } else {
    factors.push("거래량 데이터 부족");
  }

  // 고급 시그널 거래량 프로파일 반영
  if (advancedSignals?.volumeProfile) {
    if (advancedSignals.volumeProfile.volumeSpike) {
      factors.push("거래량 급등 감지 (고급 분석)");
      score = clamp(score + 0.1, 0, 1);
    }
  }

  return {
    jurorId: profile.id,
    jurorName: profile.name,
    category: profile.category,
    verdict: scoreToVerdict(score),
    confidence: Math.round(score * 100),
    reasoning: `거래량 기반 분석: ${factors.join(". ")}`,
    keyFactors: factors,
    credibilityScore: profile.credibilityScore,
  };
}

function evaluateFibonacci(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  profile: JurorProfile,
): JurorEvaluation {
  const factors: string[] = [];
  let score = 0.5;

  if (data.length >= 20) {
    // 최근 구간의 고가/저가로 피보나치 되돌림 레벨 계산
    const recentData = data.slice(-50);
    const highs = recentData.map((d) => d.high ?? d.close);
    const lows = recentData.map((d) => d.low ?? d.close);
    const swingHigh = Math.max(...highs);
    const swingLow = Math.min(...lows);
    const range = swingHigh - swingLow;

    if (range > 0) {
      const currentPrice = data[data.length - 1].close;
      const retracementLevel = (swingHigh - currentPrice) / range;

      // 주요 피보나치 레벨: 0.236, 0.382, 0.5, 0.618, 0.786
      const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786];
      const nearestFib = fibLevels.reduce((nearest, level) =>
        Math.abs(retracementLevel - level) < Math.abs(retracementLevel - nearest) ? level : nearest,
      );
      const distanceToFib = Math.abs(retracementLevel - nearestFib);

      factors.push(
        `현재 되돌림 수준: ${(retracementLevel * 100).toFixed(1)}%`,
        `가장 가까운 피보나치 레벨: ${(nearestFib * 100).toFixed(1)}% (거리: ${(distanceToFib * 100).toFixed(1)}%)`,
      );

      const predicted = debateResult.predictedDirection;
      if (predicted === "상승") {
        // 0.618, 0.786 근처에서 상승 전환은 강한 지지
        if ((nearestFib >= 0.5) && distanceToFib < 0.05) {
          score = 0.8;
          factors.push("주요 피보나치 지지 레벨 근처에서 상승 전환 기대");
        } else if (retracementLevel > 0.786) {
          score = 0.3;
          factors.push("깊은 되돌림으로 상승 전환 신뢰도 약화");
        } else {
          score = 0.55;
        }
      } else if (predicted === "하락") {
        if ((nearestFib <= 0.382) && distanceToFib < 0.05) {
          score = 0.8;
          factors.push("피보나치 저항 레벨 근처에서 하락 전환 기대");
        } else if (retracementLevel > 0.618) {
          score = 0.7;
          factors.push("깊은 되돌림 영역으로 추가 하락 가능성");
        } else {
          score = 0.5;
        }
      } else {
        score = distanceToFib > 0.1 ? 0.65 : 0.45;
        factors.push("피보나치 레벨 간 중간 위치, 보합 판단");
      }
    } else {
      factors.push("가격 변동 범위 부족으로 피보나치 분석 불가");
    }
  } else {
    factors.push("데이터 부족으로 피보나치 분석 불가");
  }

  return {
    jurorId: profile.id,
    jurorName: profile.name,
    category: profile.category,
    verdict: scoreToVerdict(score),
    confidence: Math.round(score * 100),
    reasoning: `피보나치 기반 분석: ${factors.join(". ")}`,
    keyFactors: factors,
    credibilityScore: profile.credibilityScore,
  };
}

function evaluateElliott(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  profile: JurorProfile,
  advancedSignals?: AdvancedSignals | null,
): JurorEvaluation {
  const factors: string[] = [];
  let score = 0.5;

  if (data.length >= 30) {
    // 간이 엘리어트 파동 분석: Higher Highs/Lower Lows 패턴 활용
    const hhllPattern = advancedSignals?.hhll?.pattern;
    const trendStrength = advancedSignals?.trendStrength?.strength;

    if (hhllPattern) {
      factors.push(`고점/저점 패턴: ${hhllPattern}`);
    }
    if (trendStrength !== undefined) {
      factors.push(`추세 강도: ${trendStrength.toFixed(0)}%`);
    }

    const predicted = debateResult.predictedDirection;

    // 파동 구조 판단: 5파 완성 후 조정 vs 3파 조정 완료 후 충격파
    const roc5 = calcROC(data, 5);
    const roc20 = calcROC(data, 20);

    if (roc5 !== null && roc20 !== null) {
      const momentumShift = roc5 - roc20;
      factors.push(`단기/중기 모멘텀 차이: ${momentumShift.toFixed(2)}`);

      if (predicted === "상승") {
        if (hhllPattern === "higher-highs" && momentumShift > 0) {
          score = 0.8;
          factors.push("상승 충격파 진행 중으로 판단, 상승 예측 지지");
        } else if (hhllPattern === "lower-lows" && momentumShift > 0) {
          score = 0.65;
          factors.push("조정파 완료 후 반등 가능성");
        } else if (hhllPattern === "lower-lows") {
          score = 0.3;
          factors.push("하락 파동 진행 중, 상승 전환 시기상조");
        } else {
          score = 0.5;
        }
      } else if (predicted === "하락") {
        if (hhllPattern === "lower-lows" && momentumShift < 0) {
          score = 0.8;
          factors.push("하락 충격파 진행 중으로 판단, 하락 예측 지지");
        } else if (hhllPattern === "higher-highs" && momentumShift < 0) {
          score = 0.65;
          factors.push("상승 5파 완료 후 조정 진입 가능성");
        } else if (hhllPattern === "higher-highs") {
          score = 0.3;
          factors.push("상승 파동 진행 중, 하락 전환 시기상조");
        } else {
          score = 0.5;
        }
      } else {
        score = 0.55;
        factors.push("파동 구조상 보합/전환 구간으로 판단");
      }
    }
  } else {
    factors.push("데이터 부족으로 엘리어트 파동 분석 불가");
  }

  return {
    jurorId: profile.id,
    jurorName: profile.name,
    category: profile.category,
    verdict: scoreToVerdict(score),
    confidence: Math.round(score * 100),
    reasoning: `엘리어트파동 기반 분석: ${factors.join(". ")}`,
    keyFactors: factors,
    credibilityScore: profile.credibilityScore,
  };
}

// ─── 거시경제 배심원 (7명) ──────────────────────────────────────────────────────

function evaluateMacroJuror(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  profile: JurorProfile,
  collectedData?: CollectedData | null,
): JurorEvaluation {
  const factors: string[] = [];
  let score = 0.5;

  const predicted = debateResult.predictedDirection;
  const consistency = assessDirectionConsistency(debateResult);

  switch (profile.id) {
    case "macro-rate": {
      // 금리전문가: 금리 환경 평가
      if (collectedData?.us10yYield !== undefined) {
        const yield10y = collectedData.us10yYield;
        factors.push(`미국 10년물 금리: ${yield10y.toFixed(2)}%`);

        if (yield10y > 4.5) {
          factors.push("고금리 환경 -- 위험자산에 부정적");
          score = predicted === "하락" ? 0.75 : predicted === "상승" ? 0.3 : 0.5;
        } else if (yield10y < 3.0) {
          factors.push("저금리 환경 -- 위험자산에 우호적");
          score = predicted === "상승" ? 0.75 : predicted === "하락" ? 0.35 : 0.5;
        } else {
          factors.push("중립 금리 환경");
          score = 0.5 + consistency * 0.15;
        }

        if (collectedData.yieldCurveSpread !== undefined) {
          const spread = collectedData.yieldCurveSpread;
          factors.push(`수익률 곡선 스프레드: ${spread.toFixed(3)}%`);
          if (spread < -0.5) {
            factors.push("깊은 역전 -- 경기침체 강력 경고");
            score = clamp(score - 0.15, 0, 1);
          } else if (spread < 0) {
            factors.push("수익률 곡선 역전 -- 경기침체 주의");
            score = clamp(score - 0.08, 0, 1);
          }
        }
      } else {
        factors.push("금리 데이터 없음, 토론 합의도 기반 평가");
        score = 0.4 + consistency * 0.2;
      }
      break;
    }

    case "macro-inflation": {
      // 인플레이션전문가
      if (collectedData?.copperGoldRatio !== undefined) {
        factors.push(`구리/금 비율: ${collectedData.copperGoldRatio.toFixed(4)}`);
        if (collectedData.copperGoldRatio > 0.005) {
          factors.push("인플레이션 압력 상승 시사");
          score = predicted === "상승" ? 0.6 : 0.45;
        } else if (collectedData.copperGoldRatio < 0.003) {
          factors.push("디플레이션 압력 시사");
          score = predicted === "하락" ? 0.65 : 0.4;
        }
      }
      // 원유 가격 간접 참조
      if (collectedData?.rawPrices?.["CL=F"]) {
        const oilPrice = collectedData.rawPrices["CL=F"];
        factors.push(`WTI 원유: $${oilPrice.toFixed(2)}`);
        if (oilPrice > 90) {
          factors.push("고유가 -- 인플레이션 상승 압력");
        }
      }
      if (factors.length === 0) {
        factors.push("인플레이션 관련 데이터 부족, 토론 결과 참조");
        score = 0.4 + consistency * 0.2;
      }
      break;
    }

    case "macro-fx": {
      // 환율전문가
      if (collectedData?.dxyTrend) {
        factors.push(`달러 인덱스 추세: ${collectedData.dxyTrend}`);
        if (collectedData.dxyTrend === "상승") {
          factors.push("달러 강세 -- 신흥국 자산에 부정적");
          score = predicted === "하락" ? 0.7 : 0.4;
        } else if (collectedData.dxyTrend === "하락") {
          factors.push("달러 약세 -- 위험자산에 우호적");
          score = predicted === "상승" ? 0.7 : 0.4;
        }
      }
      if (collectedData?.usdKrwTrend) {
        factors.push(`원/달러 추세: ${collectedData.usdKrwTrend}`);
      }
      if (factors.length === 0) {
        factors.push("환율 데이터 없음");
        score = 0.4 + consistency * 0.2;
      }
      break;
    }

    case "macro-commodity": {
      // 원자재전문가
      if (collectedData?.goldSilverRatio !== undefined) {
        factors.push(`금/은 비율: ${collectedData.goldSilverRatio.toFixed(1)}`);
        if (collectedData.goldSilverRatio > 80) {
          factors.push("높은 금/은 비율 -- 경기 둔화 우려");
          score = predicted === "하락" ? 0.7 : 0.4;
        } else if (collectedData.goldSilverRatio < 60) {
          factors.push("낮은 금/은 비율 -- 경기 확장 시사");
          score = predicted === "상승" ? 0.7 : 0.4;
        } else {
          score = 0.5;
        }
      } else {
        factors.push("원자재 비율 데이터 부족");
        score = 0.4 + consistency * 0.2;
      }
      break;
    }

    case "macro-employment": {
      // 고용전문가: 직접 데이터 없으므로 간접 지표 활용
      factors.push("고용 데이터 직접 접근 불가, 간접 지표 기반 평가");
      if (collectedData?.vix !== undefined) {
        if (collectedData.vix > 25) {
          factors.push("높은 VIX는 경제 불확실성/고용 우려 반영 가능");
          score = predicted === "하락" ? 0.65 : 0.4;
        } else if (collectedData.vix < 15) {
          factors.push("낮은 VIX는 경제 안정/고용 안정 시사");
          score = predicted === "상승" ? 0.6 : 0.45;
        }
      }
      score = score * 0.7 + consistency * 0.3 * 0.3 + 0.2;
      score = clamp(score, 0, 1);
      break;
    }

    case "macro-gdp": {
      // GDP전문가
      factors.push("GDP 성장률 직접 데이터 없음, 선행지표 기반 추론");
      if (collectedData?.yieldCurveSpread !== undefined) {
        const spread = collectedData.yieldCurveSpread;
        if (spread < 0) {
          factors.push("수익률 곡선 역전은 GDP 둔화 선행 지표");
          score = predicted === "하락" ? 0.7 : 0.35;
        } else if (spread > 1) {
          factors.push("양호한 수익률 곡선은 GDP 성장 시사");
          score = predicted === "상승" ? 0.65 : 0.45;
        } else {
          score = 0.5;
        }
      } else {
        score = 0.4 + consistency * 0.2;
      }
      break;
    }

    case "macro-trade": {
      // 무역수지전문가
      factors.push("무역수지 직접 데이터 없음, 환율/원자재 간접 추론");
      if (collectedData?.usdKrwTrend === "상승") {
        factors.push("원화 약세는 수출 기업에 유리하나 수입 비용 증가");
        score = 0.5;
      } else if (collectedData?.usdKrwTrend === "하락") {
        factors.push("원화 강세는 수입 비용 감소이나 수출 경쟁력 약화");
        score = 0.5;
      }
      score = 0.35 + consistency * 0.3;
      score = clamp(score, 0, 1);
      break;
    }

    default:
      factors.push("알 수 없는 거시경제 배심원");
  }

  return {
    jurorId: profile.id,
    jurorName: profile.name,
    category: profile.category,
    verdict: scoreToVerdict(score),
    confidence: Math.round(score * 100),
    reasoning: `${profile.name} 평가: ${factors.join(". ")}`,
    keyFactors: factors,
    credibilityScore: profile.credibilityScore,
  };
}

// ─── 리스크 관리 배심원 (5명) ──────────────────────────────────────────────────

function evaluateRiskJuror(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  profile: JurorProfile,
  advancedSignals?: AdvancedSignals | null,
): JurorEvaluation {
  const factors: string[] = [];
  let score = 0.5;
  const predicted = debateResult.predictedDirection;

  switch (profile.id) {
    case "risk-var": {
      // VaR전문가: 위험 조정 확률 평가
      const atr = calcATR(data);
      if (atr !== null && data.length > 0) {
        const currentPrice = data[data.length - 1].close;
        const atrPercent = currentPrice > 0 ? (atr / currentPrice) * 100 : 0;
        factors.push(`ATR/현재가 비율: ${atrPercent.toFixed(2)}%`);

        // 일일 VaR 프록시: 1.65 * ATR% (95% 신뢰구간)
        const varProxy = atrPercent * 1.65;
        factors.push(`일일 VaR(95%) 프록시: ${varProxy.toFixed(2)}%`);

        // 높은 VaR에서의 예측은 리스크가 높음
        if (varProxy > 5) {
          factors.push("매우 높은 VaR -- 예측 방향과 무관하게 리스크 과대");
          score = 0.25;
        } else if (varProxy > 3) {
          factors.push("높은 VaR -- 예측 신뢰도 할인 필요");
          score = 0.4;
        } else if (varProxy < 1.5) {
          factors.push("낮은 VaR -- 안정적 환경에서 예측 신뢰도 상승");
          score = 0.7 + (debateResult.confidence / 100) * 0.2;
        } else {
          score = 0.55;
        }
      } else {
        factors.push("ATR 계산 불가, VaR 추정 불가");
        score = 0.45;
      }

      // 최대 낙폭 참조
      if (advancedSignals?.maxDrawdown !== undefined) {
        factors.push(`최대 낙폭: ${advancedSignals.maxDrawdown.toFixed(1)}%`);
        if (advancedSignals.maxDrawdown > 15) {
          score = clamp(score - 0.15, 0, 1);
          factors.push("극심한 낙폭 이력으로 리스크 경고");
        }
      }
      break;
    }

    case "risk-volatility": {
      // 변동성전문가
      const bb = calcBollingerBands(data);
      if (bb !== null) {
        factors.push(`볼린저 밴드 폭: ${(bb.width * 100).toFixed(1)}%`);

        if (bb.width > 0.10) {
          factors.push("고변동성 환경 -- 예측 불확실성 높음");
          score = 0.3;
        } else if (bb.width > 0.06) {
          factors.push("보통 변동성");
          score = 0.55;
        } else if (bb.width < 0.03) {
          factors.push("극저변동성 -- 돌파 임박 가능성, 방향 예측 어려움");
          score = predicted === "변동성확대" ? 0.8 : 0.4;
        } else {
          score = 0.6;
        }
      }

      if (advancedSignals?.volatilityRegime) {
        factors.push(`변동성 체제: ${advancedSignals.volatilityRegime}`);
        if (advancedSignals.volatilityRegime === "extreme") {
          score = clamp(score - 0.2, 0, 1);
        }
      }
      break;
    }

    case "risk-correlation": {
      // 상관관계전문가
      factors.push("교차자산 상관관계 기반 분산 효과 평가");

      // 토론 내 모델 간 합의도를 상관 리스크 프록시로 활용
      if (debateResult.votes && debateResult.votes.length > 1) {
        const directions = debateResult.votes.map((v) => v.direction);
        const uniqueDirections = new Set(directions);
        const diversification = uniqueDirections.size / directions.length;

        if (diversification > 0.6) {
          factors.push("모델 간 높은 의견 분산 -- 방향 불확실성 높음");
          score = 0.3;
        } else if (diversification < 0.3) {
          factors.push("모델 간 높은 합의 -- 방향성 확실");
          score = 0.75;
        } else {
          factors.push("모델 간 보통 수준 합의");
          score = 0.55;
        }
      } else {
        score = 0.4 + assessDirectionConsistency(debateResult) * 0.3;
      }
      break;
    }

    case "risk-liquidity": {
      // 유동성전문가
      const volumes = data.map((d) => d.volume ?? 0);
      const hasVolume = volumes.some((v) => v > 0);

      if (hasVolume && data.length >= 20) {
        const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const recentVol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const volRatio = avgVol20 > 0 ? recentVol / avgVol20 : 1;

        factors.push(`유동성 비율 (최근/평균): ${volRatio.toFixed(2)}x`);

        if (volRatio < 0.5) {
          factors.push("유동성 급감 -- 슬리피지 리스크 높음");
          score = 0.25;
        } else if (volRatio < 0.8) {
          factors.push("유동성 감소 -- 주의 필요");
          score = 0.4;
        } else if (volRatio > 2.0) {
          factors.push("유동성 풍부 -- 가격 발견 효율적");
          score = 0.75;
        } else {
          factors.push("정상 유동성 수준");
          score = 0.6;
        }
      } else {
        factors.push("거래량 데이터 없음, 유동성 평가 불가");
        score = 0.45;
      }
      break;
    }

    case "risk-systematic": {
      // 체계적위험전문가
      if (advancedSignals?.riskLevel) {
        factors.push(`종합 리스크 수준: ${advancedSignals.riskLevel}`);
        const riskMap: Record<string, number> = {
          "낮음": 0.8,
          "보통": 0.6,
          "높음": 0.35,
          "매우_높음": 0.15,
        };
        score = riskMap[advancedSignals.riskLevel] ?? 0.5;
      }

      if (advancedSignals?.fearGreedComposite !== undefined) {
        const fgi = advancedSignals.fearGreedComposite;
        factors.push(`공포/탐욕 지수: ${fgi}`);
        if (fgi > 80 || fgi < 20) {
          factors.push("극단적 심리 상태 -- 체계적 리스크 경고");
          score = clamp(score - 0.1, 0, 1);
        }
      }

      if (factors.length === 0) {
        factors.push("체계적 위험 데이터 부족, 토론 합의도 참조");
        score = 0.35 + assessDirectionConsistency(debateResult) * 0.3;
      }
      break;
    }

    default:
      factors.push("알 수 없는 리스크 배심원");
  }

  return {
    jurorId: profile.id,
    jurorName: profile.name,
    category: profile.category,
    verdict: scoreToVerdict(score),
    confidence: Math.round(score * 100),
    reasoning: `${profile.name} 평가: ${factors.join(". ")}`,
    keyFactors: factors,
    credibilityScore: profile.credibilityScore,
  };
}

// ─── 행동경제학 배심원 (5명) ──────────────────────────────────────────────────

function evaluateBehavioralJuror(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  profile: JurorProfile,
  advancedSignals?: AdvancedSignals | null,
  collectedData?: CollectedData | null,
): JurorEvaluation {
  const factors: string[] = [];
  let score = 0.5;
  const predicted = debateResult.predictedDirection;

  switch (profile.id) {
    case "behav-crowd": {
      // 군중심리전문가: 군중 행동 패턴 감지
      if (advancedSignals?.fearGreedComposite !== undefined) {
        const fgi = advancedSignals.fearGreedComposite;
        factors.push(`공포/탐욕 지수: ${fgi}`);

        // 역발상 관점: 극단적 심리에서 반대 방향 예측이 더 신뢰
        if (fgi > 80) {
          factors.push("극단적 탐욕 -- 군중이 과도하게 낙관적, 역발상 하락 유의미");
          score = predicted === "하락" ? 0.8 : predicted === "상승" ? 0.25 : 0.5;
        } else if (fgi > 65) {
          factors.push("탐욕 구간 -- 군중 낙관 확대 중");
          score = predicted === "하락" ? 0.65 : predicted === "상승" ? 0.4 : 0.5;
        } else if (fgi < 20) {
          factors.push("극단적 공포 -- 군중이 과도하게 비관적, 역발상 상승 유의미");
          score = predicted === "상승" ? 0.8 : predicted === "하락" ? 0.25 : 0.5;
        } else if (fgi < 35) {
          factors.push("공포 구간 -- 군중 비관 확대 중");
          score = predicted === "상승" ? 0.65 : predicted === "하락" ? 0.4 : 0.5;
        } else {
          factors.push("중립 심리 구간");
          score = 0.5 + assessDirectionConsistency(debateResult) * 0.2;
        }
      } else {
        // VIX를 대체 심리 지표로 활용
        if (collectedData?.vix !== undefined) {
          factors.push(`VIX(심리 프록시): ${collectedData.vix.toFixed(1)}`);
          if (collectedData.vix > 30) {
            score = predicted === "상승" ? 0.7 : 0.35;
            factors.push("극도의 공포 -- 역발상 매수 신호");
          } else if (collectedData.vix < 13) {
            score = predicted === "하락" ? 0.65 : 0.4;
            factors.push("극도의 자만 -- 역발상 매도 신호");
          }
        } else {
          factors.push("심리 지표 데이터 없음");
          score = 0.45;
        }
      }
      break;
    }

    case "behav-overreaction": {
      // 과잉반응전문가: 최근 급등/급락 후 되돌림 패턴
      const ret5 = recentReturn(data, 5);
      const ret20 = recentReturn(data, 20);

      if (ret5 !== null) {
        factors.push(`5일 수익률: ${ret5.toFixed(2)}%`);

        if (Math.abs(ret5) > 5) {
          factors.push("최근 5일간 급격한 움직임 -- 과잉반응 가능성");
          // 과잉반응 후 되돌림 예측이 더 신뢰
          if (ret5 > 5 && predicted === "하락") {
            score = 0.75;
            factors.push("급등 후 되돌림 예측 -- 과잉반응 교정 관점 지지");
          } else if (ret5 < -5 && predicted === "상승") {
            score = 0.75;
            factors.push("급락 후 반등 예측 -- 과잉반응 교정 관점 지지");
          } else if (ret5 > 5 && predicted === "상승") {
            score = 0.3;
            factors.push("급등 후 추가 상승 예측 -- 과잉반응 지속 가정은 위험");
          } else if (ret5 < -5 && predicted === "하락") {
            score = 0.3;
            factors.push("급락 후 추가 하락 예측 -- 과잉반응 지속 가정은 위험");
          }
        } else {
          factors.push("최근 가격 변동 정상 범위 -- 과잉반응 없음");
          score = 0.5 + assessDirectionConsistency(debateResult) * 0.15;
        }
      } else {
        factors.push("수익률 계산 불가");
        score = 0.45;
      }

      if (ret20 !== null) {
        factors.push(`20일 수익률: ${ret20.toFixed(2)}%`);
      }
      break;
    }

    case "behav-anchoring": {
      // 앵커링전문가: 과거 가격 수준에 대한 심리적 고착 효과
      if (data.length >= 50) {
        const currentPrice = data[data.length - 1].close;
        const recentData = data.slice(-50);
        const highs = recentData.map((d) => d.high ?? d.close);
        const lows = recentData.map((d) => d.low ?? d.close);
        const high50 = Math.max(...highs);
        const low50 = Math.min(...lows);
        const mid50 = (high50 + low50) / 2;

        const fromHigh = high50 > 0 ? ((currentPrice - high50) / high50) * 100 : 0;
        const fromLow = low50 > 0 ? ((currentPrice - low50) / low50) * 100 : 0;

        factors.push(
          `50일 고점 대비: ${fromHigh.toFixed(1)}%`,
          `50일 저점 대비: ${fromLow.toFixed(1)}%`,
        );

        // 앵커링 효과: 고점/저점 근처에서 심리적 저항/지지
        if (predicted === "상승") {
          if (fromHigh > -3) {
            score = 0.35;
            factors.push("고점 앵커링 -- 심리적 저항으로 추가 상승 어려움");
          } else if (fromLow < 10) {
            score = 0.7;
            factors.push("저점 앵커링 -- 심리적 지지 형성으로 반등 기대");
          } else {
            score = 0.55;
          }
        } else if (predicted === "하락") {
          if (fromLow < 3) {
            score = 0.35;
            factors.push("저점 앵커링 -- 심리적 지지로 추가 하락 어려움");
          } else if (fromHigh > -10) {
            score = 0.65;
            factors.push("고점 앵커링 -- 고점 실패 시 실망 매물 가능");
          } else {
            score = 0.55;
          }
        } else {
          score = currentPrice > mid50 * 0.95 && currentPrice < mid50 * 1.05 ? 0.7 : 0.45;
          factors.push("중간 가격대 -- 앵커링 효과 중립");
        }
      } else {
        factors.push("데이터 부족으로 앵커링 분석 불가");
        score = 0.45;
      }
      break;
    }

    case "behav-loss-aversion": {
      // 손실회피전문가: 손실 회피 심리에 기반한 행동 패턴
      const ret5 = recentReturn(data, 5);
      const ret20 = recentReturn(data, 20);

      if (ret5 !== null && ret20 !== null) {
        factors.push(`5일 수익률: ${ret5.toFixed(2)}%, 20일 수익률: ${ret20.toFixed(2)}%`);

        // 손실 회피: 투자자들은 손실에 2배 민감 (전망이론)
        if (ret20 < -10) {
          factors.push("장기 손실 구간 -- 투매 가능성 또는 손절 지연 효과");
          if (predicted === "상승") {
            score = 0.4;
            factors.push("큰 손실 후 손절 물량이 상승을 억제할 수 있음");
          } else if (predicted === "하락") {
            score = 0.6;
            factors.push("손절 지연된 물량의 일괄 매도 가능성");
          }
        } else if (ret20 > 10) {
          factors.push("장기 이익 구간 -- 이익 실현 심리 작용");
          if (predicted === "상승") {
            score = 0.45;
            factors.push("이익 실현 매물이 상승을 제한할 수 있음");
          } else if (predicted === "하락") {
            score = 0.65;
            factors.push("이익 실현 물량이 하락 압력을 형성할 수 있음");
          }
        } else {
          score = 0.5;
          factors.push("중간 수익률 구간 -- 손실회피 효과 제한적");
        }
      } else {
        factors.push("수익률 데이터 부족");
        score = 0.45;
      }
      break;
    }

    case "behav-confirmation": {
      // 확증편향전문가: 토론 과정에서의 확증편향 존재 여부
      const { bullishArguments, bearishArguments, consensusLevel } = debateResult;

      const bullCount = bullishArguments.length;
      const bearCount = bearishArguments.length;
      const totalArgs = bullCount + bearCount;

      factors.push(`상승 논거: ${bullCount}개, 하락 논거: ${bearCount}개`);

      if (totalArgs > 0) {
        const imbalance = Math.abs(bullCount - bearCount) / totalArgs;

        if (imbalance > 0.6) {
          factors.push("논거 불균형 심각 -- 확증편향 가능성 높음");
          score = 0.3;
          factors.push("토론 과정에서 한 방향의 증거만 과도하게 수집된 의심");
        } else if (imbalance > 0.3) {
          factors.push("논거 불균형 존재 -- 약한 확증편향 가능성");
          score = 0.45;
        } else {
          factors.push("논거 균형 잡힘 -- 확증편향 위험 낮음");
          score = 0.7;
        }

        // 합의 수준이 너무 높으면 집단사고 우려
        if (consensusLevel === "강한합의") {
          factors.push("강한 합의 -- 집단사고(groupthink) 위험 존재");
          score = clamp(score - 0.1, 0, 1);
        }
      } else {
        factors.push("토론 논거 데이터 없음");
        score = 0.45;
      }
      break;
    }

    default:
      factors.push("알 수 없는 행동경제학 배심원");
  }

  return {
    jurorId: profile.id,
    jurorName: profile.name,
    category: profile.category,
    verdict: scoreToVerdict(score),
    confidence: Math.round(score * 100),
    reasoning: `${profile.name} 평가: ${factors.join(". ")}`,
    keyFactors: factors,
    credibilityScore: profile.credibilityScore,
  };
}

// ─── 통계/계량 배심원 (5명) ──────────────────────────────────────────────────

function evaluateStatJuror(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  profile: JurorProfile,
  advancedSignals?: AdvancedSignals | null,
): JurorEvaluation {
  const factors: string[] = [];
  let score = 0.5;
  const predicted = debateResult.predictedDirection;

  switch (profile.id) {
    case "stat-regression": {
      // 회귀분석전문가: 선형 추세 기반
      if (data.length >= 20) {
        const prices = data.slice(-20).map((d) => d.close);
        const n = prices.length;
        const xMean = (n - 1) / 2;
        const yMean = prices.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
          numerator += (i - xMean) * (prices[i] - yMean);
          denominator += (i - xMean) ** 2;
        }

        const slope = denominator !== 0 ? numerator / denominator : 0;
        const slopePercent = yMean !== 0 ? (slope / yMean) * 100 : 0;

        factors.push(`20일 회귀 기울기: ${slopePercent.toFixed(3)}%/일`);

        // R-squared 계산
        const yHat = prices.map((_, i) => yMean + slope * (i - xMean));
        const ssRes = prices.reduce((acc, y, i) => acc + (y - yHat[i]) ** 2, 0);
        const ssTot = prices.reduce((acc, y) => acc + (y - yMean) ** 2, 0);
        const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

        factors.push(`R-squared: ${rSquared.toFixed(3)}`);

        if (predicted === "상승") {
          if (slope > 0 && rSquared > 0.5) {
            score = 0.8;
            factors.push("강한 상승 추세 회귀선 확인, 상승 예측 지지");
          } else if (slope > 0) {
            score = 0.6;
            factors.push("약한 상승 추세, R2 낮아 신뢰도 제한");
          } else {
            score = 0.3;
            factors.push("하락 추세 회귀선, 상승 예측과 불일치");
          }
        } else if (predicted === "하락") {
          if (slope < 0 && rSquared > 0.5) {
            score = 0.8;
            factors.push("강한 하락 추세 회귀선 확인, 하락 예측 지지");
          } else if (slope < 0) {
            score = 0.6;
            factors.push("약한 하락 추세, R2 낮아 신뢰도 제한");
          } else {
            score = 0.3;
            factors.push("상승 추세 회귀선, 하락 예측과 불일치");
          }
        } else {
          score = rSquared < 0.2 ? 0.7 : 0.4;
          factors.push(rSquared < 0.2 ? "낮은 R2, 추세 부재로 보합 지지" : "추세 존재, 보합 예측에 의문");
        }
      } else {
        factors.push("데이터 부족으로 회귀분석 불가");
      }
      break;
    }

    case "stat-timeseries": {
      // 시계열전문가: 자기상관 및 추세 지속성
      if (data.length >= 20) {
        const returns = [];
        for (let i = 1; i < data.length; i++) {
          if (data[i - 1].close > 0) {
            returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
          }
        }

        if (returns.length >= 10) {
          // 1차 자기상관 계산
          const n = returns.length;
          const mean = returns.reduce((a, b) => a + b, 0) / n;
          let autocorrNum = 0;
          let autocorrDen = 0;
          for (let i = 1; i < n; i++) {
            autocorrNum += (returns[i] - mean) * (returns[i - 1] - mean);
            autocorrDen += (returns[i] - mean) ** 2;
          }
          const autocorr = autocorrDen > 0 ? autocorrNum / autocorrDen : 0;

          factors.push(`1차 자기상관: ${autocorr.toFixed(3)}`);

          // 추세 지속성 (양의 자기상관) vs 평균회귀 (음의 자기상관)
          const recentTrend = returns.slice(-5).reduce((a, b) => a + b, 0);

          if (autocorr > 0.1) {
            factors.push("양의 자기상관 -- 추세 지속성 높음");
            if ((recentTrend > 0 && predicted === "상승") || (recentTrend < 0 && predicted === "하락")) {
              score = 0.75;
              factors.push("최근 추세와 예측 방향 일치, 지속 가능성 높음");
            } else {
              score = 0.35;
              factors.push("최근 추세와 예측 방향 불일치");
            }
          } else if (autocorr < -0.1) {
            factors.push("음의 자기상관 -- 평균회귀 패턴");
            if ((recentTrend > 0 && predicted === "하락") || (recentTrend < 0 && predicted === "상승")) {
              score = 0.7;
              factors.push("평균회귀 패턴과 예측 방향 일치");
            } else {
              score = 0.35;
              factors.push("평균회귀 패턴과 예측 방향 불일치");
            }
          } else {
            factors.push("유의미한 자기상관 없음 -- 랜덤워크에 가까움");
            score = 0.45;
          }
        }
      } else {
        factors.push("데이터 부족으로 시계열 분석 불가");
      }
      break;
    }

    case "stat-bayesian": {
      // 베이지안전문가: 사전/사후 확률 업데이트
      // 사전 확률: 토론 결과의 신뢰도
      const priorConfidence = debateResult.confidence / 100;
      factors.push(`사전 확률 (토론 결과): ${(priorConfidence * 100).toFixed(1)}%`);

      // 증거 업데이트: 기술적 지표 일관성
      let evidenceStrength = 0.5;
      const rsi = calcRSI(data);
      const macd = calcMACD(data);
      let supportCount = 0;
      let totalChecks = 0;

      if (rsi !== null) {
        totalChecks++;
        if ((predicted === "상승" && rsi < 50) || (predicted === "하락" && rsi > 50)) {
          supportCount++;
        }
      }
      if (macd !== null) {
        totalChecks++;
        if ((predicted === "상승" && macd.histogram > 0) || (predicted === "하락" && macd.histogram < 0)) {
          supportCount++;
        }
      }

      if (totalChecks > 0) {
        evidenceStrength = supportCount / totalChecks;
      }

      // 베이지안 업데이트 (간소화)
      const likelihood = 0.3 + evidenceStrength * 0.4;
      const posterior = (priorConfidence * likelihood) /
        (priorConfidence * likelihood + (1 - priorConfidence) * (1 - likelihood));

      factors.push(
        `증거 강도: ${(evidenceStrength * 100).toFixed(1)}%`,
        `사후 확률: ${(posterior * 100).toFixed(1)}%`,
      );

      score = posterior;
      break;
    }

    case "stat-montecarlo": {
      // 몬테카를로전문가: 시뮬레이션 기반 확률 추정
      if (data.length >= 30) {
        const returns = [];
        for (let i = 1; i < data.length; i++) {
          if (data[i - 1].close > 0) {
            returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
          }
        }

        if (returns.length >= 20) {
          const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
          const stdDevReturn = calcStdDev(returns);

          factors.push(
            `일 평균 수익률: ${(meanReturn * 100).toFixed(3)}%`,
            `일 수익률 표준편차: ${(stdDevReturn * 100).toFixed(3)}%`,
          );

          // 간이 몬테카를로: 정규분포 가정 하 방향 확률
          // Z-score 기반 확률 추정
          const zScore = stdDevReturn > 0 ? meanReturn / stdDevReturn : 0;
          // 간소화된 정규분포 CDF 근사
          const upProbability = 0.5 * (1 + Math.tanh(zScore * 0.7978));

          factors.push(`상승 확률 추정: ${(upProbability * 100).toFixed(1)}%`);

          if (predicted === "상승") {
            score = upProbability > 0.55 ? 0.7 + (upProbability - 0.55) * 1.5 : 0.3 + upProbability * 0.4;
          } else if (predicted === "하락") {
            const downProb = 1 - upProbability;
            score = downProb > 0.55 ? 0.7 + (downProb - 0.55) * 1.5 : 0.3 + downProb * 0.4;
          } else {
            score = Math.abs(upProbability - 0.5) < 0.1 ? 0.7 : 0.4;
            factors.push("확률 분포상 방향 불확실, 보합 예측 참고");
          }
          score = clamp(score, 0, 1);
        }
      } else {
        factors.push("데이터 부족으로 몬테카를로 시뮬레이션 불가");
      }
      break;
    }

    case "stat-ml": {
      // 머신러닝전문가: 특징 조합 기반 판단
      factors.push("특징 조합 기반 종합 판단");

      // 다양한 기술적 지표를 특징(feature)으로 종합
      let featureScore = 0;
      let featureCount = 0;

      const rsi = calcRSI(data);
      if (rsi !== null) {
        featureCount++;
        if (predicted === "상승") {
          featureScore += rsi < 50 ? 1 : rsi > 70 ? -1 : 0;
        } else if (predicted === "하락") {
          featureScore += rsi > 50 ? 1 : rsi < 30 ? -1 : 0;
        }
      }

      const macd = calcMACD(data);
      if (macd !== null) {
        featureCount++;
        if (predicted === "상승") {
          featureScore += macd.histogram > 0 ? 1 : -1;
        } else if (predicted === "하락") {
          featureScore += macd.histogram < 0 ? 1 : -1;
        }
      }

      const roc = calcROC(data, 12);
      if (roc !== null) {
        featureCount++;
        if (predicted === "상승") {
          featureScore += roc > 0 ? 1 : -1;
        } else if (predicted === "하락") {
          featureScore += roc < 0 ? 1 : -1;
        }
      }

      if (advancedSignals) {
        featureCount++;
        const bias = advancedSignals.overallBias;
        if ((predicted === "상승" && (bias === "강한_상승" || bias === "상승")) ||
            (predicted === "하락" && (bias === "강한_하락" || bias === "하락"))) {
          featureScore += 1;
        } else if (bias === "보합") {
          featureScore += 0;
        } else {
          featureScore -= 1;
        }
      }

      if (featureCount > 0) {
        const normalizedScore = (featureScore / featureCount + 1) / 2; // 0-1로 정규화
        score = clamp(normalizedScore, 0.1, 0.9);
        factors.push(
          `특징 지지율: ${featureScore}/${featureCount}`,
          `정규화 점수: ${(score * 100).toFixed(1)}%`,
        );
      } else {
        factors.push("특징 계산 불가");
        score = 0.45;
      }
      break;
    }

    default:
      factors.push("알 수 없는 통계/계량 배심원");
  }

  return {
    jurorId: profile.id,
    jurorName: profile.name,
    category: profile.category,
    verdict: scoreToVerdict(score),
    confidence: Math.round(score * 100),
    reasoning: `${profile.name} 평가: ${factors.join(". ")}`,
    keyFactors: factors,
    credibilityScore: profile.credibilityScore,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 배심원 평가 라우터
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 각 배심원의 프로필에 따라 적절한 평가 함수를 호출한다.
 */
function evaluateJuror(
  profile: JurorProfile,
  debateResult: JuryDebateInput,
  data: PriceBar[],
  advancedSignals?: AdvancedSignals | null,
  collectedData?: CollectedData | null,
): JurorEvaluation {
  switch (profile.id) {
    // 기술적 분석
    case "tech-rsi":
      return evaluateRSI(debateResult, data, profile);
    case "tech-macd":
      return evaluateMACD(debateResult, data, profile);
    case "tech-bollinger":
      return evaluateBollinger(debateResult, data, profile);
    case "tech-ma":
      return evaluateMovingAverage(debateResult, data, profile);
    case "tech-candle":
      return evaluateCandlePattern(debateResult, data, profile);
    case "tech-volume":
      return evaluateVolume(debateResult, data, profile, advancedSignals);
    case "tech-fibonacci":
      return evaluateFibonacci(debateResult, data, profile);
    case "tech-elliott":
      return evaluateElliott(debateResult, data, profile, advancedSignals);

    // 거시경제
    case "macro-rate":
    case "macro-inflation":
    case "macro-fx":
    case "macro-commodity":
    case "macro-employment":
    case "macro-gdp":
    case "macro-trade":
      return evaluateMacroJuror(debateResult, data, profile, collectedData);

    // 리스크 관리
    case "risk-var":
    case "risk-volatility":
    case "risk-correlation":
    case "risk-liquidity":
    case "risk-systematic":
      return evaluateRiskJuror(debateResult, data, profile, advancedSignals);

    // 행동경제학
    case "behav-crowd":
    case "behav-overreaction":
    case "behav-anchoring":
    case "behav-loss-aversion":
    case "behav-confirmation":
      return evaluateBehavioralJuror(debateResult, data, profile, advancedSignals, collectedData);

    // 통계/계량
    case "stat-regression":
    case "stat-timeseries":
    case "stat-bayesian":
    case "stat-montecarlo":
    case "stat-ml":
      return evaluateStatJuror(debateResult, data, profile, advancedSignals);

    default:
      // 폴백: 토론 결과 합의도 기반 기본 평가
      return {
        jurorId: profile.id,
        jurorName: profile.name,
        category: profile.category,
        verdict: "부분신뢰",
        confidence: 50,
        reasoning: `${profile.name}: 전용 평가 로직 미구현, 토론 결과 참조`,
        keyFactors: ["전용 평가 로직 없음"],
        credibilityScore: profile.credibilityScore,
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 배심원단 심의 집계
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 판정 요약을 집계한다.
 */
function aggregateVerdicts(evaluations: JurorEvaluation[]): VerdictSummary {
  const summary: VerdictSummary = { trust: 0, partialTrust: 0, doubt: 0, distrust: 0 };
  for (const ev of evaluations) {
    switch (ev.verdict) {
      case "신뢰": summary.trust++; break;
      case "부분신뢰": summary.partialTrust++; break;
      case "의심": summary.doubt++; break;
      case "불신": summary.distrust++; break;
    }
  }
  return summary;
}

/**
 * 카테고리별 분석 결과를 산출한다.
 */
function buildCategoryBreakdown(evaluations: JurorEvaluation[]): CategoryBreakdown[] {
  const categories: JurorCategory[] = ["기술적분석", "거시경제", "리스크관리", "행동경제학", "통계계량"];

  return categories.map((category) => {
    const catEvals = evaluations.filter((e) => e.category === category);
    const verdicts = aggregateVerdicts(catEvals);
    const avgConfidence = catEvals.length > 0
      ? catEvals.reduce((sum, e) => sum + e.confidence, 0) / catEvals.length
      : 0;

    // 가장 많은 판정을 지배적 판정으로 선택
    const verdictCounts: [JurorVerdict, number][] = [
      ["신뢰", verdicts.trust],
      ["부분신뢰", verdicts.partialTrust],
      ["의심", verdicts.doubt],
      ["불신", verdicts.distrust],
    ];
    verdictCounts.sort((a, b) => b[1] - a[1]);
    const dominantVerdict = verdictCounts[0][0];

    return {
      category,
      verdicts,
      averageConfidence: Math.round(avgConfidence),
      dominantVerdict,
      weight: CATEGORY_WEIGHTS[category],
    };
  });
}

/**
 * 반대 의견을 식별한다.
 * 최종 판정과 다른 판정을 내린 배심원을 추출한다.
 */
function findDissentingOpinions(
  evaluations: JurorEvaluation[],
  finalVerdict: JurorVerdict,
): DissentingOpinion[] {
  return evaluations
    .filter((ev) => ev.verdict !== finalVerdict)
    .filter((ev) => {
      // "신뢰" vs "불신" 처럼 극단적 차이가 있는 경우만 반대의견으로 포함
      const scoreDiff = Math.abs(VERDICT_SCORES[ev.verdict] - VERDICT_SCORES[finalVerdict]);
      return scoreDiff >= 0.3;
    })
    .map((ev) => ({
      jurorId: ev.jurorId,
      jurorName: ev.jurorName,
      category: ev.category,
      verdict: ev.verdict,
      reasoning: ev.reasoning,
    }));
}

/**
 * 가중 투표를 통해 최종 판정을 결정한다.
 * 카테고리 가중치와 개별 배심원의 신뢰도를 반영한다.
 */
function calculateFinalVerdict(
  evaluations: JurorEvaluation[],
  categoryBreakdown: CategoryBreakdown[],
): { verdict: JurorVerdict; confidence: number } {
  let weightedScore = 0;
  let totalWeight = 0;

  for (const ev of evaluations) {
    const categoryWeight = CATEGORY_WEIGHTS[ev.category];
    const jurorWeight = categoryWeight * ev.credibilityScore;
    const verdictScore = VERDICT_SCORES[ev.verdict];

    weightedScore += verdictScore * jurorWeight;
    totalWeight += jurorWeight;
  }

  const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0.5;
  const verdict = scoreToVerdict(normalizedScore);

  // 최종 신뢰도: 가중 점수와 카테고리 간 합의도 반영
  const categoryVerdicts = categoryBreakdown.map((cb) => VERDICT_SCORES[cb.dominantVerdict]);
  const categoryStdDev = calcStdDev(categoryVerdicts);
  // 카테고리 간 의견 불일치가 클수록 신뢰도 감소
  const consensusPenalty = categoryStdDev * 15;

  const baseConfidence = normalizedScore * 100;
  const finalConfidence = clamp(Math.round(baseConfidence - consensusPenalty), 5, 95);

  return { verdict, confidence: finalConfidence };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 내보내기 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 배심원단 심의를 실행한다.
 *
 * 30명의 전문 배심원이 각자의 관점에서 토론 결과를 독립적으로 평가하고,
 * 가중 투표를 통해 최종 판정을 결정한다.
 *
 * @param debateResult - 토론 엔진의 결과
 * @param data - 가격 데이터 (PriceBar 배열)
 * @param advancedSignals - 고급 분석 시그널 (선택)
 * @param collectedData - 수집된 거시경제 데이터 (선택)
 * @returns 배심원단 심의 결과
 */
export function runJuryDeliberation(
  debateResult: JuryDebateInput,
  data: PriceBar[],
  advancedSignals?: AdvancedSignals | null,
  collectedData?: CollectedData | null,
): JuryDeliberation {
  // 1단계: 각 배심원이 독립적으로 평가
  const evaluations: JurorEvaluation[] = JUROR_PROFILES.map((profile) =>
    evaluateJuror(profile, debateResult, data, advancedSignals, collectedData),
  );

  // 2단계: 판정 집계
  const verdictSummary = aggregateVerdicts(evaluations);

  // 3단계: 카테고리별 분석
  const categoryBreakdown = buildCategoryBreakdown(evaluations);

  // 4단계: 가중 투표를 통한 최종 판정
  const { verdict: finalVerdict, confidence: finalConfidence } =
    calculateFinalVerdict(evaluations, categoryBreakdown);

  // 5단계: 반대 의견 식별
  const dissentingOpinions = findDissentingOpinions(evaluations, finalVerdict);

  return {
    evaluations,
    verdictSummary,
    finalVerdict,
    finalConfidence,
    categoryBreakdown,
    dissentingOpinions,
  };
}

/**
 * 배심원단 판정 실패로부터 학습한다.
 *
 * 실제 결과와 배심원 판정을 비교하여 각 배심원의 정확도를 업데이트하고
 * 전문 영역 초점을 조정한다.
 *
 * @param deliberation - 배심원단 심의 결과
 * @param actualDirection - 실제 시장 방향
 * @returns 각 배심원별 학습 결과
 */
export function learnFromJuryFailure(
  deliberation: JuryDeliberation,
  actualDirection: Direction,
): JuryLearningResult[] {
  return deliberation.evaluations.map((evaluation) => {
    const adjustments: string[] = [];

    // 예측 방향과 실제 방향의 정합성 판단
    // "신뢰" 판정을 내렸는데 예측이 틀렸으면 → 해당 배심원의 판단력 의문
    // "불신" 판정을 내렸는데 예측이 틀렸으면 → 해당 배심원의 판단력 인정
    const wasCorrectlySkeptical =
      (evaluation.verdict === "불신" || evaluation.verdict === "의심");
    const wasCorrectlyTrustful =
      (evaluation.verdict === "신뢰" || evaluation.verdict === "부분신뢰");

    // 실제로 예측이 맞았는지 확인 (이 함수는 실패 시 호출되므로 예측은 틀린 것)
    // 따라서 신뢰한 배심원은 정확도 하락, 의심한 배심원은 정확도 상승
    let accuracyDelta = 0;

    if (wasCorrectlySkeptical) {
      // 회의적이었고 실제로 예측이 틀렸음 → 올바른 판단
      accuracyDelta = 0.02;
      adjustments.push("예측 실패를 올바르게 의심함 -- 신뢰도 상향 조정");
    } else if (wasCorrectlyTrustful) {
      // 신뢰했으나 예측이 틀렸음 → 잘못된 판단
      accuracyDelta = -0.03;
      adjustments.push("잘못된 신뢰 판정 -- 신뢰도 하향 조정");
    }

    // 카테고리별 특화 조정
    let newSpecialtyFocus = "";
    switch (evaluation.category) {
      case "기술적분석":
        if (accuracyDelta < 0) {
          adjustments.push("기술적 지표 해석 기준 재보정 필요");
          newSpecialtyFocus = "과매수/과매도 임계값 재설정 및 다중 시간프레임 확인 강화";
        } else {
          newSpecialtyFocus = "현재 기술적 분석 기준 유지";
        }
        break;

      case "거시경제":
        if (accuracyDelta < 0) {
          adjustments.push("거시경제 변수의 시장 영향력 재평가 필요");
          newSpecialtyFocus = "거시 지표의 시차 효과 및 시장 반영 속도 재검토";
        } else {
          newSpecialtyFocus = "현재 거시경제 분석 프레임워크 유지";
        }
        break;

      case "리스크관리":
        if (accuracyDelta < 0) {
          adjustments.push("리스크 평가 임계값 보수적으로 조정");
          newSpecialtyFocus = "VaR 신뢰구간 확대 및 꼬리 리스크 가중치 상향";
        } else {
          newSpecialtyFocus = "현재 리스크 평가 기준 유지, 경계심 강화";
        }
        break;

      case "행동경제학":
        if (accuracyDelta < 0) {
          adjustments.push("행동 패턴 감지 민감도 재조정 필요");
          newSpecialtyFocus = "역발상 신호의 타이밍 정확도 개선";
        } else {
          newSpecialtyFocus = "현재 행동 분석 관점 유지";
        }
        break;

      case "통계계량":
        if (accuracyDelta < 0) {
          adjustments.push("통계 모델 파라미터 재적합 필요");
          newSpecialtyFocus = "학습 기간 조정 및 비정상성(nonstationarity) 처리 강화";
        } else {
          newSpecialtyFocus = "현재 통계 모델 파라미터 유지";
        }
        break;
    }

    // 실제 방향 반영 추가 조정
    if (actualDirection === "변동성확대") {
      adjustments.push("변동성 확대 시나리오에 대한 감지 민감도 강화 필요");
    }

    const previousAccuracy = evaluation.credibilityScore;
    const newAccuracy = clamp(previousAccuracy + accuracyDelta, 0.1, 0.95);

    if (adjustments.length === 0) {
      adjustments.push("특별한 조정 사항 없음");
    }

    return {
      jurorId: evaluation.jurorId,
      previousAccuracy,
      adjustments,
      newSpecialtyFocus: newSpecialtyFocus || "현재 전문 영역 유지",
    };
  });
}
