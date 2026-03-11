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

// ─── Fibonacci Retracement Levels ───────────────────────────────────────────

export interface FibonacciResult {
  levels: number[];
  currentZone: string;
}

export function calcFibonacciLevels(data: PriceBar[], lookback: number = 50): FibonacciResult | null {
  if (data.length < lookback || lookback <= 0) return null;
  const slice = data.slice(-lookback);
  const high = Math.max(...slice.map(b => b.high ?? b.close));
  const low = Math.min(...slice.map(b => b.low ?? b.close));
  const diff = high - low;
  if (diff === 0) return null;

  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const levels = ratios.map(r => high - diff * r);
  const current = data[data.length - 1].close;

  // 현재 가격이 속한 구간 판별
  let zone = 'above';
  for (let i = 0; i < levels.length - 1; i++) {
    if (current <= levels[i] && current >= levels[i + 1]) {
      zone = `${ratios[i] * 100}%-${ratios[i + 1] * 100}%`;
      break;
    }
  }
  if (current < levels[levels.length - 1]) zone = 'below';

  return { levels, currentZone: zone };
}

// ─── VWAP (Volume Weighted Average Price) ───────────────────────────────────

export function calcVWAP(data: PriceBar[], period: number = 20): number | null {
  if (data.length < period || period <= 0) return null;
  const slice = data.slice(-period);

  let cumulativeTPV = 0;
  let cumulativeVol = 0;
  for (const bar of slice) {
    const vol = bar.volume ?? 0;
    if (vol === 0) continue;
    const tp = ((bar.high ?? bar.close) + (bar.low ?? bar.close) + bar.close) / 3;
    cumulativeTPV += tp * vol;
    cumulativeVol += vol;
  }

  return cumulativeVol > 0 ? cumulativeTPV / cumulativeVol : null;
}

// ─── MFI (Money Flow Index) ─────────────────────────────────────────────────

export function calcMFI(data: PriceBar[], period: number = 14): number | null {
  if (data.length < period + 1 || period <= 0) return null;
  for (const bar of data) {
    if (bar.high === undefined || bar.low === undefined || bar.volume === undefined) return null;
  }

  let positiveFlow = 0;
  let negativeFlow = 0;
  const slice = data.slice(-(period + 1));

  for (let i = 1; i < slice.length; i++) {
    const tp = (slice[i].high! + slice[i].low! + slice[i].close) / 3;
    const prevTp = (slice[i - 1].high! + slice[i - 1].low! + slice[i - 1].close) / 3;
    const rawFlow = tp * slice[i].volume!;
    if (tp > prevTp) positiveFlow += rawFlow;
    else if (tp < prevTp) negativeFlow += rawFlow;
  }

  if (negativeFlow === 0) return 100;
  const mfRatio = positiveFlow / negativeFlow;
  return 100 - 100 / (1 + mfRatio);
}

// ─── Keltner Channels ───────────────────────────────────────────────────────

export interface KeltnerResult {
  upper: number;
  middle: number;
  lower: number;
  squeeze: boolean;
}

export function calcKeltnerChannels(
  data: PriceBar[],
  period: number = 20,
  mult: number = 1.5,
): KeltnerResult | null {
  const ema = calcEMA(data, period);
  const atr = calcATR(data, period);
  if (ema === null || atr === null) return null;

  const upper = ema + mult * atr;
  const lower = ema - mult * atr;

  // 볼린저 밴드와 비교하여 스퀴즈 감지
  const bb = calcBollingerBands(data, period, 2);
  const squeeze = bb !== null && bb.lower > lower && bb.upper < upper;

  return { upper, middle: ema, lower, squeeze };
}

// ─── Donchian Channels ──────────────────────────────────────────────────────

export interface DonchianResult {
  upper: number;
  lower: number;
  mid: number;
  width: number;
}

