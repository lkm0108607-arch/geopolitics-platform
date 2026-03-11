"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Brain,
  Target,
  Activity,
  ChevronRight,
  RefreshCw,
  BarChart3,
  Sparkles,
  PieChart,
  Clock,
  Zap,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { useAIHistory } from "@/hooks/useAIHistory";
import { getAssetById } from "@/data/assets";
import ConfidenceBar from "@/components/ai/ConfidenceBar";

// ── 투자 시그널 타입 ──────────────────────────────────────────────────────────

type InvestmentSignal = "강력매수" | "매수" | "관망" | "매도" | "강력매도";

interface InvestmentStrategy {
  assetId: string;
  name: string;
  category: string;
  signal: InvestmentSignal;
  direction: string;
  probability: number;
  confidence: number;
  // 투자 솔루션 데이터
  expectedReturn: number; // 예상 수익률 (%)
  riskLevel: "낮음" | "보통" | "높음" | "매우높음";
  timingScore: number; // 진입 타이밍 점수 (0-100)
  holdingPeriod: string; // 권장 보유기간
  entryRecommendation: string; // 진입 추천 문구
  exitRecommendation: string; // 이탈 추천 문구
  keyReason: string; // 핵심 근거 요약
  // AI 타이밍 예측
  expectedPeakDays?: number;    // 고점까지 예상 일수
  expectedTroughDays?: number;  // 저점까지 예상 일수
  expectedPeakDate?: string;    // 고점 예상 날짜
  expectedTroughDate?: string;  // 저점 예상 날짜
  stopLossPercent?: number;     // 손절 기준 (%)
  riskReward?: number;          // 리스크/리워드 비율
  trendDurationDays?: number;   // 추세 지속 예상 기간 (일)
  holdingPeriodDays?: number;   // 권장 보유기간 (일)
  entryTimingDetail?: string;   // 상세 진입 타이밍
  exitTimingDetail?: string;    // 상세 이탈 타이밍
  // AI 근거
  debateAgreement?: string;
  juryVerdict?: string;
  juryConfidence?: number;
}

// ── 투자 시그널 계산 로직 ──────────────────────────────────────────────────────

function computeInvestmentSignal(pred: AIPrediction): InvestmentSignal {
  const { direction, probability, confidence, juryVerdict, debateResult } = pred;

  // 배심원 + 토론 합의를 종합한 종합 점수
  let score = (probability / 100) * 0.4 + (confidence / 100) * 0.3;

  // 배심원 판정 반영
  if (juryVerdict) {
    const verdictBonus: Record<string, number> = {
      "신뢰": 0.3,
      "부분신뢰": 0.15,
      "의심": -0.1,
      "불신": -0.3,
    };
    score += verdictBonus[juryVerdict.finalVerdict] ?? 0;
  }

  // 토론 합의 수준 반영
  if (debateResult) {
    const agreementBonus: Record<string, number> = {
      "만장일치": 0.2,
      "다수결": 0.1,
      "분열": -0.05,
      "교착": -0.15,
    };
    score += agreementBonus[debateResult.agreementLevel] ?? 0;
  }

  if (direction === "상승") {
    if (score >= 0.75) return "강력매수";
    if (score >= 0.55) return "매수";
    return "관망";
  } else if (direction === "하락") {
    if (score >= 0.75) return "강력매도";
    if (score >= 0.55) return "매도";
    return "관망";
  }
  return "관망";
}

function computeExpectedReturn(pred: AIPrediction): number {
  const base = pred.probability * 0.05; // 기본 수익률 추정
  const confMultiplier = pred.confidence / 100;

  let juryMultiplier = 1.0;
  if (pred.juryVerdict) {
    const multipliers: Record<string, number> = {
      "신뢰": 1.3, "부분신뢰": 1.0, "의심": 0.7, "불신": 0.4,
    };
    juryMultiplier = multipliers[pred.juryVerdict.finalVerdict] ?? 1.0;
  }

  const raw = base * confMultiplier * juryMultiplier;
  return pred.direction === "하락" ? -raw : raw;
}

