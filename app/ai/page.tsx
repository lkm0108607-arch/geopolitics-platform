"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Brain,
  TrendingUp,
  BarChart3,
  Activity,
  GitBranch,
  Target,
  Cpu,
  ChevronRight,
  Loader2,
  BookOpen,
  Layers,
  RefreshCw,
  ArrowRight,
  Zap,
  Scale,
  LineChart,
  Network,
  Newspaper,
  MessageSquare,
  Users,
  History,
  Shield,
  Search,
  Gavel,
  ArrowUpDown,
} from "lucide-react";

import { useAIHistory } from "@/hooks/useAIHistory";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import ConfidenceBar from "@/components/ai/ConfidenceBar";

/* ── Model definitions ── */

interface ModelInfo {
  key: string;
  name: string;
  nameEn: string;
  weight: number;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
  description: string;
  indicators: string[];
}

const MODELS: ModelInfo[] = [
  {
    key: "momentum",
    name: "모멘텀 모델",
    nameEn: "Momentum",
    weight: 25,
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
    description:
      "SMA, EMA, RSI, MACD 등 추세 추종 지표를 활용하여 현재 시장의 추세 강도와 방향성을 분석합니다. 강한 상승/하락 모멘텀을 감지하면 추세 지속 가능성을 높게 평가합니다.",
    indicators: ["SMA (단순이동평균)", "EMA (지수이동평균)", "RSI (상대강도지수)", "MACD (이동평균수렴확산)"],
  },
  {
    key: "meanReversion",
    name: "평균회귀 모델",
    nameEn: "Mean Reversion",
    weight: 20,
    icon: <Scale className="w-5 h-5" />,
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/10",
    description:
      "볼린저 밴드와 RSI 극단값을 통해 과매수/과매도 상태를 식별합니다. 가격이 평균에서 크게 벗어났을 때 복귀 가능성을 예측합니다.",
    indicators: ["볼린저 밴드 (상단/하단)", "RSI 극단값 (30 이하 / 70 이상)", "Z-Score", "표준편차 채널"],
  },
  {
    key: "volatility",
    name: "변동성 모델",
    nameEn: "Volatility",
    weight: 15,
    icon: <Activity className="w-5 h-5" />,
    color: "text-rose-400",
    borderColor: "border-rose-500/30",
    bgColor: "bg-rose-500/10",
    description:
      "ATR(Average True Range) 분석과 변동성 레짐 탐지를 통해 시장 변동성의 현재 상태와 향후 변화를 예측합니다. 변동성 확대/축소 구간을 구분합니다.",
    indicators: ["ATR (평균진폭)", "변동성 레짐 탐지", "역사적 변동성", "내재 변동성 비교"],
  },
  {
    key: "correlation",
    name: "교차상관 모델",
    nameEn: "Correlation",
    weight: 20,
    icon: <Network className="w-5 h-5" />,
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/10",
    description:
      "20개 주요 자산 페어 간의 교차상관 분석을 수행합니다. 상관관계 변화와 디커플링 현상을 감지하여 시장 구조적 변화를 포착합니다.",
    indicators: ["20개 자산 페어 상관분석", "롤링 상관계수", "디커플링 감지", "리드-래그 분석"],
  },
  {
    key: "fundamental",
    name: "펀더멘털 모델",
    nameEn: "Fundamental",
    weight: 20,
    icon: <Newspaper className="w-5 h-5" />,
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/10",
    description:
      "VIX 공포지수, 수익률 곡선, 원자재 비율, 뉴스 감성 분석 등 거시경제 지표와 시장 심리를 종합적으로 분석합니다.",
    indicators: ["VIX (공포지수)", "수익률 곡선 (Yield Curve)", "원자재 비율 분석", "뉴스 감성 분석"],
  },
];

const DEFAULT_WEIGHTS: Record<string, number> = {
  momentum: 25,
  meanReversion: 20,
  volatility: 15,
  correlation: 20,
  fundamental: 20,
};

/* ── Learning steps ── */

