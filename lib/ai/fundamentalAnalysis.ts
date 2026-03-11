/**
 * 펀더멘털 분석 모듈
 * 자산별 거시경제 및 펀더멘털 시그널을 생성한다.
 * 모든 해석은 한국어로 제공된다.
 */

import type { CollectedData } from "./dataCollector";

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

export interface FundamentalSignalItem {
  name: string;
  value: string;
  interpretation: string;
  direction: "상승" | "하락" | "중립";
  strength: number; // 0-100
}

export interface FundamentalSignal {
  assetId: string;
  signals: FundamentalSignalItem[];
  overallBias: "상승" | "하락" | "중립";
  rationale: string;
}

// ─── 자산 유형별 분석 함수 ─────────────────────────────────────────────────────

/**
 * 금(Gold) 펀더멘털 분석
 * - DXY 역상관
 * - 실질금리 (10Y - 인플레이션 기대)
 * - VIX 상관 (안전자산 수요)
 * - 안전자산 수요 수준
 */
function analyzeGold(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // DXY 역상관
  if (data.dxyTrend) {
    const isDxyStrong = data.dxyTrend === "강세" || data.dxyTrend === "소폭 강세";
    const isDxyWeak = data.dxyTrend === "약세" || data.dxyTrend === "소폭 약세";
    signals.push({
      name: "달러 인덱스 역상관",
      value: data.dxyTrend,
      interpretation: isDxyStrong
        ? "달러 강세로 금 가격에 하방 압력 작용"
        : isDxyWeak
          ? "달러 약세로 금 가격에 상방 지지"
          : "달러 보합으로 금 가격에 중립적 영향",
      direction: isDxyStrong ? "하락" : isDxyWeak ? "상승" : "중립",
      strength: isDxyStrong || isDxyWeak ? 65 : 30,
    });
  }

  // 실질금리 (10Y 국채 수익률 수준)
  if (data.us10yYield !== undefined) {
    const highYield = data.us10yYield > 4.0;
    const lowYield = data.us10yYield < 3.0;
    signals.push({
      name: "실질금리 (10년 국채)",
      value: `${data.us10yYield.toFixed(2)}%`,
      interpretation: highYield
        ? "높은 실질금리가 금의 기회비용을 높여 하방 압력"
        : lowYield
          ? "낮은 실질금리로 금 보유 매력 증가"
          : "실질금리 보통 수준, 금에 중립적",
      direction: highYield ? "하락" : lowYield ? "상승" : "중립",
      strength: highYield || lowYield ? 60 : 25,
    });
  }

  // VIX (공포지수)
  if (data.vix !== undefined) {
    const highVix = data.vix > 25;
    const lowVix = data.vix < 15;
    signals.push({
      name: "VIX 공포지수",
      value: data.vix.toFixed(1),
      interpretation: highVix
        ? "높은 시장 공포로 안전자산인 금 수요 증가 예상"
        : lowVix
          ? "낮은 변동성으로 안전자산 수요 감소, 금에 불리"
          : "VIX 보통 수준, 안전자산 수요 중립",
      direction: highVix ? "상승" : lowVix ? "하락" : "중립",
      strength: highVix ? 70 : lowVix ? 50 : 30,
    });
  }

  // 안전자산 수요
  if (data.safeHavenDemand) {
    signals.push({
      name: "안전자산 수요",
      value: data.safeHavenDemand,
      interpretation:
        data.safeHavenDemand === "높음"
          ? "전반적 안전자산 수요가 높아 금에 우호적"
          : data.safeHavenDemand === "낮음"
            ? "안전자산 수요 감소로 금에 부정적"
            : "안전자산 수요 보통 수준",
      direction: data.safeHavenDemand === "높음" ? "상승" : data.safeHavenDemand === "낮음" ? "하락" : "중립",
      strength: data.safeHavenDemand === "높음" ? 65 : data.safeHavenDemand === "낮음" ? 55 : 30,
    });
  }

  return signals;
}

/**
 * 원유(Oil) 펀더멘털 분석
 * - DXY 상관
 * - 구리/금 비율 (경기 건강)
 * - 글로벌 수요 프록시
 */