function computeRiskLevel(pred: AIPrediction): "낮음" | "보통" | "높음" | "매우높음" {
  let risk = 50; // 기본 리스크

  // 신뢰도가 낮으면 리스크 높음
  if (pred.confidence < 40) risk += 25;
  else if (pred.confidence < 55) risk += 10;
  else risk -= 10;

  // 배심원 판정 반영
  if (pred.juryVerdict) {
    if (pred.juryVerdict.finalVerdict === "불신") risk += 30;
    else if (pred.juryVerdict.finalVerdict === "의심") risk += 15;
    else if (pred.juryVerdict.finalVerdict === "신뢰") risk -= 15;
  }

  // 토론 교착이면 리스크 높음
  if (pred.debateResult) {
    if (pred.debateResult.agreementLevel === "교착") risk += 20;
    else if (pred.debateResult.agreementLevel === "분열") risk += 10;
    else if (pred.debateResult.agreementLevel === "만장일치") risk -= 10;
  }

  if (risk >= 80) return "매우높음";
  if (risk >= 60) return "높음";
  if (risk >= 40) return "보통";
  return "낮음";
}

function computeTimingScore(pred: AIPrediction): number {
  let score = 50;

  // 확률 기반
  score += (pred.probability - 50) * 0.5;

  // 신뢰도 기반
  score += (pred.confidence - 50) * 0.3;

  // 배심원 보정
  if (pred.juryVerdict) {
    const bonus: Record<string, number> = { "신뢰": 15, "부분신뢰": 5, "의심": -10, "불신": -20 };
    score += bonus[pred.juryVerdict.finalVerdict] ?? 0;
  }

  // 토론 합의 보정
  if (pred.debateResult) {
    const bonus: Record<string, number> = { "만장일치": 15, "다수결": 5, "분열": -5, "교착": -15 };
    score += bonus[pred.debateResult.agreementLevel] ?? 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getHoldingPeriod(pred: AIPrediction): string {
  if (pred.confidence >= 70 && pred.probability >= 65) return "1~2주";
  if (pred.confidence >= 55) return "1~4주";
  return "단기 관망 후 재평가";
}

function getEntryRecommendation(signal: InvestmentSignal, pred: AIPrediction): string {
  if (signal === "강력매수") return "현재가 매수 진입 적기. 분할매수 권장.";
  if (signal === "매수") return "소량 진입 후 추가 확인 시 비중 확대.";
  if (signal === "강력매도") return "보유 시 즉시 매도 검토. 신규 진입 금지.";
  if (signal === "매도") return "보유 시 일부 매도로 리스크 축소.";
  return "신규 진입 보류. 시장 방향 확인 후 재평가.";
}

function getExitRecommendation(signal: InvestmentSignal, pred: AIPrediction): string {
  const expectedReturn = Math.abs(computeExpectedReturn(pred));
  if (signal === "강력매수" || signal === "매수") {
    return `목표 수익률 ${expectedReturn.toFixed(1)}% 도달 시 절반 익절. 손절 기준: -${Math.max(1, expectedReturn * 0.5).toFixed(1)}%`;
  }
  if (signal === "강력매도" || signal === "매도") {
    return `반등 시 추가 매도 기회. 손실 확대 전 포지션 정리.`;
  }
  return "명확한 방향성 확인까지 포지션 유지 or 축소.";
}

function getKeyReason(pred: AIPrediction): string {
  // rationale의 첫 줄 또는 종합 판단 부분 추출
  const lines = pred.rationale.split("\n").filter((l) => l.trim());
  const summary = lines.find((l) => l.startsWith("종합 판단:"));
  if (summary) return summary.replace("종합 판단:", "").trim();
  return lines[0]?.slice(0, 60) + (lines[0]?.length > 60 ? "..." : "") || "분석 데이터 기반 판단";
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function buildStrategy(pred: AIPrediction): InvestmentStrategy {
  const asset = getAssetById(pred.assetId);
  const signal = computeInvestmentSignal(pred);
  const tp = pred.timingPrediction;

  return {
    assetId: pred.assetId,
    name: asset?.name ?? pred.assetId,
    category: asset?.category ?? "",
    signal,
    direction: pred.direction,
    probability: pred.probability,
    confidence: pred.confidence,
    expectedReturn: tp?.expectedReturnPercent ?? computeExpectedReturn(pred),
    riskLevel: computeRiskLevel(pred),
    timingScore: computeTimingScore(pred),
    holdingPeriod: tp ? `${tp.holdingPeriodDays}일` : getHoldingPeriod(pred),
    entryRecommendation: tp?.entryTiming ?? getEntryRecommendation(signal, pred),
    exitRecommendation: tp?.exitTiming ?? getExitRecommendation(signal, pred),
    keyReason: getKeyReason(pred),
    // AI 타이밍 예측
    expectedPeakDays: tp?.expectedPeakDays,
    expectedTroughDays: tp?.expectedTroughDays,
    expectedPeakDate: tp ? addDays(tp.expectedPeakDays) : undefined,
    expectedTroughDate: tp ? addDays(tp.expectedTroughDays) : undefined,
    stopLossPercent: tp?.stopLossPercent,
    riskReward: tp?.riskReward,
    trendDurationDays: tp?.trendDurationDays,
    holdingPeriodDays: tp?.holdingPeriodDays,
    entryTimingDetail: tp?.entryTiming,
    exitTimingDetail: tp?.exitTiming,
    debateAgreement: pred.debateResult?.agreementLevel,
    juryVerdict: pred.juryVerdict?.finalVerdict,
    juryConfidence: pred.juryVerdict?.finalConfidence,
  };
}

// ── 시그널별 스타일 ──────────────────────────────────────────────────────────

const signalStyle: Record<InvestmentSignal, { bg: string; text: string; border: string; icon: typeof TrendingUp }> = {
  "강력매수": { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", icon: ArrowUpRight },
  "매수": { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", icon: TrendingUp },
  "관망": { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30", icon: Eye },
  "매도": { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", icon: TrendingDown },
  "강력매도": { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30", icon: ArrowDownRight },
};

const riskStyle: Record<string, string> = {
  "낮음": "text-emerald-400",
  "보통": "text-yellow-400",
  "높음": "text-orange-400",
  "매우높음": "text-red-400",
};

// ── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function InvestmentPage() {
  const { predictions, cycleId, isLoading, error, refresh } = useAIPredictions();
  const { accuracy } = useAIHistory();
  const [activeTab, setActiveTab] = useState<"all" | "buy" | "sell" | "hold">("all");
  const [showCount, setShowCount] = useState(15);

  const strategies = useMemo(
    () => predictions.map(buildStrategy).sort((a, b) => {
      // 강력매수 > 매수 > 강력매도 > 매도 > 관망 순서
      const order: Record<InvestmentSignal, number> = {
        "강력매수": 0, "매수": 1, "강력매도": 2, "매도": 3, "관망": 4,
      };
      const diff = order[a.signal] - order[b.signal];
      if (diff !== 0) return diff;
      return Math.abs(b.expectedReturn) - Math.abs(a.expectedReturn);
    }),
    [predictions]
  );

  const filtered = useMemo(() => {
    if (activeTab === "buy") return strategies.filter((s) => s.signal === "강력매수" || s.signal === "매수");
    if (activeTab === "sell") return strategies.filter((s) => s.signal === "강력매도" || s.signal === "매도");
    if (activeTab === "hold") return strategies.filter((s) => s.signal === "관망");
    return strategies;
  }, [strategies, activeTab]);

  const buyCount = strategies.filter((s) => s.signal === "강력매수" || s.signal === "매수").length;
  const sellCount = strategies.filter((s) => s.signal === "강력매도" || s.signal === "매도").length;
  const holdCount = strategies.filter((s) => s.signal === "관망").length;

  // 포트폴리오 제안 (매수 시그널 상위 5개)
  const portfolio = useMemo(() => {
    const buys = strategies
      .filter((s) => s.signal === "강력매수" || s.signal === "매수")
      .sort((a, b) => b.timingScore - a.timingScore)
      .slice(0, 5);
    if (buys.length === 0) return [];
    const totalScore = buys.reduce((sum, s) => sum + s.timingScore, 0);
    return buys.map((s) => ({
      ...s,
      weight: totalScore > 0 ? Math.round((s.timingScore / totalScore) * 100) : 20,
    }));
  }, [strategies]);

  const displayedStrategies = filtered.slice(0, showCount);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-7 h-7 text-emerald-400" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">AI 투자 전략</h1>
              <p className="text-xs text-slate-500">
                5개 AI 모델 토론 + 30인 AI 배심원 기반 투자 솔루션
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {cycleId && (
              <span className="text-[10px] font-mono text-slate-600 hidden sm:inline">
                {cycleId}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition disabled:opacity-40"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-300">AI 투자 전략 데이터를 불러오지 못했습니다.</p>
              <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
            </div>
            <button onClick={refresh} className="text-xs text-red-400 hover:text-red-300 underline">재시도</button>
          </div>
        )}

        {/* ── Loading ────────────────────────────────────────────────────── */}
        {isLoading && predictions.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />
            ))}
          </div>
        )}

        {/* ── 시장 진단 요약 ─────────────────────────────────────────────── */}
        {strategies.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard
              label="강력매수"
              count={strategies.filter((s) => s.signal === "강력매수").length}
              color="text-red-400"
              bgColor="bg-red-500/10"
            />
            <SummaryCard
              label="매수"
              count={strategies.filter((s) => s.signal === "매수").length}
              color="text-orange-400"
              bgColor="bg-orange-500/10"
            />
            <SummaryCard
              label="관망"
              count={holdCount}
              color="text-slate-400"
              bgColor="bg-slate-500/10"
            />
            <SummaryCard
              label="매도"
              count={strategies.filter((s) => s.signal === "매도").length}
              color="text-blue-400"
              bgColor="bg-blue-500/10"
            />
            <SummaryCard
              label="강력매도"
              count={strategies.filter((s) => s.signal === "강력매도").length}
              color="text-indigo-400"
              bgColor="bg-indigo-500/10"
            />
          </section>
        )}

        {/* ── AI 성과 지표 ───────────────────────────────────────────────── */}
        {accuracy && accuracy.totalPredictions > 0 && (
          <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold">AI 학습 성과</h3>
              <span className="text-[10px] text-slate-500 ml-auto">예측 후 자동 학습으로 지속 개선</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-slate-500">총 예측</p>
                <p className="text-lg font-bold font-mono">{accuracy.totalPredictions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">적중</p>
                <p className="text-lg font-bold font-mono text-emerald-400">{accuracy.correctPredictions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">적중률</p>
                <p className={`text-lg font-bold font-mono ${accuracy.accuracy >= 60 ? "text-emerald-400" : accuracy.accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                  {accuracy.accuracy.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">평균 신뢰도</p>
                <p className="text-lg font-bold font-mono">{(accuracy.averageConfidence ?? 0).toFixed(1)}%</p>
              </div>
            </div>
          </section>
        )}

        {/* ── 포트폴리오 제안 ──────────────────────────────────────────── */}
        {portfolio.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold">AI 포트폴리오 제안</h2>
              <span className="text-xs text-slate-500 ml-2">매수 시그널 기반 최적 배분</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs border-b border-slate-800">
                      <th className="text-left px-5 py-3 font-medium">자산</th>
                      <th className="text-center px-3 py-3 font-medium">시그널</th>
                      <th className="text-right px-3 py-3 font-medium">예상 수익률</th>
                      <th className="text-center px-3 py-3 font-medium">리스크</th>
                      <th className="text-center px-3 py-3 font-medium">타이밍</th>
                      <th className="text-center px-3 py-3 font-medium hidden lg:table-cell">고점 예상</th>
                      <th className="text-center px-3 py-3 font-medium hidden lg:table-cell">손절</th>
                      <th className="text-center px-3 py-3 font-medium hidden xl:table-cell">보유기간</th>
                      <th className="text-right px-5 py-3 font-medium">비중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((s) => {
                      const style = signalStyle[s.signal];
                      return (
                        <tr key={s.assetId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-[10px] text-slate-500 ml-2">{s.category}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                              {s.signal}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono">
                            <span className={s.expectedReturn > 0 ? "text-red-400" : "text-blue-400"}>
                              {s.expectedReturn > 0 ? "+" : ""}{s.expectedReturn.toFixed(1)}%
                            </span>
                          </td>
                          <td className={`px-3 py-3 text-center text-xs ${riskStyle[s.riskLevel]}`}>
                            {s.riskLevel}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <TimingBadge score={s.timingScore} />
                          </td>
                          <td className="px-3 py-3 text-center hidden lg:table-cell">
                            {s.expectedPeakDate ? (
                              <span className="text-xs font-mono text-red-400">{s.expectedPeakDate} <span className="text-[10px] text-slate-500">({s.expectedPeakDays}일)</span></span>
                            ) : <span className="text-[10px] text-slate-600">-</span>}
                          </td>
                          <td className="px-3 py-3 text-center hidden lg:table-cell">
                            {s.stopLossPercent != null ? (
                              <span className="text-xs font-mono text-red-400">-{s.stopLossPercent.toFixed(1)}%</span>
                            ) : <span className="text-[10px] text-slate-600">-</span>}
                          </td>
                          <td className="px-3 py-3 text-center hidden xl:table-cell">
                            {s.holdingPeriodDays != null ? (
                              <span className="text-xs font-mono text-slate-300">{s.holdingPeriodDays}일</span>
                            ) : <span className="text-[10px] text-slate-600">-</span>}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-emerald-400">
                            {s.weight}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* 비중 바 */}
              <div className="px-5 py-3 border-t border-slate-800">
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-800">
                  {portfolio.map((s, i) => {
                    const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];
                    return (
                      <div
                        key={s.assetId}
                        className={`${colors[i % colors.length]} transition-all duration-500`}
                        style={{ width: `${s.weight}%` }}
                        title={`${s.name}: ${s.weight}%`}
                      />
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-2 flex-wrap">
                  {portfolio.map((s, i) => {
                    const dotColors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];
                    return (
                      <span key={s.assetId} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                        {s.name} {s.weight}%
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── 필터 탭 ──────────────────────────────────────────────────── */}
        {strategies.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <TabButton active={activeTab === "all"} onClick={() => { setActiveTab("all"); setShowCount(15); }}>
              전체 ({strategies.length})
            </TabButton>
            <TabButton active={activeTab === "buy"} onClick={() => { setActiveTab("buy"); setShowCount(15); }}>
              <TrendingUp className="w-3.5 h-3.5" /> 매수 ({buyCount})
            </TabButton>
            <TabButton active={activeTab === "sell"} onClick={() => { setActiveTab("sell"); setShowCount(15); }}>
              <TrendingDown className="w-3.5 h-3.5" /> 매도 ({sellCount})
            </TabButton>
            <TabButton active={activeTab === "hold"} onClick={() => { setActiveTab("hold"); setShowCount(15); }}>
              <Eye className="w-3.5 h-3.5" /> 관망 ({holdCount})
            </TabButton>
          </div>
        )}

        {/* ── 투자 전략 카드 ──────────────────────────────────────────── */}
        {displayedStrategies.length > 0 && (
          <section className="space-y-3">
            {displayedStrategies.map((strategy) => (
              <StrategyCard key={strategy.assetId} strategy={strategy} />
            ))}
          </section>
        )}

        {/* ── 더보기/접기 ──────────────────────────────────────────────── */}
        {filtered.length > showCount && (
          <div className="text-center">
            <button
              onClick={() => setShowCount((c) => c + 15)}
              className="text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg px-6 py-2 hover:bg-slate-800 transition"
            >
              더보기 ({filtered.length - showCount}개 남음)
            </button>
          </div>
        )}
        {showCount > 15 && filtered.length <= showCount && (
          <div className="text-center">
            <button
              onClick={() => setShowCount(15)}
              className="text-sm text-slate-500 hover:text-white transition"
            >
              접기
            </button>
          </div>
        )}

        {/* ── 하단 링크 ───────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/investment/simulation"
            className="group flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/50 hover:bg-slate-800/50 transition"
          >
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <Target className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">모의투자 시뮬레이션</h3>
              <p className="text-xs text-slate-500 mt-0.5">AI 전략 기반 가상 포트폴리오로 전략을 테스트하세요</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition" />
          </Link>
          <Link
            href="/predictions"
            className="group flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-500/50 hover:bg-slate-800/50 transition"
          >
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Brain className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">AI 예측 분석</h3>
              <p className="text-xs text-slate-500 mt-0.5">서브모델 투표, AI 토론, 배심원 판정 상세 보기</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition" />
          </Link>
        </section>

        {/* ── 투자 위험 안내 ──────────────────────────────────────────── */}
        <section className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-yellow-300">투자 위험 안내</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-400 leading-relaxed">
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
              <span>
                본 페이지의 모든 투자 전략은 AI 모델이 자동 생성한 <strong className="text-slate-300">참고 자료</strong>이며,
                투자 권유가 아닙니다. 투자의 최종 판단과 책임은 투자자 본인에게 있습니다.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
              <span>
                AI 예측은 과거 데이터와 통계 모델에 기반하며, 미래 수익을 보장하지 않습니다.
                예상 수익률은 AI 모델의 확률적 추정치이며 실제 수익과 다를 수 있습니다.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
              <span>
                AI 투자 전략은 매일 오후 2시 예측 데이터 기반으로 자동 업데이트되며,
                예측 후 학습 과정을 통해 정확도가 지속적으로 개선됩니다.
              </span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}

// ── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function SummaryCard({ label, count, color, bgColor }: { label: string; count: number; color: string; bgColor: string }) {
  return (
    <div className={`${bgColor} border border-slate-800 rounded-xl p-3 text-center`}>
      <p className={`text-2xl font-bold font-mono ${color}`}>{count}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
        active
          ? "bg-slate-800 text-white border border-slate-700"
          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
      }`}
    >
      {children}
    </button>
  );
}

function TimingBadge({ score }: { score: number }) {
  let color = "text-slate-400";
  let label = "보통";
  if (score >= 75) { color = "text-emerald-400"; label = "적기"; }
  else if (score >= 55) { color = "text-yellow-400"; label = "양호"; }
  else if (score < 35) { color = "text-red-400"; label = "부적절"; }

  return (
    <span className={`text-xs font-medium ${color}`}>
      {label} <span className="text-[10px] opacity-60">{score}</span>
    </span>
  );
}

function StrategyCard({ strategy }: { strategy: InvestmentStrategy }) {
  const [expanded, setExpanded] = useState(false);
  const style = signalStyle[strategy.signal];
  const SignalIcon = style.icon;

  return (
    <div className={`rounded-xl border ${style.border} bg-slate-900/70 overflow-hidden transition-all`}>
      {/* 상단: 시그널 + 자산명 + 핵심 지표 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg ${style.bg}`}>
            <SignalIcon className={`w-4 h-4 ${style.text}`} />
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white truncate">{strategy.name}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} font-medium`}>
                {strategy.signal}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
              <span>{strategy.category}</span>
              {strategy.juryVerdict && <span>AI 배심원: {strategy.juryVerdict}</span>}
              {strategy.debateAgreement && <span>토론: {strategy.debateAgreement}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* 예상 수익률 */}
          <div className="text-right hidden sm:block">
            <span className={`text-sm font-mono font-bold ${strategy.expectedReturn > 0 ? "text-red-400" : strategy.expectedReturn < 0 ? "text-blue-400" : "text-slate-400"}`}>
              {strategy.expectedReturn > 0 ? "+" : ""}{strategy.expectedReturn.toFixed(1)}%
            </span>
            <p className="text-[10px] text-slate-500">예상 수익률</p>
          </div>
          {/* 타이밍 점수 */}
          <div className="text-right hidden md:block">
            <TimingBadge score={strategy.timingScore} />
            <p className="text-[10px] text-slate-500">진입 타이밍</p>
          </div>
          {/* 리스크 */}
          <div className="text-right hidden lg:block">
            <span className={`text-xs font-medium ${riskStyle[strategy.riskLevel]}`}>{strategy.riskLevel}</span>
            <p className="text-[10px] text-slate-500">리스크</p>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {/* 상세 정보 */}
      {expanded && (
        <div className="border-t border-slate-700/50 p-4 space-y-4 bg-slate-900/40">
          {/* 핵심 지표 그리드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox
              label="예상 수익률"
              value={`${strategy.expectedReturn > 0 ? "+" : ""}${strategy.expectedReturn.toFixed(1)}%`}
              color={strategy.expectedReturn > 0 ? "text-red-400" : "text-blue-400"}
            />
            <MetricBox
              label="예측 확률"
              value={`${strategy.probability.toFixed(1)}%`}
              color="text-white"
            />
            <MetricBox
              label="AI 신뢰도"
              value={`${strategy.confidence.toFixed(1)}%`}
              color={strategy.confidence >= 65 ? "text-emerald-400" : strategy.confidence >= 50 ? "text-yellow-400" : "text-slate-400"}
            />
            <MetricBox
              label="리스크"
              value={strategy.riskLevel}
              color={riskStyle[strategy.riskLevel]}
            />
          </div>

          {/* AI 타이밍 예측 */}
          {strategy.expectedPeakDays != null && (
            <div className="rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-emerald-500/20 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">AI 매수/매도 타이밍 예측</span>
              </div>

              {/* 타이밍 타임라인 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-center">
                  <p className="text-[10px] text-red-300/70 mb-0.5">고점 예상</p>
                  <p className="text-sm font-bold font-mono text-red-400">{strategy.expectedPeakDate}</p>
                  <p className="text-[10px] text-slate-500">{strategy.expectedPeakDays}일 후</p>
                </div>
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-center">
                  <p className="text-[10px] text-blue-300/70 mb-0.5">저점 예상</p>
                  <p className="text-sm font-bold font-mono text-blue-400">{strategy.expectedTroughDate}</p>
                  <p className="text-[10px] text-slate-500">{strategy.expectedTroughDays}일 후</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-center">
                  <p className="text-[10px] text-amber-300/70 mb-0.5">추세 지속</p>
                  <p className="text-sm font-bold font-mono text-amber-400">{strategy.trendDurationDays}일</p>
                  <p className="text-[10px] text-slate-500">~{strategy.trendDurationDays && addDays(strategy.trendDurationDays)}</p>
                </div>
                <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-2.5 text-center">
                  <p className="text-[10px] text-violet-300/70 mb-0.5">보유 기간</p>
                  <p className="text-sm font-bold font-mono text-violet-400">{strategy.holdingPeriodDays}일</p>
                  <p className="text-[10px] text-slate-500">권장</p>
                </div>
              </div>

              {/* 손절/리스크리워드 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-800/60 p-2 text-center">
                  <p className="text-[10px] text-slate-500">손절 기준</p>
                  <p className="text-sm font-bold font-mono text-red-400">-{strategy.stopLossPercent?.toFixed(1)}%</p>
                </div>
                <div className="rounded-lg bg-slate-800/60 p-2 text-center">
                  <p className="text-[10px] text-slate-500">목표 수익</p>
                  <p className={`text-sm font-bold font-mono ${strategy.expectedReturn > 0 ? "text-red-400" : "text-blue-400"}`}>
                    {strategy.expectedReturn > 0 ? "+" : ""}{strategy.expectedReturn.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg bg-slate-800/60 p-2 text-center">
                  <p className="text-[10px] text-slate-500">리스크/리워드</p>
                  <p className={`text-sm font-bold font-mono ${(strategy.riskReward ?? 0) >= 1.5 ? "text-emerald-400" : (strategy.riskReward ?? 0) >= 1 ? "text-yellow-400" : "text-red-400"}`}>
                    {strategy.riskReward?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* 구체적 매매 전략 */}
              <div className="space-y-2">
                {strategy.direction === "상승" || strategy.signal === "강력매수" || strategy.signal === "매수" ? (
                  <>
                    <div className="flex items-start gap-2 text-[12px]">
                      <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">매수</span>
                      <span className="text-slate-300">{strategy.entryRecommendation}</span>
                    </div>
                    <div className="flex items-start gap-2 text-[12px]">
                      <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[10px] font-bold">매도</span>
                      <span className="text-slate-300">{strategy.exitRecommendation}</span>
                    </div>
                  </>
                ) : strategy.direction === "하락" || strategy.signal === "강력매도" || strategy.signal === "매도" ? (
                  <>
                    <div className="flex items-start gap-2 text-[12px]">
                      <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">매도</span>
                      <span className="text-slate-300">{strategy.entryRecommendation}</span>
                    </div>
                    <div className="flex items-start gap-2 text-[12px]">
                      <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">재진입</span>
                      <span className="text-slate-300">{strategy.exitRecommendation}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2 text-[12px]">
                      <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 text-[10px] font-bold">관망</span>
                      <span className="text-slate-300">{strategy.entryRecommendation}</span>
                    </div>
                    <div className="flex items-start gap-2 text-[12px]">
                      <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 text-[10px] font-bold">대기</span>
                      <span className="text-slate-300">{strategy.exitRecommendation}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 진입/이탈 권장 (타이밍 예측 없을 때 폴백) */}
          {strategy.expectedPeakDays == null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-slate-300">진입 전략</span>
                </div>
                <p className="text-[12px] text-slate-400 leading-relaxed">{strategy.entryRecommendation}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500">권장 보유기간:</span>
                  <span className="text-slate-300 font-medium">{strategy.holdingPeriod}</span>
                </div>
              </div>
              <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-medium text-slate-300">이탈 전략</span>
                </div>
                <p className="text-[12px] text-slate-400 leading-relaxed">{strategy.exitRecommendation}</p>
              </div>
            </div>
          )}

          {/* 타이밍 게이지 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">진입 타이밍 점수</span>
              <span className="text-xs font-mono text-slate-300">{strategy.timingScore}/100</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  strategy.timingScore >= 75
                    ? "bg-emerald-500"
                    : strategy.timingScore >= 55
                      ? "bg-yellow-500"
                      : strategy.timingScore >= 35
                        ? "bg-orange-500"
                        : "bg-red-500"
                }`}
                style={{ width: `${strategy.timingScore}%` }}
              />
            </div>
          </div>

          {/* AI 신뢰도 바 */}
          <ConfidenceBar value={strategy.confidence} label="AI 종합 신뢰도" size="sm" />

          {/* 핵심 근거 */}
          <div className="text-[11px] text-slate-500 border-t border-slate-700/50 pt-3">
            <span className="text-slate-400 font-medium">AI 판단 근거: </span>
            {strategy.keyReason}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-slate-800/40 p-2.5 text-center">
      <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
