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

// ─── 구리(Copper) 펀더멘털 분석 ─────────────────────────────────────────────

/**
 * 구리 펀더멘털 분석
 * - 경기 선행 지표 (Dr. Copper)
 * - DXY 역상관
 * - 글로벌 제조업 활동 프록시
 * - 구리/금 비율
 */
function analyzeCopper(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // 구리/금 비율 (구리 자체의 상대적 강도)
  if (data.copperGoldRatio !== undefined) {
    const high = data.copperGoldRatio > 0.005;
    const low = data.copperGoldRatio < 0.003;
    signals.push({
      name: "구리/금 비율 (경기 건강)",
      value: data.copperGoldRatio.toFixed(5),
      interpretation: high
        ? "구리/금 비율 높음. 경기 확장 기대로 구리 수요 견조"
        : low
          ? "구리/금 비율 낮음. 경기 둔화 우려로 구리 수요 위축"
          : "구리/금 비율 보통. 경기 중립",
      direction: high ? "상승" : low ? "하락" : "중립",
      strength: high || low ? 65 : 30,
    });
  }

  // DXY 역상관
  if (data.dxyTrend) {
    const isDxyStrong = data.dxyTrend === "강세" || data.dxyTrend === "소폭 강세";
    const isDxyWeak = data.dxyTrend === "약세" || data.dxyTrend === "소폭 약세";
    signals.push({
      name: "달러 인덱스 영향",
      value: data.dxyTrend,
      interpretation: isDxyStrong
        ? "달러 강세로 구리 가격에 하방 압력"
        : isDxyWeak
          ? "달러 약세로 구리 가격 상방 지지"
          : "달러 보합, 중립적 영향",
      direction: isDxyStrong ? "하락" : isDxyWeak ? "상승" : "중립",
      strength: isDxyStrong || isDxyWeak ? 55 : 25,
    });
  }

  // 글로벌 시장 상태 (제조업 프록시)
  const asiaUp = data.globalMarketSummary.asiaStatus === "상승";
  const asiaDown = data.globalMarketSummary.asiaStatus === "하락";
  signals.push({
    name: "아시아 경기 (제조업 수요 프록시)",
    value: data.globalMarketSummary.asiaStatus,
    interpretation: asiaUp
      ? "아시아 시장 상승으로 제조업 활동 활발, 구리 수요 증가 기대"
      : asiaDown
        ? "아시아 시장 하락으로 제조업 위축 우려, 구리 수요 감소"
        : "아시아 시장 혼조, 수요 중립",
    direction: asiaUp ? "상승" : asiaDown ? "하락" : "중립",
    strength: asiaUp || asiaDown ? 55 : 25,
  });

  // VIX (위험선호 → 산업금속 수요)
  if (data.vix !== undefined) {
    signals.push({
      name: "시장 심리 (VIX)",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25
          ? "높은 VIX로 위험회피 심화, 산업금속 투자심리 위축"
          : data.vix < 15
            ? "낮은 VIX로 위험선호 증가, 산업금속 투자 매력 상승"
            : "VIX 보통 수준",
      direction: data.vix > 25 ? "하락" : data.vix < 15 ? "상승" : "중립",
      strength: data.vix > 25 ? 50 : data.vix < 15 ? 45 : 25,
    });
  }

  return signals;
}

// ─── USD/JPY 펀더멘털 분석 ───────────────────────────────────────────────────

/**
 * USD/JPY 펀더멘털 분석
 * - 금리차 (미국 vs 일본)
 * - DXY 동조
 * - 위험선호/회피 (엔화 안전자산 특성)
 */
