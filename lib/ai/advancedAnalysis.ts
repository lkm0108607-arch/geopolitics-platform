/**
 * 고급 분석 모듈 — 22개 이상의 분석 팩터를 추가하여 AI 예측 정확도를 향상시킨다.
 * 순수 함수로 구현 — 외부 의존성 없음
 */

import {
  PriceBar,
  calcSMA,
  calcEMA,
  calcRSI,
  calcBollingerBands,
  calcATR,
  calcROC,
  // New indicators
  calcFibonacciLevels,
  calcVWAP,
  calcMFI,
  calcKeltnerChannels,
  calcDonchianChannels,
  calcCMF,
  calcAroon,
  calcElderRay,
  calcUltimateOscillator,
  calcForceIndex,
  calcOBVTrend as calcOBVIndicator,
  calcTrix,
  calcMassIndex,
  calcCoppockCurve,
  calcPivotPoints,
  calcDMI,
} from "./indicators";

// ─── 공통 타입 ────────────────────────────────────────────────────────────────

type Direction = "상승" | "하락" | "보합";

// ─── 헬퍼 함수 ───────────────────────────────────────────────────────────────

/** high 값이 없으면 close를 사용 */
function getHigh(bar: PriceBar): number {
  return bar.high ?? bar.close;
}

/** low 값이 없으면 close를 사용 */
function getLow(bar: PriceBar): number {
  return bar.low ?? bar.close;
}

/** volume 값이 없으면 0을 사용 */
function getVolume(bar: PriceBar): number {
  return bar.volume ?? 0;
}

