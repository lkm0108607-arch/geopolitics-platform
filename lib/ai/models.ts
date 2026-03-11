/**
 * 4개 서브모델 구현
 * 각 모델은 독립적으로 시장 방향에 대한 투표(ModelVote)를 생성한다.
 */

import {
  PriceBar,
  calcSMA,
  calcEMA,
  calcRSI,
  calcMACD,
  calcBollingerBands,
  calcATR,
  calcROC,
} from "./indicators";
import type { CollectedData } from "./dataCollector";
import type { FundamentalSignal } from "./fundamentalAnalysis";
import { computeAdvancedSignals, type AdvancedSignals } from "./advancedAnalysis";

// ─── 공통 타입 ────────────────────────────────────────────────────────────────

export type Direction = "상승" | "하락" | "보합" | "변동성확대";

export interface ModelVote {
  direction: Direction;
  confidence: number; // 0-100
  rationale: string;  // 한국어 설명
}

// ─── (a) 모멘텀 모델 ──────────────────────────────────────────────────────────
// SMA 교차, MACD 시그널, RSI 추세를 종합한다.

export function momentumModel(data: PriceBar[], advancedSignals?: AdvancedSignals): ModelVote {
  const signals: { bullish: number; bearish: number } = { bullish: 0, bearish: 0 };
  const reasons: string[] = [];

  // SMA 교차 (단기 10일 vs 장기 50일)
  const smaShort = calcSMA(data, 10);
  const smaLong = calcSMA(data, 50);

  if (smaShort !== null && smaLong !== null) {
    const crossRatio = ((smaShort - smaLong) / smaLong) * 100;
    if (smaShort > smaLong) {
      signals.bullish += 2;
      reasons.push(
        `단기 이평선(10일)이 장기 이평선(50일) 상회 중 (괴리율 ${crossRatio.toFixed(1)}%)`,
      );
    } else {
      signals.bearish += 2;
      reasons.push(
        `단기 이평선(10일)이 장기 이평선(50일) 하회 중 (괴리율 ${crossRatio.toFixed(1)}%)`,
      );
    }
  }

  // EMA 20일 대비 현재가 위치
  const ema20 = calcEMA(data, 20);
  if (ema20 !== null && data.length > 0) {
    const currentPrice = data[data.length - 1].close;
    if (currentPrice > ema20) {
      signals.bullish += 1;
      reasons.push(`현재가가 EMA(20) 위에 위치하여 상승 추세 유지 중`);
    } else {
      signals.bearish += 1;
      reasons.push(`현재가가 EMA(20) 아래에 위치하여 하락 추세 유지 중`);
    }
  }

  // MACD
  const macd = calcMACD(data);
  if (macd !== null) {
    if (macd.histogram > 0 && macd.macdLine > 0) {
      signals.bullish += 2;
      reasons.push(
        `MACD 히스토그램 양수(${macd.histogram.toFixed(2)}), 상승 모멘텀 확인`,
      );
    } else if (macd.histogram < 0 && macd.macdLine < 0) {
      signals.bearish += 2;
      reasons.push(
        `MACD 히스토그램 음수(${macd.histogram.toFixed(2)}), 하락 모멘텀 확인`,
      );
    } else if (macd.histogram > 0) {
      signals.bullish += 1;
      reasons.push(`MACD 히스토그램 양전환, 모멘텀 개선 조짐`);
    } else {
      signals.bearish += 1;
      reasons.push(`MACD 히스토그램 음전환, 모멘텀 약화 조짐`);
    }
  }

  // RSI 추세
  const rsi = calcRSI(data);
  if (rsi !== null) {
    if (rsi > 50 && rsi < 70) {
      signals.bullish += 1;
      reasons.push(`RSI ${rsi.toFixed(1)}로 상승 추세 영역`);
    } else if (rsi < 50 && rsi > 30) {
      signals.bearish += 1;
      reasons.push(`RSI ${rsi.toFixed(1)}로 하락 추세 영역`);
    }
  }

  // ROC (12일)
  const roc = calcROC(data, 12);
  if (roc !== null) {
    if (roc > 3) {
      signals.bullish += 1;
      reasons.push(`12일 변화율 ${roc.toFixed(1)}%로 강한 상승 모멘텀`);
    } else if (roc < -3) {
      signals.bearish += 1;
      reasons.push(`12일 변화율 ${roc.toFixed(1)}%로 강한 하락 모멘텀`);
    }
  }

  // ─── 고급 모멘텀 시그널 (advancedSignals 제공 시) ───
  if (advancedSignals) {
    // Stochastic 오실레이터 K/D 교차
    if (advancedSignals.stochastic) {
      const { k, d } = advancedSignals.stochastic;
      if (k > d && k < 20) {
        signals.bullish += 2;
        reasons.push(`스토캐스틱 K(${k.toFixed(1)})가 D(${d.toFixed(1)}) 상향 교차 (과매도 영역). 강한 반등 시그널`);
      } else if (k > d && k < 50) {
        signals.bullish += 1;
        reasons.push(`스토캐스틱 K(${k.toFixed(1)})가 D(${d.toFixed(1)}) 상향 교차. 상승 모멘텀 전환`);
      } else if (k < d && k > 80) {
        signals.bearish += 2;
        reasons.push(`스토캐스틱 K(${k.toFixed(1)})가 D(${d.toFixed(1)}) 하향 교차 (과매수 영역). 강한 하락 시그널`);
      } else if (k < d && k > 50) {
        signals.bearish += 1;
        reasons.push(`스토캐스틱 K(${k.toFixed(1)})가 D(${d.toFixed(1)}) 하향 교차. 하락 모멘텀 전환`);
      }
    }

    // ADX 추세 강도 확인
    if (advancedSignals.adx != null) {
      const adxVal = advancedSignals.adx.adx;
      if (adxVal > 40) {
        const trendDir = signals.bullish >= signals.bearish ? "bullish" : "bearish";
        if (trendDir === "bullish") {
          signals.bullish += 2;
        } else {
          signals.bearish += 2;
        }
        reasons.push(`ADX ${adxVal.toFixed(1)}로 매우 강한 추세 확인. 현 방향 지속 가능성 높음`);
      } else if (adxVal > 25) {
        const trendDir = signals.bullish >= signals.bearish ? "bullish" : "bearish";
        if (trendDir === "bullish") {
          signals.bullish += 1;
        } else {
          signals.bearish += 1;
        }
        reasons.push(`ADX ${adxVal.toFixed(1)}로 추세 존재 확인`);
      } else {
        reasons.push(`ADX ${adxVal.toFixed(1)}로 추세 미약. 횡보 가능성`);
      }
    }

    // MA 정렬 점수 (모든 이동평균이 정렬된 상태 = 강한 추세)
    {
      const maScore = advancedSignals.maAlignment.score;
      if (maScore > 80) {
        signals.bullish += 2;
        reasons.push(`이동평균 정렬 점수 ${maScore.toFixed(0)}%. 모든 MA 상승 정렬로 강한 상승 추세`);
      } else if (maScore > 50) {
        signals.bullish += 1;
        reasons.push(`이동평균 정렬 점수 ${maScore.toFixed(0)}%. 부분적 상승 정렬`);
      } else if (maScore < 20) {
        signals.bearish += 2;
        reasons.push(`이동평균 정렬 점수 ${maScore.toFixed(0)}%. 모든 MA 하락 정렬로 강한 하락 추세`);
      } else if (maScore < 40) {
        signals.bearish += 1;
        reasons.push(`이동평균 정렬 점수 ${maScore.toFixed(0)}%. 부분적 하락 정렬`);
      }
    }

    // 멀티 타임프레임 추세 정렬
    if (advancedSignals.multiTimeframeTrend) {
      const { short, medium, long } = advancedSignals.multiTimeframeTrend;
      if (short === "상승" && medium === "상승" && long === "상승") {
        signals.bullish += 2;
        reasons.push(`단기·중기·장기 모든 타임프레임 상승 추세 정렬. 매우 강한 상승 시그널`);
      } else if (short === "하락" && medium === "하락" && long === "하락") {
        signals.bearish += 2;
        reasons.push(`단기·중기·장기 모든 타임프레임 하락 추세 정렬. 매우 강한 하락 시그널`);
      } else if (short === "상승" && medium === "상승") {
        signals.bullish += 1;
        reasons.push(`단기·중기 타임프레임 상승 정렬`);
      } else if (short === "하락" && medium === "하락") {
        signals.bearish += 1;
        reasons.push(`단기·중기 타임프레임 하락 정렬`);
      }
    }

    // Parabolic SAR 확인
    if (advancedSignals.parabolicSAR) {
      if (advancedSignals.parabolicSAR.trend === "하락") {
        signals.bearish += 1;
        reasons.push(`Parabolic SAR이 가격 위에 위치. 하락 추세 확인`);
      } else if (advancedSignals.parabolicSAR.trend === "상승") {
        signals.bullish += 1;
        reasons.push(`Parabolic SAR이 가격 아래에 위치. 상승 추세 확인`);
      }
    }

    // Higher Highs / Lower Lows 패턴
    if (advancedSignals.hhll) {
      const { pattern } = advancedSignals.hhll;
      if (pattern === "higher-highs") {
        signals.bullish += 2;
        reasons.push(`Higher Highs 패턴 감지. 건전한 상승 추세 구조`);
      } else if (pattern === "lower-lows") {
        signals.bearish += 2;
        reasons.push(`Lower Lows 패턴 감지. 건전한 하락 추세 구조`);
      } else {
        reasons.push(`혼조된 고점/저점 패턴. 추세 전환 가능성 주시 필요`);
      }
    }
  }

  const total = signals.bullish + signals.bearish;
  if (total === 0) {
    return { direction: "보합", confidence: 30, rationale: "모멘텀 지표 데이터 부족" };
  }

  const bullishRatio = signals.bullish / total;
  const bearishRatio = signals.bearish / total;
  const dominantRatio = Math.max(bullishRatio, bearishRatio);
  const confidence = Math.round(dominantRatio * 80 + 10); // 10-90 범위

  let direction: Direction;
  if (bullishRatio > 0.6) {
    direction = "상승";
  } else if (bearishRatio > 0.6) {
    direction = "하락";
  } else {
    direction = "보합";
  }

  return {
    direction,
    confidence: Math.min(confidence, 95),
    rationale: `[모멘텀] ${reasons.join(". ")}`,
  };
}

