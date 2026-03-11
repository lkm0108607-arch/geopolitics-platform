/**
 * 역사적 패턴 분석 모듈
 *
 * 과거 시장 데이터로부터 패턴을 추출하고, 현재 상황과 비교하여
 * AI 예측 정확도를 향상시킨다.
 *
 * 5단계 타임프레임:
 *   초단기 (1-3일)  | 단기 (5-10일) | 중기 (20-30일) | 중장기 (40-60일) | 장기 (60-90일)
 *
 * 각 타임프레임마다 독립적으로 패턴을 분석하고,
 * 서브모델별 신뢰도를 평가한 뒤 종합한다.
 *
 * 호재/악재 팩터 분석:
 *   과거에 어떤 거시경제/기술적 요소가 호재·악재로 작용했는지 분류하고,
 *   현재에도 동일한 방향으로 작용하는지 검토한다.
 */

import type { PriceBar } from "./indicators";
import {
  calcSMA,
  calcEMA,
  calcRSI,
  calcMACD,
  calcBollingerBands,
  calcATR,
  calcROC,
} from "./indicators";
import { supabase } from "@/lib/supabase";
import type { CollectedData } from "./dataCollector";

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type MarketRegime =
  | "강한_상승추세"
  | "약한_상승추세"
  | "횡보"
  | "약한_하락추세"
  | "강한_하락추세"
  | "고변동성"
  | "위기";

export type Timeframe = "초단기" | "단기" | "중기" | "중장기" | "장기";

/** 호재/악재 팩터 */
export interface CatalystFactor {
  name: string; // 팩터 이름 (예: "VIX 급등", "달러 강세")
  type: "호재" | "악재" | "중립"; // 과거 분류
  historicalImpact: number; // 과거 영향력 (-100 ~ +100, 양수=호재)
  currentlyActive: boolean; // 현재도 활성 상태인지
  currentEffect: "호재" | "악재" | "중립" | "변화"; // 현재 동일하게 작용하는지
  description: string; // 한국어 설명
  confidence: number; // 판단 신뢰도 0-100
}

/** 개별 타임프레임 분석 결과 */
export interface TimeframeAnalysis {
  timeframe: Timeframe;
  lookbackDays: number;
  regime: MarketRegime;
  regimeConfidence: number;

  fingerprint: IndicatorFingerprint;

  similarPeriods: {
    count: number;
    avgReturnAfter: number;
    winRate: number;
    direction: "상승" | "하락" | "보합";
  };

  patterns: PatternSignal[];

  // 해당 타임프레임에서의 호재/악재 팩터
  catalysts: CatalystFactor[];

  modelReliability: {
    momentum: number;
    meanReversion: number;
    volatility: number;
    correlation: number;
    fundamental: number;
  };
}

/** 기술적 지표 핑거프린트 */
export interface IndicatorFingerprint {
  rsi: number | null;
  macdHistogram: number | null;
  bbPercentB: number | null;
  atrRatio: number | null;
  smaCrossRatio: number | null;
  roc5: number | null;
  roc12: number | null;
  priceVsSMA20: number | null;
}

export interface PatternSignal {
  name: string;
  description: string;
  historicalAccuracy: number;
  currentSignal: "상승" | "하락" | "보합";
  confidence: number;
  timeframe: Timeframe;
}

/** 최종 종합 결과 */
export interface HistoricalPatternResult {
  regime: MarketRegime;
  regimeConfidence: number;

  timeframeAnalyses: TimeframeAnalysis[];

  historicalBias: {
    direction: "상승" | "하락" | "보합";
    strength: number;
    similarPeriodCount: number;
    avgReturnAfter: number;
    winRate: number;
  };

  // 호재/악재 종합 분석
  catalystSummary: {
    bullishFactors: CatalystFactor[];
    bearishFactors: CatalystFactor[];
    changedFactors: CatalystFactor[]; // 과거와 현재 방향이 다른 팩터
    netCatalystScore: number; // -100 ~ +100
  };

  modelReliability: {
    momentum: number;
    meanReversion: number;
    volatility: number;
    correlation: number;
    fundamental: number;
  };

  suggestedWeightAdjustment: {
    momentum: number;
    meanReversion: number;
    volatility: number;
    correlation: number;
    fundamental: number;
  };

