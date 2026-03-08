import {
  BarChart3,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Trophy,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  Eye,
  Calendar,
} from "lucide-react";
import { computeAIScore, getAccuracyGrade, getAccuracyTrend } from "@/data/aiScorecard";
import { weeklyReports } from "@/data/weeklyPredictions";
import type { WeeklyPrediction } from "@/types";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const resultConfig = {
  "적중": {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-400",
    barColor: "bg-emerald-500",
    icon: CheckCircle,
  },
  "부분적중": {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    badgeBg: "bg-yellow-500/20",
    badgeText: "text-yellow-400",
    barColor: "bg-yellow-500",
    icon: AlertCircle,
  },
  "불일치": {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    badgeBg: "bg-red-500/20",
    badgeText: "text-red-400",
    barColor: "bg-red-500",
    icon: XCircle,
  },
  "미결": {
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    badgeBg: "bg-slate-500/20",
    badgeText: "text-slate-400",
    barColor: "bg-slate-500",
    icon: Clock,
  },
} as const;

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

export default function ScorecardPage() {
  const score = computeAIScore();
  const grade = getAccuracyGrade(score.accuracyRate);
  const trend = getAccuracyTrend(score);

  const resolvedTotal = score.correct + score.partiallyCorrect + score.incorrect;

  // Donut chart segments
  const segments = [
    { label: "적중", count: score.correct, color: "#10b981", key: "correct" },
    { label: "부분적중", count: score.partiallyCorrect, color: "#eab308", key: "partial" },
    { label: "불일치", count: score.incorrect, color: "#ef4444", key: "incorrect" },
    { label: "미결", count: score.pending, color: "#64748b", key: "pending" },
  ];
  const segmentTotal = segments.reduce((s, seg) => s + seg.count, 0);

  // Build conic-gradient
  let conicStops: string[] = [];
  let accumulated = 0;
  for (const seg of segments) {
    const pct = segmentTotal > 0 ? (seg.count / segmentTotal) * 100 : 0;
    conicStops.push(`${seg.color} ${accumulated}% ${accumulated + pct}%`);
    accumulated += pct;
  }
  const conicGradient = `conic-gradient(${conicStops.join(", ")})`;

  // Weekly accuracy (last 8 weeks)
  const weeklyData = score.weeklyAccuracy.slice(0, 8).reverse();
  const maxWeeklyRate = Math.max(...weeklyData.map(w => w.accuracyRate), 1);

  // Recent predictions (last 10)
  const allPredictions = weeklyReports
    .flatMap(r =>
      r.predictions.map(p => ({
        ...p,
        weekStart: r.weekStart,
        weekEnd: r.weekEnd,
      }))
    )
    .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime())
    .slice(0, 10);

  const TrendIcon = trend === "상승" ? TrendingUp : trend === "하락" ? TrendingDown : Minus;
  const trendColor =
    trend === "상승"
      ? "text-emerald-400"
      : trend === "하락"
        ? "text-red-400"
        : "text-slate-400";
  const trendBg =
    trend === "상승"
      ? "bg-emerald-500/10"
      : trend === "하락"
        ? "bg-red-500/10"
        : "bg-slate-500/10";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ───── Hero Section ───── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
          <Target className="w-4 h-4" />
          <span>AI 성적표</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">AI 예측 성적표</h1>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          이 플랫폼의 AI가 내놓은 지정학 예측이{" "}
          <strong className="text-slate-200">실제로 얼마나 맞았는지</strong> 투명하게 공개합니다.
          모든 예측은 기록되며, 결과가 확정되면 객관적으로 적중 여부를 평가합니다.
        </p>
      </div>

      {/* ───── Overall Stats Cards ───── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {/* 총 예측 수 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-3">
            <BarChart3 className="w-3.5 h-3.5" />
            총 예측 수
          </div>
          <p className="text-3xl font-bold text-white">{score.totalPredictions}</p>
          <p className="text-xs text-slate-500 mt-1">
            평가완료 {resolvedTotal} · 미결 {score.pending}
          </p>
        </div>

        {/* 적중률 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-3">
            <Target className="w-3.5 h-3.5" />
            적중률
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-white">{score.accuracyRate}%</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold mb-1 ${
                grade.grade.startsWith("A")
                  ? "bg-emerald-500/20 text-emerald-400"
                  : grade.grade.startsWith("B")
                    ? "bg-blue-500/20 text-blue-400"
                    : grade.grade.startsWith("C")
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
              }`}
            >
              {grade.grade} {grade.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">(적중 + 부분적중&times;0.5) &divide; 평가완료</p>
        </div>

        {/* 연속 적중 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-3">
            <Flame className="w-3.5 h-3.5" />
            연속 적중
          </div>
          <p className="text-3xl font-bold text-orange-400">{score.streak}</p>
          <p className="text-xs text-slate-500 mt-1">현재 연속 적중 기록</p>
        </div>

        {/* 최고 연속 적중 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-3">
            <Trophy className="w-3.5 h-3.5" />
            최고 연속 적중
          </div>
          <p className="text-3xl font-bold text-yellow-400">{score.bestStreak}</p>
          <p className="text-xs text-slate-500 mt-1">역대 최고 기록</p>
        </div>
      </div>

      {/* ───── Two-column Layout: Trend + Donut ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
        {/* Accuracy Trend - wider */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-bold text-white">적중률 추이</h2>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${trendBg} ${trendColor}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              {trend}
            </div>
          </div>

          <div className="space-y-2.5">
            {weeklyData.map((week) => {
              const barWidth = Math.max((week.accuracyRate / 100) * 100, 2);
              const barColor =
                week.accuracyRate >= 75
                  ? "bg-emerald-500"
                  : week.accuracyRate >= 50
                    ? "bg-blue-500"
                    : week.accuracyRate >= 30
                      ? "bg-yellow-500"
                      : "bg-red-500";

              return (
                <div key={`${week.year}-${week.weekNumber}`} className="group">
                  <div className="flex items-center gap-3 text-xs mb-1">
                    <span className="text-slate-500 w-24 flex-shrink-0 font-mono">
                      {formatDate(week.weekStart)}~{formatDate(week.weekEnd)}
                    </span>
                    <div className="flex-1 bg-slate-800 rounded-full h-5 relative overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-500`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <span className="absolute inset-y-0 right-2 flex items-center text-[11px] font-bold text-white/80">
                        {week.accuracyRate}%
                      </span>
                    </div>
                    <span className="text-slate-600 w-28 flex-shrink-0 text-right text-[11px]">
                      <span className="text-emerald-400">{week.correct}</span>
                      <span className="text-slate-700 mx-0.5">/</span>
                      <span className="text-yellow-400">{week.partial}</span>
                      <span className="text-slate-700 mx-0.5">/</span>
                      <span className="text-red-400">{week.incorrect}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {weeklyData.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">
              아직 평가된 주간 데이터가 없습니다.
            </p>
          )}
        </div>

        {/* Result Breakdown Donut */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Eye className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-bold text-white">결과 분포</h2>
          </div>

          {/* CSS Donut Chart */}
          <div className="flex justify-center mb-6">
            <div className="relative w-48 h-48">
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: segmentTotal > 0 ? conicGradient : "#1e293b",
                }}
              />
              {/* Inner circle for donut effect */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-slate-900 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold text-white">{score.accuracyRate}%</p>
                  <p className="text-[10px] text-slate-400 font-medium">적중률</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2.5">
            {segments.map((seg) => {
              const pct = segmentTotal > 0 ? Math.round((seg.count / segmentTotal) * 100) : 0;
              return (
                <div key={seg.key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-slate-300 font-medium">{seg.label}</span>
                      <span className="text-xs text-slate-500">{seg.count}건</span>
                    </div>
                    <p className="text-[10px] text-slate-600">{pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ───── Issue-by-Issue Accuracy ───── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-10">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h2 className="text-base font-bold text-white">이슈별 적중률</h2>
          <span className="text-xs text-slate-500 ml-1">정확도순 정렬</span>
        </div>

        {score.byIssue.length > 0 ? (
          <div className="space-y-3">
            {score.byIssue.map((issue, idx) => {
              const barColor =
                issue.accuracyRate >= 75
                  ? "bg-emerald-500"
                  : issue.accuracyRate >= 50
                    ? "bg-blue-500"
                    : issue.accuracyRate >= 30
                      ? "bg-yellow-500"
                      : "bg-red-500";

              return (
                <div
                  key={issue.issueId}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 w-5">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-white">
                        {issue.issueTitle}
                      </h3>
                    </div>
                    <span className="text-lg font-bold text-white">
                      {issue.accuracyRate}%
                    </span>
                  </div>

                  {/* Accuracy bar */}
                  <div className="bg-slate-700/50 rounded-full h-2 mb-2.5">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-700`}
                      style={{ width: `${issue.accuracyRate}%` }}
                    />
                  </div>

                  {/* Breakdown */}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>예측 {issue.predictions}건</span>
                    <span className="text-emerald-400">
                      적중 {issue.correct}
                    </span>
                    <span className="text-yellow-400">
                      부분적중 {issue.partial}
                    </span>
                    <span className="text-red-400">
                      불일치 {issue.incorrect}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">
            아직 이슈별 평가 데이터가 없습니다.
          </p>
        )}
      </div>

      {/* ───── Recent Predictions Timeline ───── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-10">
        <div className="flex items-center gap-2 mb-5">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <h2 className="text-base font-bold text-white">최근 예측 기록</h2>
          <span className="text-xs text-slate-500 ml-1">최근 10건</span>
        </div>

        {allPredictions.length > 0 ? (
          <div className="space-y-2">
            {allPredictions.map((pred) => {
              const result = pred.result || "미결";
              const config = resultConfig[result as keyof typeof resultConfig] || resultConfig["미결"];
              const ResultIcon = config.icon;
              const issueTitle = issueTitles[pred.issueId] || pred.issueId;

              return (
                <div
                  key={pred.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${config.bg} ${config.border} transition-all`}
                >
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 mt-0.5">
                    <ResultIcon className={`w-4 h-4 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {formatDateFull(pred.weekStart)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                        {issueTitle}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${config.badgeBg} ${config.badgeText}`}
                      >
                        {result}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
                      {pred.prediction}
                    </p>
                    {pred.actualOutcome && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        &rarr; {pred.actualOutcome}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">
            아직 기록된 예측이 없습니다.
          </p>
        )}
      </div>

      {/* ───── Transparency Disclaimer ───── */}
      <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-emerald-300 mb-2">투명성 원칙</h3>
            <ul className="space-y-1.5 text-sm text-emerald-200/70 leading-relaxed">
              <li>
                <strong className="text-emerald-200">기록 보존:</strong> 모든 AI 예측은
                발행 즉시 기록되며, 사후 수정되지 않습니다.
              </li>
              <li>
                <strong className="text-emerald-200">객관적 평가:</strong> 적중 여부는
                실제 발생한 사건과 대조하여 객관적 기준으로 판정합니다.
              </li>
              <li>
                <strong className="text-emerald-200">부분적중 인정:</strong> 방향은
                맞았으나 세부 사항이 다른 경우 &apos;부분적중&apos;(0.5점)으로 반영합니다.
              </li>
              <li>
                <strong className="text-emerald-200">미결 구분:</strong> 아직 결과가
                확정되지 않은 예측은 적중률 계산에서 제외합니다.
              </li>
              <li>
                <strong className="text-emerald-200">완전 공개:</strong> 틀린 예측도
                삭제하지 않고 그대로 공개합니다. AI의 한계를 숨기지 않습니다.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