// ─── (b) 평균 회귀 모델 ───────────────────────────────────────────────────────
// RSI 극단값과 볼린저 밴드 위치로 과매수/과매도를 판단한다.

export function meanReversionModel(data: PriceBar[], advancedSignals?: AdvancedSignals): ModelVote {
  const signals: { bullish: number; bearish: number } = { bullish: 0, bearish: 0 };
  const reasons: string[] = [];

  // RSI 극단값
  const rsi = calcRSI(data);
  if (rsi !== null) {
    if (rsi >= 80) {
      signals.bearish += 3;
      reasons.push(
        `RSI ${rsi.toFixed(1)}로 극심한 과매수 구간. 강한 되돌림 가능성`,
      );
    } else if (rsi >= 70) {
      signals.bearish += 2;
      reasons.push(
        `RSI ${rsi.toFixed(1)}로 과매수 구간 진입. 단기 조정 가능성 높음`,
      );
    } else if (rsi <= 20) {
      signals.bullish += 3;
      reasons.push(
        `RSI ${rsi.toFixed(1)}로 극심한 과매도 구간. 강한 반등 가능성`,
      );
    } else if (rsi <= 30) {
      signals.bullish += 2;
      reasons.push(
        `RSI ${rsi.toFixed(1)}로 과매도 구간 진입. 반등 가능성 높음`,
      );
    } else if (rsi >= 60) {
      signals.bearish += 1;
      reasons.push(`RSI ${rsi.toFixed(1)}, 과열 주의 구간 접근 중`);
    } else if (rsi <= 40) {
      signals.bullish += 1;
      reasons.push(`RSI ${rsi.toFixed(1)}, 과매도 주의 구간 접근 중`);
    }
  }

  // 볼린저 밴드 위치
  const bb = calcBollingerBands(data);
  if (bb !== null) {
    if (bb.percentB >= 1.0) {
      signals.bearish += 2;
      reasons.push(
        `현재가가 볼린저 밴드 상단 돌파 (%B=${(bb.percentB * 100).toFixed(0)}%). 평균 회귀 하락 예상`,
      );
    } else if (bb.percentB >= 0.8) {
      signals.bearish += 1;
      reasons.push(
        `볼린저 밴드 상단 접근 중 (%B=${(bb.percentB * 100).toFixed(0)}%). 저항 가능성`,
      );
    } else if (bb.percentB <= 0.0) {
      signals.bullish += 2;
      reasons.push(
        `현재가가 볼린저 밴드 하단 이탈 (%B=${(bb.percentB * 100).toFixed(0)}%). 평균 회귀 반등 예상`,
      );
    } else if (bb.percentB <= 0.2) {
      signals.bullish += 1;
      reasons.push(
        `볼린저 밴드 하단 접근 중 (%B=${(bb.percentB * 100).toFixed(0)}%). 지지 가능성`,
      );
    }
  }

  // ─── 고급 평균회귀 시그널 (advancedSignals 제공 시) ───
  if (advancedSignals) {
    // Williams %R 과매수/과매도
    if (advancedSignals.williamsR != null) {
      const wr = advancedSignals.williamsR;
      if (wr > -20) {
        signals.bearish += 2;
        reasons.push(`Williams %%R ${wr.toFixed(1)}로 과매수 영역. 하락 반전 가능성`);
      } else if (wr > -30) {
        signals.bearish += 1;
        reasons.push(`Williams %%R ${wr.toFixed(1)}로 과매수 접근 중`);
      } else if (wr < -80) {
        signals.bullish += 2;
        reasons.push(`Williams %%R ${wr.toFixed(1)}로 과매도 영역. 상승 반전 가능성`);
      } else if (wr < -70) {
        signals.bullish += 1;
        reasons.push(`Williams %%R ${wr.toFixed(1)}로 과매도 접근 중`);
      }
    }

    // CCI 극단값 판독
    if (advancedSignals.cci != null) {
      const cci = advancedSignals.cci;
      if (cci > 200) {
        signals.bearish += 2;
        reasons.push(`CCI ${cci.toFixed(1)}로 극단적 과매수. 강한 평균 회귀 하락 예상`);
      } else if (cci > 100) {
        signals.bearish += 1;
        reasons.push(`CCI ${cci.toFixed(1)}로 과매수 구간. 조정 가능성`);
      } else if (cci < -200) {
        signals.bullish += 2;
        reasons.push(`CCI ${cci.toFixed(1)}로 극단적 과매도. 강한 평균 회귀 반등 예상`);
      } else if (cci < -100) {
        signals.bullish += 1;
        reasons.push(`CCI ${cci.toFixed(1)}로 과매도 구간. 반등 가능성`);
      }
    }

    // 평균 회귀 점수
    {
      const mrs = advancedSignals.meanReversionScore;
      if (mrs > 0.7) {
        signals.bullish += 2;
        reasons.push(`평균 회귀 점수 ${(mrs * 100).toFixed(0)}%. 가격이 평균 대비 크게 하회하여 반등 가능성 높음`);
      } else if (mrs > 0.4) {
        signals.bullish += 1;
        reasons.push(`평균 회귀 점수 ${(mrs * 100).toFixed(0)}%. 하방 이탈 후 평균 복귀 가능성`);
      } else if (mrs < -0.7) {
        signals.bearish += 2;
        reasons.push(`평균 회귀 점수 ${(mrs * 100).toFixed(0)}%. 가격이 평균 대비 크게 상회하여 하락 가능성 높음`);
      } else if (mrs < -0.4) {
        signals.bearish += 1;
        reasons.push(`평균 회귀 점수 ${(mrs * 100).toFixed(0)}%. 상방 이탈 후 평균 복귀 가능성`);
      }
    }

    // 지지/저항 근접성
    if (advancedSignals.supportResistance) {
      const { nearSupport, nearResistance } = advancedSignals.supportResistance;
      if (nearSupport) {
        signals.bullish += 1;
        reasons.push(`주요 지지선 근접. 반등 가능성 높음`);
      }
      if (nearResistance) {
        signals.bearish += 1;
        reasons.push(`주요 저항선 근접. 되돌림 가능성 높음`);
      }
    }

    // 모멘텀 다이버전스 (가격 신고가 but RSI 하락 = 베어리시 다이버전스)
    if (advancedSignals.momentumDivergence.hasDivergence) {
      const { type } = advancedSignals.momentumDivergence;
      if (type === "bearish") {
        signals.bearish += 2;
        reasons.push(`베어리시 다이버전스 감지. 가격은 신고가이나 RSI 하락 중 → 상승 탄력 약화`);
      } else if (type === "bullish") {
        signals.bullish += 2;
        reasons.push(`불리시 다이버전스 감지. 가격은 신저가이나 RSI 상승 중 → 하락 탄력 약화`);
      }
    }
  }

  const total = signals.bullish + signals.bearish;
  if (total === 0) {
    return {
      direction: "보합",
      confidence: 25,
      rationale: "[평균회귀] 과매수/과매도 신호 없음. 중립 구간",
    };
  }

  const bullishRatio = signals.bullish / total;
  const bearishRatio = signals.bearish / total;
  const dominantRatio = Math.max(bullishRatio, bearishRatio);
  const confidence = Math.round(dominantRatio * 75 + 15);

  let direction: Direction;
  if (bullishRatio > 0.6) {
    direction = "상승";
  } else if (bearishRatio > 0.6) {
    direction = "하락";
  } else {
    direction = "보합";
  }

  return {
    direction,
    confidence: Math.min(confidence, 92),
    rationale: `[평균회귀] ${reasons.join(". ")}`,
  };
}