function analyzeUsdJpy(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // DXY 동조
  if (data.dxyTrend) {
    const isDxyStrong = data.dxyTrend === "강세" || data.dxyTrend === "소폭 강세";
    const isDxyWeak = data.dxyTrend === "약세" || data.dxyTrend === "소폭 약세";
    signals.push({
      name: "달러 인덱스 동조",
      value: `DXY ${data.dxyTrend}`,
      interpretation: isDxyStrong
        ? "달러 강세로 USD/JPY 상승(엔화 약세) 압력"
        : isDxyWeak
          ? "달러 약세로 USD/JPY 하락(엔화 강세) 기대"
          : "달러 보합으로 환율 중립",
      direction: isDxyStrong ? "상승" : isDxyWeak ? "하락" : "중립",
      strength: isDxyStrong || isDxyWeak ? 65 : 25,
    });
  }

  // 미국 10년 국채 수익률 (금리차 프록시 - 일본은 저금리)
  if (data.us10yYield !== undefined) {
    signals.push({
      name: "미일 금리차 (10Y 국채)",
      value: `미국 ${data.us10yYield.toFixed(2)}%`,
      interpretation:
        data.us10yYield > 4.0
          ? "높은 미국 금리로 달러 캐리트레이드 매력 증가, 엔화 약세(USD/JPY 상승)"
          : data.us10yYield < 3.0
            ? "미국 금리 하락으로 캐리트레이드 축소, 엔화 강세(USD/JPY 하락)"
            : "미국 금리 보통 수준, 금리차 중립",
      direction: data.us10yYield > 4.0 ? "상승" : data.us10yYield < 3.0 ? "하락" : "중립",
      strength: data.us10yYield > 4.0 || data.us10yYield < 3.0 ? 65 : 30,
    });
  }

  // VIX (안전자산 엔화 수요)
  if (data.vix !== undefined) {
    signals.push({
      name: "위험회피 시그널 (엔화 안전자산)",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25
          ? "높은 VIX로 안전자산 엔화 수요 급증, USD/JPY 하락 압력"
          : data.vix < 15
            ? "낮은 VIX로 위험선호 증가, 엔화 매도 → USD/JPY 상승 압력"
            : "VIX 보통, 환율에 중립적",
      direction: data.vix > 25 ? "하락" : data.vix < 15 ? "상승" : "중립",
      strength: data.vix > 25 ? 60 : data.vix < 15 ? 50 : 25,
    });
  }

  // 안전자산 수요
  if (data.safeHavenDemand) {
    signals.push({
      name: "안전자산 수요 (엔화 강세 요인)",
      value: data.safeHavenDemand,
      interpretation:
        data.safeHavenDemand === "높음"
          ? "안전자산 수요 급증으로 엔화 강세 → USD/JPY 하락 예상"
          : data.safeHavenDemand === "낮음"
            ? "안전자산 수요 약세로 엔화 약세 → USD/JPY 상승 예상"
            : "안전자산 수요 보통",
      direction: data.safeHavenDemand === "높음" ? "하락" : data.safeHavenDemand === "낮음" ? "상승" : "중립",
      strength: data.safeHavenDemand !== "보통" ? 55 : 25,
    });
  }

  return signals;
}

// ─── DXY(달러 인덱스) 펀더멘털 분석 ─────────────────────────────────────────

function analyzeDXY(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // 미국 10년 국채 수익률 (금리 → 달러 강도)
  if (data.us10yYield !== undefined) {
    signals.push({
      name: "미국 금리 수준 (10Y)",
      value: `${data.us10yYield.toFixed(2)}%`,
      interpretation:
        data.us10yYield > 4.5
          ? "높은 금리가 달러 자산 매력 증가, 달러 강세 지지"
          : data.us10yYield < 3.0
            ? "낮은 금리로 달러 약세 압력"
            : "금리 보통 수준, 달러에 중립",
      direction: data.us10yYield > 4.5 ? "상승" : data.us10yYield < 3.0 ? "하락" : "중립",
      strength: data.us10yYield > 4.5 || data.us10yYield < 3.0 ? 70 : 30,
    });
  }

  // VIX (위험회피 → 달러 안전자산 수요)
  if (data.vix !== undefined) {
    signals.push({
      name: "위험회피 수요 (VIX)",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25
          ? "높은 VIX로 달러 안전자산 수요 증가, 달러 강세 지지"
          : data.vix < 15
            ? "낮은 VIX로 위험선호 증가, 달러 약세 압력"
            : "VIX 보통 수준",
      direction: data.vix > 25 ? "상승" : data.vix < 15 ? "하락" : "중립",
      strength: data.vix > 25 ? 60 : data.vix < 15 ? 50 : 25,
    });
  }

  // 수익률 곡선 (경기 전망 → 달러)
  if (data.yieldCurveSpread !== undefined) {
    signals.push({
      name: "수익률 곡선 (경기 전망)",
      value: `${data.yieldCurveSpread.toFixed(3)}%`,
      interpretation:
        data.yieldCurveSpread < 0
          ? "수익률 곡선 역전, 경기침체 우려 → 안전자산 달러 수요 증가"
          : data.yieldCurveSpread > 1.0
            ? "정상적 수익률 곡선, 경기 확장 기대 → 달러에서 위험자산으로 이동 가능"
            : "수익률 곡선 보통",
      direction: data.yieldCurveSpread < 0 ? "상승" : data.yieldCurveSpread > 1.0 ? "하락" : "중립",
      strength: data.yieldCurveSpread < 0 || data.yieldCurveSpread > 1.0 ? 55 : 25,
    });
  }

  // 뉴스 심리
  if (data.newsSentiment) {
    signals.push({
      name: "뉴스 심리 (미국 경제 전망)",
      value: data.newsSentiment.overall === "positive" ? "긍정적" : data.newsSentiment.overall === "negative" ? "부정적" : "중립적",
      interpretation:
        data.newsSentiment.overall === "positive"
          ? "긍정적 경제 뉴스로 달러 강세 지지"
          : data.newsSentiment.overall === "negative"
            ? "부정적 경제 뉴스로 달러 약세 가능"
            : "뉴스 심리 중립",
      direction: data.newsSentiment.overall === "positive" ? "상승" : data.newsSentiment.overall === "negative" ? "하락" : "중립",
      strength: data.newsSentiment.overall !== "neutral" ? 40 : 20,
    });
  }

  return signals;
}

