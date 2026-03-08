import { AIPredictionScore, WeeklyAccuracy, IssueAccuracy } from "@/types";
import { weeklyReports } from "./weeklyPredictions";

/** 전체 예측 결과 집계 */
export function computeAIScore(): AIPredictionScore {
  const allPredictions = weeklyReports.flatMap(r => r.predictions);

  const resolved = allPredictions.filter(p => p.result && p.result !== "미결");
  const correct = resolved.filter(p => p.result === "적중").length;
  const partial = resolved.filter(p => p.result === "부분적중").length;
  const incorrect = resolved.filter(p => p.result === "불일치").length;
  const pending = allPredictions.filter(p => !p.result || p.result === "미결").length;

  const resolvedCount = resolved.length;
  const accuracyRate = resolvedCount > 0
    ? Math.round(((correct + partial * 0.5) / resolvedCount) * 100)
    : 0;

  // 연속 적중 계산
  let streak = 0;
  let bestStreak = 0;
  let currentStreak = 0;
  const sortedResolved = [...resolved];

  // Use the WeeklyPrediction's parent weekStart for sorting
  for (const pred of sortedResolved) {
    if (pred.result === "적중" || pred.result === "부분적중") {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  streak = currentStreak;

  // 주간 정확도
  const weeklyAccuracy: WeeklyAccuracy[] = weeklyReports
    .filter(r => r.predictions.some(p => p.result && p.result !== "미결"))
    .map(r => {
      const preds = r.predictions.filter(p => p.result && p.result !== "미결");
      const wCorrect = preds.filter(p => p.result === "적중").length;
      const wPartial = preds.filter(p => p.result === "부분적중").length;
      const wIncorrect = preds.filter(p => p.result === "불일치").length;
      const total = preds.length;
      return {
        weekStart: r.weekStart,
        weekEnd: r.weekEnd,
        weekNumber: r.weekNumber,
        year: r.year,
        predictions: total,
        correct: wCorrect,
        partial: wPartial,
        incorrect: wIncorrect,
        accuracyRate: total > 0 ? Math.round(((wCorrect + wPartial * 0.5) / total) * 100) : 0,
      };
    })
    .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());

  // 이슈별 정확도
  const issueMap = new Map<string, { title: string; correct: number; partial: number; incorrect: number; total: number }>();

  // Issue title mapping
  const issueTitles: Record<string, string> = {
    "us-tariff-war": "트럼프 관세전쟁",
    "us-china-taiwan": "대만해협 긴장",
    "russia-ukraine": "러시아-우크라이나 전쟁",
    "israel-iran": "이스라엘-이란",
    "north-korea": "북한 핵개발",
    "us-china-trade": "미중 경제 디커플링",
    "global-ai-governance": "글로벌 AI 거버넌스",
    "europe-fragmentation": "유럽 분열",
  };

  for (const pred of resolved) {
    const existing = issueMap.get(pred.issueId) || {
      title: issueTitles[pred.issueId] || pred.issueId,
      correct: 0, partial: 0, incorrect: 0, total: 0
    };
    existing.total++;
    if (pred.result === "적중") existing.correct++;
    else if (pred.result === "부분적중") existing.partial++;
    else if (pred.result === "불일치") existing.incorrect++;
    issueMap.set(pred.issueId, existing);
  }

  const byIssue: IssueAccuracy[] = [...issueMap.entries()]
    .map(([issueId, data]) => ({
      issueId,
      issueTitle: data.title,
      predictions: data.total,
      correct: data.correct,
      partial: data.partial,
      incorrect: data.incorrect,
      accuracyRate: data.total > 0
        ? Math.round(((data.correct + data.partial * 0.5) / data.total) * 100)
        : 0,
    }))
    .sort((a, b) => b.accuracyRate - a.accuracyRate);

  return {
    totalPredictions: allPredictions.length,
    correct,
    partiallyCorrect: partial,
    incorrect,
    pending,
    accuracyRate,
    weeklyAccuracy,
    byIssue,
    streak,
    bestStreak,
  };
}

/** 정확도 등급 */
export function getAccuracyGrade(rate: number): { grade: string; label: string; color: string } {
  if (rate >= 80) return { grade: "A+", label: "탁월", color: "text-emerald-400" };
  if (rate >= 70) return { grade: "A", label: "우수", color: "text-blue-400" };
  if (rate >= 60) return { grade: "B+", label: "양호", color: "text-cyan-400" };
  if (rate >= 50) return { grade: "B", label: "보통", color: "text-yellow-400" };
  if (rate >= 40) return { grade: "C", label: "미흡", color: "text-orange-400" };
  return { grade: "D", label: "부진", color: "text-red-400" };
}

/** 적중률 트렌드 (최근 4주 vs 이전 4주) */
export function getAccuracyTrend(score: AIPredictionScore): "상승" | "하락" | "유지" {
  const weeks = score.weeklyAccuracy;
  if (weeks.length < 4) return "유지";

  const recent = weeks.slice(0, Math.min(4, weeks.length));
  const older = weeks.slice(Math.min(4, weeks.length), Math.min(8, weeks.length));

  if (older.length === 0) return "유지";

  const recentAvg = recent.reduce((s, w) => s + w.accuracyRate, 0) / recent.length;
  const olderAvg = older.reduce((s, w) => s + w.accuracyRate, 0) / older.length;

  const diff = recentAvg - olderAvg;
  if (diff > 5) return "상승";
  if (diff < -5) return "하락";
  return "유지";
}
