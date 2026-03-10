"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  DollarSign,
  BarChart3,
  Target,
  Clock,
  ExternalLink,
  Info,
  Zap,
  RefreshCw,
  Calendar,
  Wallet,
  ChevronRight,
  Brain,
  Activity,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
} from "lucide-react";
import {
  etfRecommendations,
  investmentScenarios,
  timingSignals,
  getETFsByCategory,
  getETFsByRegion,
  getCurrentScenario,
  getActiveAlerts,
  getPortfolioAllocation,
  updateMeta,
  replaceTickerWithName,
  getETFNameByTicker,
} from "@/data/investmentStrategy";
import {
  getCurrentCycle,
  computeCyclePerformance,
  industryETFPredictions,
  getTopETFRecommendations,
} from "@/data/aiPredictionCycles";
import { getIssueById } from "@/data/issues";

// ── Module-level data (computed once) ──
const activeAlerts = getActiveAlerts();
const currentScenario = getCurrentScenario();
const portfolioAllocation = getPortfolioAllocation();
const totalWeight = portfolioAllocation.reduce((sum, a) => sum + a.weight, 0);
const cycle = getCurrentCycle();
const performance = computeCyclePerformance();
const topETFs = getTopETFRecommendations();

// ── Style helpers ──
function getSeverityStyle(severity: string) {
  switch (severity) {
    case "극심": return { bg: "bg-red-900/40", border: "border-red-600/50", text: "text-red-300", badge: "bg-red-600/30 text-red-300 border border-red-500/40", icon: "text-red-400" };
    case "위험": return { bg: "bg-orange-900/30", border: "border-orange-600/40", text: "text-orange-300", badge: "bg-orange-600/30 text-orange-300 border border-orange-500/40", icon: "text-orange-400" };
    case "경계": return { bg: "bg-yellow-900/25", border: "border-yellow-600/35", text: "text-yellow-300", badge: "bg-yellow-600/25 text-yellow-300 border border-yellow-500/35", icon: "text-yellow-400" };
    default: return { bg: "bg-blue-900/25", border: "border-blue-600/35", text: "text-blue-300", badge: "bg-blue-600/25 text-blue-300 border border-blue-500/35", icon: "text-blue-400" };
  }
}
function getCategoryStyle(cat: string) {
  switch (cat) {
    case "방어형": return "bg-blue-600/20 text-blue-300 border border-blue-500/30";
    case "공격형": return "bg-red-600/20 text-red-300 border border-red-500/30";
    case "헤지형": return "bg-amber-600/20 text-amber-300 border border-amber-500/30";
    default: return "bg-slate-600/20 text-slate-300 border border-slate-500/30";
  }
}
function getCategoryColor(cat: string) {
  switch (cat) {
    case "방어형": return "bg-blue-500";
    case "공격형": return "bg-red-500";
    case "헤지형": return "bg-amber-500";
    default: return "bg-slate-500";
  }
}
function getRiskBadge(r: string) {
  switch (r) {
    case "낮음": return "bg-green-600/20 text-green-300 border border-green-500/30";
    case "보통": return "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30";
    case "높음": return "bg-orange-600/20 text-orange-300 border border-orange-500/30";
    case "매우높음": return "bg-red-600/20 text-red-300 border border-red-500/30";
    default: return "bg-slate-600/20 text-slate-300 border border-slate-500/30";
  }
}
function getStatusStyle(s: string) {
  switch (s) {
    case "충족": return { bg: "bg-emerald-900/30", text: "text-emerald-300", badge: "bg-emerald-600/25 text-emerald-300 border border-emerald-500/35", dot: "bg-emerald-400" };
    case "근접": return { bg: "bg-yellow-900/25", text: "text-yellow-300", badge: "bg-yellow-600/25 text-yellow-300 border border-yellow-500/35", dot: "bg-yellow-400" };
    default: return { bg: "bg-slate-800/50", text: "text-slate-400", badge: "bg-slate-600/25 text-slate-400 border border-slate-500/35", dot: "bg-slate-500" };
  }
}
function getSignalTypeBadge(t: string) {
  switch (t) {
    case "진입": return "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30";
    case "청산": return "bg-red-600/20 text-red-300 border border-red-500/30";
    case "비중조절": return "bg-amber-600/20 text-amber-300 border border-amber-500/30";
    default: return "bg-slate-600/20 text-slate-300 border border-slate-500/30";
  }
}
function getTimeframeLabelColor(l: string) {
  switch (l) {
    case "초단기": return "text-cyan-400 bg-cyan-900/30 border-cyan-700/40";
    case "단기": return "text-blue-400 bg-blue-900/30 border-blue-700/40";
    case "중장기": return "text-purple-400 bg-purple-900/30 border-purple-700/40";
    case "장기": return "text-pink-400 bg-pink-900/30 border-pink-700/40";
    default: return "text-slate-400 bg-slate-800/50 border-slate-700/40";
  }
}
function getDirectionStyle(d: string) {
  switch (d) {
    case "상승": return { text: "text-emerald-400", bg: "bg-emerald-600/20", border: "border-emerald-500/30" };
    case "하락": return { text: "text-red-400", bg: "bg-red-600/20", border: "border-red-500/30" };
    case "보합": return { text: "text-yellow-400", bg: "bg-yellow-600/20", border: "border-yellow-500/30" };
    case "변동성확대": return { text: "text-purple-400", bg: "bg-purple-600/20", border: "border-purple-500/30" };
    default: return { text: "text-slate-400", bg: "bg-slate-600/20", border: "border-slate-500/30" };
  }
}
function getDirectionIcon(d: string) {
  switch (d) {
    case "상승": return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
    case "하락": return <ArrowDownRight className="w-4 h-4 text-red-400" />;
    case "보합": return <Minus className="w-4 h-4 text-yellow-400" />;
    case "변동성확대": return <Activity className="w-4 h-4 text-purple-400" />;
    default: return <Minus className="w-4 h-4 text-slate-400" />;
  }
}
function getRecommendationBadge(rec: string) {
  switch (rec) {
    case "적극매수": return "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40";
    case "매수": return "bg-green-600/25 text-green-300 border border-green-500/35";
    case "보유": return "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30";
    case "비중축소": return "bg-orange-600/20 text-orange-300 border border-orange-500/30";
    case "매도": return "bg-red-600/25 text-red-300 border border-red-500/35";
    default: return "bg-slate-600/20 text-slate-300 border border-slate-500/30";
  }
}

