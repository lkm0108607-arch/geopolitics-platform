import type { Factor, FactorCategory, AssetDirection, ImpactMagnitude } from "@/types";
import { issues } from "./issues";

/**
 * 투자 변동 요인 데이터베이스
 *
 * 기존 지정학 이슈(Issues)를 Factor로 래핑하고,
 * 새로운 정책·경제지표·시장 요인을 추가한다.
 *
 * 지정학은 여러 요인 카테고리 중 하나로 편입됨.
 */

// ── 기존 Issue → Factor 자동 변환 ───────────────────────────────────────────

const issueFactors: Factor[] = issues.map((issue) => ({
  id: `factor-${issue.id}`,
  title: issue.title,
  category: "지정학" as FactorCategory,
  summary: issue.summary,
  impactedAssetIds: getImpactedAssetsForIssue(issue.id),
  impactDirection: getImpactDirectionForIssue(issue.id) as Record<string, AssetDirection>,
  impactMagnitude: getImpactMagnitudeForIssue(issue.id) as Record<string, ImpactMagnitude>,
  probability: issue.probability,
  probTrend: issue.probTrend,
  relatedExpertIds: issue.relatedExpertIds,
  signals: issue.signals,
  timeline: issue.timeline,
  isActive: issue.isActive,
  updatedAt: issue.updatedAt,
  legacyIssueId: issue.id,
}));

// ── 신규 정책/경제 요인 ─────────────────────────────────────────────────────

