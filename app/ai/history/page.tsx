"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Filter,
  BookOpen,
} from "lucide-react";
import { useAIHistory } from "@/hooks/useAIHistory";
import { assets } from "@/data/assets";
import DirectionBadge from "@/components/ai/DirectionBadge";

const assetNameMap = new Map(assets.map((a) => [a.id, a.name]));

export default function AIHistoryPage() {
  const { accuracy, results, learningLogs, isLoading } = useAIHistory();
  const [filterAsset, setFilterAsset] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");

  const filteredResults = results.filter((r) => {
    if (filterAsset !== "all" && r.assetId !== filterAsset) return false;
    if (filterResult === "correct" && r.correct !== true) return false;
    if (filterResult === "incorrect" && r.correct !== false) return false;
    if (filterResult === "pending" && r.correct !== null) return false;
    return true;
  });

  // 고유 자산 목록
  const uniqueAssets = [...new Set(results.map((r) => r.assetId))];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 뒤로가기 */}
      <Link
        href="/ai"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        AI 시스템
      </Link>

      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">AI 예측 히스토리</h1>
        <p className="text-slate-400">
          과거 예측 기록과 실제 결과 대비 분석
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
          <span className="ml-3 text-slate-400">데이터 로딩 중...</span>
        </div>
      ) : (
        <>
          {/* 정확도 요약 */}
          {accuracy && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
                <p className="text-xs text-slate-500 mb-1">총 예측</p>
                <p className="text-2xl font-bold text-white">
                  {accuracy.totalPredictions}
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
                <p className="text-xs text-slate-500 mb-1">적중</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {accuracy.correctPredictions}
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
                <p className="text-xs text-slate-500 mb-1">정확도</p>
                <p
                  className={`text-2xl font-bold ${
                    accuracy.accuracy >= 60
                      ? "text-emerald-400"
                      : accuracy.accuracy >= 40
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {accuracy.accuracy}%
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
                <p className="text-xs text-slate-500 mb-1">평균 신뢰도</p>
                <p className="text-2xl font-bold text-blue-400">
                  {accuracy.averageConfidence?.toFixed(0) ?? "-"}%
                </p>
              </div>
            </div>
          )}

          {/* 필터 */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterAsset}
              onChange={(e) => setFilterAsset(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">전체 자산</option>
              {uniqueAssets.map((id) => (
                <option key={id} value={id}>
                  {assetNameMap.get(id) || id}
                </option>
              ))}
            </select>
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">전체 결과</option>
              <option value="correct">적중</option>
              <option value="incorrect">미적중</option>
              <option value="pending">평가 대기</option>
            </select>
            <span className="text-xs text-slate-500 ml-auto">
              {filteredResults.length}건 표시
            </span>
          </div>

          {/* 예측 결과 목록 */}
          <div className="space-y-3 mb-12">
            {filteredResults.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>예측 기록이 없습니다</p>
              </div>
            ) : (
              filteredResults.map((r, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4"
                >
                  {/* 결과 아이콘 */}
                  <div className="flex-shrink-0">
                    {r.correct === true ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    ) : r.correct === false ? (
                      <XCircle className="w-6 h-6 text-red-400" />
                    ) : (
                      <Clock className="w-6 h-6 text-slate-500" />
                    )}
                  </div>

                  {/* 자산 + 예측 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">
                        {assetNameMap.get(r.assetId) || r.assetId}
                      </span>
                      <DirectionBadge direction={r.direction as "상승" | "하락" | "보합" | "변동성확대"} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>확률 {r.probability}%</span>
                      <span>신뢰도 {r.confidence}%</span>
                      {r.actualDirection && (
                        <span>
                          실제: <span className="text-slate-300">{r.actualDirection}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 날짜 */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">
                      {r.generatedAt
                        ? new Date(r.generatedAt).toLocaleDateString("ko-KR")
                        : "-"}
                    </p>
                    <p className="text-[10px] text-slate-600">{r.cycleId}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 학습 로그 */}
          {learningLogs.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                학습 기록
              </h2>
              <div className="space-y-3">
                {learningLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-500">{log.cycleId}</span>
                      <span className="text-xs text-slate-600">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleDateString("ko-KR")
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{log.reason}</p>
                    {log.adjustments && (
                      <p className="text-xs text-slate-500 mt-1">
                        조정: {log.adjustments}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