// ── Tabs ──
const tabs = ["AI ETF 추천", "포트폴리오 & 시나리오", "ETF 상세", "리스크 관리"] as const;
type Tab = (typeof tabs)[number];

export default function InvestmentPage() {
  const [activeTab, setActiveTab] = useState<Tab>(tabs[0]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ── Compact Header ── */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-1">
              <Brain className="w-4 h-4" />
              <span>AI 예측 기반 투자 전략 & ETF 추천</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              AI 예측 기반 투자 전략 &amp; 국내 ETF 추천
            </h1>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs flex-shrink-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-400">최근:</span>
              <span className="text-white font-medium">{updateMeta.lastUpdate}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">다음:</span>
              <span className="text-emerald-400 font-medium">{updateMeta.nextUpdate}</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {updateMeta.updateCycle}일 주기 · {updateMeta.version}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cross Links ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { href: "/predictions", label: "AI 예측 대시보드", icon: <Brain className="w-4 h-4" />, desc: "3일 주기 예측 상세" },
          { href: "/weekly", label: "주간 브리핑", icon: <Calendar className="w-4 h-4" />, desc: "주간 시장 분석" },
          { href: "/scorecard", label: "예측 성적표", icon: <CheckCircle className="w-4 h-4" />, desc: "적중률 & 성과" },
          { href: "/experts", label: "전문가 전망", icon: <Target className="w-4 h-4" />, desc: "글로벌 전문가 의견" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-600 transition-all group">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-emerald-400">{link.icon}</span>
              <span className="text-sm font-medium text-white group-hover:text-emerald-300 transition-colors">{link.label}</span>
            </div>
            <p className="text-[10px] text-slate-500">{link.desc}</p>
          </Link>
        ))}
      </div>

      {/* ── Simulation Banner ── */}
      <Link href="/investment/simulation" className="block mb-6 group">
        <div className="bg-gradient-to-r from-emerald-900/40 to-blue-900/40 border border-emerald-700/40 rounded-2xl p-4 hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-6 h-6 text-emerald-400" />
              <div>
                <h2 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">ETF 모의투자 시작하기</h2>
                <p className="text-xs text-slate-400">회원가입 시 1,000만원 모의투자금 지급 · AI 추천 ETF 한정 투자</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
        </div>
      </Link>

      {/* ── Danger Alerts (always visible) ── */}
      {activeAlerts.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white">위험 경보</h2>
            <span className="text-xs bg-red-600/30 text-red-300 px-2 py-0.5 rounded-full border border-red-500/40">{activeAlerts.length}건 활성</span>
            <span className="text-xs bg-indigo-600/15 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/25">AI 예측 연동</span>
          </div>
          {activeAlerts.map((alert) => {
            const style = getSeverityStyle(alert.severity);
            return (
              <div key={alert.id} className={`${style.bg} ${style.border} border rounded-xl p-4`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 ${style.icon} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className={`font-bold ${style.text}`}>{alert.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${style.badge}`}>{alert.severity}</span>
                      <span className="text-xs text-slate-400">발생 확률 {alert.probability}%</span>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{alert.description}</p>
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-200">{replaceTickerWithName(alert.actionRequired)}</p>
                    </div>
                    {alert.impactedETFs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {alert.impactedETFs.map((etf) => (
                          <span key={etf.ticker} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                            {getETFNameByTicker(etf.ticker)}: <span className="text-red-300">{etf.impact}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className="flex border-b border-slate-800 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? "text-emerald-400 border-emerald-400"
                : "text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}

      {/* TAB 1: AI ETF 추천 */}
      {activeTab === "AI ETF 추천" && (
        <div>
          {/* Cycle info (one line) */}
          <div className="flex items-center gap-4 flex-wrap mb-6 bg-gradient-to-r from-indigo-900/20 to-slate-900 border border-indigo-700/25 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">사이클 #{cycle.cycleNumber}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                cycle.status === "active" ? "bg-emerald-600/25 text-emerald-300 border border-emerald-500/35" : "bg-slate-600/25 text-slate-400 border border-slate-500/35"
              }`}>{cycle.status === "active" ? "진행중" : "완료"}</span>
            </div>
            <span className="text-xs text-slate-400">{cycle.startDate} ~ {cycle.endDate}</span>
            <span className="text-xs text-slate-500">{cycle.predictions.length}개 자산 예측</span>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-emerald-400 font-bold">{performance.accuracyRate}% 적중률</span>
              <span className="text-[10px] text-slate-500">({performance.correct}적중 / {performance.totalPredictions}건)</span>
              <Link href="/predictions" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                상세 <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Top ETFs - compact table */}
          {topETFs && topETFs.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">AI 추천 TOP ETF</h3>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-500">
                      <th className="text-left px-4 py-2.5 font-medium">ETF</th>
                      <th className="text-center px-3 py-2.5 font-medium">방향</th>
                      <th className="text-right px-3 py-2.5 font-medium">3일수익</th>
                      <th className="text-right px-3 py-2.5 font-medium">1개월수익</th>
                      <th className="text-center px-3 py-2.5 font-medium">신뢰도</th>
                      <th className="text-center px-4 py-2.5 font-medium">추천</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topETFs.map((etf: any) => {
                      const ds = getDirectionStyle(etf.direction);
                      return (
                        <tr key={etf.ticker} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-4 py-3">
                            <span className="font-medium text-white">{etf.nameKr}</span>
                            <span className="text-[10px] text-slate-500 ml-2">{etf.name}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${ds.bg} ${ds.border} border`}>
                              {getDirectionIcon(etf.direction)}
                              <span className={ds.text}>{etf.direction}</span>
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-xs text-white">{etf.expectedReturn3d}</td>
                          <td className="px-3 py-3 text-right text-xs text-white">{etf.expectedReturn1m}</td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center gap-1.5 justify-center">
                              <div className="w-12 bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full rounded-full ${etf.confidence >= 70 ? "bg-emerald-500" : etf.confidence >= 50 ? "bg-yellow-500" : "bg-orange-500"}`} style={{ width: `${etf.confidence}%` }} />
                              </div>
                              <span className="text-[10px] text-slate-300">{etf.confidence}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${getRecommendationBadge(etf.aiRecommendation)}`}>{etf.aiRecommendation}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Industry-by-Industry ETF list (compact) */}
          <div className="space-y-4">
            {industryETFPredictions.map((industry) => {
              const aiPred = cycle.predictions.find((p) => p.assetId === industry.industryAssetId);
              const dirStyle = aiPred ? getDirectionStyle(aiPred.direction) : getDirectionStyle("보합");

              return (
                <div key={industry.industryAssetId} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  {/* Industry header row */}
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3 flex-wrap">
                    <h3 className="text-sm font-bold text-white">{industry.industryName}</h3>
                    {aiPred && (
                      <>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${dirStyle.bg} ${dirStyle.border} border`}>
                          {getDirectionIcon(aiPred.direction)}
                          <span className={`font-medium ${dirStyle.text}`}>{aiPred.direction}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">확률 {aiPred.probability}% · 신뢰도 {aiPred.confidence}%</span>
                      </>
                    )}
                    {aiPred && (
                      <Link href="/predictions" className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        예측 상세 <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  {/* ETF rows */}
                  <table className="w-full text-xs">
                    <tbody>
                      {industry.etfs.map((etf) => {
                        const eds = getDirectionStyle(etf.direction);
                        return (
                          <tr key={etf.ticker} className="border-b border-slate-800/40 last:border-b-0 hover:bg-slate-800/20">
                            <td className="px-4 py-2.5">
                              <span className="font-medium text-white text-sm">{etf.nameKr}</span>
                              <span className="text-[10px] text-slate-500 ml-1.5">{etf.currentPrice.toLocaleString()}원</span>
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${eds.bg} ${eds.border} border`}>
                                {getDirectionIcon(etf.direction)}
                                <span className={eds.text}>{etf.direction}</span>
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-right text-slate-300">{etf.expectedReturn3d}</td>
                            <td className="px-2 py-2.5 text-right text-slate-300">{etf.expectedReturn1m}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getRecommendationBadge(etf.aiRecommendation)}`}>{etf.aiRecommendation}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: 포트폴리오 & 시나리오 */}
      {activeTab === "포트폴리오 & 시나리오" && (
        <div>
          {/* Current Scenario + Portfolio side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">현재 기본 시나리오</h2>
                <span className="text-xs bg-indigo-600/15 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/25">AI 예측 연동</span>
              </div>
              {currentScenario && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-white">{currentScenario.name}</h3>
                    <span className="text-sm bg-blue-600/25 text-blue-300 px-3 py-1 rounded-full border border-blue-500/35">확률 {currentScenario.probability}%</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">{currentScenario.description}</p>
                  <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                    <p className="text-xs text-slate-500 mb-1">시장 영향</p>
                    <p className="text-sm text-slate-300">{currentScenario.marketImpact}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">투자 전략</p>
                    <p className="text-sm text-slate-300">{currentScenario.strategy}</p>
                  </div>
                  {currentScenario.keyTriggers.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 mb-2">핵심 트리거</p>
                      <div className="flex flex-wrap gap-2">
                        {currentScenario.keyTriggers.map((trigger, idx) => (
                          <span key={idx} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">{trigger}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white">포트폴리오 배분</h2>
                <span className="text-xs bg-indigo-600/15 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/25">AI 예측 연동</span>
              </div>
              <div className="space-y-4">
                {portfolioAllocation.map((alloc) => {
                  const barColor = getCategoryColor(alloc.category);
                  return (
                    <div key={alloc.category}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-300">{alloc.category}</span>
                        <span className="text-sm font-bold text-white">{alloc.weight}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div className={`${barColor} h-full rounded-full transition-all`} style={{ width: `${(alloc.weight / Math.max(totalWeight, 100)) * 100}%` }} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {alloc.etfs.map((etf) => (
                          <span key={etf.ticker} className="text-xs text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded">{etf.nameKr} ({etf.currentWeight}%)</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">총 배분 비중</span>
                  <span className="text-lg font-bold text-white">{totalWeight}%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">현금 비중: {Math.max(0, 100 - totalWeight)}% (방어적 대기자금)</p>
              </div>
            </div>
          </div>

          {/* Scenario Comparison */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">시나리오별 전략 비교</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {investmentScenarios.map((scenario) => {
                const isCurrent = currentScenario?.id === scenario.id;
                return (
                  <div key={scenario.id} className={`rounded-2xl p-5 border transition-all ${isCurrent ? "bg-blue-900/20 border-blue-600/40 ring-1 ring-blue-500/20" : "bg-slate-900 border-slate-800"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-white text-sm">{scenario.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCurrent ? "bg-blue-600/30 text-blue-300 border border-blue-500/40" : "bg-slate-700/50 text-slate-400 border border-slate-600/40"}`}>{scenario.probability}%</span>
                    </div>
                    {isCurrent && (
                      <span className="inline-block text-xs bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded mb-2 border border-blue-500/30">현재 기본 시나리오</span>
                    )}
                    <p className="text-xs text-slate-400 mb-3 line-clamp-3">{scenario.description}</p>
                    <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-slate-500 mb-1">전략</p>
                      <p className="text-xs text-slate-300 line-clamp-3">{scenario.strategy}</p>
                    </div>
                    {scenario.etfAllocation.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-1.5">ETF 배분</p>
                        <div className="space-y-1">
                          {scenario.etfAllocation.slice(0, 5).map((alloc) => {
                            const etfInfo = etfRecommendations.find((e) => e.ticker === alloc.ticker);
                            return (
                              <div key={alloc.ticker} className="flex items-center justify-between text-xs">
                                <span className="text-slate-300 truncate max-w-[120px]">{etfInfo?.nameKr || alloc.ticker}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">{alloc.weight}%</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    alloc.action === "매수" || alloc.action === "비중확대" ? "bg-emerald-600/20 text-emerald-300"
                                    : alloc.action === "매도" || alloc.action === "비중축소" ? "bg-red-600/20 text-red-300"
                                    : "bg-slate-600/20 text-slate-400"
                                  }`}>{alloc.action}</span>
                                </div>
                              </div>
                            );
                          })}
                          {scenario.etfAllocation.length > 5 && <p className="text-[10px] text-slate-500">+{scenario.etfAllocation.length - 5}개 더</p>}
                        </div>
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t border-slate-700/50">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{scenario.timeline}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ETF 상세 */}
      {activeTab === "ETF 상세" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">국내 상장 ETF 추천 목록</h2>
            <span className="text-xs bg-emerald-600/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">KRX 상장 전용</span>
          </div>

          <div className="mb-3">
            <p className="text-xs text-slate-500 mb-2">카테고리</p>
            <div className="flex flex-wrap gap-2">
              {["전체", "방어형", "공격형", "헤지형"].map((cat) => {
                const count = cat === "전체" ? etfRecommendations.length : getETFsByCategory(cat).length;
                return (
                  <span key={cat} className={`text-xs px-3 py-1.5 rounded-lg border cursor-default ${cat === "전체" ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30" : getCategoryStyle(cat)}`}>{cat} ({count})</span>
                );
              })}
            </div>
          </div>
          <div className="mb-6">
            <p className="text-xs text-slate-500 mb-2">투자 지역</p>
            <div className="flex flex-wrap gap-2">
              {["전체", "미국", "한국", "글로벌", "아시아"].map((region) => {
                const count = region === "전체" ? etfRecommendations.length : getETFsByRegion(region).length;
                return (
                  <span key={region} className="text-xs px-3 py-1.5 rounded-lg border bg-slate-800 text-slate-300 border-slate-700 cursor-default">{region} ({count})</span>
                );
              })}
            </div>
          </div>

          {/* ETF Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {etfRecommendations.map((etf) => {
              const relatedIssues = etf.relatedIssueIds
                .map((id) => { try { return getIssueById(id); } catch { return null; } })
                .filter(Boolean);

              return (
                <div key={etf.ticker} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-white">{etf.nameKr}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getCategoryStyle(etf.category)}`}>{etf.category}</span>
                      </div>
                      <p className="text-sm text-slate-400">{etf.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-emerald-400">{etf.currentWeight}%</span>
                      <p className="text-[10px] text-slate-500">추천 비중</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${getRiskBadge(etf.riskLevel)}`}>위험: {etf.riskLevel}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/15 text-emerald-300 border border-emerald-500/25">기대수익: {etf.expectedReturn}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/40">{etf.region}</span>
                  </div>

                  {/* Rationale */}
                  <div className="bg-slate-800/40 rounded-lg p-3 mb-3">
                    <p className="text-xs text-slate-500 mb-1">투자 근거</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{etf.rationale}</p>
                  </div>

                  {/* Timeframe Strategy */}
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      기간별 기대수익률 & 리스크
                    </p>
                    <div className="space-y-1.5">
                      {etf.timeframes.map((tf) => (
                        <div key={tf.label} className="bg-slate-800/40 rounded-lg p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getTimeframeLabelColor(tf.label)}`}>{tf.label}</span>
                              <span className="text-[10px] text-slate-500">{tf.period}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-emerald-400 font-medium">수익 {tf.expectedReturn}</span>
                              <span className="text-[10px] text-red-400 font-medium">리스크 {tf.maxRisk}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">{tf.strategy}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-emerald-900/15 rounded-lg p-2.5 border border-emerald-800/20">
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-medium">진입 타이밍</span>
                      </div>
                      <p className="text-[11px] text-slate-300">{etf.entryTiming}</p>
                    </div>
                    <div className="bg-red-900/15 rounded-lg p-2.5 border border-red-800/20">
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingDown className="w-3 h-3 text-red-400" />
                        <span className="text-[10px] text-red-400 font-medium">청산 타이밍</span>
                      </div>
                      <p className="text-[11px] text-slate-300">{etf.exitTiming}</p>
                    </div>
                  </div>

                  {/* Danger Signals */}
                  {etf.dangerSignals.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-slate-500 mb-1.5">위험 신호</p>
                      <div className="flex flex-wrap gap-1">
                        {etf.dangerSignals.map((signal, idx) => (
                          <span key={idx} className="text-[10px] bg-red-900/20 text-red-300 px-2 py-0.5 rounded border border-red-800/30">{signal}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Issues */}
                  {relatedIssues.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                      <p className="text-[10px] text-slate-500 mb-1.5">관련 이슈</p>
                      <div className="flex flex-wrap gap-1.5">
                        {relatedIssues.map((issue: any) => (
                          <Link key={issue.id} href={`/issues/${issue.id}`} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50 hover:border-blue-500/30 transition-all">
                            <ExternalLink className="w-2.5 h-2.5" />
                            {issue.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: 리스크 관리 */}
      {activeTab === "리스크 관리" && (
        <div>
          {/* Timing Signals */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-white">매매 타이밍 신호</h2>
              <span className="text-xs bg-indigo-600/15 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/25">AI 예측 연동</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {timingSignals.map((signal) => {
                const status = getStatusStyle(signal.currentStatus);
                return (
                  <div key={signal.id} className={`${status.bg} border border-slate-800 rounded-xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getSignalTypeBadge(signal.type)}`}>{signal.type}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.badge}`}>{signal.currentStatus}</span>
                    </div>
                    <p className="text-sm font-medium text-white mb-1">{signal.condition}</p>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Info className="w-3 h-3 text-slate-500" />
                      <p className="text-xs text-slate-400">{signal.indicator}</p>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{replaceTickerWithName(signal.description)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Management */}
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">리스크 관리 가이드</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Position Sizing */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">포지션 사이징</h3>
              </div>
              <div className="space-y-3">
                {[
                  { level: "낮음", size: "15~25%", desc: "코어 포지션, 장기 보유 가능", color: "text-green-400" },
                  { level: "중간", size: "10~15%", desc: "전술적 배분, 분할 매수 권장", color: "text-yellow-400" },
                  { level: "높음", size: "5~10%", desc: "위성 포지션, 손절 필수 설정", color: "text-orange-400" },
                  { level: "매우높음", size: "3~5%", desc: "투기적 배분, 단기 트레이딩만", color: "text-red-400" },
                ].map((item) => (
                  <div key={item.level} className="bg-slate-800/40 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${item.color}`}>위험 {item.level}</span>
                      <span className="text-xs text-white font-medium">{item.size}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stop-Loss */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-white">손절 가이드라인</h3>
              </div>
              <div className="space-y-3">
                {[
                  { type: "방어형 ETF", stopLoss: "-5% ~ -7%", desc: "낮은 변동성, 넓은 손절폭 허용" },
                  { type: "공격형 ETF", stopLoss: "-7% ~ -10%", desc: "높은 변동성 감안, 트레일링 스탑 활용" },
                  { type: "헤지형 ETF", stopLoss: "-10% ~ -15%", desc: "포트폴리오 보험 성격, 만기 관리 중요" },
                  { type: "인버스/레버리지", stopLoss: "-5% (절대값)", desc: "단기 트레이딩 전용, 빠른 손절 필수" },
                ].map((item) => (
                  <div key={item.type} className="bg-slate-800/40 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-300">{item.type}</span>
                      <span className="text-xs text-red-400 font-medium">{item.stopLoss}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Principles */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">핵심 원칙</h3>
              </div>
              <div className="space-y-2.5">
                {[
                  { icon: "1", title: "분산 투자 필수", desc: "단일 ETF에 포트폴리오 30% 이상 집중 금지. 지역/자산군/전략별 분산." },
                  { icon: "2", title: "단계적 진입", desc: "목표 비중의 30%씩 3회 분할 매수. 급등 시 추격 매수 금지." },
                  { icon: "3", title: "시나리오 전환 대응", desc: "기본 시나리오 변경 시 2주 이내 리밸런싱 완료." },
                  { icon: "4", title: "현금 비중 유지", desc: "최소 10~20% 현금 보유. 급락 시 기회 포착용 대기 자금." },
                  { icon: "5", title: "감정 배제", desc: "공포/탐욕 지수 극단 시 역발상 진입. 뉴스 기반 충동 매매 금지." },
                ].map((item) => (
                  <div key={item.icon} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-600/20 text-emerald-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">{item.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-white">{item.title}</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer Disclaimer ── */}
      <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Info className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-400">투자 유의사항</span>
        </div>
        <p className="text-[11px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
          본 페이지의 AI 예측 및 ETF 추천은 3일 주기 AI 예측 사이클과 지정학적 분석에 기반한 참고 자료이며, 투자 권유가 아닙니다.
          모든 ETF는 한국거래소(KRX) 상장 종목이며, 실제 투자 시 전문 금융 자문을 받으시기 바랍니다.
          과거 수익률과 AI 예측 적중률이 미래 수익을 보장하지 않습니다. 정보는 {updateMeta.updateCycle}일 주기로 업데이트됩니다.
        </p>
      </div>
    </div>
  );
}