// ─── 산업 자산 펀더멘털 분석 ─────────────────────────────────────────────────

/**
 * 반도체 산업 펀더멘털 분석
 * - 나스닥/미국기술주 모멘텀 (글로벌 반도체 수요)
 * - USD/KRW 환율 (수출 경쟁력)
 * - VIX (기술주 투자심리)
 * - 글로벌 경기 사이클
 */
function analyzeSemiconductor(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // 미국 기술주 모멘텀 (반도체 수요 선행지표)
  const usStatus = data.globalMarketSummary.usStatus;
  signals.push({
    name: "미국 기술주 모멘텀 (반도체 수요)",
    value: `미국시장 ${usStatus}`,
    interpretation:
      usStatus === "상승"
        ? "미국 기술주 상승으로 글로벌 반도체 수요 확대 기대. 한국 반도체 수혜"
        : usStatus === "하락"
          ? "미국 기술주 하락으로 반도체 사이클 둔화 우려. 한국 반도체 부정적"
          : "미국 시장 혼조, 반도체 수요 중립",
    direction: usStatus === "상승" ? "상승" : usStatus === "하락" ? "하락" : "중립",
    strength: usStatus === "상승" || usStatus === "하락" ? 70 : 30,
  });

  // 환율 (수출 경쟁력)
  if (data.usdKrwTrend) {
    const krwWeak = data.usdKrwTrend === "강세" || data.usdKrwTrend === "소폭 강세";
    const krwStrong = data.usdKrwTrend === "약세" || data.usdKrwTrend === "소폭 약세";
    signals.push({
      name: "원/달러 환율 (수출 경쟁력)",
      value: `USD/KRW ${data.usdKrwTrend}`,
      interpretation: krwWeak
        ? "원화 약세로 반도체 수출기업 원화 환산 이익 증가. 주가에 긍정적"
        : krwStrong
          ? "원화 강세로 수출 이익 감소 가능. 단 외국인 자금 유입은 긍정적"
          : "환율 보합, 수출 영향 중립",
      direction: krwWeak ? "상승" : krwStrong ? "하락" : "중립",
      strength: krwWeak || krwStrong ? 55 : 25,
    });
  }

  // VIX (기술주 투자심리)
  if (data.vix !== undefined) {
    signals.push({
      name: "기술주 투자심리 (VIX)",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25
          ? "높은 VIX로 기술/성장주 밸류에이션 부담 가중. 반도체주 하방 압력"
          : data.vix < 15
            ? "낮은 VIX로 성장주 선호 환경. 반도체주 상방 지지"
            : "VIX 보통 수준",
      direction: data.vix > 25 ? "하락" : data.vix < 15 ? "상승" : "중립",
      strength: data.vix > 25 ? 60 : data.vix < 15 ? 50 : 25,
    });
  }

  // 금리 (성장주 밸류에이션)
  if (data.us10yYield !== undefined) {
    signals.push({
      name: "금리 수준 (밸류에이션 부담)",
      value: `${data.us10yYield.toFixed(2)}%`,
      interpretation:
        data.us10yYield > 4.5
          ? "높은 금리가 기술주 밸류에이션에 부담. 반도체주 할인율 상승"
          : data.us10yYield < 3.5
            ? "낮은 금리로 성장주 밸류에이션 매력 증가. 반도체주에 우호적"
            : "금리 보통 수준, 밸류에이션 영향 제한적",
      direction: data.us10yYield > 4.5 ? "하락" : data.us10yYield < 3.5 ? "상승" : "중립",
      strength: data.us10yYield > 4.5 || data.us10yYield < 3.5 ? 55 : 25,
    });
  }

  return signals;
}

/**
 * AI/빅테크 산업 펀더멘털 분석
 */
