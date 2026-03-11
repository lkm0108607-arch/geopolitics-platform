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
  ChevronRight,
  RefreshCw,
  PieChart,
  Clock,
  Zap,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  ShieldAlert,
  Banknote,
  Timer,
  CircleDollarSign,
  Crosshair,
  BadgeCheck,
} from "lucide-react";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { getAssetById } from "@/data/assets";

// ── 투자 시그널 타입 ──────────────────────────────────────────────────────────

type InvestmentSignal = "강력매수" | "매수" | "관망" | "매도" | "강력매도";

interface SolutionItem {
  assetId: string;
  name: string;
  category: string;
  signal: InvestmentSignal;
  // 핵심 투자 솔루션 데이터 (사용자에게 보이는 것)
  actionLabel: string;       // "지금 매수 적기" | "매수 대기" | "매도 권장" 등
  targetReturn: string;      // "+3.2% 상승 예상" 등
  targetReturnNum: number;
  riskGrade: "안전" | "보통" | "주의" | "위험";
  // 타이밍
  peakDate: string | null;    // 고점 예상 날짜
  troughDate: string | null;  // 저점 예상 날짜
  peakDays: number | null;
  troughDays: number | null;
  holdingDays: number | null;  // 보유 기간
  trendDays: number | null;   // 추세 지속
  // 매매 전략
  entryStrategy: string;
  exitStrategy: string;
  stopLoss: number | null;
  riskReward: number | null;
  // 종합 판단
  timingVerdict: "적기" | "양호" | "보통" | "대기" | "부적절";
  timingScore: number;
  summary: string;           // 1줄 요약
}

// ── 시그널 계산 ──────────────────────────────────────────────────────────────

function computeSignal(pred: AIPrediction): InvestmentSignal {
  const { direction, probability, confidence, juryVerdict, debateResult } = pred;
  let score = (probability / 100) * 0.4 + (confidence / 100) * 0.3;
  if (juryVerdict) {
    const b: Record<string, number> = { "신뢰": 0.3, "부분신뢰": 0.15, "의심": -0.1, "불신": -0.3 };
    score += b[juryVerdict.finalVerdict] ?? 0;
  }
  if (debateResult) {
    const b: Record<string, number> = { "만장일치": 0.2, "다수결": 0.1, "분열": -0.05, "교착": -0.15 };
    score += b[debateResult.agreementLevel] ?? 0;
  }
  if (direction === "상승") {
    if (score >= 0.75) return "강력매수";
    if (score >= 0.55) return "매수";
  } else if (direction === "하락") {
    if (score >= 0.75) return "강력매도";
    if (score >= 0.55) return "매도";
  }
  return "관망";
}

function addDaysStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function computeTimingScore(pred: AIPrediction): number {
  let score = 50;
  score += (pred.probability - 50) * 0.5;
  score += (pred.confidence - 50) * 0.3;
  if (pred.juryVerdict) {
    const b: Record<string, number> = { "신뢰": 15, "부분신뢰": 5, "의심": -10, "불신": -20 };
    score += b[pred.juryVerdict.finalVerdict] ?? 0;
  }
  if (pred.debateResult) {
    const b: Record<string, number> = { "만장일치": 15, "다수결": 5, "분열": -5, "교착": -15 };
    score += b[pred.debateResult.agreementLevel] ?? 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getTimingVerdict(score: number): SolutionItem["timingVerdict"] {
  if (score >= 75) return "적기";
  if (score >= 60) return "양호";
  if (score >= 45) return "보통";
  if (score >= 30) return "대기";
  return "부적절";
}

function getRiskGrade(pred: AIPrediction): SolutionItem["riskGrade"] {
  let risk = 50;
  if (pred.confidence < 40) risk += 25;
  else if (pred.confidence < 55) risk += 10;
  else risk -= 10;
  if (pred.juryVerdict) {
    if (pred.juryVerdict.finalVerdict === "불신") risk += 30;
    else if (pred.juryVerdict.finalVerdict === "의심") risk += 15;
    else if (pred.juryVerdict.finalVerdict === "신뢰") risk -= 15;
  }
  if (pred.debateResult) {
    if (pred.debateResult.agreementLevel === "교착") risk += 20;
    else if (pred.debateResult.agreementLevel === "분열") risk += 10;
    else if (pred.debateResult.agreementLevel === "만장일치") risk -= 10;
  }
  if (risk >= 75) return "위험";
  if (risk >= 55) return "주의";
  if (risk >= 35) return "보통";
  return "안전";
}

function getActionLabel(signal: InvestmentSignal, verdict: SolutionItem["timingVerdict"]): string {
  if (signal === "강력매수") return verdict === "적기" ? "지금 매수 적기" : "매수 추천";
  if (signal === "매수") return verdict === "적기" ? "매수 검토" : "소량 매수 가능";
  if (signal === "강력매도") return "즉시 매도 권장";
  if (signal === "매도") return "비중 축소 권장";
  return verdict === "대기" || verdict === "부적절" ? "진입 대기" : "관망 유지";
}

function getSummary(pred: AIPrediction, signal: InvestmentSignal): string {
  const tp = pred.timingPrediction;
  if (signal === "강력매수" || signal === "매수") {
    if (tp) return `${tp.expectedPeakDays}일 내 +${Math.abs(tp.expectedReturnPercent).toFixed(1)}% 상승 전망. ${tp.holdingPeriodDays}일 보유 후 익절 권장.`;
    return `상승 추세 예상. 분할 매수 후 목표 도달 시 익절 권장.`;
  }
  if (signal === "강력매도" || signal === "매도") {
    if (tp) return `${tp.expectedTroughDays}일 내 ${tp.expectedReturnPercent.toFixed(1)}% 하락 전망. 보유 시 매도 검토.`;
    return `하락 추세 예상. 보유분 매도로 손실 방지 권장.`;
  }
  if (tp) return `${tp.trendDurationDays}일 내 방향성 확인 예상. 추세 확인까지 관망.`;
  return `방향성 불확실. 추가 시그널 확인까지 대기.`;
}

function buildSolution(pred: AIPrediction): SolutionItem {
  const asset = getAssetById(pred.assetId);
  const signal = computeSignal(pred);
  const tp = pred.timingPrediction;
  const tScore = computeTimingScore(pred);
  const verdict = getTimingVerdict(tScore);
  const riskGrade = getRiskGrade(pred);

  // 수익률
  let returnNum = 0;
  if (tp) {
    returnNum = tp.expectedReturnPercent;
  } else {
    const base = pred.probability * 0.05 * (pred.confidence / 100);
    returnNum = pred.direction === "하락" ? -base : base;
  }

  const targetReturn = returnNum > 0
    ? `+${returnNum.toFixed(1)}% 상승 예상`
    : returnNum < 0
      ? `${returnNum.toFixed(1)}% 하락 예상`
      : "보합 예상";

  // 진입/이탈 전략
  let entryStrategy = "";
  let exitStrategy = "";
  if (tp) {
    entryStrategy = tp.entryTiming;
    exitStrategy = tp.exitTiming;
  } else {
    if (signal === "강력매수") { entryStrategy = "현재가 분할 매수 진입 적기."; exitStrategy = `+${Math.abs(returnNum).toFixed(1)}% 도달 시 50% 익절.`; }
    else if (signal === "매수") { entryStrategy = "소량 진입 후 추가 확인 시 비중 확대."; exitStrategy = `목표 수익률 도달 시 일부 익절.`; }
    else if (signal === "강력매도") { entryStrategy = "보유 시 즉시 매도 검토."; exitStrategy = "반등 시 추가 매도 기회 활용."; }
    else if (signal === "매도") { entryStrategy = "보유분 일부 매도로 리스크 축소."; exitStrategy = "하락 모멘텀 약화 확인 후 재진입 검토."; }
    else { entryStrategy = "신규 진입 보류. 방향 확인 후 재평가."; exitStrategy = "포지션 유지 또는 축소."; }
  }

  return {
    assetId: pred.assetId,
    name: asset?.name ?? pred.assetId,
    category: asset?.category ?? "",
    signal,
    actionLabel: getActionLabel(signal, verdict),
    targetReturn,
    targetReturnNum: returnNum,
    riskGrade,
    peakDate: tp ? addDaysStr(tp.expectedPeakDays) : null,
    troughDate: tp ? addDaysStr(tp.expectedTroughDays) : null,
    peakDays: tp?.expectedPeakDays ?? null,
    troughDays: tp?.expectedTroughDays ?? null,
    holdingDays: tp?.holdingPeriodDays ?? null,
    trendDays: tp?.trendDurationDays ?? null,
    entryStrategy,
    exitStrategy,
    stopLoss: tp?.stopLossPercent ?? null,
    riskReward: tp?.riskReward ?? null,
    timingVerdict: verdict,
    timingScore: tScore,
    summary: getSummary(pred, signal),
  };
}

// ── 스타일 맵 ──────────────────────────────────────────────────────────────

const signalConfig: Record<InvestmentSignal, { bg: string; text: string; border: string; gradFrom: string; icon: typeof TrendingUp }> = {
  "강력매수": { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", gradFrom: "from-red-500/5", icon: ArrowUpRight },
  "매수":     { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", gradFrom: "from-orange-500/5", icon: TrendingUp },
  "관망":     { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30", gradFrom: "from-slate-500/5", icon: Eye },
  "매도":     { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", gradFrom: "from-blue-500/5", icon: TrendingDown },
  "강력매도": { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30", gradFrom: "from-indigo-500/5", icon: ArrowDownRight },
};

const riskColors: Record<string, string> = {
  "안전": "text-emerald-400", "보통": "text-yellow-400", "주의": "text-orange-400", "위험": "text-red-400",
};

const verdictColors: Record<string, string> = {
  "적기": "text-emerald-400", "양호": "text-green-400", "보통": "text-yellow-400", "대기": "text-orange-400", "부적절": "text-red-400",
};

const verdictBg: Record<string, string> = {
  "적기": "bg-emerald-500/15 border-emerald-500/30", "양호": "bg-green-500/15 border-green-500/30",
  "보통": "bg-yellow-500/15 border-yellow-500/30", "대기": "bg-orange-500/15 border-orange-500/30",
  "부적절": "bg-red-500/15 border-red-500/30",
};

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export default function InvestmentPage() {
  const { predictions, cycleId, isLoading, error, refresh } = useAIPredictions();
  const [activeTab, setActiveTab] = useState<"action" | "buy" | "sell" | "hold">("action");
  const [showCount, setShowCount] = useState(15);

  const solutions = useMemo(
    () => predictions.map(buildSolution).sort((a, b) => {
      const order: Record<InvestmentSignal, number> = { "강력매수": 0, "매수": 1, "강력매도": 2, "매도": 3, "관망": 4 };
      const diff = order[a.signal] - order[b.signal];
      if (diff !== 0) return diff;
      return Math.abs(b.targetReturnNum) - Math.abs(a.targetReturnNum);
    }),
    [predictions]
  );

  const buyItems = solutions.filter((s) => s.signal === "강력매수" || s.signal === "매수");
  const sellItems = solutions.filter((s) => s.signal === "강력매도" || s.signal === "매도");
  const holdItems = solutions.filter((s) => s.signal === "관망");

  // 행동 필요 = 매수+매도 (관망 제외)
  const actionItems = [...buyItems, ...sellItems];

  const filtered = useMemo(() => {
    if (activeTab === "buy") return buyItems;
    if (activeTab === "sell") return sellItems;
    if (activeTab === "hold") return holdItems;
    return actionItems;
  }, [activeTab, buyItems, sellItems, holdItems, actionItems]);

  const displayed = filtered.slice(0, showCount);

  // 포트폴리오 제안 (매수 상위 5개)
  const portfolio = useMemo(() => {
    const top = buyItems.sort((a, b) => b.timingScore - a.timingScore).slice(0, 5);
    if (top.length === 0) return [];
    const total = top.reduce((s, t) => s + t.timingScore, 0);
    return top.map((s) => ({ ...s, weight: total > 0 ? Math.round((s.timingScore / total) * 100) : 20 }));
  }, [buyItems]);

  // 예측 시각 표시
  const lastPredictionTime = predictions.length > 0
    ? new Date(predictions[0].generatedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Header ──────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Crosshair className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AI 투자 솔루션</h1>
              <p className="text-xs text-slate-500">
                지금 사야 할지, 팔아야 할지, 기다려야 할지 AI가 알려드립니다
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastPredictionTime && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500">
                <Clock className="w-3 h-3" />
                <span>최종 분석: {lastPredictionTime}</span>
              </div>
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
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-300">데이터를 불러오지 못했습니다.</p>
              <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
            </div>
            <button onClick={refresh} className="text-xs text-red-400 hover:text-red-300 underline">재시도</button>
          </div>
        )}

        {/* Loading */}
        {isLoading && predictions.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />
            ))}
          </div>
        )}

        {/* ── 핵심 행동 가이드 ────────────────────── */}
        {solutions.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ActionSummaryCard
              icon={<ArrowUpRight className="w-5 h-5 text-red-400" />}
              label="매수 추천"
              count={buyItems.length}
              sub={buyItems.filter((b) => b.timingVerdict === "적기").length > 0
                ? `${buyItems.filter((b) => b.timingVerdict === "적기").length}개 지금 적기`
                : "적기 종목 없음"}
              color="red"
            />
            <ActionSummaryCard
              icon={<ArrowDownRight className="w-5 h-5 text-blue-400" />}
              label="매도 추천"
              count={sellItems.length}
              sub={sellItems.length > 0 ? "보유 시 매도 검토" : "매도 종목 없음"}
              color="blue"
            />
            <ActionSummaryCard
              icon={<Eye className="w-5 h-5 text-slate-400" />}
              label="관망"
              count={holdItems.length}
              sub="추세 확인까지 대기"
              color="slate"
            />
          </section>
        )}

        {/* ── 자동 업데이트 안내 ────────────────── */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-900/50 rounded-lg px-4 py-2 border border-slate-800/50">
          <Timer className="w-3.5 h-3.5 text-emerald-400" />
          <span>매일 오후 2시 AI 자동 분석 · 예측 후 학습으로 정확도 지속 개선 · 5개 AI 모델 토론 + 30인 AI 배심원 기반</span>
        </div>

        {/* ── 포트폴리오 제안 ────────────────────── */}
        {portfolio.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold">AI 추천 포트폴리오</h2>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs border-b border-slate-800">
                      <th className="text-left px-5 py-3 font-medium">종목</th>
                      <th className="text-center px-3 py-3 font-medium">판단</th>
                      <th className="text-center px-3 py-3 font-medium">기대 수익</th>
                      <th className="text-center px-3 py-3 font-medium">매도 시점</th>
                      <th className="text-center px-3 py-3 font-medium hidden md:table-cell">손절선</th>
                      <th className="text-center px-3 py-3 font-medium hidden lg:table-cell">리스크</th>
                      <th className="text-right px-5 py-3 font-medium">비중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((s) => (
                      <tr key={s.assetId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3">
                          <span className="font-medium text-white">{s.name}</span>
                          <span className="text-[10px] text-slate-500 ml-2">{s.category}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${verdictBg[s.timingVerdict]} ${verdictColors[s.timingVerdict]} font-medium`}>
                            {s.timingVerdict}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-mono font-bold ${s.targetReturnNum > 0 ? "text-red-400" : "text-blue-400"}`}>
                            {s.targetReturnNum > 0 ? "+" : ""}{s.targetReturnNum.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {s.peakDate ? (
                            <span className="text-xs font-mono text-slate-300">{s.peakDate} <span className="text-[10px] text-slate-500">({s.peakDays}일 후)</span></span>
                          ) : <span className="text-[10px] text-slate-600">-</span>}
                        </td>
                        <td className="px-3 py-3 text-center hidden md:table-cell">
                          {s.stopLoss != null ? (
                            <span className="text-xs font-mono text-red-400/80">-{s.stopLoss.toFixed(1)}%</span>
                          ) : <span className="text-[10px] text-slate-600">-</span>}
                        </td>
                        <td className={`px-3 py-3 text-center text-xs hidden lg:table-cell ${riskColors[s.riskGrade]}`}>
                          {s.riskGrade}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-emerald-400">
                          {s.weight}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* 비중 바 */}
              <div className="px-5 py-3 border-t border-slate-800">
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-800">
                  {portfolio.map((s, i) => {
                    const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];
                    return (
                      <div key={s.assetId} className={`${colors[i % colors.length]} transition-all duration-500`}
                        style={{ width: `${s.weight}%` }} title={`${s.name}: ${s.weight}%`} />
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-2 flex-wrap">
                  {portfolio.map((s, i) => {
                    const dc = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];
                    return (
                      <span key={s.assetId} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${dc[i % dc.length]}`} />
                        {s.name} {s.weight}%
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── 탭 ────────────────────────────────── */}
        {solutions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <TabBtn active={activeTab === "action"} onClick={() => { setActiveTab("action"); setShowCount(15); }}>
              <Zap className="w-3.5 h-3.5" /> 행동 필요 ({actionItems.length})
            </TabBtn>
            <TabBtn active={activeTab === "buy"} onClick={() => { setActiveTab("buy"); setShowCount(15); }}>
              <TrendingUp className="w-3.5 h-3.5" /> 매수 ({buyItems.length})
            </TabBtn>
            <TabBtn active={activeTab === "sell"} onClick={() => { setActiveTab("sell"); setShowCount(15); }}>
              <TrendingDown className="w-3.5 h-3.5" /> 매도 ({sellItems.length})
            </TabBtn>
            <TabBtn active={activeTab === "hold"} onClick={() => { setActiveTab("hold"); setShowCount(15); }}>
              <Eye className="w-3.5 h-3.5" /> 관망 ({holdItems.length})
            </TabBtn>
          </div>
        )}

        {/* ── 솔루션 카드 ────────────────────────── */}
        {displayed.length > 0 && (
          <section className="space-y-3">
            {displayed.map((item) => (
              <SolutionCard key={item.assetId} item={item} />
            ))}
          </section>
        )}

        {/* 더보기 */}
        {filtered.length > showCount && (
          <div className="text-center">
            <button onClick={() => setShowCount((c) => c + 15)}
              className="text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg px-6 py-2 hover:bg-slate-800 transition">
              더보기 ({filtered.length - showCount}개 남음)
            </button>
          </div>
        )}
        {showCount > 15 && filtered.length <= showCount && (
          <div className="text-center">
            <button onClick={() => setShowCount(15)} className="text-sm text-slate-500 hover:text-white transition">접기</button>
          </div>
        )}

        {/* ── 하단 링크 ────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/investment/simulation"
            className="group flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/50 hover:bg-slate-800/50 transition">
            <div className="p-3 rounded-lg bg-emerald-500/10"><Target className="w-6 h-6 text-emerald-400" /></div>
            <div className="flex-1">
              <h3 className="font-semibold">모의투자 시뮬레이션</h3>
              <p className="text-xs text-slate-500 mt-0.5">AI 전략으로 가상 투자를 테스트하세요</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition" />
          </Link>
          <Link href="/predictions"
            className="group flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-500/50 hover:bg-slate-800/50 transition">
            <div className="p-3 rounded-lg bg-blue-500/10"><Brain className="w-6 h-6 text-blue-400" /></div>
            <div className="flex-1">
              <h3 className="font-semibold">AI 예측 분석 (상세)</h3>
              <p className="text-xs text-slate-500 mt-0.5">서브모델, 토론, 배심원 판정 등 AI 분석 상세 보기</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition" />
          </Link>
        </section>

        {/* ── 투자 위험 안내 ────────────────────── */}
        <section className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-yellow-300">투자 위험 안내</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-400 leading-relaxed">
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
              <span>모든 투자 솔루션은 AI 모델이 자동 생성한 <strong className="text-slate-300">참고 자료</strong>이며, 투자 권유가 아닙니다. 최종 판단과 책임은 투자자 본인에게 있습니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
              <span>AI 예측은 과거 데이터 기반이며 미래 수익을 보장하지 않습니다. 매일 오후 2시 자동 업데이트되며, 학습을 통해 정확도가 지속 개선됩니다.</span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}

// ── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function ActionSummaryCard({ icon, label, count, sub, color }: {
  icon: React.ReactNode; label: string; count: number; sub: string; color: string;
}) {
  const borderMap: Record<string, string> = { red: "border-red-500/20", blue: "border-blue-500/20", slate: "border-slate-700" };
  const bgMap: Record<string, string> = { red: "bg-red-500/5", blue: "bg-blue-500/5", slate: "bg-slate-900/50" };
  return (
    <div className={`${bgMap[color]} border ${borderMap[color]} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-sm font-medium text-slate-300">{label}</span></div>
      <p className="text-3xl font-bold font-mono text-white">{count}</p>
      <p className="text-[11px] text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
        active ? "bg-slate-800 text-white border border-slate-700" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
      }`}>
      {children}
    </button>
  );
}

function SolutionCard({ item }: { item: SolutionItem }) {
  const [open, setOpen] = useState(false);
  const cfg = signalConfig[item.signal];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border ${cfg.border} bg-gradient-to-r ${cfg.gradFrom} to-slate-900/70 overflow-hidden transition-all`}>
      {/* 헤더: 종목 + 핵심 액션 */}
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg ${cfg.bg}`}>
            <Icon className={`w-4 h-4 ${cfg.text}`} />
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white">{item.name}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} font-bold`}>
                {item.actionLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{item.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {/* 기대 수익 */}
          <div className="text-right hidden sm:block">
            <span className={`text-sm font-mono font-bold ${item.targetReturnNum > 0 ? "text-red-400" : item.targetReturnNum < 0 ? "text-blue-400" : "text-slate-400"}`}>
              {item.targetReturnNum > 0 ? "+" : ""}{item.targetReturnNum.toFixed(1)}%
            </span>
            <p className="text-[10px] text-slate-500">기대 수익</p>
          </div>
          {/* 판단 */}
          <div className="text-right hidden md:block">
            <span className={`text-xs font-bold ${verdictColors[item.timingVerdict]}`}>{item.timingVerdict}</span>
            <p className="text-[10px] text-slate-500">진입 판단</p>
          </div>
          {/* 리스크 */}
          <div className="text-right hidden lg:block">
            <span className={`text-xs font-medium ${riskColors[item.riskGrade]}`}>{item.riskGrade}</span>
            <p className="text-[10px] text-slate-500">리스크</p>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {/* 상세 솔루션 */}
      {open && (
        <div className="border-t border-slate-700/50 p-4 space-y-4 bg-slate-950/40">
          {/* 타이밍 예측 카드 */}
          {item.peakDays != null && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <TimingBox
                label={item.signal === "강력매도" || item.signal === "매도" ? "저점 예상" : "고점 예상"}
                value={item.signal === "강력매도" || item.signal === "매도" ? item.troughDate : item.peakDate}
                sub={`${item.signal === "강력매도" || item.signal === "매도" ? item.troughDays : item.peakDays}일 후`}
                color={item.signal === "강력매도" || item.signal === "매도" ? "text-blue-400" : "text-red-400"}
                icon={<CalendarDays className="w-3.5 h-3.5" />}
              />
              <TimingBox
                label="추세 지속"
                value={item.trendDays ? `${item.trendDays}일` : null}
                sub={item.trendDays ? `~${addDaysStr(item.trendDays)}` : ""}
                color="text-amber-400"
                icon={<TrendingUp className="w-3.5 h-3.5" />}
              />
              <TimingBox
                label="보유 기간"
                value={item.holdingDays ? `${item.holdingDays}일` : null}
                sub="권장"
                color="text-violet-400"
                icon={<Timer className="w-3.5 h-3.5" />}
              />
              <TimingBox
                label="손절선"
                value={item.stopLoss != null ? `-${item.stopLoss.toFixed(1)}%` : null}
                sub={item.riskReward != null ? `R/R ${item.riskReward.toFixed(1)}` : ""}
                color="text-red-400"
                icon={<ShieldAlert className="w-3.5 h-3.5" />}
              />
            </div>
          )}

          {/* 매매 전략 */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                item.signal === "강력매수" || item.signal === "매수"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : item.signal === "강력매도" || item.signal === "매도"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-slate-500/20 text-slate-400"
              }`}>
                {item.signal === "강력매수" || item.signal === "매수" ? "매수 전략" : item.signal === "강력매도" || item.signal === "매도" ? "매도 전략" : "대기 전략"}
              </span>
              <p className="text-[12px] text-slate-300 leading-relaxed">{item.entryStrategy}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400">
                {item.signal === "강력매수" || item.signal === "매수" ? "익절 전략" : "재진입 조건"}
              </span>
              <p className="text-[12px] text-slate-300 leading-relaxed">{item.exitStrategy}</p>
            </div>
          </div>

          {/* 타이밍 게이지 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">진입 적합도</span>
              <span className={`text-xs font-bold ${verdictColors[item.timingVerdict]}`}>{item.timingVerdict} ({item.timingScore}/100)</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                item.timingScore >= 75 ? "bg-emerald-500"
                  : item.timingScore >= 55 ? "bg-yellow-500"
                    : item.timingScore >= 35 ? "bg-orange-500" : "bg-red-500"
              }`} style={{ width: `${item.timingScore}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimingBox({ label, value, sub, color, icon }: {
  label: string; value: string | null; sub: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-slate-800/60 border border-slate-700/40 p-2.5 text-center">
      <div className={`flex items-center justify-center gap-1 mb-1 ${color} opacity-60`}>
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className={`text-sm font-bold font-mono ${color}`}>{value ?? "-"}</p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}
