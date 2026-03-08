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
} from "lucide-react";
import {
  etfRecommendations,
  investmentScenarios,
  dangerAlerts,
  timingSignals,
  getETFsByCategory,
  getETFsByRegion,
  getCurrentScenario,
  getActiveAlerts,
  getPortfolioAllocation,
  updateMeta,
} from "@/data/investmentStrategy";
import { getIssueById } from "@/data/issues";

function getSeverityStyle(severity: string) {
  switch (severity) {
    case "극심":
      return { bg: "bg-red-900/40", border: "border-red-600/50", text: "text-red-300", badge: "bg-red-600/30 text-red-300 border border-red-500/40", icon: "text-red-400" };
    case "위험":
      return { bg: "bg-orange-900/30", border: "border-orange-600/40", text: "text-orange-300", badge: "bg-orange-600/30 text-orange-300 border border-orange-500/40", icon: "text-orange-400" };
    case "경계":
      return { bg: "bg-yellow-900/25", border: "border-yellow-600/35", text: "text-yellow-300", badge: "bg-yellow-600/25 text-yellow-300 border border-yellow-500/35", icon: "text-yellow-400" };
    default:
      return { bg: "bg-blue-900/25", border: "border-blue-600/35", text: "text-blue-300", badge: "bg-blue-600/25 text-blue-300 border border-blue-500/35", icon: "text-blue-400" };
  }
}

function getCategoryStyle(category: string) {
  switch (category) {
    case "방어형": return "bg-blue-600/20 text-blue-300 border border-blue-500/30";
    case "공격형": return "bg-red-600/20 text-red-300 border border-red-500/30";
    case "헤지형": return "bg-amber-600/20 text-amber-300 border border-amber-500/30";
    default: return "bg-slate-600/20 text-slate-300 border border-slate-500/30";
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case "방어형": return "bg-blue-500";
    case "공격형": return "bg-red-500";
    case "헤지형": return "bg-amber-500";
    default: return "bg-slate-500";
  }
}

function getRiskBadge(riskLevel: string) {
  switch (riskLevel) {
    case "낮음": return "bg-green-600/20 text-green-300 border border-green-500/30";
    case "보통": return "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30";
    case "높음": return "bg-orange-600/20 text-orange-300 border border-orange-500/30";
    case "매우높음": return "bg-red-600/20 text-red-300 border border-red-500/30";
    default: return "bg-slate-600/20 text-slate-300 border border-slate-500/30";
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "충족": return { bg: "bg-emerald-900/30", text: "text-emerald-300", badge: "bg-emerald-600/25 text-emerald-300 border border-emerald-500/35", dot: "bg-emerald-400" };
    case "근접": return { bg: "bg-yellow-900/25", text: "text-yellow-300", badge: "bg-yellow-600/25 text-yellow-300 border border-yellow-500/35", dot: "bg-yellow-400" };
    default: return { bg: "bg-slate-800/50", text: "text-slate-400", badge: "bg-slate-600/25 text-slate-400 border border-slate-500/35", dot: "bg-slate-500" };
  }
}

function getSignalTypeBadge(type: string) {
  switch (type) {
    case "진입": return "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30";
    case "청산": return "bg-red-600/20 text-red-300 border border-red-500/30";
    case "비중조절": return "bg-amber-600/20 text-amber-300 border border-amber-500/30";
    default: return "bg-slate-600/20 text-slate-300 border border-slate-500/30";
  }
}

function getTimeframeLabelColor(label: string) {
  switch (label) {
    case "초단기": return "text-cyan-400 bg-cyan-900/30 border-cyan-700/40";
    case "단기": return "text-blue-400 bg-blue-900/30 border-blue-700/40";
    case "중장기": return "text-purple-400 bg-purple-900/30 border-purple-700/40";
    case "장기": return "text-pink-400 bg-pink-900/30 border-pink-700/40";
    default: return "text-slate-400 bg-slate-800/50 border-slate-700/40";
  }
}