// ─── (c) 변동성 모델 ──────────────────────────────────────────────────────────
// ATR과 볼린저 밴드 폭으로 변동성 상태를 진단한다.

export function volatilityModel(data: PriceBar[], advancedSignals?: AdvancedSignals): ModelVote {
  const reasons: string[] = [];
  let volatilityScore = 0; // 양수 → 변동성 확대, 음수 → 축소

  // ATR 기반 분석
  const atr14 = calcATR(data, 14);
  const atr5 = calcATR(data, 5);
  if (atr14 !== null && atr5 !== null && atr14 !== 0) {
    const atrRatio = atr5 / atr14;
    if (atrRatio > 1.5) {
      volatilityScore += 3;
      reasons.push(
        `단기 ATR이 장기 ATR 대비 ${(atrRatio * 100).toFixed(0)}%로 변동성 급격히 확대 중`,
      );
    } else if (atrRatio > 1.2) {
      volatilityScore += 2;
      reasons.push(
        `단기 ATR이 장기 ATR 대비 ${(atrRatio * 100).toFixed(0)}%로 변동성 확대 조짐`,
      );
    } else if (atrRatio < 0.7) {
      volatilityScore -= 2;
      reasons.push(
        `단기 ATR이 장기 ATR 대비 ${(atrRatio * 100).toFixed(0)}%로 변동성 축소 중`,
      );
    } else if (atrRatio < 0.85) {
      volatilityScore -= 1;
      reasons.push(`변동성이 다소 축소되는 구간`);
    }
  }

  // 볼린저 밴드 폭
  const bb = calcBollingerBands(data);
  if (bb !== null) {
    // 밴드 폭(width)은 일반적으로 0.02~0.15 범위
    if (bb.width > 0.10) {
      volatilityScore += 2;
      reasons.push(
        `볼린저 밴드 폭 ${(bb.width * 100).toFixed(1)}%로 높은 변동성 환경`,
      );
    } else if (bb.width > 0.06) {
      volatilityScore += 1;
      reasons.push(`볼린저 밴드 폭 ${(bb.width * 100).toFixed(1)}%, 보통 수준 변동성`);
    } else if (bb.width < 0.03) {
      volatilityScore -= 2;
      reasons.push(
        `볼린저 밴드 폭 ${(bb.width * 100).toFixed(1)}%로 극도로 수축. 돌파 임박 가능성`,
      );
    }
  }

  // ATR을 현재가 대비 비율로 환산
  if (atr14 !== null && data.length > 0) {
    const currentPrice = data[data.length - 1].close;
    if (currentPrice > 0) {
      const atrPercent = (atr14 / currentPrice) * 100;
      if (atrPercent > 3) {
        volatilityScore += 1;
        reasons.push(`ATR 대 현재가 비율 ${atrPercent.toFixed(1)}%로 고변동 상태`);
      }
    }
  }

  // ─── 고급 변동성 시그널 (advancedSignals 제공 시) ───
  if (advancedSignals) {
    // 변동성 체제 분류
    if (advancedSignals.volatilityRegime) {
      const regime = advancedSignals.volatilityRegime;
      if (regime === "extreme") {
        volatilityScore += 3;
        reasons.push(`변동성 체제: 극고변동. 급격한 가격 변동 환경으로 리스크 관리 필수`);
      } else if (regime === "high") {
        volatilityScore += 2;
        reasons.push(`변동성 체제: 고변동. 평균 이상의 가격 변동성 지속 중`);
      } else if (regime === "low") {
        volatilityScore -= 2;
        reasons.push(`변동성 체제: 저변동. 시장 안정 구간이나 돌파 에너지 축적 가능성`);
      }
    }

    // 돌파 확률
    {
      const bp = advancedSignals.breakoutProbability.probability;
      if (bp > 80) {
        volatilityScore += 2;
        reasons.push(`돌파 확률 ${bp.toFixed(0)}%. 임박한 돌파 가능성 매우 높음`);
      } else if (bp > 60) {
        volatilityScore += 1;
        reasons.push(`돌파 확률 ${bp.toFixed(0)}%. 돌파 가능성 상승 중`);
      } else if (bp < 20) {
        volatilityScore -= 1;
        reasons.push(`돌파 확률 ${bp.toFixed(0)}%. 횡보 지속 가능성 높음`);
      }
    }

    // 최대 낙폭 평가
    if (advancedSignals.maxDrawdown !== undefined) {
      const mdd = advancedSignals.maxDrawdown;
      if (mdd > 15) {
        volatilityScore += 2;
        reasons.push(`최근 최대 낙폭 ${mdd.toFixed(1)}%. 극심한 하락 리스크 환경`);
      } else if (mdd > 8) {
        volatilityScore += 1;
        reasons.push(`최근 최대 낙폭 ${mdd.toFixed(1)}%. 주의 필요한 하락 리스크`);
      } else if (mdd < 3) {
        volatilityScore -= 1;
        reasons.push(`최근 최대 낙폭 ${mdd.toFixed(1)}%. 안정적 가격 흐름`);
      }
    }

    // 가격 갭 분석
    if (advancedSignals.priceGap.hasGap) {
      const { direction, gapPercent } = advancedSignals.priceGap;
      if (gapPercent > 2) {
        volatilityScore += 2;
        const gapDir = direction === "up" ? "상승" : "하락";
        reasons.push(`${gapDir} 갭 ${gapPercent.toFixed(1)}% 발생. 강한 변동성 이벤트`);
      } else if (gapPercent > 1) {
        volatilityScore += 1;
        const gapDir = direction === "up" ? "상승" : "하락";
        reasons.push(`${gapDir} 갭 ${gapPercent.toFixed(1)}% 발생. 변동성 확대 신호`);
      }
    }

    // 거래량 급등 감지
    if (advancedSignals.volumeProfile.volumeSpike) {
      volatilityScore += 2;
      reasons.push(`거래량 급등 감지. 대규모 시장 참여로 변동성 확대`);
    }
  }

  const absScore = Math.abs(volatilityScore);

  if (volatilityScore >= 3) {
    return {
      direction: "변동성확대",
      confidence: Math.min(40 + absScore * 10, 90),
      rationale: `[변동성] ${reasons.join(". ")}`,
    };
  }

  if (volatilityScore <= -2) {
    // 변동성 축소는 추세 지속(보합)으로 해석
    return {
      direction: "보합",
      confidence: Math.min(30 + absScore * 10, 70),
      rationale: `[변동성] ${reasons.join(". ")}. 변동성 축소로 횡보 가능성`,
    };
  }

  // 보통 수준
  return {
    direction: "보합",
    confidence: 35,
    rationale:
      reasons.length > 0
        ? `[변동성] ${reasons.join(". ")}. 현재 변동성 정상 범위`
        : "[변동성] 변동성 지표 데이터 부족",
  };
}

