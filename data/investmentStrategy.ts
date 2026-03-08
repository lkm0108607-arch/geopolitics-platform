// ─── 업데이트 메타데이터 ────────────────────────────────────────────────────

export const updateMeta = {
  lastUpdate: "2026-03-08",
  nextUpdate: "2026-03-11",
  updateCycle: 3, // 일 단위
  version: "v2.1",
};

// ─── 타입 정의 ──────────────────────────────────────────────────────────────

export interface TimeframeReturn {
  label: "초단기" | "단기" | "중장기" | "장기";
  period: string;
  expectedReturn: string;
  maxRisk: string;
  strategy: string;
}

export interface ETFRecommendation {
  ticker: string;
  name: string;
  nameKr: string;
  category: "방어형" | "공격형" | "헤지형";
  region: "미국" | "한국" | "글로벌" | "신흥국" | "유럽" | "아시아";
  relatedIssueIds: string[];
  rationale: string;
  riskLevel: "낮음" | "보통" | "높음" | "매우높음";
  expectedReturn: string;
  entryTiming: string;
  exitTiming: string;
  dangerSignals: string[];
  currentWeight: number;
  timeframes: TimeframeReturn[];
  currentPrice: number; // 모의투자용 현재가 (원)
}

export interface InvestmentScenario {
  id: string;
  name: string;
  probability: number;
  description: string;
  marketImpact: string;
  strategy: string;
  etfAllocation: { ticker: string; weight: number; action: "매수" | "보유" | "매도" | "비중축소" | "비중확대" }[];
  keyTriggers: string[];
  timeline: string;
}

export interface DangerAlert {
  id: string;
  title: string;
  description: string;
  severity: "주의" | "경계" | "위험" | "극심";
  relatedIssueIds: string[];
  impactedETFs: { ticker: string; impact: string }[];
  actionRequired: string;
  probability: number;
}

export interface TimingSignal {
  id: string;
  type: "진입" | "청산" | "비중조절";
  condition: string;
  indicator: string;
  currentStatus: "미충족" | "근접" | "충족";
  description: string;
}

// ─── 국내 상장 ETF 추천 목록 ─────────────────────────────────────────────────
// 모든 ETF는 KRX(한국거래소) 상장 종목입니다.
// 해외 종목을 담은 국내 ETF도 포함됩니다.