function analyzeOil(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // DXY 상관 (원유는 달러 역상관)
  if (data.dxyTrend) {
    const isDxyStrong = data.dxyTrend === "강세" || data.dxyTrend === "소폭 강세";
    const isDxyWeak = data.dxyTrend === "약세" || data.dxyTrend === "소폭 약세";
    signals.push({
      name: "달러 인덱스 영향",
      value: data.dxyTrend,
      interpretation: isDxyStrong
        ? "달러 강세로 원유 가격에 하방 압력"
        : isDxyWeak
          ? "달러 약세로 원유 가격 지지"
          : "달러 보합으로 원유에 중립적",
      direction: isDxyStrong ? "하락" : isDxyWeak ? "상승" : "중립",
      strength: isDxyStrong || isDxyWeak ? 55 : 25,
    });
  }

  // 구리/금 비율 (경제 건강 지표)
  if (data.copperGoldRatio !== undefined) {
    // 구리/금 비율이 높으면 경기 확장 → 원유 수요 증가
    const highRatio = data.copperGoldRatio > 0.0045;
    const lowRatio = data.copperGoldRatio < 0.003;
    signals.push({
      name: "구리/금 비율 (경제건강 지표)",
      value: data.copperGoldRatio.toFixed(5),
      interpretation: highRatio
        ? "구리/금 비율 상승으로 경기 확장 시그널, 원유 수요 증가 예상"
        : lowRatio
          ? "구리/금 비율 하락으로 경기 둔화 시그널, 원유 수요 감소 우려"
          : "구리/금 비율 보통 수준",
      direction: highRatio ? "상승" : lowRatio ? "하락" : "중립",
      strength: highRatio || lowRatio ? 55 : 25,
    });
  }

  // 글로벌 시장 상태 (수요 프록시)
  const asiaUp = data.globalMarketSummary.asiaStatus === "상승";
  const asiaDown = data.globalMarketSummary.asiaStatus === "하락";
  signals.push({
    name: "아시아 시장 상태 (수요 프록시)",
    value: data.globalMarketSummary.asiaStatus,
    interpretation: asiaUp
      ? "아시아 시장 상승으로 원유 수요 견조 예상"
      : asiaDown
        ? "아시아 시장 하락으로 원유 수요 둔화 우려"
        : "아시아 시장 혼조/보합으로 중립적",
    direction: asiaUp ? "상승" : asiaDown ? "하락" : "중립",
    strength: asiaUp || asiaDown ? 45 : 20,
  });

  return signals;
}

/**
 * KOSPI/KOSDAQ 펀더멘털 분석
 * - USD/KRW 역상관
 * - 외국인 자금 흐름 프록시 (DXY 추세)
 * - 반도체 사이클 (나스닥 모멘텀)
 */
function analyzeKoreanMarket(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // USD/KRW 역상관
  if (data.usdKrwTrend) {
    const krwWeak = data.usdKrwTrend === "강세" || data.usdKrwTrend === "소폭 강세"; // USD/KRW 상승 = 원화 약세
    const krwStrong = data.usdKrwTrend === "약세" || data.usdKrwTrend === "소폭 약세";
    signals.push({
      name: "원/달러 환율 영향",
      value: `USD/KRW ${data.usdKrwTrend}`,
      interpretation: krwWeak
        ? "원화 약세로 외국인 매도 압력 증가, 수출주에는 이익"
        : krwStrong
          ? "원화 강세로 외국인 자금 유입 기대, 수입주에 유리"
          : "환율 보합으로 중립적 영향",
      direction: krwWeak ? "하락" : krwStrong ? "상승" : "중립",
      strength: krwWeak || krwStrong ? 60 : 25,
    });
  }

  // DXY 추세 (외국인 자금 흐름 프록시)
  if (data.dxyTrend) {
    const isDxyStrong = data.dxyTrend === "강세" || data.dxyTrend === "소폭 강세";
    const isDxyWeak = data.dxyTrend === "약세" || data.dxyTrend === "소폭 약세";
    signals.push({
      name: "달러 강세와 외국인 자금 흐름",
      value: `DXY ${data.dxyTrend}`,
      interpretation: isDxyStrong
        ? "달러 강세 시 신흥시장 이탈 가능성, 한국시장에 부담"
        : isDxyWeak
          ? "달러 약세로 신흥시장 자금 유입 기대"
          : "달러 보합으로 자금 흐름 중립",
      direction: isDxyStrong ? "하락" : isDxyWeak ? "상승" : "중립",
      strength: isDxyStrong || isDxyWeak ? 55 : 25,
    });
  }

  // 나스닥 추세 (반도체/기술주 사이클)
  const usStatus = data.globalMarketSummary.usStatus;
  signals.push({
    name: "미국 기술주 모멘텀 (반도체 사이클)",
    value: `미국시장 ${usStatus}`,
    interpretation:
      usStatus === "상승"
        ? "미국 기술주 상승으로 한국 반도체주에 긍정적 영향 예상"
        : usStatus === "하락"
          ? "미국 기술주 하락으로 한국 반도체주에 부정적 영향 우려"
          : "미국 시장 혼조로 중립적 영향",
    direction: usStatus === "상승" ? "상승" : usStatus === "하락" ? "하락" : "중립",
    strength: usStatus === "상승" || usStatus === "하락" ? 55 : 25,
  });

  // VIX (글로벌 위험선호도)
  if (data.vix !== undefined) {
    signals.push({
      name: "글로벌 위험선호도 (VIX)",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25
          ? "높은 VIX로 글로벌 위험회피 심화, 한국시장에서 외국인 매도 가능성"
          : data.vix < 15
            ? "낮은 VIX로 위험자산 선호, 한국시장 자금유입 기대"
            : "VIX 보통 수준, 자금 흐름에 중립적",
      direction: data.vix > 25 ? "하락" : data.vix < 15 ? "상승" : "중립",
      strength: data.vix > 25 ? 65 : data.vix < 15 ? 55 : 30,
    });
  }

  return signals;
}