// ─── (d) 교차자산 상관관계 모델 ───────────────────────────────────────────────
// 여러 자산 간 상관관계를 이용하여 방향을 추정한다.

/**
 * 상관관계 매트릭스
 * 키: "영향자산_대상자산"
 * 값: 음수 = 역상관, 양수 = 정상관, 절대값이 클수록 강한 상관
 */
const CORRELATION_MATRIX: Record<string, number> = {
  // DXY(달러 인덱스)와 다른 자산
  "DXY_GOLD": -0.80,       // 달러 강세 → 금 약세
  "DXY_SILVER": -0.70,     // 달러 강세 → 은 약세
  "DXY_EURUSD": -0.95,     // 달러 강세 → EUR/USD 하락
  "DXY_USDJPY": 0.85,      // 달러 강세 → USD/JPY 상승
  "DXY_USDKRW": 0.80,      // 달러 강세 → 원화 약세
  "DXY_BTC": -0.45,         // 달러 강세 → 비트코인 약세 (약한 상관)

  // USD/KRW와 한국 자산
  "USDKRW_KOSPI": -0.65,   // 원화 약세 → KOSPI 하락
  "USDKRW_KOSDAQ": -0.60,  // 원화 약세 → KOSDAQ 하락
  "USDKRW_KR10Y": 0.40,    // 원화 약세 → 한국 국채 금리 상승

  // 미국 국채와 주식
  "US10Y_SPX": -0.50,       // 금리 상승 → 주가 하락 (중기)
  "US10Y_NASDAQ": -0.60,    // 금리 상승 → 나스닥 하락 (기술주 민감)
  "US10Y_GOLD": -0.40,      // 금리 상승 → 금 하락

  // 원유와 관련 자산
  "OIL_INFLATION": 0.65,    // 유가 상승 → 인플레이션 상승
  "OIL_USDKRW": 0.45,       // 유가 상승 → 원화 약세 (수입비용)
  "OIL_AIRLINE": -0.55,     // 유가 상승 → 항공주 약세

  // VIX(공포지수)
  "VIX_SPX": -0.80,         // VIX 상승 → S&P 하락
  "VIX_GOLD": 0.50,         // VIX 상승 → 안전자산 금 상승
  "VIX_USDKRW": 0.55,       // VIX 상승 → 원화 약세 (위험회피)

  // 중국 관련
  "SHCOMP_KOSPI": 0.50,     // 상해종합 상승 → KOSPI 상승
  "CNY_USDKRW": 0.60,       // 위안화 약세 → 원화 약세

  // ─── 확장 상관관계 (한국 ETF 및 섹터) ───
  "KOSPI_SEMICONDUCTOR": 0.85,    // KOSPI ↔ 반도체 ETF
  "NASDAQ_AI_TECH": 0.90,         // 나스닥 ↔ AI/빅테크
  "SPX_TIGER_SNP": 0.95,          // S&P500 ↔ TIGER S&P500 ETF
  "NASDAQ_TIGER_NASDAQ": 0.95,    // 나스닥 ↔ TIGER 나스닥 ETF
  "KOSPI_KODEX200": 0.98,         // KOSPI ↔ KODEX 200
  "GOLD_KODEX_GOLD": 0.95,        // 금 ↔ KODEX 금선물
  "OIL_SHIPBUILDING": 0.40,       // 유가 ↔ 조선
  "VIX_DEFENSE": 0.45,            // VIX ↔ 방산 (지정학 위험)
  "US10Y_KODEX_BOND": -0.85,      // 금리 ↔ 채권 ETF
  "KOSPI_EV_BATTERY": 0.70,       // KOSPI ↔ 전기차/배터리
  "KOSPI_BIO": 0.45,              // KOSPI ↔ 바이오
  "USDKRW_KODEX200": -0.60,       // 원화약세 ↔ KODEX200 하락
  "SEMICONDUCTOR_AI_TECH": 0.80,  // 반도체 ↔ AI/빅테크
  "DEFENSE_GLOBAL_RISK": 0.65,    // 방산 ↔ 지정학 리스크
};