export default function InvestmentPage() {
  const activeAlerts = getActiveAlerts();
  const currentScenario = getCurrentScenario();
  const portfolioAllocation = getPortfolioAllocation();
  const totalWeight = portfolioAllocation.reduce((sum, a) => sum + a.weight, 0);

  const categories = ["전체", "방어형", "공격형", "헤지형"];
  const regions = ["전체", "미국", "한국", "글로벌", "아시아"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
          <TrendingUp className="w-4 h-4" />
          <span>투자 전략 & ETF 추천</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              투자 전략 &amp; 국내 ETF 추천
            </h1>
            <p className="text-slate-400 text-sm max-w-3xl">
              지정학적 리스크 분석과 경제 전망에 기반한 포트폴리오 전략입니다.
              모든 ETF는 <strong className="text-slate-200">한국거래소(KRX) 상장 국내 ETF</strong>로만 구성되어 있습니다.
            </p>
          </div>

          {/* 업데이트 주기 배지 */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">정보 업데이트</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span className="text-slate-400">최근 업데이트:</span>
                <span className="text-white font-medium">{updateMeta.lastUpdate}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="text-slate-400">다음 업데이트:</span>
                <span className="text-emerald-400 font-medium">{updateMeta.nextUpdate}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {updateMeta.updateCycle}일 주기 정기 업데이트 · {updateMeta.version}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 1. Danger Alert Banner ── */}
      {activeAlerts.length > 0 && (
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white">위험 경보</h2>
            <span className="text-xs bg-red-600/30 text-red-300 px-2 py-0.5 rounded-full border border-red-500/40">
              {activeAlerts.length}건 활성
            </span>
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
                      <p className="text-sm text-yellow-200">{alert.actionRequired}</p>
                    </div>
                    {alert.impactedETFs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {alert.impactedETFs.map((etf) => (
                          <span key={etf.ticker} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                            {etf.ticker}: <span className="text-red-300">{etf.impact}</span>
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

      {/* ── 2. Current Scenario & Portfolio Overview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">현재 기본 시나리오</h2>
          </div>
          {currentScenario && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xl font-bold text-white">{currentScenario.name}</h3>
                <span className="text-sm bg-blue-600/25 text-blue-300 px-3 py-1 rounded-full border border-blue-500/35">
                  확률 {currentScenario.probability}%
                </span>
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
                      <span key={idx} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                        {trigger}
                      </span>
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
                    <div
                      className={`${barColor} h-full rounded-full transition-all`}
                      style={{ width: `${(alloc.weight / Math.max(totalWeight, 100)) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {alloc.etfs.map((etf) => (
                      <span key={etf.ticker} className="text-xs text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded">
                        {etf.nameKr} ({etf.currentWeight}%)
                      </span>
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
            <p className="text-xs text-slate-500 mt-1">
              현금 비중: {Math.max(0, 100 - totalWeight)}% (방어적 대기자금)
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Scenario Comparison ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">시나리오별 전략 비교</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {investmentScenarios.map((scenario) => {
            const isCurrent = currentScenario?.id === scenario.id;
            return (
              <div
                key={scenario.id}
                className={`rounded-2xl p-5 border transition-all ${
                  isCurrent ? "bg-blue-900/20 border-blue-600/40 ring-1 ring-blue-500/20" : "bg-slate-900 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm">{scenario.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isCurrent ? "bg-blue-600/30 text-blue-300 border border-blue-500/40" : "bg-slate-700/50 text-slate-400 border border-slate-600/40"
                  }`}>{scenario.probability}%</span>
                </div>
                {isCurrent && (
                  <span className="inline-block text-xs bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded mb-2 border border-blue-500/30">
                    현재 기본 시나리오
                  </span>
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
                                alloc.action === "매수" || alloc.action === "비중확대"
                                  ? "bg-emerald-600/20 text-emerald-300"
                                  : alloc.action === "매도" || alloc.action === "비중축소"
                                  ? "bg-red-600/20 text-red-300"
                                  : "bg-slate-600/20 text-slate-400"
                              }`}>{alloc.action}</span>
                            </div>
                          </div>
                        );
                      })}
                      {scenario.etfAllocation.length > 5 && (
                        <p className="text-[10px] text-slate-500">+{scenario.etfAllocation.length - 5}개 더</p>
                      )}
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

      {/* ── 4. ETF Recommendations ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">국내 상장 ETF 추천 목록</h2>
          <span className="text-xs bg-emerald-600/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
            KRX 상장 전용
          </span>
        </div>

        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-2">카테고리</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const count = cat === "전체" ? etfRecommendations.length : getETFsByCategory(cat).length;
              return (
                <span key={cat} className={`text-xs px-3 py-1.5 rounded-lg border cursor-default ${
                  cat === "전체" ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30" : getCategoryStyle(cat)
                }`}>{cat} ({count})</span>
              );
            })}
          </div>
        </div>
        <div className="mb-6">
          <p className="text-xs text-slate-500 mb-2">투자 지역</p>
          <div className="flex flex-wrap gap-2">
            {regions.map((region) => {
              const count = region === "전체" ? etfRecommendations.length : getETFsByRegion(region).length;
              return (
                <span key={region} className="text-xs px-3 py-1.5 rounded-lg border bg-slate-800 text-slate-300 border-slate-700 cursor-default">
                  {region} ({count})
                </span>
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
                      <span className="text-lg font-bold text-white">{etf.ticker}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${getCategoryStyle(etf.category)}`}>{etf.category}</span>
                    </div>
                    <p className="text-sm text-slate-300">{etf.nameKr}</p>
                    <p className="text-xs text-slate-500">{etf.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-400">{etf.currentWeight}%</span>
                    <p className="text-[10px] text-slate-500">추천 비중</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${getRiskBadge(etf.riskLevel)}`}>
                    위험: {etf.riskLevel}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/15 text-emerald-300 border border-emerald-500/25">
                    기대수익: {etf.expectedReturn}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/40">
                    {etf.region}
                  </span>
                </div>

                {/* Rationale */}
                <div className="bg-slate-800/40 rounded-lg p-3 mb-3">
                  <p className="text-xs text-slate-500 mb-1">투자 근거</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{etf.rationale}</p>
                </div>

                {/* ── Timeframe Strategy ── */}
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
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getTimeframeLabelColor(tf.label)}`}>
                              {tf.label}
                            </span>
                            <span className="text-[10px] text-slate-500">{tf.period}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-400 font-medium">
                              수익 {tf.expectedReturn}
                            </span>
                            <span className="text-[10px] text-red-400 font-medium">
                              리스크 {tf.maxRisk}
                            </span>
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
                        <span key={idx} className="text-[10px] bg-red-900/20 text-red-300 px-2 py-0.5 rounded border border-red-800/30">
                          {signal}
                        </span>
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
                        <Link
                          key={issue.id}
                          href={`/issues/${issue.id}`}
                          className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50 hover:border-blue-500/30 transition-all"
                        >
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

      {/* ── 5. Timing Signals ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-bold text-white">매매 타이밍 신호</h2>
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
                <p className="text-xs text-slate-500 leading-relaxed">{signal.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6. Risk Management ── */}
      <div className="mb-10">
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
                  <span className="w-5 h-5 rounded-full bg-emerald-600/20 text-emerald-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">
                    {item.icon}
                  </span>
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

      {/* ── Footer Disclaimer ── */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Info className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-400">투자 유의사항</span>
        </div>
        <p className="text-[11px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
          본 페이지의 ETF 추천과 투자 전략은 지정학적 분석에 기반한 참고 자료이며, 투자 권유가 아닙니다.
          모든 ETF는 한국거래소(KRX) 상장 종목이며, 실제 투자 시 전문 금융 자문을 받으시기 바랍니다.
          과거 수익률이 미래 수익을 보장하지 않습니다. 정보는 {updateMeta.updateCycle}일 주기로 업데이트됩니다.
        </p>
      </div>
    </div>
  );
}