export const etfRecommendations: ETFRecommendation[] = [
  // ── 방어형 ──────────────────────────────────────────────────────────────────
  {
    ticker: "132030",
    name: "KODEX 골드선물(H)",
    nameKr: "코덱스 금 선물 ETF (환헤지)",
    category: "방어형",
    region: "글로벌",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk", "us-tariff-war"],
    rationale:
      "금 선물에 투자하면서 환헤지가 적용되어 원/달러 환율 변동 리스크를 제거한 ETF이다. 트럼프 관세전쟁이 글로벌 무역 불확실성을 극대화하면서 안전자산 수요가 폭발적으로 증가하고 있다. 연금저축·IRP 계좌에서 금 투자 시 가장 적합하며, 세제 혜택을 극대화할 수 있다. 관세전쟁·경기침체 리스크에 대한 핵심 방어 자산으로 15% 이상 편입을 권고한다.",
    riskLevel: "낮음",
    expectedReturn: "+6~15%",
    entryTiming: "금 가격이 50일 이동평균선 근처까지 조정 시 분할 매수. 연준 FOMC 직전 약세 구간 활용. 연금저축 계좌 비중 10~15% 목표로 적립식 매수.",
    exitTiming: "금 가격 $3,200 이상 시 비중 축소. 미중 무역 합의 공식 발표 시 30% 차익 실현. 환헤지 비용 급증(한미 금리차 확대) 시 비중 재검토.",
    dangerSignals: [
      "연준 금리 50bp 이상 인상 결정",
      "미중 무역 합의로 불확실성 급감",
      "실질금리 급등(10년 TIPS 수익률 2.5% 초과)",
      "금 ETF 글로벌 자금 유출 3주 연속",
      "환헤지 비용 연 3% 이상 급증",
    ],
    currentWeight: 12,
    currentPrice: 17250,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "+1~3%", maxRisk: "-3%", strategy: "현 보유분 유지. 금 가격 단기 조정 시 추가 매수 기회로 활용." },
      { label: "단기", period: "2~3개월", expectedReturn: "+3~7%", maxRisk: "-5%", strategy: "관세 발동(3/15) 전후 안전자산 수요 급증 기대. FOMC 결과에 따라 비중 조절." },
      { label: "중장기", period: "4~12개월", expectedReturn: "+6~15%", maxRisk: "-8%", strategy: "글로벌 불확실성 지속 시 금 가격 $3,000+ 도달 전망. 코어 포지션으로 장기 보유." },
      { label: "장기", period: "1~3년", expectedReturn: "+10~25%", maxRisk: "-12%", strategy: "중앙은행 금 매입 트렌드와 탈달러화 흐름이 구조적 상승 동력. 연금 계좌 장기 편입 적합." },
    ],
  },
  {
    ticker: "305080",
    name: "TIGER 미국채10년선물",
    nameKr: "타이거 미국 10년 국채선물 ETF",
    category: "방어형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk"],
    rationale:
      "미국 10년물 국채선물에 투자하는 ETF로, 환노출형이어서 원화 약세 시 추가 환차익을 얻을 수 있다. 경기침체 신호가 강화되면 연준의 금리 인하 기대가 급증하며 국채 가격이 상승한다. 현재 10년물 금리 4.2% 수준에서 3.5%까지 하락하면 약 12~15% 수익이 가능하다. 스태그플레이션 시나리오에서는 손실 가능성이 존재해 주의가 필요하다.",
    riskLevel: "보통",
    expectedReturn: "+5~15%",
    entryTiming: "10년물 국채 금리 4.3% 이상 시 분할 매수 시작. ISM 제조업 PMI 48 이하 확인 후 비중 확대. 실업률 상승 추세 확인 시 추가 매수.",
    exitTiming: "CPI 상승률 4% 초과 지속 시 비중 축소. 연준 금리 인상 재개 신호 시 전량 매도. 10년물 금리 3.5% 이하 도달 시 차익 실현.",
    dangerSignals: [
      "CPI 전년비 4% 초과 3개월 연속",
      "연준 위원 과반 매파 전환 발언",
      "재정적자 급증으로 국채 공급 과잉",
      "기대인플레이션(BEI) 3% 돌파",
    ],
    currentWeight: 8,
    currentPrice: 9450,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "+0~2%", maxRisk: "-3%", strategy: "FOMC(3/18~19) 결과 확인 전까지 소폭 보유. 매파 발언 시 단기 손실 가능." },
      { label: "단기", period: "2~3개월", expectedReturn: "+2~6%", maxRisk: "-5%", strategy: "경기둔화 신호 강화 시 금리 하락 기대. 관세 충격이 경기에 반영되는 시점." },
      { label: "중장기", period: "4~12개월", expectedReturn: "+5~15%", maxRisk: "-10%", strategy: "연준 금리 인하 전환 시 가장 강한 수혜. 인하 시작 전 비중 확대 완료 필요." },
      { label: "장기", period: "1~3년", expectedReturn: "+8~20%", maxRisk: "-15%", strategy: "금리 사이클 전환에 베팅. 인하 사이클 시작~종료까지 보유. 환차익 추가 기대." },
    ],
  },
  {
    ticker: "458730",
    name: "TIGER 미국배당다우존스",
    nameKr: "타이거 미국 배당 다우존스 ETF",
    category: "방어형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk"],
    rationale:
      "미국 배당 성장 우량주에 투자하는 국내 상장 ETF로, Dow Jones US Dividend 100 지수를 추종한다. 10년 이상 배당 증가 이력이 있는 종목으로 구성되어 경기 하강기에도 배당 삭감 리스크가 낮다. 현재 배당수익률 약 3.5% 수준으로 안정적이며, 관세전쟁 환경에서 내수 중심 기업 비중이 높아 관세 직접 타격이 제한적이다. 연금저축·IRP 계좌에서 장기 적립식 매수에 적합하다.",
    riskLevel: "낮음",
    expectedReturn: "+3~12%",
    entryTiming: "S&P500 5% 이상 조정 시 분할 매수. 배당수익률 3.8% 이상 구간에서 적극 매수. VIX 25 이상 공포 구간 활용.",
    exitTiming: "경기 회복 확인 후 성장주로 순환 시 비중 축소. 배당수익률 2.8% 이하로 밸류에이션 과열 시 차익 실현.",
    dangerSignals: [
      "미국 대형주 배당 삭감 뉴스 연속 발생",
      "소비자 지출 3개월 연속 감소",
      "금리 급등으로 배당 매력도 상실",
      "원화 급격 강세 전환 시 환손실",
    ],
    currentWeight: 8,
    currentPrice: 14200,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "+0~2%", maxRisk: "-4%", strategy: "배당 수령 일정 확인 후 보유. 시장 급락 시에도 배당이 하방 지지." },
      { label: "단기", period: "2~3개월", expectedReturn: "+1~4%", maxRisk: "-7%", strategy: "관세 충격에도 내수 기업 중심이라 상대적 방어력. 분기 배당 수령으로 안정적 수익." },
      { label: "중장기", period: "4~12개월", expectedReturn: "+3~12%", maxRisk: "-10%", strategy: "배당 + 주가 상승의 복합 수익 기대. 연금 계좌 적립식 매수 최적." },
      { label: "장기", period: "1~3년", expectedReturn: "+8~20%", maxRisk: "-15%", strategy: "배당 재투자 효과로 복리 수익 극대화. 10년 이상 배당 성장 기업의 장기 우상향 추세." },
    ],
  },
  {
    ticker: "272580",
    name: "TIGER 단기채권액티브",
    nameKr: "타이거 단기채권 ETF",
    category: "방어형",
    region: "한국",
    relatedIssueIds: ["korea-economy", "us-fed-rates"],
    rationale:
      "한국 단기 국공채에 투자하는 초저위험 ETF로, 현금성 자산 대용으로 활용한다. 연 3.0~3.5% 수준의 안정적 수익을 제공하며, 시장 급변 시에도 가격 변동이 극히 제한적이다. 관세전쟁·경기침체 등 고불확실성 환경에서 포트폴리오의 '방탄조끼' 역할을 하며, 매수 기회 포착 시 즉시 투입 가능한 대기 자금으로 활용한다.",
    riskLevel: "낮음",
    expectedReturn: "+2.5~3.5%",
    entryTiming: "시장 불확실성 극대화 시 비중 확대. 주식 비중 축소 시 대기 자금 파킹 용도로 즉시 매수.",
    exitTiming: "시장 바닥 확인 후 위험자산으로 전환 시 비중 축소. 특별한 매도 시점 없이 유동성 필요 시 수시 활용.",
    dangerSignals: [
      "한국은행 기준금리 급락 시 수익률 하락",
      "한국 신용 리스크 급등(극단적 시나리오)",
    ],
    currentWeight: 10,
    currentPrice: 105350,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "+0.25~0.3%", maxRisk: "-0.1%", strategy: "현금 대체 자산. 언제든 매도 가능한 유동성 확보 수단." },
      { label: "단기", period: "2~3개월", expectedReturn: "+0.6~0.9%", maxRisk: "-0.2%", strategy: "대기 자금 운용. 위험자산 진입 기회 포착 시 즉시 전환." },
      { label: "중장기", period: "4~12개월", expectedReturn: "+2~3%", maxRisk: "-0.5%", strategy: "안정적 이자 수입. 시장 불확실성 높은 기간에 비중 확대." },
      { label: "장기", period: "1~3년", expectedReturn: "+5~8%", maxRisk: "-1%", strategy: "금리 수준에 따른 재투자 수익. 포트폴리오 안정성 확보용 장기 보유." },
    ],
  },
  {
    ticker: "148070",
    name: "KOSEF 국고채10년",
    nameKr: "코세프 한국 국고채 10년 ETF",
    category: "방어형",
    region: "한국",
    relatedIssueIds: ["korea-economy", "us-fed-rates"],
    rationale:
      "한국 국고채 10년물에 투자하는 ETF로, 한국은행 금리 인하 사이클 시 자본이득이 기대된다. 현재 한국 국고채 10년물 금리는 3.3% 수준으로, 경기 둔화 가시화 시 금리 하락에 따른 채권 가격 상승이 예상된다. 원화 표시 자산이므로 환율 리스크가 없으며, 한국 내수 경기 방어 포지션으로 활용 가능하다.",
    riskLevel: "낮음",
    expectedReturn: "+3~10%",
    entryTiming: "한국 10년물 금리 3.5% 이상 시 분할 매수. 한국은행 기준금리 인하 시그널 확인 후 비중 확대.",
    exitTiming: "한국 10년물 금리 2.5% 이하 도달 시 차익 실현. 인플레이션 재가속 시 비중 축소.",
    dangerSignals: [
      "한국 CPI 3.5% 이상 지속",
      "한국은행 금리 인상 재개",
      "한국 재정 건전성 악화 우려",
    ],
    currentWeight: 5,
    currentPrice: 104800,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "+0.2~0.5%", maxRisk: "-1.5%", strategy: "금리 방향성 불투명 구간. 소규모 보유로 관망." },
      { label: "단기", period: "2~3개월", expectedReturn: "+1~3%", maxRisk: "-3%", strategy: "한국은행 금리 결정에 따라 방향 결정. 인하 기대감 반영 시 수혜." },
      { label: "중장기", period: "4~12개월", expectedReturn: "+3~10%", maxRisk: "-5%", strategy: "한국은행 인하 사이클 진입 시 강한 수혜. 금리 2.5%p 하락 시 약 8% 수익." },
      { label: "장기", period: "1~3년", expectedReturn: "+5~15%", maxRisk: "-8%", strategy: "금리 사이클 전체 포착. 인하 사이클 시작~종료 보유 시 이자+자본이득 복합 수익." },
    ],
  },

  // ── 공격형 ──────────────────────────────────────────────────────────────────
  {
    ticker: "360750",
    name: "TIGER 미국S&P500",
    nameKr: "타이거 미국 S&P500 ETF",
    category: "공격형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk", "us-tariff-war"],
    rationale:
      "한국 원화로 미국 S&P500 지수에 투자할 수 있는 국내 상장 ETF이다. 환헤지가 되어 있지 않아 원화 약세 시 추가 환차익을 얻을 수 있다. 연금저축·IRP·ISA 등 절세 계좌에서 투자 가능하며, 미국 대표 500개 기업에 분산 투자하는 효과가 있다. 관세전쟁 환경에서 단기 변동성은 크나, 미국 경제의 장기 성장력에 대한 투자로 코어 포지션에 적합하다.",
    riskLevel: "보통",
    expectedReturn: "+3~15%",
    entryTiming: "S&P500 5% 이상 조정 + 원/달러 1,350원 이상 동시 충족 시 적극 매수. 연금저축 월 적립식 매수 권장.",
    exitTiming: "S&P500 사상 최고치 + 원/달러 1,280원 이하 동시 충족 시 비중 축소. 연금 계좌는 장기 보유 원칙.",
    dangerSignals: [
      "S&P500 20% 이상 폭락(베어마켓 진입)",
      "미국 GDP 2분기 연속 마이너스",
      "원/달러 환율 급락(원화 강세 전환) 시 환손실",
      "미국 기업 실적 2분기 연속 역성장",
    ],
    currentWeight: 8,
    currentPrice: 18950,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "-2~+3%", maxRisk: "-8%", strategy: "관세 발동(3/15) 전후 변동성 확대 예상. 신규 매수보다 기존 보유분 유지 중심." },
      { label: "단기", period: "2~3개월", expectedReturn: "-3~+5%", maxRisk: "-12%", strategy: "관세 영향 본격 반영 시기. 5% 이상 조정 시 분할 매수 시작. 실적 시즌 주시." },
      { label: "중장기", period: "4~12개월", expectedReturn: "+3~15%", maxRisk: "-18%", strategy: "관세 협상 진전 또는 연준 인하 시 강한 반등 기대. 적립식 매수로 평균 단가 관리." },
      { label: "장기", period: "1~3년", expectedReturn: "+10~30%", maxRisk: "-25%", strategy: "미국 경제 장기 성장에 대한 투자. 연금 계좌 코어 자산으로 최적. 환차익 추가 가능." },
    ],
  },
  {
    ticker: "133690",
    name: "TIGER 미국나스닥100",
    nameKr: "타이거 미국 나스닥100 ETF",
    category: "공격형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates", "global-ai-governance", "us-china-trade"],
    rationale:
      "한국 원화로 미국 나스닥100 지수에 투자하는 국내 상장 ETF이다. 매그니피센트7(애플·마이크로소프트·엔비디아·알파벳·아마존·메타·테슬라)의 비중이 절대적이며, AI 성장 테마에 대한 장기 베팅과 달러 자산 분산을 동시에 달성할 수 있다. 연금저축·IRP 계좌에서 투자 시 세제 혜택이 크며, 장기 적립식 투자에 적합하다.",
    riskLevel: "높음",
    expectedReturn: "-8~+22%",
    entryTiming: "나스닥100 10% 조정 시 분할 매수. 연금저축 계좌 월 적립식 매수 전략 권장. 원/달러 1,380원 이상 시 환차익 기대로 적극 매수.",
    exitTiming: "나스닥100 PER 35배 이상 과열 시 비중 축소. 빅테크 실적 시즌 가이던스 일제 하향 시 매도.",
    dangerSignals: [
      "빅테크 실적 연속 미스",
      "연준 금리 인상 재개",
      "원화 급격 강세(환손실)",
      "AI 버블 붕괴 우려 확산",
      "나스닥100 200일 이동평균선 이탈",
    ],
    currentWeight: 7,
    currentPrice: 118500,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "-3~+4%", maxRisk: "-10%", strategy: "AI 테마 모멘텀 지속 여부 주시. 단기 변동성 대비 소량 보유." },
      { label: "단기", period: "2~3개월", expectedReturn: "-5~+8%", maxRisk: "-15%", strategy: "실적 시즌 결과가 핵심. AI CAPEX 가이던스 확인 후 비중 결정." },
      { label: "중장기", period: "4~12개월", expectedReturn: "-8~+22%", maxRisk: "-22%", strategy: "금리 인하 전환 시 가장 강한 반등 기대. 인하 시그널 확인 후 비중 확대." },
      { label: "장기", period: "1~3년", expectedReturn: "+15~40%", maxRisk: "-30%", strategy: "AI 혁명의 최대 수혜. 적립식 장기 투자로 변동성 관리. 연금 계좌 핵심 자산." },
    ],
  },
  {
    ticker: "381180",
    name: "TIGER 필라델피아반도체나스닥",
    nameKr: "타이거 미국 반도체 ETF",
    category: "공격형",
    region: "미국",
    relatedIssueIds: ["us-china-trade", "korea-economy", "global-ai-governance"],
    rationale:
      "미국 필라델피아 반도체 지수(SOX)를 추종하는 국내 상장 ETF로, 엔비디아·TSMC·브로드컴 등 AI 반도체 핵심 기업에 투자한다. AI 데이터센터 투자 확대의 최대 수혜주들로 구성되나, 미중 기술 디커플링과 관세가 공급망 리스크를 높이고 있어 변동성이 매우 크다. 고위험-고수익 포지션으로 시장 급락 시에만 선별적 진입을 권고한다.",
    riskLevel: "매우높음",
    expectedReturn: "-15~+30%",
    entryTiming: "SOX 지수 200일 이동평균선 근접 시 분할 매수. 엔비디아 실적 발표 후 급락 시 기술적 매수 기회. VIX 30 이상 공포 극대화 구간.",
    exitTiming: "SOX 지수 사상 최고치 경신 후 10% 이내 구간에서 부분 차익 실현. 미중 기술 제재 전면 확대 시 전량 매도.",
    dangerSignals: [
      "중국 반도체 수출 제한 전면 확대 행정명령",
      "TSMC 대만 공장 가동 리스크(지정학적 긴장)",
      "AI 버블 논란 가속(빅테크 CAPEX ROI 의문)",
      "메모리 반도체 가격 하락 전환",
      "반도체 재고 사이클 하강 전환",
    ],
    currentWeight: 5,
    currentPrice: 14800,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "-5~+8%", maxRisk: "-15%", strategy: "변동성 극심. 기존 보유분만 유지하고 신규 매수 자제. 대만 리스크 모니터링." },
      { label: "단기", period: "2~3개월", expectedReturn: "-8~+12%", maxRisk: "-20%", strategy: "엔비디아 실적 확인이 핵심. 실적 호조 시 단기 랠리, 미스 시 급락 가능." },
      { label: "중장기", period: "4~12개월", expectedReturn: "-15~+30%", maxRisk: "-30%", strategy: "AI 투자 사이클 2단계 시작 여부가 핵심. 사이클 지속 확인 시 10% 이상 배분." },
      { label: "장기", period: "1~3년", expectedReturn: "+20~60%", maxRisk: "-40%", strategy: "AI 혁명 수혜 극대화. 단 대만 리스크·사이클 하강 시 -40% 손실 가능. 분할 매수 필수." },
    ],
  },
  {
    ticker: "069500",
    name: "KODEX 200",
    nameKr: "코덱스 코스피200 ETF",
    category: "공격형",
    region: "한국",
    relatedIssueIds: ["korea-economy", "us-tariff-war", "us-china-trade"],
    rationale:
      "코스피200 지수를 추종하는 한국 대표 ETF로, 삼성전자·SK하이닉스·현대차 등 한국 대형주에 집중 투자한다. 2026년 3월 현재 코스피는 관세전쟁, 원화 약세, 내수 부진의 삼중고로 글로벌 대비 심각한 저평가 구간에 있다. 반도체 사이클 회복과 관세 완화가 동시에 이뤄져야 의미 있는 상승이 가능하다. 역발상 투자자에게 기회가 될 수 있으나 단기적으로는 하방 리스크가 크다.",
    riskLevel: "높음",
    expectedReturn: "-10~+20%",
    entryTiming: "코스피 2,300 이하 또는 코스피200 PBR 0.8배 이하 시 분할 매수. 외국인 순매수 전환 확인 후 비중 확대.",
    exitTiming: "코스피 2,700 이상 회복 시 부분 차익 실현. 원/달러 1,250원 이하 원화 강세 시 비중 축소(달러 자산 전환).",
    dangerSignals: [
      "삼성전자 실적 쇼크 및 배당 삭감",
      "한국 수출 적자 전환",
      "코스피 2,200 이탈",
      "가계부채 위기 현실화",
      "한국 국가 신용등급 하향",
    ],
    currentWeight: 5,
    currentPrice: 34750,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "-3~+2%", maxRisk: "-8%", strategy: "관세 직격탄 구간. 신규 매수 보류. 코스피 2,300 이탈 시 오히려 매수 기회 탐색." },
      { label: "단기", period: "2~3개월", expectedReturn: "-5~+5%", maxRisk: "-12%", strategy: "관세 영향 본격 반영. 외국인 수급 전환 확인이 반등의 핵심 신호." },
      { label: "중장기", period: "4~12개월", expectedReturn: "-10~+20%", maxRisk: "-20%", strategy: "반도체 사이클 회복 + 관세 완화 시 2,700선 회복 가능. 저평가 매수 전략." },
      { label: "장기", period: "1~3년", expectedReturn: "+5~35%", maxRisk: "-25%", strategy: "코리아 디스카운트 해소 + 밸류업 프로그램 효과 장기 기대. PBR 0.8배 이하는 역사적 저점." },
    ],
  },
  {
    ticker: "091160",
    name: "KODEX 반도체",
    nameKr: "코덱스 한국 반도체 ETF",
    category: "공격형",
    region: "한국",
    relatedIssueIds: ["korea-economy", "us-china-trade", "global-ai-governance"],
    rationale:
      "삼성전자·SK하이닉스 등 한국 반도체 기업에 집중 투자하는 ETF이다. AI 서버용 HBM(고대역폭 메모리) 수요 급증으로 SK하이닉스가 글로벌 HBM 시장 점유율 1위를 기록하고 있다. 그러나 미중 기술 디커플링 심화 시 중국 매출 비중이 높은 삼성전자의 타격이 우려되며, NAND 시장의 공급 과잉 리스크도 존재한다. 한국 반도체 산업의 사이클 회복에 베팅하는 고위험 포지션이다.",
    riskLevel: "매우높음",
    expectedReturn: "-15~+35%",
    entryTiming: "삼성전자 PBR 1.0배 이하 시 분할 매수 시작. SK하이닉스 HBM 수주 확대 확인 시 비중 확대. 반도체 업황 바닥 확인 후 진입.",
    exitTiming: "메모리 가격 피크 신호(수급 균형 전환) 시 차익 실현. 삼성전자 PBR 1.5배 이상 시 비중 축소.",
    dangerSignals: [
      "삼성전자·SK하이닉스 분기 실적 쇼크",
      "NAND 가격 급락",
      "미중 기술 제재 한국 반도체 확대",
      "중국 자체 반도체 양산 성공 뉴스",
      "HBM 수요 둔화 신호",
    ],
    currentWeight: 3,
    currentPrice: 8350,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "-5~+5%", maxRisk: "-12%", strategy: "삼성전자·SK하이닉스 실적 발표 전후 변동성 극심. 기존 보유분 유지 위주." },
      { label: "단기", period: "2~3개월", expectedReturn: "-8~+10%", maxRisk: "-18%", strategy: "메모리 가격 추이와 AI 서버 수주 확인이 핵심. HBM 모멘텀 지속 시 수혜." },
      { label: "중장기", period: "4~12개월", expectedReturn: "-15~+35%", maxRisk: "-30%", strategy: "반도체 슈퍼사이클 진입 여부가 핵심. 사이클 상승 확인 시 적극 매수." },
      { label: "장기", period: "1~3년", expectedReturn: "+15~50%", maxRisk: "-35%", strategy: "AI 시대 메모리 반도체 수요 구조적 증가 기대. 삼성전자 밸류에이션 정상화 기대." },
    ],
  },
  {
    ticker: "305720",
    name: "KODEX 2차전지산업",
    nameKr: "코덱스 2차전지 산업 ETF",
    category: "공격형",
    region: "한국",
    relatedIssueIds: ["korea-economy", "us-tariff-war", "us-china-trade"],
    rationale:
      "LG에너지솔루션·삼성SDI·에코프로비엠 등 한국 2차전지(배터리) 기업에 투자하는 ETF이다. 글로벌 전기차 시장 성장과 ESS(에너지저장장치) 수요 확대가 장기 성장 동력이나, 미국 IRA(인플레이션감축법) 규정 변경 리스크와 중국 CATL의 가격 경쟁력 위협이 우려된다. 트럼프 행정부의 EV 보조금 축소 가능성이 단기적 악재이나, 배터리 기술 경쟁력은 여전히 세계 최고 수준이다.",
    riskLevel: "매우높음",
    expectedReturn: "-20~+30%",
    entryTiming: "LG에너지솔루션 PBR 2.0배 이하 시 분할 매수. IRA 규정 확정 후 수혜 확인 시 비중 확대. 전기차 판매 데이터 반등 확인 시 진입.",
    exitTiming: "2차전지 주가 50% 이상 반등 시 부분 차익 실현. 중국 배터리 가격 전쟁 심화 시 비중 축소.",
    dangerSignals: [
      "트럼프 행정부 IRA 보조금 전면 폐지",
      "유럽 전기차 판매 급감",
      "중국 CATL 가격 인하 공세 가속",
      "배터리 기술 패러다임 전환(전고체 등) 가속",
      "한국 배터리 기업 대규모 적자 전환",
    ],
    currentWeight: 3,
    currentPrice: 5980,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "-5~+3%", maxRisk: "-12%", strategy: "IRA 규정 변경 뉴스 모니터링. 악재 선반영 구간이라 추가 하락 제한적일 수 있으나 확인 필요." },
      { label: "단기", period: "2~3개월", expectedReturn: "-10~+8%", maxRisk: "-18%", strategy: "전기차 판매 데이터와 IRA 최종안 확정이 핵심. 수혜 확인 시 반등 가능." },
      { label: "중장기", period: "4~12개월", expectedReturn: "-20~+30%", maxRisk: "-30%", strategy: "전기차 시장 성장률과 한국 기업 수주 추이가 핵심. 실적 턴어라운드 확인 시 대형 반등." },
      { label: "장기", period: "1~3년", expectedReturn: "+10~50%", maxRisk: "-40%", strategy: "전기차·ESS 시장 구조적 성장 수혜. 현 저점 매수 시 장기적 큰 수익 가능하나 리스크도 높음." },
    ],
  },

  // ── 헤지형 ──────────────────────────────────────────────────────────────────
  {
    ticker: "261240",
    name: "KODEX 미국달러선물",
    nameKr: "코덱스 달러선물 ETF",
    category: "헤지형",
    region: "글로벌",
    relatedIssueIds: ["us-fed-rates", "korea-economy", "us-tariff-war"],
    rationale:
      "원/달러 환율 상승(원화 약세)에 베팅하는 ETF로, 원화 자산이 대부분인 한국 투자자에게 필수적인 환율 헤지 수단이다. 관세전쟁 확대, 한국 경제 둔화, 글로벌 리스크 오프 환경에서 원화 약세가 지속되면 수익을 제공한다. 주식·채권과의 낮은 상관관계로 분산 효과가 크며, 해외 ETF 직접 매수가 어려운 경우 달러 노출 확보 수단으로도 활용 가능하다.",
    riskLevel: "보통",
    expectedReturn: "+1~8%",
    entryTiming: "원/달러 1,350원 이하 원화 강세 구간에서 분할 매수. 글로벌 리스크 이벤트 직전 비중 확대. 한국 경상수지 적자 전환 시 추가 매수.",
    exitTiming: "원/달러 1,420원 이상 과매도 구간에서 차익 실현. 미중 무역 합의 + 연준 금리 인하로 달러 약세 전환 시 전량 매도.",
    dangerSignals: [
      "트럼프 행정부 달러 약세 정책 추진",
      "한국은행 외환시장 대규모 개입",
      "원/달러 1,450원 돌파 후 정부 환율 방어 조치",
      "플라자 합의 2.0 논의",
    ],
    currentWeight: 5,
    currentPrice: 13480,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "+0.5~2%", maxRisk: "-2%", strategy: "관세 발동(3/15) 전후 원화 약세 가속 예상. 현 보유분 유지." },
      { label: "단기", period: "2~3개월", expectedReturn: "+1~4%", maxRisk: "-4%", strategy: "관세 영향으로 한국 수출 둔화 시 원화 약세 지속. 달러 헤지 유지." },
      { label: "중장기", period: "4~12개월", expectedReturn: "+1~8%", maxRisk: "-6%", strategy: "글로벌 불확실성 지속 시 달러 강세 유지. 원화 강세 전환 시 축소." },
      { label: "장기", period: "1~3년", expectedReturn: "-3~+10%", maxRisk: "-10%", strategy: "구조적 달러 강세 vs 한국 경제 회복 시나리오에 따라 방향 결정. 포지션 유연성 유지." },
    ],
  },
  {
    ticker: "114800",
    name: "KODEX 인버스",
    nameKr: "코덱스 코스피200 인버스 ETF",
    category: "헤지형",
    region: "한국",
    relatedIssueIds: ["global-recession-risk", "us-tariff-war", "korea-economy"],
    rationale:
      "코스피200 지수의 일일 수익률을 -1배로 추종하는 인버스 ETF로, 시장 하락에 대한 직접적인 헤지 수단이다. 관세전쟁 확대, 경기침체 진입 등으로 코스피 급락이 예상될 때 단기 포트폴리오 보호 목적으로 활용한다. 장기 보유 시 복리 효과로 인한 수익률 괴리가 발생하므로 반드시 단기(1~4주) 전술적 헤지 목적으로만 사용해야 한다.",
    riskLevel: "높음",
    expectedReturn: "-10~+15%",
    entryTiming: "코스피가 50일 이동평균선 이탈 시 헤지 진입. VIX 20 이하 저변동성 구간에서 저비용 헤지 구축. 관세 발동 D-3일 전 선제 진입.",
    exitTiming: "코스피 10% 이상 하락 후 반등 신호(양봉 3일 연속) 시 헤지 청산. 최대 4주 보유 후 무조건 재평가.",
    dangerSignals: [
      "시장 급반등 시 헤지 손실 급증",
      "장기 보유 시 복리 손실 누적",
      "한국은행 긴급 금리 인하로 코스피 V자 반등",
    ],
    currentWeight: 3,
    currentPrice: 4520,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "-3~+8%", maxRisk: "-8%", strategy: "관세 발동 전후 단기 헤지 적극 활용. 3/15 전후 2주간 보유 후 청산 검토." },
      { label: "단기", period: "2~3개월", expectedReturn: "-8~+12%", maxRisk: "-12%", strategy: "최대 4주 단위로 롤링. 장기 보유 절대 금지. 코스피 바닥 확인 후 즉시 청산." },
      { label: "중장기", period: "4~12개월", expectedReturn: "비추천", maxRisk: "-30%+", strategy: "장기 보유 절대 비추천. 복리 감가로 원금 대부분 소실 가능. 단기 전술용으로만 활용." },
      { label: "장기", period: "1~3년", expectedReturn: "비추천", maxRisk: "-50%+", strategy: "절대 장기 보유 금지. 인버스 ETF는 구조적으로 장기 보유 시 손실. 헤지 목적 단기만 사용." },
    ],
  },
  {
    ticker: "130680",
    name: "TIGER 원유선물Enhanced(H)",
    nameKr: "타이거 원유선물 ETF (환헤지)",
    category: "헤지형",
    region: "글로벌",
    relatedIssueIds: ["israel-iran", "us-tariff-war", "global-recession-risk"],
    rationale:
      "WTI 원유 선물에 투자하면서 환헤지가 적용된 ETF이다. 이스라엘-이란 긴장 재고조와 관세전쟁으로 인한 에너지 공급망 교란이 유가 상승 압력을 높이고 있다. 인플레이션 헤지 수단으로 기능하며, 스태그플레이션 시나리오에서 주식·채권과 낮은 상관관계를 보여 포트폴리오 분산 효과가 크다. 다만 원유 선물 특유의 콘탱고 비용에 주의해야 한다.",
    riskLevel: "높음",
    expectedReturn: "-10~+20%",
    entryTiming: "WTI $65 이하 시 분할 매수. 중동 지정학적 긴장 고조 시 비중 확대. 유가 200일 이동평균선 돌파 시 추세 추종.",
    exitTiming: "WTI $95 이상 시 부분 차익 실현. OPEC+ 감산 해제 발표 시 전량 매도. 경기침체로 수요 급감 확인 시 비중 축소.",
    dangerSignals: [
      "OPEC+ 감산 해제로 공급 과잉",
      "글로벌 경기침체로 원유 수요 급감",
      "미국 셰일 생산 급증",
      "콘탱고 구조 심화로 롤오버 비용 증가",
    ],
    currentWeight: 3,
    currentPrice: 7150,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "-3~+5%", maxRisk: "-8%", strategy: "중동 정세 모니터링. 호르무즈 해협 리스크 시 급등 가능. 이벤트 드리븐 전략." },
      { label: "단기", period: "2~3개월", expectedReturn: "-5~+10%", maxRisk: "-12%", strategy: "관세 발동 후 에너지 가격 영향 확인. 인플레이션 헤지 목적 보유." },
      { label: "중장기", period: "4~12개월", expectedReturn: "-10~+20%", maxRisk: "-20%", strategy: "유가 사이클과 지정학적 리스크 프리미엄에 따라 변동. 분산 투자 목적." },
      { label: "장기", period: "1~3년", expectedReturn: "-15~+25%", maxRisk: "-30%", strategy: "롤오버 비용 누적 주의. 장기 보유보다 사이클 매매 추천. 에너지 전환 추세 고려." },
    ],
  },
  {
    ticker: "271060",
    name: "KODEX 3대농산물선물(H)",
    nameKr: "코덱스 농산물 선물 ETF (환헤지)",
    category: "헤지형",
    region: "글로벌",
    relatedIssueIds: ["us-tariff-war", "global-recession-risk"],
    rationale:
      "옥수수·대두·밀 등 3대 농산물 선물에 분산 투자하는 ETF이다. 관세전쟁으로 인한 글로벌 식량 공급망 교란과 기후변화에 따른 작황 불안이 농산물 가격 상승 요인으로 작용하고 있다. 인플레이션 헤지 수단으로 기능하며, 스태그플레이션 시나리오에서 포트폴리오 분산 효과가 크다. 중국의 미국산 농산물 보복 관세가 글로벌 가격 구조를 왜곡하고 있다.",
    riskLevel: "보통",
    expectedReturn: "+2~12%",
    entryTiming: "CPI 식료품 항목 상승세 확인 시 매수. 기후 이상(엘니뇨·라니냐) 발생 확인 시 비중 확대. 농산물 선물 200일선 돌파 시.",
    exitTiming: "글로벌 곡물 작황 호조 확인 시 비중 축소. 관세 완화로 농산물 교역 정상화 시 매도.",
    dangerSignals: [
      "글로벌 곡물 대풍작 예보",
      "관세 협상으로 농산물 교역 정상화",
      "경기침체로 수요 급감",
    ],
    currentWeight: 3,
    currentPrice: 10850,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "+0~3%", maxRisk: "-4%", strategy: "관세 발동 후 농산물 가격 반응 확인. 보복 관세 영향 모니터링." },
      { label: "단기", period: "2~3개월", expectedReturn: "+1~5%", maxRisk: "-6%", strategy: "봄철 작황 전망과 관세 협상 결과가 핵심 변수. 식량 가격 인플레이션 헤지." },
      { label: "중장기", period: "4~12개월", expectedReturn: "+2~12%", maxRisk: "-10%", strategy: "기후 리스크와 공급망 교란 지속 시 완만한 상승. 인플레이션 환경에서 실물 자산 역할." },
      { label: "장기", period: "1~3년", expectedReturn: "+5~15%", maxRisk: "-15%", strategy: "식량 안보 이슈와 기후변화가 구조적 상승 요인. 포트폴리오 3~5% 분산 보유 적합." },
    ],
  },
  {
    ticker: "371460",
    name: "TIGER 차이나전기차SOLACTIVE",
    nameKr: "타이거 중국 전기차 ETF",
    category: "공격형",
    region: "아시아",
    relatedIssueIds: ["us-china-trade", "us-tariff-war"],
    rationale:
      "BYD·CATL 등 중국 전기차·배터리 핵심 기업에 투자하는 국내 상장 ETF이다. 중국 전기차 시장은 글로벌 최대 규모이며, BYD는 2025년 테슬라를 제치고 글로벌 판매 1위를 기록했다. 그러나 미중 기술 디커플링과 EU의 중국산 EV 관세 부과가 리스크 요인이다. 중국 내수 시장 성장에 대한 베팅으로, 미중 관계 악화 시 큰 변동성이 예상된다.",
    riskLevel: "매우높음",
    expectedReturn: "-20~+35%",
    entryTiming: "미중 관계 극단적 악화로 중국 ETF 급락 시 역발상 매수. BYD 분기 판매 데이터 호조 확인 시 비중 확대.",
    exitTiming: "중국 전기차 주가 50% 이상 반등 시 차익 실현. 미중 기술 전쟁 전면화 시 전량 매도.",
    dangerSignals: [
      "미국의 중국 전기차 수입 전면 금지",
      "EU 대중국 EV 관세 추가 인상",
      "중국 부동산 위기 재확산",
      "중국 경기 부양 실패",
      "위안화 급락(달러 대비 8.0 이상)",
    ],
    currentWeight: 2,
    currentPrice: 7950,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "-5~+5%", maxRisk: "-12%", strategy: "미중 관세 동향에 극도로 민감. 관세 확대 시 급락, 완화 시 급등. 소량만 보유." },
      { label: "단기", period: "2~3개월", expectedReturn: "-10~+10%", maxRisk: "-18%", strategy: "중국 경기부양 정책과 전기차 판매 데이터 확인. 정책 수혜 확인 시 비중 확대." },
      { label: "중장기", period: "4~12개월", expectedReturn: "-20~+35%", maxRisk: "-30%", strategy: "중국 전기차 글로벌 확장과 내수 성장에 베팅. 미중 관계 안정화 시 큰 수혜." },
      { label: "장기", period: "1~3년", expectedReturn: "+10~60%", maxRisk: "-40%", strategy: "중국 전기차 글로벌 1위 시대. 장기적 구조적 성장 기대하나 정치 리스크 상존." },
    ],
  },
  {
    ticker: "143850",
    name: "TIGER 미국S&P500선물(H)",
    nameKr: "타이거 미국 S&P500 ETF (환헤지)",
    category: "공격형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk", "us-tariff-war"],
    rationale:
      "S&P500 지수에 투자하면서 환헤지가 적용된 ETF이다. 360750(환노출형)과 달리 원/달러 환율 변동에 따른 리스크를 제거했다. 원화 강세가 예상될 때, 또는 순수하게 미국 주식 시장의 방향성에만 베팅하고 싶을 때 적합하다. 현재 원화 약세 추세에서는 환노출형(360750) 대비 수익률이 낮을 수 있으나, 환율 변동에 대한 불확실성을 제거하는 장점이 있다.",
    riskLevel: "보통",
    expectedReturn: "+2~12%",
    entryTiming: "S&P500 5% 이상 조정 시 분할 매수. 원화 강세 전환 예상 시 환노출형(360750) 대신 선택.",
    exitTiming: "S&P500 사상 최고치 경신 시 부분 차익 실현. 원화 약세 심화 시 환노출형(360750)으로 전환 검토.",
    dangerSignals: [
      "S&P500 20% 이상 폭락",
      "환헤지 비용 급증(한미 금리차 확대)",
      "미국 기업 실적 2분기 연속 역성장",
    ],
    currentWeight: 5,
    currentPrice: 16200,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "-2~+2%", maxRisk: "-7%", strategy: "관세 발동 전후 변동성 대비. 환리스크 없이 미국 시장 노출 유지." },
      { label: "단기", period: "2~3개월", expectedReturn: "-3~+4%", maxRisk: "-10%", strategy: "환율 방향 불확실 시 환헤지형 선호. 관세 영향 반영 후 방향 결정." },
      { label: "중장기", period: "4~12개월", expectedReturn: "+2~12%", maxRisk: "-15%", strategy: "원화 강세 전환 예상 시 유리. 순수 미국 시장 수익률만 추적." },
      { label: "장기", period: "1~3년", expectedReturn: "+8~25%", maxRisk: "-22%", strategy: "환율 전망이 불확실한 장기 투자 시 적합. 환헤지 비용 감안 필요." },
    ],
  },
  {
    ticker: "252670",
    name: "KODEX 200선물인버스2X",
    nameKr: "코덱스 코스피200 인버스 2배 ETF",
    category: "헤지형",
    region: "한국",
    relatedIssueIds: ["global-recession-risk", "us-tariff-war", "korea-economy"],
    rationale:
      "코스피200 지수의 일일 수익률을 -2배로 추종하는 레버리지 인버스 ETF이다. 시장 급락 시 일반 인버스(114800) 대비 2배의 수익을 제공하나, 반대로 시장 상승 시 2배의 손실이 발생한다. 극단적 하방 리스크 헤지가 필요한 경우에만 초단기(1~2주) 전술적으로 활용하며, 절대 장기 보유해서는 안 된다. 포트폴리오의 1~2% 이내로만 편입한다.",
    riskLevel: "매우높음",
    expectedReturn: "-20~+30%",
    entryTiming: "코스피 하락 추세 명확 + 추가 악재(관세 발동, 지정학 충돌) 임박 시에만 진입. VIX 15 이하 저변동성 구간에서 최소 비용으로 헤지.",
    exitTiming: "코스피 5% 이상 급락 후 반등 신호 시 즉시 청산. VIX 40 이상 극공포 구간에서 전량 매도. 최대 보유 기간 2주 엄수.",
    dangerSignals: [
      "시장 급반등 시 2배 손실 발생",
      "장기 보유 시 복리 감가 급격",
      "변동성 높은 횡보장에서 양방향 손실 누적",
    ],
    currentWeight: 1,
    currentPrice: 2050,
    timeframes: [
      { label: "초단기", period: "1개월", expectedReturn: "-10~+20%", maxRisk: "-20%", strategy: "관세 발동(3/15) 직전~직후 1~2주 단기 헤지용. 즉시 청산 원칙." },
      { label: "단기", period: "2~3개월", expectedReturn: "비추천", maxRisk: "-40%+", strategy: "절대 비추천. 2배 복리 감가로 원금 급감. 단기 전술 헤지 외 사용 금지." },
      { label: "중장기", period: "4~12개월", expectedReturn: "비추천", maxRisk: "-60%+", strategy: "절대 금지. 레버리지 인버스 장기 보유는 구조적 원금 소실." },
      { label: "장기", period: "1~3년", expectedReturn: "비추천", maxRisk: "-80%+", strategy: "절대 금지. 장기 보유 시 거의 확실한 원금 소실. 투기 목적으로도 부적합." },
    ],
  },
];