/**
 * 자산 ID를 상관관계 매트릭스 키에 매핑
 * priceService의 자산 ID → 상관관계 매트릭스에서 사용하는 키
 */
const ASSET_ID_TO_CORRELATION_KEY: Record<string, string> = {
  // 글로벌 자산
  "kospi": "KOSPI",
  "kosdaq": "KOSDAQ",
  "sp500": "SPX",
  "nasdaq": "NASDAQ",
  "gold": "GOLD",
  "wti-oil": "OIL",
  "dxy": "DXY",
  "usd-krw": "USDKRW",
  "usd-jpy": "USDJPY",
  "us-10y-yield": "US10Y",
  "copper": "COPPER",
  // 한국 ETF (etf-{ticker} 형식 → 네이버 금융 기준)
  "etf-091160": "SEMICONDUCTOR",     // KODEX 반도체
  "etf-305720": "EV_BATTERY",        // KODEX 2차전지산업
  "etf-244580": "BIO",               // KODEX 바이오
  "etf-381180": "AI_TECH",           // TIGER 미국필라델피아반도체
  "etf-132030": "KODEX_GOLD",        // KODEX 골드선물(H)
  "etf-360750": "TIGER_SNP",         // TIGER 미국S&P500
  "etf-133690": "TIGER_NASDAQ",      // TIGER 미국나스닥100
  "etf-069500": "KODEX200",          // KODEX 200
  "etf-305080": "KODEX_BOND",        // KODEX 미국채10년선물
};

