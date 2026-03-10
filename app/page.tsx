import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, Users, Activity, Zap, ChevronRight,
  Target, BarChart3, Award,
  ArrowUpRight, ArrowDownRight, PieChart, Brain,
} from "lucide-react";
import { assets } from "@/data/assets";
import { getTopExperts, getExpertStats } from "@/data/experts";
import {
  getCurrentCycle,
  computeCyclePerformance,
  getLatestVerificationLogs,
  getNextCycleInfo,
} from "@/data/aiPredictionCycles";
import type { PredictionDirection } from "@/types";

export const revalidate = 3600;

function getDirIcon(direction: PredictionDirection) {
  switch (direction) {
    case "상승": return { Icon: TrendingUp, color: "text-red-400" };
    case "하락": return { Icon: TrendingDown, color: "text-blue-400" };
    case "변동성확대": return { Icon: Activity, color: "text-yellow-400" };
    default: return { Icon: Minus, color: "text-slate-400" };
  }
}

export default function HomePage() {
  const stats = getExpertStats();
  const topExperts = getTopExperts(5);
  const cycle = getCurrentCycle();
  const cyclePerf = computeCyclePerformance();
  const nextInfo = getNextCycleInfo();
  const verificationLogs = getLatestVerificationLogs(3);
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* ── Hero ── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          <Brain className="w-6 h-6 text-purple-400 inline mr-2" />
          {stats.total.toLocaleString()}명 전문가 적중률 기반 AI 예측
        </h1>
        <p className="text-slate-400 text-sm">
          적중률 높은 전문가에게 높은 가중치 — 3일마다 자산별 방향을 확률로 예측합니다. 누적 적중률 <strong className="text-white">{cyclePerf.accuracyRate}%</strong>
        </p>
      </div>

      {/* ── AI 예측 요약 (사이클 #{n}) ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            AI 예측 — 사이클 #{cycle.cycleNumber}
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> LIVE
            </span>
          </h2>
          <Link href="/predictions" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
            전체 보기 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
          {cycle.predictions.slice(0, 9).map((pred) => {
            const asset = assetMap.get(pred.assetId);
            if (!asset) return null;
            const { Icon, color } = getDirIcon(pred.direction);
            return (
              <Link key={pred.id} href="/predictions" className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 hover:border-purple-700/50 transition-all text-center">
                <p className="text-[10px] text-slate-500 truncate">{asset.name}</p>
                <Icon className={`w-4 h-4 mx-auto my-1 ${color}`} />
                <p className={`text-sm font-bold ${color}`}>{pred.probability}%</p>
                <p className={`text-[10px] ${color}`}>{pred.direction}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 핵심 지표 ── */}
      <section>
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-emerald-400" />
          핵심 지표
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-3">
            <p className="text-xs text-slate-400">누적 적중률</p>
            <p className={`text-xl font-bold ${cyclePerf.accuracyRate >= 70 ? "text-emerald-400" : "text-yellow-400"}`}>{cyclePerf.accuracyRate}%</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400">전문가 풀</p>
            <p className="text-xl font-bold text-white">{stats.total.toLocaleString()}<span className="text-sm text-slate-500">명</span></p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400">완료 사이클</p>
            <p className="text-xl font-bold text-white">{cyclePerf.totalCycles}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400">적중 / 전체</p>
            <p className="text-xl font-bold text-white">{cyclePerf.correct}<span className="text-sm text-slate-500">/{cyclePerf.totalPredictions}</span></p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400">다음 갱신</p>
            <p className="text-xl font-bold text-cyan-400">{nextInfo.daysRemaining}일</p>
          </div>
        </div>
      </section>

      {/* ── TOP 전문가 ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            TOP 전문가
          </h2>
          <Link href="/experts" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            전체 전문가 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg divide-y divide-slate-800">
          {topExperts.slice(0, 5).map((expert, idx) => {
            const hitCount = expert.predictionHistory.filter((p) => p.outcome === "적중").length;
            const totalCount = expert.predictionHistory.filter((p) => p.outcome !== "미결").length;
            const hitRate = totalCount > 0 ? Math.round((hitCount / totalCount) * 100) : 0;
            return (
              <Link key={expert.id} href={`/experts/${expert.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors">
                <span className="text-xs font-bold text-yellow-400 w-5">#{idx + 1}</span>
                <span className="text-sm font-medium text-white flex-1">{expert.name}</span>
                <span className="text-xs text-slate-500">{expert.affiliation}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${hitRate >= 80 ? "text-emerald-400 bg-emerald-400/10" : hitRate >= 60 ? "text-blue-400 bg-blue-400/10" : "text-yellow-400 bg-yellow-400/10"}`}>
                  {hitRate}%
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 실시간 뉴스 검증 ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            실시간 뉴스 검증
          </h2>
          <Link href="/predictions" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
            전체 로그 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {verificationLogs.map((log) => {
            const impactColor = log.impact === "supports" ? "text-emerald-400" : log.impact === "contradicts" ? "text-red-400" : "text-slate-400";
            const impactBg = log.impact === "supports" ? "bg-emerald-500/10 border-emerald-500/20" : log.impact === "contradicts" ? "bg-red-500/10 border-red-500/20" : "bg-slate-500/10 border-slate-500/20";
            const impactLabel = log.impact === "supports" ? "예측 지지" : log.impact === "contradicts" ? "예측 역풍" : "중립";
            const asset = assetMap.get(log.assetId);
            return (
              <div key={log.id} className={`rounded-lg border p-2.5 ${impactBg} flex items-center gap-2`}>
                <span className={impactColor}>
                  {log.impact === "supports" ? <ArrowUpRight className="w-3.5 h-3.5" /> : log.impact === "contradicts" ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                </span>
                {asset && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{asset.name}</span>}
                <span className={`text-[10px] font-bold ${impactColor}`}>{impactLabel}</span>
                <p className="text-xs text-white flex-1 truncate">{log.newsHeadline}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Quick Links ── */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: "/predictions", label: "AI 예측", icon: Brain, color: "text-purple-400" },
            { href: "/assets", label: "자산 전망", icon: BarChart3, color: "text-blue-400" },
            { href: "/factors", label: "변동 요인", icon: Activity, color: "text-yellow-400" },
            { href: "/experts", label: "전문가", icon: Users, color: "text-emerald-400" },
            { href: "/investment", label: "투자 전략", icon: Target, color: "text-cyan-400" },
            { href: "/investment/simulation", label: "모의 투자", icon: PieChart, color: "text-orange-400" },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition-all flex flex-col items-center gap-2 group">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