// ─── 투자 시나리오 ───────────────────────────────────────────────────────────

export const investmentScenarios: InvestmentScenario[] = [
  {
    id: "base-case",
    name: "기본 시나리오: 관세 지속 + 연준 동결 + 저성장",
    probability: 40,
    description:
      "트럼프 관세가 현 수준(중국 60%, EU 25%, 전 세계 10%)에서 유지되고, 연준은 금리를 동결한다. 글로벌 경제는 1.5~2.0% 저성장을 지속하며, 시장은 높은 변동성 속에 횡보한다.",
    marketImpact:
      "S&P500 -5%~+8% 횡보. VIX 20~30. 원/달러 1,360~1,400원. 코스피 2,300~2,600 박스권.",
    strategy:
      "방어형 자산(금·배당주·국채) 중심으로 포트폴리오를 구성하고, 공격형 자산은 급락 시에만 선별적으로 매수한다. 현금 비중 15~20% 유지.",
    etfAllocation: [
      { ticker: "132030", weight: 12, action: "보유" },
      { ticker: "305080", weight: 8, action: "보유" },
      { ticker: "458730", weight: 8, action: "보유" },
      { ticker: "272580", weight: 10, action: "보유" },
      { ticker: "148070", weight: 5, action: "보유" },
      { ticker: "360750", weight: 8, action: "보유" },
      { ticker: "133690", weight: 7, action: "비중축소" },
      { ticker: "069500", weight: 5, action: "비중축소" },
      { ticker: "261240", weight: 5, action: "보유" },
      { ticker: "114800", weight: 3, action: "보유" },
      { ticker: "143850", weight: 5, action: "보유" },
      { ticker: "271060", weight: 3, action: "보유" },
    ],
    keyTriggers: [
      "연준 FOMC 금리 동결 지속 결정",
      "관세 협상 교착 상태 지속",
      "미국 GDP 1.5~2.0% 유지",
      "CPI 2.8~3.5% 구간 유지",
    ],
    timeline: "2026년 3월 ~ 9월 (6개월)",
  },
  {
    id: "risk-off",
    name: "리스크 오프: 관세 확대 + 경기침체 + 시장 급락",
    probability: 25,
    description:
      "트럼프가 관세를 추가 확대하고, 보복 관세 사이클이 전면화되면서 글로벌 경기침체에 진입한다. S&P500 20% 이상 폭락, 코스피 2,000 이탈 위험.",
    marketImpact:
      "S&P500 -20~-30% 급락. VIX 40 이상. 원/달러 1,450원 이상. 코스피 2,000 이탈 위험.",
    strategy:
      "방어형·헤지형 자산 비중을 극대화하고 공격형 자산을 전량 매도한다. 현금 비중 30% 이상으로 확대.",
    etfAllocation: [
      { ticker: "132030", weight: 18, action: "비중확대" },
      { ticker: "305080", weight: 12, action: "비중확대" },
      { ticker: "272580", weight: 18, action: "비중확대" },
      { ticker: "261240", weight: 7, action: "비중확대" },
      { ticker: "114800", weight: 5, action: "비중확대" },
      { ticker: "148070", weight: 8, action: "비중확대" },
      { ticker: "360750", weight: 0, action: "매도" },
      { ticker: "133690", weight: 0, action: "매도" },
      { ticker: "381180", weight: 0, action: "매도" },
      { ticker: "069500", weight: 0, action: "매도" },
      { ticker: "091160", weight: 0, action: "매도" },
    ],
    keyTriggers: [
      "트럼프, 전 세계 관세 20% 이상으로 추가 인상",
      "미국 GDP 2분기 연속 마이너스(기술적 침체)",
      "실업률 5% 돌파",
      "하이일드 스프레드 500bp 이상 확대",
    ],
    timeline: "2026년 하반기 ~ 2027년 상반기",
  },
  {
    id: "soft-landing",
    name: "연착륙: 관세 부분 타협 + 경기 회복",
    probability: 20,
    description:
      "미중·미EU 양자 협상이 부분 타결되면서 관세가 일부 인하된다. 연준이 점진적 금리 인하를 시작하고, 경기가 회복된다.",
    marketImpact:
      "S&P500 +15~+25% 상승. VIX 15 이하. 원/달러 1,280~1,320원. 코스피 2,700~3,000 회복.",
    strategy:
      "공격형 자산 비중을 대폭 확대하고 방어형·헤지형 자산을 축소한다. 반도체·기술주 중심으로 재구성.",
    etfAllocation: [
      { ticker: "133690", weight: 15, action: "비중확대" },
      { ticker: "381180", weight: 10, action: "비중확대" },
      { ticker: "360750", weight: 12, action: "비중확대" },
      { ticker: "069500", weight: 10, action: "비중확대" },
      { ticker: "091160", weight: 8, action: "비중확대" },
      { ticker: "305720", weight: 5, action: "비중확대" },
      { ticker: "132030", weight: 7, action: "비중축소" },
      { ticker: "305080", weight: 5, action: "비중축소" },
      { ticker: "458730", weight: 5, action: "보유" },
      { ticker: "114800", weight: 0, action: "매도" },
      { ticker: "261240", weight: 0, action: "매도" },
    ],
    keyTriggers: [
      "미중 관세 부분 인하 합의 발표",
      "연준 25bp 금리 인하 시작",
      "ISM 제조업 PMI 52 이상 회복",
      "빅테크 AI CAPEX 확대 발표",
    ],
    timeline: "2026년 하반기 ~ 2027년",
  },
  {
    id: "stagflation",
    name: "스태그플레이션: 고물가 + 저성장 동시",
    probability: 15,
    description:
      "관세가 인플레이션을 재점화(CPI 4% 이상)하는 동시에 경기는 둔화되는 최악의 조합이 현실화된다. 주식·채권이 동시에 하락한다.",
    marketImpact:
      "S&P500 -15~-25%. 국채 금리 상승. 금 가격 폭등. 원자재 급등. 코스피 2,100 이하. 원/달러 1,420원 이상.",
    strategy:
      "실물 자산(금·원자재)으로 포트폴리오를 대폭 전환한다. 채권은 장기물 회피, 초단기물만 보유한다.",
    etfAllocation: [
      { ticker: "132030", weight: 22, action: "비중확대" },
      { ticker: "271060", weight: 8, action: "비중확대" },
      { ticker: "130680", weight: 8, action: "비중확대" },
      { ticker: "272580", weight: 18, action: "비중확대" },
      { ticker: "261240", weight: 8, action: "비중확대" },
      { ticker: "458730", weight: 5, action: "비중축소" },
      { ticker: "305080", weight: 0, action: "매도" },
      { ticker: "133690", weight: 0, action: "매도" },
      { ticker: "381180", weight: 0, action: "매도" },
      { ticker: "069500", weight: 0, action: "매도" },
      { ticker: "091160", weight: 0, action: "매도" },
    ],
    keyTriggers: [
      "CPI 4% 이상 + GDP 1% 이하 동시 충족",
      "연준 스태그플레이션 공식 인정",
      "10년물 국채 금리 5% 돌파",
      "원유 가격 $100 이상 + 경기 둔화 동시",
    ],
    timeline: "2026년 하반기 ~ 2027년 (장기화 시 2028년까지)",
  },
];