export function calcDonchianChannels(data: PriceBar[], period: number = 20): DonchianResult | null {
  if (data.length < period || period <= 0) return null;
  const slice = data.slice(-period);
  const upper = Math.max(...slice.map(b => b.high ?? b.close));
  const lower = Math.min(...slice.map(b => b.low ?? b.close));
  const mid = (upper + lower) / 2;
  return { upper, lower, mid, width: upper - lower };
}

// ─── CMF (Chaikin Money Flow) ───────────────────────────────────────────────

export function calcCMF(data: PriceBar[], period: number = 20): number | null {
  if (data.length < period || period <= 0) return null;
  const slice = data.slice(-period);

  let mfvSum = 0;
  let volSum = 0;
  for (const bar of slice) {
    const high = bar.high ?? bar.close;
    const low = bar.low ?? bar.close;
    const vol = bar.volume ?? 0;
    const range = high - low;
    const clv = range !== 0 ? ((bar.close - low) - (high - bar.close)) / range : 0;
    mfvSum += clv * vol;
    volSum += vol;
  }

  return volSum !== 0 ? mfvSum / volSum : null;
}

// ─── Aroon Indicator ────────────────────────────────────────────────────────

export interface AroonResult {
  up: number;
  down: number;
  oscillator: number;
}

export function calcAroon(data: PriceBar[], period: number = 25): AroonResult | null {
  if (data.length < period + 1 || period <= 0) return null;
  const slice = data.slice(-(period + 1));

  let highIdx = 0;
  let lowIdx = 0;
  let highVal = -Infinity;
  let lowVal = Infinity;

  for (let i = 0; i < slice.length; i++) {
    const h = slice[i].high ?? slice[i].close;
    const l = slice[i].low ?? slice[i].close;
    if (h >= highVal) { highVal = h; highIdx = i; }
    if (l <= lowVal) { lowVal = l; lowIdx = i; }
  }

  const up = ((highIdx) / period) * 100;
  const down = ((lowIdx) / period) * 100;
  return { up, down, oscillator: up - down };
}

// ─── Elder Ray (Bull/Bear Power) ────────────────────────────────────────────

export interface ElderRayResult {
  bullPower: number;
  bearPower: number;
}

export function calcElderRay(data: PriceBar[], period: number = 13): ElderRayResult | null {
  const ema = calcEMA(data, period);
  if (ema === null) return null;
  const last = data[data.length - 1];
  const high = last.high ?? last.close;
  const low = last.low ?? last.close;
  return { bullPower: high - ema, bearPower: low - ema };
}

// ─── Ultimate Oscillator ────────────────────────────────────────────────────

export function calcUltimateOscillator(data: PriceBar[]): number | null {
  const minLen = 28 + 1; // 최소 29개 데이터
  if (data.length < minLen) return null;
  for (const bar of data) {
    if (bar.high === undefined || bar.low === undefined) return null;
  }

  const bpArr: number[] = [];
  const trArr: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const low = Math.min(data[i].low!, data[i - 1].close);
    const high = Math.max(data[i].high!, data[i - 1].close);
    bpArr.push(data[i].close - low);
    trArr.push(high - low);
  }

  const sumSlice = (arr: number[], len: number) =>
    arr.slice(-len).reduce((a, b) => a + b, 0);

  const avg7 = sumSlice(bpArr, 7) / sumSlice(trArr, 7);
  const avg14 = sumSlice(bpArr, 14) / sumSlice(trArr, 14);
  const avg28 = sumSlice(bpArr, 28) / sumSlice(trArr, 28);

  if (!isFinite(avg7) || !isFinite(avg14) || !isFinite(avg28)) return null;
  return (100 * (4 * avg7 + 2 * avg14 + avg28)) / 7;
}

// ─── Force Index ────────────────────────────────────────────────────────────

export function calcForceIndex(data: PriceBar[], period: number = 13): number | null {
  if (data.length < period + 1 || period <= 0) return null;
  for (const bar of data) {
    if (bar.volume === undefined) return null;
  }

  // 1기간 Force Index 시리즈 계산
  const fiSeries: PriceBar[] = [];
  for (let i = 1; i < data.length; i++) {
    fiSeries.push({
      close: (data[i].close - data[i - 1].close) * data[i].volume!,
    });
  }

  return calcEMA(fiSeries, period);
}

