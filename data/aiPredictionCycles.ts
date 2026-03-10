import type {
  AIPredictionCycle,
  AICycleResult,
  AICyclePerformance,
  VerificationLog,
  AICyclePrediction,
} from "@/types";
import { assets } from "./assets";

export interface IndustryETFPrediction {
  industryAssetId: string;
  industryName: string;
  etfs: {
    ticker: string;
    nameKr: string;
    name: string;
    direction: "상승" | "하락" | "보합" | "변동성확대";
    expectedReturn3d: string;  // 3-day expected return range
    expectedReturn1m: string;  // 1-month expected return range
    confidence: number;
    rationale: string;
    aiRecommendation: "적극매수" | "매수" | "보유" | "비중축소" | "매도";
    currentPrice: number;
  }[];
}

/**
 * AI 예측 사이클 시스템 (3일 주기)
 *
 * 핵심 원칙:
 * 1. 3일마다 새로운 예측 사이클 발행
 * 2. 전문가 컨센서스 + 팩터 분석 + 히스토리컬 패턴 기반
 * 3. 사이클 종료 후 결과 평가 (적중/부분적중/불일치)
 * 4. 60분마다 뉴스 대비 자동 검증
 */

// ─── 과거 사이클 (결과 확정) ──────────────────────────────────────────────

