import type { Asset, AssetCategory } from "@/types";
import { koreanETFs } from "./koreanETFs";

/**
 * 핵심 투자 자산/지표 데이터베이스
 *
 * 투자자가 실제로 추적하는 주요 자산과 지표들.
 * 각 자산은 영향 요인(Factor)과 관련 ETF에 연결된다.
 */
export const assets: Asset[] = [
  // ── 금리 ──────────────────────────────────────────────────────────────────
  {
    id: "us-fed-rate",
    name: "미국 연방기금금리",
    nameEn: "US Federal Funds Rate",
    category: "금리",
    unit: "%",
    currentValue: 4.50,
    previousValue: 4.50,
    changePercent: 0,
    description: "미 연준(Fed)이 설정하는 기준금리. 글로벌 자산 가격의 최상위 변수.",
    relatedFactorIds: ["factor-fed-policy", "factor-us-inflation", "factor-us-tariff-war"],
    relatedETFTickers: ["305080", "451600"],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "us-10y-yield",
    name: "미국 10년물 국채금리",
    nameEn: "US 10-Year Treasury Yield",
    category: "금리",
    unit: "%",
    currentValue: 4.28,
    previousValue: 4.35,
    changePercent: -1.6,
    description: "글로벌 장기금리의 벤치마크. 주식·부동산·채권 모든 자산의 밸류에이션에 영향.",
    relatedFactorIds: ["factor-fed-policy", "factor-us-inflation", "factor-us-recession"],
    relatedETFTickers: ["305080", "451600"],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "kr-base-rate",
    name: "한국 기준금리",
    nameEn: "Bank of Korea Base Rate",
    category: "금리",
    unit: "%",
    currentValue: 2.75,
    previousValue: 3.00,
    changePercent: -8.3,
    description: "한국은행이 결정하는 기준금리. 원화 자산과 부동산 시장의 핵심 변수.",
    relatedFactorIds: ["factor-bok-policy", "factor-kr-economy", "factor-usd-krw-pressure"],
    relatedETFTickers: ["439870", "451600"],
    isActive: true,
    updatedAt: "2026-03-08",
  },

  // ── 환율 ──────────────────────────────────────────────────────────────────
  {
    id: "usd-krw",
    name: "원/달러 환율",
    nameEn: "USD/KRW",
    category: "환율",
    unit: "원",
    currentValue: 1445,
    previousValue: 1432,
    changePercent: 0.9,
    description: "원/달러 환율. 한국 수출기업 실적, 외국인 투자, 수입물가에 직접 영향.",
    relatedFactorIds: ["factor-fed-policy", "factor-bok-policy", "factor-us-tariff-war", "factor-usd-krw-pressure"],
    relatedETFTickers: ["261240", "261270"],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "dxy",
    name: "달러인덱스 (DXY)",
    nameEn: "US Dollar Index",
    category: "환율",
    unit: "pt",
    currentValue: 104.2,
    previousValue: 103.8,
    changePercent: 0.4,
    description: "주요 6개국 통화 대비 달러 가치. 원자재·신흥국 자산과 역의 상관관계.",
    relatedFactorIds: ["factor-fed-policy", "factor-us-tariff-war", "factor-global-risk"],
    relatedETFTickers: ["261240"],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "usd-jpy",
    name: "달러/엔 환율",
    nameEn: "USD/JPY",
    category: "환율",
    unit: "엔",
    currentValue: 148.5,
    previousValue: 150.2,
    changePercent: -1.1,
    description: "달러/엔 환율. 일본 통화정책 변화의 바로미터. 엔 캐리트레이드 리스크 지표.",
    relatedFactorIds: ["factor-boj-policy", "factor-fed-policy"],
    relatedETFTickers: [],
    isActive: true,
    updatedAt: "2026-03-08",
  },

  // ── 원자재 ────────────────────────────────────────────────────────────────
  {
    id: "gold",
    name: "금 (순금 24K)",
    nameEn: "Gold 24K",
    category: "원자재",
    unit: "원/3.75g",
    currentValue: 1077000,
    previousValue: 1100000,
    changePercent: -2.1,
    description: "순금(24K) 시세. 1돈(3.75g) 기준 한국금거래소 '살때' 가격. 대표 안전자산으로 인플레이션 헤지, 지정학 리스크 바로미터.",
    relatedFactorIds: ["factor-fed-policy", "factor-us-inflation", "factor-global-risk", "factor-us-tariff-war"],
    relatedETFTickers: ["132030", "319640"],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "wti-oil",
    name: "WTI 원유",
    nameEn: "WTI Crude Oil",
    category: "원자재",
    unit: "원/리터",
    currentValue: 614,
    previousValue: 635,
    changePercent: -3.3,
    description: "글로벌 에너지 가격 기준. 인플레이션·운송비·화학/에너지 기업 실적에 직접 영향. 1배럴 ≈ 159리터 환산.",
    relatedFactorIds: ["factor-opec-policy", "factor-us-tariff-war", "factor-us-recession", "factor-russia-ukraine"],
    relatedETFTickers: ["261220", "217770"],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "copper",
    name: "구리",
    nameEn: "Copper",
    category: "원자재",
    unit: "원/kg",
    currentValue: 13612,
    previousValue: 13410,
    changePercent: 1.5,
    description: "경기선행지표(Dr. Copper). 글로벌 제조업·건설·전기차 수요 반영. LME 기준 원/kg 환산.",
    relatedFactorIds: ["factor-china-stimulus", "factor-us-recession", "factor-green-transition"],
    relatedETFTickers: [],
    isActive: true,
    updatedAt: "2026-03-08",
  },

  // ── 지수 ──────────────────────────────────────────────────────────────────
  {
    id: "kospi",
    name: "KOSPI",
    nameEn: "KOSPI",
    category: "지수",
    unit: "pt",
    currentValue: 2530,
    previousValue: 2565,
    changePercent: -1.4,
    description: "한국 대표 주가지수. 반도체·자동차·금융 등 수출 대기업 중심.",
    relatedFactorIds: ["factor-us-tariff-war", "factor-kr-economy", "factor-usd-krw-pressure", "factor-china-stimulus"],
    relatedETFTickers: ["069500", "229200"],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "sp500",
    name: "S&P 500",
    nameEn: "S&P 500",
    category: "지수",
    unit: "pt",
    currentValue: 5770,
    previousValue: 5840,
    changePercent: -1.2,
    description: "미국 대형주 500개 기업 지수. 글로벌 주식시장 방향의 기준.",
    relatedFactorIds: ["factor-fed-policy", "factor-us-tariff-war", "factor-us-recession", "factor-ai-boom"],
    relatedETFTickers: ["360750", "379800"],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "nasdaq",
    name: "나스닥 종합",
    nameEn: "NASDAQ Composite",
    category: "지수",
    unit: "pt",
    currentValue: 18200,
    previousValue: 18520,
    changePercent: -1.7,
    description: "미국 기술주 중심 지수. AI·반도체·빅테크 섹터 흐름 대표.",
    relatedFactorIds: ["factor-fed-policy", "factor-ai-boom", "factor-us-tariff-war"],
    relatedETFTickers: ["133690", "409820"],
    isActive: true,
    updatedAt: "2026-03-08",
  },
  {
    id: "kosdaq",
    name: "KOSDAQ",
    nameEn: "KOSDAQ",
    category: "지수",
    unit: "pt",
    currentValue: 725,
    previousValue: 742,
    changePercent: -2.3,
    description: "한국 중소형주·바이오·IT 기업 지수. 개인투자자 비중 높음.",
    relatedFactorIds: ["factor-bok-policy", "factor-kr-economy", "factor-ai-boom"],
    relatedETFTickers: ["229200"],
    isActive: true,
    updatedAt: "2026-03-08",
  },

];

