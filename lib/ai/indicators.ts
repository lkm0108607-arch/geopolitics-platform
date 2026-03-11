/**
 * 기술적 지표 계산 모듈
 * 순수 함수로 구현 — 외부 의존성 없음
 */

export interface PriceBar {
  close: number;
  high?: number;
  low?: number;
  volume?: number;
}

// ─── SMA (Simple Moving Average) ──────────────────────────────────────────────

export function calcSMA(data: PriceBar[], period: number): number | null {
  if (data.length < period || period <= 0) return null;
  const slice = data.slice(-period);
  const sum = slice.reduce((acc, bar) => acc + bar.close, 0);
  return sum / period;
}

/**
 * 전체 시계열에 대한 SMA 배열을 반환한다.
 * 데이터가 부족한 앞부분은 null로 채운다.
 */
export function calcSMASeries(data: PriceBar[], period: number): (number | null)[] {
  if (period <= 0) return data.map(() => null);
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i + 1 < period) {
      result.push(null);
    } else {
      const slice = data.slice(i + 1 - period, i + 1);
      const sum = slice.reduce((acc, bar) => acc + bar.close, 0);
      result.push(sum / period);
    }
  }
  return result;
}

// ─── EMA (Exponential Moving Average) ─────────────────────────────────────────

export function calcEMA(data: PriceBar[], period: number): number | null {
  if (data.length < period || period <= 0) return null;
  const k = 2 / (period + 1);
  // 첫 번째 EMA는 SMA로 초기화
  let ema = data.slice(0, period).reduce((acc, bar) => acc + bar.close, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
  }
  return ema;
}

export function calcEMASeries(data: PriceBar[], period: number): (number | null)[] {
  if (period <= 0 || data.length < period) return data.map(() => null);
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];

  // period 이전은 null
  for (let i = 0; i < period - 1; i++) {
    result.push(null);
  }

  // 첫 EMA = SMA
  let ema = data.slice(0, period).reduce((acc, bar) => acc + bar.close, 0) / period;
  result.push(ema);

  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

// ─── RSI (Relative Strength Index) ────────────────────────────────────────────

export function calcRSI(data: PriceBar[], period: number = 14): number | null {
  if (data.length < period + 1 || period <= 0) return null;

  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change >= 0) gainSum += change;
    else lossSum += Math.abs(change);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  // Wilder의 평활화 방식
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ─── MACD (Moving Average Convergence Divergence) ─────────────────────────────

export interface MACDResult {
  macdLine: number;
  signalLine: number;
  histogram: number;
}

export function calcMACD(
  data: PriceBar[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9,
): MACDResult | null {
  // MACD 라인 계산에 최소 slowPeriod, 시그널 계산에 추가 signalPeriod 필요
  const minLen = slowPeriod + signalPeriod;
  if (data.length < minLen || fastPeriod <= 0 || slowPeriod <= 0 || signalPeriod <= 0) {
    return null;
  }

  const fastEMASeries = calcEMASeries(data, fastPeriod);
  const slowEMASeries = calcEMASeries(data, slowPeriod);

  // MACD 라인 시리즈 (slowPeriod-1 인덱스부터 유효)
  const macdSeries: number[] = [];
  for (let i = slowPeriod - 1; i < data.length; i++) {
    const fast = fastEMASeries[i];
    const slow = slowEMASeries[i];
    if (fast !== null && slow !== null) {
      macdSeries.push(fast - slow);
    }
  }

  if (macdSeries.length < signalPeriod) return null;

  // 시그널 라인 = MACD 라인의 EMA
  const sigK = 2 / (signalPeriod + 1);
  let signal =
    macdSeries.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;

  for (let i = signalPeriod; i < macdSeries.length; i++) {
    signal = macdSeries[i] * sigK + signal * (1 - sigK);
  }

  const macdLine = macdSeries[macdSeries.length - 1];
  return {
    macdLine,
    signalLine: signal,
    histogram: macdLine - signal,
  };
}

// ─── Bollinger Bands ──────────────────────────────────────────────────────────

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  width: number;         // (upper - lower) / middle — 밴드 폭 비율
  percentB: number;      // (close - lower) / (upper - lower)
}

export function calcBollingerBands(
  data: PriceBar[],
  period: number = 20,
  multiplier: number = 2,
): BollingerBandsResult | null {
  if (data.length < period || period <= 0) return null;

  const slice = data.slice(-period);
  const middle = slice.reduce((acc, bar) => acc + bar.close, 0) / period;

  const variance =
    slice.reduce((acc, bar) => acc + (bar.close - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = middle + multiplier * stdDev;
  const lower = middle - multiplier * stdDev;
  const currentClose = data[data.length - 1].close;

  const bandRange = upper - lower;
  return {
    upper,
    middle,
    lower,
    width: middle !== 0 ? bandRange / middle : 0,
    percentB: bandRange !== 0 ? (currentClose - lower) / bandRange : 0.5,
  };
}

// ─── ATR (Average True Range) ─────────────────────────────────────────────────

export function calcATR(data: PriceBar[], period: number = 14): number | null {
  if (data.length < period + 1 || period <= 0) return null;

  // True Range 계산에 high, low 필요
  for (const bar of data) {
    if (bar.high === undefined || bar.low === undefined) return null;
  }

  const trueRanges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high!;
    const low = data[i].low!;
    const prevClose = data[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return null;

  // 첫 ATR = 단순 평균
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Wilder 평활화
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
}

// ─── Rate of Change (Momentum) ────────────────────────────────────────────────

export function calcROC(data: PriceBar[], period: number = 12): number | null {
  if (data.length < period + 1 || period <= 0) return null;
  const current = data[data.length - 1].close;
  const previous = data[data.length - 1 - period].close;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