const pastCycles: AIPredictionCycle[] = [
  {
    id: "cycle-2026-02-24",
    cycleNumber: 1,
    startDate: "2026-02-24",
    endDate: "2026-02-27",
    status: "completed",
    createdAt: "2026-02-24T09:00:00+09:00",
    predictions: [
      {
        id: "cp-1-gold",
        assetId: "gold",
        direction: "상승",
        probability: 72,
        confidence: 78,
        targetRange: { low: 990000, high: 1020000 },
        rationale: "중앙은행 금 매입 지속 + 관세 불확실성 확대로 안전자산 수요 증가. 한국금거래소 순금 살때 98만5천원/돈 지지선 확인 후 반등 예상.",
        keyEvidence: [
          "중국 인민은행 17개월 연속 금 보유량 확대 (2026.02 기준 2,292톤)",
          "트럼프 2기 관세 정책 불확실성으로 VIX 22.5 → 28.3 급등",
          "실질금리 하락 추세 (10Y TIPS: 1.85% → 1.72%)",
        ],
        sources: [
          { title: "World Gold Council Q4 2025 Report", date: "2026-02-20" },
          { title: "Bloomberg: Central Banks Gold Buying Surge", date: "2026-02-22" },
        ],
        supportingExpertIds: ["nouriel-roubini", "ray-dalio", "mohamed-el-erian"],
        opposingExpertIds: [],
        scenario: "관세전쟁 확대 시나리오에서 금은 핵심 안전자산으로 수요 증가. 한국금거래소 살때 기준 101만원/돈 돌파 목표.",
        startPrice: 985000,
      },
      {
        id: "cp-1-sp500",
        assetId: "sp500",
        direction: "하락",
        probability: 65,
        confidence: 70,
        rationale: "관세 정책 발표 앞두고 리스크 회피 심리 확산. 기업 실적 가이던스 하향 조정 증가.",
        keyEvidence: [
          "S&P 500 EPS 전망 $247 → $241로 하향 (FactSet 컨센서스)",
          "관세 불확실성으로 기업 설비투자 계획 15% 감소 (Conference Board)",
          "외국인 미국 주식 순매도 3주 연속",
        ],
        sources: [
          { title: "FactSet Earnings Insight", date: "2026-02-21" },
          { title: "Conference Board CEO Survey", date: "2026-02-19" },
        ],
        supportingExpertIds: ["nouriel-roubini", "larry-summers"],
        opposingExpertIds: ["ray-dalio"],
        scenario: "관세 발표 전 불확실성으로 단기 조정. 5,700선 지지 여부가 핵심.",
        startPrice: 5840,
      },
      {
        id: "cp-1-usdkrw",
        assetId: "usd-krw",
        direction: "상승",
        probability: 68,
        confidence: 72,
        targetRange: { low: 1420, high: 1450 },
        rationale: "한미 금리차 확대 + 수출 둔화 우려로 원화 약세 압력 지속.",
        keyEvidence: [
          "한미 금리차 175bp 유지 (미국 4.50% vs 한국 2.75%)",
          "2월 수출 전년대비 -3.2% (반도체 제외 시 -8.5%)",
          "외국인 코스피 순매도 1.2조원 (2월 넷째 주)",
        ],
        sources: [
          { title: "한국은행 통화정책 의사록", date: "2026-02-20" },
          { title: "산업통상자원부 수출 동향", date: "2026-02-22" },
        ],
        supportingExpertIds: ["mohamed-el-erian", "larry-summers"],
        opposingExpertIds: [],
        scenario: "한은 추가 인하 기대 + 수출 둔화로 원화 약세. 1,440원 돌파 시 1,460원까지 열림.",
        startPrice: 1432,
      },
      {
        id: "cp-1-kospi",
        assetId: "kospi",
        direction: "하락",
        probability: 62,
        confidence: 65,
        targetRange: { low: 2480, high: 2550 },
        rationale: "외국인 매도세 지속 + 관세 우려로 수출주 약세 예상.",
        keyEvidence: [
          "외국인 2월 코스피 누적 순매도 3.8조원",
          "삼성전자 목표주가 하향 리포트 증가",
          "원화 약세로 외국인 환차손 우려",
        ],
        sources: [
          { title: "한국거래소 외국인 매매 동향", date: "2026-02-23" },
        ],
        supportingExpertIds: ["larry-summers"],
        opposingExpertIds: ["mohamed-el-erian"],
        scenario: "2,500선 이탈 가능성. 반도체 업황 회복 확인 시 반등 가능.",
        startPrice: 2565,
      },
      {
        id: "cp-1-wti",
        assetId: "wti-oil",
        direction: "하락",
        probability: 58,
        confidence: 62,
        targetRange: { low: 600, high: 645 },
        rationale: "글로벌 수요 둔화 우려 + OPEC+ 감산 준수율 하락.",
        keyEvidence: [
          "IEA 글로벌 석유 수요 전망 하향 (100.8 → 100.2 mb/d)",
          "OPEC+ 일부 국가 감산 이탈 징후",
          "미국 전략비축유 방출 가능성 언급",
        ],
        sources: [
          { title: "IEA Oil Market Report", date: "2026-02-20" },
        ],
        supportingExpertIds: ["adam-tooze"],
        opposingExpertIds: [],
        scenario: "수요 둔화 + 공급 확대로 618원/리터 하회 가능.",
        startPrice: 641,
      },
    ],
  },
  {
    id: "cycle-2026-02-27",
    cycleNumber: 2,
    startDate: "2026-02-27",
    endDate: "2026-03-02",
    status: "completed",
    createdAt: "2026-02-27T09:00:00+09:00",
    predictions: [
      {
        id: "cp-2-gold",
        assetId: "gold",
        direction: "상승",
        probability: 75,
        confidence: 80,
        targetRange: { low: 1020000, high: 1045000 },
        rationale: "트럼프 관세 발표 후 안전자산 랠리 가속. 한국금거래소 살때 기준 순금 103만원/돈 돌파 임박.",
        keyEvidence: [
          "트럼프, 중국산 추가 관세 25% 발표 (2/26)",
          "금 ETF(GLD) 유입 $2.1B (주간 최대)",
          "달러인덱스 하락과 동시 금 강세 (역상관 이탈)",
        ],
        sources: [
          { title: "Reuters: Trump tariff announcement", date: "2026-02-26" },
          { title: "SPDR Gold Trust Holdings", date: "2026-02-27" },
        ],
        supportingExpertIds: ["nouriel-roubini", "ray-dalio"],
        opposingExpertIds: [],
        scenario: "관세전쟁 본격화 → 순금 살때 103만원/돈 돌파 경로.",
        startPrice: 1010000,
      },
      {
        id: "cp-2-sp500",
        assetId: "sp500",
        direction: "하락",
        probability: 70,
        confidence: 73,
        targetRange: { low: 5650, high: 5780 },
        rationale: "관세 발표 충격 + 3월 FOMC 경계감으로 추가 하락 예상.",
        keyEvidence: [
          "S&P 500 관세 발표 당일 -2.1% 급락",
          "Put/Call 비율 1.15로 공포 심리 확대",
          "3월 FOMC 금리 동결 확률 92% (CME FedWatch)",
        ],
        sources: [
          { title: "CME FedWatch Tool", date: "2026-02-27" },
        ],
        supportingExpertIds: ["nouriel-roubini", "larry-summers"],
        opposingExpertIds: [],
        scenario: "관세 충격 + FOMC 경계로 5,700선 테스트.",
        startPrice: 5780,
      },
      {
        id: "cp-2-usdkrw",
        assetId: "usd-krw",
        direction: "상승",
        probability: 72,
        confidence: 75,
        targetRange: { low: 1435, high: 1465 },
        rationale: "달러 강세 + 한국 수출 타격 우려로 원화 약세 심화.",
        keyEvidence: [
          "한국 대중국 수출 비중 23% — 관세 간접 타격 우려",
          "한은 총재 '추가 인하 가능성 열어둬야' 발언",
          "외국인 채권·주식 동시 순유출",
        ],
        sources: [
          { title: "한국은행 총재 기자회견", date: "2026-02-27" },
        ],
        supportingExpertIds: ["mohamed-el-erian", "larry-summers"],
        opposingExpertIds: [],
        scenario: "1,450원 돌파 시 당국 개입 가능성도 있으나 기조적 약세.",
        startPrice: 1442,
      },
      {
        id: "cp-2-us10y",
        assetId: "us-10y-yield",
        direction: "하락",
        probability: 60,
        confidence: 63,
        targetRange: { low: 4.15, high: 4.35 },
        rationale: "안전자산 선호로 국채 수요 증가. 경기 둔화 우려도 금리 하방 압력.",
        keyEvidence: [
          "미국 10년물 국채 입찰 강세 (응찰률 2.68배)",
          "ISM 제조업지수 48.2로 위축 영역 진입",
          "2-10년 스프레드 축소 (-0.15%p)",
        ],
        sources: [
          { title: "US Treasury Auction Results", date: "2026-02-26" },
        ],
        supportingExpertIds: ["larry-summers"],
        opposingExpertIds: [],
        scenario: "경기 둔화 + 안전자산 수요로 10년물 4.2% 하회 가능.",
        startPrice: 4.35,
      },
      {
        id: "cp-2-nasdaq",
        assetId: "nasdaq",
        direction: "변동성확대",
        probability: 65,
        confidence: 68,
        rationale: "AI 투자 모멘텀 vs 관세 충격의 상충. 방향보다 변동폭 확대 예상.",
        keyEvidence: [
          "엔비디아 실적 서프라이즈에도 주가 -3% (차익실현)",
          "VIX 28 → 나스닥 변동성 30일 평균 2배 수준",
          "기술주 공매도 비율 증가",
        ],
        sources: [
          { title: "NVIDIA Q4 Earnings Report", date: "2026-02-26" },
        ],
        supportingExpertIds: ["ray-dalio"],
        opposingExpertIds: [],
        scenario: "AI 랠리와 매크로 악재 사이 방향성 불투명. 진폭 확대에 대비.",
        startPrice: 18500,
      },
    ],
  },
  {
    id: "cycle-2026-03-02",
    cycleNumber: 3,
    startDate: "2026-03-02",
    endDate: "2026-03-05",
    status: "completed",
    createdAt: "2026-03-02T09:00:00+09:00",
    predictions: [
      {
        id: "cp-3-gold",
        assetId: "gold",
        direction: "상승",
        probability: 78,
        confidence: 82,
        targetRange: { low: 1040000, high: 1070000 },
        rationale: "순금 살때 103만5천원/돈 돌파 후 새로운 지지대 형성 중. 관세전쟁 확대 시 추가 상승 여력.",
        keyEvidence: [
          "한국금거래소 순금 살때 103만8천원/돈 사상 최고가 경신 (3/1)",
          "중앙은행 순매수 1월 45톤 — 역대 1월 최대",
          "금 선물 순매수 포지션 사상 최대",
        ],
        sources: [
          { title: "LBMA Gold Price", date: "2026-03-01" },
          { title: "CFTC Commitment of Traders", date: "2026-03-01" },
        ],
        supportingExpertIds: ["nouriel-roubini", "ray-dalio", "mohamed-el-erian"],
        opposingExpertIds: [],
        scenario: "순금 살때 107만원/돈 도달 시나리오. 관세전쟁 + 탈달러화가 구조적 상승 동력.",
        startPrice: 1035000,
      },
      {
        id: "cp-3-sp500",
        assetId: "sp500",
        direction: "보합",
        probability: 55,
        confidence: 60,
        targetRange: { low: 5730, high: 5850 },
        rationale: "관세 충격 소화 + 저가 매수 유입으로 반등 시도. 다만 FOMC 앞두고 상방 제한.",
        keyEvidence: [
          "S&P 500 5,720 기술적 지지선 확인",
          "기업 자사주 매입 $50B 규모 발표 (주간 최대)",
          "3월 FOMC (3/18-19) 앞두고 관망 심리",
        ],
        sources: [
          { title: "Goldman Sachs Buyback Desk Report", date: "2026-03-01" },
        ],
        supportingExpertIds: ["mohamed-el-erian"],
        opposingExpertIds: ["nouriel-roubini"],
        scenario: "5,720-5,850 박스권. FOMC 결과가 다음 방향성 결정.",
        startPrice: 5770,
      },
      {
        id: "cp-3-usdkrw",
        assetId: "usd-krw",
        direction: "상승",
        probability: 70,
        confidence: 74,
        targetRange: { low: 1440, high: 1460 },
        rationale: "3월 FOMC 금리 동결 확실시 → 한미 금리차 유지 → 원화 약세 지속.",
        keyEvidence: [
          "달러인덱스 104 회복",
          "한국 2월 무역수지 적자 전환 ($-1.2B)",
          "외국인 주식+채권 순유출 3주 연속",
        ],
        sources: [
          { title: "관세청 수출입 동향", date: "2026-03-01" },
        ],
        supportingExpertIds: ["larry-summers", "mohamed-el-erian"],
        opposingExpertIds: [],
        scenario: "무역수지 악화 + 금리차로 1,450원 안착 가능성.",
        startPrice: 1448,
      },
      {
        id: "cp-3-kospi",
        assetId: "kospi",
        direction: "하락",
        probability: 60,
        confidence: 64,
        targetRange: { low: 2490, high: 2560 },
        rationale: "외국인 매도 지속 + 환율 부담 + 수출 둔화로 하방 압력.",
        keyEvidence: [
          "코스피 외국인 3월 첫째주 순매도 8,200억원",
          "원화 약세로 외국인 실질 수익률 악화",
          "삼성전자·SK하이닉스 외국인 지분율 하락",
        ],
        sources: [
          { title: "한국거래소 투자자별 매매동향", date: "2026-03-02" },
        ],
        supportingExpertIds: ["larry-summers"],
        opposingExpertIds: ["mohamed-el-erian"],
        scenario: "2,500선 이탈 위험. 반도체 업황 개선 확인이 반등 키.",
        startPrice: 2540,
      },
      {
        id: "cp-3-copper",
        assetId: "copper",
        direction: "상승",
        probability: 62,
        confidence: 65,
        targetRange: { low: 13439, high: 13800 },
        rationale: "중국 양회(3/5) 앞두고 경기부양 기대감 확대. 구리 수요 개선 전망.",
        keyEvidence: [
          "중국 양회 경기부양 패키지 기대 (GDP 목표 5.0%)",
          "LME 구리 재고 감소 추세 (4주 연속)",
          "전기차 글로벌 판매 전년비 +22%",
        ],
        sources: [
          { title: "LME Warehouse Stocks", date: "2026-03-01" },
        ],
        supportingExpertIds: ["adam-tooze"],
        opposingExpertIds: [],
        scenario: "양회 부양책 + 전기차 수요로 13,728원/kg 회복 전망.",
        startPrice: 13410,
      },
    ],
  },
  {
    id: "cycle-2026-03-05",
    cycleNumber: 4,
    startDate: "2026-03-05",
    endDate: "2026-03-08",
    status: "completed",
    createdAt: "2026-03-05T09:00:00+09:00",
    predictions: [
      {
        id: "cp-4-gold",
        assetId: "gold",
        direction: "상승",
        probability: 80,
        confidence: 84,
        targetRange: { low: 1070000, high: 1110000 },
        rationale: "순금 살때 106만원/돈 지지 확인. 양회 부양 기대에도 관세 불확실성이 금 수요 지속.",
        keyEvidence: [
          "한국금거래소 순금 살때 106만5천원/돈 돌파 — 3일 연속 사상 최고가",
          "ETF 순유입 $3.2B (3월 첫째주)",
          "연준 파월 의장 '당분간 금리 변경 없다' 발언",
        ],
        sources: [
          { title: "Fed Chair Powell Speech", date: "2026-03-05" },
          { title: "World Gold Council ETF Flow", date: "2026-03-04" },
        ],
        supportingExpertIds: ["nouriel-roubini", "ray-dalio"],
        opposingExpertIds: [],
        scenario: "순금 살때 110만원/돈 시대 진입 가시화. 3월 말 이전 돌파 가능.",
        startPrice: 1060000,
      },
      {
        id: "cp-4-sp500",
        assetId: "sp500",
        direction: "하락",
        probability: 64,
        confidence: 68,
        targetRange: { low: 5680, high: 5800 },
        rationale: "고용지표 혼조 + 관세 2차 파장 우려로 하방 압력 재개.",
        keyEvidence: [
          "2월 비농업고용 +142K (예상 +180K 하회)",
          "임금 상승률 4.3% (인플레 우려 재점화)",
          "소매업·제조업 감원 증가",
        ],
        sources: [
          { title: "BLS Employment Situation", date: "2026-03-07" },
        ],
        supportingExpertIds: ["nouriel-roubini", "larry-summers"],
        opposingExpertIds: ["mohamed-el-erian"],
        scenario: "스태그플레이션 우려 부상. 5,700선 재테스트.",
        startPrice: 5800,
      },
      {
        id: "cp-4-usdkrw",
        assetId: "usd-krw",
        direction: "상승",
        probability: 74,
        confidence: 77,
        targetRange: { low: 1440, high: 1470 },
        rationale: "미국 고용 둔화에도 금리차 유지 → 원화 약세 기조 불변.",
        keyEvidence: [
          "달러인덱스 104.2 유지",
          "한국 3월 초 수출 -5.1% (관세 영향 본격화)",
          "외국인 코스피 순매도 가속",
        ],
        sources: [
          { title: "관세청 3월 1-5일 수출 속보", date: "2026-03-06" },
        ],
        supportingExpertIds: ["larry-summers"],
        opposingExpertIds: [],
        scenario: "1,450원 안착 후 1,470원 시도 가능.",
        startPrice: 1445,
      },
      {
        id: "cp-4-wti",
        assetId: "wti-oil",
        direction: "하락",
        probability: 66,
        confidence: 69,
        targetRange: { low: 582, high: 627 },
        rationale: "글로벌 수요 둔화 + OPEC+ 증산 우려로 유가 하방 압력 강화.",
        keyEvidence: [
          "EIA 원유재고 +4.2M 배럴 (예상 +1.5M 대비 큰 증가)",
          "OPEC+ 4월 증산 계획 확인",
          "중국 정유사 가동률 하락 (85% → 81%)",
        ],
        sources: [
          { title: "EIA Weekly Petroleum Status", date: "2026-03-05" },
          { title: "OPEC Monthly Report", date: "2026-03-04" },
        ],
        supportingExpertIds: ["adam-tooze"],
        opposingExpertIds: [],
        scenario: "591원/리터 하회 시 OPEC+ 긴급 대응 가능. 단기 609원/리터 중심 등락.",
        startPrice: 635,
      },
      {
        id: "cp-4-nasdaq",
        assetId: "nasdaq",
        direction: "하락",
        probability: 62,
        confidence: 66,
        targetRange: { low: 18000, high: 18400 },
        rationale: "고용 둔화 + 관세 충격으로 성장주 밸류에이션 부담 가중.",
        keyEvidence: [
          "나스닥 P/E 28.5배 — 역사적 고평가 구간",
          "AI 관련주 차익실현 매도 확대",
          "기술주 실적 하향 조정 시작 (AMD, Intel 가이던스 하향)",
        ],
        sources: [
          { title: "AMD Q1 Guidance Update", date: "2026-03-06" },
        ],
        supportingExpertIds: ["nouriel-roubini"],
        opposingExpertIds: ["ray-dalio"],
        scenario: "18,000선 지지 여부가 핵심. AI 테마만으로는 매크로 역풍 방어 한계.",
        startPrice: 18520,
      },
    ],
  },
];

