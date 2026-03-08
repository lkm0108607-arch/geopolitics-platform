import type { Expert, ExpertRawScores } from "@/types";

/**
 * 8축 신뢰도 가중치 (합계 100)
 *
 * 설계 원칙:
 * 이 플랫폼의 핵심 목적은 "미래 시나리오를 얼마나 정확히 예측했는가"를 기반으로
 * 투자·경제 흐름 예측에 활용하는 것이다.
 *
 * 따라서:
 * - 과거 적중도가 30%로 최우선 (예측 정확도가 투자 판단의 핵심)
 * - 전문 적합성·근거 품질 각 20% (출처 있는 전망만 신뢰)
 * - 대중 평가는 2%로 최소화 (팔로워 수 ≠ 예측 정확도)
 */
export const SCORE_WEIGHTS: Record<keyof ExpertRawScores, number> = {
  accuracyScore: 30,       // 과거 적중도 ★ 최우선 — 투자 판단 핵심
  domainFitScore: 20,      // 전문 적합성
  evidenceScore: 20,       // 근거 품질
  consistencyScore: 10,    // 논리 일관성
  institutionScore: 8,     // 기관 신뢰도
  recencyScore: 5,         // 최신성
  biasScore: 5,            // 편향 보정
  publicRatingScore: 2,    // 대중 평가 (의도적 최소화)
};

export const SCORE_LABELS: Record<keyof ExpertRawScores, string> = {
  accuracyScore: "과거 적중도",
  domainFitScore: "전문 적합성",
  evidenceScore: "근거 품질",
  consistencyScore: "논리 일관성",
  institutionScore: "기관 신뢰도",
  recencyScore: "최신성",
  biasScore: "편향 보정",
  publicRatingScore: "대중 평가",
};

export const SCORE_DESCRIPTIONS: Record<keyof ExpertRawScores, string> = {
  accuracyScore: "실제 발생 결과와 전망의 부합 정도 — 투자·경제 예측 활용의 핵심 지표",
  domainFitScore: "해당 이슈와 얼마나 맞는 전공·경력인가",
  evidenceScore: "데이터·역사적 맥락·공식자료 인용 수준",
  consistencyScore: "말 바꾸기·과장 여부 — 일관된 분석 프레임 유지",
  institutionScore: "소속 기관의 공신력",
  recencyScore: "최근에도 꾸준히 분석하는가",
  biasScore: "특정 정치/이념 편향 없음 (높을수록 중립)",
  publicRatingScore: "대중 인지도 — 예측 정확도와 무관하므로 최소 반영",
};

/** 8축 가중합으로 종합 신뢰도 점수 산출 */
export function calculateCredibility(scores: ExpertRawScores): number {
  const weighted = (Object.keys(SCORE_WEIGHTS) as (keyof ExpertRawScores)[]).reduce(
    (sum, key) => sum + scores[key] * SCORE_WEIGHTS[key],
    0
  );
  return Math.round(weighted / 100);
}

/** 이슈별 전문 적합성 보정: 전문 분야 미일치 시 domainFit 40% 감산 */
export function calculateIssueCredibility(expert: Expert, issueDomains: string[]): number {
  const isDomainMatch = expert.domains.some((d) => issueDomains.includes(d));
  if (!isDomainMatch) {
    const adjusted: ExpertRawScores = { ...expert, domainFitScore: Math.round(expert.domainFitScore * 0.6) };
    return calculateCredibility(adjusted);
  }
  return expert.credibilityScore;
}

export interface ScoreBreakdownItem {
  key: keyof ExpertRawScores;
  label: string;
  description: string;
  weight: number;
  score: number;
  weighted: number;
  tier: "high" | "mid" | "low";
  isPrimary: boolean;  // 가중치 상위 3축 표시
}

/** 전문가 신뢰도 8축 상세 분해 (가중치 내림차순 정렬) */
export function getScoreBreakdown(expert: Expert): ScoreBreakdownItem[] {
  const sorted = (Object.keys(SCORE_WEIGHTS) as (keyof ExpertRawScores)[]).sort(
    (a, b) => SCORE_WEIGHTS[b] - SCORE_WEIGHTS[a]
  );
  return sorted.map((key) => {
    const score = expert[key];
    const weight = SCORE_WEIGHTS[key];
    const weighted = Math.round((score * weight) / 100);
    return {
      key,
      label: SCORE_LABELS[key],
      description: SCORE_DESCRIPTIONS[key],
      weight,
      score,
      weighted,
      tier: score >= 85 ? "high" : score >= 65 ? "mid" : "low",
      isPrimary: weight >= 20,
    };
  });
}

/** 편향 경고 여부 */
export function hasBiasWarning(expert: Expert): boolean {
  return expert.biasScore < 60;
}

/** 전문 분야 미일치 경고 */
export function hasDomainWarning(expert: Expert, issueDomains: string[]): boolean {
  return !expert.domains.some((d) => issueDomains.includes(d));
}

/** 신뢰도 등급 */
export function getCredibilityTier(score: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (score >= 90)
    return { label: "최고 신뢰", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" };
  if (score >= 80)
    return { label: "높음", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" };
  if (score >= 70)
    return { label: "보통", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" };
  return { label: "주의 필요", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" };
}

/** 적중도 등급 (투자 판단 활용 지표) */
export function getAccuracyGrade(score: number): {
  grade: string;
  label: string;
  color: string;
  invest: string;
} {
  if (score >= 85) return { grade: "A+", label: "투자 참고 최우선", color: "text-emerald-400", invest: "핵심 참고" };
  if (score >= 75) return { grade: "A",  label: "투자 참고 우선",   color: "text-blue-400",    invest: "우선 참고" };
  if (score >= 65) return { grade: "B",  label: "보조 참고",         color: "text-yellow-400",  invest: "보조 참고" };
  return                   { grade: "C",  label: "주의 요망",         color: "text-orange-400",  invest: "신중히" };
}