// ─── ETF 카테고리 → 자산 카테고리 매핑 ──────────────────────────────────────

const ETF_CATEGORY_MAP: Record<string, AssetCategory> = {
  "국내주식": "산업",
  "해외주식": "지수",
  "채권": "금리",
  "원자재": "원자재",
  "인버스/레버리지": "지수",
  "통화": "환율",
  "리츠": "산업",
  "테마": "산업",
};

// ─── 접근 함수 ──────────────────────────────────────────────────────────────

export function getAssetById(id: string): Asset | undefined {
  // 기존 핵심 자산에서 먼저 검색
  const coreAsset = assets.find((a) => a.id === id);
  if (coreAsset) return coreAsset;

  // ETF ID 형식 (etf-069500) 에서 검색
  if (id.startsWith("etf-")) {
    const ticker = id.replace("etf-", "");
    const etf = koreanETFs.find((e) => e.ticker === ticker);
    if (etf) {
      return {
        id,
        name: etf.nameKr,
        nameEn: etf.name,
        category: ETF_CATEGORY_MAP[etf.category] ?? "산업",
        unit: "원",
        currentValue: 0,
        previousValue: 0,
        changePercent: 0,
        description: `${etf.provider} ${etf.nameKr} (${etf.subCategory})`,
        relatedFactorIds: [],
        relatedETFTickers: [etf.ticker],
        isActive: true,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
    }
  }

  return undefined;
}

export function getAssetsByCategory(category: AssetCategory): Asset[] {
  return assets.filter((a) => a.category === category);
}

export function getActiveAssets(): Asset[] {
  return assets.filter((a) => a.isActive);
}

export function getAllAssetIds(): string[] {
  return assets.map((a) => a.id);
}
