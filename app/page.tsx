import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Users, Activity, Zap, ChevronRight, Calendar, Target, Clock, BarChart3 } from "lucide-react";
import { assets } from "@/data/assets";
import { assetPredictions } from "@/data/assetPredictions";
import { factors } from "@/data/factors";
import { getAllExperts } from "@/data/experts";
import { getCurrentWeekReport } from "@/data/weeklyPredictions";
import { computeAIScore, getAccuracyGrade } from "@/data/aiScorecard";
import { formatWeekRange } from "@/data/meta";
import { calculateAssetConsensus } from "@/lib/assetProbability";
import ExpertCard from "@/components/ExpertCard";
import { formatValue, getDirectionInfo, getChangeColor } from "@/components/AssetCard";

export const revalidate = 43200;

export default function HomePage() {
  const allExperts = getAllExperts();
  const currentWeek = getCurrentWeekReport();
  const aiScore = computeAIScore();
  const aiGrade = getAccuracyGrade(aiScore.accuracyRate);
  const topExperts = [...allExperts].sort((a, b) => b.credibilityScore - a.credibilityScore).slice(0, 3);

  // 자산별 컨센서스 계산
  const assetConsensus = assets.map((a) => ({
    asset: a,
    consensus: calculateAssetConsensus(a, assetPredictions, allExperts),
  }));

  // 최근 시그널 (factors에서)
  const recentSignals = factors
    .flatMap((f) => f.signals.map((s) => ({ ...s, factorTitle: f.title, factorId: f.id })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  // 확률 상승 중인 요인
  const risingFactors = factors.filter((f) => f.probTrend === "상승" && f.isActive).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-3">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>전문가 적중률 기반 투자 예측</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          오늘의 투자 시그널
        </h1>
        <p className="text-slate-400 text-base max-w-2xl">
          과거 적중률이 검증된 전문가들의 예측을 신뢰도 가중 방식으로 종합합니다.
          금리·환율·원자재·지수의 방향성을 데이터로 판단하세요.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-10">
        {[
          { label: "추적 자산", value: assets.length, icon: BarChart3, color: "text-purple-400" },
          { label: "등록 전문가", value: allExperts.length, icon: Users, color: "text-blue-400" },
          { label: "활성 예측", value: assetPredictions.filter((p) => p.result === "미결").length, icon: TrendingUp, color: "text-orange-400" },
          { label: "변동 요인", value: factors.filter((f) => f.isActive).length, icon: Activity, color: "text-yellow-400" },
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
          {/* 주요 자산 전망 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                주요 자산 전망
              </h2>
              <Link href="/assets" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                전체보기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-2">
              {assetConsensus.map(({ asset, consensus }) => {
                const dir = getDirectionInfo(consensus.direction);
                const DirIcon = dir.icon;
                return (
                  <Link key={asset.id} href={`/assets/${asset.id}`} className="block group">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs text-slate-500">{asset.category}</span>
                            <span className={`text-xs ${getChangeColor(asset.changePercent)}`}>
                              {asset.changePercent > 0 ? "+" : ""}{asset.changePercent.toFixed(1)}%
                            </span>
                          </div>
                          <p className="font-semibold text-white group-hover:text-blue-300 transition-colors text-sm">
                            {asset.name}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 mr-4">
                          <p className="text-lg font-bold text-white">{formatValue(asset.currentValue, asset.unit)}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${dir.bg} ${dir.border} flex-shrink-0`}>
                          <DirIcon className={`w-4 h-4 ${dir.color}`} />
                          <span className={`text-sm font-bold ${dir.color}`}>{dir.label}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* 주목 요인 (확률 상승 중) */}
          {risingFactors.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-400" />
                  영향력 상승 중인 요인
                </h2>
                <Link href="/factors" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  전체보기 <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {risingFactors.map((f) => (
                  <Link key={f.id} href={`/factors/${f.id}`} className="block group">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{f.category}</span>
                        <span className="flex items-center gap-1 text-xs font-medium text-red-400">
                          <TrendingUp className="w-3 h-3" /> 상승
                        </span>
                      </div>
                      <p className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors">
                        {f.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        영향 자산 {f.impactedAssetIds.length}개
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
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

          {/* Recent signals */}
          <section>
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              최근 시그널
            </h2>
            <div className="space-y-2">
              {recentSignals.map((signal) => (
                <Link key={signal.id} href={`/factors/${signal.factorId}`} className="block group">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-slate-600 transition-colors">
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        signal.type === "경고" ? "bg-red-400" :
                        signal.type === "긍정" ? "bg-green-400" : "bg-yellow-400"
                      }`} />
                      <div>
                        <p className="text-xs font-medium text-white leading-snug group-hover:text-blue-300 transition-colors">
                          {signal.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{signal.factorTitle} · {signal.date}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Daily update */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">매일 업데이트</span>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <p className="text-xs text-slate-400">마지막 갱신: 2026년 3월 8일</p>
            <p className="text-xs text-slate-500 mt-1">
              매일 자동으로 최신 시장 데이터와 전문가 분석이 업데이트됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
