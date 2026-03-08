export type ExpertDomain =
  | "미중관계"
  | "러우전쟁"
  | "중동"
  | "국제법"
  | "에너지"
  | "군사안보"
  | "경제안보"
  | "핵비확산"
  | "한반도"
  | "대만해협"
  | "글로벌공급망"
  | "금리통화정책"
  | "거시경제"
  | "한국경제"
  | "국제금융"
  | "부동산"
  | "재정정책";

export type ExpertBackground =
  | "교수"
  | "연구원"
  | "전직외교관"
  | "군출신"
  | "애널리스트"
  | "싱크탱크"
  | "중앙은행"
  | "정부관료"
  | "펀드매니저"
  | "기관리서치";

export type PerspectiveLean =
  | "현실주의"
  | "자유주의"
  | "구성주의"
  | "안보중심"
  | "시장중심"
  | "매파"
  | "비둘기파"
  | "케인즈주의"
  | "통화주의";

export interface PredictionRecord {
  year: number;
  month?: number;
  issue: string;
  prediction: string;          // 한 줄 요약
  exactStatement: string;      // 구체적 예측 발언 (인용)
  actualOutcome: string;       // 실제 발생한 결과
  accuracyNote: string;        // 적중/불일치 분석
  outcome: "적중" | "불일치" | "부분적중" | "미결";
  source?: string;             // 예측 발언 출처
}

/**
 * 8축 신뢰도 원점수 (각 0-100)
 * 최종 credibilityScore는 lib/credibility.ts의 가중합으로 산출
 */
export interface ExpertRawScores {
  domainFitScore: number;      // 전문 적합성 (가중치 25%)
  accuracyScore: number;       // 과거 적중도 (가중치 20%)
  evidenceScore: number;       // 근거 품질 (가중치 20%)
  institutionScore: number;    // 기관 신뢰도 (가중치 10%)
  consistencyScore: number;    // 논리 일관성 (가중치 10%)
  recencyScore: number;        // 최신성 (가중치 5%)
  publicRatingScore: number;   // 대중 평가 (가중치 5%)
  biasScore: number;           // 편향 보정: 높을수록 편향 없음 (가중치 5%)
}

export interface Expert extends ExpertRawScores {
  id: string;
  name: string;
  nameEn: string;
  affiliation: string;
  country: string;
  domains: ExpertDomain[];
  background: ExpertBackground[];
  perspective: PerspectiveLean[];
  credibilityScore: number;    // 8축 가중합 (lib/credibility.ts로 산출)
  predictionHistory: PredictionRecord[];
  bio: string;
  recentView: string;
  keyKeywords: string[];
  twitterHandle?: string;
}

export type ScenarioType =
  | "확전"
  | "현상유지"
  | "외교타결"
  | "봉합"
  | "급변"
  | "디커플링"
  | "제한적충돌"
  | "대리전"
  | "전면전"
  | "조기중재"
  | "금리인상"
  | "금리인하"
  | "금리동결"
  | "경기침체"
  | "연착륙"
  | "스태그플레이션"
  | "경기회복"
  | "버블붕괴";

export interface Forecast {
  id: string;
  expertId: string;
  issueId: string;
  scenario: ScenarioType;
  probability: number;
  timeframe: string;
  rationale: string;
  counterRationale: string;
  keyAssumptions: string[];
  sources: { title: string; url?: string; date: string }[];
  publishedAt: string;
  updatedAt: string;
}

export type SignalType = "경고" | "긍정" | "중립";

export interface Signal {
  id: string;
  issueId: string;
  title: string;
  description: string;
  type: SignalType;
  date: string;
  source: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  significance: "high" | "medium" | "low";
}

export type AssetDirection = "강세" | "약세" | "중립" | "변동성확대";
export type ImpactMagnitude = "강" | "중" | "약";

export interface AssetImpact {
  direction: AssetDirection;
  magnitude: ImpactMagnitude;
  reasoning: string;
}

export interface InvestmentImpact {
  gold: AssetImpact;
  silver: AssetImpact;
  oil: AssetImpact;
  usdIndex: AssetImpact;
  usStocks: AssetImpact;
  emergingMarkets: AssetImpact;
  usTreasuries: AssetImpact;
  summary: string;
}

export interface Scenario {
  id: string;
  issueId: string;
  type: ScenarioType;
  title: string;
  description: string;
  probability: number;
  supportingExperts: string[];
  highCredibilityCount: number;
  keyEvidence: string[];
  counterEvidence: string[];
  triggers: string[];
  investmentImpact?: InvestmentImpact;
}

export interface Issue {
  id: string;
  title: string;
  summary: string;
  region: string;
  tags: string[];
  probability: number;          // 이슈 발생 확률 (0-100%)
  probTrend: "상승" | "하락" | "유지";
  isActive: boolean;
  relatedExpertIds: string[];
  createdAt: string;
  updatedAt: string;
  forecasts: Forecast[];
  signals: Signal[];
  timeline: TimelineEvent[];
  scenarios: Scenario[];
}

export interface RankingEntry {
  expertId: string;
  rank: number;
  category: string;
  score: number;
  change: number;
  reason: string;
}

// ─── 주간 예측 시스템 ─────────────────────────────────────────────────────

export interface WeeklyPrediction {
  id: string;
  issueId: string;
  scenario: string;            // 예측 시나리오
  probability: number;         // 확률 (0-100)
  prediction: string;          // AI 예측 요약
  rationale: string;           // 예측 근거
  result?: "적중" | "부분적중" | "불일치" | "미결";
  actualOutcome?: string;      // 실제 결과 (주간 종료 후 기입)
}

export interface WeeklyReport {
  id: string;
  year: number;
  weekNumber: number;          // 연간 주차
  weekStart: string;
  weekEnd: string;
  title: string;               // 주간 제목
  summary: string;             // 주간 요약
  accuracyRate: number;        // 적중률 (0-100)
  predictions: WeeklyPrediction[];
  topNews: WeeklyNewsItem[];
}

export interface WeeklyNewsItem {
  id: string;
  issueId?: string;            // 연관 이슈
  title: string;
  summary: string;
  date: string;                // 날짜
  source: string;
  significance: "high" | "medium" | "low";
}

// ─── AI 성적표 ────────────────────────────────────────────────────────────

export interface AIPredictionScore {
  totalPredictions: number;
  correct: number;             // 적중
  partiallyCorrect: number;    // 부분적중
  incorrect: number;           // 불일치
  pending: number;             // 미결
  accuracyRate: number;        // (적중 + 부분적중*0.5) / (전체 - 미결) * 100
  weeklyAccuracy: WeeklyAccuracy[];
  byIssue: IssueAccuracy[];
  streak: number;              // 연속 적중 횟수
  bestStreak: number;          // 최고 연속 적중
}

export interface WeeklyAccuracy {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  year: number;
  predictions: number;
  correct: number;
  partial: number;
  incorrect: number;
  accuracyRate: number;
}

export interface IssueAccuracy {
  issueId: string;
  issueTitle: string;
  predictions: number;
  correct: number;
  partial: number;
  incorrect: number;
  accuracyRate: number;
}