export interface CrossAssetInput {
  assetId: string;
  data: PriceBar[];
}

interface AssetSignal {
  assetId: string;
  recentReturn: number; // 최근 수익률 (%)
}

function getRecentReturn(data: PriceBar[], lookback: number = 5): number | null {
  if (data.length < lookback + 1) return null;
  const current = data[data.length - 1].close;
  const previous = data[data.length - 1 - lookback].close;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function correlationModel(
  targetAssetId: string,
  allAssets: CrossAssetInput[],
  advancedSignals?: AdvancedSignals,
): ModelVote {
  const reasons: string[] = [];
  let weightedBullish = 0;
  let weightedBearish = 0;
  let totalWeight = 0;

  // 각 자산의 최근 수익률 계산
  const assetSignals: AssetSignal[] = [];
  for (const asset of allAssets) {
    if (asset.assetId === targetAssetId) continue;
    const ret = getRecentReturn(asset.data);
    if (ret !== null) {
      assetSignals.push({ assetId: asset.assetId, recentReturn: ret });
    }
  }

  for (const signal of assetSignals) {
    // 자산 ID를 상관관계 키로 변환 (매핑 있으면 사용, 없으면 원본 ID 그대로)
    const signalKey = ASSET_ID_TO_CORRELATION_KEY[signal.assetId] ?? signal.assetId;
    const targetKey = ASSET_ID_TO_CORRELATION_KEY[targetAssetId] ?? targetAssetId;

    // 상관관계 키 탐색 (양방향 - 원본 ID + 매핑 키 모두 탐색)
    const keyDirect = `${signalKey}_${targetKey}`;
    const keyReverse = `${targetKey}_${signalKey}`;
    const keyDirectRaw = `${signal.assetId}_${targetAssetId}`;
    const keyReverseRaw = `${targetAssetId}_${signal.assetId}`;
    let correlation = CORRELATION_MATRIX[keyDirect]
      ?? CORRELATION_MATRIX[keyReverse]
      ?? CORRELATION_MATRIX[keyDirectRaw]
      ?? CORRELATION_MATRIX[keyReverseRaw];

    if (correlation === undefined) continue;

    // keyReverse로 찾은 경우 방향이 반대이므로 역전하지 않음
    // (매트릭스는 "원인_결과" 형태로 정의)

    const absCorr = Math.abs(correlation);
    const impliedReturn = signal.recentReturn * correlation;

    if (Math.abs(signal.recentReturn) < 0.5) continue; // 미미한 변동 무시

    if (impliedReturn > 0) {
      weightedBullish += absCorr * Math.abs(impliedReturn);
      const direction = signal.recentReturn > 0 ? "상승" : "하락";
      const corrType = correlation > 0 ? "정상관" : "역상관";
      reasons.push(
        `${signal.assetId} ${direction}(${signal.recentReturn.toFixed(1)}%) → ${targetAssetId}와 ${corrType}(${correlation.toFixed(2)})으로 상승 압력`,
      );
    } else {
      weightedBearish += absCorr * Math.abs(impliedReturn);
      const direction = signal.recentReturn > 0 ? "상승" : "하락";
      const corrType = correlation > 0 ? "정상관" : "역상관";
      reasons.push(
        `${signal.assetId} ${direction}(${signal.recentReturn.toFixed(1)}%) → ${targetAssetId}와 ${corrType}(${correlation.toFixed(2)})으로 하락 압력`,
      );
    }
    totalWeight += absCorr;
  }

  if (totalWeight === 0 || reasons.length === 0) {
    return {
      direction: "보합",
      confidence: 20,
      rationale: "[상관관계] 유의미한 교차자산 신호 없음",
    };
  }

  const bullishRatio = weightedBullish / (weightedBullish + weightedBearish);
  const bearishRatio = weightedBearish / (weightedBullish + weightedBearish);
  const dominantRatio = Math.max(bullishRatio, bearishRatio);
  const confidence = Math.round(dominantRatio * 60 + 15); // 15-75 범위 (상관관계 모델은 확신도 낮음)

  let direction: Direction;
  if (bullishRatio > 0.6) {
    direction = "상승";
  } else if (bearishRatio > 0.6) {
    direction = "하락";
  } else {
    direction = "보합";
  }

  return {
    direction,
    confidence: Math.min(confidence, 85),
    rationale: `[상관관계] ${reasons.join(". ")}`,
  };
}

// ─── (e) 펀더멘털/매크로 모델 ────────────────────────────────────────────────
// 거시경제 데이터와 펀더멘털 시그널로 방향을 추정한다.

/**
 * 펀더멘털/매크로 모델
 *
 * 수집된 거시경제 데이터와 자산별 펀더멘털 시그널을 기반으로
 * 시장 방향에 대한 투표를 생성한다.
 *
 * @param assetId - 대상 자산 ID
 * @param collectedData - 수집된 시장 데이터
 * @param fundamentalSignals - 펀더멘털 분석 결과
 * @returns 모델 투표 결과
 */
export function fundamentalModel(
  assetId: string,
  collectedData: CollectedData | null,
  fundamentalSignals: FundamentalSignal | null,
  advancedSignals?: AdvancedSignals,
): ModelVote {
  // 데이터가 없으면 중립 반환
  if (!collectedData && !fundamentalSignals) {
    return {
      direction: "보합",
      confidence: 15,
      rationale: "[펀더멘털] 거시경제 데이터 없음. 펀더멘털 분석 불가",
    };
  }

  const reasons: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;
  let totalWeight = 0;

  // 1. 펀더멘털 시그널 반영
  if (fundamentalSignals && fundamentalSignals.signals.length > 0) {
    for (const sig of fundamentalSignals.signals) {
      const weight = sig.strength / 100;
      if (sig.direction === "상승") {
        bullishScore += weight;
      } else if (sig.direction === "하락") {
        bearishScore += weight;
      }
      totalWeight += weight;
    }

    reasons.push(
      `펀더멘털 분석 종합: ${fundamentalSignals.overallBias} (시그널 ${fundamentalSignals.signals.length}개)`,
    );
  }

  // 2. 거시경제 데이터 직접 반영 (펀더멘털 시그널과 별도로 추가 가중)
  if (collectedData) {
    // VIX 기반 시장 심리
    if (collectedData.vix !== undefined) {
      if (collectedData.vix > 30) {
        bearishScore += 0.6;
        totalWeight += 0.6;
        reasons.push(`VIX ${collectedData.vix.toFixed(1)}로 극심한 공포 상태`);
      } else if (collectedData.vix > 25) {
        bearishScore += 0.4;
        totalWeight += 0.4;
        reasons.push(`VIX ${collectedData.vix.toFixed(1)}로 높은 공포`);
      } else if (collectedData.vix < 13) {
        bullishScore += 0.3;
        totalWeight += 0.3;
        reasons.push(`VIX ${collectedData.vix.toFixed(1)}로 극도의 안정`);
      }
    }

    // 수익률 곡선 (경기침체 지표)
    if (collectedData.yieldCurveSpread !== undefined) {
      if (collectedData.yieldCurveSpread < -0.5) {
        bearishScore += 0.5;
        totalWeight += 0.5;
        reasons.push(
          `수익률 곡선 깊은 역전 (${collectedData.yieldCurveSpread.toFixed(3)}%). 경기침체 강력 경고`,
        );
      } else if (collectedData.yieldCurveSpread < 0) {
        bearishScore += 0.3;
        totalWeight += 0.3;
        reasons.push(
          `수익률 곡선 역전 (${collectedData.yieldCurveSpread.toFixed(3)}%). 경기침체 주의`,
        );
      }
    }

    // 안전자산 수요
    if (collectedData.safeHavenDemand === "높음") {
      // 안전자산(금, 채권)에는 상승, 위험자산에는 하락
      const safeAssets = ["gold", "us-10y"];
      if (safeAssets.includes(assetId)) {
        bullishScore += 0.4;
        reasons.push("안전자산 수요 높음 → 해당 자산에 유리");
      } else {
        bearishScore += 0.3;
        reasons.push("안전자산 수요 높음 → 위험자산에 불리");
      }
      totalWeight += 0.4;
    }

    // 원자재 비율 (경제 건강)
    if (collectedData.copperGoldRatio !== undefined) {
      if (collectedData.copperGoldRatio > 0.005) {
        bullishScore += 0.2;
        totalWeight += 0.2;
        reasons.push("구리/금 비율 높음 → 경기 확장 시그널");
      } else if (collectedData.copperGoldRatio < 0.003) {
        bearishScore += 0.2;
        totalWeight += 0.2;
        reasons.push("구리/금 비율 낮음 → 경기 둔화 시그널");
      }
    }

    // 뉴스 심리 (단기 바이어스)
    if (collectedData.newsSentiment) {
      if (collectedData.newsSentiment.overall === "positive") {
        bullishScore += 0.2;
        totalWeight += 0.2;
        reasons.push("뉴스 심리 긍정적 → 단기 상승 바이어스");
      } else if (collectedData.newsSentiment.overall === "negative") {
        bearishScore += 0.2;
        totalWeight += 0.2;
        reasons.push("뉴스 심리 부정적 → 단기 하락 바이어스");
      }
    }
  }

  // ─── 고급 펀더멘털 시그널 (advancedSignals 제공 시) ───
  if (advancedSignals) {
    // Fear & Greed 종합 지수 분석
    {
      const fgi = advancedSignals.fearGreedComposite;
      if (fgi > 80) {
        bearishScore += 0.6;
        totalWeight += 0.6;
        reasons.push(`Fear & Greed 지수 ${fgi}로 극단적 탐욕 상태. 역발상 하락 경고`);
      } else if (fgi > 65) {
        bearishScore += 0.3;
        totalWeight += 0.3;
        reasons.push(`Fear & Greed 지수 ${fgi}로 탐욕 구간. 과열 주의`);
      } else if (fgi < 20) {
        bullishScore += 0.6;
        totalWeight += 0.6;
        reasons.push(`Fear & Greed 지수 ${fgi}로 극단적 공포 상태. 역발상 매수 기회`);
      } else if (fgi < 35) {
        bullishScore += 0.3;
        totalWeight += 0.3;
        reasons.push(`Fear & Greed 지수 ${fgi}로 공포 구간. 반등 가능성`);
      }
    }

    // 추세 강도 가중치
    {
      const ts = advancedSignals.trendStrength.strength;
      if (ts > 70) {
        const currentBias = bullishScore >= bearishScore ? "bullish" : "bearish";
        const bonus = (ts / 100) * 0.5;
        if (currentBias === "bullish") {
          bullishScore += bonus;
        } else {
          bearishScore += bonus;
        }
        totalWeight += bonus;
        reasons.push(`추세 강도 ${ts.toFixed(0)}%로 현재 방향에 대한 확신도 강화`);
      } else if (ts < 30) {
        reasons.push(`추세 강도 ${ts.toFixed(0)}%로 약한 추세. 방향성 불확실`);
      }
    }

    // 거래량 프로파일 분석
    {
      const { volumeTrend, volumeSpike } = advancedSignals.volumeProfile;
      if (volumeTrend === "증가") {
        bullishScore += 0.3;
        totalWeight += 0.3;
        reasons.push(`거래량 증가 추세. 시장 참여도 확대`);
      } else if (volumeTrend === "감소") {
        bearishScore += 0.2;
        totalWeight += 0.2;
        reasons.push(`거래량 감소 추세. 시장 참여도 위축`);
      }
      if (volumeSpike) {
        bullishScore += 0.3;
        totalWeight += 0.3;
        reasons.push(`거래량 급등 감지. 강한 시장 참여 신호`);
      }
    }

    // Sharpe Ratio 프록시 (위험조정 수익률 평가)
    {
      const sr = advancedSignals.sharpeProxy;
      if (sr > 2.0) {
        bullishScore += 0.4;
        totalWeight += 0.4;
        reasons.push(`Sharpe 비율 프록시 ${sr.toFixed(2)}로 매우 우수한 위험조정 수익률. 현 추세 지속 유리`);
      } else if (sr > 1.0) {
        bullishScore += 0.2;
        totalWeight += 0.2;
        reasons.push(`Sharpe 비율 프록시 ${sr.toFixed(2)}로 양호한 위험조정 수익률`);
      } else if (sr < -1.0) {
        bearishScore += 0.4;
        totalWeight += 0.4;
        reasons.push(`Sharpe 비율 프록시 ${sr.toFixed(2)}로 매우 불량한 위험조정 수익률. 하락 추세 강화`);
      } else if (sr < 0) {
        bearishScore += 0.2;
        totalWeight += 0.2;
        reasons.push(`Sharpe 비율 프록시 ${sr.toFixed(2)}로 부정적 위험조정 수익률`);
      }
    }

    // 리스크 수준 평가
    if (advancedSignals.riskLevel) {
      const rl = advancedSignals.riskLevel;
      if (rl === "매우_높음") {
        bearishScore += 0.5;
        totalWeight += 0.5;
        reasons.push(`리스크 수준: 매우 높음. 포지션 축소 및 방어적 전략 권고`);
      } else if (rl === "높음") {
        bearishScore += 0.3;
        totalWeight += 0.3;
        reasons.push(`리스크 수준: 높음. 리스크 관리 강화 필요`);
      } else if (rl === "낮음") {
        bullishScore += 0.2;
        totalWeight += 0.2;
        reasons.push(`리스크 수준: 낮음. 안정적 투자 환경`);
      }
    }
  }

  // 최종 방향 결정
  if (totalWeight === 0) {
    return {
      direction: "보합",
      confidence: 20,
      rationale: "[펀더멘털] 유의미한 거시경제 시그널 없음",
    };
  }

  const bullishRatio = bullishScore / (bullishScore + bearishScore || 1);
  const bearishRatio = bearishScore / (bullishScore + bearishScore || 1);
  const dominantRatio = Math.max(bullishRatio, bearishRatio);
  const confidence = Math.round(dominantRatio * 70 + 15); // 15-85 범위

  let direction: Direction;
  if (bullishRatio > 0.6) {
    direction = "상승";
  } else if (bearishRatio > 0.6) {
    direction = "하락";
  } else {
    direction = "보합";
  }

  return {
    direction,
    confidence: Math.min(confidence, 90),
    rationale: `[펀더멘털] ${reasons.join(". ")}`,
  };
}
