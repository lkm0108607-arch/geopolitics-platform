import { issues } from "./issues";

// ─── ETF 추천 데이터 ─────────────────────────────────────────────────────────

export interface ETFRecommendation {
  ticker: string;
  name: string;
  nameKr: string;
  category: string;           // "방어형" | "공격형" | "헤지형" | "인컴형"
  region: "미국" | "한국" | "글로벌" | "신흥국" | "유럽" | "아시아";
  relatedIssueIds: string[];  // 연관 이슈 ID
  rationale: string;          // 추천 근거 (한국어, 상세)
  riskLevel: "낮음" | "보통" | "높음" | "매우높음";
  expectedReturn: string;     // 예: "+5~12%", "-3~+8%"
  entryTiming: string;        // 진입 시점 조건
  exitTiming: string;         // 청산 시점 조건
  dangerSignals: string[];    // 위험 신호 목록
  currentWeight: number;      // 현재 추천 비중 (0-100, 포트폴리오 내 %)
}

export interface InvestmentScenario {
  id: string;
  name: string;
  probability: number;        // 발생 확률 (%)
  description: string;
  marketImpact: string;       // 시장 영향 요약
  strategy: string;           // 전략 요약
  etfAllocation: { ticker: string; weight: number; action: "매수" | "보유" | "매도" | "비중축소" | "비중확대" }[];
  keyTriggers: string[];      // 이 시나리오가 현실화되는 트리거
  timeline: string;           // 예상 시점
}

export interface DangerAlert {
  id: string;
  title: string;
  description: string;
  severity: "주의" | "경계" | "위험" | "극심";
  relatedIssueIds: string[];
  impactedETFs: { ticker: string; impact: string }[];
  actionRequired: string;     // 필요 조치
  probability: number;        // 발생 확률
}

export interface TimingSignal {
  id: string;
  type: "진입" | "청산" | "비중조절";
  condition: string;          // 조건
  indicator: string;          // 지표
  currentStatus: "미충족" | "근접" | "충족";
  description: string;
}

// ─── ETF 추천 목록 ───────────────────────────────────────────────────────────