// ─── 위험 알림 ───────────────────────────────────────────────────────────────

export const dangerAlerts: DangerAlert[] = [
  {
    id: "alert-tariff-escalation",
    title: "3월 15일 전 세계 10% 기본 관세 발동 임박",
    description:
      "트럼프 행정부가 3월 15일 전 세계 수입품에 대한 10% 기본 관세 발동을 최종 확인했다. EU·캐나다와의 마지막 협상이 결렬되어 예외 없이 시행될 전망이다.",
    severity: "위험",
    relatedIssueIds: ["us-tariff-war", "global-recession-risk"],
    impactedETFs: [
      { ticker: "133690", impact: "빅테크 수입 부품 비용 상승, -3~-8% 하락 가능" },
      { ticker: "069500", impact: "한국 수출 기업 직격탄, -5~-10% 하락 위험" },
      { ticker: "381180", impact: "반도체 공급망 비용 증가, -5~-12% 변동성 확대" },
      { ticker: "132030", impact: "안전자산 수요 급증으로 +3~+5% 상승 기대" },
    ],
    actionRequired: "공격형 ETF 비중을 20% 이하로 축소. 132030(금)·305080(국채) 등 방어형 비중 50% 이상 확대. 114800(인버스) 3~5% 헤지 포지션 구축.",
    probability: 90,
  },
  {
    id: "alert-china-retaliation",
    title: "중국 희토류 수출 전면 허가제 — 반도체 공급망 위기",
    description:
      "중국 상무부가 17개 희토류 전품목을 수출 허가제로 전환했다. 반도체·전기차·방산 등 첨단산업의 핵심 소재 공급을 직접 위협한다.",
    severity: "경계",
    relatedIssueIds: ["us-tariff-war", "us-china-trade"],
    impactedETFs: [
      { ticker: "381180", impact: "희토류 공급 차질로 반도체 생산 비용 급증, -8~-15% 하락" },
      { ticker: "091160", impact: "삼성·SK 희토류 조달 리스크, -7~-12% 하락" },
      { ticker: "305720", impact: "2차전지 소재 공급 차질, -5~-10% 하락" },
      { ticker: "132030", impact: "안전자산 선호로 +2~+5% 상승" },
    ],
    actionRequired: "381180·091160 합산 비중 8% 이하로 축소. 희토류 대체 소재 관련 뉴스 모니터링. 중국 수출 허가 실제 거부 사례 발생 여부 주시.",
    probability: 75,
  },
  {
    id: "alert-fed-dilemma",
    title: "연준 정책 딜레마 — 인플레이션 vs 경기둔화 동시 악화",
    description:
      "연준이 관세발 인플레이션(CPI 3.8%)과 경기둔화(GDP 1.3%)라는 상충되는 문제에 직면해 있다. 금리를 올리면 경기침체, 내리면 인플레이션 폭발.",
    severity: "경계",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk"],
    impactedETFs: [
      { ticker: "305080", impact: "금리 방향 불확실성으로 ±5~10% 변동성 확대" },
      { ticker: "133690", impact: "금리 인상 재개 시 -10~-15% 급락 가능" },
      { ticker: "132030", impact: "정책 불확실성으로 +5~10% 추가 상승 여력" },
    ],
    actionRequired: "FOMC 회의(3월 18~19일) 전후 포지션 축소. 금리 민감 자산(305080·133690) 비중 합산 15% 이하 유지.",
    probability: 70,
  },
  {
    id: "alert-korea-won-crisis",
    title: "원/달러 1,400원 돌파 임박 — 원화 약세 가속",
    description:
      "관세전쟁 확대, 한국 수출 둔화로 원/달러 환율이 1,380원을 돌파하며 1,400원 저항선에 근접하고 있다. 1,400원 돌파 시 외국인 자금 이탈 가속 우려.",
    severity: "주의",
    relatedIssueIds: ["korea-economy", "us-tariff-war"],
    impactedETFs: [
      { ticker: "069500", impact: "외국인 매도 가속으로 코스피 추가 하락, -5~-8%" },
      { ticker: "261240", impact: "달러 강세 수혜로 +2~4% 상승" },
      { ticker: "360750", impact: "환노출형이므로 원화 기준 +2~5% 추가 수익" },
    ],
    actionRequired: "환노출형 해외 ETF(360750, 133690) 비중 확대로 자연스러운 달러 헤지. 261240(달러선물) 5% 편입 유지. 코스피 ETF 신규 매수 보류.",
    probability: 65,
  },
  {
    id: "alert-taiwan-military",
    title: "대만해협 군사 긴장 고조 — 지정학적 블랙스완 리스크",
    description:
      "중국이 2026년 국방예산을 7.2% 증가시키며 대만 작전 역량 강화를 명시했다. 반도체 공급망(TSMC)에 대한 시장의 공포가 증폭되고 있다.",
    severity: "주의",
    relatedIssueIds: ["us-china-taiwan", "us-china-trade"],
    impactedETFs: [
      { ticker: "381180", impact: "TSMC 리스크 프리미엄 확대로 -10~-20% 급락 가능" },
      { ticker: "091160", impact: "아시아 반도체 공급망 공포로 -8~-15% 하락" },
      { ticker: "132030", impact: "안전자산 폭발적 수요로 +10~+15% 급등" },
    ],
    actionRequired: "반도체 ETF(381180, 091160) 합산 비중 10% 이하 제한. 132030(금) 비중 12% 이상 유지.",
    probability: 15,
  },
  {
    id: "alert-oil-spike",
    title: "중동 긴장 + 관세 — 유가 $90 돌파 리스크",
    description:
      "이스라엘-이란 긴장이 재고조되는 가운데, 관세전쟁으로 인한 에너지 공급망 교란이 겹치면서 유가 상승 압력이 커지고 있다. WTI $90~100까지 상승 가능.",
    severity: "경계",
    relatedIssueIds: ["israel-iran", "us-tariff-war", "global-recession-risk"],
    impactedETFs: [
      { ticker: "130680", impact: "에너지 가격 상승 수혜로 +5~+12%" },
      { ticker: "271060", impact: "농산물 가격 동반 상승, +3~+8%" },
      { ticker: "069500", impact: "에너지 순수입국 한국 직격탄, -5~-10% 하락" },
      { ticker: "132030", impact: "인플레이션 헤지 수요로 +3~+8% 상승" },
    ],
    actionRequired: "130680(원유)·271060(농산물) 합산 7~10% 편입. 한국 ETF(069500) 비중 축소. 유가 $95 돌파 시 스태그플레이션 포트폴리오로 전환 준비.",
    probability: 40,
  },
];