// ─── OBV Trend ──────────────────────────────────────────────────────────────

export interface OBVTrendResult {
  trend: '상승' | '하락' | '보합';
  divergence: boolean;
}

export function calcOBVTrend(data: PriceBar[]): OBVTrendResult | null {
  if (data.length < 20) return null;
  for (const bar of data) {
    if (bar.volume === undefined) return null;
  }

  // OBV 시리즈 생성
  const obv: number[] = [0];
  for (let i = 1; i < data.length; i++) {
    const prev = obv[i - 1];
    if (data[i].close > data[i - 1].close) obv.push(prev + data[i].volume!);
    else if (data[i].close < data[i - 1].close) obv.push(prev - data[i].volume!);
    else obv.push(prev);
  }

  // 최근 10기간의 추세 판별 (선형 회귀 기울기)
  const recent = obv.slice(-10);
  const n = recent.length;
  const xMean = (n - 1) / 2;
  const yMean = recent.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (recent[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;

  const threshold = Math.abs(yMean) * 0.001;
  const trend = slope > threshold ? '상승' : slope < -threshold ? '하락' : '보합';

  // 다이버전스: 가격과 OBV 방향이 다른 경우
  const priceChange = data[data.length - 1].close - data[data.length - 10].close;
  const divergence = (priceChange > 0 && slope < -threshold) || (priceChange < 0 && slope > threshold);

  return { trend, divergence };
}

// ─── TRIX ───────────────────────────────────────────────────────────────────

export function calcTrix(data: PriceBar[], period: number = 15): number | null {
  if (data.length < period * 3 + 1 || period <= 0) return null;

  // 3중 EMA 계산
  const ema1 = calcEMASeries(data, period);
  const ema1Bars: PriceBar[] = ema1
    .filter((v): v is number => v !== null)
    .map(v => ({ close: v }));

  if (ema1Bars.length < period) return null;
  const ema2 = calcEMASeries(ema1Bars, period);
  const ema2Bars: PriceBar[] = ema2
    .filter((v): v is number => v !== null)
    .map(v => ({ close: v }));

  if (ema2Bars.length < period) return null;
  const ema3 = calcEMASeries(ema2Bars, period);
  const valid = ema3.filter((v): v is number => v !== null);

  if (valid.length < 2) return null;
  const prev = valid[valid.length - 2];
  const curr = valid[valid.length - 1];
  return prev !== 0 ? ((curr - prev) / prev) * 100 : null;
}

// ─── Mass Index ─────────────────────────────────────────────────────────────

export function calcMassIndex(data: PriceBar[], period: number = 25): number | null {
  if (data.length < period + 18 || period <= 0) return null; // 9기간 EMA 두 번 적용
  for (const bar of data) {
    if (bar.high === undefined || bar.low === undefined) return null;
  }

  // High-Low 차이 시리즈
  const hlBars: PriceBar[] = data.map(b => ({ close: b.high! - b.low! }));

  // 단일 EMA (9기간)
  const singleEMA = calcEMASeries(hlBars, 9);
  const singleBars: PriceBar[] = singleEMA
    .filter((v): v is number => v !== null)
    .map(v => ({ close: v }));

  if (singleBars.length < 9) return null;
  // 이중 EMA (9기간)
  const doubleEMA = calcEMASeries(singleBars, 9);
  const doubleValid = doubleEMA.filter((v): v is number => v !== null);
  const singleValid = singleEMA.filter((v): v is number => v !== null);

  if (doubleValid.length < period || singleValid.length < period) return null;

  // EMA ratio 합산
  let sum = 0;
  const sLen = singleValid.length;
  const dLen = doubleValid.length;
  for (let i = 0; i < period; i++) {
    const s = singleValid[sLen - period + i];
    const d = doubleValid[dLen - period + i];
    if (d === 0) return null;
    sum += s / d;
  }

  return sum;
}

// ─── Coppock Curve ──────────────────────────────────────────────────────────

export function calcCoppockCurve(data: PriceBar[]): number | null {
  // ROC(14) + ROC(11)의 10기간 WMA
  const minLen = 14 + 10;
  if (data.length < minLen) return null;

  const rocSeries: number[] = [];
  for (let i = 14; i < data.length; i++) {
    const roc14 = data[i - 14].close !== 0
      ? ((data[i].close - data[i - 14].close) / data[i - 14].close) * 100
      : 0;
    const roc11 = i >= 11 && data[i - 11].close !== 0
      ? ((data[i].close - data[i - 11].close) / data[i - 11].close) * 100
      : 0;
    rocSeries.push(roc14 + roc11);
  }

  if (rocSeries.length < 10) return null;

  // 10기간 WMA (Weighted Moving Average)
  const slice = rocSeries.slice(-10);
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < 10; i++) {
    const w = i + 1;
    weightedSum += slice[i] * w;
    weightTotal += w;
  }

  return weightedSum / weightTotal;
}

// ─── Pivot Points ───────────────────────────────────────────────────────────

export interface PivotPointsResult {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export function calcPivotPoints(data: PriceBar[]): PivotPointsResult | null {
  if (data.length < 1) return null;
  const bar = data[data.length - 1];
  const high = bar.high ?? bar.close;
  const low = bar.low ?? bar.close;
  const close = bar.close;

  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);
  const r3 = high + 2 * (pivot - low);
  const s3 = low - 2 * (high - pivot);

  return { pivot, r1, r2, r3, s1, s2, s3 };
}

// ─── DMI (Directional Movement Index) ───────────────────────────────────────

export interface DMIResult {
  diPlus: number;
  diMinus: number;
  dx: number;
}

export function calcDMI(data: PriceBar[], period: number = 14): DMIResult | null {
  if (data.length < period + 1 || period <= 0) return null;
  for (const bar of data) {
    if (bar.high === undefined || bar.low === undefined) return null;
  }

  let smoothDMPlus = 0;
  let smoothDMMinus = 0;
  let smoothTR = 0;

  // 초기 period 구간의 합
  for (let i = 1; i <= period; i++) {
    const high = data[i].high!;
    const low = data[i].low!;
    const prevHigh = data[i - 1].high!;
    const prevLow = data[i - 1].low!;
    const prevClose = data[i - 1].close;

    const upMove = high - prevHigh;
    const downMove = prevLow - low;
    smoothDMPlus += upMove > downMove && upMove > 0 ? upMove : 0;
    smoothDMMinus += downMove > upMove && downMove > 0 ? downMove : 0;
    smoothTR += Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }

  // Wilder 평활화
  for (let i = period + 1; i < data.length; i++) {
    const high = data[i].high!;
    const low = data[i].low!;
    const prevHigh = data[i - 1].high!;
    const prevLow = data[i - 1].low!;
    const prevClose = data[i - 1].close;

    const upMove = high - prevHigh;
    const downMove = prevLow - low;
    const dmPlus = upMove > downMove && upMove > 0 ? upMove : 0;
    const dmMinus = downMove > upMove && downMove > 0 ? downMove : 0;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));

    smoothDMPlus = smoothDMPlus - smoothDMPlus / period + dmPlus;
    smoothDMMinus = smoothDMMinus - smoothDMMinus / period + dmMinus;
    smoothTR = smoothTR - smoothTR / period + tr;
  }

  if (smoothTR === 0) return null;
  const diPlus = (smoothDMPlus / smoothTR) * 100;
  const diMinus = (smoothDMMinus / smoothTR) * 100;
  const diSum = diPlus + diMinus;
  const dx = diSum !== 0 ? (Math.abs(diPlus - diMinus) / diSum) * 100 : 0;

  return { diPlus, diMinus, dx };
}