/** 단순 이동 평균 (숫자 배열용) */
function smaArray(arr: number[], period: number): number | null {
  if (arr.length < period) return null;
  const slice = arr.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/** True Range 계산 */
function trueRange(curr: PriceBar, prev: PriceBar): number {
  const high = getHigh(curr);
  const low = getLow(curr);
  const prevClose = prev.close;
  return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
}

/** 숫자 배열의 표준편차 */
function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/** 값을 범위 내로 클램핑 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 기술적 지표 (10개)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. 스토캐스틱 오실레이터 ─────────────────────────────────────────────────

export function calcStochastic(
  data: PriceBar[],
  kPeriod: number = 14,
  dPeriod: number = 3,
): { k: number; d: number } | null {
  // %K 계산에 kPeriod, %D 계산에 추가 dPeriod-1 필요
  if (data.length < kPeriod + dPeriod - 1) return null;

  const kValues: number[] = [];

  // %D를 계산하기 위해 최근 dPeriod개의 %K가 필요
  for (let i = data.length - dPeriod; i < data.length; i++) {
    const slice = data.slice(i + 1 - kPeriod, i + 1);
    const highestHigh = Math.max(...slice.map(getHigh));
    const lowestLow = Math.min(...slice.map(getLow));
    const range = highestHigh - lowestLow;
    const k = range !== 0 ? ((data[i].close - lowestLow) / range) * 100 : 50;
    kValues.push(k);
  }

  const k = kValues[kValues.length - 1];
  const d = kValues.reduce((a, b) => a + b, 0) / kValues.length;

  return { k, d };
}

// ─── 2. 윌리엄스 %R ──────────────────────────────────────────────────────────

export function calcWilliamsR(data: PriceBar[], period: number = 14): number | null {
  if (data.length < period) return null;

  const slice = data.slice(-period);
  const highestHigh = Math.max(...slice.map(getHigh));
  const lowestLow = Math.min(...slice.map(getLow));
  const range = highestHigh - lowestLow;

  if (range === 0) return -50; // 변동이 없으면 중립
  const current = data[data.length - 1].close;
  return ((highestHigh - current) / range) * -100;
}

// ─── 3. 상품 채널 지수 (CCI) ─────────────────────────────────────────────────

export function calcCCI(data: PriceBar[], period: number = 20): number | null {
  if (data.length < period) return null;

  const slice = data.slice(-period);

  // TP (Typical Price) 계산
  const tps = slice.map((bar) => (getHigh(bar) + getLow(bar) + bar.close) / 3);
  const meanTP = tps.reduce((a, b) => a + b, 0) / period;

  // 평균 편차 (Mean Deviation)
  const meanDeviation = tps.reduce((acc, tp) => acc + Math.abs(tp - meanTP), 0) / period;

  if (meanDeviation === 0) return 0;
  return (tps[tps.length - 1] - meanTP) / (0.015 * meanDeviation);
}

// ─── 4. 평균 방향 지수 (ADX) ──────────────────────────────────────────────────

export function calcADX(
  data: PriceBar[],
  period: number = 14,
): { adx: number; plusDI: number; minusDI: number } | null {
  // high/low 데이터 필요, 최소 2*period + 1개 데이터
  if (data.length < 2 * period + 1) return null;

  // high/low가 모두 있는지 확인
  const hasHL = data.every((bar) => bar.high !== undefined && bar.low !== undefined);
  if (!hasHL) return null;

  // +DM, -DM, TR 계산
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];
  const trs: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const highDiff = data[i].high! - data[i - 1].high!;
    const lowDiff = data[i - 1].low! - data[i].low!;

    plusDMs.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDMs.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
    trs.push(trueRange(data[i], data[i - 1]));
  }

  if (trs.length < 2 * period) return null;

  // Wilder 평활화로 ATR, +DM, -DM 계산
  let smoothTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

  const dxValues: number[] = [];

  for (let i = period; i < trs.length; i++) {
    smoothTR = smoothTR - smoothTR / period + trs[i];
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDMs[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDMs[i];

    const plusDI = smoothTR !== 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const minusDI = smoothTR !== 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    const diSum = plusDI + minusDI;
    const dx = diSum !== 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;
    dxValues.push(dx);
  }

  if (dxValues.length < period) return null;

  // ADX = DX의 평활화 이동평균
  let adx = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period;
  }

  // 최종 +DI, -DI 값
  const finalPlusDI = smoothTR !== 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
  const finalMinusDI = smoothTR !== 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

  return { adx, plusDI: finalPlusDI, minusDI: finalMinusDI };
}

// ─── 5. OBV 추세 방향 ────────────────────────────────────────────────────────

export function calcOBVTrend(data: PriceBar[], period: number = 10): Direction {
  if (data.length < period + 1) return "보합";

  // OBV 계산
  const obvValues: number[] = [0];
  for (let i = 1; i < data.length; i++) {
    const vol = getVolume(data[i]);
    if (data[i].close > data[i - 1].close) {
      obvValues.push(obvValues[obvValues.length - 1] + vol);
    } else if (data[i].close < data[i - 1].close) {
      obvValues.push(obvValues[obvValues.length - 1] - vol);
    } else {
      obvValues.push(obvValues[obvValues.length - 1]);
    }
  }

  // 최근 period 기간의 OBV 추세 판단 (선형 회귀 기울기)
  const recentOBV = obvValues.slice(-period);
  const n = recentOBV.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += recentOBV[i];
    sumXY += i * recentOBV[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return "보합";
  const slope = (n * sumXY - sumX * sumY) / denom;

  // 기울기의 크기를 OBV 범위에 대한 비율로 판단
  const obvRange = Math.max(...recentOBV) - Math.min(...recentOBV);
  if (obvRange === 0) return "보합";
  const normalizedSlope = (slope * n) / obvRange;

  if (normalizedSlope > 0.3) return "상승";
  if (normalizedSlope < -0.3) return "하락";
  return "보합";
}

// ─── 6. 이치모쿠 신호 (간소화) ───────────────────────────────────────────────

export function calcIchimokuSignal(
  data: PriceBar[],
): { signal: Direction; cloudTop: number; cloudBottom: number } | null {
  // 이치모쿠에 필요한 최소 데이터: 52 (선행스팬B 기간)
  if (data.length < 52) return null;

  // 전환선 (9일)
  const tenkanSlice = data.slice(-9);
  const tenkan =
    (Math.max(...tenkanSlice.map(getHigh)) + Math.min(...tenkanSlice.map(getLow))) / 2;

  // 기준선 (26일)
  const kijunSlice = data.slice(-26);
  const kijun =
    (Math.max(...kijunSlice.map(getHigh)) + Math.min(...kijunSlice.map(getLow))) / 2;

  // 선행스팬A = (전환선 + 기준선) / 2
  const spanA = (tenkan + kijun) / 2;

  // 선행스팬B = (52일 최고가 + 52일 최저가) / 2
  const spanBSlice = data.slice(-52);
  const spanB =
    (Math.max(...spanBSlice.map(getHigh)) + Math.min(...spanBSlice.map(getLow))) / 2;

  const cloudTop = Math.max(spanA, spanB);
  const cloudBottom = Math.min(spanA, spanB);
  const currentClose = data[data.length - 1].close;

  // 신호 판단: 가격이 구름 위면 상승, 아래면 하락, 구름 안이면 보합
  let signal: Direction;
  if (currentClose > cloudTop && tenkan > kijun) {
    signal = "상승";
  } else if (currentClose < cloudBottom && tenkan < kijun) {
    signal = "하락";
  } else {
    signal = "보합";
  }

  return { signal, cloudTop, cloudBottom };
}

// ─── 7. 파라볼릭 SAR ─────────────────────────────────────────────────────────

export function calcParabolicSAR(
  data: PriceBar[],
  afStart: number = 0.02,
  afStep: number = 0.02,
  afMax: number = 0.2,
): { trend: Direction; sar: number } | null {
  if (data.length < 3) return null;

  // 초기 설정: 첫 2개 봉으로 추세 방향 결정
  let isUpTrend = data[1].close >= data[0].close;
  let af = afStart;
  let ep = isUpTrend ? getHigh(data[1]) : getLow(data[1]);
  let sar = isUpTrend ? getLow(data[0]) : getHigh(data[0]);

  for (let i = 2; i < data.length; i++) {
    const high = getHigh(data[i]);
    const low = getLow(data[i]);

    // SAR 업데이트
    sar = sar + af * (ep - sar);

    if (isUpTrend) {
      // 상승 추세: SAR은 이전 2봉의 저가보다 높으면 안됨
      sar = Math.min(sar, getLow(data[i - 1]), getLow(data[i - 2]));

      if (low < sar) {
        // 추세 반전 → 하락
        isUpTrend = false;
        sar = ep;
        ep = low;
        af = afStart;
      } else {
        if (high > ep) {
          ep = high;
          af = Math.min(af + afStep, afMax);
        }
      }
    } else {
      // 하락 추세: SAR은 이전 2봉의 고가보다 낮으면 안됨
      sar = Math.max(sar, getHigh(data[i - 1]), getHigh(data[i - 2]));

      if (high > sar) {
        // 추세 반전 → 상승
        isUpTrend = true;
        sar = ep;
        ep = high;
        af = afStart;
      } else {
        if (low < ep) {
          ep = low;
          af = Math.min(af + afStep, afMax);
        }
      }
    }
  }

  return {
    trend: isUpTrend ? "상승" : "하락",
    sar,
  };
}

// ─── 8. 이동평균 정배열/역배열 판단 ──────────────────────────────────────────

export function calcMAAlignment(
  data: PriceBar[],
): { score: number; aligned: boolean; direction: Direction } {
  // 5, 10, 20, 50일 이동평균 계산
  const ma5 = calcSMA(data, 5);
  const ma10 = calcSMA(data, 10);
  const ma20 = calcSMA(data, 20);
  const ma50 = calcSMA(data, 50);

  // 데이터 부족 시 중립 반환
  if (ma5 === null || ma10 === null || ma20 === null || ma50 === null) {
    return { score: 0, aligned: false, direction: "보합" };
  }

  const mas = [ma5, ma10, ma20, ma50];

  // 정배열 점수: 인접한 MA 쌍이 올바른 순서인 횟수 (최대 3)
  let bullishPairs = 0;
  let bearishPairs = 0;

  for (let i = 0; i < mas.length - 1; i++) {
    if (mas[i] > mas[i + 1]) bullishPairs++;
    if (mas[i] < mas[i + 1]) bearishPairs++;
  }

  // 점수: -100(완전 역배열) ~ +100(완전 정배열)
  const score = Math.round(((bullishPairs - bearishPairs) / 3) * 100);
  const aligned = bullishPairs === 3 || bearishPairs === 3;

  let direction: Direction;
  if (score > 33) direction = "상승";
  else if (score < -33) direction = "하락";
  else direction = "보합";

  return { score, aligned, direction };
}

// ─── 9. 지지/저항 수준 ───────────────────────────────────────────────────────

export function calcSupportResistance(
  data: PriceBar[],
  lookback: number = 20,
): { support: number; resistance: number; nearSupport: boolean; nearResistance: boolean } | null {
  if (data.length < lookback) return null;

  const slice = data.slice(-lookback);
  const currentClose = data[data.length - 1].close;

  // 피벗 포인트 기반 지지/저항 계산
  const highs = slice.map(getHigh);
  const lows = slice.map(getLow);

  const resistance = Math.max(...highs);
  const support = Math.min(...lows);

  // 현재 가격이 지지/저항 근처인지 판단 (2% 이내)
  const range = resistance - support;
  const threshold = range * 0.02;

  const nearSupport = currentClose - support <= threshold;
  const nearResistance = resistance - currentClose <= threshold;

  return { support, resistance, nearSupport, nearResistance };
}

// ─── 10. 가격 갭 판단 ────────────────────────────────────────────────────────

export function calcPriceGap(
  data: PriceBar[],
): { hasGap: boolean; gapPercent: number; direction: "up" | "down" | "none" } {
  if (data.length < 2) {
    return { hasGap: false, gapPercent: 0, direction: "none" };
  }

  const prev = data[data.length - 2];
  const curr = data[data.length - 1];

  const prevHigh = getHigh(prev);
  const prevLow = getLow(prev);
  const currHigh = getHigh(curr);
  const currLow = getLow(curr);

  // 갭 업: 현재 저가 > 이전 고가
  if (currLow > prevHigh) {
    const gapPercent = prev.close !== 0 ? ((currLow - prevHigh) / prev.close) * 100 : 0;
    return { hasGap: true, gapPercent, direction: "up" };
  }

  // 갭 다운: 현재 고가 < 이전 저가
  if (currHigh < prevLow) {
    const gapPercent = prev.close !== 0 ? ((prevLow - currHigh) / prev.close) * 100 : 0;
    return { hasGap: true, gapPercent, direction: "down" };
  }

  return { hasGap: false, gapPercent: 0, direction: "none" };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 심리 및 시장 구조 (7개)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 11. 공포/탐욕 복합 지수 ─────────────────────────────────────────────────

export function calcFearGreedComposite(
  data: PriceBar[],
  vix?: number,
  rsi?: number,
): number {
  // 여러 요소를 종합하여 0(극단적 공포) ~ 100(극단적 탐욕) 산출
  const components: number[] = [];

  // RSI 기반 (제공되거나 직접 계산)
  const rsiValue = rsi ?? calcRSI(data, 14);
  if (rsiValue !== null) {
    components.push(rsiValue); // RSI 자체가 0~100 범위
  }

  // 모멘텀: 최근 수익률 기반
  const roc = calcROC(data, 12);
  if (roc !== null) {
    // ROC를 0~100 범위로 변환 (-20%~+20% 범위 가정)
    components.push(clamp((roc + 20) * 2.5, 0, 100));
  }

  // 볼린저 밴드 %B
  const bb = calcBollingerBands(data, 20, 2);
  if (bb !== null) {
    components.push(clamp(bb.percentB * 100, 0, 100));
  }

  // VIX 기반 (제공된 경우): VIX 낮으면 탐욕, 높으면 공포
  if (vix !== undefined) {
    // VIX 10=극단적 탐욕(100), VIX 40=극단적 공포(0)
    components.push(clamp(((40 - vix) / 30) * 100, 0, 100));
  }

  // 가격 위치: 최근 50일 범위 내 위치
  if (data.length >= 50) {
    const slice = data.slice(-50);
    const highest = Math.max(...slice.map(getHigh));
    const lowest = Math.min(...slice.map(getLow));
    const range = highest - lowest;
    if (range > 0) {
      components.push(((data[data.length - 1].close - lowest) / range) * 100);
    }
  }

  if (components.length === 0) return 50; // 데이터 부족 시 중립
  return Math.round(components.reduce((a, b) => a + b, 0) / components.length);
}

// ─── 12. 변동성 체제 분류 ────────────────────────────────────────────────────

export function calcVolatilityRegime(data: PriceBar[]): "low" | "normal" | "high" | "extreme" {
  if (data.length < 30) return "normal";

  // 최근 20일 일일 수익률의 표준편차
  const returns: number[] = [];
  for (let i = data.length - 20; i < data.length; i++) {
    if (data[i - 1].close !== 0) {
      returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
    }
  }

  const currentVol = stdDev(returns);

  // 장기 (60일) 변동성으로 정규화
  const longReturns: number[] = [];
  const startIdx = Math.max(1, data.length - 60);
  for (let i = startIdx; i < data.length; i++) {
    if (data[i - 1].close !== 0) {
      longReturns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
    }
  }
  const longVol = stdDev(longReturns);

  if (longVol === 0) return "normal";
  const ratio = currentVol / longVol;

  if (ratio < 0.6) return "low";
  if (ratio < 1.2) return "normal";
  if (ratio < 2.0) return "high";
  return "extreme";
}

// ─── 13. 추세 강도 ───────────────────────────────────────────────────────────

export function calcTrendStrength(
  data: PriceBar[],
): { strength: number; direction: Direction } {
  if (data.length < 20) return { strength: 0, direction: "보합" };

  // 선형 회귀 기울기로 추세 방향과 강도 측정
  const prices = data.slice(-20).map((b) => b.close);
  const n = prices.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += prices[i];
    sumXY += i * prices[i];
    sumX2 += i * i;
    sumY2 += prices[i] * prices[i];
  }

  const denomX = n * sumX2 - sumX * sumX;
  const denomY = n * sumY2 - sumY * sumY;
  if (denomX === 0 || denomY === 0) return { strength: 0, direction: "보합" };

  const slope = (n * sumXY - sumX * sumY) / denomX;

  // R² (결정계수)로 추세 강도 측정
  const r = (n * sumXY - sumX * sumY) / Math.sqrt(denomX * denomY);
  const r2 = r * r;

  const strength = Math.round(clamp(r2 * 100, 0, 100));

  // 방향 결정
  const meanPrice = sumY / n;
  const normalizedSlope = meanPrice !== 0 ? (slope * n) / meanPrice : 0;

  let direction: Direction;
  if (normalizedSlope > 0.01) direction = "상승";
  else if (normalizedSlope < -0.01) direction = "하락";
  else direction = "보합";

  return { strength, direction };
}

// ─── 14. 모멘텀 다이버전스 ───────────────────────────────────────────────────

export function calcMomentumDivergence(
  data: PriceBar[],
): { hasDivergence: boolean; type: "bullish" | "bearish" | "none" } {
  // RSI와 가격 간의 다이버전스 감지
  if (data.length < 30) return { hasDivergence: false, type: "none" };

  // 두 구간으로 나누어 비교 (10봉 전후)
  const midPoint = data.length - 10;
  const firstHalf = data.slice(0, midPoint);
  const secondHalf = data;

  const rsi1 = calcRSI(firstHalf, 14);
  const rsi2 = calcRSI(secondHalf, 14);

  if (rsi1 === null || rsi2 === null) return { hasDivergence: false, type: "none" };

  const price1 = firstHalf[firstHalf.length - 1].close;
  const price2 = secondHalf[secondHalf.length - 1].close;

  // 베어리시 다이버전스: 가격은 더 높은데 RSI는 더 낮음
  if (price2 > price1 && rsi2 < rsi1 - 5) {
    return { hasDivergence: true, type: "bearish" };
  }

  // 불리시 다이버전스: 가격은 더 낮은데 RSI는 더 높음
  if (price2 < price1 && rsi2 > rsi1 + 5) {
    return { hasDivergence: true, type: "bullish" };
  }

  return { hasDivergence: false, type: "none" };
}

// ─── 15. 거래량 프로필 ───────────────────────────────────────────────────────

export function calcVolumeProfile(
  data: PriceBar[],
): { volumeTrend: "증가" | "감소" | "보합"; volumeSpike: boolean } {
  if (data.length < 20) return { volumeTrend: "보합", volumeSpike: false };

  const volumes = data.slice(-20).map(getVolume);
  const recentAvg = smaArray(volumes.slice(-5), 5) ?? 0;
  const prevAvg = smaArray(volumes.slice(0, 10), 10) ?? 0;

  // 거래량 추세
  let volumeTrend: "증가" | "감소" | "보합";
  if (prevAvg === 0) {
    volumeTrend = "보합";
  } else {
    const ratio = recentAvg / prevAvg;
    if (ratio > 1.3) volumeTrend = "증가";
    else if (ratio < 0.7) volumeTrend = "감소";
    else volumeTrend = "보합";
  }

  // 거래량 스파이크: 마지막 봉의 거래량이 20일 평균의 2배 이상
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const lastVolume = getVolume(data[data.length - 1]);
  const volumeSpike = avgVolume > 0 && lastVolume > avgVolume * 2;

  return { volumeTrend, volumeSpike };
}

// ─── 16. 고점/저점 패턴 ──────────────────────────────────────────────────────

export function calcHigherHighsLowerLows(
  data: PriceBar[],
  lookback: number = 10,
): { pattern: "higher-highs" | "lower-lows" | "mixed"; count: number } {
  if (data.length < lookback) return { pattern: "mixed", count: 0 };

  const slice = data.slice(-lookback);

  // 로컬 고점/저점 찾기 (3봉 기준)
  const localHighs: number[] = [];
  const localLows: number[] = [];

  for (let i = 1; i < slice.length - 1; i++) {
    const h = getHigh(slice[i]);
    const l = getLow(slice[i]);
    if (h > getHigh(slice[i - 1]) && h > getHigh(slice[i + 1])) {
      localHighs.push(h);
    }
    if (l < getLow(slice[i - 1]) && l < getLow(slice[i + 1])) {
      localLows.push(l);
    }
  }

  // 고점 상승 횟수 / 저점 하락 횟수 카운트
  let hhCount = 0;
  let llCount = 0;

  for (let i = 1; i < localHighs.length; i++) {
    if (localHighs[i] > localHighs[i - 1]) hhCount++;
  }
  for (let i = 1; i < localLows.length; i++) {
    if (localLows[i] < localLows[i - 1]) llCount++;
  }

  if (hhCount > llCount && hhCount > 0) {
    return { pattern: "higher-highs", count: hhCount };
  }
  if (llCount > hhCount && llCount > 0) {
    return { pattern: "lower-lows", count: llCount };
  }
  return { pattern: "mixed", count: Math.max(hhCount, llCount) };
}

// ─── 17. 다중 시간프레임 추세 ────────────────────────────────────────────────

export function calcMultiTimeframeTrend(
  data: PriceBar[],
): { short: Direction; medium: Direction; long: Direction; aligned: boolean } {
  // 단기(5일), 중기(20일), 장기(60일) 추세
  const getDir = (period: number): Direction => {
    if (data.length < period + 1) return "보합";
    const sma = calcSMA(data, period);
    const currentClose = data[data.length - 1].close;
    if (sma === null) return "보합";
    const diff = (currentClose - sma) / sma;
    if (diff > 0.01) return "상승";
    if (diff < -0.01) return "하락";
    return "보합";
  };

  const short = getDir(5);
  const medium = getDir(20);
  const long = getDir(60);

  const aligned = short === medium && medium === long && short !== "보합";

  return { short, medium, long, aligned };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 리스크 평가 (5개)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 18. 최대 낙폭 (MDD) ─────────────────────────────────────────────────────

export function calcMaxDrawdown(data: PriceBar[], period: number = 20): number {
  if (data.length < 2) return 0;

  const slice = data.slice(-Math.min(period, data.length));
  let peak = slice[0].close;
  let maxDD = 0;

  for (let i = 1; i < slice.length; i++) {
    if (slice[i].close > peak) {
      peak = slice[i].close;
    }
    const dd = peak !== 0 ? (peak - slice[i].close) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }

  return Math.round(maxDD * 10000) / 100; // 퍼센트, 소수점 2자리
}

// ─── 19. 샤프 비율 프록시 ────────────────────────────────────────────────────

export function calcSharpeProxy(data: PriceBar[], period: number = 20): number {
  if (data.length < period + 1) return 0;

  const returns: number[] = [];
  for (let i = data.length - period; i < data.length; i++) {
    if (data[i - 1].close !== 0) {
      returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
    }
  }

  if (returns.length === 0) return 0;

  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const sd = stdDev(returns);

  if (sd === 0) return 0;

  // 연율화: sqrt(252) ≈ 15.87
  return Math.round((meanReturn / sd) * 15.87 * 100) / 100;
}

// ─── 20. 리스크/보상 비율 ────────────────────────────────────────────────────

export function calcRiskRewardRatio(
  data: PriceBar[],
  support: number,
  resistance: number,
): number | null {
  if (data.length === 0 || support >= resistance) return null;

  const currentClose = data[data.length - 1].close;
  const risk = currentClose - support;
  const reward = resistance - currentClose;

  if (risk <= 0) return null; // 이미 지지선 아래
  return Math.round((reward / risk) * 100) / 100;
}

// ─── 21. 돌파 확률 ───────────────────────────────────────────────────────────

export function calcBreakoutProbability(
  data: PriceBar[],
): { probability: number; direction: "up" | "down" | "none" } {
  if (data.length < 20) return { probability: 0, direction: "none" };

  // 볼린저 밴드 수축 + 거래량 증가 → 돌파 가능성 높음
  const bb = calcBollingerBands(data, 20, 2);
  if (bb === null) return { probability: 0, direction: "none" };

  // 밴드 폭이 좁아지고 있는지 확인
  const prevBB = calcBollingerBands(data.slice(0, -5), 20, 2);
  const bandNarrowing = prevBB !== null && bb.width < prevBB.width;

  // 가격이 밴드 경계에 가까운지
  const nearUpper = bb.percentB > 0.8;
  const nearLower = bb.percentB < 0.2;

  // ATR 대비 현재 범위가 작은지 (압축 상태)
  const atr = calcATR(data, 14);
  const recentRange = getHigh(data[data.length - 1]) - getLow(data[data.length - 1]);
  const compressed = atr !== null && atr > 0 && recentRange < atr * 0.5;

  // 거래량 증가 여부
  const vp = calcVolumeProfile(data);
  const volumeRising = vp.volumeTrend === "증가";

  // 점수 산출
  let score = 0;
  if (bandNarrowing) score += 25;
  if (compressed) score += 25;
  if (volumeRising) score += 20;
  if (nearUpper || nearLower) score += 15;

  // 추세 강도 반영
  const ts = calcTrendStrength(data);
  if (ts.strength > 50) score += 15;

  const probability = clamp(score, 0, 100);

  // 방향 결정
  let direction: "up" | "down" | "none" = "none";
  if (probability >= 30) {
    if (nearUpper || bb.percentB > 0.5) direction = "up";
    else direction = "down";
  }

  return { probability, direction };
}

// ─── 22. 평균 회귀 점수 ──────────────────────────────────────────────────────

export function calcMeanReversionScore(data: PriceBar[]): number {
  if (data.length < 20) return 0;

  const scores: number[] = [];

  // RSI 극단값에서 평균 회귀 기대
  const rsi = calcRSI(data, 14);
  if (rsi !== null) {
    if (rsi < 30) scores.push((30 - rsi) * 2.5); // 과매도 → 반등 기대
    else if (rsi > 70) scores.push((rsi - 70) * 2.5); // 과매수 → 조정 기대
    else scores.push(0);
  }

  // 볼린저 밴드 극단 위치
  const bb = calcBollingerBands(data, 20, 2);
  if (bb !== null) {
    if (bb.percentB < 0 || bb.percentB > 1) {
      // 밴드 밖에 있으면 강한 평균 회귀 기대
      scores.push(Math.min(Math.abs(bb.percentB - 0.5) * 100, 50));
    } else if (bb.percentB < 0.1 || bb.percentB > 0.9) {
      scores.push(30);
    } else {
      scores.push(0);
    }
  }

  // 이동평균 괴리율
  const sma20 = calcSMA(data, 20);
  if (sma20 !== null && sma20 !== 0) {
    const deviation = Math.abs(data[data.length - 1].close - sma20) / sma20;
    // 5% 이상 괴리 시 평균 회귀 기대
    if (deviation > 0.05) {
      scores.push(clamp(deviation * 500, 0, 50));
    } else {
      scores.push(0);
    }
  }

  if (scores.length === 0) return 0;
  return Math.round(clamp(scores.reduce((a, b) => a + b, 0) / scores.length * 2, 0, 100));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 확장 기술적 지표 함수 (15개)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 피보나치 구간 판단 ─────────────────────────────────────────────────────

export function calcFibonacciZone(
  data: PriceBar[],
): { zone: string; nearLevel: boolean; levelName: string } | null {
  if (data.length < 20) return null;
  try {
    if (typeof calcFibonacciLevels !== "function") return null;
    const levels = calcFibonacciLevels(data);
    if (!levels) return null;

    const currentClose = data[data.length - 1].close;
    const threshold = currentClose * 0.015; // 1.5% 이내

    // 피보나치 레벨 목록 (levels.levels = [0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%])
    const ratioNames = ["0%", "23.6%", "38.2%", "50%", "61.8%", "78.6%", "100%"];
    const fibLevels: { name: string; value: number }[] = (levels.levels || [])
      .map((val: number, idx: number) => ({ name: ratioNames[idx] || `${idx}`, value: val }))
      .filter((l: { name: string; value: number }) => l.value > 0);

    let nearLevel = false;
    let levelName = "없음";

    for (const level of fibLevels) {
      if (Math.abs(currentClose - level.value) <= threshold) {
        nearLevel = true;
        levelName = level.name;
        break;
      }
    }

    // 구간 판단
    const sorted = fibLevels.sort((a, b) => a.value - b.value);
    let zone = "범위_밖";
    for (let i = 0; i < sorted.length - 1; i++) {
      if (currentClose >= sorted[i].value && currentClose <= sorted[i + 1].value) {
        zone = `${sorted[i].name}-${sorted[i + 1].name}`;
        break;
      }
    }

    return { zone, nearLevel, levelName };
  } catch {
    return null;
  }
}

// ─── 켈트너 채널 스퀴즈 ─────────────────────────────────────────────────────

export function calcKeltnerSqueeze(
  data: PriceBar[],
): { squeeze: boolean; direction: string } | null {
  if (data.length < 20) return null;
  try {
    if (typeof calcKeltnerChannels !== "function") return null;
    const keltner = calcKeltnerChannels(data);
    if (!keltner) return null;

    const bb = calcBollingerBands(data, 20, 2);
    if (!bb) return null;

    // 볼린저 밴드가 켈트너 채널 안에 있으면 스퀴즈 상태
    const squeeze = bb.upper < keltner.upper && bb.lower > keltner.lower;

    const currentClose = data[data.length - 1].close;
    const midPoint = (keltner.upper + keltner.lower) / 2;
    const direction = currentClose > midPoint ? "상승" : currentClose < midPoint ? "하락" : "보합";

    return { squeeze, direction };
  } catch {
    return null;
  }
}

// ─── 멀티 오실레이터 합의 ───────────────────────────────────────────────────

export function calcMultiOscillatorConsensus(
  data: PriceBar[],
): { consensus: Direction; strength: number; agreeing: number } {
  let bullishCount = 0;
  let bearishCount = 0;
  let total = 0;

  // RSI
  const rsi = calcRSI(data, 14);
  if (rsi !== null) {
    total++;
    if (rsi < 40) bullishCount++;
    else if (rsi > 60) bearishCount++;
  }

  // 스토캐스틱
  const stoch = calcStochastic(data);
  if (stoch) {
    total++;
    if (stoch.k < 30) bullishCount++;
    else if (stoch.k > 70) bearishCount++;
  }

  // 윌리엄스 %R
  const wr = calcWilliamsR(data);
  if (wr !== null) {
    total++;
    if (wr < -70) bullishCount++;
    else if (wr > -30) bearishCount++;
  }

  // CCI
  const cci = calcCCI(data);
  if (cci !== null) {
    total++;
    if (cci < -100) bullishCount++;
    else if (cci > 100) bearishCount++;
  }

  // Ultimate Oscillator
  try {
    if (typeof calcUltimateOscillator === "function") {
      const uo = calcUltimateOscillator(data);
      if (uo !== null && typeof uo === "number") {
        total++;
        if (uo < 30) bullishCount++;
        else if (uo > 70) bearishCount++;
      }
    }
  } catch { /* safe fallback */ }

  const agreeing = Math.max(bullishCount, bearishCount);
  const strength = total > 0 ? Math.round((agreeing / total) * 100) : 0;

  let consensus: Direction;
  if (bullishCount > bearishCount && bullishCount >= 2) consensus = "상승";
  else if (bearishCount > bullishCount && bearishCount >= 2) consensus = "하락";
  else consensus = "보합";

  return { consensus, strength, agreeing };
}

