/**
 * AI 토론 엔진 (Debate System)
 *
 * 5개 서브모델(모멘텀, 평균회귀, 변동성, 상관관계, 펀더멘털)이
 * 12라운드에 걸쳐 구조화된 토론을 수행한 후 최종 예측을 도출한다.
 *
 * 토론 단계 (각 2라운드):
 *   1-2: 주장(claim) — 각 모델의 초기 포지션 및 근거 제시
 *   3-4: 공격(attack) — 반대 모델의 약점을 공격
 *   5-6: 방어(defense) — 공격에 대한 방어 및 추가 근거
 *   7-8: 반박(rebuttal) — 최종 반론
 *   9-10: 추가증거(additional evidence) — 새로운 데이터 포인트 제시
 *   11-12: 최종변론(closing argument) — 핵심 논점 요약
 */

import type { Direction, ModelVote } from "./models";
import type { PriceBar } from "./indicators";
import {
  calcRSI,
  calcMACD,
  calcBollingerBands,
  calcATR,
  calcSMA,
  calcEMA,
  calcROC,
} from "./indicators";
import type { SubModelVotes } from "./ensemble";
import type { AdvancedSignals } from "./advancedAnalysis";
import type { CollectedData } from "./dataCollector";

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

/** 토론 단계 */
export type DebatePhase =
  | "주장"
  | "공격"
  | "방어"
  | "반박"
  | "추가증거"
  | "최종변론";

/** 서브모델 ID */
export type ModelId =
  | "momentum"
  | "meanReversion"
  | "volatility"
  | "correlation"
  | "fundamental";

/** 토론 라운드 기록 */
export interface DebateRound {
  roundNumber: number;
  phase: DebatePhase;
  modelId: ModelId;
  argument: string;
  evidence: string[];
  targetModel?: ModelId;
  attackStrength?: number;     // 0-100: 공격의 효과
  defenseSuccess?: boolean;    // 방어 성공 여부
}

/** 토론 참여자 상태 */
export interface DebaterState {
  modelId: ModelId;
  credibilityScore: number;    // 0-100: 신뢰도 점수
  claimsCount: number;
  successfulAttacks: number;
  failedAttacks: number;
  successfulDefenses: number;
  failedDefenses: number;
  currentPosition: Direction;
  positionConfidence: number;  // 0-100
}

/** 합의 수준 */
export type AgreementLevel = "만장일치" | "다수결" | "분열" | "교착";

/** 토론 결과 */
export interface DebateResult {
  rounds: DebateRound[];
  debaterStates: Map<ModelId, DebaterState>;
  consensus: {
    direction: Direction;
    confidence: number;
    agreementLevel: AgreementLevel;
  };
  keyArguments: string[];
  resolvedConflicts: string[];
  unresolvedConflicts: string[];
}