function analyzeAITech(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // 나스닥 모멘텀 (직접 상관)
  const usStatus = data.globalMarketSummary.usStatus;
  signals.push({
    name: "나스닥 모멘텀 (AI/빅테크 심리)",
    value: `미국시장 ${usStatus}`,
    interpretation:
      usStatus === "상승"
        ? "나스닥 상승으로 AI/빅테크 투자심리 호전. 한국 관련 ETF 수혜"
        : usStatus === "하락"
          ? "나스닥 하락으로 AI/빅테크 조정 우려. 관련 ETF 부정적"
          : "나스닥 혼조, AI 섹터 방향 불명확",
    direction: usStatus === "상승" ? "상승" : usStatus === "하락" ? "하락" : "중립",
    strength: usStatus === "상승" || usStatus === "하락" ? 75 : 30,
  });

  // 금리 (성장주 민감도 최고)
  if (data.us10yYield !== undefined) {
    signals.push({
      name: "금리와 성장주 밸류에이션",
      value: `10Y ${data.us10yYield.toFixed(2)}%`,
      interpretation:
        data.us10yYield > 4.5
          ? "고금리가 AI/성장주 할인율을 높여 밸류에이션 부담 극대화"
          : data.us10yYield < 3.5
            ? "저금리 환경이 AI 성장주의 미래 가치를 높여 강력한 상승 동력"
            : "금리 보통 수준",
      direction: data.us10yYield > 4.5 ? "하락" : data.us10yYield < 3.5 ? "상승" : "중립",
      strength: data.us10yYield > 4.5 || data.us10yYield < 3.5 ? 65 : 25,
    });
  }

  // VIX
  if (data.vix !== undefined) {
    signals.push({
      name: "성장주 투자심리 (VIX)",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25 ? "높은 VIX로 성장주 매도 압력. AI 테마 조정 가능" :
        data.vix < 15 ? "낮은 VIX로 성장주 선호. AI 테마 상승 환경" : "VIX 보통",
      direction: data.vix > 25 ? "하락" : data.vix < 15 ? "상승" : "중립",
      strength: data.vix > 25 ? 55 : data.vix < 15 ? 50 : 25,
    });
  }

  // 뉴스 심리
  if (data.newsSentiment) {
    signals.push({
      name: "AI/기술 뉴스 심리",
      value: data.newsSentiment.overall === "positive" ? "긍정적" : data.newsSentiment.overall === "negative" ? "부정적" : "중립적",
      interpretation:
        data.newsSentiment.overall === "positive"
          ? "기술 관련 뉴스 긍정적. AI 테마 추가 상승 모멘텀"
          : data.newsSentiment.overall === "negative"
            ? "기술 관련 뉴스 부정적. AI 테마 조정 리스크"
            : "뉴스 중립",
      direction: data.newsSentiment.overall === "positive" ? "상승" : data.newsSentiment.overall === "negative" ? "하락" : "중립",
      strength: data.newsSentiment.overall !== "neutral" ? 45 : 20,
    });
  }

  return signals;
}

/**
 * 전기차/배터리 산업 펀더멘털 분석
 */
function analyzeEVBattery(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // 구리/금 비율 (경기 사이클 + 전기차 원자재)
  if (data.copperGoldRatio !== undefined) {
    const high = data.copperGoldRatio > 0.005;
    const low = data.copperGoldRatio < 0.003;
    signals.push({
      name: "구리/금 비율 (전기차 원자재 수요)",
      value: data.copperGoldRatio.toFixed(5),
      interpretation: high
        ? "구리 수요 강세, 전기차/배터리 산업 활황 시그널. 관련 ETF에 긍정적"
        : low
          ? "구리 수요 약세, 제조업 둔화로 전기차 수요 위축 우려"
          : "원자재 수요 보통",
      direction: high ? "상승" : low ? "하락" : "중립",
      strength: high || low ? 55 : 25,
    });
  }

  // 유가 (전기차 대안 매력)
  if (data.rawPrices?.["CL=F"] !== undefined) {
    const oil = data.rawPrices["CL=F"];
    signals.push({
      name: "유가 (전기차 대안 매력)",
      value: `WTI $${oil.toFixed(1)}`,
      interpretation:
        oil > 85
          ? "고유가로 전기차 대안 매력 상승. EV/배터리 산업에 구조적 호재"
          : oil < 55
            ? "저유가로 내연기관 경쟁력 유지. 전기차 전환 동기 약화"
            : "유가 보통 수준, 중립적 영향",
      direction: oil > 85 ? "상승" : oil < 55 ? "하락" : "중립",
      strength: oil > 85 || oil < 55 ? 50 : 25,
    });
  }

  // 아시아 시장 (중국 EV 수요 프록시)
  const asiaStatus = data.globalMarketSummary.asiaStatus;
  signals.push({
    name: "아시아 시장 (중국 EV 수요)",
    value: `아시아 ${asiaStatus}`,
    interpretation:
      asiaStatus === "상승"
        ? "아시아 시장 호조, 중국 전기차 수요 확대 기대"
        : asiaStatus === "하락"
          ? "아시아 시장 부진, 중국 EV 시장 둔화 우려"
          : "아시아 시장 혼조",
    direction: asiaStatus === "상승" ? "상승" : asiaStatus === "하락" ? "하락" : "중립",
    strength: asiaStatus === "상승" || asiaStatus === "하락" ? 50 : 25,
  });

  // 금리 (성장주 특성)
  if (data.us10yYield !== undefined) {
    signals.push({
      name: "금리 부담 (성장주 특성)",
      value: `${data.us10yYield.toFixed(2)}%`,
      interpretation:
        data.us10yYield > 4.5
          ? "고금리가 EV 성장주 밸류에이션에 부담"
          : data.us10yYield < 3.5
            ? "저금리 환경이 EV 성장 투자에 우호적"
            : "금리 보통, 중립적 영향",
      direction: data.us10yYield > 4.5 ? "하락" : data.us10yYield < 3.5 ? "상승" : "중립",
      strength: data.us10yYield > 4.5 || data.us10yYield < 3.5 ? 50 : 25,
    });
  }

  return signals;
}

