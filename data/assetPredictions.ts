import type { AssetPrediction } from "@/types";

/**
 * 전문가별 자산 예측 데이터
 *
 * 기존 전문가 신뢰도 시스템 기반으로, 전문가들이 각 자산의 방향을 예측.
 * 적중/불일치 결과는 기간 종료 후 기입 (투명성 원칙 — 틀린 예측도 삭제 안 함)
 */
export const assetPredictions: AssetPrediction[] = [
  // ── 금 (Gold) ─────────────────────────────────────────────────────────────
  {
    id: "ap-gold-1",
    assetId: "gold",
    expertId: "nouriel-roubini",
    direction: "상승",
    confidence: 85,
    timeframe: "3개월",
    targetRange: { low: 2950, high: 3150 },
    currentAtPrediction: 2870,
    rationale: "관세전쟁 확대 + 인플레이션 재점화 + 중앙은행 금 매입 지속으로 금 가격 3,000달러 돌파 전망. 스태그플레이션 시나리오에서 금은 최적의 헤지 자산.",
    keyAssumptions: ["미중 관세 유지", "CPI 3% 이상", "연준 인하 보류"],
    publishedAt: "2026-03-03",
    result: "미결",
  },
  {
    id: "ap-gold-2",
    assetId: "gold",
    expertId: "ray-dalio",
    direction: "상승",
    confidence: 80,
    timeframe: "6개월",
    targetRange: { low: 3000, high: 3300 },
    currentAtPrediction: 2870,
    rationale: "디레버리징 환경에서 금은 필수 포트폴리오 자산. 달러 기축통화 지위 약화 트렌드와 함께 구조적 상승 예상.",
    keyAssumptions: ["글로벌 디레버리징 지속", "중앙은행 금 보유 확대"],
    publishedAt: "2026-03-01",
    result: "미결",
  },
  {
    id: "ap-gold-3",
    assetId: "gold",
    expertId: "mohamed-el-erian",
    direction: "상승",
    confidence: 70,
    timeframe: "1개월",
    targetRange: { low: 2900, high: 3000 },
    currentAtPrediction: 2870,
    rationale: "단기적으로 안전자산 수요 유지. 다만 연준이 매파적 전환 시 상승폭 제한될 수 있음.",
    keyAssumptions: ["지정학 불확실성 지속", "연준 동결"],
    publishedAt: "2026-03-05",
    result: "미결",
  },

  // ── 원/달러 환율 ──────────────────────────────────────────────────────────
  {
    id: "ap-usdkrw-1",
    assetId: "usd-krw",
    expertId: "mohamed-el-erian",
    direction: "상승",
    confidence: 75,
    timeframe: "1개월",
    targetRange: { low: 1430, high: 1480 },
    currentAtPrediction: 1432,
    rationale: "한미 금리차 + 관세 불확실성 + 외국인 주식 매도로 원화 약세 압력 지속. 1,450원 대 안착 가능성.",
    keyAssumptions: ["연준 금리 동결", "한은 추가 인하", "관세 불확실성"],
    publishedAt: "2026-03-05",
    result: "미결",
  },
  {
    id: "ap-usdkrw-2",
    assetId: "usd-krw",
    expertId: "larry-summers",
    direction: "상승",
    confidence: 70,
    timeframe: "3개월",
    targetRange: { low: 1440, high: 1500 },
    currentAtPrediction: 1432,
    rationale: "관세가 달러 강세를 지속시킬 것. 한국 수출 의존도가 높아 관세 충격에 취약한 통화 중 하나.",
    keyAssumptions: ["글로벌 관세 유지", "달러 강세"],
    publishedAt: "2026-03-02",
    result: "미결",
  },

  // ── S&P 500 ───────────────────────────────────────────────────────────────
  {
    id: "ap-sp500-1",
    assetId: "sp500",
    expertId: "nouriel-roubini",
    direction: "하락",
    confidence: 75,
    timeframe: "3개월",
    targetRange: { low: 5200, high: 5600 },
    currentAtPrediction: 5840,
    rationale: "관세발 실적 악화 + 인플레이션 재점화 + 연준 동결 콤보로 미국 주식 조정 불가피. 10-15% 조정 예상.",
    keyAssumptions: ["관세 철회 없음", "CPI 3%+ 유지", "기업 실적 하향"],
    publishedAt: "2026-03-01",
    result: "미결",
  },
  {
    id: "ap-sp500-2",
    assetId: "sp500",
    expertId: "mohamed-el-erian",
    direction: "하락",
    confidence: 60,
    timeframe: "1개월",
    targetRange: { low: 5600, high: 5800 },
    currentAtPrediction: 5840,
    rationale: "단기 조정 가능하나 AI 투자 모멘텀이 하방을 제한. 관세 협상 진전 시 빠른 반등 가능.",
    keyAssumptions: ["AI 투자 지속", "관세 부분 협상 가능"],
    publishedAt: "2026-03-04",
    result: "미결",
  },
  {
    id: "ap-sp500-3",
    assetId: "sp500",
    expertId: "ray-dalio",
    direction: "변동성확대",
    confidence: 80,
    timeframe: "6개월",
    currentAtPrediction: 5840,
    rationale: "글로벌 질서 재편기에 자산 가격 변동성 확대는 구조적. 단방향 베팅보다 분산과 헤지가 핵심.",
    keyAssumptions: ["글로벌 질서 전환기", "정책 불확실성 고조"],
    publishedAt: "2026-03-02",
    result: "미결",
  },

  // ── WTI 원유 ──────────────────────────────────────────────────────────────
  {
    id: "ap-oil-1",
    assetId: "wti-oil",
    expertId: "adam-tooze",
    direction: "하락",
    confidence: 65,
    timeframe: "3개월",
    targetRange: { low: 60, high: 68 },
    currentAtPrediction: 69.8,
    rationale: "관세전쟁으로 글로벌 수요 둔화 + OPEC+ 감산 해제 맞물리면 유가 하방 압력. 다만 지정학 프리미엄이 바닥을 지지.",
    keyAssumptions: ["OPEC+ 증산", "글로벌 수요 둔화", "러우전쟁 교착"],
    publishedAt: "2026-03-03",
    result: "미결",
  },

  // ── KOSPI ─────────────────────────────────────────────────────────────────
  {
    id: "ap-kospi-1",
    assetId: "kospi",
    expertId: "larry-summers",
    direction: "하락",
    confidence: 65,
    timeframe: "1개월",
    targetRange: { low: 2400, high: 2520 },
    currentAtPrediction: 2565,
    rationale: "한국은 수출 의존도가 높아 글로벌 관세 충격에 가장 취약한 시장 중 하나. 외국인 매도세 지속 전망.",
    keyAssumptions: ["관세 유지", "외국인 매도", "원화 약세"],
    publishedAt: "2026-03-03",
    result: "미결",
  },
  {
    id: "ap-kospi-2",
    assetId: "kospi",
    expertId: "mohamed-el-erian",
    direction: "보합",
    confidence: 55,
    timeframe: "1개월",
    targetRange: { low: 2480, high: 2580 },
    currentAtPrediction: 2565,
    rationale: "관세 악재 상당 부분 선반영. 한은 추가 인하 기대와 반도체 업황 회복이 하단 지지. 박스권 전망.",
    keyAssumptions: ["한은 인하 기대", "반도체 수출 회복"],
    publishedAt: "2026-03-05",
    result: "미결",
  },

  // ── 미국 10년물 금리 ──────────────────────────────────────────────────────
  {
    id: "ap-10y-1",
    assetId: "us-10y-yield",
    expertId: "larry-summers",
    direction: "상승",
    confidence: 70,
    timeframe: "3개월",
    targetRange: { low: 4.30, high: 4.70 },
    currentAtPrediction: 4.35,
    rationale: "관세가 인플레이션을 재점화시키면 장기금리 상승 압력. 연준이 인하를 보류하면 시장금리는 더 올라갈 것.",
    keyAssumptions: ["인플레 재점화", "연준 인하 보류"],
    publishedAt: "2026-03-02",
    result: "미결",
  },

  // ── 나스닥 ────────────────────────────────────────────────────────────────
  {
    id: "ap-nasdaq-1",
    assetId: "nasdaq",
    expertId: "ray-dalio",
    direction: "변동성확대",
    confidence: 75,
    timeframe: "3개월",
    currentAtPrediction: 18520,
    rationale: "AI 투자 사이클은 긍정적이나 금리·관세·밸류에이션 부담이 상충. 방향보다 진폭 확대에 대비해야.",
    keyAssumptions: ["AI 투자 유지", "금리 불확실성"],
    publishedAt: "2026-03-03",
    result: "미결",
  },

  // ── 달러인덱스 ────────────────────────────────────────────────────────────
  {
    id: "ap-dxy-1",
    assetId: "dxy",
    expertId: "larry-summers",
    direction: "상승",
    confidence: 70,
    timeframe: "3개월",
    targetRange: { low: 104, high: 108 },
    currentAtPrediction: 103.8,
    rationale: "관세는 달러 강세 요인. 타 경제권 대비 미국 금리가 높은 한 달러 우위 지속.",
    keyAssumptions: ["미국 고금리 유지", "관세 지속"],
    publishedAt: "2026-03-02",
    result: "미결",
  },

  // ── 구리 ──────────────────────────────────────────────────────────────────
  {
    id: "ap-copper-1",
    assetId: "copper",
    expertId: "adam-tooze",
    direction: "상승",
    confidence: 60,
    timeframe: "6개월",
    targetRange: { low: 9500, high: 10500 },
    currentAtPrediction: 9280,
    rationale: "중국 경기부양 + 에너지 전환 수요로 구리 구조적 수요 증가. 단기 관세 충격은 있으나 중장기 상승 기조.",
    keyAssumptions: ["중국 부양 효과", "전기차 확대", "공급 제약"],
    publishedAt: "2026-03-04",
    result: "미결",
  },

  // ── 과거 적중/불일치 기록 (투명성) ────────────────────────────────────────
  {
    id: "ap-gold-past-1",
    assetId: "gold",
    expertId: "nouriel-roubini",
    direction: "상승",
    confidence: 80,
    timeframe: "3개월",
    targetRange: { low: 2700, high: 2900 },
    currentAtPrediction: 2650,
    rationale: "지정학 불안 + 탈달러화 기조로 금 사상 최고가 경신 예상.",
    keyAssumptions: ["중동 긴장", "중앙은행 금 매입"],
    publishedAt: "2025-12-01",
    result: "적중",
    actualOutcome: "금 가격 2025년 12월 2,650 → 2026년 2월 2,870달러 돌파. 예측 범위 상단 도달.",
  },
  {
    id: "ap-sp500-past-1",
    assetId: "sp500",
    expertId: "nouriel-roubini",
    direction: "하락",
    confidence: 70,
    timeframe: "3개월",
    targetRange: { low: 5000, high: 5400 },
    currentAtPrediction: 5600,
    rationale: "밸류에이션 과열 + 금리 부담으로 미국 주식 15% 조정 예상.",
    keyAssumptions: ["금리 5% 유지", "실적 피크아웃"],
    publishedAt: "2025-09-01",
    result: "불일치",
    actualOutcome: "S&P500 5,600 → 5,840으로 오히려 4% 상승. AI 투자 모멘텀이 밸류에이션 부담 상쇄.",
  },
  {
    id: "ap-usdkrw-past-1",
    assetId: "usd-krw",
    expertId: "mohamed-el-erian",
    direction: "상승",
    confidence: 70,
    timeframe: "1개월",
    targetRange: { low: 1380, high: 1430 },
    currentAtPrediction: 1370,
    rationale: "한미 금리차 확대로 원화 약세 압력 지속 전망.",
    keyAssumptions: ["한은 인하", "연준 동결"],
    publishedAt: "2025-11-01",
    result: "적중",
    actualOutcome: "원/달러 1,370 → 1,420원으로 약 3.6% 원화 약세. 예측 범위 내.",
  },
  {
    id: "ap-oil-past-1",
    assetId: "wti-oil",
    expertId: "adam-tooze",
    direction: "하락",
    confidence: 60,
    timeframe: "3개월",
    targetRange: { low: 65, high: 72 },
    currentAtPrediction: 75,
    rationale: "OPEC 감산 이탈 + 미국 셰일 증산으로 유가 하락 예상.",
    keyAssumptions: ["OPEC 감산 약화", "미국 증산"],
    publishedAt: "2025-10-01",
    result: "부분적중",
    actualOutcome: "WTI 75 → 69.8달러로 하락. 방향은 맞았으나 예측 범위 하단(65) 미도달.",
  },
];

