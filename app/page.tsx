import Link from "next/link";
import { TrendingUp, AlertTriangle, Users, BarChart3, Zap, ChevronRight, Activity, Calendar, Target, Clock } from "lucide-react";
import { issues } from "@/data/issues";
import { getAllExperts } from "@/data/experts";
import { getCurrentWeekReport } from "@/data/weeklyPredictions";
import { computeAIScore, getAccuracyGrade } from "@/data/aiScorecard";
import { formatWeekRange } from "@/data/meta";
import IssueCard from "@/components/IssueCard";
import ExpertCard from "@/components/ExpertCard";
import { getRiskColor, getRiskLabel } from "@/components/ui/RiskGauge";

export default function HomePage() {
  const allExperts = getAllExperts();
  const topRisk = [...issues].sort((a, b) => b.probability - a.probability).slice(0, 5);
  const risingIssues = issues.filter((i) => i.probTrend === "상승");
  const topExperts = [...allExperts].sort((a, b) => b.credibilityScore - a.credibilityScore).slice(0, 3);
  const currentWeek = getCurrentWeekReport();
  const aiScore = computeAIScore();
  const aiGrade = getAccuracyGrade(aiScore.accuracyRate);

  const divergingIssues = issues.filter((i) => {
    const scenarios = i.scenarios;
    if (scenarios.length < 2) return false;
    const probs = scenarios.map((s) => s.probability);
    const max = Math.max(...probs);
    const min = Math.min(...probs);
    return max - min < 40;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-3">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>실시간 국제정세 분석</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          전망을 비교하고,<br className="md:hidden" /> 판단하세요
        </h1>
        <p className="text-slate-400 text-base max-w-2xl">
          전 세계 국제정세 전문가들의 분석을 모아, 신뢰도와 근거 중심으로 비교해보는 국제정세 판단 지원 플랫폼
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-10">
        {[
          { label: "활성 이슈", value: issues.filter((i) => i.isActive).length, icon: AlertTriangle, color: "text-orange-400" },
          { label: "등록 전문가", value: allExperts.length, icon: Users, color: "text-blue-400" },
          { label: "총 시나리오", value: issues.reduce((sum, i) => sum + i.scenarios.length, 0), icon: BarChart3, color: "text-purple-400" },
          { label: "확률 상승", value: risingIssues.length, icon: TrendingUp, color: "text-red-400" },
          { label: "AI 적중률", value: `${aiScore.accuracyRate}%`, icon: Target, color: aiGrade.color },
          { label: "총 예측", value: aiScore.totalPredictions, icon: Calendar, color: "text-cyan-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className={`${color} mb-2`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Weekly prediction banner */}
      {currentWeek && (
        <Link href="/weekly" className="block mb-8">
          <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-blue-700/30 rounded-xl p-5 hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-300">
                    이번 주 예측 ({formatWeekRange(currentWeek.weekStart, currentWeek.weekEnd)})
                  </span>
                  <span className="bg-blue-600/30 text-blue-300 text-xs px-2 py-0.5 rounded-full">
                    {currentWeek.predictions.length}건
                  </span>
                </div>
                <p className="text-sm text-slate-300">{currentWeek.summary}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-slate-400">적중률</p>
                  <p className={`text-xl font-bold ${currentWeek.accuracyRate >= 70 ? "text-emerald-400" : currentWeek.accuracyRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                    {currentWeek.accuracyRate}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">AI 등급</p>
                  <p className={`text-xl font-bold ${aiGrade.color}`}>{aiGrade.grade}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Top probability issues */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                발생 확률 Top 5
              </h2>
              <Link href="/issues" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                전체보기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {topRisk.map((issue, idx) => (
                <Link key={issue.id} href={`/issues/${issue.id}`} className="block group">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-slate-700 w-8 flex-shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-slate-500">{issue.region}</span>
                          {issue.probTrend === "상승" && (
                            <TrendingUp className="w-3 h-3 text-red-400" />
                          )}
                        </div>
                        <p className="font-semibold text-white group-hover:text-blue-300 transition-colors text-sm">
                          {issue.title}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className={`text-xl font-bold ${getRiskColor(issue.probability)}`}>
                          {issue.probability}%
                        </span>
                        <p className={`text-xs ${getRiskColor(issue.probability)}`}>
                          {getRiskLabel(issue.probability)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 ml-12 bg-slate-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          issue.probability >= 80 ? "bg-red-500" :
                          issue.probability >= 60 ? "bg-orange-500" :
                          issue.probability >= 40 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${issue.probability}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Diverging issues */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                전문가 견해가 갈리는 이슈
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {divergingIssues.slice(0, 4).map((issue) => (
                <IssueCard key={issue.id} issue={issue} compact />
              ))}
            </div>
          </section>

          {/* Rising probability */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-400" />
                이번 주 확률 상승 이슈
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {risingIssues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} compact />
              ))}
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Top experts */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                신뢰도 TOP 전문가
              </h2>
              <Link href="/experts" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                전체 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {topExperts.map((expert, idx) => (
                <ExpertCard key={expert.id} expert={expert} compact rank={idx + 1} />
              ))}
            </div>
          </section>

          {/* AI Scorecard CTA */}
          <Link href="/scorecard" className="block">
            <div className="bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 border border-emerald-700/30 rounded-xl p-5 hover:border-emerald-500/50 transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-white">AI 예측 성적표</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 ${aiGrade.color}`}>
                  {aiGrade.grade}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className={`text-2xl font-bold ${aiGrade.color}`}>{aiScore.accuracyRate}%</span>
                <span className="text-xs text-slate-400">적중률</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                {aiScore.correct}건 적중 · {aiScore.partiallyCorrect}건 부분적중 · {aiScore.incorrect}건 불일치
              </p>
              <span className="text-sm text-emerald-400 font-medium flex items-center gap-1">
                성적표 보기 <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          {/* AI Briefing CTA */}
          <Link href="/briefing" className="block">
            <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border border-blue-700/40 rounded-xl p-5 hover:border-blue-500/60 transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-white">AI 브리핑</span>
              </div>
              <p className="text-sm text-slate-300 mb-3">
                오늘의 국제정세를 3줄로 요약받고, 전문가별 견해 차이를 확인하세요.
              </p>
              <span className="text-sm text-blue-400 font-medium flex items-center gap-1">
                브리핑 시작하기 <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          {/* Daily update indicator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">매일 업데이트</span>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <p className="text-xs text-slate-400">
              마지막 갱신: 2026년 3월 8일
            </p>
            <p className="text-xs text-slate-500 mt-1">
              매일 자동으로 최신 뉴스와 전문가 분석이 업데이트됩니다.
              주간 예측은 매주 월요일에 발행됩니다.
            </p>
          </div>

          {/* Recent signals */}
          <section>
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-yellow-400" />
              최근 판세 전환 신호
            </h2>
            <div className="space-y-2">
              {issues
                .flatMap((i) => i.signals.map((s) => ({ ...s, issueTitle: i.title })))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((signal) => (
                  <div key={signal.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          signal.type === "경고" ? "bg-red-400" :
                          signal.type === "긍정" ? "bg-green-400" : "bg-yellow-400"
                        }`}
                      />
                      <div>
                        <p className="text-xs font-medium text-white leading-snug">{signal.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{signal.issueTitle} · {signal.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