/**
 * 바이오/제약 산업 펀더멘털 분석
 */
function analyzeBioPharma(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // 금리 (바이오는 초기 투자 의존도 높은 성장 섹터)
  if (data.us10yYield !== undefined) {
    signals.push({
      name: "금리 수준 (R&D 투자비용)",
      value: `${data.us10yYield.toFixed(2)}%`,
      interpretation:
        data.us10yYield > 4.5
          ? "고금리로 바이오 R&D 자금조달 비용 증가. 초기 바이오 기업에 불리"
          : data.us10yYield < 3.5
            ? "저금리로 바이오 벤처 투자 활성화 기대. 바이오 섹터에 우호적"
            : "금리 보통, 바이오 투자에 중립적 영향",
      direction: data.us10yYield > 4.5 ? "하락" : data.us10yYield < 3.5 ? "상승" : "중립",
      strength: data.us10yYield > 4.5 || data.us10yYield < 3.5 ? 55 : 25,
    });
  }

  // VIX (성장주 심리)
  if (data.vix !== undefined) {
    signals.push({
      name: "시장 심리 (바이오 투자심리)",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25
          ? "높은 VIX로 투기적 바이오주 매도 압력. 방어적 대형 제약은 상대적 안정"
          : data.vix < 15
            ? "낮은 VIX로 바이오 성장주 투자 매력 증가"
            : "VIX 보통, 바이오 투자심리 중립",
      direction: data.vix > 25 ? "하락" : data.vix < 15 ? "상승" : "중립",
      strength: data.vix > 25 ? 50 : data.vix < 15 ? 45 : 25,
    });
  }

  // KOSPI 동조
  const usStatus = data.globalMarketSummary.usStatus;
  signals.push({
    name: "글로벌 헬스케어 심리",
    value: `미국시장 ${usStatus}`,
    interpretation:
      usStatus === "상승"
        ? "미국 시장 상승으로 글로벌 헬스케어 투자심리 호전"
        : usStatus === "하락"
          ? "미국 시장 하락으로 바이오 투자심리 위축"
          : "미국 시장 혼조, 바이오에 중립",
    direction: usStatus === "상승" ? "상승" : usStatus === "하락" ? "하락" : "중립",
    strength: usStatus === "상승" || usStatus === "하락" ? 45 : 20,
  });

  // 안전자산 수요 (바이오는 성장주, 안전자산 수요 높으면 불리)
  if (data.safeHavenDemand) {
    signals.push({
      name: "안전자산 수요 (성장주 리스크)",
      value: data.safeHavenDemand,
      interpretation:
        data.safeHavenDemand === "높음"
          ? "안전자산 선호 심화로 바이오 등 성장주에서 자금 이탈 가능"
          : data.safeHavenDemand === "낮음"
            ? "위험선호 증가로 바이오 성장주에 자금 유입 기대"
            : "안전자산 수요 보통",
      direction: data.safeHavenDemand === "높음" ? "하락" : data.safeHavenDemand === "낮음" ? "상승" : "중립",
      strength: data.safeHavenDemand !== "보통" ? 45 : 20,
    });
  }

  return signals;
}

/**
 * 방산 산업 펀더멘털 분석
 */