// ─── 대량 생성 예측 통합 ────────────────────────────────────────────────────
import { generatedAssetPredictions } from "./assetPredictionsGenerated";

const allAssetPredictions: AssetPrediction[] = [...assetPredictions, ...generatedAssetPredictions];

// ─── 접근 함수 ──────────────────────────────────────────────────────────────

export function getPredictionsForAsset(assetId: string): AssetPrediction[] {
  return allAssetPredictions.filter((p) => p.assetId === assetId);
}

export function getActivePredictionsForAsset(assetId: string): AssetPrediction[] {
  return allAssetPredictions.filter((p) => p.assetId === assetId && p.result === "미결");
}

export function getPredictionsByExpert(expertId: string): AssetPrediction[] {
  return allAssetPredictions.filter((p) => p.expertId === expertId);
}

export function getResolvedPredictions(): AssetPrediction[] {
  return allAssetPredictions.filter((p) => p.result && p.result !== "미결");
}

export function getAllAssetPredictions(): AssetPrediction[] {
  return allAssetPredictions;
}

/** 자산별 예측 통계 */
export function getAssetPredictionStats(assetId: string) {
  const preds = getPredictionsForAsset(assetId);
  const active = preds.filter((p) => p.result === "미결");
  const resolved = preds.filter((p) => p.result && p.result !== "미결");
  const correct = resolved.filter((p) => p.result === "적중").length;
  const partial = resolved.filter((p) => p.result === "부분적중").length;
  const incorrect = resolved.filter((p) => p.result === "불일치").length;
  const rate = resolved.length > 0 ? Math.round(((correct + partial * 0.5) / resolved.length) * 100) : 0;

  // 방향별 집계
  const bullish = active.filter((p) => p.direction === "상승").length;
  const bearish = active.filter((p) => p.direction === "하락").length;
  const neutral = active.filter((p) => p.direction === "보합").length;
  const volatile = active.filter((p) => p.direction === "변동성확대").length;

  return {
    totalPredictions: preds.length,
    activePredictions: active.length,
    resolvedPredictions: resolved.length,
    correct,
    partial,
    incorrect,
    accuracyRate: rate,
    bullish,
    bearish,
    neutral,
    volatile,
    bullishPct: active.length > 0 ? Math.round((bullish / active.length) * 100) : 0,
    bearishPct: active.length > 0 ? Math.round((bearish / active.length) * 100) : 0,
  };
}
