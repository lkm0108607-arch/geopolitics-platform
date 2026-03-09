import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, Users, Activity, Zap, ChevronRight,
  Calendar, Target, Clock, BarChart3, Award, CheckCircle, XCircle, AlertTriangle,
  ArrowUpRight, ArrowDownRight, PieChart,
} from "lucide-react";
import { assets } from "@/data/assets";
import { getAllAssetPredictions, getAssetPredictionStats } from "@/data/assetPredictions";
import { factors } from "@/data/factors";
import { getTopExperts, getExpertStats } from "@/data/experts";
import { getCurrentWeekReport } from "@/data/weeklyPredictions";
import { computeAIScore, getAccuracyGrade } from "@/data/aiScorecard";
import { formatWeekRange } from "@/data/meta";
import { formatValue, getDirectionInfo, getChangeColor } from "@/components/AssetCard";

export const revalidate = 43200;

export default function HomePage() {
  const stats = getExpertStats();
  const topExperts = getTopExperts(10);
  const currentWeek = getCurrentWeekReport();
  const aiScore = computeAIScore();
  const aiGrade = getAccuracyGrade(aiScore.accuracyRate);
  const allPredictions = getAllAssetPredictions();

  // 자산별 통계 계산
  const assetStats = assets.map((a) => ({
    asset: a,
    stats: getAssetPredictionStats(a.id),
  }));

  // 최근 시그널
  const recentSignals = factors
    .flatMap((f) => f.signals.map((s) => ({ ...s, factorTitle: f.title, factorId: f.id })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // 확률 상승 요인
  const risingFactors = factors.filter((f) => f.probTrend === "상승" && f.isActive).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ───── HERO: 핵심 가치 제안 ───── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-3">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>적중률 검증 기반 투자 예측</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          {stats.total.toLocaleString()}명 전문가의 적중률을<br className="md:hidden" /> 통계로 검증합니다
        </h1>
        <p className="text-slate-400 text-base max-w-2xl">
          과거에 맞춘 전문가일수록 높은 가중치. 그들이 지금 말하는 전망을
          확률로 종합합니다. 틀린 예측도 삭제하지 않습니다.
        </p>
      </div>

      {/* ───── 섹션 1: 전문가 적중률 통계 ───── */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-emerald-400" />
          전문가 적중률 통계
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "등록 전문가", value: stats.total.toLocaleString(), sub: "명", icon: Users, color: "text-blue-400" },
            { label: "총 예측 기록", value: stats.totalPredictions.toLocaleString(), sub: "건", icon: BarChart3, color: "text-purple-400" },
            { label: "적중", value: stats.correctPredictions.toLocaleString(), sub: "건", icon: CheckCircle, color: "text-emerald-400" },
            { label: "부분적중", value: stats.partialPredictions.toLocaleString(), sub: "건", icon: AlertTriangle, color: "text-yellow-400" },
            { label: "전체 적중률", value: `${stats.overallAccuracyRate}%`, sub: "", icon: Target, color: stats.overallAccuracyRate >= 50 ? "text-emerald-400" : "text-red-400" },
            { label: "평균 신뢰도", value: stats.avgCredibility, sub: "점", icon: Award, color: "text-blue-400" },
            { label: "고적중 전문가", value: stats.highAccuracy.toLocaleString(), sub: "명 (80+)", icon: TrendingUp, color: "text-orange-400" },
            { label: "AI 등급", value: aiGrade.grade, sub: `${aiScore.accuracyRate}%`, icon: Target, color: aiGrade.color },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <Icon className={`w-4 h-4 ${color} mb-2`} />
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ───── 섹션 2: 검증된 전문가들이 지금 말하는 것 ───── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            적중률 TOP 전문가들의 현재 견해
          </h2>
          <Link href="/experts" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
            전체 전문가 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {topExperts.slice(0, 5).map((expert, idx) => {
            const hitCount = expert.predictionHistory.filter((p) => p.outcome === "적중").length;
            const totalCount = expert.predictionHistory.filter((p) => p.outcome !== "미결").length;
            const hitRate = totalCount > 0 ? Math.round((hitCount / totalCount) * 100) : 0;
            return (
              <Link key={expert.id} href={`/experts/${expert.id}`} className="block group">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      hitRate >= 80 ? "text-emerald-400 bg-emerald-400/10" :
                      hitRate >= 60 ? "text-blue-400 bg-blue-400/10" :
                      "text-yellow-400 bg-yellow-400/10"
                    }`}>
                      적중 {hitRate}%
                    </span>
                  </div>
                  <p className="font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
                    {expert.name}
                  </p>
                  <p className="text-xs text-slate-500 mb-2">{expert.affiliation}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span>신뢰도 {expert.credibilityScore}</span>
                    <span>·</span>
                    <span>{hitCount}/{totalCount} 적중</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 bg-slate-800/60 rounded p-2">
                    &ldquo;{expert.recentView}&rdquo;
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ───── 섹션 3: 자산별 확률 예측 (통계 기반) ───── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            자산별 전문가 예측 확률
          </h2>
          <Link href="/assets" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
            상세 분석 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          각 자산에 대해 전문가들의 예측을 집계합니다. 적중률이 높은 전문가의 견해에 더 높은 가중치를 부여합니다.
        </p>
        <div className="space-y-2">
          {assetStats.map(({ asset, stats: s }) => {
            const majorDirection = s.bullish > s.bearish ? "상승" : s.bearish > s.bullish ? "하락" : "보합";
            const majorPct = s.bullish > s.bearish ? s.bullishPct : s.bearishPct;
            const dir = getDirectionInfo(majorDirection);
            const DirIcon = dir.icon;

            return (
              <Link key={asset.id} href={`/assets/${asset.id}`} className="block group">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-4">
                    {/* 자산 정보 */}
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

                    {/* 현재가 */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-white">{formatValue(asset.currentValue, asset.unit)}</p>
                    </div>

                    {/* 전문가 예측 비율 바 */}
                    <div className="w-40 flex-shrink-0 hidden md:block">
                      <div className="flex w-full h-2 rounded-full overflow-hidden bg-slate-800">
                        {s.bullishPct > 0 && <div className="bg-red-500" style={{ width: `${s.bullishPct}%` }} />}
                        {(100 - s.bullishPct - s.bearishPct) > 0 && <div className="bg-slate-600" style={{ width: `${100 - s.bullishPct - s.bearishPct}%` }} />}
                        {s.bearishPct > 0 && <div className="bg-blue-500" style={{ width: `${s.bearishPct}%` }} />}
                      </div>
                      <div className="flex justify-between mt-0.5 text-[10px] text-slate-500">
                        <span className="text-red-400">↑{s.bullishPct}%</span>
                        <span className="text-blue-400">↓{s.bearishPct}%</span>
                      </div>
                    </div>

                    {/* 컨센서스 방향 */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${dir.bg} ${dir.border} flex-shrink-0`}>
                      <DirIcon className={`w-4 h-4 ${dir.color}`} />
                      <span className={`text-sm font-bold ${dir.color}`}>{majorPct}%</span>
                    </div>

                    {/* 과거 적중률 */}
                    <div className="text-right flex-shrink-0 hidden lg:block">
                      <p className={`text-sm font-bold ${s.accuracyRate >= 60 ? "text-emerald-400" : "text-yellow-400"}`}>
                        적중 {s.accuracyRate}%
                      </p>
                      <p className="text-[10px] text-slate-500">{s.resolvedPredictions}건 검증</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ───── 하단 2컬럼 ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* 주간 예측 배너 */}
          {currentWeek && (
            <Link href="/weekly" className="block">
              <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-blue-700/30 rounded-xl p-5 hover:border-blue-500/50 transition-all">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      <span className="text-sm font-semibold text-blue-300">
                        이번 주 예측 ({formatWeekRange(currentWeek.weekStart, currentWeek.weekEnd)})
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{currentWeek.summary}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-slate-400">적중률</p>
                      <p className={`text-xl font-bold ${currentWeek.accuracyRate >= 70 ? "text-emerald-400" : "text-yellow-400"}`}>
                        {currentWeek.accuracyRate}%
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* 영향력 상승 중인 요인 */}
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
                      <p className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors">{f.title}</p>
                      <p className="text-xs text-slate-500 mt-1">영향 자산 {f.impactedAssetIds.length}개</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 오른쪽 사이드바 */}
        <div className="space-y-6">
          {/* AI 성적표 */}
          <Link href="/scorecard" className="block">
            <div className="bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 border border-emerald-700/30 rounded-xl p-5 hover:border-emerald-500/50 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-white">AI 예측 성적표</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 ${aiGrade.color}`}>{aiGrade.grade}</span>
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

          {/* 최근 시그널 */}
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
                        signal.type === "경고" ? "bg-red-400" : signal.type === "긍정" ? "bg-green-400" : "bg-yellow-400"
                      }`} />
                      <div>
                        <p className="text-xs font-medium text-white leading-snug group-hover:text-blue-300">{signal.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{signal.factorTitle} · {signal.date}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* 데이터 투명성 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">데이터 투명성 원칙</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 mt-0.5">-</span>
                틀린 예측도 삭제하지 않음
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 mt-0.5">-</span>
                과거 적중률 30% 가중치로 최우선 반영
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 mt-0.5">-</span>
                팔로워 수(대중 평가) 2%만 반영
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 mt-0.5">-</span>
                {stats.total.toLocaleString()}명 전문가 · {stats.totalPredictions.toLocaleString()}건 예측 추적
              </li>
            </ul>
          </div>

          {/* 업데이트 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">매일 업데이트</span>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <p className="text-xs text-slate-400">마지막 갱신: 2026년 3월 8일</p>
          </div>
        </div>
      </div>
    </div>
  );
}
