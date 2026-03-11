"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Brain,
  Target,
  Loader2,
} from "lucide-react";
import { getAssetById } from "@/data/assets";
import { koreanETFs } from "@/data/koreanETFs";
import { useLivePrices } from "@/components/LivePriceProvider";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useAIHistory } from "@/hooks/useAIHistory";
import DirectionBadge from "@/components/ai/DirectionBadge";
import ConfidenceBar from "@/components/ai/ConfidenceBar";
import SubModelBreakdown from "@/components/ai/SubModelBreakdown";

function getChangeColor(change: number) {
  if (change > 0) return "text-red-400";
  if (change < 0) return "text-blue-400";
  return "text-slate-400";
}

function formatPrice(value: number, unit: string) {
  if (unit === "USD" || unit === "달러") return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (unit === "원" || unit === "KRW") return `${value.toLocaleString("ko-KR")}원`;
  if (unit === "포인트" || unit === "pt") return `${value.toLocaleString("ko-KR")}pt`;
  if (unit === "%") return `${value.toFixed(2)}%`;
  if (unit === "엔" || unit === "JPY") return `¥${value.toLocaleString("ja-JP")}`;
  if (unit === "유로" || unit === "EUR") return `€${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${value.toLocaleString()} ${unit}`;
}

export default function AssetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const asset = getAssetById(id);

  const { prices } = useLivePrices();
  const { predictions, isLoading: predictionsLoading } = useAIPredictions();
  const { accuracy, results, isLoading: historyLoading } = useAIHistory(id);

  if (!asset) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-400 text-lg">존재하지 않는 자산입니다.</p>
        <Link href="/assets" className="text-blue-400 hover:text-blue-300 text-sm mt-4 inline-block">
          자산 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const livePrice = prices.get(id);
  const displayPrice = (livePrice && livePrice.price > 0) ? livePrice.price : asset.currentValue;
  const displayChange = (livePrice && livePrice.price > 0) ? livePrice.changePercent : asset.changePercent;

  const prediction = predictions.find((p) => p.assetId === id);

  const isLoading = predictionsLoading || historyLoading;

  if (isLoading && !prediction && !accuracy) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-slate-400 text-sm">데이터 로딩 중...</p>
      </div>
    );
  }

  const assetResults = results.filter((r) => r.assetId === id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 뒤로가기 */}
      <Link
        href="/assets"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        자산 전망
      </Link>

      {/* Hero Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">{asset.nameEn}</p>
            <h1 className="text-3xl font-bold text-white mb-2">{asset.name}</h1>
            <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
              {asset.description}
            </p>
          </div>
          <div className="text-right">
            {displayPrice > 0 ? (
              <>
                <p className="text-3xl font-bold text-white">
                  {formatPrice(displayPrice, asset.unit)}
                </p>
                <p className={`text-lg font-medium ${getChangeColor(displayChange)}`}>
                  {displayChange > 0 ? "+" : ""}
                  {displayChange.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {livePrice
                    ? `실시간 (${new Date(livePrice.updatedAt).toLocaleTimeString("ko-KR")})`
                    : `${asset.updatedAt} 기준`}
                </p>
              </>
            ) : (
              <p className="text-lg text-slate-500">가격 데이터 로딩중</p>
            )}
          </div>
        </div>

        {/* AI Prediction Badge in Hero */}
        {prediction && (
          <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-slate-400">AI 예측:</span>
            <DirectionBadge direction={prediction.direction} size="lg" />
            <span className="text-sm text-slate-300 font-mono">
              확률 {prediction.probability.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: AI Analysis + Sub-models + History */}
        <div className="lg:col-span-2 space-y-8">
          {/* AI Analysis Panel */}
          {prediction ? (
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
                <Brain className="w-5 h-5 text-purple-400" />
                AI 분석
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800/60 rounded-lg p-4 text-center">
                  <p className="text-xs text-slate-500 mb-2">예측 방향</p>
                  <DirectionBadge direction={prediction.direction} size="md" />
                </div>
                <div className="bg-slate-800/60 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-2 text-center">확률</p>
                  <p className="text-2xl font-bold text-white text-center">
                    {prediction.probability.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-2">신뢰도</p>
                  <ConfidenceBar value={prediction.confidence} label="신뢰도" />
                </div>
              </div>

              {/* Rationale */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">분석 근거</h3>
                <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/50">
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {prediction.rationale}
                  </p>
                </div>
              </div>

              {/* Sub-model Breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  서브모델 투표 현황
                </h3>
                <SubModelBreakdown votes={prediction.subModelVotes} />
              </div>

              <p className="text-[11px] text-slate-600 mt-4 text-right">
                생성: {new Date(prediction.generatedAt).toLocaleString("ko-KR")} | 사이클: {prediction.cycleId}
              </p>
            </section>
          ) : (
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
              <Brain className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                현재 이 자산에 대한 AI 예측이 없습니다.
              </p>
            </section>
          )}

          {/* AI History Section */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
              <Target className="w-5 h-5 text-emerald-400" />
              AI 예측 히스토리
            </h2>

            {/* Accuracy Stats */}
            {accuracy && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">총 예측</p>
                  <p className="text-xl font-bold text-white">
                    {accuracy.totalPredictions}건
                  </p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">적중</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {accuracy.correctPredictions}건
                  </p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">적중률</p>
                  <p
                    className={`text-xl font-bold ${
                      accuracy.accuracy >= 60
                        ? "text-emerald-400"
                        : accuracy.accuracy >= 40
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {accuracy.accuracy.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">평균 신뢰도</p>
                  <p className="text-xl font-bold text-blue-400">
                    {(accuracy.averageConfidence ?? 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            {/* Past Prediction Results */}
            {assetResults.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  과거 예측 결과
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {assetResults.map((result, idx) => (
                    <div
                      key={`${result.cycleId}-${idx}`}
                      className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {result.correct === true && (
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                        {result.correct === false && (
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        {result.correct === null && (
                          <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-200 font-medium">
                              {result.direction}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {result.probability.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {new Date(result.generatedAt).toLocaleDateString("ko-KR")}
                            {result.actualDirection && (
                              <span className="ml-2">
                                실제: {result.actualDirection}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-xs text-slate-500 font-mono">
                          신뢰도 {result.confidence.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                아직 과거 예측 결과가 없습니다.
              </p>
            )}
          </section>
        </div>

        {/* Right Column: Related ETFs + Meta */}
        <div className="space-y-6">
          {/* Asset Info Card */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              자산 정보
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">카테고리</dt>
                <dd className="text-slate-200">{asset.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">단위</dt>
                <dd className="text-slate-200">{asset.unit}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">현재가</dt>
                <dd className="text-slate-200">
                  {formatPrice(displayPrice, asset.unit)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">변동률</dt>
                <dd className={getChangeColor(displayChange)}>
                  {displayChange > 0 ? "+" : ""}
                  {displayChange.toFixed(2)}%
                </dd>
              </div>
            </dl>
          </section>

          {/* Related ETFs */}
          {asset.relatedETFTickers && asset.relatedETFTickers.length > 0 && (
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                관련 ETF
              </h2>
              <div className="space-y-2">
                {asset.relatedETFTickers.map((ticker) => {
                  const etf = koreanETFs.find((e) => e.ticker === ticker);
                  return (
                    <div
                      key={ticker}
                      className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 flex items-center justify-between"
                    >
                      <span className="text-sm text-slate-300">
                        {etf?.name ?? ticker}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {ticker}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Link
                href="/investment"
                className="block mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                투자전략 페이지에서 상세 확인 →
              </Link>
            </section>
          )}

          {/* Quick AI Summary (right sidebar) */}
          {prediction && (
            <section className="bg-slate-900 border border-purple-500/20 rounded-xl p-5">
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                AI 요약
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">방향</span>
                  <DirectionBadge direction={prediction.direction} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">확률</span>
                  <span className="text-sm font-mono text-white">
                    {prediction.probability.toFixed(1)}%
                  </span>
                </div>
                <ConfidenceBar value={prediction.confidence} label="신뢰도" size="sm" />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