/**
 * S&P500/NASDAQ 펀더멘털 분석
 * - VIX 수준
 * - 수익률 곡선
 * - 뉴스 심리
 * - 기술주 모멘텀
 */
function analyzeUSEquity(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // VIX 수준
  if (data.vix !== undefined) {
    signals.push({
      name: "VIX 변동성 지수",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25
          ? "높은 VIX로 주식시장 조정 가능성 증가"
          : data.vix > 20
            ? "VIX 상승 추세로 주의 필요"
            : data.vix < 15
              ? "낮은 변동성으로 주식시장에 우호적 환경"
              : "VIX 보통 수준",
      direction: data.vix > 25 ? "하락" : data.vix < 15 ? "상승" : "중립",
      strength: data.vix > 25 ? 70 : data.vix < 15 ? 55 : 30,
    });
  }

  // 수익률 곡선
  if (data.yieldCurveSpread !== undefined) {
    const inverted = data.yieldCurveSpread < 0;
    const flat = data.yieldCurveSpread < 0.5 && data.yieldCurveSpread >= 0;
    signals.push({
      name: "수익률 곡선 (10Y-2Y 스프레드)",
      value: `${data.yieldCurveSpread.toFixed(3)}%`,
      interpretation: inverted
        ? "수익률 곡선 역전으로 경기침체 위험 경고. 주식시장에 부정적"
        : flat
          ? "수익률 곡선 평탄화, 경기 둔화 시그널"
          : "수익률 곡선 정상으로 경기 확장 기대",
      direction: inverted ? "하락" : flat ? "중립" : "상승",
      strength: inverted ? 75 : flat ? 40 : 50,
    });
  }

  // 10년 국채 금리 수준
  if (data.us10yYield !== undefined) {
    signals.push({
      name: "10년 국채 금리 수준",
      value: `${data.us10yYield.toFixed(2)}%`,
      interpretation:
        data.us10yYield > 4.5
          ? "높은 국채 금리가 주식시장에 부담. 성장주 밸류에이션 부담 가중"
          : data.us10yYield < 3.5
            ? "낮은 국채 금리로 주식시장에 우호적 환경"
            : "국채 금리 보통 수준, 주식시장에 중립적",
      direction: data.us10yYield > 4.5 ? "하락" : data.us10yYield < 3.5 ? "상승" : "중립",
      strength: data.us10yYield > 4.5 || data.us10yYield < 3.5 ? 60 : 30,
    });
  }

  // 뉴스 심리
  if (data.newsSentiment) {
    signals.push({
      name: "뉴스 심리 분석",
      value: data.newsSentiment.overall === "positive" ? "긍정적" : data.newsSentiment.overall === "negative" ? "부정적" : "중립적",
      interpretation:
        data.newsSentiment.overall === "positive"
          ? "전반적 뉴스 심리가 긍정적으로 단기 상승 모멘텀 지지"
          : data.newsSentiment.overall === "negative"
            ? "부정적 뉴스 심리로 단기 하방 압력 가능성"
            : "뉴스 심리 중립적, 뚜렷한 방향성 부재",
      direction:
        data.newsSentiment.overall === "positive" ? "상승" : data.newsSentiment.overall === "negative" ? "하락" : "중립",
      strength: data.newsSentiment.overall !== "neutral" ? 45 : 20,
    });
  }

  // 공포탐욕지수
  if (data.fearGreedIndex !== undefined) {
    signals.push({
      name: "공포탐욕지수",
      value: `${data.fearGreedIndex}`,
      interpretation:
        data.fearGreedIndex < 25
          ? "극단적 공포 구간으로 역발상 매수 기회일 수 있으나 단기 하락 지속 가능"
          : data.fearGreedIndex < 40
            ? "공포 구간으로 시장 약세 지속 가능"
            : data.fearGreedIndex > 75
              ? "탐욕 구간으로 과열 주의, 조정 가능성"
              : data.fearGreedIndex > 60
                ? "탐욕 접근으로 상승 모멘텀 유지 중"
                : "중립 구간",
      direction:
        data.fearGreedIndex > 60 ? "상승" : data.fearGreedIndex < 40 ? "하락" : "중립",
      strength: data.fearGreedIndex > 75 || data.fearGreedIndex < 25 ? 60 : 35,
    });
  }

  return signals;
}