const LEARNING_STEPS = [
  {
    step: 1,
    title: "역사적 패턴 분석",
    description: "5단계 시간대별 과거 패턴을 분석하고, 호재/악재 촉매 요인이 현재도 유효한지 검증합니다.",
    icon: <History className="w-6 h-6" />,
  },
  {
    step: 2,
    title: "서브모델 예측 + AI 토론",
    description: "5개 서브모델이 독립 예측 후 12라운드 토론을 통해 서로의 근거를 공격/방어/반박합니다.",
    icon: <MessageSquare className="w-6 h-6" />,
  },
  {
    step: 3,
    title: "30인 AI 배심원 심의",
    description: "기술적분석, 거시경제, 리스크, 행동경제학, 통계 전문 AI 배심원 30명이 독립 평가 후 최종 판정합니다.",
    icon: <Gavel className="w-6 h-6" />,
  },
  {
    step: 4,
    title: "실제 결과 비교",
    description: "예측 기간 만료 후 실제 시장 움직임과 비교하여 모든 AI 참여자의 적중 여부를 판정합니다.",
    icon: <Target className="w-6 h-6" />,
  },
  {
    step: 5,
    title: "딥 진단 + 강화 학습",
    description: "지표 세팅, 데이터 반영, 감도, 구조적 한계까지 근본 원인을 분석하고 서브모델, AI 토론, AI 배심원 모두 개선합니다.",
    icon: <Search className="w-6 h-6" />,
  },
  {
    step: 6,
    title: "가중치 + 전문성 조정",
    description: "분석 결과를 바탕으로 모델 가중치, AI 배심원 신뢰도, AI 토론 전략을 동적으로 조정합니다.",
    icon: <RefreshCw className="w-6 h-6" />,
  },
];

/* ── Component ── */