// ─── 타이밍 시그널 ───────────────────────────────────────────────────────────

export const timingSignals: TimingSignal[] = [
  {
    id: "ts-vix-entry",
    type: "진입",
    condition: "VIX 30 이상 + S&P500 10% 이상 조정 동시 충족",
    indicator: "VIX 지수 & S&P500 조정 폭",
    currentStatus: "미충족",
    description: "공포 극대화 구간에서의 역발상 매수 기회. 현재 VIX 22, S&P500 -4% 수준으로 미충족. VIX 30 이상에서 458730(배당주)·360750(S&P500) 분할 매수 시작.",
  },
  {
    id: "ts-yield-curve",
    type: "진입",
    condition: "장단기 금리차(10년-2년) 역전 해소 후 정상화 전환",
    indicator: "미국 10년-2년 국채 금리차",
    currentStatus: "근접",
    description: "금리차 양전환 시 305080(국채) 비중 확대 검토. 역사적으로 역전 해소 후 6~12개월 내 경기침체 발생.",
  },
  {
    id: "ts-tariff-entry",
    type: "진입",
    condition: "관세 부분 타협 공식 발표 + S&P500 양봉 3일 연속",
    indicator: "관세 협상 뉴스 & S&P500 기술적 반등",
    currentStatus: "미충족",
    description: "미중 또는 미EU 관세 타협 공식 발표 + 기술적 반등 확인 후 133690(나스닥)·381180(반도체) 비중 확대.",
  },
  {
    id: "ts-fed-pivot",
    type: "진입",
    condition: "연준 금리 인하 시작(첫 25bp 인하 결정)",
    indicator: "FOMC 금리 결정",
    currentStatus: "미충족",
    description: "연준 금리 인하 전환은 성장주의 강력한 상승 촉매. 133690(나스닥)·381180(반도체) 비중 확대. 다만 '인하=경기침체 인정'일 수 있어 경기 지표 동시 점검 필수.",
  },
  {
    id: "ts-kospi-bottom",
    type: "진입",
    condition: "코스피 2,300 이탈 + 외국인 순매수 전환 + 원/달러 하락 반전",
    indicator: "코스피 지수 & 외국인 수급 & 환율",
    currentStatus: "미충족",
    description: "세 조건 동시 충족 시 069500(코스피200)·091160(반도체) 적극 매수. 현재 코스피 2,420, 외국인 순매도 지속.",
  },
  {
    id: "ts-gold-exit",
    type: "청산",
    condition: "금 가격 $3,200 돌파 + RSI 75 이상 과매수",
    indicator: "금 현물 가격 & RSI",
    currentStatus: "미충족",
    description: "목표가 도달 + 기술적 과매수 시 132030(금) 30% 부분 차익 실현. 나머지 70%는 장기 보유.",
  },
  {
    id: "ts-inverse-exit",
    type: "청산",
    condition: "VIX 40 이상 + 코스피 15% 이상 하락",
    indicator: "VIX & 코스피 하락폭",
    currentStatus: "미충족",
    description: "인버스 ETF(114800, 252670) 보유 시 극공포 구간은 헤지 이익 실현 최적 시점. 헤지를 풀고 위험자산 전환 시작.",
  },
  {
    id: "ts-rebalance-monthly",
    type: "비중조절",
    condition: "월말 기준 개별 ETF 비중이 목표 대비 ±5%p 이상 괴리",
    indicator: "포트폴리오 비중 괴리율",
    currentStatus: "충족",
    description: "월 1회 정기 리밸런싱 시점. 132030(금)이 목표 12% 대비 14%로 소폭 초과. ±5%p 이상 괴리 시 반드시 리밸런싱.",
  },
  {
    id: "ts-stagflation-shift",
    type: "비중조절",
    condition: "CPI 4% 이상 + GDP 1% 이하 2개월 연속 동시 충족",
    indicator: "CPI & GDP 성장률",
    currentStatus: "미충족",
    description: "스태그플레이션 진입 확인 시 포트폴리오 전면 재구성. 305080(국채) 전량 매도, 132030(금)·130680(원유)·271060(농산물) 합산 40% 이상 확대.",
  },
  {
    id: "ts-dollar-hedge",
    type: "비중조절",
    condition: "원/달러 1,350원 이하 하락 시 달러 헤지 ETF 비중 축소",
    indicator: "원/달러 환율",
    currentStatus: "미충족",
    description: "원화 강세 전환 확인 시 261240(달러선물) 비중을 2% 이하로 축소하고, 069500(코스피200) 비중 확대.",
  },
];