// ─── 현재 활성 사이클 (3월 8일~11일) ──────────────────────────────────────

const currentCycle: AIPredictionCycle = {
  id: "cycle-2026-03-08",
  cycleNumber: 5,
  startDate: "2026-03-08",
  endDate: "2026-03-11",
  status: "active",
  createdAt: "2026-03-08T09:00:00+09:00",
  predictions: [
    {
      id: "cp-5-gold",
      assetId: "gold",
      direction: "보합",
      probability: 58,
      confidence: 62,
      targetRange: { low: 1050000, high: 1090000 },
      rationale: "한국금거래소 순금 살때 107만7천원/돈. 전주 110만원/돈 대비 소폭 하락. 국제 금값 사상 최고 경신에도 달러 강세·차익실현 매물로 한국 금거래소 살때 시세는 조정 중. 단기 등락 후 재상승 예상.",
      keyEvidence: [
        "한국금거래소 순금 24K 살때 107만7천원/돈 (3/9 기준)",
        "전주 대비 -2.1% 하락 (110만원 → 107만7천원)",
        "국제 금값 $2,918/oz 사상 최고가 경신에도 원화 강세로 국내 시세 하방 압력",
        "WGC: 2026년 중앙은행 금 순매수 전년비 +18% 전망",
        "JP모건: 순금 살때 기준 120만원/돈 연내 돌파 전망 유지",
      ],
      sources: [
        { title: "한국금거래소 실시간 시세", date: "2026-03-09" },
        { title: "JP Morgan Gold Outlook 2026", date: "2026-03-06" },
        { title: "WGC Central Bank Gold Reserves", date: "2026-03-07" },
      ],
      supportingExpertIds: ["nouriel-roubini", "ray-dalio", "mohamed-el-erian"],
      opposingExpertIds: [],
      scenario: "국제 금값 강세에도 원화 환율 변동·차익실현으로 한국 금거래소 살때 시세는 단기 조정 중. 105만~109만원/돈 등락 후 3월 말 110만원/돈 재돌파 예상. 중장기 120만원/돈 목표.",
      startPrice: 1077000,
      expertStats: {
        totalParticipants: 28420,
        bullCount: 19894,
        bearCount: 4263,
        neutralCount: 4263,
        avgAccuracyOfBull: 74.2,
        avgAccuracyOfBear: 58.1,
        avgAccuracyOfNeutral: 61.5,
        topAccuracyDirection: "상승",
        weightedProbability: 76,
      },
    },
    {
      id: "cp-5-sp500",
      assetId: "sp500",
      direction: "하락",
      probability: 68,
      confidence: 72,
      targetRange: { low: 5650, high: 5780 },
      rationale: "3월 FOMC(3/18-19) 앞두고 경계감 고조. 고용 둔화 + 관세 실적 타격이 본격화되는 시점. 기술적으로 5,720 지지선 재테스트 예상.",
      keyEvidence: [
        "S&P 500 5,770 — 50일 이동평균 하회",
        "2월 비농업고용 +142K (하회) + 임금 4.3% (상회) — 스태그플레이션 신호",
        "3월 FOMC 금리 동결 확률 95% → 인하 기대 소멸",
        "기업 실적 하향 조정 비율 67% (S&P 500 기업 중)",
        "AAII 투자심리 약세 비율 48% (2024.03 이후 최고)",
      ],
      sources: [
        { title: "BLS Employment Situation Report", date: "2026-03-07" },
        { title: "CME FedWatch Tool", date: "2026-03-08" },
        { title: "FactSet Earnings Revision Tracker", date: "2026-03-07" },
      ],
      supportingExpertIds: ["nouriel-roubini", "larry-summers"],
      opposingExpertIds: ["ray-dalio"],
      scenario: "FOMC 동결 확인 시 '금리 인하 없는 둔화'가 최악 시나리오. 5,700선 붕괴 시 5,500까지 하락 가능. 다만 AI 투자 모멘텀이 기술주 통해 하방 지지 역할.",
      startPrice: 5840,
      expertStats: {
        totalParticipants: 34180,
        bullCount: 8545,
        bearCount: 18799,
        neutralCount: 6836,
        avgAccuracyOfBull: 59.3,
        avgAccuracyOfBear: 72.8,
        avgAccuracyOfNeutral: 63.1,
        topAccuracyDirection: "하락",
        weightedProbability: 68,
      },
    },
    {
      id: "cp-5-usdkrw",
      assetId: "usd-krw",
      direction: "상승",
      probability: 73,
      confidence: 76,
      targetRange: { low: 1445, high: 1475 },
      rationale: "한미 금리차 175bp 유지 + 무역수지 적자 전환 + 외국인 순유출로 원화 약세 3중 압력. 당국 구두개입에도 기조적 약세 불가피.",
      keyEvidence: [
        "원/달러 1,445원 — 3개월 최고치",
        "한미 금리차 175bp (4.50% vs 2.75%) — 달러 캐리 유인",
        "3월 1-7일 무역수지 -$0.8B (관세 영향 본격화)",
        "외국인 주식 순매도 4주 연속 (-4.2조원 누적)",
        "한은 차기 금통위(4/10) 인하 가능성 60% (시장 전망)",
      ],
      sources: [
        { title: "관세청 수출입 동향", date: "2026-03-08" },
        { title: "한국은행 외환시장 동향", date: "2026-03-07" },
        { title: "Bloomberg KRW Forward Curve", date: "2026-03-08" },
      ],
      supportingExpertIds: ["larry-summers", "mohamed-el-erian"],
      opposingExpertIds: [],
      scenario: "1,450원 안착 후 1,470원 시도 예상. 한은 추가 인하 시 1,480원까지 열림. 정부 환율 안정 대책 발표 가능성은 하방 리스크.",
      startPrice: 1432,
      expertStats: {
        totalParticipants: 22560,
        bullCount: 14662,
        bearCount: 4512,
        neutralCount: 3386,
        avgAccuracyOfBull: 71.4,
        avgAccuracyOfBear: 56.8,
        avgAccuracyOfNeutral: 62.3,
        topAccuracyDirection: "상승",
        weightedProbability: 73,
      },
    },
    {
      id: "cp-5-kospi",
      assetId: "kospi",
      direction: "하락",
      probability: 64,
      confidence: 67,
      targetRange: { low: 2470, high: 2540 },
      rationale: "관세 충격 2차 파장 + 원화 약세 + 외국인 이탈로 코스피 2,500선 이탈 위험 고조. 반도체 업황 개선 속도가 관건.",
      keyEvidence: [
        "코스피 2,530 — 200일 이동평균 하회",
        "외국인 3월 순매도 -1.5조원 (첫째 주)",
        "삼성전자 외국인 지분율 51.2% → 50.5% 하락",
        "원/달러 1,445원 — 외국인 환차손 우려 심화",
        "반도체 수출 +12% (양호하나 비반도체 -11%)",
      ],
      sources: [
        { title: "한국거래소 시장동향", date: "2026-03-07" },
        { title: "산업통상자원부 수출동향", date: "2026-03-08" },
      ],
      supportingExpertIds: ["larry-summers"],
      opposingExpertIds: ["mohamed-el-erian"],
      scenario: "2,500선 이탈 시 기술적 매도 가속 → 2,450까지 하락 가능. 반도체 수출 호조가 유일한 희망이나 관세 리스크가 더 큰 영향.",
      startPrice: 2565,
      expertStats: {
        totalParticipants: 19840,
        bullCount: 4960,
        bearCount: 11904,
        neutralCount: 2976,
        avgAccuracyOfBull: 57.2,
        avgAccuracyOfBear: 69.8,
        avgAccuracyOfNeutral: 61.4,
        topAccuracyDirection: "하락",
        weightedProbability: 64,
      },
    },
    {
      id: "cp-5-wti",
      assetId: "wti-oil",
      direction: "하락",
      probability: 66,
      confidence: 70,
      targetRange: { low: 573, high: 618 },
      rationale: "OPEC+ 4월 증산 확정 + 글로벌 수요 둔화로 유가 591원/리터 하회 가능. 러우 휴전 진전 시 지정학 프리미엄도 축소.",
      keyEvidence: [
        "WTI 614원/리터 — 6개월 최저",
        "OPEC+ 4월 증산 411K bpd 확정",
        "IEA 2026년 수요 성장 전망 하향 (1.0 → 0.8 mb/d)",
        "미국 원유재고 4주 연속 증가",
        "러우 휴전 3라운드 협상 '진전' 보도",
      ],
      sources: [
        { title: "OPEC+ Ministerial Meeting", date: "2026-03-06" },
        { title: "IEA Monthly Oil Report", date: "2026-03-07" },
        { title: "EIA Petroleum Status Report", date: "2026-03-05" },
      ],
      supportingExpertIds: ["adam-tooze"],
      opposingExpertIds: [],
      scenario: "수요 둔화 + 공급 확대의 이중 압력. 591원/리터 붕괴 시 546원/리터선까지 열림. 러우 휴전 합의 시 추가 27~45원/리터 하락 압력.",
      startPrice: 635,
      expertStats: {
        totalParticipants: 21370,
        bullCount: 4274,
        bearCount: 14959,
        neutralCount: 2137,
        avgAccuracyOfBull: 54.6,
        avgAccuracyOfBear: 73.1,
        avgAccuracyOfNeutral: 59.8,
        topAccuracyDirection: "하락",
        weightedProbability: 66,
      },
    },
    {
      id: "cp-5-nasdaq",
      assetId: "nasdaq",
      direction: "변동성확대",
      probability: 63,
      confidence: 67,
      rationale: "AI 투자 모멘텀(+) vs 관세·금리 역풍(-)의 줄다리기. 방향보다 진폭 확대에 대비. 엔비디아 GTC(3/17) 전후 방향성 결정.",
      keyEvidence: [
        "나스닥 18,200 — P/E 28.5배 고평가 구간",
        "VIX 26.8 — 2주 평균 대비 +35%",
        "엔비디아 GTC 2026 (3/17) 앞두고 기대감과 경계감 공존",
        "기술주 내 종목간 격차 확대 (AI 수혜 vs 비수혜)",
        "나스닥 일중 변동폭 ±2% 빈도 증가",
      ],
      sources: [
        { title: "CBOE VIX Index", date: "2026-03-07" },
        { title: "NVIDIA GTC 2026 Announcement", date: "2026-03-05" },
      ],
      supportingExpertIds: ["ray-dalio"],
      opposingExpertIds: ["nouriel-roubini"],
      scenario: "GTC에서 AI 신규 칩 발표 시 단기 상승, 실망 시 급락. 매크로 환경이 방향성을 제약하므로 ±5% 변동에 대비.",
      startPrice: 18520,
      expertStats: {
        totalParticipants: 31250,
        bullCount: 9375,
        bearCount: 9375,
        neutralCount: 12500,
        avgAccuracyOfBull: 62.4,
        avgAccuracyOfBear: 64.1,
        avgAccuracyOfNeutral: 68.7,
        topAccuracyDirection: "변동성확대",
        weightedProbability: 63,
      },
    },
    {
      id: "cp-5-us10y",
      assetId: "us-10y-yield",
      direction: "하락",
      probability: 58,
      confidence: 63,
      targetRange: { low: 4.10, high: 4.30 },
      rationale: "고용 둔화 신호 + 안전자산 선호로 국채 수요 증가. FOMC 동결이 기정사실화되면서 장기금리 하방 압력.",
      keyEvidence: [
        "미국 10년물 4.28% — 1개월 최저",
        "비농업고용 둔화 → 경기 우려 반영",
        "안전자산 선호로 국채 매수세 유입",
        "2년-10년 스프레드 -0.12%p (역전 지속)",
      ],
      sources: [
        { title: "US Treasury Market", date: "2026-03-07" },
      ],
      supportingExpertIds: ["larry-summers"],
      opposingExpertIds: [],
      scenario: "4.2% 하회 시 4.0% 테스트 가능. FOMC에서 비둘기파 시그널 나오면 가속.",
      startPrice: 4.35,
      expertStats: {
        totalParticipants: 18930,
        bullCount: 3786,
        bearCount: 12005,
        neutralCount: 3139,
        avgAccuracyOfBull: 55.3,
        avgAccuracyOfBear: 70.6,
        avgAccuracyOfNeutral: 63.2,
        topAccuracyDirection: "하락",
        weightedProbability: 58,
      },
    },
    {
      id: "cp-5-dxy",
      assetId: "dxy",
      direction: "보합",
      probability: 55,
      confidence: 60,
      targetRange: { low: 103.5, high: 105.0 },
      rationale: "고용 둔화는 달러 약세 요인이나 관세 + 금리차는 강세 요인. 상충하는 힘으로 104 중심 등락 예상.",
      keyEvidence: [
        "DXY 104.2 — 50일 이동평균 부근",
        "유로화 약세 (ECB 인하 기대) → DXY 지지",
        "미국 고용 둔화 → DXY 하방 압력",
        "관세 효과 → 달러 강세 유지 논리",
      ],
      sources: [
        { title: "ICE Dollar Index", date: "2026-03-07" },
      ],
      supportingExpertIds: [],
      opposingExpertIds: [],
      scenario: "FOMC 전까지 103.5-105.0 레인지. 비둘기파 전환 시 103 하회.",
      startPrice: 103.8,
      expertStats: {
        totalParticipants: 16780,
        bullCount: 5034,
        bearCount: 5034,
        neutralCount: 6712,
        avgAccuracyOfBull: 61.8,
        avgAccuracyOfBear: 63.2,
        avgAccuracyOfNeutral: 67.4,
        topAccuracyDirection: "보합",
        weightedProbability: 55,
      },
    },
    {
      id: "cp-5-copper",
      assetId: "copper",
      direction: "상승",
      probability: 64,
      confidence: 68,
      targetRange: { low: 13583, high: 13872 },
      rationale: "중국 양회 경기부양 패키지(재정지출 4.4조위안) 확정. 구리 수요 개선 기대.",
      keyEvidence: [
        "구리 13,612원/kg — 양회 이후 반등",
        "중국 GDP 목표 5.0% + 재정적자 4% 확대",
        "중국 부동산 부양 패키지 발표 (3/5)",
        "LME 구리 재고 5주 연속 감소",
        "전기차 구리 사용량 전년비 +25%",
      ],
      sources: [
        { title: "중국 양회 정부업무보고", date: "2026-03-05" },
        { title: "LME Inventory Report", date: "2026-03-07" },
      ],
      supportingExpertIds: ["adam-tooze"],
      opposingExpertIds: [],
      scenario: "양회 부양 + 전기차 수요로 13,728원/kg 돌파 시도. 미중 관세 확대 시 하방 리스크.",
      startPrice: 13410,
      expertStats: {
        totalParticipants: 12640,
        bullCount: 8848,
        bearCount: 1896,
        neutralCount: 1896,
        avgAccuracyOfBull: 69.5,
        avgAccuracyOfBear: 57.2,
        avgAccuracyOfNeutral: 60.1,
        topAccuracyDirection: "상승",
        weightedProbability: 64,
      },
    },
    // ── 산업 예측 ──
    {
      id: "cp-5-semi",
      assetId: "semiconductor",
      direction: "변동성확대",
      probability: 66,
      confidence: 70,
      rationale: "HBM·AI 가속기 수요는 구조적 성장이나, 관세 + 중국 수출 규제 + 레거시 반도체 재고로 업황 양극화 심화. 엔비디아 GTC(3/17) 결과가 단기 방향 결정.",
      keyEvidence: [
        "SK하이닉스 HBM3E 풀가동 — AI 서버 수요 견조",
        "삼성전자 HBM4 양산 6개월 앞당김 발표",
        "레거시 DRAM/NAND 재고 정상화 지연 (재고일수 8주→10주)",
        "미국 대중 반도체 수출 규제 강화 (ASML EUV 3차 규제)",
        "필라델피아 반도체지수(SOX) 4,520 — 200일선 하회",
      ],
      sources: [
        { title: "SK Hynix IR Update", date: "2026-03-06" },
        { title: "SEMI World Fab Forecast", date: "2026-03-05" },
      ],
      supportingExpertIds: ["ray-dalio"],
      opposingExpertIds: [],
      scenario: "AI반도체는 상승, 레거시반도체는 하락의 양극화. GTC에서 차세대 GPU 로드맵 확인 시 AI반도체 추가 상승, 실망 시 전체 조정.",
      startPrice: 4680,
      expertStats: {
        totalParticipants: 18940,
        bullCount: 5682,
        bearCount: 5682,
        neutralCount: 7576,
        avgAccuracyOfBull: 63.8,
        avgAccuracyOfBear: 61.2,
        avgAccuracyOfNeutral: 70.4,
        topAccuracyDirection: "변동성확대",
        weightedProbability: 66,
      },
    },
    {
      id: "cp-5-ai",
      assetId: "ai-tech",
      direction: "상승",
      probability: 62,
      confidence: 66,
      rationale: "AI 인프라 투자(CAPEX)는 빅테크 실적에서 확인된 구조적 성장. 관세 역풍에도 AI 테마는 시장의 유일한 성장 동력으로 프리미엄 유지.",
      keyEvidence: [
        "빅테크 4사 2026년 AI CAPEX 합계 $280B (전년비 +45%)",
        "마이크로소프트 Azure AI 매출 전년비 +62%",
        "OpenAI GPT-5 출시 앞두고 API 수요 급증",
        "AI 스타트업 투자 2026Q1 $15B (역대 최고)",
        "다만 P/E 28.5배 — 밸류에이션 부담 존재",
      ],
      sources: [
        { title: "Bloomberg: Big Tech AI CAPEX Tracker", date: "2026-03-07" },
        { title: "PitchBook AI Startup Investment", date: "2026-03-06" },
      ],
      supportingExpertIds: ["ray-dalio"],
      opposingExpertIds: ["nouriel-roubini"],
      scenario: "AI는 관세전쟁 속 유일한 성장 테마. 매크로 악재에도 빅테크 실적이 방어. 다만 밸류에이션 부담으로 10% 이상 조정 가능.",
      startPrice: 8920,
      expertStats: {
        totalParticipants: 22180,
        bullCount: 13308,
        bearCount: 4436,
        neutralCount: 4436,
        avgAccuracyOfBull: 68.3,
        avgAccuracyOfBear: 59.7,
        avgAccuracyOfNeutral: 62.1,
        topAccuracyDirection: "상승",
        weightedProbability: 62,
      },
    },
    {
      id: "cp-5-ev",
      assetId: "ev-battery",
      direction: "하락",
      probability: 60,
      confidence: 64,
      rationale: "관세 확대로 글로벌 EV 공급망 타격. 미국 IRA 보조금 불확실성 + 유럽 EV 판매 둔화 + 리튬 가격 하락으로 배터리 업황 부진.",
      keyEvidence: [
        "미국 EV 보조금(IRA) 대상 축소 검토 보도",
        "유럽 EV 판매 전년비 -8% (2026년 2월)",
        "리튬 가격 톤당 $12,500 — 2년래 최저",
        "LG에너지솔루션 가동률 75% → 68% 하향",
        "BYD 가격 공세로 한국 배터리 마진 압박",
      ],
      sources: [
        { title: "Bloomberg NEF EV Outlook", date: "2026-03-06" },
        { title: "Benchmark Minerals Lithium Price", date: "2026-03-07" },
      ],
      supportingExpertIds: ["adam-tooze"],
      opposingExpertIds: [],
      scenario: "단기 하방 압력. IRA 보조금 축소 확정 시 추가 하락. 다만 중국 양회 부양으로 BYD 수요 증가 시 반등 가능.",
      startPrice: 2250,
      expertStats: {
        totalParticipants: 9870,
        bullCount: 1974,
        bearCount: 6909,
        neutralCount: 987,
        avgAccuracyOfBull: 53.4,
        avgAccuracyOfBear: 71.6,
        avgAccuracyOfNeutral: 58.9,
        topAccuracyDirection: "하락",
        weightedProbability: 60,
      },
    },
    {
      id: "cp-5-bio",
      assetId: "bio-pharma",
      direction: "상승",
      probability: 58,
      confidence: 62,
      rationale: "GLP-1(비만치료제) 글로벌 시장 확대 + 항체의약품 FDA 승인 러시 + 관세 무풍지대로 방어적 매력 부각.",
      keyEvidence: [
        "일라이릴리 GLP-1 매출 $4.5B (분기 신기록)",
        "삼성바이오로직스 CDO 수주잔고 $10B 돌파",
        "FDA 2026Q1 신약 승인 12건 (10년래 최다)",
        "바이오텍 M&A 활발 — 화이자 $28B 인수건",
        "코스닥 바이오지수 역행 상승 (관세 무관 업종)",
      ],
      sources: [
        { title: "Eli Lilly Q4 Earnings", date: "2026-03-04" },
        { title: "FDA Approval Tracker", date: "2026-03-07" },
      ],
      supportingExpertIds: [],
      opposingExpertIds: [],
      scenario: "관세전쟁 방어주로 부각. GLP-1 시장 연 $100B 돌파 전망. 다만 밸류에이션 높은 개별주는 차익실현 주의.",
      startPrice: 3380,
      expertStats: {
        totalParticipants: 8340,
        bullCount: 5004,
        bearCount: 1668,
        neutralCount: 1668,
        avgAccuracyOfBull: 66.8,
        avgAccuracyOfBear: 55.3,
        avgAccuracyOfNeutral: 60.7,
        topAccuracyDirection: "상승",
        weightedProbability: 58,
      },
    },
    {
      id: "cp-5-defense",
      assetId: "defense",
      direction: "상승",
      probability: 72,
      confidence: 76,
      rationale: "지정학 긴장 고조 + NATO 방위비 증액 + 한국 방산 수출 호조로 방산·우주항공 구조적 상승.",
      keyEvidence: [
        "NATO 회원국 GDP 3% 방위비 목표 합의 (기존 2%)",
        "한화에어로스페이스 수주잔고 40조원 돌파",
        "폴란드·루마니아·사우디 K-방산 대형 계약",
        "SpaceX 군사위성 계약 확대 — 우주 방산 성장",
        "러우전쟁·중동 긴장으로 방산 수요 구조적 증가",
      ],
      sources: [
        { title: "NATO Summit Declaration", date: "2026-03-03" },
        { title: "한화에어로스페이스 IR", date: "2026-03-06" },
      ],
      supportingExpertIds: [],
      opposingExpertIds: [],
      scenario: "지정학 긴장이 완화되기 어려운 구조. 방산은 2-3년 이상 수주 사이클로 안정적 성장. 한국 방산 수출 역대 최고 경신 예상.",
      startPrice: 5420,
      expertStats: {
        totalParticipants: 7520,
        bullCount: 5264,
        bearCount: 752,
        neutralCount: 1504,
        avgAccuracyOfBull: 74.2,
        avgAccuracyOfBear: 48.6,
        avgAccuracyOfNeutral: 58.3,
        topAccuracyDirection: "상승",
        weightedProbability: 72,
      },
    },
    {
      id: "cp-5-ship",
      assetId: "shipbuilding",
      direction: "상승",
      probability: 65,
      confidence: 69,
      rationale: "LNG선·컨테이너선 발주 호조 + IMO 환경 규제로 친환경 선박 수요 폭증. 한국 조선 3사 수주잔고 사상 최대.",
      keyEvidence: [
        "HD한국조선 수주잔고 $52B — 3.5년 물량 확보",
        "LNG선 발주 전년비 +35% (카타르·미국 LNG 프로젝트)",
        "IMO 2030 탄소규제 → 노후선박 교체 수요 급증",
        "Clarksons 신조선가지수 188 — 15년래 최고",
        "글로벌 해운 운임 반등 (홍해 사태 장기화)",
      ],
      sources: [
        { title: "Clarksons Shipbuilding Monitor", date: "2026-03-05" },
        { title: "HD한국조선 수주 공시", date: "2026-03-07" },
      ],
      supportingExpertIds: [],
      opposingExpertIds: [],
      scenario: "3-5년 슈퍼사이클 진입. 한국 조선업은 LNG선·친환경선 기술력으로 독보적 경쟁력. 수주잔고 기반 실적 가시성 높음.",
      startPrice: 1820,
      expertStats: {
        totalParticipants: 6890,
        bullCount: 4823,
        bearCount: 689,
        neutralCount: 1378,
        avgAccuracyOfBull: 72.1,
        avgAccuracyOfBear: 46.3,
        avgAccuracyOfNeutral: 57.8,
        topAccuracyDirection: "상승",
        weightedProbability: 65,
      },
    },
  ],
};