export const etfRecommendations: ETFRecommendation[] = [
  // ── 방어형 (Defense) ──────────────────────────────────────────────────────
  {
    ticker: "GLD",
    name: "SPDR Gold Trust",
    nameKr: "금 현물 ETF",
    category: "방어형",
    region: "글로벌",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk", "us-tariff-war"],
    rationale:
      "트럼프 관세전쟁이 글로벌 무역 불확실성을 극대화하면서 안전자산 수요가 폭발적으로 증가하고 있다. 연준이 관세발 인플레이션과 경기둔화 사이에서 딜레마에 빠진 상황에서 금은 유일한 '양방향 헤지' 수단이다. 2026년 3월 현재 금 가격은 온스당 $2,800 근방에서 거래되며, 중앙은행들의 금 매입이 사상 최고 수준을 기록 중이다. 달러 신뢰도 저하와 지정학적 리스크(대만·중동)가 동시에 작용하며 추가 상승 여력이 충분하다. 포트폴리오의 핵심 방어 자산으로 15% 이상 편입을 권고한다.",
    riskLevel: "낮음",
    expectedReturn: "+8~18%",
    entryTiming: "금 가격이 50일 이동평균선 근처까지 조정 시 분할 매수. RSI 40 이하 구간에서 적극 매수. 연준 FOMC 직전 약세 구간 활용.",
    exitTiming: "미중 무역 합의 공식 발표 시 비중 축소. 연준이 공격적 금리 인상(50bp 이상) 단행 시 일부 차익 실현. 금 가격 $3,200 돌파 시 30% 차익 실현.",
    dangerSignals: [
      "연준 금리 50bp 이상 인상 결정",
      "미중 무역 합의로 불확실성 급감",
      "달러 인덱스(DXY) 110 돌파 지속",
      "실질금리 급등(10년 TIPS 수익률 2.5% 초과)",
      "금 ETF 자금 유출 3주 연속 발생",
    ],
    currentWeight: 15,
  },
  {
    ticker: "TLT",
    name: "iShares 20+ Year Treasury Bond ETF",
    nameKr: "미국 장기국채 ETF",
    category: "방어형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk"],
    rationale:
      "연준의 금리 정책이 동결 상태에서 경기침체 신호가 강화되면 장기국채는 강력한 자본이득을 제공한다. 관세전쟁으로 인한 경기둔화가 가시화되면 연준의 금리 인하 기대가 급증하며 장기국채 가격이 급등할 수 있다. 현재 10년물 금리 4.2% 수준에서 3.5%까지 하락하면 TLT는 약 12~15% 수익이 가능하다. 다만 관세발 인플레이션이 지속될 경우 금리 하락이 제한될 수 있어, 스태그플레이션 시나리오에서는 손실 가능성이 존재한다. 경기 방어적 포지션으로 포트폴리오의 10% 수준 편입을 권고한다.",
    riskLevel: "보통",
    expectedReturn: "+5~15%",
    entryTiming: "10년물 국채 금리 4.3% 이상 시 분할 매수 시작. ISM 제조업 PMI 48 이하 확인 후 비중 확대. 실업률 상승 추세 확인 시 추가 매수.",
    exitTiming: "CPI 상승률 4% 초과 지속 시 비중 축소. 연준 금리 인상 재개 신호 시 전량 매도. 10년물 금리 3.5% 이하 도달 시 차익 실현.",
    dangerSignals: [
      "CPI 전년비 4% 초과 3개월 연속",
      "연준 위원 과반 매파 전환 발언",
      "재정적자 급증으로 국채 공급 과잉",
      "외국인 국채 매도 가속(중국·일본)",
      "기대인플레이션(BEI) 3% 돌파",
    ],
    currentWeight: 10,
  },
  {
    ticker: "SCHD",
    name: "Schwab US Dividend Equity ETF",
    nameKr: "미국 고배당 우량주 ETF",
    category: "방어형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk"],
    rationale:
      "경기 불확실성이 높아지는 환경에서 안정적인 배당을 지급하는 우량 대형주는 하방 방어력이 뛰어나다. SCHD는 10년 이상 배당 증가 이력이 있는 종목으로 구성되어 경기 하강기에도 배당 삭감 리스크가 낮다. 현재 배당수익률 약 3.5% 수준으로 국채 금리 대비 매력적이며, 관세전쟁 환경에서 내수 중심 기업 비중이 높아 관세 직접 타격이 제한적이다. 성장주 대비 밸류에이션 부담도 낮아 시장 급락 시 방어력을 발휘할 수 있다.",
    riskLevel: "낮음",
    expectedReturn: "+3~10%",
    entryTiming: "S&P500 5% 이상 조정 시 분할 매수. 배당수익률 3.8% 이상 구간에서 적극 매수. VIX 25 이상 공포 구간 활용.",
    exitTiming: "경기 회복 확인 후 성장주로 순환 시 비중 축소. 배당수익률 2.8% 이하로 밸류에이션 과열 시 차익 실현.",
    dangerSignals: [
      "미국 대형주 배당 삭감 뉴스 연속 발생",
      "소비자 지출 3개월 연속 감소",
      "S&P500 20% 이상 폭락(배당주도 동반 하락)",
      "금리 급등으로 배당 매력도 상실",
    ],
    currentWeight: 8,
  },
  {
    ticker: "VIG",
    name: "Vanguard Dividend Appreciation ETF",
    nameKr: "배당성장 ETF",
    category: "방어형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk"],
    rationale:
      "VIG는 10년 이상 연속 배당 증가 기업에 집중 투자하는 ETF로, 단순 고배당보다 배당 '성장성'에 초점을 맞춘다. 관세전쟁과 경기 불확실성 속에서도 매출과 이익이 안정적인 기업들이 편입되어 있어 장기 보유에 적합하다. SCHD 대비 성장성이 높은 기업 비중이 크며, 경기 회복 시 자본이득도 기대할 수 있는 '균형형' 방어 자산이다. 마이크로소프트, 존슨앤존슨 등 핵심 보유 종목들의 관세 직접 노출도가 낮다.",
    riskLevel: "낮음",
    expectedReturn: "+4~12%",
    entryTiming: "시장 전체 조정(SPX -5% 이상) 시 분할 매수. 10년물 금리 하락 전환 확인 후 비중 확대.",
    exitTiming: "성장주 강세장 본격화 시 QQQ로 전환 검토. PER 22배 초과 시 밸류에이션 부담으로 비중 축소.",
    dangerSignals: [
      "미국 기업 실적 시즌 예상 하회 연속",
      "배당 성장 기업의 가이던스 하향 조정",
      "10년물 금리 5% 돌파",
    ],
    currentWeight: 5,
  },
  {
    ticker: "IEF",
    name: "iShares 7-10 Year Treasury Bond ETF",
    nameKr: "미국 중기국채 ETF",
    category: "방어형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates"],
    rationale:
      "TLT 대비 듀레이션이 짧아 금리 변동에 따른 가격 변동성이 제한적이다. 연준 금리 동결 국면에서 안정적인 이자 수입을 제공하며, 경기침체 전환 시 완만한 자본이득도 기대할 수 있다. 스태그플레이션 리스크가 존재하는 현 환경에서 TLT보다 보수적인 채권 포지션으로 적합하다. 현재 수익률 약 4.0% 수준으로 현금 대비 충분한 캐리 수익을 제공한다.",
    riskLevel: "낮음",
    expectedReturn: "+2~8%",
    entryTiming: "7~10년물 금리 4.2% 이상 시 매수. 연준 FOMC 매파 발언 직후 금리 급등 구간 활용.",
    exitTiming: "연준 금리 인하 시작 후 TLT로 전환 검토. 경기 회복으로 금리 상승 전환 시 매도.",
    dangerSignals: [
      "연준 금리 인상 재개",
      "재정적자 확대로 국채 공급 폭증",
      "인플레이션 재가속 확인",
    ],
    currentWeight: 5,
  },

  // ── 공격형 (Offense) ──────────────────────────────────────────────────────
  {
    ticker: "SMH",
    name: "VanEck Semiconductor ETF",
    nameKr: "반도체 ETF",
    category: "공격형",
    region: "미국",
    relatedIssueIds: ["us-china-trade", "korea-economy", "global-ai-governance"],
    rationale:
      "AI 투자 사이클이 2026년에도 지속되며 반도체 수요는 구조적으로 강세를 유지하고 있다. 다만 미중 기술 디커플링과 트럼프 관세가 공급망 리스크를 높이고 있어 변동성이 매우 크다. 엔비디아, TSMC, 브로드컴 등 핵심 보유 종목들은 AI 데이터센터 투자 확대의 최대 수혜주이나, 중국 수출 제한 강화 시 매출 타격이 불가피하다. 고위험-고수익 포지션으로 시장 급락 시에만 선별적 진입을 권고한다.",
    riskLevel: "매우높음",
    expectedReturn: "-15~+30%",
    entryTiming: "필라델피아 반도체 지수(SOX) 200일 이동평균선 근접 또는 이탈 시 분할 매수. 엔비디아 실적 발표 후 급락 시 기술적 매수 기회. VIX 30 이상 공포 극대화 구간.",
    exitTiming: "SOX 지수 사상 최고치 경신 후 10% 이내 구간에서 부분 차익 실현. 미중 기술 제재 전면 확대 시 전량 매도. AI 투자 사이클 피크 신호(빅테크 CAPEX 가이던스 하향) 시 비중 축소.",
    dangerSignals: [
      "중국 반도체 수출 제한 전면 확대 행정명령",
      "TSMC 대만 공장 가동 리스크(지정학적 긴장)",
      "AI 버블 논란 가속(빅테크 CAPEX ROI 의문)",
      "메모리 반도체 가격 하락 전환(삼성·SK 실적 악화)",
      "반도체 재고 사이클 하강 전환",
    ],
    currentWeight: 5,
  },
  {
    ticker: "SOXX",
    name: "iShares Semiconductor ETF",
    nameKr: "반도체 지수 ETF",
    category: "공격형",
    region: "미국",
    relatedIssueIds: ["us-china-trade", "korea-economy", "global-ai-governance"],
    rationale:
      "SMH와 유사한 반도체 섹터 ETF이나 종목 구성이 더 분산되어 있어 개별 종목 리스크가 낮다. 인텔, TI 등 전통 반도체 기업 비중이 SMH 대비 높아 AI 외 자동차·산업용 반도체 회복 시 수혜가 크다. 관세전쟁 환경에서 미국 내 반도체 제조 확대(CHIPS Act) 수혜주 비중이 상대적으로 높다. SMH와 분산 보유하여 반도체 섹터 전체 노출도를 관리하는 것이 바람직하다.",
    riskLevel: "높음",
    expectedReturn: "-10~+25%",
    entryTiming: "SOX 지수 20% 조정 시 분할 매수 시작. 자동차·산업용 반도체 재고 바닥 확인 시 비중 확대.",
    exitTiming: "반도체 사이클 피크 신호(가격 인상 둔화, 재고 증가) 시 차익 실현. 미중 기술 냉전 전면화 시 비중 축소.",
    dangerSignals: [
      "미중 반도체 수출 제한 추가 확대",
      "글로벌 반도체 재고 과잉 경고",
      "자동차 반도체 수요 급감",
      "인텔 추가 구조조정 발표",
    ],
    currentWeight: 3,
  },
  {
    ticker: "QQQ",
    name: "Invesco QQQ Trust",
    nameKr: "나스닥100 ETF",
    category: "공격형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates", "global-ai-governance", "us-china-trade"],
    rationale:
      "나스닥100 지수를 추종하며 AI·클라우드·소프트웨어 등 기술 성장주에 집중 투자한다. 매그니피센트7(애플·마이크로소프트·엔비디아·알파벳·아마존·메타·테슬라)의 비중이 절대적이어서 이들의 실적에 따라 수익률이 결정된다. 관세전쟁 환경에서 소프트웨어 기업은 상대적으로 관세 영향이 적으나, 하드웨어·소비자가전 기업은 타격이 크다. 연준 금리 동결이 장기화되면 성장주 밸류에이션 부담이 커지나, 금리 인하 전환 시 가장 강한 반등이 예상된다.",
    riskLevel: "높음",
    expectedReturn: "-10~+20%",
    entryTiming: "나스닥100 10% 이상 조정 시 분할 매수. 연준 금리 인하 시그널 확인 후 비중 확대. PER 25배 이하 진입 매력적.",
    exitTiming: "나스닥100 PER 35배 이상 과열 시 비중 축소. 빅테크 실적 시즌 가이던스 일제 하향 시 매도. 연준 금리 인상 재개 시 전량 정리.",
    dangerSignals: [
      "빅테크 실적 일제 미스(2분기 연속)",
      "연준 금리 인상 재개 논의",
      "AI 투자 수익성 의문 확산",
      "반독점 규제 빅테크 분할 명령",
      "나스닥100 200일 이동평균선 이탈",
    ],
    currentWeight: 5,
  },
  {
    ticker: "ARKK",
    name: "ARK Innovation ETF",
    nameKr: "혁신기술 ETF",
    category: "공격형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates", "global-ai-governance"],
    rationale:
      "파괴적 혁신 기업(AI, 로보틱스, 유전체학, 핀테크)에 집중 투자하는 고위험 성장 ETF이다. 2022~2024년 급락 이후 회복 중이나, 금리 환경에 극도로 민감하여 연준 정책 변화에 따라 등락이 극심하다. 현재 환경에서는 핵심 비중이 아닌 위성 포지션(포트폴리오의 2~3%)으로만 편입을 권고한다. AI와 자율주행, 정밀의료 등 장기 메가트렌드에 대한 투기적 베팅 성격이 강하다.",
    riskLevel: "매우높음",
    expectedReturn: "-25~+40%",
    entryTiming: "ARKK가 52주 저점 대비 10% 이내 구간에서만 매수. 연준 금리 인하 확정 후 비중 확대. 혁신 기업 IPO 시장 재개 신호 확인.",
    exitTiming: "100% 이상 수익 시 원금 회수 후 잔여분만 보유. 보유 종목 대규모 자금 유출 시 전량 매도.",
    dangerSignals: [
      "연준 금리 인상 재개",
      "ARK 펀드 대규모 환매 지속",
      "핵심 보유 종목 파산 또는 대규모 적자",
      "금리 5% 이상 장기 유지",
    ],
    currentWeight: 2,
  },
  {
    ticker: "EWY",
    name: "iShares MSCI South Korea ETF",
    nameKr: "한국 주식 ETF",
    category: "공격형",
    region: "한국",
    relatedIssueIds: ["korea-economy", "us-china-trade", "us-tariff-war"],
    rationale:
      "한국 주식 시장에 달러 기준으로 투자하는 ETF로, 삼성전자·SK하이닉스 등 반도체 대형주 비중이 절대적이다. 2026년 3월 현재 코스피는 관세전쟁, 원화 약세, 내수 부진의 삼중고로 저평가 구간에 있다. 한국 경제의 구조적 문제(인구감소, 가계부채)가 장기적 리스크이나, 반도체 사이클 회복과 원화 반등 시 강한 리바운드가 기대된다. 원화 약세 구간에서 달러 투자자에게는 추가 환차익 기회가 있다. 다만 미중 기술 디커플링 심화 시 한국 반도체 기업의 중국 매출 타격이 가장 큰 리스크다.",
    riskLevel: "높음",
    expectedReturn: "-15~+25%",
    entryTiming: "코스피 2,300 이하 또는 원/달러 1,400원 이상 극단적 약세 구간에서 분할 매수. 삼성전자 PBR 1.0배 이하 시 역사적 저점 매수 기회.",
    exitTiming: "코스피 2,800 회복 또는 원/달러 1,280원 이하 강세 전환 시 부분 차익 실현. 미중 기술 제재 한국 확대 시 전량 매도.",
    dangerSignals: [
      "원/달러 환율 1,450원 돌파",
      "삼성전자·SK하이닉스 실적 쇼크",
      "한국 수출 6개월 연속 감소",
      "외국인 코스피 순매도 1조원 이상 지속",
      "한국 신용등급 하향 경고",
    ],
    currentWeight: 3,
  },

  // ── 헤지형 (Hedge) ────────────────────────────────────────────────────────
  {
    ticker: "SH",
    name: "ProShares Short S&P 500",
    nameKr: "S&P500 인버스 ETF",
    category: "헤지형",
    region: "미국",
    relatedIssueIds: ["global-recession-risk", "us-tariff-war"],
    rationale:
      "S&P500 지수의 일일 수익률을 -1배로 추종하는 인버스 ETF로, 시장 하락에 대한 직접적인 헤지 수단이다. 관세전쟁 확대, 경기침체 진입, 지정학적 충돌 등으로 시장 급락이 예상될 때 단기 포트폴리오 보호 목적으로 활용한다. 장기 보유 시 복리 효과로 인한 수익률 괴리가 발생하므로 반드시 단기(1~4주) 전술적 헤지 목적으로만 사용해야 한다. 현재 시장 불확실성이 높아 포트폴리오의 3~5% 수준 헤지 포지션 유지를 권고한다.",
    riskLevel: "높음",
    expectedReturn: "-10~+15%",
    entryTiming: "S&P500이 50일 이동평균선 이탈 시 헤지 진입. VIX 20 이하 저변동성 구간에서 저비용 헤지 구축. 관세 발동 D-3일 전 선제 진입.",
    exitTiming: "S&P500 10% 이상 하락 후 반등 신호(양봉 3일 연속) 시 헤지 청산. VIX 40 이상 극공포 구간에서 헤지 이익 실현. 최대 4주 보유 후 무조건 재평가.",
    dangerSignals: [
      "시장 급반등 시 헤지 손실 급증",
      "장기 보유 시 복리 손실 누적",
      "연준 긴급 금리 인하로 시장 V자 반등",
    ],
    currentWeight: 3,
  },
  {
    ticker: "UUP",
    name: "Invesco DB US Dollar Index Bullish Fund",
    nameKr: "달러 강세 ETF",
    category: "헤지형",
    region: "글로벌",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk", "us-tariff-war"],
    rationale:
      "달러 인덱스(DXY)를 추종하며, 글로벌 리스크 오프 환경에서 달러 강세에 베팅하는 수단이다. 관세전쟁으로 인한 글로벌 교역 위축과 안전자산 선호 현상이 달러 강세를 지지하고 있다. 한국 투자자의 경우 원화 자산 비중이 높으므로, UUP 편입을 통해 원화 약세 리스크를 헤지할 수 있다. 다만 트럼프 행정부가 달러 약세를 원하는 모순적 상황이 존재하여, 재무부의 구두 개입 리스크에 주의해야 한다.",
    riskLevel: "보통",
    expectedReturn: "+2~8%",
    entryTiming: "DXY 103 이하 약세 구간에서 매수. 글로벌 리스크 이벤트(관세 발동, 지정학 충돌) 직전 선제 진입. 원/달러 1,350원 이상 상승 추세 확인 시.",
    exitTiming: "DXY 108 이상 강세 과열 시 차익 실현. 연준 금리 인하 시작 시 비중 축소. 미중 무역 합의로 리스크 온 전환 시 매도.",
    dangerSignals: [
      "트럼프 행정부 달러 약세 정책 공식 발표",
      "연준 대규모 금리 인하(50bp 이상)",
      "플라자 합의 2.0 논의 부상",
      "미국 쌍둥이 적자 급증으로 달러 신뢰 하락",
    ],
    currentWeight: 4,
  },
  {
    ticker: "VIXY",
    name: "ProShares VIX Short-Term Futures ETF",
    nameKr: "변동성 헤지 ETF",
    category: "헤지형",
    region: "미국",
    relatedIssueIds: ["global-recession-risk", "us-tariff-war", "us-china-taiwan"],
    rationale:
      "VIX 단기 선물을 추종하며, 시장 변동성 급등에 베팅하는 ETF이다. 관세전쟁·대만 리스크·경기침체 등 '테일 리스크' 이벤트 발생 시 VIX가 급등하면서 큰 수익을 제공한다. 그러나 콘탱고(선물 프리미엄) 구조로 인해 장기 보유 시 지속적 가치 감소가 발생하므로, 반드시 이벤트 기반 단기 매매로만 활용해야 한다. 포트폴리오 보험 성격으로 1~2% 극소량만 편입하며, 특정 이벤트(3월 15일 관세 발동 등) 직전에만 보유한다.",
    riskLevel: "매우높음",
    expectedReturn: "-30~+80%",
    entryTiming: "VIX 15 이하 극저변동성 구간에서 소량 매수. 주요 리스크 이벤트(관세 발동, FOMC, 지정학 충돌) D-5일 전 진입. 현재 VIX 22 수준에서는 소량만 보유.",
    exitTiming: "VIX 35 이상 급등 시 즉시 전량 매도. 이벤트 통과 후 24시간 이내 청산. 최대 보유 기간 2주 엄수.",
    dangerSignals: [
      "콘탱고 구조 심화로 일일 감가 가속",
      "VIX 스파이크 없이 장기 보유 시 원금 대부분 소실",
      "시장 저변동성 장기화",
    ],
    currentWeight: 1,
  },
  {
    ticker: "DBA",
    name: "Invesco DB Agriculture Fund",
    nameKr: "농산물 ETF",
    category: "헤지형",
    region: "글로벌",
    relatedIssueIds: ["us-tariff-war", "global-recession-risk"],
    rationale:
      "옥수수·대두·밀·설탕·커피 등 주요 농산물 선물에 분산 투자하는 ETF이다. 관세전쟁으로 인한 글로벌 식량 공급망 교란과 기후변화에 따른 작황 불안이 농산물 가격 상승 요인으로 작용하고 있다. 인플레이션 헤지 수단으로 기능하며, 특히 스태그플레이션 시나리오에서 주식·채권과 낮은 상관관계를 보여 포트폴리오 분산 효과가 크다. 중국의 미국산 농산물 보복 관세가 글로벌 농산물 교역 구조를 왜곡시키고 있어 가격 변동성이 확대되고 있다.",
    riskLevel: "보통",
    expectedReturn: "+3~12%",
    entryTiming: "CPI 식료품 항목 상승세 확인 시 매수. 기후 이상(엘니뇨·라니냐) 발생 확인 시 비중 확대. 농산물 선물 200일 이동평균선 돌파 시.",
    exitTiming: "글로벌 곡물 작황 호조 확인 시 비중 축소. 관세 완화로 농산물 교역 정상화 시 매도. 농산물 가격 연중 고점 대비 15% 이상 상승 시 차익 실현.",
    dangerSignals: [
      "글로벌 곡물 대풍작 예보",
      "관세 협상으로 농산물 교역 정상화",
      "경기침체로 수요 급감",
      "달러 강세 지속(원자재 가격 하락 압력)",
    ],
    currentWeight: 3,
  },
  {
    ticker: "PDBC",
    name: "Invesco Optimum Yield Diversified Commodity Strategy",
    nameKr: "분산 원자재 ETF",
    category: "헤지형",
    region: "글로벌",
    relatedIssueIds: ["us-tariff-war", "global-recession-risk", "israel-iran"],
    rationale:
      "에너지·금속·농산물 등 14개 원자재 선물에 분산 투자하는 종합 원자재 ETF이다. 관세전쟁으로 인한 공급망 교란, 중동 지정학적 리스크(이란·이스라엘), 에너지 가격 변동성 확대 등이 원자재 가격 상승을 지지하고 있다. 인플레이션 환경에서 실물 자산의 가치 보존 기능이 강하며, 주식·채권과의 낮은 상관관계로 포트폴리오 분산 효과가 탁월하다. K-1 세금 서류 없이 편리하게 원자재 투자가 가능한 구조(ETF)이다.",
    riskLevel: "보통",
    expectedReturn: "+2~15%",
    entryTiming: "유가 WTI $65 이하 또는 원자재 종합 지수 200일선 근접 시 매수. 중동 지정학적 긴장 고조 시 에너지 비중 확대.",
    exitTiming: "원자재 가격 전반적 과열(CRB 지수 사상 최고치) 시 차익 실현. 글로벌 경기침체 본격화로 수요 급감 시 비중 축소.",
    dangerSignals: [
      "글로벌 경기침체로 원자재 수요 급감",
      "달러 초강세(DXY 112 이상)",
      "원유 공급 과잉(OPEC+ 감산 해제)",
      "중국 경기 부양 실패로 금속 수요 급감",
    ],
    currentWeight: 4,
  },

  // ── 한국 투자자 특화 ──────────────────────────────────────────────────────
  {
    ticker: "360750.KS",
    name: "TIGER 미국S&P500",
    nameKr: "타이거 미국 S&P500 ETF",
    category: "공격형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk", "us-tariff-war"],
    rationale:
      "한국 원화로 미국 S&P500 지수에 투자할 수 있는 국내 상장 ETF이다. 환헤지가 되어 있지 않아 원화 약세 시 추가 환차익을 얻을 수 있으며, 반대로 원화 강세 시 환손실이 발생한다. 현재 원/달러 1,380원 수준에서 원화 약세 추세가 지속되고 있어, 원화 자산만 보유한 한국 투자자에게 달러 자산 분산 효과를 제공한다. 한국 증권사 계좌에서 간편하게 매매 가능하며, 연금저축·IRP 등 절세 계좌에서도 투자할 수 있는 점이 큰 장점이다. ISA 계좌 활용 시 비과세 혜택도 누릴 수 있다.",
    riskLevel: "보통",
    expectedReturn: "+3~15%",
    entryTiming: "S&P500 5% 이상 조정 + 원/달러 1,350원 이상 동시 충족 시 적극 매수. 연금저축 월 적립식 매수 권장.",
    exitTiming: "S&P500 사상 최고치 + 원/달러 1,280원 이하 동시 충족 시 비중 축소. 연금 계좌는 장기 보유 원칙.",
    dangerSignals: [
      "원/달러 환율 급락(원화 강세 전환) 시 환손실",
      "S&P500 20% 이상 폭락(베어마켓 진입)",
      "한국 자본시장 규제 변화(해외 ETF 과세 강화)",
    ],
    currentWeight: 7,
  },
  {
    ticker: "069500.KS",
    name: "KODEX 200",
    nameKr: "코덱스 코스피200 ETF",
    category: "공격형",
    region: "한국",
    relatedIssueIds: ["korea-economy", "us-tariff-war", "us-china-trade"],
    rationale:
      "코스피200 지수를 추종하는 한국 대표 ETF로, 삼성전자·SK하이닉스·현대차·LG에너지솔루션 등 한국 대형주에 집중 투자한다. 2026년 3월 현재 코스피는 관세전쟁 직격탄, 원화 약세, 내수 부진으로 2,400선에서 횡보하며 글로벌 대비 심각한 저평가 구간에 있다. '코리아 디스카운트' 해소 노력(밸류업 프로그램)이 진행 중이나 가시적 성과는 제한적이다. 반도체 사이클 회복과 관세 완화가 동시에 이뤄져야 의미 있는 상승이 가능하다. 역발상 투자자에게 기회가 될 수 있으나 단기적으로는 하방 리스크가 크다.",
    riskLevel: "높음",
    expectedReturn: "-10~+20%",
    entryTiming: "코스피 2,300 이하 또는 코스피200 PBR 0.8배 이하 시 분할 매수. 외국인 순매수 전환 확인 후 비중 확대.",
    exitTiming: "코스피 2,700 이상 회복 시 부분 차익 실현. 원/달러 1,250원 이하 원화 강세 시 비중 축소(달러 자산 전환).",
    dangerSignals: [
      "삼성전자 실적 쇼크 및 배당 삭감",
      "한국 수출 적자 전환",
      "코스피 2,200 이탈",
      "한국 국가 신용등급 하향",
      "가계부채 위기 현실화",
    ],
    currentWeight: 5,
  },
  {
    ticker: "133690.KS",
    name: "TIGER 미국나스닥100",
    nameKr: "타이거 미국 나스닥100 ETF",
    category: "공격형",
    region: "미국",
    relatedIssueIds: ["us-fed-rates", "global-ai-governance", "us-china-trade"],
    rationale:
      "한국 원화로 미국 나스닥100 지수에 투자하는 국내 상장 ETF이다. QQQ와 동일한 지수를 추종하되 한국 증권 계좌에서 편리하게 매매 가능하다. 연금저축·IRP 계좌에서 투자 시 세제 혜택이 크며, 장기 적립식 투자에 적합하다. AI 성장 테마에 대한 장기 베팅과 달러 자산 분산을 동시에 달성할 수 있다. 다만 환헤지 미적용으로 원화 강세 전환 시 수익률이 제한된다.",
    riskLevel: "높음",
    expectedReturn: "-8~+22%",
    entryTiming: "나스닥100 10% 조정 시 분할 매수. 연금저축 계좌 월 적립식 매수 전략 권장. 원/달러 1,380원 이상 시 환차익 기대로 적극 매수.",
    exitTiming: "나스닥100 PER 35배 이상 과열 시 비중 축소. 원/달러 1,250원 이하 시 환율 고려 부분 매도.",
    dangerSignals: [
      "빅테크 실적 연속 미스",
      "연준 금리 인상 재개",
      "원화 급격 강세(환손실)",
      "AI 버블 붕괴 우려 확산",
    ],
    currentWeight: 5,
  },
  {
    ticker: "132030.KS",
    name: "KODEX 골드선물(H)",
    nameKr: "코덱스 금 선물 ETF (환헤지)",
    category: "방어형",
    region: "글로벌",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk", "us-tariff-war"],
    rationale:
      "금 선물에 투자하면서 환헤지가 적용되어 원/달러 환율 변동에 따른 리스크를 제거한 ETF이다. GLD와 동일한 금 가격 노출을 한국 원화 계좌에서 제공하되, 환율 변동 영향을 최소화한다. 연금저축·IRP 계좌에서 금 투자 시 이 ETF가 가장 적합하며, 세제 혜택을 극대화할 수 있다. 관세전쟁·경기침체 리스크에 대한 방어 자산으로 원화 기준 안정적인 금 가격 노출을 제공한다.",
    riskLevel: "낮음",
    expectedReturn: "+6~15%",
    entryTiming: "금 가격 $2,700 이하 조정 시 분할 매수. 연금저축 계좌 비중 10~15% 목표로 적립식 매수.",
    exitTiming: "금 가격 $3,200 이상 시 비중 축소. 환헤지 비용 급증(한미 금리차 확대) 시 GLD 직접 투자로 전환 검토.",
    dangerSignals: [
      "환헤지 비용 연 3% 이상 급증",
      "금 가격 급락(달러 초강세, 실질금리 급등)",
      "금 ETF 글로벌 자금 유출",
    ],
    currentWeight: 5,
  },
  {
    ticker: "272580.KS",
    name: "TIGER 단기채권액티브",
    nameKr: "타이거 단기채권 ETF",
    category: "방어형",
    region: "한국",
    relatedIssueIds: ["korea-economy", "us-fed-rates"],
    rationale:
      "한국 단기 국공채에 투자하는 초저위험 ETF로, 현금성 자산 대용으로 활용한다. 연 3.0~3.5% 수준의 안정적 수익을 제공하며, 시장 급변 시에도 가격 변동이 극히 제한적이다. 관세전쟁·경기침체 등 고불확실성 환경에서 포트폴리오의 '방탄조끼' 역할을 하며, 매수 기회 포착 시 즉시 투입 가능한 대기 자금으로 활용한다. MMF 대비 약간 높은 수익률을 제공하면서 유동성도 충분하다.",
    riskLevel: "낮음",
    expectedReturn: "+2.5~3.5%",
    entryTiming: "시장 불확실성 극대화 시 비중 확대. 주식 비중 축소 시 대기 자금 파킹 용도로 즉시 매수.",
    exitTiming: "시장 바닥 확인 후 위험자산으로 전환 시 비중 축소. 특별한 매도 시점 없이 유동성 필요 시 수시 활용.",
    dangerSignals: [
      "한국은행 기준금리 급락 시 수익률 하락",
      "한국 신용 리스크 급등(극단적 시나리오)",
    ],
    currentWeight: 8,
  },
  {
    ticker: "261240.KS",
    name: "KODEX 미국달러선물",
    nameKr: "코덱스 달러선물 ETF",
    category: "헤지형",
    region: "글로벌",
    relatedIssueIds: ["us-fed-rates", "korea-economy", "us-tariff-war"],
    rationale:
      "원/달러 환율 상승(원화 약세)에 베팅하는 ETF로, 원화 자산이 대부분인 한국 투자자에게 필수적인 환율 헤지 수단이다. 관세전쟁 확대, 한국 경제 둔화, 글로벌 리스크 오프 환경에서 원화 약세가 지속되면 수익을 제공한다. 원화 기준 포트폴리오의 환율 리스크를 직접적으로 헤지할 수 있으며, 주식·채권과의 낮은 상관관계로 분산 효과가 크다. 한국 투자자가 해외 ETF를 직접 매수하기 어려운 경우 달러 노출 확보 수단으로도 활용 가능하다.",
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
    currentWeight: 4,
  },
];

