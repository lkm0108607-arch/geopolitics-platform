"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Brain,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Filter,
  BarChart3,
  Activity,
  Target,
  Clock,
  ChevronDown,
  BookOpen,
  Loader2,
  Inbox,
  AlertTriangle,
  Timer,
} from "lucide-react";
import { useLivePrices } from "@/components/LivePriceProvider";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { useAIHistory } from "@/hooks/useAIHistory";
import SubModelBreakdown from "@/components/ai/SubModelBreakdown";
import DirectionBadge from "@/components/ai/DirectionBadge";
import ConfidenceBar from "@/components/ai/ConfidenceBar";
import StatCard from "@/components/layout/StatCard";
import { getAssetById } from "@/data/assets";
import { koreanETFs } from "@/data/koreanETFs";

// ── Category helpers ──

type FilterTab = "전체" | "금리" | "환율" | "원자재" | "지수" | "국내 ETF" | "해외 ETF" | "채권 ETF" | "테마 ETF";

const FILTER_TABS: FilterTab[] = ["전체", "금리", "환율", "원자재", "지수", "국내 ETF", "해외 ETF", "채권 ETF", "테마 ETF"];

function isETFAsset(assetId: string): boolean {
  return assetId.startsWith("etf-") || assetId.startsWith("kodex-") || assetId.startsWith("tiger-");
}

function getCategoryForPrediction(pred: AIPrediction): FilterTab {
  if (isETFAsset(pred.assetId)) {
    // ETF 세부 분류
    const ticker = pred.assetId.replace("etf-", "").replace("kodex-", "").replace("tiger-", "");
    const etf = koreanETFs.find((e) => e.ticker === ticker || pred.assetId.includes(e.ticker));
    if (etf) {
      if (etf.category === "해외주식") return "해외 ETF";
      if (etf.category === "채권") return "채권 ETF";
      if (etf.category === "테마" || etf.category === "리츠") return "테마 ETF";
      if (etf.category === "원자재") return "원자재";
      if (etf.category === "통화") return "환율";
      if (etf.category === "인버스/레버리지") return "국내 ETF";
    }
    return "국내 ETF";
  }
  const asset = getAssetById(pred.assetId);
  if (!asset) return "전체";
  const cat = asset.category;
  if (cat === "산업") return "지수";
  return cat as FilterTab;
}

// ── Heatmap color helper ──

function heatmapColor(
  direction: AIPrediction["direction"],
  confidence: number
): string {
  const intensity = Math.round((confidence / 100) * 255);
  switch (direction) {
    case "상승":
      return `rgba(239, 68, 68, ${(intensity / 255) * 0.7 + 0.1})`;
    case "하락":
      return `rgba(59, 130, 246, ${(intensity / 255) * 0.7 + 0.1})`;
    case "변동성확대":
      return `rgba(234, 179, 8, ${(intensity / 255) * 0.7 + 0.1})`;
    default:
      return `rgba(100, 116, 139, ${(intensity / 255) * 0.5 + 0.1})`;
  }
}

// ── Main Page ──