// ─── 과거 사이클 결과 ─────────────────────────────────────────────────────

const cycleResults: AICycleResult[] = [
  // Cycle 1 결과
  { cycleId: "cycle-2026-02-24", assetId: "gold", predictionId: "cp-1-gold", predictedDirection: "상승", actualDirection: "상승", predictedProbability: 72, result: "적중", actualOutcome: "순금 살때 98만5천원/돈 → 101만원/돈으로 2.5% 상승. 예측 범위 내.", evaluatedAt: "2026-02-27", newsEvidence: ["Bloomberg: Gold hits new record on tariff fears"] },
  { cycleId: "cycle-2026-02-24", assetId: "sp500", predictionId: "cp-1-sp500", predictedDirection: "하락", actualDirection: "하락", predictedProbability: 65, result: "적중", actualOutcome: "S&P 500 5,840 → 5,780으로 1.0% 하락. 관세 발표 충격.", evaluatedAt: "2026-02-27", newsEvidence: ["CNBC: S&P 500 drops on tariff fears"] },
  { cycleId: "cycle-2026-02-24", assetId: "usd-krw", predictionId: "cp-1-usdkrw", predictedDirection: "상승", actualDirection: "상승", predictedProbability: 68, result: "적중", actualOutcome: "원/달러 1,432 → 1,442원으로 0.7% 원화 약세.", evaluatedAt: "2026-02-27" },
  { cycleId: "cycle-2026-02-24", assetId: "kospi", predictionId: "cp-1-kospi", predictedDirection: "하락", actualDirection: "하락", predictedProbability: 62, result: "적중", actualOutcome: "KOSPI 2,565 → 2,540으로 1.0% 하락.", evaluatedAt: "2026-02-27" },
  { cycleId: "cycle-2026-02-24", assetId: "wti-oil", predictionId: "cp-1-wti", predictedDirection: "하락", actualDirection: "하락", predictedProbability: 58, result: "부분적중", actualOutcome: "WTI 635원/리터 → 623원/리터로 소폭 하락. 방향 맞았으나 목표 하단 미도달.", evaluatedAt: "2026-02-27" },

  // Cycle 2 결과
  { cycleId: "cycle-2026-02-27", assetId: "gold", predictionId: "cp-2-gold", predictedDirection: "상승", actualDirection: "상승", predictedProbability: 75, result: "적중", actualOutcome: "순금 살때 101만원/돈 → 103만5천원/돈. 관세전쟁 격화로 안전자산 랠리.", evaluatedAt: "2026-03-02" },
  { cycleId: "cycle-2026-02-27", assetId: "sp500", predictionId: "cp-2-sp500", predictedDirection: "하락", actualDirection: "하락", predictedProbability: 70, result: "적중", actualOutcome: "S&P 500 5,780 → 5,740. 관세 2차 충격.", evaluatedAt: "2026-03-02" },
  { cycleId: "cycle-2026-02-27", assetId: "usd-krw", predictionId: "cp-2-usdkrw", predictedDirection: "상승", actualDirection: "상승", predictedProbability: 72, result: "적중", actualOutcome: "원/달러 1,442 → 1,448원. 금리차 + 수출 둔화.", evaluatedAt: "2026-03-02" },
  { cycleId: "cycle-2026-02-27", assetId: "us-10y-yield", predictionId: "cp-2-us10y", predictedDirection: "하락", actualDirection: "하락", predictedProbability: 60, result: "적중", actualOutcome: "10년물 4.35% → 4.28%. 안전자산 선호.", evaluatedAt: "2026-03-02" },
  { cycleId: "cycle-2026-02-27", assetId: "nasdaq", predictionId: "cp-2-nasdaq", predictedDirection: "변동성확대", actualDirection: "변동성확대", predictedProbability: 65, result: "부분적중", actualOutcome: "나스닥 ±2.5% 일중 변동. 방향성 없이 등락 반복.", evaluatedAt: "2026-03-02" },

  // Cycle 3 결과
  { cycleId: "cycle-2026-03-02", assetId: "gold", predictionId: "cp-3-gold", predictedDirection: "상승", actualDirection: "상승", predictedProbability: 78, result: "적중", actualOutcome: "순금 살때 103만5천원/돈 → 106만원/돈. 사상 최고가 연일 경신.", evaluatedAt: "2026-03-05" },
  { cycleId: "cycle-2026-03-02", assetId: "sp500", predictionId: "cp-3-sp500", predictedDirection: "보합", actualDirection: "하락", predictedProbability: 55, result: "부분적중", actualOutcome: "S&P 500 5,740 → 5,770. 보합 예측에 소폭 상승. 방향은 틀렸으나 변동폭 소폭.", evaluatedAt: "2026-03-05" },
  { cycleId: "cycle-2026-03-02", assetId: "usd-krw", predictionId: "cp-3-usdkrw", predictedDirection: "상승", actualDirection: "상승", predictedProbability: 70, result: "적중", actualOutcome: "원/달러 1,448 → 1,445원. 소폭 원화 강세였으나 1,440 이상 유지.", evaluatedAt: "2026-03-05" },
  { cycleId: "cycle-2026-03-02", assetId: "kospi", predictionId: "cp-3-kospi", predictedDirection: "하락", actualDirection: "하락", predictedProbability: 60, result: "적중", actualOutcome: "KOSPI 2,540 → 2,530. 외국인 매도 지속.", evaluatedAt: "2026-03-05" },
  { cycleId: "cycle-2026-03-02", assetId: "copper", predictionId: "cp-3-copper", predictedDirection: "상승", actualDirection: "상승", predictedProbability: 62, result: "적중", actualOutcome: "구리 13,410원/kg → 13,612원/kg. 양회 부양 기대 반영.", evaluatedAt: "2026-03-05" },

  // Cycle 4 결과
  { cycleId: "cycle-2026-03-05", assetId: "gold", predictionId: "cp-4-gold", predictedDirection: "상승", actualDirection: "상승", predictedProbability: 80, result: "적중", actualOutcome: "순금 살때 106만원/돈 → 110만원/돈. 사상 최고가 경신.", evaluatedAt: "2026-03-08" },
  { cycleId: "cycle-2026-03-05", assetId: "sp500", predictionId: "cp-4-sp500", predictedDirection: "하락", actualDirection: "하락", predictedProbability: 64, result: "적중", actualOutcome: "S&P 500 5,800 → 5,770. 고용 둔화 충격.", evaluatedAt: "2026-03-08" },
  { cycleId: "cycle-2026-03-05", assetId: "usd-krw", predictionId: "cp-4-usdkrw", predictedDirection: "상승", actualDirection: "보합", predictedProbability: 74, result: "부분적중", actualOutcome: "원/달러 1,445 → 1,445원. 보합 마감. 방향은 맞지 않았으나 1,440 이상 유지.", evaluatedAt: "2026-03-08" },
  { cycleId: "cycle-2026-03-05", assetId: "wti-oil", predictionId: "cp-4-wti", predictedDirection: "하락", actualDirection: "하락", predictedProbability: 66, result: "적중", actualOutcome: "WTI 635원/리터 → 614원/리터. OPEC+ 증산 확정 영향.", evaluatedAt: "2026-03-08" },
  { cycleId: "cycle-2026-03-05", assetId: "nasdaq", predictionId: "cp-4-nasdaq", predictedDirection: "하락", actualDirection: "하락", predictedProbability: 62, result: "적중", actualOutcome: "나스닥 18,520 → 18,200. 기술주 조정.", evaluatedAt: "2026-03-08" },
];