// ─── 거래량 확인 ────────────────────────────────────────────────────────────

export function calcVolumeConfirmation(
  data: PriceBar[],
): { confirmed: boolean; divergence: boolean; strength: number } {
  if (data.length < 20) return { confirmed: false, divergence: false, strength: 0 };

  const priceChange = data[data.length - 1].close - data[data.length - 2].close;
  const priceUp = priceChange > 0;

  // 최근 거래량 vs 평균 거래량
  const volumes = data.slice(-20).map(getVolume);
  const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const lastVol = getVolume(data[data.length - 1]);
  const volRatio = avgVol > 0 ? lastVol / avgVol : 1;

  // 가격 상승 + 거래량 증가 = 확인, 가격 상승 + 거래량 감소 = 다이버전스
  const highVolume = volRatio > 1.2;
  const confirmed = (priceUp && highVolume) || (!priceUp && highVolume);
  const divergence = (priceUp && volRatio < 0.7) || (!priceUp && volRatio < 0.7);

  const strength = Math.round(clamp(volRatio * 50, 0, 100));

  return { confirmed, divergence, strength };
}

// ─── 스마트 머니 플로우 ─────────────────────────────────────────────────────

export function calcSmartMoneyFlow(
  data: PriceBar[],
): { flow: "유입" | "유출" | "중립"; strength: number } {
  if (data.length < 20) return { flow: "중립", strength: 0 };

  // CMF (Chaikin Money Flow) 기반
  let cmfValue: number | null = null;
  try {
    if (typeof calcCMF === "function") {
      cmfValue = calcCMF(data);
    }
  } catch { /* safe fallback */ }

  // Force Index 기반
  let forceValue: number | null = null;
  try {
    if (typeof calcForceIndex === "function") {
      forceValue = calcForceIndex(data);
    }
  } catch { /* safe fallback */ }

  // OBV 기반
  const obvDir = calcOBVTrend(data);

  let score = 0;
  let count = 0;

  if (cmfValue !== null && typeof cmfValue === "number") {
    count++;
    if (cmfValue > 0.05) score += 1;
    else if (cmfValue < -0.05) score -= 1;
  }

  if (forceValue !== null && typeof forceValue === "number") {
    count++;
    if (forceValue > 0) score += 1;
    else if (forceValue < 0) score -= 1;
  }

  count++;
  if (obvDir === "상승") score += 1;
  else if (obvDir === "하락") score -= 1;

  const strength = count > 0 ? Math.round((Math.abs(score) / count) * 100) : 0;
  let flow: "유입" | "유출" | "중립";
  if (score > 0) flow = "유입";
  else if (score < 0) flow = "유출";
  else flow = "중립";

  return { flow, strength };
}

