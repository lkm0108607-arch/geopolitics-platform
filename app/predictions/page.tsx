"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Brain, TrendingUp, TrendingDown, Minus, Activity, Target, Clock,
  ChevronRight, ChevronDown, CheckCircle, XCircle, AlertCircle, BarChart3, Zap,
  RefreshCw, Shield, ArrowUpRight, ArrowDownRight, FileText, Eye,
  Lightbulb, Flame, Trophy, Users,
} from "lucide-react";
import { assets } from "@/data/assets";
import { getETFByTicker } from "@/data/koreanETFs";
import { getExpertCount } from "@/data/experts";
import {
  getCurrentCycle,
  computeCyclePerformance,
  getLatestVerificationLogs,
  getNextCycleInfo,
  getCompletedCycles,
  getCycleResults,
  industryETFPredictions,
} from "@/data/aiPredictionCycles";
import { computeAIScore, getAccuracyGrade } from "@/data/aiScorecard";
import type { AICyclePrediction, PredictionDirection } from "@/types";

// ── Static data (module-level) ──
const cycle = getCurrentCycle();
const performance = computeCyclePerformance();
const verificationLogs = getLatestVerificationLogs(8);
const nextInfo = getNextCycleInfo();
const completedCycles = getCompletedCycles();
const expertCount = getExpertCount();
const aiScore = computeAIScore();
const grade = getAccuracyGrade(performance.accuracyRate);
const assetMap = new Map(assets.map((a) => [a.id, a]));
const etfByIndustry = new Map(industryETFPredictions.map((p) => [p.industryAssetId, p]));

const bullPredictions = cycle.predictions.filter((p) => p.direction === "상승");
const bearPredictions = cycle.predictions.filter((p) => p.direction === "하락");
const neutralPredictions = cycle.predictions.filter(
  (p) => p.direction === "보합" || p.direction === "변동성확대"
);

const directionGroups = [
  { key: "bull", title: "상승 예측", predictions: bullPredictions, accent: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: TrendingUp } },
  { key: "bear", title: "하락 예측", predictions: bearPredictions, accent: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: TrendingDown } },
  { key: "neutral", title: "보합/변동성", predictions: neutralPredictions, accent: { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: Activity } },
];

// Scorecard donut
const resolvedTotal = performance.correct + performance.partial + performance.incorrect;
const segments = [
  { label: "적중", count: performance.correct, color: "#10b981", key: "correct" },
  { label: "부분적중", count: performance.partial, color: "#eab308", key: "partial" },
  { label: "불일치", count: performance.incorrect, color: "#ef4444", key: "incorrect" },
  { label: "미결", count: performance.pending, color: "#64748b", key: "pending" },
];
const segmentTotal = segments.reduce((s, seg) => s + seg.count, 0);
let conicStops: string[] = [];
let accumulated = 0;
for (const seg of segments) {
  const pct = segmentTotal > 0 ? (seg.count / segmentTotal) * 100 : 0;
  conicStops.push(`${seg.color} ${accumulated}% ${accumulated + pct}%`);
  accumulated += pct;
}
const conicGradient = `conic-gradient(${conicStops.join(", ")})`;

// Streak
let bestStreak = 0;
let currentStreak = 0;
for (const pastCycle of completedCycles) {
  const results = getCycleResults(pastCycle.id);
  for (const r of results) {
    if (r.result === "적중" || r.result === "부분적중") { currentStreak++; bestStreak = Math.max(bestStreak, currentStreak); }
    else { currentStreak = 0; }
  }
}
const streak = currentStreak;

const NAV_LINKS = [
  { href: "/investment", label: "투자 전략" },
  { href: "/experts", label: "전문가" },
  { href: "/assets", label: "자산" },
  { href: "/simulation", label: "시뮬레이션" },
];