const newFactors: Factor[] = [
  // 정책 요인
  {
    id: "factor-fed-policy",
    title: "미 연준 금리 정책",
    category: "정책",
    summary: "연준의 기준금리 결정과 양적긴축/완화 정책. 2026년 인플레이션 재점화 우려로 금리 인하 속도 조절 중.",
    impactedAssetIds: ["us-fed-rate", "us-10y-yield", "usd-krw", "dxy", "gold", "sp500", "nasdaq"],
    impactDirection: {
      "us-fed-rate": "중립", "us-10y-yield": "약세", "usd-krw": "강세",
      "dxy": "강세", "gold": "약세", "sp500": "약세", "nasdaq": "약세",
    },
    impactMagnitude: {
      "us-fed-rate": "강", "us-10y-yield": "강", "usd-krw": "중",
      "dxy": "강", "gold": "중", "sp500": "강", "nasdaq": "강",
    },
    probability: 75,
    probTrend: "유지",
    relatedExpertIds: ["larry-summers", "mohamed-el-erian", "nouriel-roubini"],
    signals: [
      { id: "sig-fed-1", issueId: "factor-fed-policy", title: "연준, 3월 FOMC 금리 동결 예상", description: "시장은 3월 FOMC에서 금리 동결을 80% 확률로 반영. 관세 인플레이션 영향 주시", type: "중립", date: "2026-03-07", source: "CME FedWatch" },
      { id: "sig-fed-2", issueId: "factor-fed-policy", title: "연준 의장, 관세발 인플레이션 경고", description: "파월 의장, 관세가 물가에 0.5-1%p 상방 압력 줄 것이라 공개 발언", type: "경고", date: "2026-03-04", source: "연준 FOMC 의사록" },
    ],
    timeline: [
      { date: "2025-09", title: "연준 첫 금리 인하 (0.50%p)", description: "기준금리 5.25% → 4.75%. 빅컷으로 완화 사이클 시작", significance: "high" },
      { date: "2025-12", title: "추가 인하 (4.50%)", description: "0.25%p 추가 인하. 인플레이션 완화 확인", significance: "medium" },
      { date: "2026-01", title: "인하 중단·관세 리스크 부상", description: "트럼프 관세발 인플레이션 우려로 추가 인하 보류", significance: "high" },
    ],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "factor-bok-policy",
    title: "한국은행 통화정책",
    category: "정책",
    summary: "한국은행 기준금리 결정. 내수 부진과 환율 방어 사이 딜레마. 2026년 추가 인하 기대.",
    impactedAssetIds: ["kr-base-rate", "usd-krw", "kospi", "kosdaq"],
    impactDirection: { "kr-base-rate": "약세", "usd-krw": "약세", "kospi": "강세", "kosdaq": "강세" },
    impactMagnitude: { "kr-base-rate": "강", "usd-krw": "중", "kospi": "중", "kosdaq": "중" },
    probability: 65,
    probTrend: "상승",
    relatedExpertIds: [],
    signals: [
      { id: "sig-bok-1", issueId: "factor-bok-policy", title: "한은, 4월 추가 인하 가능성 시사", description: "이창용 총재, 경기 하방 리스크 언급하며 추가 인하 여지 열어둠", type: "긍정", date: "2026-03-06", source: "한국은행" },
    ],
    timeline: [
      { date: "2025-10", title: "한은 기준금리 인하 (3.25%)", description: "17개월 만에 인하 전환. 내수 부진 대응", significance: "high" },
      { date: "2026-01", title: "추가 인하 (2.75%)", description: "연속 인하. 부동산·소비 부양 의도", significance: "high" },
    ],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "factor-us-inflation",
    title: "미국 인플레이션 동향",
    category: "경제지표",
    summary: "CPI·PCE 물가지표. 관세 정책으로 인플레이션 재점화 우려 확대.",
    impactedAssetIds: ["us-fed-rate", "us-10y-yield", "gold", "dxy"],
    impactDirection: { "us-fed-rate": "강세", "us-10y-yield": "강세", "gold": "강세", "dxy": "강세" },
    impactMagnitude: { "us-fed-rate": "강", "us-10y-yield": "강", "gold": "중", "dxy": "중" },
    probability: 70,
    probTrend: "상승",
    relatedExpertIds: ["larry-summers", "mohamed-el-erian"],
    signals: [
      { id: "sig-cpi-1", issueId: "factor-us-inflation", title: "2월 CPI 3.1% — 시장 예상 상회", description: "관세 영향 본격 반영 시작. 에너지 제외 코어 CPI 3.4%", type: "경고", date: "2026-03-05", source: "BLS" },
    ],
    timeline: [
      { date: "2025-06", title: "CPI 2.3%까지 하락", description: "인플레이션 둔화 확인. 연준 인하 근거", significance: "high" },
      { date: "2026-01", title: "CPI 2.8%로 반등", description: "관세 부과 본격화 이후 물가 반등 시작", significance: "high" },
    ],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "factor-us-recession",
    title: "미국 경기침체 리스크",
    category: "경제지표",
    summary: "관세 충격, 소비 위축, 고용 둔화로 미국 경기침체 확률 상승.",
    impactedAssetIds: ["sp500", "nasdaq", "wti-oil", "copper", "us-10y-yield"],
    impactDirection: { "sp500": "약세", "nasdaq": "약세", "wti-oil": "약세", "copper": "약세", "us-10y-yield": "약세" },
    impactMagnitude: { "sp500": "강", "nasdaq": "강", "wti-oil": "중", "copper": "중", "us-10y-yield": "강" },
    probability: 40,
    probTrend: "상승",
    relatedExpertIds: ["nouriel-roubini", "larry-summers"],
    signals: [
      { id: "sig-recess-1", issueId: "factor-us-recession", title: "Atlanta Fed GDPNow 1.2%로 하향", description: "1분기 GDP 성장률 추정치 급락. 소비 지출 둔화 반영", type: "경고", date: "2026-03-06", source: "Atlanta Fed" },
    ],
    timeline: [
      { date: "2025-Q4", title: "GDP 2.1% 성장", description: "관세 영향 미반영. 양호한 성장세", significance: "medium" },
      { date: "2026-Q1", title: "성장 둔화 조짐", description: "소비자 심리 악화, 기업 투자 보류 확대", significance: "high" },
    ],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "factor-china-stimulus",
    title: "중국 경기부양 정책",
    category: "정책",
    summary: "중국 정부의 재정·통화 부양 정책. 부동산 위기 대응과 내수 확대 기조.",
    impactedAssetIds: ["copper", "wti-oil", "kospi"],
    impactDirection: { "copper": "강세", "wti-oil": "강세", "kospi": "강세" },
    impactMagnitude: { "copper": "강", "wti-oil": "중", "kospi": "중" },
    probability: 60,
    probTrend: "상승",
    relatedExpertIds: [],
    signals: [
      { id: "sig-china-1", issueId: "factor-china-stimulus", title: "중국 양회, GDP 5% 목표 유지", description: "2026년 성장 목표 5%. 특별국채 2조 위안 발행 계획", type: "긍정", date: "2026-03-05", source: "중국 양회" },
    ],
    timeline: [],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "factor-opec-policy",
    title: "OPEC+ 감산 정책",
    category: "정책",
    summary: "OPEC+의 원유 생산량 조절. 사우디 주도 감산 유지 vs 시장 점유율 확보 딜레마.",
    impactedAssetIds: ["wti-oil"],
    impactDirection: { "wti-oil": "강세" },
    impactMagnitude: { "wti-oil": "강" },
    probability: 55,
    probTrend: "하락",
    relatedExpertIds: [],
    signals: [
      { id: "sig-opec-1", issueId: "factor-opec-policy", title: "OPEC+ 4월부터 감산 일부 해제", description: "일산 40만 배럴 증산 예정. 유가 하방 압력", type: "경고", date: "2026-03-03", source: "OPEC" },
    ],
    timeline: [],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "factor-ai-boom",
    title: "AI 산업 투자 확대",
    category: "구조적변화",
    summary: "빅테크의 AI 인프라 투자 급증. 반도체·데이터센터·전력 수요 구조적 성장.",
    impactedAssetIds: ["nasdaq", "sp500", "kospi", "kosdaq", "copper"],
    impactDirection: { "nasdaq": "강세", "sp500": "강세", "kospi": "강세", "kosdaq": "강세", "copper": "강세" },
    impactMagnitude: { "nasdaq": "강", "sp500": "중", "kospi": "중", "kosdaq": "중", "copper": "약" },
    probability: 80,
    probTrend: "유지",
    relatedExpertIds: [],
    signals: [
      { id: "sig-ai-1", issueId: "factor-ai-boom", title: "MS·구글·아마존, AI 설비투자 사상 최대", description: "3사 합산 2026년 AI 투자 $2,500억 계획. 전년 대비 40% 증가", type: "긍정", date: "2026-03-04", source: "각사 실적발표" },
    ],
    timeline: [],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "factor-usd-krw-pressure",
    title: "원화 약세 압력",
    category: "시장심리",
    summary: "미국 고금리 장기화 + 한국 금리 인하 + 관세 불확실성으로 원화 약세 지속.",
    impactedAssetIds: ["usd-krw", "kospi"],
    impactDirection: { "usd-krw": "강세", "kospi": "약세" },
    impactMagnitude: { "usd-krw": "중", "kospi": "약" },
    probability: 70,
    probTrend: "상승",
    relatedExpertIds: [],
    signals: [
      { id: "sig-krw-1", issueId: "factor-usd-krw-pressure", title: "외국인 3월 순매도 1.5조원", description: "관세 불확실성에 외국인 한국 주식 매도세 지속", type: "경고", date: "2026-03-07", source: "한국거래소" },
    ],
    timeline: [],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "factor-global-risk",
    title: "글로벌 리스크 오프",
    category: "시장심리",
    summary: "지정학 불확실성 + 관세 전쟁 + 경기 둔화로 안전자산 선호 심리 확대.",
    impactedAssetIds: ["gold", "dxy", "us-10y-yield"],
    impactDirection: { "gold": "강세", "dxy": "강세", "us-10y-yield": "약세" },
    impactMagnitude: { "gold": "강", "dxy": "중", "us-10y-yield": "중" },
    probability: 65,
    probTrend: "상승",
    relatedExpertIds: [],
    signals: [],
    timeline: [],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "factor-kr-economy",
    title: "한국 내수 경기 둔화",
    category: "경제지표",
    summary: "가계부채 부담, 소비 위축, 수출 의존도 상승. 관세 충격 시 한국 경기 하방 리스크.",
    impactedAssetIds: ["kospi", "kosdaq", "kr-base-rate"],
    impactDirection: { "kospi": "약세", "kosdaq": "약세", "kr-base-rate": "약세" },
    impactMagnitude: { "kospi": "중", "kosdaq": "중", "kr-base-rate": "중" },
    probability: 55,
    probTrend: "상승",
    relatedExpertIds: [],
    signals: [],
    timeline: [],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "factor-green-transition",
    title: "에너지 전환·전기차 확대",
    category: "구조적변화",
    summary: "글로벌 탈탄소·전기차·재생에너지 투자. 구리·리튬 등 원자재 구조적 수요 증가.",
    impactedAssetIds: ["copper"],
    impactDirection: { "copper": "강세" },
    impactMagnitude: { "copper": "중" },
    probability: 70,
    probTrend: "유지",
    relatedExpertIds: [],
    signals: [],
    timeline: [],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "factor-boj-policy",
    title: "일본은행 통화정책 정상화",
    category: "정책",
    summary: "BOJ의 마이너스금리 탈출 후 추가 금리 인상. 엔 캐리트레이드 청산 리스크.",
    impactedAssetIds: ["usd-jpy"],
    impactDirection: { "usd-jpy": "약세" },
    impactMagnitude: { "usd-jpy": "강" },
    probability: 60,
    probTrend: "유지",
    relatedExpertIds: [],
    signals: [],
    timeline: [
      { date: "2024-03", title: "BOJ 마이너스금리 해제", description: "17년 만에 금리 인상 (0% → 0.1%)", significance: "high" },
      { date: "2025-01", title: "BOJ 0.5%로 인상", description: "추가 인상으로 통화정책 정상화 가속", significance: "high" },
    ],
    isActive: true,
    updatedAt: "2026-03-08",
  },
];