// ─── 축적/분배 방향 ────────────────────────────────────────────────────────

export function calcAccumulationDistribution(data: PriceBar[]): Direction {
  if (data.length < 20) return "보합";

  // AD Line 계산
  let adLine = 0;
  const adValues: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const high = getHigh(data[i]);
    const low = getLow(data[i]);
    const close = data[i].close;
    const volume = getVolume(data[i]);
    const range = high - low;

    if (range > 0) {
      const mfMultiplier = ((close - low) - (high - close)) / range;
      adLine += mfMultiplier * volume;
    }
    adValues.push(adLine);
  }

  // 최근 10일 AD Line 추세
  if (adValues.length < 10) return "보합";
  const recent = adValues.slice(-10);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const change = last - first;
  const avgAD = Math.abs(recent.reduce((a, b) => a + b, 0) / recent.length);

  if (avgAD === 0) return "보합";
  const normalizedChange = change / (avgAD === 0 ? 1 : avgAD);

  if (normalizedChange > 0.1) return "상승";
  if (normalizedChange < -0.1) return "하락";
  return "보합";
}

// ─── 상대 강도 (자체 SMA 벤치마크 대비) ──────────────────────────────────────

export function calcRelativeStrength(data: PriceBar[]): number {
  if (data.length < 50) return 0;

  const currentClose = data[data.length - 1].close;
  const sma50 = calcSMA(data, 50);
  if (sma50 === null || sma50 === 0) return 0;

  // 현재 가격 / SMA50 비율 (100 = 평균, >100 = 강세, <100 = 약세)
  return Math.round((currentClose / sma50) * 100 * 100) / 100;
}