// ─── 투자 시나리오 ───────────────────────────────────────────────────────────

export const investmentScenarios: InvestmentScenario[] = [
  {
    id: "base-case",
    name: "기본 시나리오: 관세 지속 + 연준 동결 + 저성장",
    probability: 40,
    description:
      "트럼프 관세가 현 수준(중국 60%, EU 25%, 전 세계 10%)에서 유지되고, 연준은 인플레이션과 경기둔화 사이에서 금리를 동결한다. 글로벌 경제는 1.5~2.0% 저성장을 지속하며, 시장은 높은 변동성 속에 횡보한다. 기업 실적은 관세 부담으로 소폭 하향 조정되나, AI 투자 사이클이 일부 상쇄한다.",
    marketImpact:
      "S&P500 -5%~+8% 횡보. 변동성 확대(VIX 20~30 레인지). 달러 강보합. 금 가격 완만한 상승 지속. 코스피 2,300~2,600 박스권.",
    strategy:
      "방어형 자산(금·배당주·국채) 중심으로 포트폴리오를 구성하고, 공격형 자산은 급락 시에만 선별적으로 매수한다. 현금 비중 15~20% 유지하며 기회 포착에 대비한다.",
    etfAllocation: [
      { ticker: "GLD", weight: 15, action: "보유" },
      { ticker: "TLT", weight: 10, action: "보유" },
      { ticker: "SCHD", weight: 10, action: "보유" },
      { ticker: "VIG", weight: 5, action: "보유" },
      { ticker: "IEF", weight: 5, action: "보유" },
      { ticker: "SMH", weight: 5, action: "비중축소" },
      { ticker: "QQQ", weight: 5, action: "비중축소" },
      { ticker: "UUP", weight: 4, action: "보유" },
      { ticker: "DBA", weight: 3, action: "보유" },
      { ticker: "PDBC", weight: 4, action: "보유" },
      { ticker: "SH", weight: 3, action: "보유" },
      { ticker: "360750.KS", weight: 7, action: "보유" },
      { ticker: "069500.KS", weight: 5, action: "비중축소" },
      { ticker: "272580.KS", weight: 8, action: "보유" },
      { ticker: "132030.KS", weight: 5, action: "보유" },
      { ticker: "261240.KS", weight: 4, action: "보유" },
    ],
    keyTriggers: [
      "연준 FOMC에서 금리 동결 지속 결정",
      "관세 협상 교착 상태 지속",
      "미국 GDP 성장률 1.5~2.0% 유지",
      "CPI 2.8~3.5% 구간 유지",
      "실업률 4.0~4.5% 소폭 상승",
    ],
    timeline: "2026년 3월 ~ 9월 (6개월)",
  },
  {
    id: "risk-off",
    name: "리스크 오프: 관세 확대 + 경기침체 + 시장 급락",
    probability: 25,
    description:
      "트럼프가 관세를 추가 확대(전 세계 20% 이상, 중국 80%)하고, 보복 관세 사이클이 전면화되면서 글로벌 경기침체에 진입한다. 미국 GDP 성장률 마이너스 전환, 실업률 5% 이상 상승, S&P500 20% 이상 폭락한다. 연준이 긴급 금리 인하에 나서지만 관세발 인플레이션으로 정책 여력이 제한된다.",
    marketImpact:
      "S&P500 -20~-30% 급락. VIX 40 이상 급등. 달러 혼조(안전자산 수요 vs 경기침체). 금 가격 급등($3,000 이상). 코스피 2,000 이탈 위험. 원/달러 1,450원 이상.",
    strategy:
      "방어형·헤지형 자산 비중을 극대화하고 공격형 자산을 전량 매도한다. 현금 비중 30% 이상으로 확대하며, 인버스·변동성 ETF로 하방 리스크를 헤지한다. 바닥 확인 후 단계적 재진입을 준비한다.",
    etfAllocation: [
      { ticker: "GLD", weight: 20, action: "비중확대" },
      { ticker: "TLT", weight: 15, action: "비중확대" },
      { ticker: "IEF", weight: 8, action: "비중확대" },
      { ticker: "SH", weight: 8, action: "비중확대" },
      { ticker: "VIXY", weight: 3, action: "비중확대" },
      { ticker: "UUP", weight: 5, action: "비중확대" },
      { ticker: "272580.KS", weight: 15, action: "비중확대" },
      { ticker: "132030.KS", weight: 8, action: "비중확대" },
      { ticker: "261240.KS", weight: 6, action: "비중확대" },
      { ticker: "SMH", weight: 0, action: "매도" },
      { ticker: "QQQ", weight: 0, action: "매도" },
      { ticker: "ARKK", weight: 0, action: "매도" },
      { ticker: "EWY", weight: 0, action: "매도" },
      { ticker: "069500.KS", weight: 0, action: "매도" },
    ],
    keyTriggers: [
      "트럼프, 전 세계 관세 20% 이상으로 추가 인상 발표",
      "미국 GDP 2분기 연속 마이너스 성장(기술적 침체)",
      "실업률 5% 돌파",
      "S&P500 200일 이동평균선 이탈 후 반등 실패",
      "하이일드 스프레드 500bp 이상 확대",
      "은행 부문 대출 연체율 급증",
    ],
    timeline: "2026년 하반기 ~ 2027년 상반기",
  },
  {
    id: "soft-landing",
    name: "연착륙: 관세 부분 타협 + 경기 회복",
    probability: 20,
    description:
      "미중·미EU 양자 협상이 부분 타결되면서 관세가 일부 인하된다. 연준이 점진적 금리 인하(25bp x 2~3회)를 시작하고, 글로벌 경기가 2.5% 이상 회복한다. 기업 실적이 개선되며 시장이 반등한다. AI 투자 사이클 2단계가 시작되며 기술주가 주도한다.",
    marketImpact:
      "S&P500 +15~+25% 상승. VIX 15 이하 안정. 달러 약보합. 금 가격 횡보~소폭 하락. 코스피 2,700~3,000 회복. 원/달러 1,280~1,320원.",
    strategy:
      "공격형 자산 비중을 대폭 확대하고 방어형·헤지형 자산을 축소한다. 반도체·기술주 중심으로 포트폴리오를 재구성하며, 한국 주식 비중도 확대한다.",
    etfAllocation: [
      { ticker: "SMH", weight: 12, action: "비중확대" },
      { ticker: "SOXX", weight: 8, action: "비중확대" },
      { ticker: "QQQ", weight: 15, action: "비중확대" },
      { ticker: "ARKK", weight: 5, action: "비중확대" },
      { ticker: "EWY", weight: 8, action: "비중확대" },
      { ticker: "069500.KS", weight: 10, action: "비중확대" },
      { ticker: "133690.KS", weight: 10, action: "비중확대" },
      { ticker: "360750.KS", weight: 10, action: "비중확대" },
      { ticker: "GLD", weight: 8, action: "비중축소" },
      { ticker: "TLT", weight: 5, action: "비중축소" },
      { ticker: "SCHD", weight: 5, action: "비중축소" },
      { ticker: "SH", weight: 0, action: "매도" },
      { ticker: "VIXY", weight: 0, action: "매도" },
      { ticker: "UUP", weight: 0, action: "매도" },
    ],
    keyTriggers: [
      "미중 관세 부분 인하 합의 발표",
      "연준 25bp 금리 인하 시작",
      "ISM 제조업 PMI 52 이상 회복",
      "실업률 하락 전환 확인",
      "기업 실적 가이던스 상향 조정",
      "빅테크 AI CAPEX 확대 발표",
    ],
    timeline: "2026년 하반기 ~ 2027년",
  },
  {
    id: "stagflation",
    name: "스태그플레이션: 고물가 + 저성장 동시",
    probability: 15,
    description:
      "관세가 인플레이션을 재점화(CPI 4% 이상)하는 동시에 경기는 둔화되는 최악의 조합이 현실화된다. 연준은 인플레이션 억제와 경기 부양 사이에서 정책 딜레마에 빠지며 시장 신뢰를 상실한다. 1970년대식 스태그플레이션 공포가 확산되며 주식·채권이 동시에 하락한다.",
    marketImpact:
      "S&P500 -15~-25%. 국채 금리 상승(채권 가격 하락). 금 가격 폭등($3,200 이상). 원자재 가격 급등. 코스피 2,100 이하. 원/달러 1,420원 이상.",
    strategy:
      "실물 자산(금·원자재)으로 포트폴리오를 대폭 전환한다. 채권은 장기물 회피, 초단기물만 보유한다. 주식은 에너지·필수소비재 등 인플레이션 수혜 섹터만 선별 보유한다.",
    etfAllocation: [
      { ticker: "GLD", weight: 25, action: "비중확대" },
      { ticker: "DBA", weight: 8, action: "비중확대" },
      { ticker: "PDBC", weight: 10, action: "비중확대" },
      { ticker: "272580.KS", weight: 15, action: "비중확대" },
      { ticker: "132030.KS", weight: 10, action: "비중확대" },
      { ticker: "261240.KS", weight: 7, action: "비중확대" },
      { ticker: "SCHD", weight: 5, action: "비중축소" },
      { ticker: "IEF", weight: 3, action: "비중축소" },
      { ticker: "UUP", weight: 5, action: "보유" },
      { ticker: "TLT", weight: 0, action: "매도" },
      { ticker: "QQQ", weight: 0, action: "매도" },
      { ticker: "SMH", weight: 0, action: "매도" },
      { ticker: "ARKK", weight: 0, action: "매도" },
      { ticker: "EWY", weight: 0, action: "매도" },
      { ticker: "069500.KS", weight: 0, action: "매도" },
    ],
    keyTriggers: [
      "CPI 4% 이상 3개월 연속 + GDP 1% 이하 동시 충족",
      "연준 위원 과반 스태그플레이션 공식 인정",
      "10년물 국채 금리 5% 돌파",
      "기대인플레이션(BEI) 3.5% 이상",
      "원유 가격 $100 이상 + 경기 둔화 동시 진행",
      "식료품·에너지 가격 동시 급등",
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
      "트럼프 행정부가 3월 15일 전 세계 수입품에 대한 10% 기본 관세 발동을 최종 확인했다. EU·캐나다와의 마지막 협상이 결렬되어 예외 없이 시행될 전망이다. 이는 기존 중국 60%, EU 25% 관세에 추가되는 것으로, 글로벌 교역에 즉각적 충격을 줄 수 있다.",
    severity: "위험",
    relatedIssueIds: ["us-tariff-war", "global-recession-risk"],
    impactedETFs: [
      { ticker: "QQQ", impact: "수입 부품 비용 상승으로 빅테크 마진 압박, -3~-8% 하락 가능" },
      { ticker: "EWY", impact: "한국 수출 기업 직격탄, -5~-10% 하락 위험" },
      { ticker: "SMH", impact: "반도체 공급망 비용 증가, -5~-12% 변동성 확대" },
      { ticker: "GLD", impact: "안전자산 수요 급증으로 +3~+5% 상승 기대" },
      { ticker: "069500.KS", impact: "관세 직격탄으로 코스피 2,300 이탈 위험" },
    ],
    actionRequired: "공격형 ETF 비중을 20% 이하로 축소하고, GLD·TLT 등 방어형 비중을 50% 이상으로 확대. SH 인버스 3~5% 헤지 포지션 구축. 3월 15일 전후 1주간 신규 매수 자제.",
    probability: 90,
  },
  {
    id: "alert-china-retaliation",
    title: "중국 희토류 수출 전면 허가제 — 반도체 공급망 위기",
    description:
      "중국 상무부가 17개 희토류 전품목을 수출 허가제로 전환했다. 이는 반도체·전기차·방산 등 첨단산업의 핵심 소재 공급을 직접 위협한다. 미국 관세에 대한 중국의 가장 강력한 보복 수단으로, 글로벌 공급망 교란이 수개월간 지속될 수 있다.",
    severity: "경계",
    relatedIssueIds: ["us-tariff-war", "us-china-trade"],
    impactedETFs: [
      { ticker: "SMH", impact: "희토류 공급 차질로 반도체 생산 비용 급증, -8~-15% 하락 위험" },
      { ticker: "SOXX", impact: "미국 반도체 기업 생산 차질, -5~-12% 하락 가능" },
      { ticker: "EWY", impact: "삼성·SK 희토류 조달 리스크, -7~-12% 하락 위험" },
      { ticker: "DBA", impact: "중국 농산물 보복 관세 연장으로 +2~5% 상승" },
    ],
    actionRequired: "SMH·SOXX 합산 비중 8% 이하로 축소. 희토류 대체 소재·리사이클링 관련 개별주 모니터링. 중국 수출 허가 실제 거부 사례 발생 여부 주시.",
    probability: 75,
  },
  {
    id: "alert-fed-dilemma",
    title: "연준 정책 딜레마 — 인플레이션 vs 경기둔화 동시 악화",
    description:
      "연준이 관세발 인플레이션(CPI 3.2% → 3.8% 상승 추세)과 경기둔화(GDP 성장률 1.8% → 1.3% 하락 추세)라는 상충되는 두 문제에 직면해 있다. 금리를 올리면 경기침체, 내리면 인플레이션 폭발이라는 딜레마 상황이다. 연준의 신뢰도 하락은 시장 변동성 극대화의 핵심 리스크이다.",
    severity: "경계",
    relatedIssueIds: ["us-fed-rates", "global-recession-risk"],
    impactedETFs: [
      { ticker: "TLT", impact: "금리 방향 불확실성으로 ±5~10% 변동성 확대" },
      { ticker: "QQQ", impact: "금리 인상 재개 시 -10~-15% 급락 가능" },
      { ticker: "GLD", impact: "정책 불확실성으로 +5~10% 추가 상승 여력" },
      { ticker: "VIXY", impact: "변동성 급등 시 +30~50% 단기 수익 가능" },
    ],
    actionRequired: "FOMC 회의(3월 18~19일) 전후 포지션 축소. 금리 민감 자산(TLT·QQQ) 비중 합산 15% 이하 유지. 옵션 전략으로 양방향 변동성 대비.",
    probability: 70,
  },
  {
    id: "alert-korea-won-crisis",
    title: "원/달러 1,400원 돌파 임박 — 원화 약세 가속",
    description:
      "관세전쟁 확대, 한국 수출 둔화, 글로벌 리스크 오프 환경에서 원/달러 환율이 1,380원을 돌파하며 1,400원 저항선에 근접하고 있다. 1,400원 돌파 시 심리적 마지노선 붕괴로 외국인 자금 이탈이 가속될 수 있다. 한국은행의 외환시장 개입 여력도 제한적인 상황이다.",
    severity: "주의",
    relatedIssueIds: ["korea-economy", "us-tariff-war"],
    impactedETFs: [
      { ticker: "069500.KS", impact: "외국인 매도 가속으로 코스피 추가 하락, -5~-8%" },
      { ticker: "EWY", impact: "원화 약세로 달러 기준 추가 손실, -3~-7%" },
      { ticker: "261240.KS", impact: "달러 강세 수혜로 +2~4% 상승" },
      { ticker: "360750.KS", impact: "환노출형이므로 원화 기준 +2~5% 추가 수익" },
    ],
    actionRequired: "원화 기준 해외 ETF(TIGER S&P500, 나스닥100) 비중 확대로 자연스러운 달러 헤지. KODEX 달러선물 4~6% 편입. 코스피 신규 매수 보류, 원/달러 1,400원 안정 확인 후 재진입.",
    probability: 65,
  },
  {
    id: "alert-taiwan-military",
    title: "대만해협 군사 긴장 고조 — 지정학적 블랙스완 리스크",
    description:
      "중국이 2026년 국방예산을 7.2% 증가시키며 대만 작전 역량 강화를 명시했다. 미 항모전단의 대만해협 순찰과 중국 군사훈련이 빈번해지며 우발적 충돌 리스크가 상승하고 있다. 실제 군사 충돌 확률은 낮으나, 반도체 공급망(TSMC)에 대한 시장의 공포가 증폭되고 있다.",
    severity: "주의",
    relatedIssueIds: ["us-china-taiwan", "us-china-trade"],
    impactedETFs: [
      { ticker: "SMH", impact: "TSMC 리스크 프리미엄 확대로 -10~-20% 급락 가능" },
      { ticker: "SOXX", impact: "반도체 공급망 공포로 -8~-15% 하락" },
      { ticker: "EWY", impact: "아시아 지정학 리스크로 -10~-18% 급락 가능" },
      { ticker: "GLD", impact: "안전자산 폭발적 수요로 +10~+15% 급등" },
      { ticker: "VIXY", impact: "VIX 40 이상 급등 시 +50~+100% 수익 가능" },
    ],
    actionRequired: "아시아 지역 ETF(EWY, KODEX200) 비중 합산 10% 이하로 제한. TSMC 비중 높은 SMH 대신 미국 내 생산 비중 높은 개별주 선호. GLD 비중 15% 이상 유지. VIXY 1~2% 보험 성격 보유.",
    probability: 15,
  },
  {
    id: "alert-credit-crunch",
    title: "미국 하이일드 스프레드 확대 — 신용경색 초기 신호",
    description:
      "관세 부담과 경기 둔화로 미국 기업 부도율이 상승 추세에 있으며, 하이일드 채권 스프레드가 400bp를 넘어서고 있다. 중소기업·레버리지론 시장에서 스트레스 신호가 감지되고 있다. 2008년이나 2020년 수준의 신용경색까지는 거리가 있으나, 추세적 악화가 우려된다.",
    severity: "주의",
    relatedIssueIds: ["global-recession-risk", "us-fed-rates"],
    impactedETFs: [
      { ticker: "QQQ", impact: "성장주 밸류에이션 재평가로 -8~-12% 하락 위험" },
      { ticker: "ARKK", impact: "고위험 혁신기업 자금조달 악화, -15~-25% 급락 가능" },
      { ticker: "TLT", impact: "안전자산 선호로 +5~+10% 상승 기대" },
      { ticker: "SCHD", impact: "우량 배당주 상대적 선호로 -2~+3% 방어" },
    ],
    actionRequired: "ARKK 등 고위험 성장주 ETF 전량 매도 검토. 투자등급 채권·배당주 중심으로 포트폴리오 품질 개선. 하이일드 스프레드 500bp 돌파 시 현금 비중 30% 이상 확대.",
    probability: 35,
  },
  {
    id: "alert-oil-spike",
    title: "중동 긴장 + 관세 — 유가 $90 돌파 리스크",
    description:
      "이스라엘-이란 긴장이 재고조되는 가운데, 관세전쟁으로 인한 에너지 공급망 교란이 겹치면서 유가 상승 압력이 커지고 있다. WTI 기준 $85를 돌파했으며, 호르무즈 해협 통행 리스크가 부각되면 $90~100까지 상승 가능하다. 유가 급등은 인플레이션 재가속과 소비 위축을 동시에 유발하는 스태그플레이션 촉매제이다.",
    severity: "경계",
    relatedIssueIds: ["israel-iran", "us-tariff-war", "global-recession-risk"],
    impactedETFs: [
      { ticker: "PDBC", impact: "에너지 비중 높아 +5~+12% 수혜" },
      { ticker: "DBA", impact: "비료·운송 비용 상승으로 농산물 가격 동반 상승, +3~+8%" },
      { ticker: "QQQ", impact: "소비 위축·마진 압박으로 -5~-10% 하락" },
      { ticker: "069500.KS", impact: "에너지 순수입국 한국 직격탄, -5~-10% 하락" },
      { ticker: "GLD", impact: "인플레이션 헤지 수요로 +3~+8% 상승" },
    ],
    actionRequired: "PDBC·DBA 등 원자재 ETF 합산 7~10% 편입. 에너지 순수입국(한국·일본) ETF 비중 축소. 유가 $95 돌파 시 스태그플레이션 시나리오 포트폴리오로 전환 준비.",
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
    description: "공포 극대화 구간에서의 역발상 매수 기회. 현재 VIX 22, S&P500 조정폭 -4% 수준으로 아직 미충족. VIX 30 이상에서 SCHD·VIG 등 방어형 우량주 분할 매수 시작.",
  },
  {
    id: "ts-yield-curve",
    type: "진입",
    condition: "장단기 금리차(10년-2년) 역전 해소 후 정상화 전환",
    indicator: "미국 10년-2년 국채 금리차",
    currentStatus: "근접",
    description: "장단기 금리차가 -0.05%에서 0%로 접근 중이며, 정상화 전환은 경기 침체 시작 신호일 수 있다. 금리차 양전환 시 TLT 비중 확대 검토. 역사적으로 역전 해소 후 6~12개월 내 경기침체 발생.",
  },
  {
    id: "ts-tariff-entry",
    type: "진입",
    condition: "관세 부분 타협 공식 발표 + S&P500 양봉 3일 연속",
    indicator: "관세 협상 뉴스 & S&P500 기술적 반등",
    currentStatus: "미충족",
    description: "미중 또는 미EU 관세 타협이 공식 발표되면 시장 반등의 강력한 촉매가 된다. 타협 뉴스 + 기술적 반등 확인 후 QQQ·SMH 비중 확대. 단, 구두 합의만으로는 매수하지 않고 공식 행정명령 서명 확인 필요.",
  },
  {
    id: "ts-fed-pivot",
    type: "진입",
    condition: "연준 금리 인하 시작(첫 25bp 인하 결정)",
    indicator: "FOMC 금리 결정",
    currentStatus: "미충족",
    description: "연준의 금리 인하 전환은 성장주·기술주의 강력한 상승 촉매이다. 첫 인하 결정 확인 후 QQQ·ARKK·133690.KS 비중 확대. 다만 '인하=경기침체 인정'일 수 있어 경기 지표 동시 점검 필수.",
  },
  {
    id: "ts-kospi-bottom",
    type: "진입",
    condition: "코스피 2,300 이탈 + 외국인 순매수 전환 + 원/달러 하락 반전",
    indicator: "코스피 지수 & 외국인 수급 & 환율",
    currentStatus: "미충족",
    description: "코스피의 바닥 확인을 위해 세 가지 조건 동시 충족을 요구한다. 현재 코스피 2,420, 외국인 순매도 지속, 원/달러 1,380원으로 미충족. 세 조건 동시 충족 시 069500.KS·EWY 적극 매수.",
  },
  {
    id: "ts-gold-exit",
    type: "청산",
    condition: "금 가격 $3,200 돌파 + RSI 75 이상 과매수",
    indicator: "금 현물 가격 & RSI",
    currentStatus: "미충족",
    description: "금 가격이 $2,800 수준에서 거래 중으로 $3,200 목표가까지 상승 여력이 있다. 목표가 도달 + 기술적 과매수 동시 충족 시 GLD·132030.KS 30% 부분 차익 실현. 나머지 70%는 장기 보유.",
  },
  {
    id: "ts-inverse-exit",
    type: "청산",
    condition: "VIX 40 이상 + S&P500 20% 이상 하락 도달",
    indicator: "VIX & S&P500 하락폭",
    currentStatus: "미충족",
    description: "인버스·변동성 ETF(SH, VIXY) 보유 시 VIX 40 이상 극공포 구간은 헤지 이익 실현 최적 시점이다. 과거 VIX 40 이상은 단기 바닥의 강력한 신호였으며, 이 구간에서 헤지를 풀고 위험자산으로 전환 시작.",
  },
  {
    id: "ts-rebalance-monthly",
    type: "비중조절",
    condition: "월말 기준 개별 ETF 비중이 목표 대비 ±5%p 이상 괴리",
    indicator: "포트폴리오 비중 괴리율",
    currentStatus: "충족",
    description: "월 1회 정기 리밸런싱 시점이다. 현재 GLD가 목표 15% 대비 17%로 소폭 초과, QQQ가 목표 5% 대비 3%로 소폭 미달 상태. ±5%p 이상 괴리 종목은 반드시 리밸런싱 실행.",
  },
  {
    id: "ts-stagflation-shift",
    type: "비중조절",
    condition: "CPI 4% 이상 + GDP 1% 이하 2개월 연속 동시 충족",
    indicator: "CPI & GDP 성장률",
    currentStatus: "미충족",
    description: "스태그플레이션 진입 확인 시 포트폴리오를 전면 재구성해야 한다. TLT 전량 매도, GLD·PDBC·DBA 합산 40% 이상으로 확대, 단기채(272580.KS) 20% 이상으로 확대. 현재 CPI 3.2%, GDP 1.8%로 미충족이나 추세적 악화 중.",
  },
  {
    id: "ts-dollar-hedge",
    type: "비중조절",
    condition: "원/달러 1,350원 이하 하락 시 달러 헤지 ETF 비중 축소",
    indicator: "원/달러 환율",
    currentStatus: "미충족",
    description: "원화 강세 전환(1,350원 이하) 확인 시 261240.KS(달러선물) 비중을 2% 이하로 축소하고, 원화 자산(069500.KS) 비중을 확대한다. 현재 1,380원으로 미충족. 원화 강세는 한국 경제 회복과 글로벌 리스크 완화를 의미하므로 공격적 포지션 전환 근거.",
  },
];

// ─── 유틸리티 함수 ───────────────────────────────────────────────────────────

/** 카테고리별 ETF 필터 */
export function getETFsByCategory(category: string): ETFRecommendation[] {
  return etfRecommendations.filter((etf) => etf.category === category);
}

/** 지역별 ETF 필터 */
export function getETFsByRegion(region: string): ETFRecommendation[] {
  return etfRecommendations.filter((etf) => etf.region === region);
}

/** 관련 이슈 ID로 ETF 검색 */
export function getETFsByIssue(issueId: string): ETFRecommendation[] {
  return etfRecommendations.filter((etf) =>
    etf.relatedIssueIds.includes(issueId),
  );
}

/** 현재 가장 높은 확률의 시나리오 반환 */
export function getCurrentScenario(): InvestmentScenario {
  return investmentScenarios.reduce((max, scenario) =>
    scenario.probability > max.probability ? scenario : max,
  );
}

/** 경계 이상 심각도의 활성 알림 반환 */
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

/** 카테고리별 포트폴리오 배분 요약 */
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