// ── Helpers ──
function getDirectionStyle(direction: PredictionDirection) {
  switch (direction) {
    case "상승": return { icon: TrendingUp, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", barColor: "bg-red-500" };
    case "하락": return { icon: TrendingDown, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", barColor: "bg-blue-500" };
    case "변동성확대": return { icon: Activity, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", barColor: "bg-yellow-500" };
    default: return { icon: Minus, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30", barColor: "bg-slate-500" };
  }
}

function formatValue(value: number, unit: string): string {
  if (unit === "원/3.75g") return value.toLocaleString() + "원/돈";
  if (unit === "원" || unit === "원/돈" || unit === "원/리터" || unit === "원/kg") return value.toLocaleString() + "원";
  if (unit === "%") return value.toFixed(2) + "%";
  if (unit === "달러/온스" || unit === "달러/배럴" || unit === "달러/톤") return "$" + value.toLocaleString();
  if (unit === "pt" || unit === "지수") return value.toLocaleString();
  if (unit === "엔") return "¥" + value.toFixed(1);
  return value.toLocaleString() + unit;
}

function formatValueWithKRW(value: number, unit: string): string {
  const krwRate = 1445;
  const base = formatValue(value, unit);
  if (unit === "달러/온스" || unit === "달러/배럴" || unit === "달러/톤") {
    const krwValue = Math.round(value * krwRate);
    return `${base} (₩${krwValue.toLocaleString()})`;
  }
  return base;
}

function formatTargetRangeWithKRW(low: number, high: number, unit: string): string {
  const krwRate = 1445;
  const base = `${formatValue(low, unit)} ~ ${formatValue(high, unit)}`;
  if (unit === "달러/온스" || unit === "달러/배럴" || unit === "달러/톤") {
    const lowKRW = Math.round(low * krwRate);
    const highKRW = Math.round(high * krwRate);
    return `${base}\n(₩${lowKRW.toLocaleString()} ~ ₩${highKRW.toLocaleString()})`;
  }
  return base;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function getRecommendationBadge(rec: string) {
  switch (rec) {
    case "적극매수": return "bg-red-600/20 text-red-300 border-red-500/30";
    case "매수": return "bg-emerald-600/20 text-emerald-300 border-emerald-500/30";
    case "보유": return "bg-slate-600/20 text-slate-300 border-slate-500/30";
    case "비중축소": return "bg-orange-600/20 text-orange-300 border-orange-500/30";
    case "매도": return "bg-blue-600/20 text-blue-300 border-blue-500/30";
    default: return "bg-slate-600/20 text-slate-300 border-slate-500/30";
  }
}

// ── Collapsible Section component ──
function CollapsibleSection({ title, icon: Icon, iconColor, badge, defaultOpen = false, children }: {
  title: string; icon: React.ElementType; iconColor: string; badge?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-600 transition-colors text-left"
      >
        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
        <span className="text-base font-bold text-white flex-1">{title}</span>
        {badge}
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

// ── Main Component ──
export default function PredictionsPage() {
  const [expandedPreds, setExpandedPreds] = useState<Set<string>>(new Set());

  const togglePred = (id: string) => {
    setExpandedPreds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Nav */}
      <nav className="flex flex-wrap gap-2 mb-6">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            {link.label}<ChevronRight className="w-3 h-3" />
          </Link>
        ))}
      </nav>

      {/* ── 1. Hero (compact 3 lines) ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-purple-400 text-sm font-medium mb-2">
          <Brain className="w-4 h-4 animate-pulse" />
          <span>AI 예측 통계 확률</span>
          <span className="text-xs text-slate-500 ml-2">3일 주기 갱신</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">AI가 예측하는 자산 방향</h1>
        <p className="text-slate-400 text-sm">
          {performance.totalPredictions}건 예측 · 적중률{" "}
          <strong className="text-white">{performance.accuracyRate}%</strong>{" "}
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${grade.grade.startsWith("A") ? "bg-emerald-500/20 text-emerald-400" : grade.grade.startsWith("B") ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"}`}>
            {grade.grade}
          </span>
        </p>
        <p className="text-slate-400 text-sm mt-1">
          {expertCount.toLocaleString()}명 경제전문가 및 기관의 과거 적중률을 분석하고, 적중률이 높은 전문가에게 더 높은 가중치를 부여하여 AI가 확률적으로 미래를 예측합니다.
        </p>
      </div>

      {/* ── 2. Stats bar (5 cards in one row) ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-3.5 h-3.5 text-purple-400" /><span className="text-xs text-slate-400">사이클</span></div>
          <p className="text-lg font-bold text-white">#{cycle.cycleNumber} <span className="text-[10px] text-slate-500 font-normal">{formatDate(cycle.startDate)}~{formatDate(cycle.endDate)}</span></p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1"><Target className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-slate-400">적중률</span></div>
          <p className={`text-lg font-bold ${performance.accuracyRate >= 70 ? "text-emerald-400" : performance.accuracyRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>
            {performance.accuracyRate}% <span className="text-[10px] text-slate-500 font-normal">{performance.correct}/{performance.totalPredictions}</span>
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-slate-400">적중/부분</span></div>
          <p className="text-lg font-bold text-emerald-400">{performance.correct} <span className="text-slate-500 font-normal">/ {performance.partial}</span></p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1"><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-xs text-slate-400">불일치</span></div>
          <p className="text-lg font-bold text-red-400">{performance.incorrect} <span className="text-[10px] text-slate-500 font-normal">{performance.totalCycles}사이클</span></p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1"><RefreshCw className="w-3.5 h-3.5 text-cyan-400" /><span className="text-xs text-slate-400">다음 갱신</span></div>
          <p className="text-lg font-bold text-white">{nextInfo.daysRemaining}일 <span className="text-[10px] text-slate-500 font-normal">{formatDateFull(nextInfo.nextCycleDate)}</span></p>
        </div>
      </div>

      {/* ── 3. Summary (3 direction counts) ── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
          <TrendingUp className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-400">{bullPredictions.length}</p>
          <p className="text-[10px] text-slate-400">상승 예측</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
          <TrendingDown className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-blue-400">{bearPredictions.length}</p>
          <p className="text-[10px] text-slate-400">하락 예측</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
          <Activity className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-400">{neutralPredictions.length}</p>
          <p className="text-[10px] text-slate-400">보합/변동성</p>
        </div>
      </div>

      {/* ── 4. Prediction Cards (grouped by direction) ── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            사이클 #{cycle.cycleNumber} AI 예측
            <span className="text-xs text-slate-500 font-normal ml-1">{formatDateFull(cycle.startDate)}~{formatDateFull(cycle.endDate)}</span>
          </h2>
          <div className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />LIVE
          </div>
        </div>

        {directionGroups.map((group) => {
          if (group.predictions.length === 0) return null;
          const GroupIcon = group.accent.icon;
          return (
            <div key={group.key} className="mb-6">
              <div className={`flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg ${group.accent.bg} border ${group.accent.border}`}>
                <GroupIcon className={`w-4 h-4 ${group.accent.text}`} />
                <span className={`text-sm font-bold ${group.accent.text}`}>{group.title}</span>
                <span className={`text-xs ${group.accent.text}`}>({group.predictions.length})</span>
              </div>

              <div className="space-y-1.5">
                {group.predictions.map((pred) => {
                  const asset = assetMap.get(pred.assetId);
                  if (!asset) return null;
                  const style = getDirectionStyle(pred.direction);
                  const DirIcon = style.icon;
                  const isExpanded = expandedPreds.has(pred.id);
                  const industryETF = etfByIndustry.get(pred.assetId);
                  const relatedTickers = asset.relatedETFTickers || [];
                  const relatedETFs = relatedTickers.map((t: string) => getETFByTicker(t)).filter(Boolean);
                  const etfCount = industryETF ? industryETF.etfs.length : relatedETFs.length;

                  return (
                    <div key={pred.id}>
                      {/* ── Compact card (collapsed) ── */}
                      <div
                        className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-600 transition-colors"
                        onClick={() => togglePred(pred.id)}
                      >
                        <DirIcon className={`w-5 h-5 ${style.color} flex-shrink-0`} />
                        <span className="text-sm font-bold text-white flex-1 truncate">{asset.name}</span>
                        <span className={`text-sm font-bold ${style.color} flex-shrink-0`}>{pred.direction} {pred.probability}%</span>
                        {pred.startPrice > 0 && (
                          <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:inline">
                            시작 {formatValue(pred.startPrice, asset.unit)} → 현재 <span className="text-white font-semibold">{formatValue(asset.currentValue, asset.unit)}</span> → 목표 {pred.targetRange ? formatValue(pred.targetRange.high, asset.unit) : "—"}
                          </span>
                        )}
                        {etfCount > 0 && (
                          <span className="text-[10px] bg-emerald-600/20 text-emerald-300 px-1.5 py-0.5 rounded flex-shrink-0">ETF {etfCount}</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>

                      {/* ── Expanded details ── */}
                      {isExpanded && (
                        <div className="bg-slate-900/50 border border-slate-800 border-t-0 rounded-b-lg p-4 -mt-1 space-y-3">
                          {/* Price info: 시작가 → 현재가 → 목표가 */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            {pred.startPrice > 0 && (
                              <div className="bg-slate-800/50 rounded-lg p-2.5">
                                <span className="text-[10px] text-slate-500 block mb-0.5">시작가 (3월 8일)</span>
                                <span className="font-bold text-white">{formatValueWithKRW(pred.startPrice, asset.unit)}</span>
                              </div>
                            )}
                            <div className="bg-slate-800/50 rounded-lg p-2.5">
                              <span className="text-[10px] text-slate-500 block mb-0.5">현재가 (오늘)</span>
                              <span className="font-bold text-white">{formatValueWithKRW(asset.currentValue, asset.unit)}</span>
                              <span className={`text-xs ml-1.5 ${asset.changePercent > 0 ? "text-red-400" : asset.changePercent < 0 ? "text-blue-400" : "text-slate-400"}`}>
                                {asset.changePercent > 0 ? "+" : ""}{asset.changePercent.toFixed(1)}%
                              </span>
                            </div>
                            {pred.targetRange && (
                              <div className="bg-slate-800/50 rounded-lg p-2.5">
                                <span className="text-[10px] text-slate-500 block mb-0.5">목표가 (3월 11일)</span>
                                <span className="font-bold text-white whitespace-pre-line">{formatTargetRangeWithKRW(pred.targetRange.low, pred.targetRange.high, asset.unit)}</span>
                              </div>
                            )}
                          </div>

                          {/* Probability bar */}
                          <div>
                            <div className="flex w-full h-2 rounded-full overflow-hidden bg-slate-800">
                              <div className={`${style.barColor} transition-all duration-700`} style={{ width: `${pred.probability}%` }} />
                            </div>
                            <div className="flex justify-between mt-0.5 text-[10px] text-slate-500">
                              <span>0%</span><span>신뢰도 {pred.confidence}%</span><span>100%</span>
                            </div>
                          </div>

                          {/* Rationale */}
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <p className="text-sm text-slate-300 leading-relaxed">{pred.rationale}</p>
                          </div>

                          {/* Key evidence */}
                          <div>
                            <p className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1"><FileText className="w-3 h-3" /> 핵심 근거</p>
                            <ul className="space-y-1">
                              {pred.keyEvidence.map((ev, i) => (
                                <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                                  <span className="text-purple-400 mt-0.5 flex-shrink-0">-</span>{ev}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Sources */}
                          {pred.sources.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1"><Eye className="w-3 h-3" /> 출처</p>
                              <div className="flex flex-wrap gap-1.5">
                                {pred.sources.map((src, i) => (
                                  <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{src.title} ({src.date})</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Scenario */}
                          <div className="bg-purple-900/10 border border-purple-800/20 rounded-lg p-3">
                            <p className="text-xs font-semibold text-purple-300 mb-1">시나리오</p>
                            <p className="text-xs text-slate-400 leading-relaxed">{pred.scenario}</p>
                          </div>

                          {/* Expert Stats — 10만명 전문가 참여 통계 */}
                          {pred.expertStats && (
                            <div className="bg-amber-900/10 border border-amber-800/20 rounded-lg p-3">
                              <p className="text-xs font-semibold text-amber-300 mb-2 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                전문가 참여 통계 ({pred.expertStats.totalParticipants.toLocaleString()}명 분석)
                              </p>
                              <div className="grid grid-cols-3 gap-2 mb-2">
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                                  <p className="text-[10px] text-slate-500">상승 예측</p>
                                  <p className="text-sm font-bold text-red-400">{pred.expertStats.bullCount.toLocaleString()}명</p>
                                  <p className="text-[10px] text-slate-400">평균 적중률 <span className="font-bold text-red-300">{pred.expertStats.avgAccuracyOfBull}%</span></p>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                                  <p className="text-[10px] text-slate-500">하락 예측</p>
                                  <p className="text-sm font-bold text-blue-400">{pred.expertStats.bearCount.toLocaleString()}명</p>
                                  <p className="text-[10px] text-slate-400">평균 적중률 <span className="font-bold text-blue-300">{pred.expertStats.avgAccuracyOfBear}%</span></p>
                                </div>
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 text-center">
                                  <p className="text-[10px] text-slate-500">보합/변동성</p>
                                  <p className="text-sm font-bold text-yellow-400">{pred.expertStats.neutralCount.toLocaleString()}명</p>
                                  <p className="text-[10px] text-slate-400">평균 적중률 <span className="font-bold text-yellow-300">{pred.expertStats.avgAccuracyOfNeutral}%</span></p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2">
                                <div className="flex items-center gap-2">
                                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="text-[10px] text-slate-400">적중률 상위 전문가 다수 방향</span>
                                </div>
                                <span className={`text-xs font-bold ${
                                  pred.expertStats.topAccuracyDirection === "상승" ? "text-red-400" :
                                  pred.expertStats.topAccuracyDirection === "하락" ? "text-blue-400" : "text-yellow-400"
                                }`}>
                                  {pred.expertStats.topAccuracyDirection}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center justify-between bg-slate-800/50 rounded-lg p-2">
                                <div className="flex items-center gap-2">
                                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-[10px] text-slate-400">적중률 가중 확률 (AI 최종 근거)</span>
                                </div>
                                <span className="text-xs font-bold text-emerald-400">{pred.expertStats.weightedProbability}%</span>
                              </div>
                            </div>
                          )}

                          {/* Industry ETFs */}
                          {industryETF && (
                            <div className="border-t border-slate-800 pt-3">
                              <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                                <BarChart3 className="w-3.5 h-3.5" />관련 국내 ETF ({industryETF.industryName})
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {industryETF.etfs.map((etf) => {
                                  const etfStyle = getDirectionStyle(etf.direction as PredictionDirection);
                                  const EtfIcon = etfStyle.icon;
                                  return (
                                    <div key={etf.ticker} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
                                      <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <div>
                                          <p className="text-xs font-bold text-white">{etf.nameKr}</p>
                                          <p className="text-[10px] text-slate-500">{etf.name} · {etf.ticker}</p>
                                        </div>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${getRecommendationBadge(etf.aiRecommendation)}`}>
                                          {etf.aiRecommendation}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <EtfIcon className={`w-3.5 h-3.5 ${etfStyle.color}`} />
                                        <span className={`text-xs font-bold ${etfStyle.color}`}>{etf.direction}</span>
                                        <span className="text-[10px] text-slate-500">신뢰도 {etf.confidence}%</span>
                                      </div>
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] text-slate-400">현재가</span>
                                        <span className="text-xs font-bold text-white">₩{etf.currentPrice.toLocaleString()}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                                        <div className="bg-slate-900/50 rounded px-2 py-1">
                                          <p className="text-[10px] text-slate-500">3일</p>
                                          <p className="text-[10px] font-bold text-white">{etf.expectedReturn3d}</p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded px-2 py-1">
                                          <p className="text-[10px] text-slate-500">1개월</p>
                                          <p className="text-[10px] font-bold text-white">{etf.expectedReturn1m}</p>
                                        </div>
                                      </div>
                                      <p className="text-[10px] text-slate-400 leading-relaxed">{etf.rationale}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Non-industry related ETFs */}
                          {!industryETF && relatedETFs.length > 0 && (
                            <div className="border-t border-slate-800 pt-3">
                              <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                                <BarChart3 className="w-3.5 h-3.5" />관련 국내 ETF
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {relatedETFs.map((etf: any) => (
                                  <div key={etf.ticker} className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2">
                                    <div>
                                      <p className="text-xs font-bold text-white">{etf.nameKr}</p>
                                      <p className="text-[10px] text-slate-500">{etf.ticker} · {etf.provider}</p>
                                    </div>
                                    {etf.isRecommended && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-bold">AI추천</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* ── 5. AI Scorecard (collapsible) ── */}
      <CollapsibleSection
        title="AI 성적표"
        icon={Target}
        iconColor="text-emerald-400"
        badge={
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${grade.grade.startsWith("A") ? "bg-emerald-500/20 text-emerald-400" : grade.grade.startsWith("B") ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"}`}>
            {grade.grade} · {performance.accuracyRate}%
          </span>
        }
      >
        {/* Scorecard stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {[
            { icon: BarChart3, color: "text-slate-400", val: performance.totalPredictions, label: `총 예측 · ${resolvedTotal} 완료` },
            { icon: Target, color: "text-emerald-400", val: `${performance.accuracyRate}%`, label: "적중률" },
            { icon: Brain, color: "text-purple-400", val: performance.totalCycles, label: "완료 사이클" },
            { icon: CheckCircle, color: "text-emerald-400", val: performance.correct, label: "적중" },
            { icon: Flame, color: "text-orange-400", val: streak, label: "연속 적중" },
            { icon: Trophy, color: "text-yellow-400", val: bestStreak, label: "최고 기록" },
          ].map((s, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <s.icon className={`w-3 h-3 ${s.color} mb-1`} />
              <p className="text-lg font-bold text-white">{s.val}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Donut + Cycle trend */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          {/* Cycle trend */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">사이클별 적중률 추이</h3>
            </div>
            <div className="space-y-2">
              {performance.recentCycles.map((c, idx) => {
                const barColor = c.accuracyRate >= 80 ? "bg-emerald-500" : c.accuracyRate >= 60 ? "bg-blue-500" : c.accuracyRate >= 40 ? "bg-yellow-500" : "bg-red-500";
                return (
                  <div key={c.cycleId} className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500 w-24 flex-shrink-0 font-mono text-[11px]">#{idx + 1} {formatDate(c.startDate)}~{formatDate(c.endDate)}</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-4 relative overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${c.accuracyRate}%` }} />
                      <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold text-white/80">{c.accuracyRate}%</span>
                    </div>
                    <span className="text-slate-600 w-10 text-right text-[10px]">{c.predictions}건</span>
                  </div>
                );
              })}
            </div>
            {performance.recentCycles.length >= 2 && (() => {
              const first = performance.recentCycles[0];
              const last = performance.recentCycles[performance.recentCycles.length - 1];
              const diff = last.accuracyRate - first.accuracyRate;
              const improving = diff > 0;
              return (
                <div className={`mt-3 pt-2 border-t border-slate-800 flex items-center gap-2 text-xs ${improving ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-slate-400"}`}>
                  {improving ? <TrendingUp className="w-3.5 h-3.5" /> : diff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  <span>사이클 #1 대비 {improving ? "+" : ""}{diff}%p {improving ? "개선" : diff < 0 ? "하락" : "유지"}</span>
                </div>
              );
            })()}
          </div>

          {/* Donut */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">결과 분포</h3>
            </div>
            <div className="flex justify-center mb-4">
              <div className="relative w-36 h-36">
                <div className="w-full h-full rounded-full" style={{ background: segmentTotal > 0 ? conicGradient : "#1e293b" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-slate-900 flex flex-col items-center justify-center">
                    <p className="text-xl font-bold text-white">{performance.accuracyRate}%</p>
                    <p className="text-[9px] text-slate-400">적중률</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {segments.map((seg) => {
                const pct = segmentTotal > 0 ? Math.round((seg.count / segmentTotal) * 100) : 0;
                return (
                  <div key={seg.key} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-[11px] text-slate-300">{seg.label} {seg.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Per-asset accuracy */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">자산별 적중률</h3>
          </div>
          {performance.byAsset.length > 0 ? (
            <div className="space-y-2">
              {performance.byAsset.map((a, idx) => {
                const barColor = a.accuracyRate >= 80 ? "bg-emerald-500" : a.accuracyRate >= 60 ? "bg-blue-500" : a.accuracyRate >= 40 ? "bg-yellow-500" : "bg-red-500";
                return (
                  <div key={a.assetId} className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500 w-4 text-right">{idx + 1}</span>
                    <span className="text-white font-semibold w-20 truncate">{a.assetName}</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-3 relative overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${a.accuracyRate}%` }} />
                    </div>
                    <span className="text-white font-bold w-10 text-right">{a.accuracyRate}%</span>
                    <span className="text-slate-500 w-20 text-right text-[10px]">
                      <span className="text-emerald-400">{a.correct}</span>/{a.predictions}건
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">아직 평가된 데이터가 없습니다.</p>
          )}
        </div>

        {/* AI self-improvement */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-purple-300 mb-2">AI 자기개선 메커니즘</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-400 leading-relaxed">
                <div><span className="text-purple-300 font-semibold">1. 전문가 가중치 재조정</span> — 적중률 기반 가중치 상/하향. 상위 10명 평균 적중률 78%.</div>
                <div><span className="text-purple-300 font-semibold">2. 패턴 학습</span> — 팩터-자산 방향 연결 과거 학습. {performance.totalPredictions}건 데이터.</div>
                <div><span className="text-purple-300 font-semibold">3. 신뢰도 보정</span> — 확률 예측 vs 실제 결과 캘리브레이션.</div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── 6. News Verification (collapsible) ── */}
      <CollapsibleSection
        title="실시간 뉴스 검증"
        icon={Zap}
        iconColor="text-yellow-400"
        badge={
          <span className="flex items-center gap-1 text-xs text-green-400"><RefreshCw className="w-3 h-3" />자동 검증 중</span>
        }
      >
        <div className="space-y-1.5">
          {verificationLogs.map((log) => {
            const impactColor = log.impact === "supports" ? "text-emerald-400" : log.impact === "contradicts" ? "text-red-400" : "text-slate-400";
            const impactBg = log.impact === "supports" ? "bg-emerald-500/10 border-emerald-500/20" : log.impact === "contradicts" ? "bg-red-500/10 border-red-500/20" : "bg-slate-500/10 border-slate-500/20";
            const impactLabel = log.impact === "supports" ? "예측 지지" : log.impact === "contradicts" ? "예측 역풍" : "중립";
            const asset = assetMap.get(log.assetId);
            return (
              <div key={log.id} className={`rounded-lg border p-2.5 ${impactBg}`}>
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 flex-shrink-0 ${impactColor}`}>
                    {log.impact === "supports" ? <ArrowUpRight className="w-3.5 h-3.5" /> : log.impact === "contradicts" ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                      {asset && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{asset.name}</span>}
                      <span className={`text-[10px] font-bold ${impactColor}`}>{impactLabel}</span>
                    </div>
                    <p className="text-xs font-medium text-white">{log.newsHeadline}</p>
                    <p className="text-[11px] text-slate-400">{log.summary}</p>
                    <p className="text-[10px] text-slate-500">{log.newsSource}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* ── 7. Past Cycle Results (collapsible) ── */}
      <CollapsibleSection title="과거 사이클 예측 결과" icon={BarChart3} iconColor="text-cyan-400">
        <div className="space-y-2">
          {completedCycles.slice().reverse().map((pastCycle) => {
            const results = getCycleResults(pastCycle.id);
            const correct = results.filter((r) => r.result === "적중").length;
            const partial = results.filter((r) => r.result === "부분적중").length;
            const total = results.length;
            const rate = total > 0 ? Math.round(((correct + partial * 0.5) / total) * 100) : 0;
            return (
              <div key={pastCycle.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-white">
                    #{pastCycle.cycleNumber}
                    <span className="text-xs text-slate-500 font-normal ml-2">{formatDateFull(pastCycle.startDate)}~{formatDateFull(pastCycle.endDate)}</span>
                  </p>
                  <span className={`text-base font-bold ${rate >= 70 ? "text-emerald-400" : rate >= 50 ? "text-yellow-400" : "text-red-400"}`}>{rate}%</span>
                </div>
                <div className="space-y-1">
                  {results.map((r) => {
                    const asset = assetMap.get(r.assetId);
                    const resultStyle = r.result === "적중" ? "text-emerald-400 bg-emerald-500/10" : r.result === "부분적중" ? "text-yellow-400 bg-yellow-500/10" : "text-red-400 bg-red-500/10";
                    const ResultIcon = r.result === "적중" ? CheckCircle : r.result === "부분적중" ? AlertCircle : XCircle;
                    return (
                      <div key={r.predictionId} className="flex items-center gap-2 text-xs">
                        <ResultIcon className={`w-3 h-3 flex-shrink-0 ${r.result === "적중" ? "text-emerald-400" : r.result === "부분적중" ? "text-yellow-400" : "text-red-400"}`} />
                        <span className="text-slate-300 w-16 flex-shrink-0 truncate">{asset?.name || r.assetId}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${resultStyle}`}>{r.result}</span>
                        <span className="text-slate-500 flex-1 truncate">{r.actualOutcome}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* ── 8. AI Transparency (compact) ── */}
      <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-purple-300 mb-1.5">AI 예측 원칙</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-purple-200/70">
              <span><strong className="text-purple-200">3일 주기</strong> — 매 3일 예측 발행 + 결과 평가</span>
              <span><strong className="text-purple-200">근거 기반</strong> — 출처 + 논리 명시</span>
              <span><strong className="text-purple-200">실시간 검증</strong> — 60분마다 뉴스 대조</span>
              <span><strong className="text-purple-200">완전 공개</strong> — 틀린 예측도 유지</span>
              <span><strong className="text-purple-200">전문가 가중</strong> — 적중률 기반 가중치</span>
              <span><strong className="text-purple-200">자기학습</strong> — 매 사이클 가중치 재조정</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 9. Cross-links ── */}
      <nav className="flex flex-wrap gap-2 justify-center">
        {[
          { href: "/investment", label: "투자 전략" },
          { href: "/experts", label: "전문가" },
          { href: "/assets", label: "자산 목록" },
          { href: "/simulation", label: "시뮬레이션" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            {link.label}<ChevronRight className="w-3 h-3" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