// ─── 유틸리티 함수 ───────────────────────────────────────────────────────────

export function getETFsByCategory(category: string): ETFRecommendation[] {
  return etfRecommendations.filter((etf) => etf.category === category);
}

export function getETFsByRegion(region: string): ETFRecommendation[] {
  return etfRecommendations.filter((etf) => etf.region === region);
}

export function getETFsByIssue(issueId: string): ETFRecommendation[] {
  return etfRecommendations.filter((etf) =>
    etf.relatedIssueIds.includes(issueId),
  );
}

export function getCurrentScenario(): InvestmentScenario {
  return investmentScenarios.reduce((max, scenario) =>
    scenario.probability > max.probability ? scenario : max,
  );
}

export function getActiveAlerts(): DangerAlert[] {
  const severityOrder: Record<string, number> = {
    "주의": 1,
    "경계": 2,
    "위험": 3,
    "극심": 4,
  };
  return dangerAlerts
    .filter((alert) => severityOrder[alert.severity] >= 2)
    .sort(
      (a, b) =>
        severityOrder[b.severity] - severityOrder[a.severity] ||
        b.probability - a.probability,
    );
}

export function getPortfolioAllocation(): {
  category: string;
  weight: number;
  etfs: ETFRecommendation[];
}[] {
  const categories = ["방어형", "공격형", "헤지형"];
  return categories.map((category) => {
    const categoryETFs = getETFsByCategory(category);
    const totalWeight = categoryETFs.reduce(
      (sum, etf) => sum + etf.currentWeight,
      0,
    );
    return {
      category,
      weight: totalWeight,
      etfs: categoryETFs,
    };
  });
}

export function getNextUpdateDate(): string {
  return updateMeta.nextUpdate;
}

export function getDaysSinceUpdate(): number {
  const last = new Date(updateMeta.lastUpdate);
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}