// ─── 가격 채널 위치 ─────────────────────────────────────────────────────────

export function calcPriceChannelPosition(
  data: PriceBar[],
): { position: number; channel: "상단" | "중간" | "하단" } {
  if (data.length < 20) return { position: 50, channel: "중간" };

  let highestHigh: number;
  let lowestLow: number;

  // Donchian 채널 사용 시도
  try {
    if (typeof calcDonchianChannels === "function") {
      const donchian = calcDonchianChannels(data);
      if (donchian && typeof donchian.upper === "number" && typeof donchian.lower === "number") {
        highestHigh = donchian.upper;
        lowestLow = donchian.lower;
      } else {
        const slice = data.slice(-20);
        highestHigh = Math.max(...slice.map(getHigh));
        lowestLow = Math.min(...slice.map(getLow));
      }
    } else {
      const slice = data.slice(-20);
      highestHigh = Math.max(...slice.map(getHigh));
      lowestLow = Math.min(...slice.map(getLow));
    }
  } catch {
    const slice = data.slice(-20);
    highestHigh = Math.max(...slice.map(getHigh));
    lowestLow = Math.min(...slice.map(getLow));
  }

  const range = highestHigh - lowestLow;
  if (range === 0) return { position: 50, channel: "중간" };

  const currentClose = data[data.length - 1].close;
  const position = Math.round(((currentClose - lowestLow) / range) * 100);

  let channel: "상단" | "중간" | "하단";
  if (position > 66) channel = "상단";
  else if (position < 33) channel = "하단";
  else channel = "중간";

  return { position: clamp(position, 0, 100), channel };
}

