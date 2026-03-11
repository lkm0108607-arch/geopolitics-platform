"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  DollarSign,
  Droplets,
  Factory,
  Activity,
  ChevronRight,
  Brain,
  RefreshCw,
  Clock,
} from "lucide-react";
import { assets, getAssetsByCategory } from "@/data/assets";
import { useLivePrices } from "@/components/LivePriceProvider";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import DirectionBadge from "@/components/ai/DirectionBadge";
import ConfidenceBar from "@/components/ai/ConfidenceBar";
import type { AssetCategory } from "@/types";

/* ── Category metadata ─────────────────────────────────────────────── */

const categoryMeta: Record<
  AssetCategory,
  { icon: typeof TrendingUp; label: string; color: string; bg: string }
> = {
  "금리": { icon: BarChart3, label: "금리", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  "환율": { icon: DollarSign, label: "환율", color: "text-blue-400", bg: "bg-blue-400/10" },
  "원자재": { icon: Droplets, label: "원자재", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  "지수": { icon: TrendingUp, label: "지수", color: "text-purple-400", bg: "bg-purple-400/10" },
  "산업": { icon: Factory, label: "산업", color: "text-orange-400", bg: "bg-orange-400/10" },
};

const ALL_CATEGORIES: AssetCategory[] = ["금리", "환율", "원자재", "지수", "산업"];

/* ── Page Component ────────────────────────────────────────────────── */

export default function AssetsPage() {
  const [activeCategory, setActiveCategory] = useState<AssetCategory | "전체">("전체");
  const { prices, lastFetched, isLoading: pricesLoading, refresh: refreshPrices } = useLivePrices();
  const {
    predictions,
    isLoading: aiLoading,
    refresh: refreshAI,
  } = useAIPredictions();

  /* ── Derived data ──────────────────────────────────────────────── */

  const predictionMap = useMemo(() => {
    const map = new Map<string, (typeof predictions)[number]>();
    for (const p of predictions) {
      map.set(p.assetId, p);
    }
    return map;
  }, [predictions]);

  const filteredAssets = useMemo(() => {
    if (activeCategory === "전체") return assets;
    return getAssetsByCategory(activeCategory);
  }, [activeCategory]);

  // Compute summary stats using live prices when available
  const stats = useMemo(() => {
    let rising = 0;
    let falling = 0;

    for (const a of assets) {
      const lp = prices.get(a.id);
      const change = lp ? lp.changePercent : a.changePercent;
      if (change > 0) rising++;
      else if (change < 0) falling++;
    }

    return {
      total: assets.length,
      rising,
      falling,
      aiActive: predictions.length,
    };
  }, [prices, predictions]);

  // Last refresh display
  const lastRefreshLabel = useMemo(() => {
    if (!lastFetched) return null;
    const h = lastFetched.getHours().toString().padStart(2, "0");
    const m = lastFetched.getMinutes().toString().padStart(2, "0");
    const s = lastFetched.getSeconds().toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [lastFetched]);

  /* ── Group filtered assets by category ─────────────────────────── */

  const groupedAssets = useMemo(() => {
    const groups: { category: AssetCategory; assets: typeof assets }[] = [];
    const cats = activeCategory === "전체" ? ALL_CATEGORIES : [activeCategory];

    for (const cat of cats) {
      const catAssets = filteredAssets.filter((a) => a.category === cat);
      if (catAssets.length > 0) {
        groups.push({ category: cat, assets: catAssets });
      }
    }
    return groups;
  }, [filteredAssets, activeCategory]);

  /* ── Handlers ──────────────────────────────────────────────────── */

  const handleRefreshAll = () => {
    refreshPrices();
    refreshAI();
  };

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
            <Activity className="w-4 h-4" />
            <span>실시간 대시보드</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            자산 가격 & AI 예측
          </h1>
          <p className="text-slate-400 text-base max-w-2xl">
            21개 핵심 자산의 실시간 가격과 AI 방향성 예측을 한눈에 확인하세요.
          </p>
        </div>

        {/* ── Summary Stats Bar ──────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300 font-medium">
              전체 {stats.total}개 자산
            </span>
            <span className="text-slate-700">|</span>
          </div>

          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-red-400" />
            <span className="text-sm text-red-400 font-medium">상승 {stats.rising}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-sm text-blue-400 font-medium">하락 {stats.falling}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">
              AI 예측 {stats.aiActive}개 활성
            </span>
          </div>

          {/* Refresh / timestamp */}
          <div className="ml-auto flex items-center gap-3">
            {lastRefreshLabel && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                <span>최근 갱신 {lastRefreshLabel}</span>
                {pricesLoading && (
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                )}
              </div>
            )}
            <button
              onClick={handleRefreshAll}
              disabled={pricesLoading || aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={`w-3 h-3 ${pricesLoading || aiLoading ? "animate-spin" : ""}`}
              />
              새로고침
            </button>
          </div>
        </div>

        {/* ── 1-minute live refresh indicator ─────────────────────── */}
        <div className="flex items-center gap-2 mb-6">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-xs text-slate-500">
            실시간 가격 1분 간격 자동 갱신 중
          </span>
        </div>

        {/* ── Category Filter Tabs ───────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory("전체")}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              activeCategory === "전체"
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
            }`}
          >
            전체
          </button>
          {ALL_CATEGORIES.map((cat) => {
            const meta = categoryMeta[cat];
            const Icon = meta.icon;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  activeCategory === cat
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* ── Asset Groups ───────────────────────────────────────── */}
        {groupedAssets.map(({ category, assets: catAssets }) => {
          const meta = categoryMeta[category];
          const Icon = meta.icon;

          return (
            <section key={category} className="mb-10">
              {/* Category heading */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-lg ${meta.bg}`}
                >
                  <Icon className={`w-4 h-4 ${meta.color}`} />
                </div>
                <h2 className="text-lg font-bold text-white">{meta.label}</h2>
                <span className="text-xs text-slate-500">
                  {catAssets.length}개 자산
                </span>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catAssets.map((asset) => {
                  const livePrice = prices.get(asset.id);
                  const displayPrice = livePrice ? livePrice.price : asset.currentValue;
                  const displayChange = livePrice
                    ? livePrice.changePercent
                    : asset.changePercent;
                  const prediction = predictionMap.get(asset.id);

                  const isPositive = displayChange > 0;
                  const isNegative = displayChange < 0;
                  const changeColor = isPositive
                    ? "text-red-400"
                    : isNegative
                      ? "text-blue-400"
                      : "text-slate-400";

                  return (
                    <Link
                      key={asset.id}
                      href={`/assets/${asset.id}`}
                      className="group block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-600 transition-all"
                    >
                      {/* Top section: name + price */}
                      <div className="p-5 pb-3">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-500 mb-0.5 truncate">
                              {asset.nameEn}
                            </p>
                            <p className="font-semibold text-white text-base group-hover:text-blue-300 transition-colors truncate">
                              {asset.name}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xl font-bold text-white font-mono">
                              {displayPrice.toLocaleString("ko-KR", {
                                maximumFractionDigits: 2,
                              })}
                              {asset.unit === "%" && (
                                <span className="text-sm text-slate-400 ml-0.5">%</span>
                              )}
                            </p>
                            <div className={`flex items-center justify-end gap-1 ${changeColor}`}>
                              {isPositive ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : isNegative ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : (
                                <Minus className="w-3 h-3" />
                              )}
                              <span className="text-sm font-medium font-mono">
                                {isPositive ? "+" : ""}
                                {displayChange.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Live indicator dot */}
                        {livePrice && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                            </span>
                            <span className="text-[10px] text-slate-500">실시간</span>
                          </div>
                        )}
                      </div>

                      {/* AI Prediction section */}
                      {prediction ? (
                        <div className="px-5 pb-4 border-t border-slate-800/60 pt-3">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <Brain className="w-3 h-3 text-emerald-400" />
                            <span className="text-[11px] font-medium text-slate-500">
                              AI 예측
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 mb-2.5">
                            <DirectionBadge direction={prediction.direction} size="sm" />
                            <span className="text-xs font-mono text-slate-300">
                              확률{" "}
                              <span className="text-white font-semibold">
                                {prediction.probability.toFixed(1)}%
                              </span>
                            </span>
                          </div>

                          <ConfidenceBar
                            value={prediction.confidence}
                            label="신뢰도"
                            size="sm"
                          />
                        </div>
                      ) : (
                        <div className="px-5 pb-4 border-t border-slate-800/60 pt-3">
                          <div className="flex items-center gap-1.5">
                            <Brain className="w-3 h-3 text-slate-600" />
                            <span className="text-[11px] text-slate-600">
                              {aiLoading ? "AI 예측 로딩 중..." : "AI 예측 데이터 없음"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between px-5 py-2.5 bg-slate-900/50 border-t border-slate-800 group-hover:bg-slate-800/50 transition-colors">
                        <span className="text-[11px] text-slate-500">
                          {asset.description.length > 30
                            ? asset.description.slice(0, 30) + "..."
                            : asset.description}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ── Bottom disclaimer ───────────────────────────────────── */}
        <div className="mt-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-start gap-3">
          <Brain className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            AI 예측은 통계 모델 기반의 참고 자료이며, 투자 권유가 아닙니다. 실시간
            가격은 외부 API를 통해 1분 간격으로 갱신되며 실제 시장 가격과 차이가 있을
            수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
