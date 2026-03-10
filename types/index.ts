export type ExpertDomain =
  // ── 투자 핵심 도메인 ──
  | "금리통화정책"
  | "거시경제"
  | "한국경제"
  | "국제금융"
  | "주식시장"
  | "채권"
  | "외환"
  | "원자재"
  | "가상자산"
  | "AI기술"
  | "반도체"
  | "부동산"
  | "재정정책"
  | "에너지"
  | "헤지펀드"
  | "사모투자"
  // ── 지정학적 투자 리스크 ──
  | "경제안보"
  | "글로벌공급망"
  | "미중관계"
  | "한반도"
  | "지정학리스크"
  // ── 호환성 유지 (레거시) ──
  | "러우전쟁"
  | "중동"
  | "국제법"
  | "군사안보"
  | "핵비확산"
  | "대만해협";

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
 * ★ 과거 적중률이 55%로 압도적 — 맞춘 전문가의 의견이 가장 중요
 */
export interface ExpertRawScores {
  domainFitScore: number;      // 전문 적합성 (가중치 15%)
  accuracyScore: number;       // 과거 적중도 ★★★ (가중치 55%) — 압도적 핵심
  evidenceScore: number;       // 근거 품질 (가중치 12%)
  institutionScore: number;    // 기관 신뢰도 (가중치 5%)
  consistencyScore: number;    // 논리 일관성 (가중치 6%)
  recencyScore: number;        // 최신성 (가중치 4%)
  publicRatingScore: number;   // 대중 평가 (가중치 1%)
  biasScore: number;           // 편향 보정: 높을수록 편향 없음 (가중치 2%)
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
  supportingExperts?: string[];  // 해당 예측을 지지하는 전문가 ID 목록
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

// ─── 자산 예측 시스템 (투자자 중심 재구성) ──────────────────────────────────

export type AssetCategory = "금리" | "환율" | "원자재" | "지수" | "산업";

export type PredictionDirection = "상승" | "하락" | "보합" | "변동성확대";

export type PredictionTimeframe = "1주" | "1개월" | "3개월" | "6개월";

export interface Asset {
  id: string;
  name: string;
  nameEn: string;
  category: AssetCategory;
  unit: string;                          // "%", "원/달러", "달러/온스" 등
  currentValue: number;
  previousValue: number;
  changePercent: number;
  description: string;
  relatedFactorIds: string[];            // Factor와 연결
  relatedETFTickers?: string[];          // koreanETFs와 연결
  isActive: boolean;
  updatedAt: string;
}

export interface AssetPrediction {
  id: string;
  assetId: string;
  expertId: string;
  direction: PredictionDirection;
  confidence: number;                    // 0-100
  timeframe: PredictionTimeframe;
  targetRange?: { low: number; high: number };
  currentAtPrediction: number;           // 예측 시점 현재 가격
  rationale: string;
  keyAssumptions: string[];
  publishedAt: string;
  result?: "적중" | "부분적중" | "불일치" | "미결";
  actualOutcome?: string;
}

export interface HistoricalPattern {
  id: string;
  assetId: string;
  title: string;
  period: string;                        // "2022.03 - 2022.06"
  description: string;
  similarity: number;                    // 현재와 유사도 (0-100)
  outcome: string;                       // 당시 결과
  assetMovement: string;                 // 자산 실제 움직임
  keyDifferences: string[];              // 현재와 다른 점
}

export type FactorCategory = "정책" | "지정학" | "경제지표" | "시장심리" | "구조적변화";

export interface Factor {
  id: string;
  title: string;
  category: FactorCategory;
  summary: string;
  impactedAssetIds: string[];
  impactDirection: Record<string, AssetDirection>;    // assetId → 방향
  impactMagnitude: Record<string, ImpactMagnitude>;   // assetId → 강도
  probability: number;
  probTrend: "상승" | "하락" | "유지";
  relatedExpertIds: string[];
  signals: Signal[];
  timeline: TimelineEvent[];
  isActive: boolean;
  updatedAt: string;
  legacyIssueId?: string;               // 기존 Issue와 연결 (마이그레이션 브릿지)
}

// ─── 자산 컨센서스 결과 ─────────────────────────────────────────────────────

export interface AssetConsensusResult {
  assetId: string;
  direction: PredictionDirection;        // 가중 컨센서스 방향
  confidence: number;                    // 컨센서스 신뢰도 (0-100)
  bullCount: number;                     // 상승 예측 전문가 수
  bearCount: number;                     // 하락 예측 전문가 수
  neutralCount: number;                  // 보합 예측 전문가 수
  avgExpertCredibility: number;          // 참여 전문가 평균 신뢰도
  topPredictions: AssetPrediction[];     // 신뢰도 상위 예측들
}

export interface AssetAccuracy {
  assetId: string;
  assetName: string;
  predictions: number;
  correct: number;
  partial: number;
  incorrect: number;
  accuracyRate: number;
}

// ─── AI 예측 사이클 (3일 주기) ─────────────────────────────────────────────

export interface AICyclePrediction {
  id: string;
  assetId: string;
  direction: PredictionDirection;
  probability: number;            // 0-100 (AI 예측 확률)
  confidence: number;             // 0-100 (모델 확신도)
  targetRange?: { low: number; high: number };
  rationale: string;              // 예측 근거 요약
  keyEvidence: string[];          // 핵심 근거 목록
  sources: { title: string; url?: string; date: string }[];
  supportingExpertIds: string[];  // 이 예측을 지지하는 대표 전문가 (상위 노출용)
  opposingExpertIds: string[];    // 이 예측에 반대하는 대표 전문가 (상위 노출용)
  scenario: string;               // 시나리오 설명
  startPrice: number;             // 예측 시작 시점 자산 가격
  // ─── 전문가 참여 통계 (100K 풀 기반) ───
  expertStats?: {
    totalParticipants: number;    // 해당 자산에 의견을 낸 전문가 수
    bullCount: number;            // 상승 예측 전문가 수
    bearCount: number;            // 하락 예측 전문가 수
    neutralCount: number;         // 보합/변동성 예측 전문가 수
    avgAccuracyOfBull: number;    // 상승 예측 전문가들의 평균 과거 적중률
    avgAccuracyOfBear: number;    // 하락 예측 전문가들의 평균 과거 적중률
    avgAccuracyOfNeutral: number; // 보합 예측 전문가들의 평균 과거 적중률
    topAccuracyDirection: PredictionDirection; // 적중률 상위 전문가들이 가장 많이 택한 방향
    weightedProbability: number;  // 적중률 가중 확률 (이것이 최종 AI 확률의 핵심 근거)
  };
}

export interface AIPredictionCycle {
  id: string;
  cycleNumber: number;            // 사이클 번호
  startDate: string;              // 사이클 시작일
  endDate: string;                // 사이클 종료일 (3일 후)
  status: "active" | "evaluating" | "completed";
  predictions: AICyclePrediction[];
  createdAt: string;
}

export interface AICycleResult {
  cycleId: string;
  assetId: string;
  predictionId: string;
  predictedDirection: PredictionDirection;
  actualDirection?: PredictionDirection;
  predictedProbability: number;
  result: "적중" | "부분적중" | "불일치" | "미결";
  actualOutcome?: string;
  evaluatedAt?: string;
  newsEvidence?: string[];        // 적중/불일치 판단 근거 뉴스
}

export interface AICyclePerformance {
  totalCycles: number;
  totalPredictions: number;
  correct: number;
  partial: number;
  incorrect: number;
  pending: number;
  accuracyRate: number;
  recentCycles: {
    cycleId: string;
    startDate: string;
    endDate: string;
    accuracyRate: number;
    predictions: number;
  }[];
  byAsset: {
    assetId: string;
    assetName: string;
    predictions: number;
    correct: number;
    partial: number;
    incorrect: number;
    accuracyRate: number;
  }[];
}

export interface VerificationLog {
  id: string;
  timestamp: string;
  assetId: string;
  cycleId: string;
  predictionId: string;
  newsHeadline: string;
  newsSource: string;
  newsUrl?: string;
  relevance: "high" | "medium" | "low";
  impact: "supports" | "contradicts" | "neutral";
  summary: string;
}