// ── 전체 Factor 합치기 ──────────────────────────────────────────────────────

export const factors: Factor[] = [...newFactors, ...issueFactors];

// ── 접근 함수 ───────────────────────────────────────────────────────────────

export function getFactorById(id: string): Factor | undefined {
  return factors.find((f) => f.id === id);
}

export function getFactorsByCategory(category: FactorCategory): Factor[] {
  return factors.filter((f) => f.category === category);
}

export function getFactorsForAsset(assetId: string): Factor[] {
  return factors.filter((f) => f.impactedAssetIds.includes(assetId));
}

export function getActiveFactors(): Factor[] {
  return factors.filter((f) => f.isActive);
}

// ── Issue → Factor 매핑 헬퍼 ────────────────────────────────────────────────

function getImpactedAssetsForIssue(issueId: string): string[] {
  const mapping: Record<string, string[]> = {
    "us-tariff-war": ["sp500", "nasdaq", "kospi", "usd-krw", "gold", "wti-oil", "dxy"],
    "russia-ukraine": ["wti-oil", "gold", "dxy"],
    "us-china-taiwan": ["nasdaq", "kospi", "usd-krw", "gold"],
    "global-ai-governance": ["nasdaq", "kospi", "kosdaq"],
    "north-korea": ["kospi", "usd-krw", "gold"],
    "europe-fragmentation": ["dxy", "gold"],
  };
  return mapping[issueId] || ["gold", "dxy"];
}

function getImpactDirectionForIssue(issueId: string): Record<string, string> {
  const mapping: Record<string, Record<string, string>> = {
    "us-tariff-war": { "sp500": "약세", "nasdaq": "약세", "kospi": "약세", "usd-krw": "강세", "gold": "강세", "wti-oil": "약세", "dxy": "강세" },
    "russia-ukraine": { "wti-oil": "강세", "gold": "강세", "dxy": "강세" },
    "us-china-taiwan": { "nasdaq": "약세", "kospi": "약세", "usd-krw": "강세", "gold": "강세" },
  };
  return mapping[issueId] || {};
}

function getImpactMagnitudeForIssue(issueId: string): Record<string, string> {
  const mapping: Record<string, Record<string, string>> = {
    "us-tariff-war": { "sp500": "강", "nasdaq": "강", "kospi": "강", "usd-krw": "중", "gold": "중", "wti-oil": "중", "dxy": "중" },
    "russia-ukraine": { "wti-oil": "중", "gold": "약", "dxy": "약" },
    "us-china-taiwan": { "nasdaq": "강", "kospi": "강", "usd-krw": "중", "gold": "중" },
  };
  return mapping[issueId] || {};
}