  patterns: PatternSignal[];
  rationale: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 타임프레임 설정
// ═══════════════════════════════════════════════════════════════════════════════

interface TimeframeConfig {
  name: Timeframe;
  lookback: number;
  forecastHorizon: number;
  weight: number;
}

const TIMEFRAME_CONFIGS: TimeframeConfig[] = [
  { name: "초단기", lookback: 3, forecastHorizon: 1, weight: 0.10 },
  { name: "단기", lookback: 10, forecastHorizon: 3, weight: 0.20 },
  { name: "중기", lookback: 30, forecastHorizon: 5, weight: 0.30 },
  { name: "중장기", lookback: 60, forecastHorizon: 10, weight: 0.25 },
  { name: "장기", lookback: 90, forecastHorizon: 20, weight: 0.15 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 헬퍼
// ═══════════════════════════════════════════════════════════════════════════════

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** 두 핑거프린트 간 유사도 (0-1) */
function fingerprintSimilarity(a: IndicatorFingerprint, b: IndicatorFingerprint): number {
  const pairs: [number | null, number | null, number][] = [
    [a.rsi, b.rsi, 100],
    [a.macdHistogram, b.macdHistogram, 5],
    [a.bbPercentB, b.bbPercentB, 1.5],
    [a.atrRatio, b.atrRatio, 3],
    [a.smaCrossRatio, b.smaCrossRatio, 0.15],
    [a.roc5, b.roc5, 15],
    [a.roc12, b.roc12, 25],
    [a.priceVsSMA20, b.priceVsSMA20, 0.15],
  ];

  let totalW = 0;
  let wSim = 0;
  for (const [va, vb, range] of pairs) {
    if (va == null || vb == null) continue;
    const diff = Math.abs(va - vb) / range;
    wSim += Math.max(0, 1 - diff);
    totalW += 1;
  }
  return totalW === 0 ? 0 : wSim / totalW;
}

/** 핑거프린트 계산 */
function calcFingerprint(data: PriceBar[]): IndicatorFingerprint {
  if (data.length < 5) {
    return { rsi: null, macdHistogram: null, bbPercentB: null, atrRatio: null, smaCrossRatio: null, roc5: null, roc12: null, priceVsSMA20: null };
  }
  const rsi = calcRSI(data);
  const macd = calcMACD(data);
  const bb = calcBollingerBands(data);
  const atr14 = calcATR(data, 14);
  const atr5 = calcATR(data, 5);
  const sma10 = calcSMA(data, 10);
  const sma50 = calcSMA(data, Math.min(50, data.length));
  const sma20 = calcSMA(data, 20);
  const roc5 = calcROC(data, 5);
  const roc12 = calcROC(data, 12);
  const price = data[data.length - 1].close;

  return {
    rsi,
    macdHistogram: macd?.histogram ?? null,
    bbPercentB: bb?.percentB ?? null,
    atrRatio: atr14 && atr5 && atr14 !== 0 ? atr5 / atr14 : null,
    smaCrossRatio: sma10 && sma50 && sma50 !== 0 ? (sma10 - sma50) / sma50 : null,
    roc5,
    roc12,
    priceVsSMA20: sma20 && sma20 !== 0 ? (price - sma20) / sma20 : null,
  };
}

/** 레짐 판별 */
function detectRegime(data: PriceBar[], vix?: number): { regime: MarketRegime; confidence: number } {
  if (data.length < 5) return { regime: "횡보", confidence: 30 };

  if (vix != null && vix > 35) {
    return { regime: "위기", confidence: clamp(50 + (vix - 35) * 2, 60, 95) };
  }

  const rsi = calcRSI(data) ?? 50;
  const atr14 = calcATR(data, 14);
  const atr5 = calcATR(data, 5);
  const roc = calcROC(data, Math.min(12, data.length - 1)) ?? 0;
  const sma10 = calcSMA(data, Math.min(10, data.length));
  const sma50 = calcSMA(data, Math.min(50, data.length));

  const atrRatio = atr14 && atr5 && atr14 !== 0 ? atr5 / atr14 : 1;
  if (atrRatio > 2.0 || (vix != null && vix > 28)) {
    return { regime: "고변동성", confidence: clamp(50 + (atrRatio - 1.5) * 30, 55, 90) };
  }

  const smaCross = sma10 && sma50 && sma50 !== 0 ? (sma10 - sma50) / sma50 : 0;
  let score = 0;
  if (smaCross > 0.03) score += 2; else if (smaCross > 0.01) score += 1;
  else if (smaCross < -0.03) score -= 2; else if (smaCross < -0.01) score -= 1;
  if (rsi > 60) score += 1; else if (rsi < 40) score -= 1;
  if (roc > 5) score += 2; else if (roc > 2) score += 1;
  else if (roc < -5) score -= 2; else if (roc < -2) score -= 1;

  const abs = Math.abs(score);
  if (score >= 4) return { regime: "강한_상승추세", confidence: clamp(60 + abs * 5, 65, 95) };
  if (score >= 2) return { regime: "약한_상승추세", confidence: clamp(50 + abs * 5, 55, 80) };
  if (score <= -4) return { regime: "강한_하락추세", confidence: clamp(60 + abs * 5, 65, 95) };
  if (score <= -2) return { regime: "약한_하락추세", confidence: clamp(50 + abs * 5, 55, 80) };
  return { regime: "횡보", confidence: clamp(40 + (3 - abs) * 10, 40, 70) };
}

/** 레짐별 서브모델 기본 신뢰도 */
function regimeModelReliability(regime: MarketRegime): Record<string, number> {
  const map: Record<MarketRegime, Record<string, number>> = {
    "강한_상승추세": { momentum: 90, meanReversion: 40, volatility: 50, correlation: 70, fundamental: 65 },
    "약한_상승추세": { momentum: 75, meanReversion: 55, volatility: 55, correlation: 65, fundamental: 70 },
    "횡보": { momentum: 40, meanReversion: 85, volatility: 60, correlation: 55, fundamental: 60 },
    "약한_하락추세": { momentum: 70, meanReversion: 55, volatility: 60, correlation: 65, fundamental: 70 },
    "강한_하락추세": { momentum: 85, meanReversion: 45, volatility: 55, correlation: 75, fundamental: 70 },
    "고변동성": { momentum: 50, meanReversion: 60, volatility: 90, correlation: 60, fundamental: 55 },
    "위기": { momentum: 55, meanReversion: 50, volatility: 85, correlation: 80, fundamental: 75 },
  };
  return map[regime] ?? { momentum: 60, meanReversion: 60, volatility: 60, correlation: 60, fundamental: 60 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 호재/악재 팩터 분석
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 과거 데이터에서 어떤 조건이 호재/악재로 작용했는지 분석하고,
 * 현재도 동일하게 작용하는지 검토한다.
 *
 * 각 팩터를 과거 구간에서 측정 → 이후 수익률과의 상관 → 호재/악재 분류
 * 현재 동일 팩터의 상태를 측정 → 여전히 같은 방향인지 판단
 */
function analyzeCatalysts(
  data: PriceBar[],
  tf: Timeframe,
  lookback: number,
  collectedData: CollectedData | null,
): CatalystFactor[] {
  const catalysts: CatalystFactor[] = [];
  if (data.length < 30) return catalysts;

  const currentSlice = data.slice(-lookback);
  const currentFP = calcFingerprint(currentSlice);

  // ── 팩터 1: RSI 수준 ──
  // 과거 패턴: RSI < 30 → 이후 상승 (호재), RSI > 70 → 이후 하락 (악재)
  {
    const historicalRSIs: { rsi: number; futureReturn: number }[] = [];
    const step = Math.max(1, Math.floor(lookback / 3));
    for (let i = lookback; i < data.length - lookback; i += step) {
      const slice = data.slice(i - lookback, i);
      const rsi = calcRSI(slice);
      if (rsi == null) continue;
      const futurePrice = data[Math.min(i + 5, data.length - 1)].close;
      const currentPrice = data[i - 1].close;
      if (currentPrice === 0) continue;
      historicalRSIs.push({ rsi, futureReturn: ((futurePrice - currentPrice) / currentPrice) * 100 });
    }

    // RSI 과매도 → 호재 패턴 검증
    const oversold = historicalRSIs.filter((r) => r.rsi < 30);
    if (oversold.length >= 3) {
      const avgRet = oversold.reduce((s, r) => s + r.futureReturn, 0) / oversold.length;
      const wasPositive = avgRet > 0;
      const currentRSI = currentFP.rsi;
      const isActiveNow = currentRSI != null && currentRSI < 30;

      catalysts.push({
        name: "RSI 과매도 반등",
        type: wasPositive ? "호재" : "악재",
        historicalImpact: Math.round(avgRet * 10),
        currentlyActive: isActiveNow,
        currentEffect: isActiveNow ? (wasPositive ? "호재" : "악재") : "중립",
        description: `${tf} 관점: 과거 RSI<30 구간 ${oversold.length}회 발생, 이후 평균 수익률 ${avgRet > 0 ? "+" : ""}${avgRet.toFixed(1)}%. ${isActiveNow ? "현재 RSI " + (currentRSI?.toFixed(0) ?? "") + "로 활성" : "현재 비활성"}`,
        confidence: clamp(40 + oversold.length * 5, 40, 85),
      });
    }

    // RSI 과매수 → 악재 패턴 검증
    const overbought = historicalRSIs.filter((r) => r.rsi > 70);
    if (overbought.length >= 3) {
      const avgRet = overbought.reduce((s, r) => s + r.futureReturn, 0) / overbought.length;
      const wasNegative = avgRet < 0;
      const currentRSI = currentFP.rsi;
      const isActiveNow = currentRSI != null && currentRSI > 70;

      catalysts.push({
        name: "RSI 과매수 조정",
        type: wasNegative ? "악재" : "호재",
        historicalImpact: Math.round(avgRet * 10),
        currentlyActive: isActiveNow,
        currentEffect: isActiveNow ? (wasNegative ? "악재" : "호재") : "중립",
        description: `${tf} 관점: 과거 RSI>70 구간 ${overbought.length}회, 이후 평균 ${avgRet > 0 ? "+" : ""}${avgRet.toFixed(1)}%. ${isActiveNow ? "현재 활성" : "현재 비활성"}`,
        confidence: clamp(40 + overbought.length * 5, 40, 85),
      });
    }
  }

  // ── 팩터 2: 볼린저 밴드 이탈 ──
  {
    const bbBreaches: { above: boolean; futureReturn: number }[] = [];
    const step = Math.max(1, Math.floor(lookback / 3));
    for (let i = lookback; i < data.length - lookback; i += step) {
      const slice = data.slice(i - lookback, i);
      const bb = calcBollingerBands(slice);
      if (bb == null) continue;
      const futurePrice = data[Math.min(i + 5, data.length - 1)].close;
      const currentPrice = data[i - 1].close;
      if (currentPrice === 0) continue;
      const ret = ((futurePrice - currentPrice) / currentPrice) * 100;
      if (bb.percentB > 1.0) bbBreaches.push({ above: true, futureReturn: ret });
      else if (bb.percentB < 0.0) bbBreaches.push({ above: false, futureReturn: ret });
    }

    const upperBreaches = bbBreaches.filter((b) => b.above);
    const lowerBreaches = bbBreaches.filter((b) => !b.above);

    if (upperBreaches.length >= 2) {
      const avgRet = upperBreaches.reduce((s, b) => s + b.futureReturn, 0) / upperBreaches.length;
      const currentBB = currentFP.bbPercentB;
      const active = currentBB != null && currentBB > 1.0;
      catalysts.push({
        name: "볼린저 상단 돌파",
        type: avgRet < 0 ? "악재" : "호재",
        historicalImpact: Math.round(avgRet * 10),
        currentlyActive: active,
        currentEffect: active ? (avgRet < 0 ? "악재" : "호재") : "중립",
        description: `${tf}: 과거 BB 상단 돌파 ${upperBreaches.length}회, 이후 평균 ${avgRet > 0 ? "+" : ""}${avgRet.toFixed(1)}%. ${active ? "현재 활성" : "비활성"}`,
        confidence: clamp(35 + upperBreaches.length * 8, 35, 80),
      });
    }

    if (lowerBreaches.length >= 2) {
      const avgRet = lowerBreaches.reduce((s, b) => s + b.futureReturn, 0) / lowerBreaches.length;
      const currentBB = currentFP.bbPercentB;
      const active = currentBB != null && currentBB < 0.0;
      catalysts.push({
        name: "볼린저 하단 이탈",
        type: avgRet > 0 ? "호재" : "악재",
        historicalImpact: Math.round(avgRet * 10),
        currentlyActive: active,
        currentEffect: active ? (avgRet > 0 ? "호재" : "악재") : "중립",
        description: `${tf}: 과거 BB 하단 이탈 ${lowerBreaches.length}회, 이후 평균 ${avgRet > 0 ? "+" : ""}${avgRet.toFixed(1)}%. ${active ? "현재 활성" : "비활성"}`,
        confidence: clamp(35 + lowerBreaches.length * 8, 35, 80),
      });
    }
  }

  // ── 팩터 3: 변동성 급변 ──
  {
    const volEvents: { expanded: boolean; futureReturn: number }[] = [];
    const step = Math.max(1, Math.floor(lookback / 3));
    for (let i = Math.max(lookback, 15); i < data.length - lookback; i += step) {
      const slice = data.slice(i - lookback, i);
      const atr14 = calcATR(slice, 14);
      const atr5 = calcATR(slice, 5);
      if (atr14 == null || atr5 == null || atr14 === 0) continue;
      const ratio = atr5 / atr14;
      const futurePrice = data[Math.min(i + 5, data.length - 1)].close;
      const curPrice = data[i - 1].close;
      if (curPrice === 0) continue;
      const ret = ((futurePrice - curPrice) / curPrice) * 100;
      if (ratio > 1.8) volEvents.push({ expanded: true, futureReturn: ret });
      else if (ratio < 0.5) volEvents.push({ expanded: false, futureReturn: ret });
    }

    const expanded = volEvents.filter((v) => v.expanded);
    if (expanded.length >= 2) {
      const avgRet = expanded.reduce((s, v) => s + v.futureReturn, 0) / expanded.length;
      const curATRRatio = currentFP.atrRatio;
      const active = curATRRatio != null && curATRRatio > 1.8;
      catalysts.push({
        name: "변동성 급확대",
        type: avgRet < -1 ? "악재" : avgRet > 1 ? "호재" : "중립",
        historicalImpact: Math.round(avgRet * 10),
        currentlyActive: active,
        currentEffect: active ? (avgRet < -1 ? "악재" : avgRet > 1 ? "호재" : "중립") : "중립",
        description: `${tf}: 과거 ATR비율>1.8 ${expanded.length}회, 이후 평균 ${avgRet > 0 ? "+" : ""}${avgRet.toFixed(1)}%. ${active ? "현재 활성" : "비활성"}`,
        confidence: clamp(30 + expanded.length * 7, 30, 75),
      });
    }

    const contracted = volEvents.filter((v) => !v.expanded);
    if (contracted.length >= 2) {
      const avgRet = contracted.reduce((s, v) => s + v.futureReturn, 0) / contracted.length;
      const curATRRatio = currentFP.atrRatio;
      const active = curATRRatio != null && curATRRatio < 0.5;
      catalysts.push({
        name: "변동성 극수축 (돌파 임박)",
        type: "중립",
        historicalImpact: Math.round(avgRet * 10),
        currentlyActive: active,
        currentEffect: active ? "중립" : "중립",
        description: `${tf}: 과거 ATR비율<0.5 ${contracted.length}회 (수축 후 큰 움직임), 이후 평균 ${avgRet > 0 ? "+" : ""}${avgRet.toFixed(1)}%. ${active ? "현재 활성 — 돌파 대비 필요" : "비활성"}`,
        confidence: clamp(30 + contracted.length * 7, 30, 75),
      });
    }
  }

  // ── 팩터 4: 이동평균 골든/데드크로스 ──
  {
    const crossEvents: { golden: boolean; futureReturn: number }[] = [];
    const step = Math.max(1, Math.floor(lookback / 2));
    for (let i = Math.max(lookback, 50); i < data.length - 10; i += step) {
      const prevSlice = data.slice(i - lookback - 1, i - 1);
      const currSlice = data.slice(i - lookback, i);
      const prevSMA10 = calcSMA(prevSlice, 10);
      const prevSMA50 = calcSMA(prevSlice, Math.min(50, prevSlice.length));
      const currSMA10 = calcSMA(currSlice, 10);
      const currSMA50 = calcSMA(currSlice, Math.min(50, currSlice.length));
      if (prevSMA10 == null || prevSMA50 == null || currSMA10 == null || currSMA50 == null) continue;

      const futurePrice = data[Math.min(i + 10, data.length - 1)].close;
      const curPrice = data[i - 1].close;
      if (curPrice === 0) continue;
      const ret = ((futurePrice - curPrice) / curPrice) * 100;

      if (prevSMA10 < prevSMA50 && currSMA10 > currSMA50) {
        crossEvents.push({ golden: true, futureReturn: ret });
      } else if (prevSMA10 > prevSMA50 && currSMA10 < currSMA50) {
        crossEvents.push({ golden: false, futureReturn: ret });
      }
    }

    const goldenCrosses = crossEvents.filter((c) => c.golden);
    if (goldenCrosses.length >= 1) {
      const avgRet = goldenCrosses.reduce((s, c) => s + c.futureReturn, 0) / goldenCrosses.length;
      const curCross = currentFP.smaCrossRatio;
      const active = curCross != null && curCross > 0 && curCross < 0.02;
      catalysts.push({
        name: "골든크로스",
        type: avgRet > 0 ? "호재" : "악재",
        historicalImpact: Math.round(avgRet * 10),
        currentlyActive: active,
        currentEffect: active ? (avgRet > 0 ? "호재" : "변화") : "중립",
        description: `${tf}: 과거 골든크로스 ${goldenCrosses.length}회, 이후 평균 ${avgRet > 0 ? "+" : ""}${avgRet.toFixed(1)}%. ${active ? "현재 초기 골든크로스 감지" : "비활성"}`,
        confidence: clamp(40 + goldenCrosses.length * 10, 40, 80),
      });
    }

    const deadCrosses = crossEvents.filter((c) => !c.golden);
    if (deadCrosses.length >= 1) {
      const avgRet = deadCrosses.reduce((s, c) => s + c.futureReturn, 0) / deadCrosses.length;
      const curCross = currentFP.smaCrossRatio;
      const active = curCross != null && curCross < 0 && curCross > -0.02;
      catalysts.push({
        name: "데드크로스",
        type: avgRet < 0 ? "악재" : "호재",
        historicalImpact: Math.round(avgRet * 10),
        currentlyActive: active,
        currentEffect: active ? (avgRet < 0 ? "악재" : "변화") : "중립",
        description: `${tf}: 과거 데드크로스 ${deadCrosses.length}회, 이후 평균 ${avgRet > 0 ? "+" : ""}${avgRet.toFixed(1)}%. ${active ? "현재 초기 데드크로스 감지" : "비활성"}`,
        confidence: clamp(40 + deadCrosses.length * 10, 40, 80),
      });
    }
  }

  // ── 팩터 5: 모멘텀 가속 ──
  {
    const momEvents: { strong: boolean; futureReturn: number }[] = [];
    const step = Math.max(1, Math.floor(lookback / 3));
    for (let i = lookback; i < data.length - lookback; i += step) {
      const slice = data.slice(i - lookback, i);
      const roc = calcROC(slice, Math.min(12, slice.length - 1));
      if (roc == null) continue;
      const futurePrice = data[Math.min(i + 5, data.length - 1)].close;
      const curPrice = data[i - 1].close;
      if (curPrice === 0) continue;
      const ret = ((futurePrice - curPrice) / curPrice) * 100;
      if (roc > 5) momEvents.push({ strong: true, futureReturn: ret });
      else if (roc < -5) momEvents.push({ strong: false, futureReturn: ret });
    }

    const strongUp = momEvents.filter((m) => m.strong);
    if (strongUp.length >= 2) {
      const avgRet = strongUp.reduce((s, m) => s + m.futureReturn, 0) / strongUp.length;
      const curROC = currentFP.roc12;
      const active = curROC != null && curROC > 5;
      catalysts.push({
        name: "강한 상승 모멘텀",
        type: avgRet > 0 ? "호재" : "악재",
        historicalImpact: Math.round(avgRet * 10),
        currentlyActive: active,
        currentEffect: active ? (avgRet > 0 ? "호재" : "변화") : "중립",
        description: `${tf}: 과거 ROC>5% ${strongUp.length}회, 이후 평균 ${avgRet > 0 ? "+" : ""}${avgRet.toFixed(1)}%. ${active ? `현재 ROC ${curROC?.toFixed(1)}%로 활성` : "비활성"}`,
        confidence: clamp(35 + strongUp.length * 6, 35, 78),
      });
    }

    const strongDown = momEvents.filter((m) => !m.strong);
    if (strongDown.length >= 2) {
      const avgRet = strongDown.reduce((s, m) => s + m.futureReturn, 0) / strongDown.length;
      const curROC = currentFP.roc12;
      const active = curROC != null && curROC < -5;
      catalysts.push({
        name: "강한 하락 모멘텀",
        type: avgRet < 0 ? "악재" : "호재",
        historicalImpact: Math.round(avgRet * 10),
        currentlyActive: active,
        currentEffect: active ? (avgRet < 0 ? "악재" : "변화") : "중립",
        description: `${tf}: 과거 ROC<-5% ${strongDown.length}회, 이후 평균 ${avgRet > 0 ? "+" : ""}${avgRet.toFixed(1)}%. ${active ? `현재 ROC ${curROC?.toFixed(1)}%로 활성` : "비활성"}`,
        confidence: clamp(35 + strongDown.length * 6, 35, 78),
      });
    }
  }

  // ── 팩터 6: 거시경제 (VIX) ──
  if (collectedData?.vix != null) {
    const vix = collectedData.vix;
    if (vix > 25) {
      catalysts.push({
        name: "VIX 공포 지수 상승",
        type: "악재",
        historicalImpact: -40,
        currentlyActive: true,
        currentEffect: "악재",
        description: `${tf}: VIX ${vix.toFixed(1)}로 높은 공포 상태. 역사적으로 VIX>25는 위험자산에 악재, 안전자산에 호재로 작용`,
        confidence: 75,
      });
    } else if (vix < 13) {
      catalysts.push({
        name: "VIX 극저변동",
        type: "호재",
        historicalImpact: 25,
        currentlyActive: true,
        currentEffect: "호재",
        description: `${tf}: VIX ${vix.toFixed(1)}로 극도의 안정. 역사적으로 낮은 VIX는 위험자산에 호재이나, 과도한 안심은 급변의 전조이기도 함`,
        confidence: 60,
      });
    }
  }

  // ── 팩터 7: 수익률 곡선 (역전 = 경기침체 경고) ──
  if (collectedData?.yieldCurveSpread != null) {
    const spread = collectedData.yieldCurveSpread;
    if (spread < -0.3) {
      catalysts.push({
        name: "수익률 곡선 역전",
        type: "악재",
        historicalImpact: -50,
        currentlyActive: true,
        currentEffect: "악재",
        description: `${tf}: 수익률 곡선 스프레드 ${spread.toFixed(3)}%로 깊은 역전. 역사적으로 경기침체 선행 지표. 주식에 악재, 안전자산에 호재`,
        confidence: 80,
      });
    } else if (spread > 1.0) {
      catalysts.push({
        name: "수익률 곡선 정상화",
        type: "호재",
        historicalImpact: 30,
        currentlyActive: true,
        currentEffect: "호재",
        description: `${tf}: 수익률 곡선 스프레드 ${spread.toFixed(3)}%로 정상 경사. 역사적으로 경기 확장기 신호`,
        confidence: 70,
      });
    }
  }

  // ── 팩터 8: 달러 강세/약세 ──
  if (collectedData?.dxyTrend) {
    const trend = collectedData.dxyTrend;
    if (trend === "강세" || trend === "소폭강세") {
      catalysts.push({
        name: "달러 강세",
        type: "악재",
        historicalImpact: -30,
        currentlyActive: true,
        currentEffect: "악재",
        description: `${tf}: 달러 인덱스 ${trend}. 역사적으로 원자재·이머징 자산에 악재, 달러 표시 자산에 호재`,
        confidence: 65,
      });
    } else if (trend === "약세" || trend === "소폭약세") {
      catalysts.push({
        name: "달러 약세",
        type: "호재",
        historicalImpact: 30,
        currentlyActive: true,
        currentEffect: "호재",
        description: `${tf}: 달러 인덱스 ${trend}. 역사적으로 원자재·이머징 자산에 호재`,
        confidence: 65,
      });
    }
  }

  // ── 팩터 9: 안전자산 수요 ──
  if (collectedData?.safeHavenDemand === "높음") {
    catalysts.push({
      name: "안전자산 수요 급증",
      type: "악재",
      historicalImpact: -35,
      currentlyActive: true,
      currentEffect: "악재",
      description: `${tf}: 안전자산 수요 높음. 역사적으로 위험 회피 국면에서 주식·원자재 하락, 금·채권 상승 패턴`,
      confidence: 70,
    });
  }

  // ── 팩터 10: 뉴스 심리 ──
  if (collectedData?.newsSentiment) {
    const sentiment = collectedData.newsSentiment.overall;
    if (sentiment === "positive") {
      catalysts.push({
        name: "뉴스 심리 긍정적",
        type: "호재",
        historicalImpact: 15,
        currentlyActive: true,
        currentEffect: "호재",
        description: `${tf}: 뉴스 심리 긍정적. 단기적 호재이나, 과도한 낙관은 과열 신호일 수 있음`,
        confidence: 50,
      });
    } else if (sentiment === "negative") {
      catalysts.push({
        name: "뉴스 심리 부정적",
        type: "악재",
        historicalImpact: -15,
        currentlyActive: true,
        currentEffect: "악재",
        description: `${tf}: 뉴스 심리 부정적. 단기적 악재이나, 과도한 비관은 역발상 매수 기회일 수 있음`,
        confidence: 50,
      });
    }
  }

  return catalysts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 패턴 감지
// ═══════════════════════════════════════════════════════════════════════════════

function detectPatterns(data: PriceBar[], fp: IndicatorFingerprint, tf: Timeframe): PatternSignal[] {
  const patterns: PatternSignal[] = [];

  if (fp.smaCrossRatio != null) {
    if (fp.smaCrossRatio > 0.005 && fp.smaCrossRatio < 0.02) {
      patterns.push({ name: "골든크로스 초기", description: `${tf}: 단기>장기 이평선 상향 돌파 초기`, historicalAccuracy: 68, currentSignal: "상승", confidence: 65, timeframe: tf });
    } else if (fp.smaCrossRatio < -0.005 && fp.smaCrossRatio > -0.02) {
      patterns.push({ name: "데드크로스 초기", description: `${tf}: 단기<장기 이평선 하향 돌파 초기`, historicalAccuracy: 65, currentSignal: "하락", confidence: 63, timeframe: tf });
    }
  }

  if (fp.rsi != null) {
    if (fp.rsi > 75) patterns.push({ name: "RSI 과매수", description: `${tf}: RSI ${fp.rsi.toFixed(1)} 과매수 극단`, historicalAccuracy: 72, currentSignal: "하락", confidence: 70, timeframe: tf });
    else if (fp.rsi < 25) patterns.push({ name: "RSI 과매도", description: `${tf}: RSI ${fp.rsi.toFixed(1)} 과매도 극단`, historicalAccuracy: 74, currentSignal: "상승", confidence: 72, timeframe: tf });
  }

  if (fp.bbPercentB != null) {
    if (fp.bbPercentB > 1.05) patterns.push({ name: "BB 상단 이탈", description: `${tf}: 볼린저 밴드 상단 돌파 — 되돌림 가능`, historicalAccuracy: 66, currentSignal: "하락", confidence: 60, timeframe: tf });
    else if (fp.bbPercentB < -0.05) patterns.push({ name: "BB 하단 이탈", description: `${tf}: 볼린저 밴드 하단 이탈 — 반등 가능`, historicalAccuracy: 69, currentSignal: "상승", confidence: 63, timeframe: tf });
  }

  if (fp.atrRatio != null) {
    if (fp.atrRatio < 0.6) patterns.push({ name: "변동성 극수축", description: `${tf}: ATR비율 ${fp.atrRatio.toFixed(2)} — 돌파 임박`, historicalAccuracy: 62, currentSignal: "보합", confidence: 58, timeframe: tf });
    else if (fp.atrRatio > 2.0) patterns.push({ name: "변동성 폭발", description: `${tf}: ATR비율 ${fp.atrRatio.toFixed(2)} — 추세 지속 또는 되돌림`, historicalAccuracy: 60, currentSignal: "보합", confidence: 55, timeframe: tf });
  }

  if (fp.roc5 != null && fp.roc12 != null) {
    if (fp.roc5 > 3 && fp.roc12 > 5) patterns.push({ name: "이중 모멘텀 가속", description: `${tf}: 단기·중기 강한 상승 모멘텀`, historicalAccuracy: 71, currentSignal: "상승", confidence: 68, timeframe: tf });
    else if (fp.roc5 < -3 && fp.roc12 < -5) patterns.push({ name: "이중 모멘텀 하락", description: `${tf}: 단기·중기 강한 하락 모멘텀`, historicalAccuracy: 69, currentSignal: "하락", confidence: 66, timeframe: tf });
    else if (fp.roc5 > 0 && fp.roc12 < 0) patterns.push({ name: "모멘텀 전환↑", description: `${tf}: 단기 양전환 — 추세 전환 초기`, historicalAccuracy: 58, currentSignal: "상승", confidence: 52, timeframe: tf });
    else if (fp.roc5 < 0 && fp.roc12 > 0) patterns.push({ name: "모멘텀 전환↓", description: `${tf}: 단기 음전환 — 추세 피로`, historicalAccuracy: 57, currentSignal: "하락", confidence: 50, timeframe: tf });
  }

  if (fp.priceVsSMA20 != null) {
    if (fp.priceVsSMA20 > 0.08) patterns.push({ name: "SMA20 과리 상승", description: `${tf}: 20일 이평 대비 ${(fp.priceVsSMA20 * 100).toFixed(1)}% 위 — 평균회귀 가능`, historicalAccuracy: 67, currentSignal: "하락", confidence: 62, timeframe: tf });
    else if (fp.priceVsSMA20 < -0.08) patterns.push({ name: "SMA20 과리 하락", description: `${tf}: 20일 이평 대비 ${(fp.priceVsSMA20 * 100).toFixed(1)}% 아래 — 반등 가능`, historicalAccuracy: 70, currentSignal: "상승", confidence: 65, timeframe: tf });
  }

  if (fp.macdHistogram != null && fp.roc5 != null) {
    if (fp.macdHistogram > 0 && fp.macdHistogram < 0.5 && fp.roc5 > 0) {
      patterns.push({ name: "MACD 양전환", description: `${tf}: MACD 히스토그램 양수 전환 + 단기 모멘텀 동반`, historicalAccuracy: 64, currentSignal: "상승", confidence: 60, timeframe: tf });
    } else if (fp.macdHistogram < 0 && fp.macdHistogram > -0.5 && fp.roc5 < 0) {
      patterns.push({ name: "MACD 음전환", description: `${tf}: MACD 히스토그램 음수 전환 + 단기 하락 동반`, historicalAccuracy: 63, currentSignal: "하락", confidence: 58, timeframe: tf });
    }
  }

  return patterns;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 유사 구간 탐색
// ═══════════════════════════════════════════════════════════════════════════════

function findSimilarPeriods(
  data: PriceBar[],
  currentFP: IndicatorFingerprint,
  windowSize: number,
  forecastHorizon: number,
): { count: number; avgReturnAfter: number; winRate: number; direction: "상승" | "하락" | "보합" } {
  const candidates: { similarity: number; futureReturn: number }[] = [];
  const endIdx = data.length - windowSize - forecastHorizon;
  const step = Math.max(1, Math.floor(windowSize / 3));

  for (let i = windowSize; i <= endIdx; i += step) {
    const slice = data.slice(i - windowSize, i);
    const pastFP = calcFingerprint(slice);
    const sim = fingerprintSimilarity(currentFP, pastFP);
    if (sim < 0.60) continue;

    const futurePrice = data[Math.min(i + forecastHorizon - 1, data.length - 1)].close;
    const curPrice = data[i - 1].close;
    if (curPrice === 0) continue;
    candidates.push({ similarity: sim, futureReturn: ((futurePrice - curPrice) / curPrice) * 100 });
  }

  candidates.sort((a, b) => b.similarity - a.similarity);
  const top = candidates.slice(0, 10);

  if (top.length === 0) return { count: 0, avgReturnAfter: 0, winRate: 50, direction: "보합" };

  let wRet = 0, tW = 0, posCount = 0;
  for (const c of top) {
    wRet += c.futureReturn * c.similarity;
    tW += c.similarity;
    if (c.futureReturn > 0.3) posCount++;
  }

  const avgRet = tW > 0 ? wRet / tW : 0;
  const winRate = (posCount / top.length) * 100;
  let dir: "상승" | "하락" | "보합";
  if (avgRet > 0.5 && winRate > 55) dir = "상승";
  else if (avgRet < -0.5 && winRate < 45) dir = "하락";
  else dir = "보합";

  return { count: top.length, avgReturnAfter: Math.round(avgRet * 100) / 100, winRate: Math.round(winRate * 10) / 10, direction: dir };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 과거 예측 성과 (Supabase)
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchModelPerformance(assetId: string): Promise<Record<string, { correct: number; total: number }> | null> {
  try {
    const { data: results, error } = await supabase
      .from("prediction_results")
      .select("prediction_id, was_correct")
      .eq("asset_id", assetId)
      .order("evaluated_at", { ascending: false })
      .limit(50);

    if (error || !results || results.length === 0) return null;

    const predIds = results.map((r) => r.prediction_id);
    const { data: preds, error: pErr } = await supabase
      .from("ai_predictions")
      .select("id, sub_model_votes, direction")
      .in("id", predIds);

    if (pErr || !preds) return null;

    const predMap = new Map(preds.map((p) => [p.id, p]));
    const perf: Record<string, { correct: number; total: number }> = {
      momentum: { correct: 0, total: 0 },
      meanReversion: { correct: 0, total: 0 },
      volatility: { correct: 0, total: 0 },
      correlation: { correct: 0, total: 0 },
      fundamental: { correct: 0, total: 0 },
    };

    for (const result of results) {
      const pred = predMap.get(result.prediction_id);
      if (!pred?.sub_model_votes) continue;
      const votes = pred.sub_model_votes as Record<string, { direction?: string }>;
      for (const key of Object.keys(perf)) {
        const vote = votes[key];
        if (!vote?.direction) continue;
        perf[key].total++;
        if (result.was_correct) perf[key].correct++;
      }
    }
    return perf;
  } catch {
    return null;
  }
}

function applyPerformance(regimeBase: Record<string, number>, perf: Record<string, { correct: number; total: number }> | null): Record<string, number> {
  if (!perf) return regimeBase;
  const result: Record<string, number> = {};
  for (const key of Object.keys(regimeBase)) {
    const p = perf[key];
    if (p && p.total >= 3) {
      const acc = (p.correct / p.total) * 100;
      result[key] = Math.round(regimeBase[key] * 0.4 + acc * 0.6);
    } else {
      result[key] = regimeBase[key];
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 단일 타임프레임 분석
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeTimeframe(
  data: PriceBar[],
  config: TimeframeConfig,
  collectedData: CollectedData | null,
  modelPerf: Record<string, { correct: number; total: number }> | null,
): TimeframeAnalysis {
  const sliceData = data.slice(-Math.min(config.lookback, data.length));
  const fingerprint = calcFingerprint(sliceData);
  const { regime, confidence: regimeConfidence } = detectRegime(sliceData, collectedData?.vix);
  const patterns = detectPatterns(sliceData, fingerprint, config.name);
  const catalysts = analyzeCatalysts(data, config.name, config.lookback, collectedData);
  const similarPeriods = findSimilarPeriods(data, fingerprint, config.lookback, config.forecastHorizon);
  const regimeBase = regimeModelReliability(regime);
  const reliability = applyPerformance(regimeBase, modelPerf);

  return {
    timeframe: config.name,
    lookbackDays: config.lookback,
    regime,
    regimeConfidence,
    fingerprint,
    similarPeriods,
    patterns,
    catalysts,
    modelReliability: {
      momentum: reliability.momentum ?? 60,
      meanReversion: reliability.meanReversion ?? 60,
      volatility: reliability.volatility ?? 60,
      correlation: reliability.correlation ?? 60,
      fundamental: reliability.fundamental ?? 60,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 타임프레임 종합
// ═══════════════════════════════════════════════════════════════════════════════

function aggregateTimeframes(analyses: TimeframeAnalysis[]): {
  regime: MarketRegime;
  regimeConfidence: number;
  historicalBias: HistoricalPatternResult["historicalBias"];
  catalystSummary: HistoricalPatternResult["catalystSummary"];
  modelReliability: HistoricalPatternResult["modelReliability"];
  suggestedWeightAdjustment: HistoricalPatternResult["suggestedWeightAdjustment"];
} {
  // ── 레짐 종합 ──
  const regimeWeights: Record<Timeframe, number> = { "초단기": 0.05, "단기": 0.15, "중기": 0.35, "중장기": 0.30, "장기": 0.15 };
  const regimeScores = new Map<MarketRegime, number>();
  let totalRC = 0;
  for (const a of analyses) {
    const w = regimeWeights[a.timeframe] ?? 0.2;
    const s = w * a.regimeConfidence;
    regimeScores.set(a.regime, (regimeScores.get(a.regime) ?? 0) + s);
    totalRC += s;
  }
  let bestRegime: MarketRegime = "횡보";
  let bestRS = 0;
  for (const [r, s] of regimeScores) { if (s > bestRS) { bestRegime = r; bestRS = s; } }
  const regimeConfidence = totalRC > 0 ? Math.round((bestRS / totalRC) * 100) : 50;

  // ── 역사적 바이어스 ──
  let wRet = 0, wWin = 0, tW = 0, totalSim = 0;
  for (const a of analyses) {
    const cfg = TIMEFRAME_CONFIGS.find((c) => c.name === a.timeframe);
    const w = cfg?.weight ?? 0.2;
    if (a.similarPeriods.count > 0) {
      wRet += a.similarPeriods.avgReturnAfter * w;
      wWin += a.similarPeriods.winRate * w;
      tW += w;
      totalSim += a.similarPeriods.count;
    }
  }
  const avgRet = tW > 0 ? wRet / tW : 0;
  const avgWin = tW > 0 ? wWin / tW : 50;
  let biasDir: "상승" | "하락" | "보합";
  if (avgRet > 0.3 && avgWin > 53) biasDir = "상승";
  else if (avgRet < -0.3 && avgWin < 47) biasDir = "하락";
  else biasDir = "보합";
  const biasStrength = clamp(Math.abs(avgRet) * 10 + Math.abs(avgWin - 50) * 1.5, 0, 100);

  // ── 호재/악재 종합 ──
  const allCatalysts = analyses.flatMap((a) => a.catalysts);
  // 이름 기준 중복 제거 (가장 높은 confidence 유지)
  const catalystMap = new Map<string, CatalystFactor>();
  for (const c of allCatalysts) {
    const existing = catalystMap.get(c.name);
    if (!existing || c.confidence > existing.confidence) {
      catalystMap.set(c.name, c);
    }
  }
  const uniqueCatalysts = Array.from(catalystMap.values());

  const bullishFactors = uniqueCatalysts.filter((c) => c.currentEffect === "호재");
  const bearishFactors = uniqueCatalysts.filter((c) => c.currentEffect === "악재");
  const changedFactors = uniqueCatalysts.filter((c) => c.currentEffect === "변화");

  // 순 촉매 점수: 호재 합 - 악재 합
  let netScore = 0;
  for (const c of uniqueCatalysts) {
    if (c.currentEffect === "호재") netScore += (c.confidence / 100) * Math.abs(c.historicalImpact);
    else if (c.currentEffect === "악재") netScore -= (c.confidence / 100) * Math.abs(c.historicalImpact);
  }
  netScore = clamp(netScore, -100, 100);

  // ── 모델 신뢰도 종합 ──
  const modelKeys = ["momentum", "meanReversion", "volatility", "correlation", "fundamental"] as const;
  const aggRel: Record<string, number> = {};
  for (const key of modelKeys) {
    let wSum = 0, tw = 0;
    for (const a of analyses) {
      const w = TIMEFRAME_CONFIGS.find((c) => c.name === a.timeframe)?.weight ?? 0.2;
      wSum += a.modelReliability[key] * w;
      tw += w;
    }
    aggRel[key] = tw > 0 ? Math.round(wSum / tw) : 60;
  }

  // ── 가중치 조정 ──
  const avgRel = modelKeys.reduce((s, k) => s + aggRel[k], 0) / modelKeys.length;
  const adj: Record<string, number> = {};
  for (const key of modelKeys) {
    const ratio = aggRel[key] / Math.max(avgRel, 1);
    adj[key] = Math.round(clamp(ratio, 0.7, 1.4) * 100) / 100;
  }

  return {
    regime: bestRegime,
    regimeConfidence,
    historicalBias: {
      direction: biasDir,
      strength: Math.round(biasStrength),
      similarPeriodCount: totalSim,
      avgReturnAfter: Math.round(avgRet * 100) / 100,
      winRate: Math.round(avgWin * 10) / 10,
    },
    catalystSummary: {
      bullishFactors,
      bearishFactors,
      changedFactors,
      netCatalystScore: Math.round(netScore),
    },
    modelReliability: {
      momentum: aggRel.momentum,
      meanReversion: aggRel.meanReversion,
      volatility: aggRel.volatility,
      correlation: aggRel.correlation,
      fundamental: aggRel.fundamental,
    },
    suggestedWeightAdjustment: {
      momentum: adj.momentum,
      meanReversion: adj.meanReversion,
      volatility: adj.volatility,
      correlation: adj.correlation,
      fundamental: adj.fundamental,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 리포트 생성
// ═══════════════════════════════════════════════════════════════════════════════

const REGIME_LABELS: Record<MarketRegime, string> = {
  "강한_상승추세": "강한 상승 추세",
  "약한_상승추세": "약한 상승 추세",
  "횡보": "횡보 구간",
  "약한_하락추세": "약한 하락 추세",
  "강한_하락추세": "강한 하락 추세",
  "고변동성": "고변동성 국면",
  "위기": "위기 국면",
};

function generateRationale(
  analyses: TimeframeAnalysis[],
  regime: MarketRegime,
  bias: HistoricalPatternResult["historicalBias"],
  catalystSummary: HistoricalPatternResult["catalystSummary"],
  adj: HistoricalPatternResult["suggestedWeightAdjustment"],
): string {
  const parts: string[] = [];

  parts.push(`[레짐] 현재 시장은 '${REGIME_LABELS[regime]}'으로 판단됨`);

  // 타임프레임별 요약
  const tfLines = analyses.map((a) => {
    let line = `${a.timeframe}(${a.lookbackDays}일): ${REGIME_LABELS[a.regime] ?? a.regime}`;
    if (a.similarPeriods.count > 0) {
      line += ` | 유사구간 ${a.similarPeriods.count}건(승률 ${a.similarPeriods.winRate.toFixed(0)}%, 수익률 ${a.similarPeriods.avgReturnAfter > 0 ? "+" : ""}${a.similarPeriods.avgReturnAfter.toFixed(1)}%)`;
    }
    return line;
  });
  parts.push(`[타임프레임별]\n${tfLines.join("\n")}`);

  // 역사적 바이어스
  if (bias.similarPeriodCount > 0) {
    parts.push(`[역사적 바이어스] ${bias.similarPeriodCount}개 유사구간 → ${bias.direction}(강도 ${bias.strength}%, 승률 ${bias.winRate.toFixed(1)}%, 수익률 ${bias.avgReturnAfter > 0 ? "+" : ""}${bias.avgReturnAfter.toFixed(2)}%)`);
  }

  // 호재/악재
  if (catalystSummary.bullishFactors.length > 0 || catalystSummary.bearishFactors.length > 0) {
    const bullNames = catalystSummary.bullishFactors.map((f) => f.name).join(", ");
    const bearNames = catalystSummary.bearishFactors.map((f) => f.name).join(", ");
    let catalystLine = "[호재/악재] ";
    if (bullNames) catalystLine += `호재: ${bullNames}`;
    if (bullNames && bearNames) catalystLine += " | ";
    if (bearNames) catalystLine += `악재: ${bearNames}`;
    if (catalystSummary.changedFactors.length > 0) {
      catalystLine += ` | 변화: ${catalystSummary.changedFactors.map((f) => f.name).join(", ")} (과거와 다르게 작용)`;
    }
    catalystLine += ` → 순 촉매점수: ${catalystSummary.netCatalystScore > 0 ? "+" : ""}${catalystSummary.netCatalystScore}`;
    parts.push(catalystLine);
  }

  // 가중치 조정
  const modelLabels: Record<string, string> = { momentum: "모멘텀", meanReversion: "평균회귀", volatility: "변동성", correlation: "상관관계", fundamental: "펀더멘털" };
  const adjParts: string[] = [];
  for (const [k, v] of Object.entries(adj)) {
    if (v > 1.05) adjParts.push(`${modelLabels[k] ?? k}↑${((v - 1) * 100).toFixed(0)}%`);
    else if (v < 0.95) adjParts.push(`${modelLabels[k] ?? k}↓${((1 - v) * 100).toFixed(0)}%`);
  }
  if (adjParts.length > 0) parts.push(`[가중치 조정] ${adjParts.join(", ")}`);

  // 주요 패턴
  const allPatterns = analyses.flatMap((a) => a.patterns).sort((a, b) => b.confidence - a.confidence).slice(0, 4);
  if (allPatterns.length > 0) {
    parts.push(`[주요 패턴] ${allPatterns.map((p) => `${p.name}(${p.timeframe},${p.currentSignal})`).join(" | ")}`);
  }

  return parts.join(". ");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 역사적 패턴 종합 분석
 *
 * 5단계 타임프레임(초단기/단기/중기/중장기/장기)으로 과거 패턴을 분석하고,
 * 호재/악재 팩터를 분류하며, 현재 동일하게 작용하는지 검토한다.
 */
export async function analyzeHistoricalPatterns(
  assetId: string,
  currentData: PriceBar[],
  collectedData: CollectedData | null,
): Promise<HistoricalPatternResult> {
  // 과거 예측 성과 조회
  let modelPerf: Record<string, { correct: number; total: number }> | null = null;
  try {
    modelPerf = await fetchModelPerformance(assetId);
  } catch { /* 무시 */ }

  // 각 타임프레임 분석
  const analyses: TimeframeAnalysis[] = [];
  for (const config of TIMEFRAME_CONFIGS) {
    if (currentData.length < config.lookback) continue;
    analyses.push(analyzeTimeframe(currentData, config, collectedData, modelPerf));
  }

  if (analyses.length === 0) {
    return {
      regime: "횡보",
      regimeConfidence: 30,
      timeframeAnalyses: [],
      historicalBias: { direction: "보합", strength: 0, similarPeriodCount: 0, avgReturnAfter: 0, winRate: 50 },
      catalystSummary: { bullishFactors: [], bearishFactors: [], changedFactors: [], netCatalystScore: 0 },
      modelReliability: { momentum: 60, meanReversion: 60, volatility: 60, correlation: 60, fundamental: 60 },
      suggestedWeightAdjustment: { momentum: 1, meanReversion: 1, volatility: 1, correlation: 1, fundamental: 1 },
      patterns: [],
      rationale: "[과거 패턴] 분석 가능한 데이터 부족",
    };
  }

  const { regime, regimeConfidence, historicalBias, catalystSummary, modelReliability, suggestedWeightAdjustment } = aggregateTimeframes(analyses);
  const allPatterns = analyses.flatMap((a) => a.patterns);
  const rationale = generateRationale(analyses, regime, historicalBias, catalystSummary, suggestedWeightAdjustment);

  return {
    regime,
    regimeConfidence,
    timeframeAnalyses: analyses,
    historicalBias,
    catalystSummary,
    modelReliability,
    suggestedWeightAdjustment,
    patterns: allPatterns,
    rationale,
  };
}