function analyzeDefense(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // VIX (지정학 리스크 프록시 - 방산은 리스크 수혜)
  if (data.vix !== undefined) {
    signals.push({
      name: "지정학 리스크 (VIX 프록시)",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25
          ? "높은 VIX로 지정학적 불확실성 증대. 방산주 수혜 가능"
          : data.vix > 20
            ? "VIX 상승으로 안보 우려 반영. 방산주에 소폭 긍정적"
            : data.vix < 15
              ? "낮은 VIX로 평화 무드. 방산주 프리미엄 축소 가능"
              : "VIX 보통, 방산 센티먼트 중립",
      direction: data.vix > 25 ? "상승" : data.vix < 15 ? "하락" : "중립",
      strength: data.vix > 25 ? 65 : data.vix < 15 ? 45 : 25,
    });
  }

  // 안전자산 수요 (방산은 위기 시 수혜)
  if (data.safeHavenDemand) {
    signals.push({
      name: "안전자산/위기 수요",
      value: data.safeHavenDemand,
      interpretation:
        data.safeHavenDemand === "높음"
          ? "위기 국면으로 방위산업 수요 증가 기대. 방산주에 긍정적"
          : data.safeHavenDemand === "낮음"
            ? "평화 국면으로 방산 수요 모멘텀 약화"
            : "위기 수준 보통",
      direction: data.safeHavenDemand === "높음" ? "상승" : data.safeHavenDemand === "낮음" ? "하락" : "중립",
      strength: data.safeHavenDemand !== "보통" ? 60 : 25,
    });
  }

  // 뉴스 심리 (지정학 뉴스가 방산에 영향)
  if (data.newsSentiment) {
    signals.push({
      name: "뉴스 심리 (지정학/안보)",
      value: data.newsSentiment.overall === "positive" ? "긍정적" : data.newsSentiment.overall === "negative" ? "부정적" : "중립적",
      interpretation:
        data.newsSentiment.overall === "negative"
          ? "부정적 뉴스(지정학 긴장)로 방산주 수혜 가능"
          : data.newsSentiment.overall === "positive"
            ? "긍정적 뉴스(평화 무드)로 방산 프리미엄 하락 가능"
            : "뉴스 중립",
      direction: data.newsSentiment.overall === "negative" ? "상승" : data.newsSentiment.overall === "positive" ? "하락" : "중립",
      strength: data.newsSentiment.overall !== "neutral" ? 50 : 20,
    });
  }

  // KOSPI 약간 역상관 (방산은 경기방어주 성격)
  const usStatus = data.globalMarketSummary.usStatus;
  signals.push({
    name: "시장 상황 (경기방어주 특성)",
    value: `미국시장 ${usStatus}`,
    interpretation:
      usStatus === "하락"
        ? "시장 약세 시 방산주의 경기방어주 특성으로 상대적 강세 가능"
        : usStatus === "상승"
          ? "시장 강세 시 성장주 선호로 방산주 상대 매력 감소"
          : "시장 혼조, 중립",
    direction: usStatus === "하락" ? "상승" : usStatus === "상승" ? "하락" : "중립",
    strength: 35,
  });

  return signals;
}

/**
 * 조선 산업 펀더멘털 분석
 */
function analyzeShipbuilding(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  // 유가 (해운 수요 + 조선 발주)
  if (data.rawPrices?.["CL=F"] !== undefined) {
    const oil = data.rawPrices["CL=F"];
    signals.push({
      name: "유가 (해운/조선 수요)",
      value: `WTI $${oil.toFixed(1)}`,
      interpretation:
        oil > 80
          ? "고유가로 에너지 수송 수요 증가 + LNG선 발주 기대. 조선주에 긍정적"
          : oil < 55
            ? "저유가로 해운/에너지 투자 위축. 조선 신규 발주 감소 우려"
            : "유가 보통, 조선 수요에 중립적 영향",
      direction: oil > 80 ? "상승" : oil < 55 ? "하락" : "중립",
      strength: oil > 80 || oil < 55 ? 60 : 25,
    });
  }

  // 글로벌 경기 (무역량 → 선박 수요)
  const asiaUp = data.globalMarketSummary.asiaStatus === "상승";
  const asiaDown = data.globalMarketSummary.asiaStatus === "하락";
  const usUp = data.globalMarketSummary.usStatus === "상승";
  const usDown = data.globalMarketSummary.usStatus === "하락";
  const globalUp = asiaUp && usUp;
  const globalDown = asiaDown || usDown;
  signals.push({
    name: "글로벌 경기 (무역량 프록시)",
    value: `미국 ${data.globalMarketSummary.usStatus}, 아시아 ${data.globalMarketSummary.asiaStatus}`,
    interpretation: globalUp
      ? "글로벌 경기 동반 호조로 교역량 증가 기대. 선박 수요 확대"
      : globalDown
        ? "글로벌 경기 둔화로 교역량 위축 우려. 조선 발주 감소 가능"
        : "글로벌 경기 혼조, 조선 수요 중립",
    direction: globalUp ? "상승" : globalDown ? "하락" : "중립",
    strength: globalUp || globalDown ? 55 : 25,
  });

  // 환율 (원화 약세 → 수출 조선소 유리)
  if (data.usdKrwTrend) {
    const krwWeak = data.usdKrwTrend === "강세" || data.usdKrwTrend === "소폭 강세";
    const krwStrong = data.usdKrwTrend === "약세" || data.usdKrwTrend === "소폭 약세";
    signals.push({
      name: "원/달러 환율 (수출 수익성)",
      value: `USD/KRW ${data.usdKrwTrend}`,
      interpretation: krwWeak
        ? "원화 약세로 달러 매출 조선소의 원화 환산 이익 증가"
        : krwStrong
          ? "원화 강세로 달러 매출 환산 이익 감소"
          : "환율 보합, 수익성 영향 중립",
      direction: krwWeak ? "상승" : krwStrong ? "하락" : "중립",
      strength: krwWeak || krwStrong ? 50 : 25,
    });
  }

  // 구리/금 비율 (경기 건강)
  if (data.copperGoldRatio !== undefined) {
    const high = data.copperGoldRatio > 0.005;
    const low = data.copperGoldRatio < 0.003;
    signals.push({
      name: "경기 건강도 (구리/금 비율)",
      value: data.copperGoldRatio.toFixed(5),
      interpretation: high
        ? "경기 확장 국면으로 해운/조선 수요 견조"
        : low
          ? "경기 둔화로 교역량 및 선박 수요 감소 우려"
          : "경기 보통 수준",
      direction: high ? "상승" : low ? "하락" : "중립",
      strength: high || low ? 50 : 25,
    });
  }

  return signals;
}

