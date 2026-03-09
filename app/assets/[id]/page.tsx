import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Activity, Users, Clock, ChevronRight, Star, BarChart3, CheckCircle, XCircle, AlertTriangle, PieChart } from "lucide-react";
import { assets, getAssetById } from "@/data/assets";
import { getPredictionsForAsset, getActivePredictionsForAsset, getAssetPredictionStats, getAllAssetPredictions } from "@/data/assetPredictions";
import { getPatternsForAsset } from "@/data/patterns";
import { getFactorsForAsset } from "@/data/factors";
import { getTopExperts } from "@/data/experts";
import { calculateAssetConsensus, calculateAssetAccuracy } from "@/lib/assetProbability";
import { getCredibilityTier, getAccuracyGrade } from "@/lib/credibility";
import ConsensusGauge from "@/components/ConsensusGauge";
import PatternCard from "@/components/PatternCard";
import { formatValue, getDirectionInfo, getChangeColor } from "@/components/AssetCard";
import type { AssetDirection } from "@/types";

export const revalidate = 43200;

export function generateStaticParams() {
  return assets.map((a) => ({ id: a.id }));
}

function getDirectionArrow(dir: AssetDirection) {
  if (dir === "강세") return { icon: TrendingUp, color: "text-red-400" };
  if (dir === "약세") return { icon: TrendingDown, color: "text-blue-400" };
  if (dir === "변동성확대") return { icon: Activity, color: "text-yellow-400" };
  return { icon: Minus, color: "text-slate-400" };
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = getAssetById(id);
  if (!asset) return notFound();

  const topExperts = getTopExperts(500);
  const expertMap = new Map(topExperts.map((e) => [e.id, e]));
  const predictions = getPredictionsForAsset(id);
  const activePredictions = getActivePredictionsForAsset(id);
  const resolvedPredictions = predictions.filter((p) => p.result && p.result !== "미결");
  const allPreds = getAllAssetPredictions();
  const consensus = calculateAssetConsensus(asset, allPreds, topExperts);
  const accuracy = calculateAssetAccuracy(id, allPreds);
  const pStats = getAssetPredictionStats(id);
  const patterns = getPatternsForAsset(id);
  const relatedFactors = getFactorsForAsset(id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 뒤로가기 */}
      <Link href="/assets" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        자산 전망
      </Link>

      {/* Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="text-sm text-slate-500 mb-1">{asset.nameEn}</p>
            <h1 className="text-3xl font-bold text-white mb-2">{asset.name}</h1>
            <p className="text-sm text-slate-400 max-w-xl">{asset.description}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">{formatValue(asset.currentValue, asset.unit)}</p>
            <p className={`text-lg font-medium ${getChangeColor(asset.changePercent)}`}>
              {asset.changePercent > 0 ? "+" : ""}{asset.changePercent.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">{asset.updatedAt} 기준</p>
          </div>
        </div>

        {/* 컨센서스 게이지 */}
        <ConsensusGauge consensus={consensus} size="lg" />

        {/* 예측 통계 대시보드 */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="text-center">
              <p className="text-xs text-slate-500">총 예측</p>
              <p className="text-lg font-bold text-white">{pStats.totalPredictions}건</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">검증 완료</p>
              <p className="text-lg font-bold text-white">{pStats.resolvedPredictions}건</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">적중률</p>
              <p className={`text-lg font-bold ${pStats.accuracyRate >= 60 ? "text-emerald-400" : "text-yellow-400"}`}>
                {pStats.accuracyRate}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">상승 예측</p>
              <p className="text-lg font-bold text-red-400">{pStats.bullish}명 ({pStats.bullishPct}%)</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">하락 예측</p>
              <p className="text-lg font-bold text-blue-400">{pStats.bearish}명 ({pStats.bearishPct}%)</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">적중/부분/불일치</p>
              <p className="text-sm font-bold">
                <span className="text-emerald-400">{pStats.correct}</span> / <span className="text-yellow-400">{pStats.partial}</span> / <span className="text-red-400">{pStats.incorrect}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 왼쪽: 전문가 예측 + 과거 패턴 */}
        <div className="lg:col-span-2 space-y-8">
          {/* 현재 전문가 예측 */}
          <section>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-400" />
              전문가 예측 ({activePredictions.length}건)
            </h2>
            <div className="space-y-3">
              {activePredictions.map((pred) => {
                const expert = expertMap.get(pred.expertId);
                if (!expert) return null;
                const tier = getCredibilityTier(expert.credibilityScore);
                const accGrade = getAccuracyGrade(expert.accuracyScore);
                const dir = getDirectionInfo(pred.direction);
                const DirIcon = dir.icon;

                return (
                  <div key={pred.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/experts/${expert.id}`} className="hover:text-blue-300 transition-colors">
                          <p className="font-semibold text-white">{expert.name}</p>
                          <p className="text-xs text-slate-500">{expert.affiliation}</p>
                        </Link>
                        <div className={`px-2 py-1 rounded border text-xs font-medium ${tier.bg} ${tier.border} ${tier.color}`}>
                          신뢰도 {expert.credibilityScore}
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className={accGrade.color}>{accGrade.grade}</span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${dir.bg} ${dir.border}`}>
                        <DirIcon className={`w-4 h-4 ${dir.color}`} />
                        <span className={`text-sm font-bold ${dir.color}`}>{pred.direction}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                      <span>신뢰도 {pred.confidence}%</span>
                      <span>{pred.timeframe} 전망</span>
                      {pred.targetRange && (
                        <span>목표: {formatValue(pred.targetRange.low, asset.unit)} ~ {formatValue(pred.targetRange.high, asset.unit)}</span>
                      )}
                    </div>

                    <p className="text-sm text-slate-300 mb-2">{pred.rationale}</p>

                    {pred.keyAssumptions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {pred.keyAssumptions.map((a, i) => (
                          <span key={i} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 과거 예측 기록 (투명성) */}
          {resolvedPredictions.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-emerald-400" />
                과거 예측 기록
              </h2>
              <div className="space-y-3">
                {resolvedPredictions.map((pred) => {
                  const expert = expertMap.get(pred.expertId);
                  const resultColor = pred.result === "적중" ? "text-emerald-400 border-emerald-700/30 bg-emerald-900/20"
                    : pred.result === "부분적중" ? "text-yellow-400 border-yellow-700/30 bg-yellow-900/20"
                    : "text-red-400 border-red-700/30 bg-red-900/20";

                  return (
                    <div key={pred.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{expert?.name || pred.expertId}</span>
                          <span className="text-xs text-slate-500">{pred.publishedAt}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${resultColor}`}>
                          {pred.result}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-1">{pred.rationale}</p>
                      {pred.actualOutcome && (
                        <p className="text-xs text-slate-500 bg-slate-800/60 rounded p-2">
                          실제 결과: {pred.actualOutcome}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 과거 유사 패턴 */}
          {patterns.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-yellow-400" />
                과거 유사 패턴
              </h2>
              <div className="space-y-4">
                {patterns.map((p) => (
                  <PatternCard key={p.id} pattern={p} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 오른쪽: 변동 요인 + 관련 ETF */}
        <div className="space-y-6">
          {/* 변동 요인 */}
          <section>
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              변동 요인
            </h2>
            <div className="space-y-2">
              {relatedFactors.map((factor) => {
                const dir = factor.impactDirection[id];
                const arrow = dir ? getDirectionArrow(dir as AssetDirection) : { icon: Minus, color: "text-slate-400" };
                const ArrowIcon = arrow.icon;

                return (
                  <Link key={factor.id} href={`/factors/${factor.id}`} className="block group">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-slate-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors truncate">
                            {factor.title}
                          </p>
                          <p className="text-xs text-slate-500">{factor.category}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ArrowIcon className={`w-4 h-4 ${arrow.color}`} />
                          <ChevronRight className="w-3 h-3 text-slate-600" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* 관련 ETF */}
          {asset.relatedETFTickers && asset.relatedETFTickers.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                관련 한국 ETF
              </h2>
              <div className="space-y-2">
                {asset.relatedETFTickers.map((ticker) => (
                  <div key={ticker} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                    <span className="text-sm text-slate-300 font-mono">{ticker}</span>
                  </div>
                ))}
              </div>
              <Link href="/investment" className="block mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                투자전략 페이지에서 상세 확인 →
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