/**
 * USD/KRW 펀더멘털 분석
 * - 금리차 (Fed vs BOK)
 * - DXY 상관
 * - 무역수지 프록시
 */
function analyzeUsdKrw(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // DXY 상관
  if (data.dxyTrend) {
    const isDxyStrong = data.dxyTrend === "강세" || data.dxyTrend === "소폭 강세";
    const isDxyWeak = data.dxyTrend === "약세" || data.dxyTrend === "소폭 약세";
    signals.push({
      name: "달러 인덱스 동조",
      value: `DXY ${data.dxyTrend}`,
      interpretation: isDxyStrong
        ? "달러 강세로 USD/KRW 상승(원화 약세) 압력"
        : isDxyWeak
          ? "달러 약세로 USD/KRW 하락(원화 강세) 기대"
          : "달러 보합으로 환율 중립",
      direction: isDxyStrong ? "상승" : isDxyWeak ? "하락" : "중립",
      strength: isDxyStrong || isDxyWeak ? 70 : 30,
    });
  }

  // VIX (위험회피 → 원화 약세)
  if (data.vix !== undefined) {
    signals.push({
      name: "VIX 위험회피 시그널",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25
          ? "높은 VIX로 위험회피 심화, 원화 약세(환율 상승) 가능성"
          : data.vix < 15
            ? "낮은 VIX로 위험선호 증가, 원화 강세(환율 하락) 기대"
            : "VIX 보통 수준, 환율에 중립적",
      direction: data.vix > 25 ? "상승" : data.vix < 15 ? "하락" : "중립",
      strength: data.vix > 25 ? 60 : data.vix < 15 ? 50 : 25,
    });
  }

  // 원유가격 (무역수지 프록시 - 한국은 원유 수입국)
  if (data.rawPrices?.["CL=F"] !== undefined) {
    const oilPrice = data.rawPrices["CL=F"];
    signals.push({
      name: "유가와 무역수지",
      value: `WTI $${oilPrice.toFixed(1)}`,
      interpretation:
        oilPrice > 85
          ? "높은 유가로 한국 무역수지 악화 우려, 원화 약세 압력"
          : oilPrice < 65
            ? "낮은 유가로 무역수지 개선 기대, 원화 강세 지지"
            : "유가 보통 수준, 무역수지 영향 중립",
      direction: oilPrice > 85 ? "상승" : oilPrice < 65 ? "하락" : "중립",
      strength: oilPrice > 85 || oilPrice < 65 ? 50 : 25,
    });
  }

  // 글로벌 시장 상태 (위험선호도)
  const globalUp =
    data.globalMarketSummary.usStatus === "상승" &&
    data.globalMarketSummary.asiaStatus === "상승";
  const globalDown =
    data.globalMarketSummary.usStatus === "하락" ||
    data.globalMarketSummary.asiaStatus === "하락";
  signals.push({
    name: "글로벌 시장 분위기",
    value: `미국 ${data.globalMarketSummary.usStatus}, 아시아 ${data.globalMarketSummary.asiaStatus}`,
    interpretation: globalUp
      ? "글로벌 시장 동반 상승으로 위험선호 증가, 원화 강세 기대"
      : globalDown
        ? "글로벌 시장 약세로 위험회피 심화, 원화 약세 가능"
        : "글로벌 시장 혼조, 환율에 중립적",
    direction: globalUp ? "하락" : globalDown ? "상승" : "중립",
    strength: globalUp || globalDown ? 45 : 20,
  });

  return signals;
}