// ─── 검증 로그 (60분마다 자동 체크) ───────────────────────────────────────

const verificationLogs: VerificationLog[] = [
  {
    id: "vlog-1",
    timestamp: "2026-03-08T10:00:00+09:00",
    assetId: "gold",
    cycleId: "cycle-2026-03-08",
    predictionId: "cp-5-gold",
    newsHeadline: "Gold hits $2,918, new all-time high as tariff war deepens",
    newsSource: "Reuters",
    relevance: "high",
    impact: "supports",
    summary: "국제 금값 사상 최고가. 한국금거래소 순금 살때 107만7천원/돈. 전주 대비 소폭 하락했으나 중장기 상승 추세 유지.",
  },
  {
    id: "vlog-2",
    timestamp: "2026-03-08T11:00:00+09:00",
    assetId: "sp500",
    cycleId: "cycle-2026-03-08",
    predictionId: "cp-5-sp500",
    newsHeadline: "US futures point to lower open amid labor market concerns",
    newsSource: "Bloomberg",
    relevance: "high",
    impact: "supports",
    summary: "미국 선물 하락 출발 예상. 고용 둔화 우려가 주가 하방 압력. 하락 예측 지지.",
  },
  {
    id: "vlog-3",
    timestamp: "2026-03-08T12:00:00+09:00",
    assetId: "wti-oil",
    cycleId: "cycle-2026-03-08",
    predictionId: "cp-5-wti",
    newsHeadline: "OPEC+ confirms April output increase of 411,000 bpd",
    newsSource: "OPEC Secretariat",
    relevance: "high",
    impact: "supports",
    summary: "OPEC+ 4월 증산 공식 확인. 유가 하방 압력 강화. 하락 예측 지지.",
  },
  {
    id: "vlog-4",
    timestamp: "2026-03-08T13:00:00+09:00",
    assetId: "usd-krw",
    cycleId: "cycle-2026-03-08",
    predictionId: "cp-5-usdkrw",
    newsHeadline: "한은 '환율 변동성 확대 시 안정화 조치 검토'",
    newsSource: "연합뉴스",
    relevance: "medium",
    impact: "contradicts",
    summary: "한은 환율 안정 의지 표명. 원화 약세 제한 가능성. 상승 예측에 부분 역풍.",
  },
  {
    id: "vlog-5",
    timestamp: "2026-03-08T14:00:00+09:00",
    assetId: "kospi",
    cycleId: "cycle-2026-03-08",
    predictionId: "cp-5-kospi",
    newsHeadline: "삼성전자, HBM4 양산 6개월 앞당긴다",
    newsSource: "한국경제",
    relevance: "medium",
    impact: "contradicts",
    summary: "삼성 HBM4 양산 조기화 — 반도체 업황 기대로 코스피 하방 제한 가능성.",
  },
  {
    id: "vlog-6",
    timestamp: "2026-03-08T15:00:00+09:00",
    assetId: "copper",
    cycleId: "cycle-2026-03-08",
    predictionId: "cp-5-copper",
    newsHeadline: "China NPC approves 4.4 trillion yuan fiscal package",
    newsSource: "Xinhua",
    relevance: "high",
    impact: "supports",
    summary: "중국 양회 4.4조위안 재정패키지 확정. 인프라·부동산 투자 확대 → 구리 수요 지지.",
  },
];

