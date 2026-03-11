"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Brain,
  Target,
  Activity,
  BarChart3,
  Cpu,
  ChevronRight,
  RefreshCw,
  Loader2,
  ArrowUpDown,
} from "lucide-react";

import { useLivePrices } from "@/components/LivePriceProvider";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useAIHistory } from "@/hooks/useAIHistory";
import { assets, getAssetById } from "@/data/assets";
import PriceTicker from "@/components/market/PriceTicker";
import PredictionCard from "@/components/ai/PredictionCard";
import StatCard from "@/components/layout/StatCard";

const DIRECTION_ORDER: Record<string, number> = {
  "상승": 0,
  "하락": 1,
  "보합": 2,
  "변동성확대": 3,
};

export default function HomePage() {
  const { prices, isLoading: pricesLoading } = useLivePrices();
  const {
    predictions,
    cycleId,
    isLoading: predictionsLoading,
  } = useAIPredictions();
  const {
    accuracy,
    learningLogs,
    isLoading: historyLoading,
  } = useAIHistory();

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"direction" | "probability" | "confidence" | "name">("direction");

  const toggleCard = (assetId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  // 미등록 자산 제외 (semiconductor, ev-battery 등)
  const validPredictions = useMemo(() => {
    return predictions.filter((p) => {
      if (p.assetId.startsWith("etf-")) return true;
      const asset = getAssetById(p.assetId);
      return asset && asset.name !== p.assetId;
    });
  }, [predictions]);

  // Sort predictions
  const sortedPredictions = useMemo(() => {
    return [...validPredictions].sort((a, b) => {
      switch (sortBy) {
        case "probability":
          return b.probability - a.probability;
        case "confidence":
          return b.confidence - a.confidence;
        case "name": {
          const na = getAssetById(a.assetId)?.name ?? a.assetId;
          const nb = getAssetById(b.assetId)?.name ?? b.assetId;
          return na.localeCompare(nb, "ko");
        }
        case "direction":
        default:
          return (DIRECTION_ORDER[a.direction] ?? 9) - (DIRECTION_ORDER[b.direction] ?? 9);
      }
    });
  }, [validPredictions, sortBy]);

  // Compute average confidence
  const avgConfidence = useMemo(() => {
    if (validPredictions.length === 0) return 0;
    const sum = validPredictions.reduce((acc, p) => acc + p.confidence, 0);
    return Math.round(sum / validPredictions.length);
  }, [validPredictions]);

  // Compute learning cycle count from logs
  const learningCycleCount = useMemo(() => {
    if (!learningLogs || learningLogs.length === 0) return 0;
    const uniqueCycles = new Set(learningLogs.map((l) => l.cycleId));
    return uniqueCycles.size;
  }, [learningLogs]);

  const isLoading = predictionsLoading || historyLoading;

  // Format last prediction time
  const lastPredictionTime = useMemo(() => {
    if (predictions.length === 0) return null;
    const latest = predictions.reduce((a, b) =>
      new Date(a.generatedAt) > new Date(b.generatedAt) ? a : b
    );
    if (!latest.generatedAt) return "방금 전";
    const d = new Date(latest.generatedAt);
    if (isNaN(d.getTime())) return "방금 전";
    return d.toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [predictions]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Hero Section ── */}
      <section className="max-w-7xl mx-auto px-4 pt-10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-400 shrink-0" />
              GeoInsight AI
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-2 max-w-2xl">
              5개 AI 서브모델 토론 + 30인 AI 배심원 심의로 시장을 분석하고 예측합니다
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastPredictionTime && (
              <span className="text-xs text-slate-500">
                마지막 예측: {lastPredictionTime}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
        </div>
      </section>

      {/* ── Live Price Ticker Strip ── */}
      <PriceTicker />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* ── KPI Stats Row ── */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 animate-pulse"
                  >
                    <div className="h-3 bg-slate-700 rounded w-20 mb-4" />
                    <div className="h-7 bg-slate-700 rounded w-16" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <StatCard
                  label="예측 정확도"
                  value={
                    accuracy ? `${accuracy.accuracy.toFixed(1)}%` : "—"
                  }
                  icon={Target}
                  trend={
                    accuracy
                      ? accuracy.accuracy >= 70
                        ? "up"
                        : accuracy.accuracy >= 50
                          ? "neutral"
                          : "down"
                      : undefined
                  }
                  subtext={
                    accuracy
                      ? `${accuracy.correctPredictions}/${accuracy.totalPredictions} 적중`
                      : "데이터 로딩 중"
                  }
                />
                <StatCard
                  label="활성 예측"
                  value={validPredictions.length}
                  icon={Activity}
                  subtext={
                    cycleId ? `사이클 ${cycleId}` : "대기 중"
                  }
                />
                <StatCard
                  label="모델 신뢰도"
                  value={`${avgConfidence}%`}
                  icon={Brain}
                  trend={
                    avgConfidence >= 70
                      ? "up"
                      : avgConfidence >= 50
                        ? "neutral"
                        : "down"
                  }
                  subtext="앙상블 평균 신뢰도"
                />
                <StatCard
                  label="학습 사이클"
                  value={learningCycleCount}
                  icon={Cpu}
                  subtext="완료된 학습 사이클"
                />
              </>
            )}
          </div>
        </section>

        {/* ── AI 실시간 예측 ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              AI 실시간 예측
              {cycleId && (
                <span className="text-xs font-normal text-slate-500 ml-2">
                  사이클 {cycleId}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                {(["direction", "probability", "confidence", "name"] as const).map((key) => {
                  const labels: Record<typeof key, string> = { direction: "방향", probability: "확률", confidence: "신뢰도", name: "이름" };
                  return (
                    <button key={key} onClick={() => setSortBy(key)}
                      className={`px-2 py-0.5 text-[11px] rounded transition ${sortBy === key ? "bg-purple-600/30 text-purple-300" : "text-slate-500 hover:text-slate-300"}`}>
                      {labels[key]}
                    </button>
                  );
                })}
              </div>
              <Link
                href="/predictions"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                전체 보기 <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {predictionsLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <p className="text-sm text-slate-500">
                AI 예측 데이터를 불러오는 중...
              </p>
            </div>
          ) : sortedPredictions.length === 0 ? (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-12 text-center">
              <Brain className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                현재 활성 예측이 없습니다
              </p>
              <p className="text-xs text-slate-600 mt-1">
                다음 사이클에서 새로운 예측이 생성됩니다
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sortedPredictions.slice(0, 8).map((pred) => {
                  const livePrice = prices.get(pred.assetId);
                  return (
                    <PredictionCard
                      key={pred.assetId}
                      prediction={pred}
                      livePrice={livePrice}
                      showDetail={expandedCards.has(pred.assetId)}
                      onToggleDetail={() => toggleCard(pred.assetId)}
                    />
                  );
                })}
              </div>
              {sortedPredictions.length > 8 && (
                <div className="text-center mt-3">
                  <Link href="/predictions" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                    +{sortedPredictions.length - 8}개 더 보기 →
                  </Link>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Quick Navigation ── */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            <Link
              href="/predictions"
              className="group rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 hover:border-purple-500/50 hover:bg-slate-900 transition-all flex items-center gap-3"
            >
              <Brain className="w-5 h-5 text-purple-400 shrink-0" />
              <span className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">AI 예측 상세</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 ml-auto shrink-0" />
            </Link>

            <Link
              href="/assets"
              className="group rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 hover:border-blue-500/50 hover:bg-slate-900 transition-all flex items-center gap-3"
            >
              <BarChart3 className="w-5 h-5 text-blue-400 shrink-0" />
              <span className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">실시간 시세</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 ml-auto shrink-0" />
            </Link>

            <Link
              href="/ai"
              className="group rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 hover:border-emerald-500/50 hover:bg-slate-900 transition-all flex items-center gap-3"
            >
              <Cpu className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-medium text-white group-hover:text-emerald-300 transition-colors">AI 시스템</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 ml-auto shrink-0" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