/**
 * 채권 (10년 국채 수익률) 펀더멘털 분석
 * - 인플레이션 프록시 (원자재 가격)
 * - 안전자산 도피 수요
 * - VIX 상관
 */
function analyzeBonds(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // 인플레이션 프록시 (원자재 가격 수준)
  if (data.oilGoldRatio !== undefined) {
    signals.push({
      name: "원자재 기반 인플레이션 프록시",
      value: `원유/금 비율 ${data.oilGoldRatio.toFixed(4)}`,
      interpretation:
        data.oilGoldRatio > 0.045
          ? "원자재 가격 상승으로 인플레이션 압력, 금리 상승(채권 가격 하락) 가능성"
          : data.oilGoldRatio < 0.03
            ? "원자재 가격 안정으로 금리 하락(채권 가격 상승) 기대"
            : "원자재 가격 보통 수준, 인플레이션 중립",
      direction: data.oilGoldRatio > 0.045 ? "상승" : data.oilGoldRatio < 0.03 ? "하락" : "중립",
      strength: 45,
    });
  }

  // 안전자산 도피
  if (data.safeHavenDemand) {
    signals.push({
      name: "안전자산 수요 (채권 수요)",
      value: data.safeHavenDemand,
      interpretation:
        data.safeHavenDemand === "높음"
          ? "안전자산 수요 증가로 채권 매수 → 금리 하락 압력"
          : data.safeHavenDemand === "낮음"
            ? "안전자산 수요 감소로 채권 매도 → 금리 상승 압력"
            : "안전자산 수요 보통",
      direction: data.safeHavenDemand === "높음" ? "하락" : data.safeHavenDemand === "낮음" ? "상승" : "중립",
      strength: data.safeHavenDemand !== "보통" ? 55 : 25,
    });
  }

  // VIX (높은 VIX → 채권으로 자금 이동 → 금리 하락)
  if (data.vix !== undefined) {
    signals.push({
      name: "VIX와 채권 수요",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25
          ? "높은 VIX로 채권 안전자산 수요 급증, 금리 하락 예상"
          : data.vix < 15
            ? "낮은 VIX로 채권 수요 감소, 금리 상승 가능성"
            : "VIX 보통, 채권 수요 변동 제한적",
      direction: data.vix > 25 ? "하락" : data.vix < 15 ? "상승" : "중립",
      strength: data.vix > 25 ? 65 : data.vix < 15 ? 50 : 25,
    });
  }

  // 수익률 곡선 상태
  if (data.yieldCurveSpread !== undefined) {
    signals.push({
      name: "수익률 곡선 상태",
      value: `10Y-2Y 스프레드 ${data.yieldCurveSpread.toFixed(3)}%`,
      interpretation:
        data.yieldCurveSpread < 0
          ? "수익률 곡선 역전 상태, 단기 금리 대비 장기 금리 낮음. 경기침체 우려로 장기 금리 추가 하락 가능"
          : data.yieldCurveSpread > 1.5
            ? "수익률 곡선 가파름, 장기 금리 상승 추세 지속 가능"
            : "수익률 곡선 보통 수준",
      direction: data.yieldCurveSpread < 0 ? "하락" : data.yieldCurveSpread > 1.5 ? "상승" : "중립",
      strength: data.yieldCurveSpread < 0 || data.yieldCurveSpread > 1.5 ? 55 : 25,
    });
  }

  return signals;
}

// ─── 자산 ID → 분석 함수 매핑 ────────────────────────────────────────────────

