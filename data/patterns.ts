import type { HistoricalPattern } from "@/types";

/**
 * 과거 유사 패턴 데이터베이스
 *
 * 현재 상황과 유사한 과거 사례를 매칭하여 자산 움직임을 예측하는 근거로 활용.
 * 유사도(similarity)는 핵심 조건 일치도로 평가.
 */
export const patterns: HistoricalPattern[] = [
  // ── 금 관련 패턴 ──────────────────────────────────────────────────────────
  {
    id: "pat-gold-1",
    assetId: "gold",
    title: "2018-2019 미중 무역전쟁기 금 가격",
    period: "2018.03 - 2019.08",
    description: "트럼프 1기 대중 관세 부과로 무역전쟁 본격화. 초기 달러 강세로 금 약세였으나, 불확실성 장기화되며 금 급등.",
    similarity: 82,
    outcome: "금 가격 $1,200 → $1,550, 약 29% 상승",
    assetMovement: "초기 3개월 약보합 후 12개월간 강세 전환",
    keyDifferences: ["현재 금 가격이 당시 대비 2배 높음", "당시 인플레이션 2% 미만 vs 현재 3% 이상", "현재 중앙은행 금 매입 규모가 훨씬 큼"],
  },
  {
    id: "pat-gold-2",
    assetId: "gold",
    title: "2008 금융위기 초기 금 움직임",
    period: "2008.03 - 2008.11",
    description: "금융위기 초기 유동성 확보를 위한 금 매도로 일시 급락 후, 양적완화 시작과 함께 역사적 강세장 진입.",
    similarity: 45,
    outcome: "금 $1,000 → $700(급락) → 이후 $1,900까지 상승",
    assetMovement: "위기 초기 30% 급락 후 3년간 170% 상승",
    keyDifferences: ["현재는 금융위기가 아닌 무역전쟁", "유동성 위기 가능성 낮음", "이미 금이 사상 최고가 부근"],
  },

  // ── 원/달러 환율 패턴 ─────────────────────────────────────────────────────
  {
    id: "pat-usdkrw-1",
    assetId: "usd-krw",
    title: "2018 미중 무역전쟁 시 원/달러",
    period: "2018.03 - 2019.01",
    description: "트럼프 1기 관세 부과 시 원/달러 1,060원 → 1,140원까지 약 7.5% 원화 약세.",
    similarity: 78,
    outcome: "원/달러 1,060 → 1,140원 (약 7.5% 원화 약세)",
    assetMovement: "관세 확대와 함께 계단식 원화 약세",
    keyDifferences: ["현재 원/달러가 이미 1,440원대로 높은 수준", "당시 한은 금리 1.5% vs 현재 2.75%", "현재 관세 규모가 당시보다 훨씬 큼"],
  },
  {
    id: "pat-usdkrw-2",
    assetId: "usd-krw",
    title: "2022 연준 급격 인상기 원/달러",
    period: "2022.03 - 2022.10",
    description: "연준 빅스텝 연속 인상으로 달러 초강세. 원/달러 1,200원 → 1,445원까지 급등.",
    similarity: 65,
    outcome: "원/달러 1,200 → 1,445원 (약 20% 원화 약세)",
    assetMovement: "7개월간 급격한 원화 약세 후 연말 반등",
    keyDifferences: ["현재 연준은 인상이 아닌 동결/인하 모드", "당시 한은도 따라 인상 vs 현재 인하 중", "원화 약세 요인이 금리차가 아닌 관세"],
  },

  // ── S&P 500 패턴 ──────────────────────────────────────────────────────────
  {
    id: "pat-sp500-1",
    assetId: "sp500",
    title: "2018 미중 무역전쟁 S&P 500",
    period: "2018.01 - 2018.12",
    description: "관세 부과 시작 후 변동성 급등. 연말 20% 조정 후 2019년 연준 피벗과 함께 급반등.",
    similarity: 75,
    outcome: "S&P500 2,870 → 2,350(조정) → 2019년 3,200 회복",
    assetMovement: "연중 박스권 후 Q4에 급락, 이듬해 V자 반등",
    keyDifferences: ["현재 밸류에이션(PER 22배)이 당시(17배)보다 높음", "AI 투자 사이클이 추가 변수", "관세 규모와 범위가 훨씬 큼"],
  },
  {
    id: "pat-sp500-2",
    assetId: "sp500",
    title: "1930년대 스무트-홀리 관세법",
    period: "1930.06 - 1932.07",
    description: "스무트-홀리 관세법 시행 후 보복 관세 사이클로 세계 무역 66% 감소. 대공황 심화.",
    similarity: 35,
    outcome: "다우존스 86% 폭락",
    assetMovement: "2년간 지속적 하락",
    keyDifferences: ["현재 금융 시스템 안전망 존재", "중앙은행 개입 가능", "관세율 수준이 다름", "글로벌 공급망 구조 상이"],
  },

  // ── 유가 패턴 ─────────────────────────────────────────────────────────────
  {
    id: "pat-oil-1",
    assetId: "wti-oil",
    title: "2019 미중 무역전쟁 수요 둔화기 유가",
    period: "2019.04 - 2019.12",
    description: "무역전쟁으로 글로벌 제조업 PMI 하락, 수요 전망 악화. OPEC 감산에도 유가 하락 압력.",
    similarity: 72,
    outcome: "WTI $66 → $54 (약 18% 하락)",
    assetMovement: "수요 우려로 완만한 하락세",
    keyDifferences: ["현재 OPEC+ 감산 해제 예정 (추가 하방 압력)", "러우전쟁 지정학 프리미엄 존재", "미국 셰일 생산 사상 최고"],
  },

  // ── KOSPI 패턴 ────────────────────────────────────────────────────────────
  {
    id: "pat-kospi-1",
    assetId: "kospi",
    title: "2018 무역전쟁 시 KOSPI",
    period: "2018.01 - 2018.12",
    description: "미중 무역전쟁 + 반도체 다운사이클로 KOSPI 2,600 → 2,000까지 하락. 수출 의존 한국이 큰 타격.",
    similarity: 80,
    outcome: "KOSPI 2,600 → 2,000 (약 23% 하락)",
    assetMovement: "1년간 하락 추세, 반도체 업황과 동조",
    keyDifferences: ["현재 반도체 업황은 AI 수요로 상대적 양호", "한은 금리 인하 사이클 (당시는 인상)", "밸류에이션이 이미 낮은 수준"],
  },
  {
    id: "pat-kospi-2",
    assetId: "kospi",
    title: "2022 연준 긴축 + 원화 약세기 KOSPI",
    period: "2022.01 - 2022.09",
    description: "연준 급격 인상 + 원화 약세 + 외국인 매도로 KOSPI 2,990 → 2,155 급락.",
    similarity: 60,
    outcome: "KOSPI 2,990 → 2,155 (약 28% 하락)",
    assetMovement: "9개월간 하락, 외국인 순매도 주도",
    keyDifferences: ["현재 연준은 동결 모드", "하락 요인이 금리가 아닌 관세", "AI·반도체 모멘텀이 방어 요인"],
  },

  // ── 미 10년물 국채금리 패턴 ───────────────────────────────────────────────
  {
    id: "pat-10y-1",
    assetId: "us-10y-yield",
    title: "2021-2022 인플레이션 급등기 장기금리",
    period: "2021.08 - 2022.10",
    description: "CPI 9%까지 급등하며 10년물 금리 1.2% → 4.3%로 3%p 이상 폭등. 채권 역사적 약세장.",
    similarity: 50,
    outcome: "10년물 1.2% → 4.3% (3.1%p 상승)",
    assetMovement: "14개월간 급격한 금리 상승",
    keyDifferences: ["현재 인플레이션은 3%대로 당시보다 낮음", "금리가 이미 높은 수준에서 시작", "관세발 인플레이션은 공급 측 요인"],
  },

  // ── 달러인덱스 패턴 ───────────────────────────────────────────────────────
  {
    id: "pat-dxy-1",
    assetId: "dxy",
    title: "2018 무역전쟁기 달러 강세",
    period: "2018.02 - 2018.11",
    description: "미국 관세 부과로 안전자산 수요 + 미국 예외론으로 달러 강세. DXY 88 → 97.",
    similarity: 70,
    outcome: "DXY 88 → 97 (약 10% 달러 강세)",
    assetMovement: "9개월간 달러 강세, 이후 횡보",
    keyDifferences: ["현재 DXY가 이미 104로 높은 수준", "관세 규모가 당시보다 큼", "재정적자 확대가 달러 약세 요인으로 상충"],
  },
];

// ─── 접근 함수 ──────────────────────────────────────────────────────────────

export function getPatternsForAsset(assetId: string): HistoricalPattern[] {
  return patterns.filter((p) => p.assetId === assetId).sort((a, b) => b.similarity - a.similarity);
}

export function getHighSimilarityPatterns(minSimilarity = 70): HistoricalPattern[] {
  return patterns.filter((p) => p.similarity >= minSimilarity).sort((a, b) => b.similarity - a.similarity);
}