export default function PredictionsPage() {
  const { predictions, cycleId, isLoading, error, refresh } = useAIPredictions();
  const { prices } = useLivePrices();
  const {
    accuracy,
    results: historyResults,
    learningLogs,
    isLoading: historyLoading,
  } = useAIHistory();

  const [activeTab, setActiveTab] = useState<FilterTab>("전체");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showCount, setShowCount] = useState(20); // 초기 20개만 표시

  // Toggle expanded card
  const toggleExpand = (assetId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  // Filter + sort predictions
  const filteredPredictions = useMemo(() => {
    let filtered = predictions;
    if (activeTab !== "전체") {
      filtered = predictions.filter(
        (p) => getCategoryForPrediction(p) === activeTab
      );
    }
    return [...filtered].sort((a, b) => b.confidence - a.confidence);
  }, [predictions, activeTab]);

  // Stats
  const bullCount = predictions.filter((p) => p.direction === "상승").length;
  const bearCount = predictions.filter((p) => p.direction === "하락").length;
  const avgConfidence =
    predictions.length > 0
      ? Math.round(
          predictions.reduce((sum, p) => sum + p.confidence, 0) /
            predictions.length
        )
      : 0;
  const accuracyRate = accuracy?.accuracy ?? null;

  // Per-asset accuracy from history results
  const perAssetAccuracy = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();
    for (const r of historyResults) {
      if (r.correct === null) continue;
      const existing = map.get(r.assetId) || { correct: 0, total: 0 };
      existing.total += 1;
      if (r.correct) existing.correct += 1;
      map.set(r.assetId, existing);
    }
    return Array.from(map.entries())
      .map(([assetId, stats]) => ({
        assetId,
        name: getAssetById(assetId)?.name ?? assetId,
        accuracy: Math.round((stats.correct / stats.total) * 100),
        correct: stats.correct,
        total: stats.total,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);
  }, [historyResults]);

  // Latest generated time
  const latestGeneratedAt = predictions.length > 0 ? predictions[0].generatedAt : null;

  // 다음 예측까지 남은 시간 카운트다운 (매일 14:00 KST 기준)
  const [countdown, setCountdown] = useState("");
  const [timeSinceLastPrediction, setTimeSinceLastPrediction] = useState("");

  useEffect(() => {
    function updateTimer() {
      const now = new Date();

      // 마지막 예측 이후 경과 시간
      if (latestGeneratedAt) {
        const lastTime = new Date(latestGeneratedAt);
        const diffMs = now.getTime() - lastTime.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (diffHours > 0) {
          setTimeSinceLastPrediction(`${diffHours}시간 ${diffMins}분 전`);
        } else {
          setTimeSinceLastPrediction(`${diffMins}분 전`);
        }
      }

      // 다음 예측 시간 계산 (매일 14:00 KST)
      const kstOffset = 9 * 60; // KST = UTC+9
      const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
      const kstNow = new Date(utcNow + kstOffset * 60000);

      const nextPrediction = new Date(kstNow);
      nextPrediction.setHours(14, 0, 0, 0);
      if (kstNow.getHours() >= 14) {
        nextPrediction.setDate(nextPrediction.getDate() + 1);
      }

      const remainMs = nextPrediction.getTime() - kstNow.getTime();
      const remainHours = Math.floor(remainMs / (1000 * 60 * 60));
      const remainMins = Math.floor((remainMs % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${remainHours}시간 ${remainMins}분`);
    }

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // 1분마다 갱신
    return () => clearInterval(interval);
  }, [latestGeneratedAt]);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* ─── 1. Page Header ─── */}
        <header className="space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    AI 예측 분석
                  </h1>
                  <p className="text-sm text-slate-400">
                    5개 AI 서브모델 토론 + 30인 AI 배심원 심의로 자산 방향을 예측합니다
                  </p>
                </div>
              </div>

              {/* Cycle info */}
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
                {cycleId && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Cycle: {cycleId}
                  </span>
                )}
                {latestGeneratedAt && (
                  <span>
                    생성:{" "}
                    {new Date(latestGeneratedAt).toLocaleString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={refresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              새로고침
            </button>
          </div>
        </header>

        {/* ─── AI 오류 알림 ─── */}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">AI 예측 시스템 오류</p>
              <p className="text-xs text-red-400/80 mt-1">
                AI 예측 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
              </p>
              <p className="text-[11px] text-red-500/60 mt-1 font-mono">{error}</p>
              <button
                onClick={refresh}
                className="mt-2 px-3 py-1 text-xs bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors"
              >
                재시도
              </button>
            </div>
          </div>
        )}

        {/* ─── 예측 시간 정보 ─── */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 flex flex-wrap items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400">마지막 예측:</span>
            {latestGeneratedAt ? (
              <span className="text-white font-medium">
                {new Date(latestGeneratedAt).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                <span className="text-slate-500 ml-1">({timeSinceLastPrediction})</span>
              </span>
            ) : (
              <span className="text-amber-400">예측 데이터 없음</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">다음 예측까지:</span>
            <span className="text-emerald-300 font-medium">{countdown || "계산 중..."}</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-slate-400">예측 종목:</span>
            <span className="text-white font-medium">{predictions.length}개</span>
          </div>
          {predictions.length === 0 && !isLoading && !error && (
            <span className="text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              예측 데이터가 없습니다. 새로고침을 눌러주세요.
            </span>
          )}
        </div>

        {/* ─── 2. Summary Stats Row ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="상승 예측"
            value={bullCount}
            icon={TrendingUp}
            trend="up"
            subtext={`전체 ${predictions.length}건 중`}
          />
          <StatCard
            label="하락 예측"
            value={bearCount}
            icon={TrendingDown}
            trend="down"
            subtext={`전체 ${predictions.length}건 중`}
          />
          <StatCard
            label="평균 신뢰도"
            value={`${avgConfidence}%`}
            icon={Target}
            subtext="전체 예측 평균"
          />
          <StatCard
            label="예측 정확도"
            value={
              accuracyRate !== null ? `${accuracyRate.toFixed(1)}%` : "--"
            }
            icon={BarChart3}
            subtext={
              accuracy
                ? `${accuracy.correctPredictions}/${accuracy.totalPredictions}건 적중`
                : "데이터 수집 중"
            }
          />
        </div>

        {/* ─── 3. Category Filter Tabs ─── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setShowCount(20); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                    : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-slate-300"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* ─── 4. Predictions Grid ─── */}
        {isLoading && predictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">AI 예측 데이터를 불러오는 중...</p>
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Inbox className="w-8 h-8 mb-3" />
            <p className="text-sm">
              {activeTab === "전체"
                ? "아직 예측 데이터가 없습니다"
                : `"${activeTab}" 카테고리에 해당하는 예측이 없습니다`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>{filteredPredictions.length}개 예측 중 {Math.min(showCount, filteredPredictions.length)}개 표시</span>
              {filteredPredictions.length > showCount && (
                <span>{filteredPredictions.length - showCount}개 더 있음</span>
              )}
            </div>
            {filteredPredictions.slice(0, showCount).map((pred) => {
              const asset = getAssetById(pred.assetId);
              const livePrice = prices.get(pred.assetId);
              const isExpanded = expandedIds.has(pred.assetId);
              const assetName = asset?.name ?? pred.assetId;

              const livePriceValue = livePrice?.price;
              const liveChangePercent = livePrice?.changePercent;

              return (
                <div
                  key={pred.assetId}
                  className="rounded-xl border border-slate-700/60 bg-slate-900/70 overflow-hidden transition-all"
                >
                  {/* Card header - clickable */}
                  <button
                    onClick={() => toggleExpand(pred.assetId)}
                    className="w-full p-4 md:p-5 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Asset info */}
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="text-left min-w-0">
                          <div className="text-sm md:text-base font-semibold text-white truncate">
                            {assetName}
                          </div>
                          {/* Live price */}
                          {livePriceValue !== undefined && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-mono text-slate-300">
                                {livePriceValue.toLocaleString("ko-KR")}
                                {asset?.unit ? ` ${asset.unit}` : ""}
                              </span>
                              {liveChangePercent !== undefined && (
                                <span
                                  className={`text-[11px] font-mono ${
                                    liveChangePercent > 0
                                      ? "text-red-400"
                                      : liveChangePercent < 0
                                        ? "text-blue-400"
                                        : "text-slate-400"
                                  }`}
                                >
                                  {liveChangePercent > 0 ? "+" : ""}
                                  {liveChangePercent.toFixed(2)}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Direction + metrics */}
                      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                        <DirectionBadge direction={pred.direction} size="md" />

                        {/* Probability */}
                        <div className="text-right hidden sm:block">
                          <div className="text-sm font-mono font-bold text-white">
                            {pred.probability.toFixed(1)}%
                          </div>
                          <div className="text-[10px] text-slate-500">
                            확률
                          </div>
                        </div>

                        {/* Confidence bar */}
                        <div className="w-20 md:w-28 hidden md:block">
                          <ConfidenceBar
                            value={pred.confidence}
                            label="신뢰도"
                            size="sm"
                          />
                        </div>

                        <ChevronDown
                          className={`w-4 h-4 text-slate-500 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Mobile: probability + confidence inline */}
                    <div className="flex items-center gap-4 mt-3 md:hidden">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>확률</span>
                          <span>{pred.probability.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pred.direction === "상승"
                                ? "bg-red-500"
                                : pred.direction === "하락"
                                  ? "bg-blue-500"
                                  : "bg-yellow-500"
                            }`}
                            style={{ width: `${pred.probability}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <ConfidenceBar
                          value={pred.confidence}
                          label="신뢰도"
                          size="sm"
                        />
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 p-4 md:p-5 space-y-5 bg-slate-900/40">
                      {/* AI 종합 분석 */}
                      <div>
                        <h4 className="text-xs font-semibold text-purple-300 mb-2 flex items-center gap-2">
                          <Brain className="w-3.5 h-3.5" />
                          AI 종합 분석
                        </h4>
                        <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/40 space-y-2">
                          {pred.rationale.split("\n").map((line, i) => {
                            if (!line.trim()) return null;
                            // 종합 판단 헤더
                            if (line.startsWith("종합 판단:")) {
                              return (
                                <div key={i} className="text-sm font-semibold text-white pb-2 border-b border-slate-700/40">
                                  {line}
                                </div>
                              );
                            }
                            // 서브모델 분석 제목 (▸)
                            if (line.startsWith("▸")) {
                              return (
                                <div key={i} className="text-xs text-slate-300 pt-1">
                                  <span className="text-purple-400 font-semibold">{line.slice(0, line.indexOf(":") + 1)}</span>
                                  <span className="text-slate-400">{line.slice(line.indexOf(":") + 1)}</span>
                                </div>
                              );
                            }
                            // 판단 결과 (→)
                            if (line.trim().startsWith("→")) {
                              const isUp = line.includes("상승");
                              const isDown = line.includes("하락");
                              return (
                                <div key={i} className={`text-[11px] pl-4 ${isUp ? "text-red-400" : isDown ? "text-blue-400" : "text-slate-500"}`}>
                                  {line.trim()}
                                </div>
                              );
                            }
                            return (
                              <p key={i} className="text-xs text-slate-400">{line}</p>
                            );
                          })}
                        </div>
                      </div>

                      {/* AI 분석 상세 */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5" />
                          AI 서브모델 + 토론 + AI 배심원 상세
                        </h4>
                        <SubModelBreakdown
                          votes={pred.subModelVotes}
                          historicalAnalysis={pred.historicalAnalysis}
                          debateResult={pred.debateResult}
                          juryVerdict={pred.juryVerdict}
                        />
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                        <span>
                          생성:{" "}
                          {new Date(pred.generatedAt).toLocaleString("ko-KR")}
                        </span>
                        <span>Cycle: {pred.cycleId}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 더보기 / 접기 버튼 */}
            {filteredPredictions.length > showCount && (
              <button
                onClick={() => setShowCount((prev) => prev + 20)}
                className="w-full py-3 rounded-xl border border-slate-700/60 bg-slate-900/50 text-slate-400 hover:text-white hover:border-purple-500/40 transition-all text-sm"
              >
                더보기 ({filteredPredictions.length - showCount}개 남음)
              </button>
            )}
            {showCount > 20 && (
              <button
                onClick={() => setShowCount(20)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                접기
              </button>
            )}
          </div>
        )}

        {/* ─── 상승/하락 요약 ─── */}
        {predictions.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 상승 예측 종목 */}
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                상승 예측 ({predictions.filter((p) => p.direction === "상승").length}종목)
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {predictions
                  .filter((p) => p.direction === "상승")
                  .sort((a, b) => b.confidence - a.confidence)
                  .map((pred) => {
                    const asset = getAssetById(pred.assetId);
                    return (
                      <div key={pred.assetId} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-red-500/10">
                        <span className="text-slate-300 truncate flex-1">{asset?.name ?? pred.assetId}</span>
                        <span className="text-red-400 font-mono ml-2">{pred.probability}%</span>
                        <span className="text-slate-500 font-mono ml-2 w-12 text-right">신뢰 {pred.confidence}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 하락 예측 종목 */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
              <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                하락 예측 ({predictions.filter((p) => p.direction === "하락").length}종목)
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {predictions
                  .filter((p) => p.direction === "하락")
                  .sort((a, b) => b.confidence - a.confidence)
                  .map((pred) => {
                    const asset = getAssetById(pred.assetId);
                    return (
                      <div key={pred.assetId} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-blue-500/10">
                        <span className="text-slate-300 truncate flex-1">{asset?.name ?? pred.assetId}</span>
                        <span className="text-blue-400 font-mono ml-2">{pred.probability}%</span>
                        <span className="text-slate-500 font-mono ml-2 w-12 text-right">신뢰 {pred.confidence}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        )}

        {/* ─── 5. Confidence Heatmap ─── */}
        {predictions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-yellow-400" />
              신뢰도 히트맵
            </h2>
            <p className="text-xs text-slate-500">
              색상 강도는 신뢰도, 색상은 방향을 나타냅니다 (빨강: 상승, 파랑: 하락,
              노랑: 변동성확대, 회색: 보합)
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {[...predictions]
                .sort((a, b) => b.confidence - a.confidence)
                .map((pred) => {
                  const asset = getAssetById(pred.assetId);
                  const name = asset?.name ?? pred.assetId;
                  return (
                    <div
                      key={`hm-${pred.assetId}`}
                      className="relative rounded-lg p-3 border border-slate-700/40 text-center transition-transform hover:scale-105 cursor-default"
                      style={{
                        backgroundColor: heatmapColor(
                          pred.direction,
                          pred.confidence
                        ),
                      }}
                      title={`${name}: ${pred.direction} (신뢰도 ${pred.confidence}%)`}
                    >
                      <div className="text-[11px] font-medium text-white truncate">
                        {name}
                      </div>
                      <div className="text-[10px] text-white/70 mt-0.5">
                        {pred.confidence}%
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* ─── 6. Past Accuracy Section ─── */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            과거 예측 정확도
          </h2>

          {historyLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">데이터 불러오는 중...</span>
            </div>
          ) : (
            <>
              {/* Per-asset accuracy bars */}
              {perAssetAccuracy.length > 0 ? (
                <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 md:p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">
                    자산별 적중률
                  </h3>
                  <div className="space-y-2.5">
                    {perAssetAccuracy.map((item) => {
                      const barColor =
                        item.accuracy >= 80
                          ? "bg-emerald-500"
                          : item.accuracy >= 60
                            ? "bg-blue-500"
                            : item.accuracy >= 40
                              ? "bg-yellow-500"
                              : "bg-red-500";
                      return (
                        <div
                          key={item.assetId}
                          className="flex items-center gap-3 text-xs"
                        >
                          <span className="text-slate-300 font-medium w-28 truncate flex-shrink-0">
                            {item.name}
                          </span>
                          <div className="flex-1 bg-slate-800 rounded-full h-3 relative overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor} transition-all duration-500`}
                              style={{ width: `${item.accuracy}%` }}
                            />
                          </div>
                          <span className="text-white font-bold w-12 text-right flex-shrink-0">
                            {item.accuracy}%
                          </span>
                          <span className="text-slate-500 w-16 text-right flex-shrink-0 text-[10px]">
                            {item.correct}/{item.total}건
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-8 text-center">
                  <p className="text-sm text-slate-500">
                    아직 평가된 자산별 정확도 데이터가 없습니다
                  </p>
                </div>
              )}

              {/* Learning log entries (last 5) */}
              {learningLogs.length > 0 && (
                <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 md:p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    AI 학습 로그
                  </h3>
                  <div className="space-y-2">
                    {learningLogs.slice(0, 5).map((log, idx) => (
                      <div
                        key={`log-${idx}`}
                        className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleString("ko-KR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                            {log.cycleId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mb-1">
                          {log.adjustments}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {log.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