const ASSET_ANALYZERS: Record<string, (data: CollectedData) => FundamentalSignalItem[]> = {
  gold: analyzeGold,
  "wti-oil": analyzeOil,
  kospi: analyzeKoreanMarket,
  kosdaq: analyzeKoreanMarket,
  sp500: analyzeUSEquity,
  nasdaq: analyzeUSEquity,
  "usd-krw": analyzeUsdKrw,
  "us-10y": analyzeBonds,
  dxy: analyzeUsdKrw, // DXY는 환율과 유사한 분석
};

// ─── 시그널 종합 ──────────────────────────────────────────────────────────────

function resolveOverallBias(signals: FundamentalSignalItem[]): "상승" | "하락" | "중립" {
  let bullishScore = 0;
  let bearishScore = 0;

  for (const sig of signals) {
    if (sig.direction === "상승") {
      bullishScore += sig.strength;
    } else if (sig.direction === "하락") {
      bearishScore += sig.strength;
    }
  }

  const total = bullishScore + bearishScore;
  if (total === 0) return "중립";

  const bullishRatio = bullishScore / total;
  if (bullishRatio > 0.6) return "상승";
  if (bullishRatio < 0.4) return "하락";
  return "중립";
}

function generateRationale(
  assetId: string,
  signals: FundamentalSignalItem[],
  overallBias: "상승" | "하락" | "중립",
): string {
  const biasLabel = overallBias === "상승" ? "상승" : overallBias === "하락" ? "하락" : "중립";
  const parts: string[] = [];

  parts.push(`[펀더멘털] ${assetId} 종합 방향성: ${biasLabel}`);

  for (const sig of signals) {
    parts.push(`▸ ${sig.name}: ${sig.value} → ${sig.interpretation}`);
  }

  return parts.join("\n");
}

// ─── 메인 분석 함수 ──────────────────────────────────────────────────────────

/**
 * 특정 자산에 대한 펀더멘털 분석을 수행한다.
 *
 * @param assetId - 분석 대상 자산 ID
 * @param data - 수집된 시장 데이터
 * @returns 펀더멘털 시그널 및 종합 판단
 */
export function analyzeFundamentals(
  assetId: string,
  data: CollectedData,
): FundamentalSignal {
  // 자산별 분석 함수가 없으면 일반적인 분석 수행
  const analyzerFn = ASSET_ANALYZERS[assetId];
  let signals: FundamentalSignalItem[];

  if (analyzerFn) {
    try {
      signals = analyzerFn(data);
    } catch (err) {
      console.error(`펀더멘털 분석 실패 (${assetId}):`, err);
      signals = [];
    }
  } else {
    // 매핑되지 않은 자산에 대해 범용 시그널 생성
    signals = generateGenericSignals(data);
  }

  const overallBias = resolveOverallBias(signals);
  const rationale = generateRationale(assetId, signals, overallBias);

  return {
    assetId,
    signals,
    overallBias,
    rationale,
  };
}

/**
 * 범용 펀더멘털 시그널 (매핑되지 않은 자산용)
 */
function generateGenericSignals(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  if (data.vix !== undefined) {
    signals.push({
      name: "시장 변동성",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25
          ? "높은 변동성으로 불확실성 증가"
          : data.vix < 15
            ? "낮은 변동성으로 안정적 환경"
            : "변동성 보통 수준",
      direction: data.vix > 25 ? "하락" : data.vix < 15 ? "상승" : "중립",
      strength: 40,
    });
  }

  if (data.newsSentiment) {
    signals.push({
      name: "뉴스 심리",
      value: data.newsSentiment.overall === "positive" ? "긍정적" : data.newsSentiment.overall === "negative" ? "부정적" : "중립적",
      interpretation: `뉴스 심리가 ${data.newsSentiment.overall === "positive" ? "긍정적" : data.newsSentiment.overall === "negative" ? "부정적" : "중립적"}`,
      direction:
        data.newsSentiment.overall === "positive" ? "상승" : data.newsSentiment.overall === "negative" ? "하락" : "중립",
      strength: 35,
    });
  }

  return signals;
}

/**
 * 모든 자산에 대한 펀더멘털 분석을 일괄 수행한다.
 */
export function analyzeAllAssets(
  assetIds: string[],
  data: CollectedData,
): Record<string, FundamentalSignal> {
  const results: Record<string, FundamentalSignal> = {};

  for (const assetId of assetIds) {
    results[assetId] = analyzeFundamentals(assetId, data);
  }

  return results;
}