// ─── ETF 카테고리별 분석 함수 매핑 ──────────────────────────────────────────

/**
 * ETF subCategory → 적합한 분석 함수 매핑
 */
const ETF_SUBCATEGORY_ANALYZERS: Record<string, (data: CollectedData) => FundamentalSignalItem[]> = {
  // 국내주식
  "대표지수": analyzeKoreanMarket,
  "레버리지": analyzeKoreanMarket,
  "반도체": analyzeSemiconductor,
  "금융": analyzeKoreanMarket,
  "자동차": analyzeKoreanMarket,
  "IT": analyzeSemiconductor,
  "2차전지": analyzeEVBattery,
  "바이오": analyzeBioPharma,
  "배당": analyzeKoreanMarket,
  "미디어": analyzeKoreanMarket,
  "건설": analyzeKoreanMarket,
  "운송": analyzeShipbuilding,
  "산업재": analyzeKoreanMarket,
  "에너지": analyzeOil,
  "소비재": analyzeKoreanMarket,
  "소재": analyzeCopper,
  // 해외주식
  "미국지수": analyzeUSEquity,
  "미국반도체": analyzeSemiconductor,
  "미국배당": analyzeUSEquity,
  "미국기술": analyzeAITech,
  "미국AI": analyzeAITech,
  "미국레버리지": analyzeUSEquity,
  "미국인버스": analyzeUSEquity,
  "유럽": analyzeUSEquity,
  "일본": analyzeUsdJpy,
  "중국": analyzeKoreanMarket,
  "인도": analyzeKoreanMarket,
  "신흥국": analyzeKoreanMarket,
  "글로벌": analyzeUSEquity,
  // 채권
  "국내단기": analyzeBonds,
  "국내중기": analyzeBonds,
  "국내장기": analyzeBonds,
  "국내종합": analyzeBonds,
  "국내초장기": analyzeBonds,
  "해외채권": analyzeBonds,
  "미국채": analyzeBonds,
  // 원자재
  "금": analyzeGold,
  "은": analyzeGold,
  "원유": analyzeOil,
  "원유인버스": analyzeOil,
  "농산물": analyzeCopper,
  // 인버스/레버리지
  "인버스": analyzeKoreanMarket,
  // 통화
  "달러": analyzeDXY,
  // 리츠
  "한국리츠": analyzeBonds,
  "미국리츠": analyzeBonds,
  // 테마
  "BBIG": analyzeAITech,
  "혁신기술": analyzeAITech,
  "메타버스": analyzeAITech,
  "AI": analyzeAITech,
};

// ─── 자산 ID → 분석 함수 매핑 ────────────────────────────────────────────────

import { koreanETFs } from "@/data/koreanETFs";