// ─── 분배일 카운트 ──────────────────────────────────────────────────────────

export function calcDistributionDayCount(data: PriceBar[]): number {
  if (data.length < 25) return 0;

  // 최근 25거래일 중 분배일 카운트
  // 분배일: 가격 하락 + 거래량 전일 대비 증가
  const slice = data.slice(-25);
  let count = 0;

  for (let i = 1; i < slice.length; i++) {
    const priceDown = slice[i].close < slice[i - 1].close;
    const priceDropPercent = slice[i - 1].close !== 0
      ? ((slice[i - 1].close - slice[i].close) / slice[i - 1].close) * 100
      : 0;
    const volumeUp = getVolume(slice[i]) > getVolume(slice[i - 1]);

    // 가격 0.2% 이상 하락 + 거래량 증가
    if (priceDown && priceDropPercent >= 0.2 && volumeUp) {
      count++;
    }
  }

  return count;
}

// ─── Elder Ray 신호 ─────────────────────────────────────────────────────────

export function calcElderRaySignal(
  data: PriceBar[],
): { signal: Direction; bullPower: number; bearPower: number } | null {
  if (data.length < 13) return null;
  try {
    if (typeof calcElderRay === "function") {
      const elder = calcElderRay(data);
      if (!elder) return null;

      const bullPower = typeof elder.bullPower === "number" ? elder.bullPower : 0;
      const bearPower = typeof elder.bearPower === "number" ? elder.bearPower : 0;

      let signal: Direction;
      if (bullPower > 0 && bearPower > -bullPower * 0.5) signal = "상승";
      else if (bearPower < 0 && bullPower < Math.abs(bearPower) * 0.5) signal = "하락";
      else signal = "보합";

      return { signal, bullPower, bearPower };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Aroon 신호 ─────────────────────────────────────────────────────────────

export function calcAroonSignal(
  data: PriceBar[],
): { trend: Direction; strength: number } | null {
  if (data.length < 25) return null;
  try {
    if (typeof calcAroon === "function") {
      const aroon = calcAroon(data);
      if (!aroon) return null;

      const up = typeof aroon.up === "number" ? aroon.up : 0;
      const down = typeof aroon.down === "number" ? aroon.down : 0;
      const strength = Math.abs(up - down);

      let trend: Direction;
      if (up > 70 && down < 30) trend = "상승";
      else if (down > 70 && up < 30) trend = "하락";
      else trend = "보합";

      return { trend, strength };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── TRIX 신호 ──────────────────────────────────────────────────────────────

export function calcTrixSignal(
  data: PriceBar[],
): { direction: Direction; crossover: boolean } | null {
  if (data.length < 30) return null;
  try {
    if (typeof calcTrix === "function") {
      const trixValue = calcTrix(data);
      if (trixValue === null) return null;

      // calcTrix returns a number directly
      // Calculate previous TRIX for crossover detection
      const prevData = data.slice(0, -1);
      const prevTrix = prevData.length >= 30 ? calcTrix(prevData) : null;

      let direction: Direction;
      if (trixValue > 0) direction = "상승";
      else if (trixValue < 0) direction = "하락";
      else direction = "보합";

      // Crossover: sign change from previous
      const crossover = prevTrix !== null && (
        (trixValue > 0 && prevTrix <= 0) ||
        (trixValue < 0 && prevTrix >= 0)
      );

      return { direction, crossover };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Mass Index 반전 신호 ────────────────────────────────────────────────────

export function calcMassIndexReversal(
  data: PriceBar[],
): { bulge: boolean; reversalLikely: boolean } | null {
  if (data.length < 25) return null;
  try {
    if (typeof calcMassIndex === "function") {
      const value = calcMassIndex(data);
      if (value === null || value === undefined) return null;

      // Mass Index bulge: 값이 27 이상 후 26.5 이하로 하락
      const bulge = value > 27;
      const reversalLikely = value > 26.5;

      return { bulge, reversalLikely };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Coppock Curve 신호 ──────────────────────────────────────────────────────

export function calcCoppockSignal(
  data: PriceBar[],
): { direction: Direction; turning: boolean } | null {
  if (data.length < 20) return null;
  try {
    if (typeof calcCoppockCurve === "function") {
      const value = calcCoppockCurve(data);
      if (value === null || value === undefined) return null;

      // 이전 데이터로 이전 값도 계산
      let prevValue: number | null = null;
      if (data.length > 1) {
        const prevData = data.slice(0, -1);
        try {
          prevValue = calcCoppockCurve(prevData);
        } catch { /* safe */ }
      }

      let direction: Direction;
      if (value > 0) direction = "상승";
      else if (value < 0) direction = "하락";
      else direction = "보합";

      // 전환점: 부호 변화 또는 방향 변화
      const turning = prevValue !== null ? (
        (value > 0 && prevValue <= 0) ||
        (value < 0 && prevValue >= 0) ||
        (value > prevValue && prevValue < 0) ||
        (value < prevValue && prevValue > 0)
      ) : false;

      return { direction, turning };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── 피벗 포인트 수준 ───────────────────────────────────────────────────────

export function calcPivotLevel(
  data: PriceBar[],
): { nearPivot: boolean; zone: string; support: number; resistance: number } | null {
  if (data.length < 2) return null;
  try {
    if (typeof calcPivotPoints === "function") {
      const pivots = calcPivotPoints(data);
      if (!pivots) return null;

      const pivot = typeof pivots.pivot === "number" ? pivots.pivot : 0;
      const s1 = typeof pivots.s1 === "number" ? pivots.s1 : 0;
      const r1 = typeof pivots.r1 === "number" ? pivots.r1 : 0;
      const s2 = typeof pivots.s2 === "number" ? pivots.s2 : s1;
      const r2 = typeof pivots.r2 === "number" ? pivots.r2 : r1;

      if (pivot === 0) return null;

      const currentClose = data[data.length - 1].close;
      const threshold = pivot * 0.01; // 1% 이내

      const nearPivot = Math.abs(currentClose - pivot) <= threshold ||
        Math.abs(currentClose - s1) <= threshold ||
        Math.abs(currentClose - r1) <= threshold;

      let zone: string;
      if (currentClose > r1) zone = "저항_돌파";
      else if (currentClose > pivot) zone = "피벗_상단";
      else if (currentClose > s1) zone = "피벗_하단";
      else zone = "지지_이탈";

      return {
        nearPivot,
        zone,
        support: Math.min(s1, s2),
        resistance: Math.max(r1, r2),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 마스터 인터페이스 & 함수
// ═══════════════════════════════════════════════════════════════════════════════

export interface AdvancedSignals {
  // 기술적 지표
  stochastic: { k: number; d: number } | null;
  williamsR: number | null;
  cci: number | null;
  adx: { adx: number; plusDI: number; minusDI: number } | null;
  obvTrend: Direction;
  ichimoku: { signal: string; cloudTop: number; cloudBottom: number } | null;
  parabolicSAR: { trend: string; sar: number } | null;
  maAlignment: { score: number; aligned: boolean; direction: string };
  supportResistance: {
    support: number;
    resistance: number;
    nearSupport: boolean;
    nearResistance: boolean;
  } | null;
  priceGap: { hasGap: boolean; gapPercent: number; direction: string };

  // 심리 및 시장 구조
  fearGreedComposite: number;
  volatilityRegime: string;
  trendStrength: { strength: number; direction: string };
  momentumDivergence: { hasDivergence: boolean; type: string };
  volumeProfile: { volumeTrend: string; volumeSpike: boolean };
  hhll: { pattern: string; count: number };
  multiTimeframeTrend: { short: string; medium: string; long: string; aligned: boolean };

  // 리스크 평가
  maxDrawdown: number;
  sharpeProxy: number;
  riskRewardRatio: number | null;
  breakoutProbability: { probability: number; direction: string };
  meanReversionScore: number;

  // 확장 기술적 지표 (16개 추가)
  fibonacciZone: { zone: string; nearLevel: boolean; levelName: string } | null;
  keltnerSqueeze: { squeeze: boolean; direction: string } | null;
  multiOscillatorConsensus: { consensus: Direction; strength: number; agreeing: number };
  volumeConfirmation: { confirmed: boolean; divergence: boolean; strength: number };
  smartMoneyFlow: { flow: string; strength: number };
  accumulationDistribution: Direction;
  relativeStrength: number;
  priceChannelPosition: { position: number; channel: string };
  distributionDays: number;
  elderRaySignal: { signal: Direction; bullPower: number; bearPower: number } | null;
  aroonSignal: { trend: Direction; strength: number } | null;
  trixSignal: { direction: Direction; crossover: boolean } | null;
  massIndexReversal: { bulge: boolean; reversalLikely: boolean } | null;
  coppockSignal: { direction: Direction; turning: boolean } | null;
  pivotLevel: { nearPivot: boolean; zone: string; support: number; resistance: number } | null;
  mfiValue: number | null;

  // 종합 점수
  bullishSignalCount: number;
  bearishSignalCount: number;
  overallBias: "강한_상승" | "상승" | "보합" | "하락" | "강한_하락";
  riskLevel: "낮음" | "보통" | "높음" | "매우_높음";
}

/**
 * 모든 고급 분석 지표를 계산하고, 상승/하락 신호를 집계하여 종합 판단을 반환한다.
 * @param data - 가격 데이터 (PriceBar 배열)
 * @param vix  - VIX 값 (선택, 공포/탐욕 지수에 활용)
 */
export function computeAdvancedSignals(data: PriceBar[], vix?: number): AdvancedSignals {
  // ── 기존 개별 지표 계산 ─────────────────────────────────────────────────
  const stochastic = calcStochastic(data);
  const williamsR = calcWilliamsR(data);
  const cci = calcCCI(data);
  const adx = calcADX(data);
  const obvTrend = calcOBVTrend(data);
  const ichimoku = calcIchimokuSignal(data);
  const parabolicSAR = calcParabolicSAR(data);
  const maAlignment = calcMAAlignment(data);
  const supportResistance = calcSupportResistance(data);
  const priceGap = calcPriceGap(data);

  const rsi = calcRSI(data, 14);
  const fearGreedComposite = calcFearGreedComposite(data, vix, rsi ?? undefined);
  const volatilityRegime = calcVolatilityRegime(data);
  const trendStrength = calcTrendStrength(data);
  const momentumDivergence = calcMomentumDivergence(data);
  const volumeProfile = calcVolumeProfile(data);
  const hhll = calcHigherHighsLowerLows(data);
  const multiTimeframeTrend = calcMultiTimeframeTrend(data);

  const maxDrawdown = calcMaxDrawdown(data);
  const sharpeProxy = calcSharpeProxy(data);
  const riskRewardRatio =
    supportResistance !== null
      ? calcRiskRewardRatio(data, supportResistance.support, supportResistance.resistance)
      : null;
  const breakoutProbability = calcBreakoutProbability(data);
  const meanReversionScore = calcMeanReversionScore(data);

  // ── 확장 지표 계산 (새로 추가) ──────────────────────────────────────────
  const fibonacciZone = calcFibonacciZone(data);
  const keltnerSqueeze = calcKeltnerSqueeze(data);
  const multiOscillatorConsensus = calcMultiOscillatorConsensus(data);
  const volumeConfirmation = calcVolumeConfirmation(data);
  const smartMoneyFlow = calcSmartMoneyFlow(data);
  const accumulationDistribution = calcAccumulationDistribution(data);
  const relativeStrength = calcRelativeStrength(data);
  const priceChannelPosition = calcPriceChannelPosition(data);
  const distributionDays = calcDistributionDayCount(data);
  const elderRaySignal = calcElderRaySignal(data);
  const aroonSignal = calcAroonSignal(data);
  const trixSignal = calcTrixSignal(data);
  const massIndexReversal = calcMassIndexReversal(data);
  const coppockSignal = calcCoppockSignal(data);
  const pivotLevel = calcPivotLevel(data);

  // MFI 계산 (안전하게)
  let mfiValue: number | null = null;
  try {
    if (typeof calcMFI === "function") {
      const result = calcMFI(data);
      mfiValue = typeof result === "number" ? result : null;
    }
  } catch { mfiValue = null; }

  // ── 상승/하락 신호 집계 ─────────────────────────────────────────────────
  let bullish = 0;
  let bearish = 0;

  // 스토캐스틱: K < 20 → 상승 반전 기대, K > 80 → 하락 반전 기대
  if (stochastic) {
    if (stochastic.k < 20 && stochastic.k > stochastic.d) bullish++;
    if (stochastic.k > 80 && stochastic.k < stochastic.d) bearish++;
  }

  // 윌리엄스 %R: -80 미만 → 과매도(상승), -20 초과 → 과매수(하락)
  if (williamsR !== null) {
    if (williamsR < -80) bullish++;
    if (williamsR > -20) bearish++;
  }

  // CCI: +100 초과 → 상승, -100 미만 → 하락
  if (cci !== null) {
    if (cci > 100) bullish++;
    if (cci < -100) bearish++;
  }

  // ADX: +DI > -DI → 상승, +DI < -DI → 하락 (ADX > 25일 때만 유의)
  if (adx !== null && adx.adx > 25) {
    if (adx.plusDI > adx.minusDI) bullish++;
    else bearish++;
  }

  // OBV 추세
  if (obvTrend === "상승") bullish++;
  if (obvTrend === "하락") bearish++;

  // 이치모쿠
  if (ichimoku) {
    if (ichimoku.signal === "상승") bullish++;
    if (ichimoku.signal === "하락") bearish++;
  }

  // 파라볼릭 SAR
  if (parabolicSAR) {
    if (parabolicSAR.trend === "상승") bullish++;
    if (parabolicSAR.trend === "하락") bearish++;
  }

  // MA 정배열
  if (maAlignment.aligned) {
    if (maAlignment.direction === "상승") bullish++;
    if (maAlignment.direction === "하락") bearish++;
  }

  // 지지/저항 근접
  if (supportResistance) {
    if (supportResistance.nearSupport) bullish++; // 지지선 근처 → 반등 기대
    if (supportResistance.nearResistance) bearish++; // 저항선 근처 → 조정 기대
  }

  // RSI
  if (rsi !== null) {
    if (rsi < 30) bullish++;
    if (rsi > 70) bearish++;
  }

  // 공포/탐욕 지수
  if (fearGreedComposite < 25) bullish++; // 극단적 공포 → 역투자
  if (fearGreedComposite > 75) bearish++; // 극단적 탐욕 → 역투자

  // 추세 강도
  if (trendStrength.strength > 50) {
    if (trendStrength.direction === "상승") bullish++;
    if (trendStrength.direction === "하락") bearish++;
  }

  // 모멘텀 다이버전스
  if (momentumDivergence.hasDivergence) {
    if (momentumDivergence.type === "bullish") bullish++;
    if (momentumDivergence.type === "bearish") bearish++;
  }

  // 거래량 프로필
  if (volumeProfile.volumeSpike) {
    // 거래량 급등 시 추세 방향 강화
    if (trendStrength.direction === "상승") bullish++;
    if (trendStrength.direction === "하락") bearish++;
  }

  // 고점/저점 패턴
  if (hhll.pattern === "higher-highs") bullish++;
  if (hhll.pattern === "lower-lows") bearish++;

  // 다중 시간프레임 정렬
  if (multiTimeframeTrend.aligned) {
    if (multiTimeframeTrend.short === "상승") bullish++;
    if (multiTimeframeTrend.short === "하락") bearish++;
  }

  // 돌파 확률
  if (breakoutProbability.probability >= 50) {
    if (breakoutProbability.direction === "up") bullish++;
    if (breakoutProbability.direction === "down") bearish++;
  }

  // ── 확장 지표 신호 집계 (새로 추가) ──────────────────────────────────────

  // 피보나치: 지지 근처 → 상승, 저항 근처 → 하락
  if (fibonacciZone && fibonacciZone.nearLevel) {
    const level = fibonacciZone.levelName;
    if (level === "61.8%" || level === "78.6%" || level === "100%") {
      bullish++; // 깊은 되돌림 지지
    } else if (level === "0%" || level === "23.6%") {
      bearish++; // 저항 근처
    }
  }

  // 켈트너 스퀴즈: 스퀴즈 해소 시 방향
  if (keltnerSqueeze) {
    if (keltnerSqueeze.squeeze) {
      // 스퀴즈 상태에서 방향에 따라 돌파 기대
      if (keltnerSqueeze.direction === "상승") bullish++;
      if (keltnerSqueeze.direction === "하락") bearish++;
    }
  }

  // 멀티 오실레이터 합의
  if (multiOscillatorConsensus.strength >= 60) {
    if (multiOscillatorConsensus.consensus === "상승") bullish++;
    if (multiOscillatorConsensus.consensus === "하락") bearish++;
  }

  // 거래량 확인: 추세와 거래량 방향 일치 시 강화
  if (volumeConfirmation.confirmed && !volumeConfirmation.divergence) {
    if (trendStrength.direction === "상승") bullish++;
    if (trendStrength.direction === "하락") bearish++;
  }

  // 스마트 머니 유입/유출
  if (smartMoneyFlow.strength >= 50) {
    if (smartMoneyFlow.flow === "유입") bullish++;
    if (smartMoneyFlow.flow === "유출") bearish++;
  }

  // Elder Ray: 불파워 양수 → 상승, 베어파워 음수 우세 → 하락
  if (elderRaySignal) {
    if (elderRaySignal.signal === "상승") bullish++;
    if (elderRaySignal.signal === "하락") bearish++;
  }

  // Aroon: up > 70 → 상승, down > 70 → 하락
  if (aroonSignal) {
    if (aroonSignal.trend === "상승") bullish++;
    if (aroonSignal.trend === "하락") bearish++;
  }

  // TRIX: 크로스오버 시 방향
  if (trixSignal) {
    if (trixSignal.crossover) {
      if (trixSignal.direction === "상승") bullish++;
      if (trixSignal.direction === "하락") bearish++;
    }
  }

  // Mass Index: 반전 벌지 → 주의 (현재 추세 반대 방향)
  if (massIndexReversal && massIndexReversal.reversalLikely) {
    if (trendStrength.direction === "상승") bearish++; // 상승 추세 반전 경고
    if (trendStrength.direction === "하락") bullish++; // 하락 추세 반전 기대
  }

  // Coppock Curve: 전환점
  if (coppockSignal) {
    if (coppockSignal.turning) {
      if (coppockSignal.direction === "상승") bullish++;
      if (coppockSignal.direction === "하락") bearish++;
    }
  }

  // MFI: 과매도 → 상승, 과매수 → 하락
  if (mfiValue !== null) {
    if (mfiValue < 20) bullish++;   // MFI 과매도
    if (mfiValue > 80) bearish++;   // MFI 과매수
  }

  // 피벗 포인트: 지지 근처 → 상승, 저항 근처 → 하락
  if (pivotLevel) {
    if (pivotLevel.zone === "지지_이탈") bullish++;      // 과매도 반등 기대
    if (pivotLevel.zone === "저항_돌파") bearish++;      // 과매수 조정 기대
    if (pivotLevel.nearPivot && pivotLevel.zone === "피벗_하단") bullish++;
    if (pivotLevel.nearPivot && pivotLevel.zone === "피벗_상단") bearish++;
  }

  // ── 종합 판단 ───────────────────────────────────────────────────────────
  const net = bullish - bearish;
  const total = bullish + bearish;

  let overallBias: "강한_상승" | "상승" | "보합" | "하락" | "강한_하락";
  if (total === 0) {
    overallBias = "보합";
  } else {
    const ratio = net / total;
    if (ratio > 0.6) overallBias = "강한_상승";
    else if (ratio > 0.2) overallBias = "상승";
    else if (ratio > -0.2) overallBias = "보합";
    else if (ratio > -0.6) overallBias = "하락";
    else overallBias = "강한_하락";
  }

  // 리스크 레벨 결정
  let riskLevel: "낮음" | "보통" | "높음" | "매우_높음";
  const volRegime = volatilityRegime;
  if (volRegime === "extreme" || maxDrawdown > 15) {
    riskLevel = "매우_높음";
  } else if (volRegime === "high" || maxDrawdown > 10) {
    riskLevel = "높음";
  } else if (volRegime === "normal" || maxDrawdown > 5) {
    riskLevel = "보통";
  } else {
    riskLevel = "낮음";
  }

  return {
    stochastic,
    williamsR,
    cci,
    adx,
    obvTrend,
    ichimoku,
    parabolicSAR,
    maAlignment,
    supportResistance,
    priceGap,
    fearGreedComposite,
    volatilityRegime,
    trendStrength,
    momentumDivergence,
    volumeProfile,
    hhll,
    multiTimeframeTrend,
    maxDrawdown,
    sharpeProxy,
    riskRewardRatio,
    breakoutProbability,
    meanReversionScore,
    // 확장 지표
    fibonacciZone,
    keltnerSqueeze,
    multiOscillatorConsensus,
    volumeConfirmation,
    smartMoneyFlow,
    accumulationDistribution,
    relativeStrength,
    priceChannelPosition,
    distributionDays,
    elderRaySignal,
    aroonSignal,
    trixSignal,
    massIndexReversal,
    coppockSignal,
    pivotLevel,
    mfiValue,
    // 종합
    bullishSignalCount: bullish,
    bearishSignalCount: bearish,
    overallBias,
    riskLevel,
  };
}