export default function AISystemPage() {
  const { accuracy, learningLogs, weightHistory, isLoading: historyLoading } = useAIHistory();
  const { predictions, isLoading: predictionsLoading } = useAIPredictions();

  const isLoading = historyLoading || predictionsLoading;
  const [modelSortBy, setModelSortBy] = useState<"default" | "weight" | "upVotes" | "avgConf">("default");
  const [logSortBy, setLogSortBy] = useState<"latest" | "oldest">("latest");

  // Get current weights (latest from history or defaults)
  const currentWeights = useMemo(() => {
    if (weightHistory.length > 0) {
      const latest = weightHistory[weightHistory.length - 1];
      return latest.weights;
    }
    return DEFAULT_WEIGHTS;
  }, [weightHistory]);

  // Get latest learning logs (last 5)
  const recentLogs = useMemo(() => {
    return learningLogs.slice(-5).reverse();
  }, [learningLogs]);

  // Compute per-model vote stats from current predictions
  const modelVoteStats = useMemo(() => {
    const stats: Record<string, { up: number; down: number; neutral: number; avgConf: number }> = {};
    MODELS.forEach((m) => {
      stats[m.key] = { up: 0, down: 0, neutral: 0, avgConf: 0 };
    });

    if (predictions.length === 0) return stats;

    predictions.forEach((pred) => {
      const votes = pred.subModelVotes;
      Object.entries(votes).forEach(([key, vote]) => {
        if (!stats[key]) return;
        if (vote.direction === "상승") stats[key].up++;
        else if (vote.direction === "하락") stats[key].down++;
        else stats[key].neutral++;
        stats[key].avgConf += vote.confidence;
      });
    });

    Object.keys(stats).forEach((key) => {
      const total = predictions.length;
      if (total > 0) {
        stats[key].avgConf = Math.round(stats[key].avgConf / total);
      }
    });

    return stats;
  }, [predictions]);

  // Sorted models
  const sortedModels = useMemo(() => {
    const arr = [...MODELS];
    switch (modelSortBy) {
      case "weight":
        return arr.sort((a, b) => (currentWeights[b.key] ?? b.weight) - (currentWeights[a.key] ?? a.weight));
      case "upVotes":
        return arr.sort((a, b) => (modelVoteStats[b.key]?.up ?? 0) - (modelVoteStats[a.key]?.up ?? 0));
      case "avgConf":
        return arr.sort((a, b) => (modelVoteStats[b.key]?.avgConf ?? 0) - (modelVoteStats[a.key]?.avgConf ?? 0));
      default:
        return arr;
    }
  }, [modelSortBy, currentWeights, modelVoteStats]);

  // Sorted learning logs
  const sortedLogs = useMemo(() => {
    const logs = learningLogs.slice(-5);
    return logSortBy === "latest" ? [...logs].reverse() : logs;
  }, [learningLogs, logSortBy]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Hero Section ── */}
      <section className="max-w-7xl mx-auto px-4 pt-10 pb-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-medium mb-6">
            <Cpu className="w-3.5 h-3.5" />
            AI SYSTEM OVERVIEW
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            GeoInsight AI 예측 시스템
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            5개의 독립적인 서브모델이 시장을 다각도로 분석하고,
            12라운드 AI 토론과 30인 전문 AI 배심원 심의를 거쳐 최종 예측을 도출합니다.
            5단계 역사적 패턴 분석, 호재/악재 촉매 분석, 딥 진단 학습 시스템으로
            매 사이클마다 자체 진화합니다.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 pb-16 space-y-12">
        {/* ── Accuracy Overview ── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
                <Target className="w-4 h-4" />
                전체 예측 정확도
              </div>
              {isLoading ? (
                <div className="h-8 bg-slate-700 rounded w-20 animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-white">
                  {accuracy ? `${accuracy.accuracy.toFixed(1)}%` : "--"}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {accuracy ? `${accuracy.correctPredictions}/${accuracy.totalPredictions} 적중` : "데이터 없음"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
                <Brain className="w-4 h-4" />
                평균 신뢰도
              </div>
              {isLoading ? (
                <div className="h-8 bg-slate-700 rounded w-20 animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-white">
                  {accuracy ? `${accuracy.averageConfidence.toFixed(1)}%` : "--"}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">앙상블 평균</p>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
                <Layers className="w-4 h-4" />
                AI 참여자
              </div>
              <p className="text-2xl font-bold text-white">35</p>
              <p className="text-xs text-slate-500 mt-1">5 AI 서브모델 + 30 AI 배심원</p>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
                <RefreshCw className="w-4 h-4" />
                학습 사이클
              </div>
              {isLoading ? (
                <div className="h-8 bg-slate-700 rounded w-20 animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-white">
                  {weightHistory.length > 0 ? weightHistory.length : "--"}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">완료된 사이클</p>
            </div>
          </div>
        </section>

        {/* ── Ensemble Architecture Diagram ── */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-400" />
            앙상블 아키텍처
          </h2>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 md:p-8">
            {/* Flow diagram */}
            <div className="flex flex-col items-center gap-4">
              {/* Input */}
              <div className="rounded-lg border border-slate-600/50 bg-slate-800/80 px-6 py-3 text-center">
                <p className="text-xs text-slate-400 mb-1">입력 데이터</p>
                <p className="text-sm font-medium text-white">실시간 시세 + 기술적 지표 + 거시경제 데이터</p>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-500 rotate-90" />

              {/* Historical Pattern Analysis */}
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-6 py-3 text-center w-full">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <History className="w-4 h-4 text-cyan-400" />
                  <p className="text-xs text-cyan-300">5단계 역사적 패턴 분석 + 호재/악재 촉매 분석</p>
                </div>
                <p className="text-[10px] text-slate-400">초단기(1-3일) → 단기(5-10일) → 중기(20-30일) → 중장기(40-60일) → 장기(60-90일)</p>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-500 rotate-90" />

              {/* 5 models row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
                {MODELS.map((model) => (
                  <div
                    key={model.key}
                    className={`rounded-lg border ${model.borderColor} ${model.bgColor} px-3 py-3 text-center`}
                  >
                    <div className={`${model.color} flex justify-center mb-1.5`}>{model.icon}</div>
                    <p className={`text-xs font-semibold ${model.color}`}>{model.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{currentWeights[model.key] ?? model.weight}%</p>
                  </div>
                ))}
              </div>

              <ArrowRight className="w-5 h-5 text-slate-500 rotate-90" />

              {/* AI Debate */}
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-6 py-3 text-center w-full">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-orange-400" />
                  <p className="text-xs text-orange-300">12라운드 AI 토론</p>
                </div>
                <p className="text-[10px] text-slate-400">주장 → 공격 → 방어 → 반박 → 추가증거 → 최종변론</p>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-500 rotate-90" />

              {/* Weighted vote */}
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-6 py-3 text-center">
                <p className="text-xs text-purple-300 mb-1">가중 투표 (Weighted Voting)</p>
                <p className="text-sm font-medium text-white">
                  토론 결과 반영 + 각 모델의 방향 예측 x 가중치 = 앙상블 예측
                </p>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-500 rotate-90" />

              {/* Jury System */}
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-6 py-4 text-center w-full">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gavel className="w-4 h-4 text-yellow-400" />
                  <p className="text-xs text-yellow-300 font-semibold">30인 AI 배심원단 심의</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
                  <span className="text-blue-300">기술적 분석 8명</span>
                  <span className="text-emerald-300">거시경제 7명</span>
                  <span className="text-rose-300">리스크 관리 5명</span>
                  <span className="text-amber-300">행동경제학 5명</span>
                  <span className="text-purple-300">통계/계량 5명</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">각 AI 배심원이 독립 평가 → 가중 투표 → 최종 판정 (신뢰/부분신뢰/의심/불신)</p>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-500 rotate-90" />

              {/* Output */}
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-center">
                <p className="text-xs text-emerald-300 mb-1">최종 출력</p>
                <p className="text-sm font-medium text-white">방향 + 확률 + 신뢰도 + AI 배심원 판정 + AI 토론 합의</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Model Cards ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              5개 서브모델 상세
            </h2>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              {(["default", "weight", "upVotes", "avgConf"] as const).map((key) => {
                const labels: Record<typeof key, string> = { default: "기본", weight: "가중치", upVotes: "상승투표", avgConf: "평균신뢰도" };
                return (
                  <button key={key} onClick={() => setModelSortBy(key)}
                    className={`px-2 py-0.5 text-[11px] rounded transition ${modelSortBy === key ? "bg-purple-600/30 text-purple-300" : "text-slate-500 hover:text-slate-300"}`}>
                    {labels[key]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedModels.map((model) => {
              const w = currentWeights[model.key] ?? model.weight;
              const stats = modelVoteStats[model.key];

              return (
                <div
                  key={model.key}
                  className={`rounded-xl border ${model.borderColor} bg-slate-900/70 p-5 hover:bg-slate-900 transition-colors`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`${model.bgColor} ${model.color} rounded-lg p-2`}>
                        {model.icon}
                      </div>
                      <div>
                        <h3 className={`text-sm font-bold ${model.color}`}>{model.name}</h3>
                        <p className="text-[10px] text-slate-500">{model.nameEn}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold ${model.color} ${model.bgColor} rounded-full px-2.5 py-0.5`}
                    >
                      {w}%
                    </span>
                  </div>

                  {/* Weight bar */}
                  <div className="mb-4">
                    <ConfidenceBar value={w} label="현재 가중치" size="sm" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{model.description}</p>

                  {/* Indicators */}
                  <div className="mb-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">사용 지표</p>
                    <div className="flex flex-wrap gap-1.5">
                      {model.indicators.map((ind) => (
                        <span
                          key={ind}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-slate-400"
                        >
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Live vote stats */}
                  {predictions.length > 0 && stats && (
                    <div className="mt-3 pt-3 border-t border-slate-700/40">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">현재 투표 현황</p>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-emerald-400">상승 {stats.up}</span>
                        <span className="text-rose-400">하락 {stats.down}</span>
                        <span className="text-slate-400">기타 {stats.neutral}</span>
                        <span className="text-slate-500 ml-auto">평균 신뢰도 {stats.avgConf}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ensemble summary card */}
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-slate-900/70 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-purple-500/10 text-purple-400 rounded-lg p-2">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-purple-400">앙상블 통합</h3>
                  <p className="text-[10px] text-slate-500">Ensemble Integration</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                각 서브모델의 예측을 12라운드 토론으로 검증한 후 가중 투표로 통합합니다.
                30인 전문 AI 배심원이 최종 신뢰도를 판정하며,
                AI 배심원이 &quot;불신&quot; 판정 시 신뢰도가 자동 하향 조정됩니다.
              </p>
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">현재 가중치 배분</p>
                {MODELS.map((model) => {
                  const w = currentWeights[model.key] ?? model.weight;
                  return (
                    <div key={model.key} className="flex items-center gap-2">
                      <span className={`text-[10px] w-16 truncate ${model.color}`}>{model.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500`}
                          style={{
                            width: `${w * 2}%`,
                            background:
                              model.key === "momentum"
                                ? "#60a5fa"
                                : model.key === "meanReversion"
                                  ? "#fbbf24"
                                  : model.key === "volatility"
                                    ? "#fb7185"
                                    : model.key === "correlation"
                                      ? "#c084fc"
                                      : "#34d399",
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{w}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Learning Process ── */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            자체 학습 프로세스
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LEARNING_STEPS.map((step, idx) => (
              <div key={step.step} className="relative">
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 text-xs font-bold">
                      {step.step}
                    </div>
                    <div className="text-purple-400">{step.icon}</div>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                </div>
                {/* Connector arrow (not on last) */}
                {idx < LEARNING_STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2.5 -translate-y-1/2 z-10">
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-slate-700/60 bg-slate-900/70 p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-purple-400" />
              학습 사이클 상세
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 leading-relaxed">
              <div>
                <p className="text-slate-300 font-medium mb-1">딥 진단 학습 시스템</p>
                <p>
                  단순 가중치 조정을 넘어, 각 모델의 기술적 지표 세팅, 데이터 반영 오류,
                  감도 문제, 구조적 한계까지 6가지 카테고리로 근본 원인을 분석합니다.
                  심각도(심각/주의/경미)에 비례한 정밀 보정을 수행합니다.
                </p>
              </div>
              <div>
                <p className="text-slate-300 font-medium mb-1">3중 학습 구조</p>
                <p>
                  서브모델 가중치 조정, AI 토론 전략 개선(신뢰도 재조정, 공격/방어 성공률 분석),
                  AI 배심원 전문성 강화(정확도 기반 신뢰도 업데이트, 전문 영역 초점 재조정)가
                  동시에 이루어집니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Current Model Weights (from history) ── */}
        {weightHistory.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              가중치 변화 이력
            </h2>

            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/60 bg-slate-800/50">
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">사이클</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">일시</th>
                      {MODELS.map((m) => (
                        <th key={m.key} className={`text-center px-3 py-3 font-medium ${m.color}`}>
                          {m.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weightHistory.slice(-10).reverse().map((entry, idx) => (
                      <tr
                        key={entry.cycleId}
                        className={`border-b border-slate-800/50 ${idx === 0 ? "bg-purple-500/5" : "hover:bg-slate-800/30"} transition-colors`}
                      >
                        <td className="px-4 py-2.5 text-slate-300 font-mono">
                          {entry.cycleId}
                          {idx === 0 && (
                            <span className="ml-2 text-[10px] text-purple-400 font-sans">(최신)</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {new Date(entry.timestamp).toLocaleString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        {MODELS.map((m) => {
                          const w = entry.weights[m.key];
                          const defaultW = DEFAULT_WEIGHTS[m.key];
                          const diff = w != null && defaultW != null ? w - defaultW : 0;
                          return (
                            <td key={m.key} className="text-center px-3 py-2.5 font-mono text-slate-300">
                              {w != null ? `${w}%` : "-"}
                              {diff !== 0 && (
                                <span className={`ml-1 text-[10px] ${diff > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {diff > 0 ? "+" : ""}{diff}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── Learning Logs ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              최근 학습 기록
            </h2>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              {(["latest", "oldest"] as const).map((key) => {
                const labels: Record<typeof key, string> = { latest: "최신순", oldest: "오래된순" };
                return (
                  <button key={key} onClick={() => setLogSortBy(key)}
                    className={`px-2 py-0.5 text-[11px] rounded transition ${logSortBy === key ? "bg-purple-600/30 text-purple-300" : "text-slate-500 hover:text-slate-300"}`}>
                    {labels[key]}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : sortedLogs.length === 0 ? (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-8 text-center">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">아직 학습 기록이 없습니다</p>
              <p className="text-xs text-slate-600 mt-1">첫 번째 학습 사이클이 완료되면 여기에 기록됩니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedLogs.map((log) => (
                <div
                  key={`${log.cycleId}-${log.timestamp}`}
                  className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 rounded px-2 py-0.5">
                        사이클 {log.cycleId}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mb-1">
                    <span className="text-slate-500">조정: </span>
                    {log.adjustments}
                  </p>
                  <p className="text-xs text-slate-400">
                    <span className="text-slate-500">사유: </span>
                    {log.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Technical Details ── */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            기술적 세부사항
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                앙상블 방식
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">*</span>
                  <span>5개 AI 서브모델이 독립 예측 후 12라운드 토론으로 검증</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">*</span>
                  <span>가중 투표 + 토론 합의 + AI 배심원 판정의 3중 검증 체계</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">*</span>
                  <span>토론에서 만장일치 시 앙상블 방향 자동 수정</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">*</span>
                  <span>AI 배심원 불신 판정 시 신뢰도 40% 하향 보정</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-400" />
                AI 토론 시스템
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">*</span>
                  <span>12라운드 구조화된 토론 (주장→공격→방어→반박→추가증거→최종변론)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">*</span>
                  <span>실제 기술적 지표를 근거로 한 증거 기반 논쟁</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">*</span>
                  <span>각 AI 모델의 신뢰도가 공격/방어 성공률에 따라 동적 조정</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">*</span>
                  <span>합의 수준: 만장일치, 다수결, 분열, 교착 4단계</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Gavel className="w-4 h-4 text-yellow-400" />
                30인 AI 배심원단
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">*</span>
                  <span>5개 전문 카테고리의 30명 AI 배심원이 독립 평가</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">*</span>
                  <span>기술적 분석(8), 거시경제(7), 리스크(5), 행동경제학(5), 통계(5)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">*</span>
                  <span>4단계 판정: 신뢰, 부분신뢰, 의심, 불신</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">*</span>
                  <span>카테고리별 가중 투표로 최종 판정 산출</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                역사적 패턴 분석
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">*</span>
                  <span>5단계 시간대: 초단기(1-3일), 단기(5-10일), 중기(20-30일), 중장기(40-60일), 장기(60-90일)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">*</span>
                  <span>KNN 유사도 매칭으로 과거 유사 패턴 탐색</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">*</span>
                  <span>시장 레짐 분류: 강한상승, 약한상승, 횡보, 약한하락, 강한하락, 고변동성, 위기</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">*</span>
                  <span>10가지 호재/악재 촉매 요인의 역사적 영향력 및 현재 유효성 분석</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                데이터 파이프라인
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">*</span>
                  <span>Yahoo Finance 실시간 시세 데이터 (22개 자산)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">*</span>
                  <span>22개 고급 기술적 지표 (ADX, Parabolic SAR, Stochastic, Ichimoku 등)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">*</span>
                  <span>거시경제 데이터 (VIX, 금리, 원자재, 뉴스 감성)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">*</span>
                  <span>교차상관 매트릭스 (20개 자산 페어)</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-400" />
                딥 진단 학습
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">*</span>
                  <span>6가지 진단 카테고리: 지표세팅, 데이터부족, 값오류, 감도문제, 구조적한계, 외부충격</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">*</span>
                  <span>3단계 심각도(심각/주의/경미) 기반 정밀 보정</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">*</span>
                  <span>근본 원인 분석 + 소수 정답 모델 보너스 적용</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">*</span>
                  <span>토론 전략 개선 + AI 배심원 전문성 강화 동시 수행</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Navigation Links ── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/predictions"
              className="group rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 hover:border-purple-500/50 hover:bg-slate-900 transition-all"
            >
              <Brain className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
                AI 예측 결과
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                모든 자산의 실시간 AI 예측 결과와 서브모델별 투표 내역을 확인하세요
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-purple-400 mt-3">
                예측 보기 <ChevronRight className="w-3 h-3" />
              </span>
            </Link>

            <Link
              href="/ai/history"
              className="group rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 hover:border-emerald-500/50 hover:bg-slate-900 transition-all"
            >
              <LineChart className="w-8 h-8 text-emerald-400 mb-3" />
              <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
                학습 이력 분석
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                AI 모델의 과거 성과, 가중치 변화 추이, 학습 로그를 상세히 분석하세요
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 mt-3">
                이력 보기 <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