const ASSET_ANALYZERS: Record<string, (data: CollectedData) => FundamentalSignalItem[]> = {
  // 글로벌 자산
  gold: analyzeGold,
  "wti-oil": analyzeOil,
  copper: analyzeCopper,
  kospi: analyzeKoreanMarket,
  kosdaq: analyzeKoreanMarket,
  sp500: analyzeUSEquity,
  nasdaq: analyzeUSEquity,
  "usd-krw": analyzeUsdKrw,
  "usd-jpy": analyzeUsdJpy,
  "us-10y-yield": analyzeBonds,
  "us-10y": analyzeBonds,
  dxy: analyzeDXY,
  // 산업 자산
  semiconductor: analyzeSemiconductor,
  "ai-tech": analyzeAITech,
  "ev-battery": analyzeEVBattery,
  "bio-pharma": analyzeBioPharma,
  defense: analyzeDefense,
  shipbuilding: analyzeShipbuilding,
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
 * 자산 ID가 직접 매핑되지 않은 경우, ETF 카테고리 기반으로 적합한 분석 함수를 선택한다.
 *
 * @param assetId - 분석 대상 자산 ID
 * @param data - 수집된 시장 데이터
 * @returns 펀더멘털 시그널 및 종합 판단
 */
export function analyzeFundamentals(
  assetId: string,
  data: CollectedData,
): FundamentalSignal {
  let analyzerFn = ASSET_ANALYZERS[assetId];
  let signals: FundamentalSignalItem[];

  // 직접 매핑이 없으면 ETF 카테고리 기반 분석 시도
  if (!analyzerFn && assetId.startsWith("etf-")) {
    const ticker = assetId.replace("etf-", "");
    const etf = koreanETFs.find((e) => e.ticker === ticker);
    if (etf) {
      analyzerFn = ETF_SUBCATEGORY_ANALYZERS[etf.subCategory];
    }
  }

  if (analyzerFn) {
    try {
      signals = analyzerFn(data);
    } catch (err) {
      console.error(`펀더멘털 분석 실패 (${assetId}):`, err);
      signals = [];
    }
  } else {
    // 최종 fallback: 범용 시그널
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
 * VIX, 금리, 뉴스 심리, 글로벌 시장 상태, 안전자산 수요를 종합 분석
 */
function generateGenericSignals(data: CollectedData): FundamentalSignalItem[] {
  const signals: FundamentalSignalItem[] = [];

  if (data.vix !== undefined) {
    signals.push({
      name: "시장 변동성 (VIX)",
      value: data.vix.toFixed(1),
      interpretation:
        data.vix > 25
          ? "높은 변동성으로 투자심리 위축. 위험자산 전반 하방 압력"
          : data.vix < 15
            ? "낮은 변동성으로 안정적 투자 환경. 위험자산 선호"
            : "변동성 보통 수준",
      direction: data.vix > 25 ? "하락" : data.vix < 15 ? "상승" : "중립",
      strength: data.vix > 25 ? 55 : data.vix < 15 ? 45 : 25,
    });
  }

  if (data.us10yYield !== undefined) {
    signals.push({
      name: "미국 금리 수준",
      value: `${data.us10yYield.toFixed(2)}%`,
      interpretation:
        data.us10yYield > 4.5
          ? "높은 금리로 자산 전반 밸류에이션 부담"
          : data.us10yYield < 3.0
            ? "낮은 금리로 투자자산 매력 증가"
            : "금리 보통 수준",
      direction: data.us10yYield > 4.5 ? "하락" : data.us10yYield < 3.0 ? "상승" : "중립",
      strength: data.us10yYield > 4.5 || data.us10yYield < 3.0 ? 50 : 25,
    });
  }

  // 글로벌 시장 상태
  const usStatus = data.globalMarketSummary.usStatus;
  const asiaStatus = data.globalMarketSummary.asiaStatus;
  const globalUp = usStatus === "상승" && asiaStatus === "상승";
  const globalDown = usStatus === "하락" || asiaStatus === "하락";
  signals.push({
    name: "글로벌 시장 분위기",
    value: `미국 ${usStatus}, 아시아 ${asiaStatus}`,
    interpretation: globalUp
      ? "글로벌 동반 상승으로 투자심리 호전"
      : globalDown
        ? "글로벌 약세로 투자심리 위축"
        : "글로벌 시장 혼조",
    direction: globalUp ? "상승" : globalDown ? "하락" : "중립",
    strength: globalUp || globalDown ? 45 : 20,
  });

  if (data.newsSentiment) {
    signals.push({
      name: "뉴스 심리",
      value: data.newsSentiment.overall === "positive" ? "긍정적" : data.newsSentiment.overall === "negative" ? "부정적" : "중립적",
      interpretation:
        data.newsSentiment.overall === "positive"
          ? "긍정적 뉴스 심리로 단기 상승 모멘텀 지지"
          : data.newsSentiment.overall === "negative"
            ? "부정적 뉴스 심리로 단기 하방 압력"
            : "뉴스 심리 중립",
      direction: data.newsSentiment.overall === "positive" ? "상승" : data.newsSentiment.overall === "negative" ? "하락" : "중립",
      strength: data.newsSentiment.overall !== "neutral" ? 40 : 20,
    });
  }

  if (data.safeHavenDemand) {
    signals.push({
      name: "안전자산 수요",
      value: data.safeHavenDemand,
      interpretation:
        data.safeHavenDemand === "높음"
          ? "안전자산 선호 심화로 위험자산 부정적 영향"
          : data.safeHavenDemand === "낮음"
            ? "위험선호 증가로 위험자산에 우호적"
            : "안전자산 수요 보통",
      direction: data.safeHavenDemand === "높음" ? "하락" : data.safeHavenDemand === "낮음" ? "상승" : "중립",
      strength: data.safeHavenDemand !== "보통" ? 40 : 20,
    });
  }

  // 환율
  if (data.usdKrwTrend) {
    const krwWeak = data.usdKrwTrend === "강세" || data.usdKrwTrend === "소폭 강세";
    const krwStrong = data.usdKrwTrend === "약세" || data.usdKrwTrend === "소폭 약세";
    signals.push({
      name: "원/달러 환율",
      value: `USD/KRW ${data.usdKrwTrend}`,
      interpretation: krwWeak
        ? "원화 약세로 수출기업 긍정적, 수입비용 증가"
        : krwStrong
          ? "원화 강세로 외국인 자금 유입 기대"
          : "환율 보합",
      direction: "중립",
      strength: 30,
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