/** 토론 실패 학습 결과 */
export interface DebateLearningResult {
  originalPrediction: Direction;
  actualDirection: Direction;
  wasCorrect: boolean;
  modelAccuracy: Record<ModelId, { predicted: Direction; wasCorrect: boolean }>;
  credibilityAdjustments: Record<ModelId, number>;
  lessonsLearned: string[];
  suggestedWeightChanges: Record<ModelId, number>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 내부 헬퍼: 지표 기반 증거 수집
// ═══════════════════════════════════════════════════════════════════════════════

/** 계산된 지표 캐시 (중복 계산 방지) */
interface IndicatorCache {
  rsi: number | null;
  macd: { macdLine: number; signalLine: number; histogram: number } | null;
  bb: { upper: number; middle: number; lower: number; width: number; percentB: number } | null;
  atr14: number | null;
  atr5: number | null;
  sma10: number | null;
  sma20: number | null;
  sma50: number | null;
  ema20: number | null;
  roc12: number | null;
  roc5: number | null;
  currentPrice: number;
  priceChange5d: number | null;
  priceChange20d: number | null;
}

/** 모든 지표를 한 번에 계산하여 캐싱한다 */
function buildIndicatorCache(data: PriceBar[]): IndicatorCache {
  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;

  let priceChange5d: number | null = null;
  if (data.length >= 6) {
    const prev5 = data[data.length - 6].close;
    priceChange5d = prev5 !== 0 ? ((currentPrice - prev5) / prev5) * 100 : null;
  }

  let priceChange20d: number | null = null;
  if (data.length >= 21) {
    const prev20 = data[data.length - 21].close;
    priceChange20d = prev20 !== 0 ? ((currentPrice - prev20) / prev20) * 100 : null;
  }

  return {
    rsi: calcRSI(data),
    macd: calcMACD(data),
    bb: calcBollingerBands(data),
    atr14: calcATR(data, 14),
    atr5: calcATR(data, 5),
    sma10: calcSMA(data, 10),
    sma20: calcSMA(data, 20),
    sma50: calcSMA(data, 50),
    ema20: calcEMA(data, 20),
    roc12: calcROC(data, 12),
    roc5: calcROC(data, 5),
    currentPrice,
    priceChange5d,
    priceChange20d,
  };
}

/** 모델명 한글 레이블 */
const MODEL_LABELS: Record<ModelId, string> = {
  momentum: "모멘텀",
  meanReversion: "평균회귀",
  volatility: "변동성",
  correlation: "상관관계",
  fundamental: "펀더멘털",
};

/** 모든 모델 ID 목록 */
const ALL_MODEL_IDS: ModelId[] = [
  "momentum",
  "meanReversion",
  "volatility",
  "correlation",
  "fundamental",
];

// ═══════════════════════════════════════════════════════════════════════════════
// 각 모델의 주장(Claim) 증거 생성
// ═══════════════════════════════════════════════════════════════════════════════

/** 모멘텀 모델 주장 증거 */
function buildMomentumClaimEvidence(
  cache: IndicatorCache,
  advancedSignals?: AdvancedSignals | null,
): string[] {
  const evidence: string[] = [];

  if (cache.rsi !== null) {
    evidence.push(
      `RSI(14) = ${cache.rsi.toFixed(1)} — ${cache.rsi > 50 ? "상승 추세 영역" : "하락 추세 영역"}`,
    );
  }
  if (cache.macd !== null) {
    evidence.push(
      `MACD 라인 = ${cache.macd.macdLine.toFixed(2)}, 히스토그램 = ${cache.macd.histogram.toFixed(2)} — ${cache.macd.histogram > 0 ? "상승 모멘텀" : "하락 모멘텀"}`,
    );
  }
  if (cache.sma10 !== null && cache.sma50 !== null) {
    const cross = cache.sma10 > cache.sma50 ? "골든 크로스" : "데드 크로스";
    const ratio = cache.sma50 !== 0
      ? (((cache.sma10 - cache.sma50) / cache.sma50) * 100).toFixed(2)
      : "N/A";
    evidence.push(`SMA(10) vs SMA(50): ${cross} (괴리율 ${ratio}%)`);
  }
  if (cache.roc12 !== null) {
    evidence.push(
      `12일 변화율(ROC) = ${cache.roc12.toFixed(2)}% — ${Math.abs(cache.roc12) > 3 ? "강한" : "약한"} 모멘텀`,
    );
  }
  if (cache.ema20 !== null) {
    const pos = cache.currentPrice > cache.ema20 ? "상방" : "하방";
    evidence.push(
      `현재가(${cache.currentPrice.toFixed(2)})가 EMA(20)(${cache.ema20.toFixed(2)}) ${pos}에 위치`,
    );
  }
  if (advancedSignals?.stochastic) {
    const { k, d } = advancedSignals.stochastic;
    evidence.push(
      `스토캐스틱 K=${k.toFixed(1)}, D=${d.toFixed(1)} — ${k > d ? "상향" : "하향"} 교차`,
    );
  }
  if (advancedSignals?.adx != null) {
    evidence.push(
      `ADX = ${advancedSignals.adx.adx.toFixed(1)} — ${advancedSignals.adx.adx > 25 ? "추세 존재" : "추세 미약"}`,
    );
  }

  return evidence;
}

/** 평균회귀 모델 주장 증거 */
function buildMeanReversionClaimEvidence(
  cache: IndicatorCache,
  advancedSignals?: AdvancedSignals | null,
): string[] {
  const evidence: string[] = [];

  if (cache.rsi !== null) {
    let zone = "중립";
    if (cache.rsi >= 70) zone = "과매수";
    else if (cache.rsi <= 30) zone = "과매도";
    else if (cache.rsi >= 60) zone = "과열 주의";
    else if (cache.rsi <= 40) zone = "침체 주의";
    evidence.push(`RSI(14) = ${cache.rsi.toFixed(1)} — ${zone} 구간`);
  }
  if (cache.bb !== null) {
    const pctB = (cache.bb.percentB * 100).toFixed(1);
    let position = "밴드 중앙 부근";
    if (cache.bb.percentB >= 1.0) position = "상단 밴드 돌파 (극단적 과매수)";
    else if (cache.bb.percentB >= 0.8) position = "상단 밴드 접근 (과매수)";
    else if (cache.bb.percentB <= 0.0) position = "하단 밴드 이탈 (극단적 과매도)";
    else if (cache.bb.percentB <= 0.2) position = "하단 밴드 접근 (과매도)";
    evidence.push(`볼린저 밴드 %B = ${pctB}% — ${position}`);
    evidence.push(`볼린저 밴드 폭 = ${(cache.bb.width * 100).toFixed(2)}%`);
  }
  if (cache.sma20 !== null && cache.sma20 !== 0) {
    const deviation = ((cache.currentPrice - cache.sma20) / cache.sma20) * 100;
    evidence.push(
      `20일 이평선 대비 괴리율 = ${deviation.toFixed(2)}% — ${Math.abs(deviation) > 5 ? "평균 회귀 압력 높음" : "정상 범위"}`,
    );
  }
  if (advancedSignals?.williamsR != null) {
    evidence.push(`Williams %R = ${advancedSignals.williamsR.toFixed(1)}`);
  }
  if (advancedSignals?.cci != null) {
    evidence.push(
      `CCI = ${advancedSignals.cci.toFixed(1)} — ${Math.abs(advancedSignals.cci) > 100 ? "극단 영역" : "정상 범위"}`,
    );
  }
  if (advancedSignals?.meanReversionScore !== undefined) {
    evidence.push(`평균 회귀 종합 점수 = ${advancedSignals.meanReversionScore}`);
  }
  if (advancedSignals?.momentumDivergence.hasDivergence) {
    const dtype =
      advancedSignals.momentumDivergence.type === "bearish"
        ? "베어리시 다이버전스 (가격 고점 갱신, RSI 하락)"
        : "불리시 다이버전스 (가격 저점 갱신, RSI 상승)";
    evidence.push(`모멘텀 다이버전스 감지: ${dtype}`);
  }

  return evidence;
}

/** 변동성 모델 주장 증거 */
function buildVolatilityClaimEvidence(
  cache: IndicatorCache,
  advancedSignals?: AdvancedSignals | null,
): string[] {
  const evidence: string[] = [];

  if (cache.atr14 !== null) {
    const atrPct =
      cache.currentPrice > 0
        ? ((cache.atr14 / cache.currentPrice) * 100).toFixed(2)
        : "N/A";
    evidence.push(`ATR(14) = ${cache.atr14.toFixed(2)} (현재가 대비 ${atrPct}%)`);
  }
  if (cache.atr14 !== null && cache.atr5 !== null && cache.atr14 !== 0) {
    const ratio = (cache.atr5 / cache.atr14).toFixed(2);
    const state =
      parseFloat(ratio) > 1.2
        ? "변동성 확대"
        : parseFloat(ratio) < 0.8
          ? "변동성 축소"
          : "안정";
    evidence.push(`ATR 단기/장기 비율 = ${ratio} — ${state}`);
  }
  if (cache.bb !== null) {
    let widthState = "보통";
    if (cache.bb.width > 0.1) widthState = "높음 (고변동)";
    else if (cache.bb.width < 0.03) widthState = "극도로 좁음 (돌파 임박)";
    evidence.push(`볼린저 밴드 폭 = ${(cache.bb.width * 100).toFixed(2)}% — ${widthState}`);
  }
  if (advancedSignals?.volatilityRegime) {
    const regimeMap: Record<string, string> = {
      low: "저변동",
      normal: "보통",
      high: "고변동",
      extreme: "극고변동",
    };
    evidence.push(
      `변동성 체제 = ${regimeMap[advancedSignals.volatilityRegime] ?? advancedSignals.volatilityRegime}`,
    );
  }
  if (advancedSignals?.breakoutProbability) {
    evidence.push(`돌파 확률 = ${advancedSignals.breakoutProbability.probability}%`);
  }
  if (advancedSignals?.maxDrawdown !== undefined) {
    evidence.push(`최근 최대 낙폭(MDD) = ${advancedSignals.maxDrawdown.toFixed(2)}%`);
  }
  if (advancedSignals?.priceGap.hasGap) {
    const dir = advancedSignals.priceGap.direction === "up" ? "상승" : "하락";
    evidence.push(`가격 갭 발생: ${dir} ${advancedSignals.priceGap.gapPercent.toFixed(2)}%`);
  }

  return evidence;
}

/** 상관관계 모델 주장 증거 */
function buildCorrelationClaimEvidence(
  vote: ModelVote,
  collectedData?: CollectedData | null,
): string[] {
  const evidence: string[] = [];

  // 투표 근거에서 교차자산 정보 추출
  if (vote.rationale) {
    const parts = vote.rationale.replace("[상관관계] ", "").split(". ");
    for (const part of parts.slice(0, 4)) {
      if (part.trim()) evidence.push(part.trim());
    }
  }
  if (collectedData) {
    if (collectedData.vix !== undefined) {
      evidence.push(
        `VIX = ${collectedData.vix.toFixed(1)} — ${collectedData.vix > 25 ? "고공포" : collectedData.vix < 15 ? "안정" : "보통"}`,
      );
    }
    if (collectedData.yieldCurveSpread !== undefined) {
      evidence.push(
        `수익률 곡선 스프레드 = ${collectedData.yieldCurveSpread.toFixed(3)}% — ${collectedData.yieldCurveSpread < 0 ? "역전 (경기침체 경고)" : "정상"}`,
      );
    }
    if (collectedData.dxyTrend) {
      evidence.push(`달러 인덱스 추세: ${collectedData.dxyTrend}`);
    }
    if (collectedData.safeHavenDemand) {
      evidence.push(`안전자산 수요: ${collectedData.safeHavenDemand}`);
    }
  }
  if (evidence.length === 0) {
    evidence.push("교차자산 상관관계 데이터 제한적. 가용 데이터로 추론");
  }

  return evidence;
}

/** 펀더멘털 모델 주장 증거 */
function buildFundamentalClaimEvidence(
  collectedData?: CollectedData | null,
  advancedSignals?: AdvancedSignals | null,
): string[] {
  const evidence: string[] = [];

  if (collectedData) {
    if (collectedData.fearGreedIndex !== undefined) {
      evidence.push(`공포/탐욕 지수 = ${collectedData.fearGreedIndex}`);
    }
    if (collectedData.bondEquitySignal) {
      evidence.push(`채권-주식 시그널: ${collectedData.bondEquitySignal}`);
    }
    if (collectedData.globalMarketSummary) {
      const { asiaStatus, europeStatus, usStatus } = collectedData.globalMarketSummary;
      evidence.push(
        `글로벌 시장: 아시아(${asiaStatus}), 유럽(${europeStatus}), 미국(${usStatus})`,
      );
    }
    if (collectedData.newsSentiment) {
      const sentimentLabel =
        collectedData.newsSentiment.overall === "positive"
          ? "긍정"
          : collectedData.newsSentiment.overall === "negative"
            ? "부정"
            : "중립";
      evidence.push(`뉴스 심리: ${sentimentLabel}`);
      if (collectedData.newsSentiment.headlines.length > 0) {
        evidence.push(`주요 헤드라인: "${collectedData.newsSentiment.headlines[0]}"`);
      }
    }
    if (collectedData.copperGoldRatio !== undefined) {
      evidence.push(
        `구리/금 비율 = ${collectedData.copperGoldRatio.toFixed(4)} — ${collectedData.copperGoldRatio > 0.005 ? "경기 확장" : "경기 둔화"} 시그널`,
      );
    }
  }
  if (advancedSignals) {
    evidence.push(`Fear & Greed 복합 지수 = ${advancedSignals.fearGreedComposite}`);
    if (advancedSignals.sharpeProxy !== 0) {
      evidence.push(`Sharpe 비율 프록시 = ${advancedSignals.sharpeProxy.toFixed(2)}`);
    }
    if (advancedSignals.riskLevel) {
      evidence.push(`리스크 수준: ${advancedSignals.riskLevel}`);
    }
    if (advancedSignals.volumeProfile) {
      const spike = advancedSignals.volumeProfile.volumeSpike ? " (급등 감지)" : "";
      evidence.push(`거래량 추세: ${advancedSignals.volumeProfile.volumeTrend}${spike}`);
    }
  }
  if (evidence.length === 0) {
    evidence.push("거시경제 데이터 제한적. 기술적 지표 기반으로 추론");
  }

  return evidence;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 공격 로직
// ═══════════════════════════════════════════════════════════════════════════════

interface AttackResult {
  argument: string;
  evidence: string[];
  strength: number;
}

/** 모멘텀이 다른 모델을 공격 */
function buildMomentumAttack(
  targetId: ModelId,
  cache: IndicatorCache,
  advancedSignals?: AdvancedSignals | null,
): AttackResult {
  const evidence: string[] = [];
  let strength = 50;
  const targetLabel = MODEL_LABELS[targetId];

  if (targetId === "meanReversion") {
    if (cache.rsi !== null && cache.rsi > 50 && cache.rsi < 70) {
      evidence.push(`RSI ${cache.rsi.toFixed(1)}는 과매수가 아닌 건전한 상승 구간. 회귀 시그널 조기`);
      strength += 15;
    }
    if (advancedSignals?.adx != null && advancedSignals.adx.adx > 30) {
      evidence.push(`ADX ${advancedSignals.adx.adx.toFixed(1)}로 강한 추세 유지 중. 평균 회귀 근거 약화`);
      strength += 20;
    }
    if (cache.macd?.histogram !== undefined && Math.abs(cache.macd.histogram) > 1) {
      evidence.push(`MACD 히스토그램 ${cache.macd.histogram.toFixed(2)}로 모멘텀 지속`);
      strength += 10;
    }
    return {
      argument: `[${MODEL_LABELS.momentum} → ${targetLabel}] 현재 추세가 강하게 유지되어 평균 회귀 판단은 시기상조`,
      evidence,
      strength: Math.min(strength, 95),
    };
  }
  if (targetId === "volatility") {
    if (cache.roc12 !== null && Math.abs(cache.roc12) > 3) {
      evidence.push(`12일 ROC ${cache.roc12.toFixed(2)}%로 방향성 확인. 변동성 모델의 '보합' 판단에 반대`);
      strength += 15;
    }
    if (advancedSignals?.trendStrength && advancedSignals.trendStrength.strength > 50) {
      evidence.push(`추세 강도 ${advancedSignals.trendStrength.strength}%로 방향성 존재`);
      strength += 15;
    }
    return {
      argument: `[${MODEL_LABELS.momentum} → ${targetLabel}] 변동성 분석이 방향성을 간과하고 있음`,
      evidence,
      strength: Math.min(strength, 90),
    };
  }
  if (targetId === "correlation") {
    evidence.push("교차자산 상관관계는 단기 추세 변화를 즉시 반영하지 못하는 후행적 특성");
    if (cache.roc12 !== null) {
      evidence.push(`현재 12일 ROC ${cache.roc12.toFixed(2)}%로 직접적 모멘텀 확인 가능`);
      strength += 10;
    }
    return {
      argument: `[${MODEL_LABELS.momentum} → ${targetLabel}] 상관관계 기반 추론은 후행적이며 현재 모멘텀을 과소평가`,
      evidence,
      strength: Math.min(strength, 85),
    };
  }
  // fundamental
  evidence.push("펀더멘털 요인은 중장기적이며 단기 가격 움직임을 설명하지 못할 수 있음");
  if (cache.macd?.histogram !== undefined && Math.abs(cache.macd.histogram) > 0.5) {
    evidence.push(`MACD 히스토그램이 ${cache.macd.histogram > 0 ? "양수" : "음수"}로 단기 모멘텀은 명확`);
    strength += 10;
  }
  return {
    argument: `[${MODEL_LABELS.momentum} → ${targetLabel}] 펀더멘털 분석은 단기 모멘텀과 괴리될 수 있음`,
    evidence,
    strength: Math.min(strength, 80),
  };
}

/** 평균회귀가 다른 모델을 공격 */
function buildMeanReversionAttack(
  targetId: ModelId,
  cache: IndicatorCache,
  advancedSignals?: AdvancedSignals | null,
): AttackResult {
  const evidence: string[] = [];
  let strength = 50;
  const targetLabel = MODEL_LABELS[targetId];

  if (targetId === "momentum") {
    if (cache.rsi !== null && (cache.rsi > 70 || cache.rsi < 30)) {
      evidence.push(
        `RSI ${cache.rsi.toFixed(1)}로 ${cache.rsi > 70 ? "과매수" : "과매도"} 극단 구간. 모멘텀 지속 불가능`,
      );
      strength += 25;
    }
    if (cache.bb !== null && (cache.bb.percentB > 0.95 || cache.bb.percentB < 0.05)) {
      evidence.push(`볼린저 %B = ${(cache.bb.percentB * 100).toFixed(1)}%로 밴드 극단. 회귀 압력 강함`);
      strength += 20;
    }
    if (advancedSignals?.momentumDivergence.hasDivergence) {
      evidence.push("모멘텀 다이버전스 감지. 가격-RSI 괴리로 추세 약화 징후");
      strength += 15;
    }
    return {
      argument: `[${MODEL_LABELS.meanReversion} → ${targetLabel}] 지표가 극단에 도달하여 모멘텀 지속은 통계적으로 어려움`,
      evidence,
      strength: Math.min(strength, 95),
    };
  }
  if (targetId === "volatility") {
    if (cache.bb !== null) {
      evidence.push(
        `볼린저 밴드 %B = ${(cache.bb.percentB * 100).toFixed(1)}%. 가격이 밴드 내로 회귀할 가능성이 방향 없는 변동성보다 유력`,
      );
      strength += 10;
    }
    return {
      argument: `[${MODEL_LABELS.meanReversion} → ${targetLabel}] 변동성 확대보다 평균 회귀 방향이 더 예측 가능`,
      evidence,
      strength: Math.min(strength, 80),
    };
  }
  if (targetId === "correlation") {
    evidence.push("교차자산 시그널보다 해당 자산 자체의 과매수/과매도 상태가 단기 회귀에 더 직접적");
    return {
      argument: `[${MODEL_LABELS.meanReversion} → ${targetLabel}] 자산 자체의 극단값이 교차자산 시그널보다 회귀 예측에 유효`,
      evidence,
      strength: Math.min(strength, 75),
    };
  }
  // fundamental
  if (cache.rsi !== null && (cache.rsi > 75 || cache.rsi < 25)) {
    evidence.push(`RSI ${cache.rsi.toFixed(1)}로 극단 영역. 펀더멘털과 무관하게 기술적 회귀 발생 확률 높음`);
    strength += 15;
  }
  return {
    argument: `[${MODEL_LABELS.meanReversion} → ${targetLabel}] 단기적으로 기술적 과매수/과매도는 펀더멘털보다 우선할 수 있음`,
    evidence,
    strength: Math.min(strength, 80),
  };
}

/** 변동성이 다른 모델을 공격 */
function buildVolatilityAttack(
  targetId: ModelId,
  cache: IndicatorCache,
  advancedSignals?: AdvancedSignals | null,
): AttackResult {
  const evidence: string[] = [];
  let strength = 50;
  const targetLabel = MODEL_LABELS[targetId];
  const isHighVol =
    advancedSignals?.volatilityRegime === "high" ||
    advancedSignals?.volatilityRegime === "extreme";

  if (targetId === "momentum" || targetId === "meanReversion") {
    if (isHighVol) {
      evidence.push(
        `변동성 체제: ${advancedSignals!.volatilityRegime}. 고변동 환경에서 방향 예측 신뢰도 급격 저하`,
      );
      strength += 20;
    }
    if (cache.atr14 !== null && cache.atr5 !== null && cache.atr14 !== 0 && cache.atr5 / cache.atr14 > 1.5) {
      evidence.push(
        `ATR 단기/장기 비율 ${(cache.atr5 / cache.atr14).toFixed(2)}로 변동성 급격 확대. 기존 지표 신뢰도 저하`,
      );
      strength += 15;
    }
    if (advancedSignals?.maxDrawdown !== undefined && advancedSignals.maxDrawdown > 10) {
      evidence.push(`최대 낙폭 ${advancedSignals.maxDrawdown.toFixed(1)}%로 리스크 환경`);
      strength += 10;
    }
    return {
      argument: `[${MODEL_LABELS.volatility} → ${targetLabel}] 현재 변동성 환경에서 ${targetLabel} 모델의 방향 예측은 과신`,
      evidence,
      strength: Math.min(strength, 90),
    };
  }
  if (targetId === "correlation") {
    if (isHighVol) {
      evidence.push("극고변동 환경에서는 자산 간 상관관계가 불안정해지며 기존 상관계수의 유효성 저하");
      strength += 15;
    }
    return {
      argument: `[${MODEL_LABELS.volatility} → ${targetLabel}] 고변동 환경에서 상관관계 붕괴 가능성 높음`,
      evidence,
      strength: Math.min(strength, 85),
    };
  }
  // fundamental
  evidence.push("급변하는 변동성 환경에서 펀더멘털 분석의 시간 지평이 적합하지 않을 수 있음");
  if (advancedSignals?.priceGap.hasGap) {
    evidence.push("가격 갭 발생. 비정상적 시장 상태에서 펀더멘털 분석 적용 한계");
    strength += 10;
  }
  return {
    argument: `[${MODEL_LABELS.volatility} → ${targetLabel}] 급격한 변동성 환경에서 펀더멘털 요인의 즉시성 부족`,
    evidence,
    strength: Math.min(strength, 80),
  };
}

/** 상관관계가 다른 모델을 공격 */
function buildCorrelationAttack(
  targetId: ModelId,
  cache: IndicatorCache,
  collectedData?: CollectedData | null,
): AttackResult {
  const evidence: string[] = [];
  let strength = 50;
  const targetLabel = MODEL_LABELS[targetId];

  if (targetId === "momentum" || targetId === "meanReversion") {
    evidence.push("단일 자산의 기술적 지표만으로는 거시적 자금 흐름과 교차시장 영향을 포착 불가");
    if (collectedData?.vix !== undefined && collectedData.vix > 25) {
      evidence.push(`VIX ${collectedData.vix.toFixed(1)}로 위험회피 심리 확산. 개별 자산 기술적 분석만으로는 불충분`);
      strength += 15;
    }
    if (collectedData?.safeHavenDemand === "높음") {
      evidence.push("안전자산 수요 높음. 전체 시장 자금 흐름이 개별 기술적 지표를 압도할 수 있음");
      strength += 10;
    }
    return {
      argument: `[${MODEL_LABELS.correlation} → ${targetLabel}] 교차시장 자금 흐름이 개별 기술적 지표보다 광범위한 영향력 보유`,
      evidence,
      strength: Math.min(strength, 85),
    };
  }
  if (targetId === "volatility") {
    evidence.push("변동성 확대의 원인이 교차시장 이벤트(금리, 환율 변동)에서 기인할 수 있음");
    if (collectedData?.yieldCurveSpread !== undefined && collectedData.yieldCurveSpread < 0) {
      evidence.push(`수익률 곡선 역전(${collectedData.yieldCurveSpread.toFixed(3)}%). 변동성의 구조적 원인 파악 가능`);
      strength += 15;
    }
    return {
      argument: `[${MODEL_LABELS.correlation} → ${targetLabel}] 변동성의 원인을 교차시장 분석으로 더 정확히 설명 가능`,
      evidence,
      strength: Math.min(strength, 80),
    };
  }
  // fundamental
  evidence.push("개별 펀더멘털보다 교차시장 가격 행동이 더 즉각적인 정보를 반영");
  return {
    argument: `[${MODEL_LABELS.correlation} → ${targetLabel}] 가격 기반 상관관계가 텍스트 기반 펀더멘털보다 즉시성 우위`,
    evidence,
    strength: Math.min(strength, 75),
  };
}

/** 펀더멘털이 다른 모델을 공격 */
function buildFundamentalAttack(
  targetId: ModelId,
  cache: IndicatorCache,
  collectedData?: CollectedData | null,
  advancedSignals?: AdvancedSignals | null,
): AttackResult {
  const evidence: string[] = [];
  let strength = 50;
  const targetLabel = MODEL_LABELS[targetId];

  if (targetId === "momentum") {
    evidence.push("모멘텀은 과거 데이터의 외삽에 불과. 펀더멘털 변화가 추세를 돌려세울 수 있음");
    if (collectedData?.newsSentiment && collectedData.newsSentiment.overall !== "neutral") {
      const sentLabel = collectedData.newsSentiment.overall === "positive" ? "긍정" : "부정";
      evidence.push(`뉴스 심리 '${sentLabel}'으로 펀더멘털 환경 변화 감지`);
      strength += 10;
    }
    if (advancedSignals?.riskLevel === "매우_높음" || advancedSignals?.riskLevel === "높음") {
      evidence.push(`리스크 수준 '${advancedSignals!.riskLevel}'. 모멘텀만 추종하면 급격한 반전에 취약`);
      strength += 15;
    }
    return {
      argument: `[${MODEL_LABELS.fundamental} → ${targetLabel}] 모멘텀 추종은 펀더멘털 환경 변화 시 급격한 손실 위험`,
      evidence,
      strength: Math.min(strength, 85),
    };
  }
  if (targetId === "meanReversion") {
    evidence.push("구조적 펀더멘털 변화 시 평균 자체가 이동하므로 과거 평균으로의 회귀는 부적절");
    if (collectedData?.bondEquitySignal) {
      evidence.push(`채권-주식 시그널: "${collectedData.bondEquitySignal}". 거시 환경 구조 변화 가능성`);
      strength += 10;
    }
    return {
      argument: `[${MODEL_LABELS.fundamental} → ${targetLabel}] 구조적 변화 시 평균 회귀 가정이 무효화될 수 있음`,
      evidence,
      strength: Math.min(strength, 80),
    };
  }
  if (targetId === "volatility") {
    evidence.push("변동성만으로는 방향을 알 수 없음. 펀더멘털 요인이 변동성의 방향을 결정");
    return {
      argument: `[${MODEL_LABELS.fundamental} → ${targetLabel}] 변동성은 결과이지 원인이 아님. 펀더멘털이 방향성 제공`,
      evidence,
      strength: Math.min(strength, 80),
    };
  }
  // correlation
  evidence.push("상관관계는 안정적이지 않으며 펀더멘털 환경 변화에 따라 급변할 수 있음");
  return {
    argument: `[${MODEL_LABELS.fundamental} → ${targetLabel}] 역사적 상관관계는 펀더멘털 레짐 변화 시 붕괴 가능`,
    evidence,
    strength: Math.min(strength, 75),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 방어 로직
// ═══════════════════════════════════════════════════════════════════════════════

/** 공격에 대한 방어 증거 생성 */
function buildDefense(
  defenderId: ModelId,
  attackStrength: number,
  cache: IndicatorCache,
  advancedSignals?: AdvancedSignals | null,
  collectedData?: CollectedData | null,
): { argument: string; evidence: string[]; success: boolean } {
  const evidence: string[] = [];
  let defenseStrength = 40;

  switch (defenderId) {
    case "momentum": {
      if (cache.macd?.histogram !== undefined && Math.abs(cache.macd.histogram) > 0.5) {
        evidence.push(`MACD 히스토그램 ${cache.macd.histogram.toFixed(2)}로 모멘텀 건재. 공격 논점 반박`);
        defenseStrength += 15;
      }
      if (cache.sma10 !== null && cache.sma50 !== null && cache.sma10 > cache.sma50) {
        evidence.push("단기 SMA가 여전히 장기 SMA 상회. 추세 구조 유지 중");
        defenseStrength += 10;
      }
      if (advancedSignals?.multiTimeframeTrend?.aligned) {
        evidence.push("다중 타임프레임 추세 정렬로 모멘텀 유효성 재확인");
        defenseStrength += 15;
      }
      break;
    }
    case "meanReversion": {
      if (cache.rsi !== null && (cache.rsi > 70 || cache.rsi < 30)) {
        evidence.push(`RSI ${cache.rsi.toFixed(1)} 극단값. 역사적으로 회귀 확률이 70% 이상`);
        defenseStrength += 20;
      }
      if (cache.bb !== null && (cache.bb.percentB > 0.9 || cache.bb.percentB < 0.1)) {
        evidence.push(`볼린저 %B ${(cache.bb.percentB * 100).toFixed(1)}%로 극단. 통계적 회귀 근거 견고`);
        defenseStrength += 15;
      }
      if (advancedSignals?.meanReversionScore !== undefined && advancedSignals.meanReversionScore > 50) {
        evidence.push(`평균 회귀 종합 점수 ${advancedSignals.meanReversionScore}점으로 회귀 가능성 높음`);
        defenseStrength += 10;
      }
      break;
    }
    case "volatility": {
      if (cache.atr14 !== null && cache.atr5 !== null && cache.atr14 !== 0) {
        const ratio = cache.atr5 / cache.atr14;
        if (ratio > 1.3 || ratio < 0.7) {
          evidence.push(`ATR 비율 ${ratio.toFixed(2)}로 변동성 판단의 유효성 확인`);
          defenseStrength += 15;
        }
      }
      if (advancedSignals?.volatilityRegime && advancedSignals.volatilityRegime !== "normal") {
        evidence.push(`변동성 체제 '${advancedSignals.volatilityRegime}'으로 변동성 판단 근거 유지`);
        defenseStrength += 15;
      }
      break;
    }
    case "correlation": {
      evidence.push("교차자산 시그널은 다수 자산의 합의를 반영하므로 개별 지표보다 노이즈에 강건");
      defenseStrength += 10;
      if (collectedData?.vix !== undefined) {
        evidence.push(`VIX ${collectedData.vix.toFixed(1)}로 시장 전체 심리 파악 가능`);
        defenseStrength += 5;
      }
      break;
    }
    case "fundamental": {
      evidence.push("펀더멘털 요인은 중장기 방향을 결정하는 핵심 동인으로 단기 공격에 흔들리지 않음");
      defenseStrength += 10;
      if (collectedData?.bondEquitySignal) {
        evidence.push("채권-주식 시그널이 거시 환경을 명확히 지시. 펀더멘털 판단 유지");
        defenseStrength += 10;
      }
      if (advancedSignals?.fearGreedComposite !== undefined) {
        const fgi = advancedSignals.fearGreedComposite;
        if (fgi < 25 || fgi > 75) {
          evidence.push(`Fear & Greed 지수 ${fgi}로 극단 상태. 펀더멘털 기반 역발상 전략 유효`);
          defenseStrength += 10;
        }
      }
      break;
    }
  }

  const success = defenseStrength >= attackStrength * 0.8;

  return {
    argument: `[${MODEL_LABELS[defenderId]} 방어] ${success ? "공격 반박 성공" : "일부 논점 인정하나 핵심 판단 유지"}. ${evidence.join(". ")}`,
    evidence,
    success,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 반박/추가증거/최종변론
// ═══════════════════════════════════════════════════════════════════════════════

/** 반박 라운드에서의 논점 재강조 */
function buildRebuttal(
  modelId: ModelId,
  state: DebaterState,
  cache: IndicatorCache,
): { argument: string; evidence: string[] } {
  const evidence: string[] = [];

  if (state.failedDefenses > state.successfulDefenses) {
    evidence.push(`방어 실패 ${state.failedDefenses}회 인정하되, 핵심 근거는 유지`);
  }

  switch (modelId) {
    case "momentum":
      if (cache.priceChange5d !== null) {
        evidence.push(
          `최근 5일 수익률 ${cache.priceChange5d.toFixed(2)}%로 모멘텀 ${cache.priceChange5d > 0 ? "존재" : "약화"} 재확인`,
        );
      }
      break;
    case "meanReversion":
      if (cache.bb !== null && cache.sma20 !== null && cache.sma20 !== 0) {
        const deviation = Math.abs(cache.currentPrice - cache.sma20) / cache.sma20 * 100;
        evidence.push(`20일 이평선 대비 괴리율 ${deviation.toFixed(2)}%로 회귀 논거 재강조`);
      }
      break;
    case "volatility":
      if (cache.atr14 !== null && cache.currentPrice > 0) {
        evidence.push(`ATR/가격 비율 ${((cache.atr14 / cache.currentPrice) * 100).toFixed(2)}%로 변동성 상태 재확인`);
      }
      break;
    case "correlation":
      evidence.push("다중 자산의 동시적 움직임은 단일 자산 분석보다 시장 전체 추세 파악에 유리");
      break;
    case "fundamental":
      evidence.push("거시경제 요인의 영향력은 시간이 지남에 따라 점진적으로 반영됨");
      break;
  }

  return {
    argument: `[${MODEL_LABELS[modelId]} 반박] 신뢰도 ${state.credibilityScore.toFixed(1)}점 기반, 핵심 논점 재주장`,
    evidence,
  };
}

/** 추가 증거 라운드에서 새로운 데이터 포인트 제시 */
function buildAdditionalEvidence(
  modelId: ModelId,
  cache: IndicatorCache,
  data: PriceBar[],
  advancedSignals?: AdvancedSignals | null,
  collectedData?: CollectedData | null,
): { argument: string; evidence: string[] } {
  const evidence: string[] = [];

  switch (modelId) {
    case "momentum": {
      if (cache.priceChange20d !== null) {
        evidence.push(`20일 수익률 ${cache.priceChange20d.toFixed(2)}%로 중기 추세 확인`);
      }
      if (advancedSignals?.hhll) {
        const patternLabel =
          advancedSignals.hhll.pattern === "higher-highs"
            ? "Higher Highs → 상승 구조"
            : advancedSignals.hhll.pattern === "lower-lows"
              ? "Lower Lows → 하락 구조"
              : "혼조";
        evidence.push(`고점/저점 패턴: ${patternLabel}`);
      }
      if (advancedSignals?.parabolicSAR) {
        evidence.push(`Parabolic SAR 추세: ${advancedSignals.parabolicSAR.trend === "상승" ? "상승" : "하락"}`);
      }
      // EMA 다중 기간 교차 확인
      const ema5 = calcEMA(data, 5);
      const ema10 = calcEMA(data, 10);
      if (ema5 !== null && ema10 !== null) {
        evidence.push(`EMA(5)=${ema5.toFixed(2)} vs EMA(10)=${ema10.toFixed(2)} — ${ema5 > ema10 ? "상승" : "하락"} 정렬`);
      }
      break;
    }
    case "meanReversion": {
      if (advancedSignals?.supportResistance) {
        const sr = advancedSignals.supportResistance;
        evidence.push(`지지선: ${sr.support.toFixed(2)}, 저항선: ${sr.resistance.toFixed(2)}`);
        if (sr.nearSupport) evidence.push("지지선 근접 → 반등 가능성");
        if (sr.nearResistance) evidence.push("저항선 근접 → 조정 가능성");
      }
      if (advancedSignals?.cci != null && Math.abs(advancedSignals.cci) > 150) {
        evidence.push(`CCI ${advancedSignals.cci.toFixed(1)}로 극단 영역. 회귀 가능성 추가 근거`);
      }
      // 볼린저 밴드 수축 패턴 확인
      if (cache.bb !== null && cache.bb.width < 0.03) {
        evidence.push(`볼린저 밴드 극도의 수축(${(cache.bb.width * 100).toFixed(1)}%). 방향 전환 임박`);
      }
      break;
    }
    case "volatility": {
      if (advancedSignals?.breakoutProbability) {
        const bpDir =
          advancedSignals.breakoutProbability.direction === "up"
            ? "상방"
            : advancedSignals.breakoutProbability.direction === "down"
              ? "하방"
              : "미정";
        evidence.push(`돌파 확률 ${advancedSignals.breakoutProbability.probability}%, 방향: ${bpDir}`);
      }
      if (advancedSignals?.volumeProfile.volumeSpike) {
        evidence.push("거래량 급등 감지. 변동성 확대 추가 근거");
      }
      // ATR 다중 기간 비교
      const atr7 = calcATR(data, 7);
      const atr21 = calcATR(data, 21);
      if (atr7 !== null && atr21 !== null && atr21 !== 0) {
        const ratio = atr7 / atr21;
        evidence.push(`ATR(7)/ATR(21) 비율 ${ratio.toFixed(2)} — ${ratio > 1.3 ? "변동성 가속" : ratio < 0.7 ? "변동성 수렴" : "안정"}`);
      }
      break;
    }
    case "correlation": {
      if (collectedData?.globalMarketSummary) {
        const g = collectedData.globalMarketSummary;
        evidence.push(`글로벌 시장 동향: 아시아=${g.asiaStatus}, 유럽=${g.europeStatus}, 미국=${g.usStatus}`);
      }
      if (collectedData?.usdKrwTrend) {
        evidence.push(`USD/KRW 추세: ${collectedData.usdKrwTrend}`);
      }
      // 가격 패턴 연속성 확인
      if (cache.priceChange5d !== null && cache.roc12 !== null) {
        if (Math.sign(cache.priceChange5d) === Math.sign(cache.roc12)) {
          evidence.push("5일/12일 가격 변동 방향 일치로 교차자산 영향의 일관성 확인");
        } else {
          evidence.push("5일/12일 가격 변동 방향 불일치. 교차자산 흐름 변화 가능성");
        }
      }
      break;
    }
    case "fundamental": {
      if (collectedData?.newsSentiment && collectedData.newsSentiment.headlines.length > 1) {
        evidence.push(`추가 뉴스: "${collectedData.newsSentiment.headlines[1]}"`);
      }
      if (advancedSignals?.riskRewardRatio !== null && advancedSignals?.riskRewardRatio !== undefined) {
        evidence.push(`리스크/보상 비율 = ${advancedSignals.riskRewardRatio.toFixed(2)}`);
      }
      if (advancedSignals?.trendStrength) {
        evidence.push(`추세 강도 = ${advancedSignals.trendStrength.strength}%, 방향: ${advancedSignals.trendStrength.direction}`);
      }
      // 50일/200일 SMA 관계
      const sma50 = calcSMA(data, 50);
      const sma200 = calcSMA(data, 200);
      if (sma50 !== null && sma200 !== null) {
        evidence.push(`SMA(50) vs SMA(200): ${sma50 > sma200 ? "골든크로스 → 장기 펀더멘털 개선" : "데드크로스 → 장기 펀더멘털 악화"}`);
      }
      break;
    }
  }

  if (evidence.length === 0) {
    evidence.push("추가 데이터 포인트 제한적. 기존 논점 유지");
  }

  return {
    argument: `[${MODEL_LABELS[modelId]} 추가 증거] 새로운 데이터로 기존 주장 보강`,
    evidence,
  };
}

/** 최종 변론에서 핵심 논점 요약 */
function buildClosingArgument(
  modelId: ModelId,
  state: DebaterState,
  rounds: DebateRound[],
): { argument: string; evidence: string[] } {
  const evidence: string[] = [];

  // 토론 성과 요약
  const totalBattles =
    state.successfulAttacks +
    state.failedAttacks +
    state.successfulDefenses +
    state.failedDefenses;
  const wins = state.successfulAttacks + state.successfulDefenses;
  const winRate = totalBattles > 0 ? ((wins / totalBattles) * 100).toFixed(1) : "N/A";

  evidence.push(
    `토론 전적: 공격 ${state.successfulAttacks}승/${state.failedAttacks}패, 방어 ${state.successfulDefenses}승/${state.failedDefenses}패 (승률 ${winRate}%)`,
  );
  evidence.push(`최종 신뢰도: ${state.credibilityScore.toFixed(1)}점`);
  evidence.push(`포지션: ${state.currentPosition} (확신도 ${state.positionConfidence.toFixed(1)}%)`);

  // 이 모델의 핵심 증거 요약
  const myRounds = rounds.filter((r) => r.modelId === modelId && r.evidence.length > 0);
  if (myRounds.length > 0) {
    const bestEvidence = myRounds.flatMap((r) => r.evidence).slice(0, 2);
    evidence.push(`핵심 근거: ${bestEvidence.join("; ")}`);
  }

  return {
    argument: `[${MODEL_LABELS[modelId]} 최종 변론] 방향 '${state.currentPosition}', 신뢰도 ${state.credibilityScore.toFixed(1)}점으로 최종 투표 확정`,
    evidence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 공격 대상 선정
// ═══════════════════════════════════════════════════════════════════════════════

/** 가장 영향력 있는 반대 모델을 공격 대상으로 선정 */
function selectAttackTarget(
  attackerId: ModelId,
  states: Map<ModelId, DebaterState>,
): ModelId {
  const attackerState = states.get(attackerId)!;
  const opponents = ALL_MODEL_IDS.filter((m) => m !== attackerId);

  // 반대 방향의 모델 중 신뢰도가 가장 높은 모델을 타겟 (영향력 극대화)
  const oppositeModels = opponents.filter((m) => {
    const s = states.get(m)!;
    return s.currentPosition !== attackerState.currentPosition && s.currentPosition !== "보합";
  });

  const targetPool = oppositeModels.length > 0 ? oppositeModels : opponents;

  let target = targetPool[0];
  let highestCredibility = 0;
  for (const m of targetPool) {
    const s = states.get(m)!;
    if (s.credibilityScore > highestCredibility) {
      highestCredibility = s.credibilityScore;
      target = m;
    }
  }

  return target;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 합의 도출
// ═══════════════════════════════════════════════════════════════════════════════

/** 토론자 상태에서 최종 합의를 도출한다 */
function buildConsensus(states: Map<ModelId, DebaterState>): {
  direction: Direction;
  confidence: number;
  agreementLevel: AgreementLevel;
} {
  // 신뢰도 가중 투표
  const directionScores: Record<Direction, number> = {
    "상승": 0,
    "하락": 0,
    "보합": 0,
    "변동성확대": 0,
  };
  const directionCounts: Record<Direction, number> = {
    "상승": 0,
    "하락": 0,
    "보합": 0,
    "변동성확대": 0,
  };

  let totalCredibility = 0;

  for (const modelId of ALL_MODEL_IDS) {
    const state = states.get(modelId)!;
    const weight = state.credibilityScore * (state.positionConfidence / 100);
    directionScores[state.currentPosition] += weight;
    directionCounts[state.currentPosition]++;
    totalCredibility += weight;
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

  // 합의 수준 결정
  const winningCount = directionCounts[bestDirection];
  let agreementLevel: AgreementLevel;
  if (winningCount === 5) {
    agreementLevel = "만장일치";
  } else if (winningCount >= 3) {
    agreementLevel = "다수결";
  } else if (winningCount === 2) {
    agreementLevel = "분열";
  } else {
    agreementLevel = "교착";
  }

  // 합의 확신도
  const confidence =
    totalCredibility > 0 ? Math.round((bestScore / totalCredibility) * 100) : 25;

  return {
    direction: bestDirection,
    confidence: Math.min(confidence, 95),
    agreementLevel,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 토론 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 5개 서브모델 간 12라운드 구조화 토론을 수행한다.
 *
 * @param votes - 각 서브모델의 초기 투표 결과
 * @param data - 가격 데이터
 * @param advancedSignals - 고급 분석 시그널 (선택)
 * @param collectedData - 수집된 거시경제 데이터 (선택)
 * @returns 토론 결과
 */
export function runDebate(
  votes: SubModelVotes,
  data: PriceBar[],
  advancedSignals?: AdvancedSignals | null,
  collectedData?: CollectedData | null,
): DebateResult {
  const cache = buildIndicatorCache(data);
  const rounds: DebateRound[] = [];

  // ─── 초기 상태 설정 ─────────────────────────────────────────────────────
  const debaterStates = new Map<ModelId, DebaterState>();
  const voteMap: Record<ModelId, ModelVote> = {
    momentum: votes.momentum,
    meanReversion: votes.meanReversion,
    volatility: votes.volatility,
    correlation: votes.correlation,
    fundamental: votes.fundamental,
  };

  for (const modelId of ALL_MODEL_IDS) {
    const vote = voteMap[modelId];
    debaterStates.set(modelId, {
      modelId,
      credibilityScore: 50 + (vote.confidence / 100) * 30, // 초기 신뢰도: 50~80
      claimsCount: 0,
      successfulAttacks: 0,
      failedAttacks: 0,
      successfulDefenses: 0,
      failedDefenses: 0,
      currentPosition: vote.direction,
      positionConfidence: vote.confidence,
    });
  }

  // ─── 토론 단계 정의 (12라운드, 각 단계 2라운드) ─────────────────────────
  const phases: DebatePhase[] = [
    "주장", "주장",         // 라운드 1-2
    "공격", "공격",         // 라운드 3-4
    "방어", "방어",         // 라운드 5-6
    "반박", "반박",         // 라운드 7-8
    "추가증거", "추가증거", // 라운드 9-10
    "최종변론", "최종변론", // 라운드 11-12
  ];

  // ─── 12라운드 실행 ──────────────────────────────────────────────────────
  for (let roundIdx = 0; roundIdx < 12; roundIdx++) {
    const roundNumber = roundIdx + 1;
    const phase = phases[roundIdx];

    for (const modelId of ALL_MODEL_IDS) {
      const state = debaterStates.get(modelId)!;
      const vote = voteMap[modelId];
      let round: DebateRound;

      switch (phase) {
        // ─── 주장 단계 (라운드 1-2) ──────────────────────────────────
        case "주장": {
          let evidence: string[];
          switch (modelId) {
            case "momentum":
              evidence = buildMomentumClaimEvidence(cache, advancedSignals);
              break;
            case "meanReversion":
              evidence = buildMeanReversionClaimEvidence(cache, advancedSignals);
              break;
            case "volatility":
              evidence = buildVolatilityClaimEvidence(cache, advancedSignals);
              break;
            case "correlation":
              evidence = buildCorrelationClaimEvidence(vote, collectedData);
              break;
            case "fundamental":
              evidence = buildFundamentalClaimEvidence(collectedData, advancedSignals);
              break;
            default:
              evidence = [];
          }
          state.claimsCount++;

          round = {
            roundNumber,
            phase,
            modelId,
            argument: `[${MODEL_LABELS[modelId]} 주장] 방향: ${vote.direction}, 확신도: ${vote.confidence}%. ${vote.rationale}`,
            evidence,
          };
          break;
        }

        // ─── 공격 단계 (라운드 3-4) ──────────────────────────────────
        case "공격": {
          const targetId = selectAttackTarget(modelId, debaterStates);
          let attack: AttackResult;

          switch (modelId) {
            case "momentum":
              attack = buildMomentumAttack(targetId, cache, advancedSignals);
              break;
            case "meanReversion":
              attack = buildMeanReversionAttack(targetId, cache, advancedSignals);
              break;
            case "volatility":
              attack = buildVolatilityAttack(targetId, cache, advancedSignals);
              break;
            case "correlation":
              attack = buildCorrelationAttack(targetId, cache, collectedData);
              break;
            case "fundamental":
              attack = buildFundamentalAttack(targetId, cache, collectedData, advancedSignals);
              break;
            default:
              attack = { argument: "", evidence: [], strength: 30 };
          }

          round = {
            roundNumber,
            phase,
            modelId,
            argument: attack.argument,
            evidence: attack.evidence,
            targetModel: targetId,
            attackStrength: attack.strength,
          };
          break;
        }

        // ─── 방어 단계 (라운드 5-6) ──────────────────────────────────
        case "방어": {
          // 이 모델을 공격한 라운드 찾기
          const attacksOnMe = rounds.filter(
            (r) => r.phase === "공격" && r.targetModel === modelId,
          );

          if (attacksOnMe.length > 0) {
            // 가장 강한 공격에 대해 방어
            const strongestAttack = attacksOnMe.reduce((a, b) =>
              (b.attackStrength ?? 0) > (a.attackStrength ?? 0) ? b : a,
            );

            const defense = buildDefense(
              modelId,
              strongestAttack.attackStrength ?? 50,
              cache,
              advancedSignals,
              collectedData,
            );

            // 방어자 신뢰도 조정
            if (defense.success) {
              state.successfulDefenses++;
              state.credibilityScore = Math.min(100, state.credibilityScore + 5);
            } else {
              state.failedDefenses++;
              state.credibilityScore = Math.max(10, state.credibilityScore - 7);
              state.positionConfidence = Math.max(10, state.positionConfidence - 5);
            }

            // 공격자 신뢰도 조정
            const attackerState = debaterStates.get(strongestAttack.modelId)!;
            if (defense.success) {
              attackerState.failedAttacks++;
              attackerState.credibilityScore = Math.max(10, attackerState.credibilityScore - 3);
            } else {
              attackerState.successfulAttacks++;
              attackerState.credibilityScore = Math.min(100, attackerState.credibilityScore + 5);
            }

            round = {
              roundNumber,
              phase,
              modelId,
              argument: defense.argument,
              evidence: defense.evidence,
              targetModel: strongestAttack.modelId,
              defenseSuccess: defense.success,
            };
          } else {
            // 공격을 받지 않은 경우
            round = {
              roundNumber,
              phase,
              modelId,
              argument: `[${MODEL_LABELS[modelId]} 방어] 공격 없음. 기존 포지션 유지`,
              evidence: ["공격 미수신. 주장 유효성 유지"],
              defenseSuccess: true,
            };
            state.successfulDefenses++;
          }
          break;
        }

        // ─── 반박 단계 (라운드 7-8) ──────────────────────────────────
        case "반박": {
          const rebuttal = buildRebuttal(modelId, state, cache);
          round = {
            roundNumber,
            phase,
            modelId,
            argument: rebuttal.argument,
            evidence: rebuttal.evidence,
          };
          break;
        }

        // ─── 추가증거 단계 (라운드 9-10) ─────────────────────────────
        case "추가증거": {
          const additional = buildAdditionalEvidence(
            modelId,
            cache,
            data,
            advancedSignals,
            collectedData,
          );
          round = {
            roundNumber,
            phase,
            modelId,
            argument: additional.argument,
            evidence: additional.evidence,
          };
          // 추가 증거 품질에 따라 신뢰도 소폭 보강
          if (additional.evidence.length >= 3) {
            state.credibilityScore = Math.min(100, state.credibilityScore + 3);
          }
          break;
        }

        // ─── 최종변론 단계 (라운드 11-12) ────────────────────────────
        case "최종변론": {
          const closing = buildClosingArgument(modelId, state, rounds);
          round = {
            roundNumber,
            phase,
            modelId,
            argument: closing.argument,
            evidence: closing.evidence,
          };
          break;
        }

        default:
          round = {
            roundNumber,
            phase,
            modelId,
            argument: "",
            evidence: [],
          };
      }

      rounds.push(round);
    }
  }

  // ─── 합의 도출 ─────────────────────────────────────────────────────────
  const consensus = buildConsensus(debaterStates);

  // ─── 핵심 논점 및 갈등 정리 ────────────────────────────────────────────
  const keyArguments: string[] = [];
  const resolvedConflicts: string[] = [];
  const unresolvedConflicts: string[] = [];

  // 신뢰도 상위 3개 모델의 최종 변론을 핵심 논점으로
  const sortedByCredibility = ALL_MODEL_IDS
    .map((m) => ({ id: m, state: debaterStates.get(m)! }))
    .sort((a, b) => b.state.credibilityScore - a.state.credibilityScore);

  for (const { id, state } of sortedByCredibility.slice(0, 3)) {
    keyArguments.push(
      `${MODEL_LABELS[id]}: ${state.currentPosition} (신뢰도 ${state.credibilityScore.toFixed(1)}, 확신도 ${state.positionConfidence.toFixed(1)}%)`,
    );
  }

  // 갈등 분석: 서로 다른 방향을 주장하는 모델 쌍
  const positions = new Map<Direction, ModelId[]>();
  for (const modelId of ALL_MODEL_IDS) {
    const dir = debaterStates.get(modelId)!.currentPosition;
    if (!positions.has(dir)) positions.set(dir, []);
    positions.get(dir)!.push(modelId);
  }

  const positionKeys = Array.from(positions.keys());
  if (positionKeys.length === 1) {
    resolvedConflicts.push("모든 모델이 동일 방향으로 수렴. 갈등 없음");
  } else {
    for (const dir of positionKeys) {
      const models = positions.get(dir)!;
      if (dir !== consensus.direction && models.length > 0) {
        const modelNames = models.map((m) => MODEL_LABELS[m]).join(", ");
        if (models.length === 1) {
          resolvedConflicts.push(`${modelNames}의 '${dir}' 주장은 다수결로 기각됨`);
        } else {
          unresolvedConflicts.push(
            `${modelNames}이(가) '${dir}' 주장. 합의 방향 '${consensus.direction}'과 충돌 지속`,
          );
        }
      }
    }
  }

  // 성공적인 강력 공격에서 해결된 갈등 도출
  const strongAttackRounds = rounds.filter(
    (r) => r.phase === "공격" && r.attackStrength !== undefined && r.attackStrength > 70,
  );
  for (const atk of strongAttackRounds.slice(0, 3)) {
    if (atk.targetModel) {
      const targetState = debaterStates.get(atk.targetModel)!;
      if (targetState.credibilityScore < 40) {
        resolvedConflicts.push(
          `${MODEL_LABELS[atk.modelId]}의 공격으로 ${MODEL_LABELS[atk.targetModel]}의 신뢰도 약화 (${targetState.credibilityScore.toFixed(1)}점)`,
        );
      }
    }
  }

  return {
    rounds,
    debaterStates,
    consensus,
    keyArguments,
    resolvedConflicts,
    unresolvedConflicts,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 토론 실패 학습
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 토론 결과와 실제 방향을 비교하여 학습 데이터를 생성한다.
 * 각 모델의 예측 정확도를 평가하고, 신뢰도 가중치 조정을 제안한다.
 *
 * @param debateResult - 토론 결과
 * @param actualDirection - 실제 가격 방향
 * @returns 학습 결과 (가중치 조정 제안 포함)
 */
export function learnFromDebateFailure(
  debateResult: DebateResult,
  actualDirection: Direction,
): DebateLearningResult {
  const wasCorrect = debateResult.consensus.direction === actualDirection;

  const modelAccuracy = {} as Record<ModelId, { predicted: Direction; wasCorrect: boolean }>;
  const credibilityAdjustments = {} as Record<ModelId, number>;
  const suggestedWeightChanges = {} as Record<ModelId, number>;
  const lessonsLearned: string[] = [];

  const correctModels: ModelId[] = [];
  const incorrectModels: ModelId[] = [];

  // 각 모델별 정확도 평가
  for (const modelId of ALL_MODEL_IDS) {
    const state = debateResult.debaterStates.get(modelId)!;
    const predicted = state.currentPosition;
    const correct = predicted === actualDirection;

    modelAccuracy[modelId] = { predicted, wasCorrect: correct };

    if (correct) {
      correctModels.push(modelId);
      // 정확한 모델은 신뢰도 보너스 + 가중치 상향
      credibilityAdjustments[modelId] = Math.min(15, 5 + state.positionConfidence / 20);
      suggestedWeightChanges[modelId] = 1.0 + state.positionConfidence / 500; // 최대 1.2배
    } else {
      incorrectModels.push(modelId);
      // 부정확한 모델: 높은 확신으로 틀리면 큰 패널티
      const penalty = state.positionConfidence > 70 ? -15 : -8;
      credibilityAdjustments[modelId] = penalty;
      suggestedWeightChanges[modelId] = Math.max(0.7, 1.0 - state.positionConfidence / 400);
    }
  }

  // ─── 교훈 도출 ─────────────────────────────────────────────────────────
  if (!wasCorrect) {
    lessonsLearned.push(
      `합의 방향 '${debateResult.consensus.direction}'이 실제 방향 '${actualDirection}'과 불일치`,
    );

    // 합의 수준별 교훈
    if (debateResult.consensus.agreementLevel === "만장일치") {
      lessonsLearned.push(
        "경고: 만장일치 합의가 틀렸음. 모든 모델이 동일한 편향에 빠졌을 가능성. 역발상 점검 필요",
      );
    } else if (
      debateResult.consensus.agreementLevel === "분열" ||
      debateResult.consensus.agreementLevel === "교착"
    ) {
      lessonsLearned.push(
        "분열/교착 상태에서의 예측은 신뢰도가 낮음. 이런 경우 포지션 축소 또는 관망 고려",
      );
    }

    // 정확했던 모델 분석
    if (correctModels.length > 0) {
      const correctNames = correctModels.map((m) => MODEL_LABELS[m]).join(", ");
      lessonsLearned.push(`정확한 모델: ${correctNames}. 이들의 가중치 상향 권장`);

      // 정확한 모델이 토론에서 저평가되었는지 확인
      for (const m of correctModels) {
        const state = debateResult.debaterStates.get(m)!;
        if (state.credibilityScore < 40) {
          lessonsLearned.push(
            `${MODEL_LABELS[m]} 모델이 정확했으나 토론에서 신뢰도가 낮게 평가됨 (${state.credibilityScore.toFixed(1)}점). 토론 메커니즘 편향 점검 필요`,
          );
        }
      }
    }

    // 고확신으로 틀린 모델 분석
    for (const m of incorrectModels) {
      const state = debateResult.debaterStates.get(m)!;
      if (state.positionConfidence > 70) {
        lessonsLearned.push(
          `${MODEL_LABELS[m]} 모델이 높은 확신(${state.positionConfidence.toFixed(1)}%)으로 오판. 과잉 확신 보정 필요`,
        );
      }
    }

    // 미해결 갈등에서의 교훈
    if (debateResult.unresolvedConflicts.length > 0) {
      lessonsLearned.push(
        `미해결 갈등 ${debateResult.unresolvedConflicts.length}건이 정확한 시그널을 포함했을 가능성. 소수 의견 가중치 재검토`,
      );
    }
  } else {
    lessonsLearned.push(
      `합의 방향 '${debateResult.consensus.direction}'이 정확. 합의 수준: ${debateResult.consensus.agreementLevel}`,
    );

    // 틀린 모델에 대한 교훈
    if (incorrectModels.length > 0) {
      const incorrectNames = incorrectModels.map((m) => MODEL_LABELS[m]).join(", ");
      lessonsLearned.push(
        `오판 모델: ${incorrectNames}. 이들의 반대 의견이 합의에 의해 올바르게 기각됨`,
      );
    }

    // 확신도와 결과의 관계
    if (debateResult.consensus.confidence > 80) {
      lessonsLearned.push("높은 합의 확신도가 정확한 결과로 이어짐. 현재 토론 프로세스 유효");
    } else if (debateResult.consensus.confidence < 50) {
      lessonsLearned.push("낮은 합의 확신도에도 정확한 결과. 확신도 산출 방식 보정 고려");
    }
  }

  return {
    originalPrediction: debateResult.consensus.direction,
    actualDirection,
    wasCorrect,
    modelAccuracy,
    credibilityAdjustments,
    lessonsLearned,
    suggestedWeightChanges,
  };
}