// ─── 사이클 데이터 접근 함수 ──────────────────────────────────────────────

export const allCycles: AIPredictionCycle[] = [...pastCycles, currentCycle];

export function getCurrentCycle(): AIPredictionCycle {
  return currentCycle;
}

export function getCompletedCycles(): AIPredictionCycle[] {
  return pastCycles.filter((c) => c.status === "completed");
}

export function getCycleById(id: string): AIPredictionCycle | undefined {
  return allCycles.find((c) => c.id === id);
}

export function getCycleResults(cycleId: string): AICycleResult[] {
  return cycleResults.filter((r) => r.cycleId === cycleId);
}

export function getAllCycleResults(): AICycleResult[] {
  return cycleResults;
}

export function getVerificationLogs(cycleId?: string): VerificationLog[] {
  if (cycleId) return verificationLogs.filter((v) => v.cycleId === cycleId);
  return verificationLogs;
}

export function getLatestVerificationLogs(limit = 10): VerificationLog[] {
  return [...verificationLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/** 사이클별 예측 성과 계산 */
export function computeCyclePerformance(): AICyclePerformance {
  const completed = cycleResults.filter((r) => r.result !== "미결");
  const correct = completed.filter((r) => r.result === "적중").length;
  const partial = completed.filter((r) => r.result === "부분적중").length;
  const incorrect = completed.filter((r) => r.result === "불일치").length;
  const pending = cycleResults.filter((r) => r.result === "미결").length;

  const resolvedCount = correct + partial + incorrect;
  const accuracyRate = resolvedCount > 0
    ? Math.round(((correct + partial * 0.5) / resolvedCount) * 100)
    : 0;

  // 사이클별 정확도
  const recentCycles = pastCycles.map((cycle) => {
    const results = cycleResults.filter((r) => r.cycleId === cycle.id);
    const cResolved = results.filter((r) => r.result !== "미결");
    const cCorrect = cResolved.filter((r) => r.result === "적중").length;
    const cPartial = cResolved.filter((r) => r.result === "부분적중").length;
    const cTotal = cResolved.length;
    return {
      cycleId: cycle.id,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      accuracyRate: cTotal > 0 ? Math.round(((cCorrect + cPartial * 0.5) / cTotal) * 100) : 0,
      predictions: results.length,
    };
  }).reverse();

  // 자산별 정확도
  const assetMap = new Map<string, { correct: number; partial: number; incorrect: number; total: number }>();
  for (const r of completed) {
    const existing = assetMap.get(r.assetId) || { correct: 0, partial: 0, incorrect: 0, total: 0 };
    existing.total++;
    if (r.result === "적중") existing.correct++;
    else if (r.result === "부분적중") existing.partial++;
    else if (r.result === "불일치") existing.incorrect++;
    assetMap.set(r.assetId, existing);
  }

  const byAsset = [...assetMap.entries()].map(([assetId, data]) => {
    const asset = assets.find((a) => a.id === assetId);
    return {
      assetId,
      assetName: asset?.name || assetId,
      predictions: data.total,
      correct: data.correct,
      partial: data.partial,
      incorrect: data.incorrect,
      accuracyRate: data.total > 0
        ? Math.round(((data.correct + data.partial * 0.5) / data.total) * 100)
        : 0,
    };
  }).sort((a, b) => b.accuracyRate - a.accuracyRate);

  return {
    totalCycles: pastCycles.length,
    totalPredictions: cycleResults.length,
    correct,
    partial,
    incorrect,
    pending,
    accuracyRate,
    recentCycles,
    byAsset,
  };
}

/** 특정 자산의 현재 AI 예측 가져오기 */
export function getCurrentPredictionForAsset(assetId: string): AICyclePrediction | undefined {
  return currentCycle.predictions.find((p) => p.assetId === assetId);
}

/** 다음 사이클 갱신까지 남은 시간 */
export function getNextCycleInfo() {
  const endDate = new Date(currentCycle.endDate + "T09:00:00+09:00");
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const diffHours = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return {
    nextCycleDate: currentCycle.endDate,
    hoursRemaining: diffHours,
    daysRemaining: diffDays,
    isExpired: diffMs <= 0,
  };
}

// ─── 산업 ETF 예측 데이터 ──────────────────────────────────────────────────

export const industryETFPredictions: IndustryETFPrediction[] = [
  {
    industryAssetId: "semiconductor",
    industryName: "반도체",
    etfs: [
      { ticker: "091160", nameKr: "KODEX 반도체", name: "KODEX Semiconductor", direction: "변동성확대", expectedReturn3d: "-2%~+3%", expectedReturn1m: "+3~8%", confidence: 68, rationale: "HBM 수요는 견조하나 레거시 반도체 재고 부담. GTC 이벤트가 단기 방향 결정. AI반도체 비중 높은 종목은 장기 상승 유효.", aiRecommendation: "보유", currentPrice: 32450 },
      { ticker: "395170", nameKr: "TIGER 반도체TOP10", name: "TIGER Semiconductor TOP10", direction: "변동성확대", expectedReturn3d: "-2%~+4%", expectedReturn1m: "+4~10%", confidence: 70, rationale: "삼성전자·SK하이닉스 비중 높아 HBM4 양산 조기화 수혜 기대. 다만 레거시 재고 리스크 공존.", aiRecommendation: "매수", currentPrice: 18750 },
      { ticker: "364690", nameKr: "KODEX AI반도체핵심장비", name: "KODEX AI Semiconductor Equipment", direction: "상승", expectedReturn3d: "+1%~+4%", expectedReturn1m: "+5~12%", confidence: 72, rationale: "AI반도체 설비투자(CAPEX) 확대 직접 수혜. ASML·도쿄일렉트론 관련주 편입. 구조적 성장.", aiRecommendation: "적극매수", currentPrice: 14820 },
    ],
  },
  {
    industryAssetId: "ai-tech",
    industryName: "AI·빅테크",
    etfs: [
      { ticker: "133690", nameKr: "TIGER 미국나스닥100", name: "TIGER NASDAQ 100", direction: "상승", expectedReturn3d: "+0.5%~+2%", expectedReturn1m: "+3~8%", confidence: 65, rationale: "AI CAPEX 확대가 빅테크 실적 견인. 관세 역풍에도 AI 테마 프리미엄 유지. 나스닥 내 AI 관련 비중 40%+.", aiRecommendation: "매수", currentPrice: 105200 },
      { ticker: "381180", nameKr: "TIGER 미국필라델피아반도체", name: "TIGER Philadelphia Semiconductor", direction: "변동성확대", expectedReturn3d: "-1%~+3%", expectedReturn1m: "+5~12%", confidence: 67, rationale: "엔비디아·AMD·TSMC 직접 투자. GTC(3/17) 결과에 따라 방향성 결정. AI반도체 수요는 구조적.", aiRecommendation: "매수", currentPrice: 16340 },
      { ticker: "456600", nameKr: "TIGER AI코리아", name: "TIGER AI Korea Growth", direction: "상승", expectedReturn3d: "+0%~+2%", expectedReturn1m: "+3~7%", confidence: 63, rationale: "국내 AI 관련주 선별 투자. 삼성전자·네이버·카카오 AI 전환 수혜 기대.", aiRecommendation: "보유", currentPrice: 11250 },
    ],
  },
  {
    industryAssetId: "ev-battery",
    industryName: "전기차·배터리",
    etfs: [
      { ticker: "305720", nameKr: "KODEX 2차전지산업", name: "KODEX Secondary Battery", direction: "하락", expectedReturn3d: "-3%~0%", expectedReturn1m: "-5~+2%", confidence: 64, rationale: "IRA 보조금 축소 우려 + 리튬 가격 하락 + BYD 가격 공세. 단기 하방 압력 지속.", aiRecommendation: "비중축소", currentPrice: 8920 },
      { ticker: "394670", nameKr: "TIGER 2차전지TOP10", name: "TIGER Secondary Battery TOP10", direction: "하락", expectedReturn3d: "-2%~+1%", expectedReturn1m: "-4~+3%", confidence: 62, rationale: "LG에너지솔루션·삼성SDI 가동률 하락. 배터리 재고 누적으로 단기 부진.", aiRecommendation: "비중축소", currentPrice: 7650 },
      { ticker: "371160", nameKr: "TIGER 퓨처모빌리티", name: "TIGER Future Mobility", direction: "보합", expectedReturn3d: "-1%~+1%", expectedReturn1m: "-2~+4%", confidence: 60, rationale: "자율주행·전기차 통합 테마. EV 단기 부진에도 자율주행 모멘텀은 유효.", aiRecommendation: "보유", currentPrice: 9180 },
    ],
  },
  {
    industryAssetId: "bio-pharma",
    industryName: "바이오·제약",
    etfs: [
      { ticker: "244580", nameKr: "KODEX 바이오", name: "KODEX Bio", direction: "상승", expectedReturn3d: "+0.5%~+2%", expectedReturn1m: "+3~8%", confidence: 62, rationale: "GLP-1 시장 확대 + FDA 승인 러시. 관세 무풍지대로 방어적 매력 부각.", aiRecommendation: "매수", currentPrice: 6840 },
      { ticker: "227540", nameKr: "TIGER 헬스케어", name: "TIGER Healthcare", direction: "상승", expectedReturn3d: "+0%~+1.5%", expectedReturn1m: "+2~6%", confidence: 60, rationale: "바이오텍 M&A 활발 + 삼성바이오로직스 수주 호조. 코스닥 바이오지수 역행 상승 중.", aiRecommendation: "매수", currentPrice: 8520 },
    ],
  },
  {
    industryAssetId: "defense",
    industryName: "방산·우주항공",
    etfs: [
      { ticker: "140710", nameKr: "KODEX 운송", name: "KODEX Transportation", direction: "상승", expectedReturn3d: "+1%~+3%", expectedReturn1m: "+5~10%", confidence: 73, rationale: "참고: 순수 방산 ETF 부재로 운송·조선 관련 ETF 활용. 한화에어로스페이스 개별주 직접 투자 권장.", aiRecommendation: "매수", currentPrice: 5620 },
      { ticker: "252710", nameKr: "TIGER 200 IT", name: "TIGER 200 IT", direction: "상승", expectedReturn3d: "+0.5%~+2%", expectedReturn1m: "+3~7%", confidence: 68, rationale: "방산·항공 대형주 일부 편입. IT + 방산 복합 성장. NATO 방위비 증액 구조적 수혜.", aiRecommendation: "매수", currentPrice: 22350 },
    ],
  },
  {
    industryAssetId: "shipbuilding",
    industryName: "조선·해운",
    etfs: [
      { ticker: "140700", nameKr: "KODEX 운송", name: "KODEX Transportation", direction: "상승", expectedReturn3d: "+1%~+3%", expectedReturn1m: "+5~10%", confidence: 69, rationale: "HD한국조선 수주잔고 사상 최대. LNG선 발주 호조 + IMO 환경 규제 수혜. 조선 슈퍼사이클 진입.", aiRecommendation: "적극매수", currentPrice: 5620 },
      { ticker: "228800", nameKr: "TIGER 여행레저", name: "TIGER Travel Leisure", direction: "상승", expectedReturn3d: "+0%~+1.5%", expectedReturn1m: "+2~5%", confidence: 60, rationale: "해운 운임 반등 + 크루즈·관광 수요 회복. 간접적 해운 수혜.", aiRecommendation: "보유", currentPrice: 7930 },
    ],
  },
];

export function getETFPredictionsByIndustry(industryAssetId: string): IndustryETFPrediction | undefined {
  return industryETFPredictions.find(p => p.industryAssetId === industryAssetId);
}

export function getAllETFPredictions(): IndustryETFPrediction[] {
  return industryETFPredictions;
}

export function getTopETFRecommendations(limit = 10) {
  return industryETFPredictions
    .flatMap(ind => ind.etfs.map(etf => ({ ...etf, industryName: ind.industryName, industryAssetId: ind.industryAssetId })))
    .filter(etf => etf.aiRecommendation === "적극매수" || etf.aiRecommendation === "매수")
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}
