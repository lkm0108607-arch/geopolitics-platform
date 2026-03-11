"use client";

import { useMemo, useState, useRef, useEffect } from "react";
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
  ArrowUpDown,
} from "lucide-react";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { useLivePrices } from "@/components/LivePriceProvider";
import { useWeeklyReport } from "@/hooks/useWeeklyReport";
import type { WeeklyReportData, PortfolioResult } from "@/hooks/useWeeklyReport";
import { getAssetById } from "@/data/assets";

// ── 투자 시그널 타입 ──────────────────────────────────────────────────────────

type InvestmentSignal = "강력매수" | "매수" | "관망" | "매도" | "강력매도";

interface SolutionItem {
  assetId: string;
  name: string;
  category: string;
  unit: string;
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

  // 1차: 확률 기반 판단 (가장 중요)
  // 2차: 신뢰도 보정
  // 3차: 배심원/토론 보너스 (데이터가 있을 경우)

  if (direction === "상승") {
    if (probability >= 70 && confidence >= 30) return "강력매수";
    if (probability >= 70) return "매수";
    if (probability >= 55 && confidence >= 25) return "매수";
    if (probability >= 55) return "관망"; // 약한 상승 시그널 → 관망
  } else if (direction === "하락") {
    if (probability >= 70 && confidence >= 30) return "강력매도";
    if (probability >= 70) return "매도";
    if (probability >= 55 && confidence >= 25) return "매도";
    if (probability >= 55) return "관망";
  }

  // 배심원/토론 데이터가 있으면 추가 판단
  if (juryVerdict || debateResult) {
    let bonus = 0;
    if (juryVerdict) {
      const b: Record<string, number> = { "신뢰": 15, "부분신뢰": 5, "의심": -5, "불신": -15 };
      bonus += b[juryVerdict.finalVerdict] ?? 0;
    }
    if (debateResult) {
      const b: Record<string, number> = { "만장일치": 10, "다수결": 5, "분열": -5, "교착": -10 };
      bonus += b[debateResult.agreementLevel] ?? 0;
    }
    const adjusted = probability + bonus;
    if (direction === "상승" && adjusted >= 60) return "매수";
    if (direction === "하락" && adjusted >= 60) return "매도";
  }

  return "관망";
}

function addDaysStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function computeTimingScore(pred: AIPrediction): number {
  // 확률 중심 점수: probability가 50이면 50점, 100이면 100점
  let score = pred.probability;

  // 신뢰도 보정 (미약하게)
  if (pred.confidence >= 35) score += 5;
  else if (pred.confidence >= 25) score += 0;
  else score -= 5;

  // 배심원/토론 보정 (있을 경우만)
  if (pred.juryVerdict) {
    const b: Record<string, number> = { "신뢰": 10, "부분신뢰": 3, "의심": -5, "불신": -10 };
    score += b[pred.juryVerdict.finalVerdict] ?? 0;
  }
  if (pred.debateResult) {
    const b: Record<string, number> = { "만장일치": 10, "다수결": 3, "분열": -3, "교착": -10 };
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
  // 확률이 높으면 안전, 낮으면 위험 (방향 확신이 있으면 리스크 낮음)
  const prob = pred.probability;
  const conf = pred.confidence;

  if (prob >= 75 && conf >= 30) return "안전";
  if (prob >= 65) return "보통";
  if (prob >= 50) return "주의";
  return "위험";
}

function getActionLabel(signal: InvestmentSignal, verdict: SolutionItem["timingVerdict"]): string {
  if (signal === "강력매수") return verdict === "적기" ? "지금 매수 적기" : "매수 추천";
  if (signal === "매수") return verdict === "적기" ? "매수 검토" : "소량 매수 가능";
  if (signal === "강력매도") return "즉시 매도 권장";
  if (signal === "매도") return "비중 축소 권장";
  return verdict === "대기" || verdict === "부적절" ? "진입 대기" : "관망 유지";
}

function getSummary(pred: AIPrediction, signal: InvestmentSignal, returnNum: number): string {
  const tp = pred.timingPrediction;
  const probStr = Math.max(0, pred.probability - 50);
  const estDays = Math.round(7 + probStr * 0.3);
  if (signal === "강력매수" || signal === "매수") {
    const days = tp?.expectedPeakDays ?? Math.round(estDays * 0.7);
    const ret = tp ? Math.abs(tp.expectedReturnPercent) : Math.abs(returnNum);
    return `${days}일 내 +${ret.toFixed(1)}% 상승 전망. 분할 매수 후 목표 도달 시 익절 권장.`;
  }
  if (signal === "강력매도" || signal === "매도") {
    const days = tp?.expectedTroughDays ?? Math.round(estDays * 0.7);
    const ret = tp ? Math.abs(tp.expectedReturnPercent) : Math.abs(returnNum);
    return `${days}일 내 -${ret.toFixed(1)}% 하락 전망. 보유 시 매도 검토.`;
  }
  if (pred.direction === "상승") return `약한 상승 시그널 (+${Math.abs(returnNum).toFixed(1)}%). 추가 확인 후 진입 검토.`;
  if (pred.direction === "하락") return `약한 하락 시그널 (-${Math.abs(returnNum).toFixed(1)}%). 관망 후 재평가.`;
  return `보합 추세. ${estDays}일 내 방향성 확인 예상.`;
}

function buildSolution(pred: AIPrediction): SolutionItem {
  const asset = getAssetById(pred.assetId);
  const signal = computeSignal(pred);
  const tp = pred.timingPrediction;
  const tScore = computeTimingScore(pred);
  const verdict = getTimingVerdict(tScore);
  const riskGrade = getRiskGrade(pred);

  // 수익률 추정: 확률 기반 (probability 60% → 약 ±2%, 80% → 약 ±4%)
  let returnNum = 0;
  if (tp) {
    returnNum = tp.expectedReturnPercent;
  } else {
    const base = Math.max(0, (pred.probability - 50) * 0.15);
    returnNum = pred.direction === "하락" ? -base : pred.direction === "상승" ? base : 0;
  }

  // timingPrediction이 없을 때 확률 기반 추정치 생성
  const isUp = pred.direction === "상승";
  const isDown = pred.direction === "하락";
  const probStrength = Math.max(0, pred.probability - 50); // 0~50
  const estTrendDays = !tp ? Math.round(7 + probStrength * 0.3) : null; // 7~22일
  const estPeakDays = !tp && isUp ? Math.round(estTrendDays! * 0.7) : !tp && isDown ? Math.round(estTrendDays! * 0.3) : null;
  const estTroughDays = !tp && isDown ? Math.round(estTrendDays! * 0.7) : !tp && isUp ? Math.round(estTrendDays! * 0.3) : null;
  const estHoldingDays = !tp && (signal !== "관망") ? Math.round(estTrendDays! * 0.8) : null;
  const estStopLoss = !tp ? Math.round(Math.max(1.5, Math.abs(returnNum) * 0.7) * 10) / 10 : null;
  const estRiskReward = !tp && estStopLoss ? Math.round((Math.abs(returnNum) / estStopLoss) * 100) / 100 : null;

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
    unit: asset?.unit ?? "",
    signal,
    actionLabel: getActionLabel(signal, verdict),
    targetReturn,
    targetReturnNum: returnNum,
    riskGrade,
    peakDate: tp ? addDaysStr(tp.expectedPeakDays) : estPeakDays ? addDaysStr(estPeakDays) : null,
    troughDate: tp ? addDaysStr(tp.expectedTroughDays) : estTroughDays ? addDaysStr(estTroughDays) : null,
    peakDays: tp?.expectedPeakDays ?? estPeakDays,
    troughDays: tp?.expectedTroughDays ?? estTroughDays,
    holdingDays: tp?.holdingPeriodDays ?? estHoldingDays,
    trendDays: tp?.trendDurationDays ?? estTrendDays,
    entryStrategy,
    exitStrategy,
    stopLoss: tp?.stopLossPercent ?? estStopLoss,
    riskReward: tp?.riskReward ?? estRiskReward,
    timingVerdict: verdict,
    timingScore: tScore,
    summary: getSummary(pred, signal, returnNum),
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
  const { prices, lastFetched, isLoading: pricesLoading } = useLivePrices();
  const { reports: weeklyReports, isLoading: weeklyLoading } = useWeeklyReport();
  const [showWeeklyDetail, setShowWeeklyDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"action" | "buy" | "sell" | "hold">("action");
  const [showCount, setShowCount] = useState(15);
  const [sortBy, setSortBy] = useState<"signal" | "return" | "risk" | "timing" | "name">("signal");

  const solutions = useMemo(
    () => predictions
      .filter((p) => p.assetId.startsWith("etf-"))             // ETF만 표시 (지수·금리·환율·원자재 제외)
      .filter((p) => {                                          // 이름이 해결된 종목만
        const asset = getAssetById(p.assetId);
        return asset && asset.name !== p.assetId;
      })
      .map(buildSolution).sort((a, b) => {
      switch (sortBy) {
        case "return":
          return Math.abs(b.targetReturnNum) - Math.abs(a.targetReturnNum);
        case "risk": {
          const riskOrder: Record<string, number> = { "안전": 0, "보통": 1, "주의": 2, "위험": 3 };
          return (riskOrder[a.riskGrade] ?? 9) - (riskOrder[b.riskGrade] ?? 9);
        }
        case "timing":
          return b.timingScore - a.timingScore;
        case "name":
          return a.name.localeCompare(b.name, "ko");
        case "signal":
        default: {
          const order: Record<InvestmentSignal, number> = { "강력매수": 0, "매수": 1, "강력매도": 2, "매도": 3, "관망": 4 };
          const diff = order[a.signal] - order[b.signal];
          if (diff !== 0) return diff;
          return Math.abs(b.targetReturnNum) - Math.abs(a.targetReturnNum);
        }
      }
    }),
    [predictions, sortBy]
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

  // ── 매수진입가 고정 + 매매 상태 추적 ──
  const entryPricesRef = useRef<Map<string, number>>(new Map());
  const lockedCycleRef = useRef<string | null>(null);

  // 매매 상태: 매수대기 → 보유중 → 익절/손절
  interface TradeStatus {
    status: "매수대기" | "보유중" | "익절" | "손절";
    buyPrice: number | null;      // 매수 체결가 (진입가에 도달한 시점)
    sellPrice: number | null;     // 매도 체결가 (TP/SL 도달 시점)
    lockedTp: number | null;      // 매수 후 고정된 익절가
    lockedSl: number | null;      // 매수 후 고정된 손절가
  }
  const tradeStatusRef = useRef<Map<string, TradeStatus>>(new Map());

  useEffect(() => {
    // 새 사이클이면 초기화
    if (cycleId && cycleId !== lockedCycleRef.current) {
      entryPricesRef.current = new Map();
      tradeStatusRef.current = new Map();
      lockedCycleRef.current = cycleId;
    }

    for (const s of portfolio) {
      const lp = prices.get(s.assetId);
      const livePrice = lp?.price && lp.price > 0 ? lp.price : null;

      // 진입가 잠금 (최초 1회)
      if (!entryPricesRef.current.has(s.assetId) && livePrice) {
        entryPricesRef.current.set(s.assetId, livePrice);
      }

      const entryPrice = entryPricesRef.current.get(s.assetId);
      if (!entryPrice || !livePrice) continue;

      let ts = tradeStatusRef.current.get(s.assetId);
      if (!ts) {
        ts = { status: "매수대기", buyPrice: null, sellPrice: null, lockedTp: null, lockedSl: null };
        tradeStatusRef.current.set(s.assetId, ts);
      }

      // 매수대기 → 현재가가 매수진입가 이하로 도달하면 매수 체결
      if (ts.status === "매수대기" && livePrice <= entryPrice) {
        ts.status = "보유중";
        ts.buyPrice = entryPrice;
        ts.lockedTp = Math.round(entryPrice * (1 + Math.abs(s.targetReturnNum) / 100));
        ts.lockedSl = s.stopLoss != null ? Math.round(entryPrice * (1 - s.stopLoss / 100)) : null;
      }

      // 보유중 → 익절/손절 체크
      if (ts.status === "보유중" && ts.lockedTp && ts.lockedSl) {
        if (livePrice >= ts.lockedTp) {
          ts.status = "익절";
          ts.sellPrice = ts.lockedTp;
        } else if (livePrice <= ts.lockedSl) {
          ts.status = "손절";
          ts.sellPrice = ts.lockedSl;
        }
      }
    }
  }, [cycleId, portfolio, prices]);

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
        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-900/50 rounded-lg px-4 py-2 border border-slate-800/50">
          <div className="flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-emerald-400" />
            <span>매일 오후 2시 AI 자동 분석 · 예측 후 학습으로 정확도 지속 개선</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${pricesLoading ? "bg-yellow-400 animate-pulse" : "bg-emerald-400"}`} />
            <span>시세 {lastFetched ? `${lastFetched.toLocaleTimeString("ko-KR")} 갱신` : "로딩중"} · 10초 간격</span>
          </div>
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
                      <th className="text-right px-3 py-3 font-medium">현재가</th>
                      <th className="text-right px-3 py-3 font-medium">매수진입가</th>
                      <th className="text-center px-3 py-3 font-medium hidden sm:table-cell">익절 목표가</th>
                      <th className="text-center px-3 py-3 font-medium hidden md:table-cell">손절가</th>
                      <th className="text-center px-3 py-3 font-medium">상태</th>
                      <th className="text-center px-3 py-3 font-medium hidden lg:table-cell">기대수익</th>
                      <th className="text-right px-5 py-3 font-medium">비중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((s) => {
                      const lp = prices.get(s.assetId);
                      const livePrice = lp?.price && lp.price > 0 ? lp.price : null;
                      const entryPrice = entryPricesRef.current.get(s.assetId) ?? null;
                      // 매수진입가 대비 수익률 (진입가=현재가면 0%)
                      const returnVsEntry = (livePrice && entryPrice && entryPrice > 0)
                        ? Math.round(((livePrice - entryPrice) / entryPrice) * 10000) / 100
                        : null;
                      const ts = tradeStatusRef.current.get(s.assetId);
                      const isBought = ts && (ts.status === "보유중" || ts.status === "익절" || ts.status === "손절");

                      // 매수 전: 현재가 기반 TP/SL (실시간 따라감) — 행동필요/매수추천과 동일
                      // 매수 후: 고정된 진입가 기반 TP/SL
                      const basePrice = isBought ? entryPrice : livePrice;
                      const tpPrice = basePrice ? Math.round(basePrice * (1 + Math.abs(s.targetReturnNum) / 100)) : null;
                      const slPrice = basePrice && s.stopLoss != null ? Math.round(basePrice * (1 - s.stopLoss / 100)) : null;

                      const statusLabel = ts?.status ?? "매수대기";
                      const statusStyle = statusLabel === "보유중" ? "bg-emerald-500/20 text-emerald-400" :
                        statusLabel === "익절" ? "bg-red-500/20 text-red-400" :
                        statusLabel === "손절" ? "bg-blue-500/20 text-blue-400" :
                        "bg-amber-500/20 text-amber-400";

                      return (
                      <tr key={s.assetId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3">
                          <span className="font-medium text-white">{s.name}</span>
                          <span className="text-[10px] text-slate-500 ml-2">{s.category}</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {livePrice ? (
                            <div>
                              <span className="text-sm font-mono text-emerald-300">{livePrice.toLocaleString("ko-KR")}</span>
                              {returnVsEntry != null && returnVsEntry !== 0 && (
                                <p className={`text-[10px] font-mono ${returnVsEntry > 0 ? "text-red-400" : returnVsEntry < 0 ? "text-blue-400" : "text-slate-500"}`}>
                                  {returnVsEntry > 0 ? "+" : ""}{returnVsEntry.toFixed(2)}%
                                </p>
                              )}
                            </div>
                          ) : <span className="text-[10px] text-slate-600 animate-pulse">실시간</span>}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {entryPrice ? (
                            <span className="text-sm font-mono text-white">{entryPrice.toLocaleString("ko-KR")}</span>
                          ) : <span className="text-[10px] text-slate-600">대기</span>}
                        </td>
                        <td className="px-3 py-3 text-center hidden sm:table-cell">
                          {tpPrice ? (
                            <span className={`text-xs font-mono font-bold ${isBought ? "text-red-400" : "text-red-400/60"}`}>{tpPrice.toLocaleString("ko-KR")}</span>
                          ) : <span className="text-[10px] text-slate-600">-</span>}
                        </td>
                        <td className="px-3 py-3 text-center hidden md:table-cell">
                          {slPrice ? (
                            <span className={`text-xs font-mono font-bold ${isBought ? "text-blue-400" : "text-blue-400/60"}`}>{slPrice.toLocaleString("ko-KR")}</span>
                          ) : <span className="text-[10px] text-slate-600">-</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusStyle}`}>{statusLabel}</span>
                        </td>
                        <td className="px-3 py-3 text-center hidden lg:table-cell">
                          <span className={`text-sm font-mono font-bold ${s.targetReturnNum > 0 ? "text-red-400" : "text-blue-400"}`}>
                            {s.targetReturnNum > 0 ? "+" : ""}{s.targetReturnNum.toFixed(1)}%
                          </span>
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

        {/* ── 주간 AI 성적표 ────────────────────────── */}
        <WeeklyReportSection
          reports={weeklyReports}
          isLoading={weeklyLoading}
          showDetail={showWeeklyDetail}
          onToggleDetail={() => setShowWeeklyDetail((v) => !v)}
          prices={prices}
          livePortfolio={portfolio}
          entryPricesRef={entryPricesRef}
          tradeStatusRef={tradeStatusRef}
        />

        {/* ── 정렬 + 탭 ────────────────────────────── */}
        {solutions.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">정렬:</span>
            {(["signal", "return", "timing", "risk", "name"] as const).map((key) => {
              const labels: Record<typeof key, string> = { signal: "시그널", return: "기대수익", timing: "적합도", risk: "리스크", name: "이름" };
              return (
                <button key={key} onClick={() => setSortBy(key)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition ${sortBy === key ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"}`}>
                  {labels[key]}
                </button>
              );
            })}
          </div>
        )}

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
            {displayed.map((item) => {
              const lp = prices.get(item.assetId);
              const lockedEntry = entryPricesRef.current.get(item.assetId);
              return <SolutionCard key={item.assetId} item={item} livePrice={lp?.price && lp.price > 0 ? lp.price : undefined} liveChange={lp?.price && lp.price > 0 ? lp.changePercent : undefined} entryPrice={lockedEntry} />;
            })}
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

function SolutionCard({ item, livePrice, liveChange, entryPrice: lockedEntryPrice }: { item: SolutionItem; livePrice?: number; liveChange?: number; entryPrice?: number }) {
  const [open, setOpen] = useState(false);
  const cfg = signalConfig[item.signal];
  const Icon = cfg.icon;

  // ── 실제 금액 기반 목표가 계산 ──
  const isBuy = item.signal === "강력매수" || item.signal === "매수";
  const isSell = item.signal === "강력매도" || item.signal === "매도";
  const currentPrice = livePrice ?? 0;
  // 매수진입가: 고정 잠금가 (없으면 현재가 fallback)
  const entryPrice = lockedEntryPrice ?? (currentPrice > 0 ? currentPrice : null);
  const takeProfitPrice = entryPrice ? Math.round(entryPrice * (1 + Math.abs(item.targetReturnNum) / 100)) : null;
  const stopLossPrice = entryPrice && item.stopLoss != null ? Math.round(entryPrice * (1 - item.stopLoss / 100)) : null;

  const fmtPrice = (p: number | null) => p != null && p > 0 ? p.toLocaleString("ko-KR") : "-";

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
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {currentPrice > 0 ? (
                <span className="text-[12px] font-mono text-slate-300">
                  현재가 <span className="text-white font-bold">{fmtPrice(currentPrice)}</span>
                  {item.unit === "%" ? "%" : "원"}
                  {liveChange != null && (
                    <span className={`ml-1.5 ${liveChange > 0 ? "text-red-400" : liveChange < 0 ? "text-blue-400" : "text-slate-500"}`}>
                      {liveChange > 0 ? "+" : ""}{liveChange.toFixed(2)}%
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-[11px] text-slate-600">가격 로딩중...</span>
              )}
              {/* 요약된 목표가 표시 (접혀있을 때) */}
              {!open && currentPrice > 0 && (isBuy || isSell) && (
                <span className="text-[11px] text-slate-500">
                  {isBuy ? "익절" : "목표"} <span className={`font-mono font-medium ${isBuy ? "text-red-400" : "text-blue-400"}`}>{fmtPrice(takeProfitPrice)}</span>
                  {stopLossPrice && <> · 손절 <span className="font-mono font-medium text-red-400/80">{fmtPrice(stopLossPrice)}</span></>}
                </span>
              )}
            </div>
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

          {/* ── 핵심 매매 가격 정보 ── */}
          {(currentPrice > 0 || entryPrice) && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {/* 실시간 현재가 */}
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1.5 text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">현재가</span>
                </div>
                <p className="text-base font-bold font-mono text-emerald-300">{currentPrice > 0 ? fmtPrice(currentPrice) : "-"}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {(() => {
                    const retVsEntry = (currentPrice > 0 && entryPrice && entryPrice > 0)
                      ? Math.round(((currentPrice - entryPrice) / entryPrice) * 10000) / 100
                      : null;
                    if (retVsEntry != null && retVsEntry !== 0) {
                      return (
                        <span className={`${retVsEntry > 0 ? "text-red-400" : "text-blue-400"}`}>
                          진입가 대비 {retVsEntry > 0 ? "+" : ""}{retVsEntry.toFixed(2)}%
                        </span>
                      );
                    }
                    return "실시간";
                  })()}
                </p>
              </div>

              {/* 매수 진입가 (고정) */}
              <div className="rounded-lg bg-slate-800/80 border border-slate-600/40 p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1.5 text-amber-400">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">{isBuy ? "매수 진입가" : isSell ? "매도 기준가" : "기준가"}</span>
                </div>
                <p className="text-base font-bold font-mono text-white">{fmtPrice(entryPrice)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  사이클 고정
                </p>
              </div>

              {/* 익절가 (목표가) */}
              <div className={`rounded-lg border p-3 text-center ${isBuy ? "bg-red-500/10 border-red-500/30" : isSell ? "bg-blue-500/10 border-blue-500/30" : "bg-slate-800/60 border-slate-700/40"}`}>
                <div className={`flex items-center justify-center gap-1 mb-1.5 ${isBuy ? "text-red-400" : isSell ? "text-blue-400" : "text-slate-400"}`}>
                  <Banknote className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">{isBuy ? "익절 목표가" : isSell ? "하락 목표가" : "목표가"}</span>
                </div>
                <p className={`text-base font-bold font-mono ${isBuy ? "text-red-400" : isSell ? "text-blue-400" : "text-slate-300"}`}>
                  {fmtPrice(takeProfitPrice)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {item.targetReturnNum > 0 ? "+" : ""}{item.targetReturnNum.toFixed(1)}%
                  {item.peakDate && <> · {isSell ? item.troughDate : item.peakDate}</>}
                </p>
              </div>

              {/* 손절가 */}
              <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1.5 text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">손절가</span>
                </div>
                <p className="text-base font-bold font-mono text-red-400">
                  {fmtPrice(stopLossPrice)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {item.stopLoss != null ? `-${item.stopLoss.toFixed(1)}%` : "-"}
                  {item.riskReward != null && <> · R/R {item.riskReward.toFixed(1)}</>}
                </p>
              </div>

              {/* 수익/손실 금액 (1주 기준) */}
              <div className="rounded-lg bg-slate-800/60 border border-slate-700/40 p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1.5 text-amber-400">
                  <CircleDollarSign className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">예상 손익</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <p className={`text-sm font-bold font-mono ${isBuy ? "text-red-400" : isSell ? "text-blue-400" : "text-slate-300"}`}>
                    {takeProfitPrice != null && entryPrice != null
                      ? `${isBuy ? "+" : ""}${(takeProfitPrice - entryPrice).toLocaleString("ko-KR")}`
                      : "-"}
                  </p>
                  <p className="text-[10px] text-red-400/70 font-mono">
                    {stopLossPrice != null && entryPrice != null
                      ? `손절 시 ${(stopLossPrice - entryPrice).toLocaleString("ko-KR")}`
                      : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── 타이밍 예측 카드 ── */}
          {item.peakDays != null && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <TimingBox
                label={isSell ? "저점 예상일" : "고점 예상일"}
                value={isSell ? item.troughDate : item.peakDate}
                sub={`${isSell ? item.troughDays : item.peakDays}일 후`}
                color={isSell ? "text-blue-400" : "text-red-400"}
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
                label={isBuy ? "매도 시점" : isSell ? "재매수 시점" : "재평가"}
                value={item.holdingDays ? addDaysStr(item.holdingDays) : null}
                sub={item.holdingDays ? `${item.holdingDays}일 후` : ""}
                color="text-cyan-400"
                icon={<Clock className="w-3.5 h-3.5" />}
              />
            </div>
          )}

          {/* ── 매매 전략 ── */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                isBuy ? "bg-emerald-500/20 text-emerald-400"
                  : isSell ? "bg-red-500/20 text-red-400"
                    : "bg-slate-500/20 text-slate-400"
              }`}>
                {isBuy ? "매수 전략" : isSell ? "매도 전략" : "대기 전략"}
              </span>
              <p className="text-[12px] text-slate-300 leading-relaxed">
                {item.entryStrategy}
                {isBuy && entryPrice && <span className="text-emerald-400 font-mono ml-1">(진입가: {fmtPrice(entryPrice)}원)</span>}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400">
                {isBuy ? "익절 전략" : "재진입 조건"}
              </span>
              <p className="text-[12px] text-slate-300 leading-relaxed">
                {item.exitStrategy}
                {isBuy && takeProfitPrice && <span className="text-red-400 font-mono ml-1">(익절가: {fmtPrice(takeProfitPrice)}원)</span>}
                {isBuy && stopLossPrice && <span className="text-red-400/70 font-mono ml-1">(손절가: {fmtPrice(stopLossPrice)}원)</span>}
              </p>
            </div>
          </div>

          {/* ── 타이밍 게이지 ── */}
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

// ── 주간 AI 성적표 ──────────────────────────────────────────────────────

const exitReasonStyle: Record<string, { bg: string; text: string; icon: string }> = {
  "익절": { bg: "bg-emerald-500/15", text: "text-emerald-400", icon: "💰" },
  "손절": { bg: "bg-red-500/15", text: "text-red-400", icon: "🛑" },
  "기간종료": { bg: "bg-slate-500/15", text: "text-slate-400", icon: "⏰" },
  "미체결": { bg: "bg-yellow-500/15", text: "text-yellow-400", icon: "⏳" },
};

function WeeklyReportSection({
  reports,
  isLoading,
  showDetail,
  onToggleDetail,
  prices,
  livePortfolio,
  entryPricesRef,
  tradeStatusRef,
}: {
  reports: WeeklyReportData[];
  isLoading: boolean;
  showDetail: boolean;
  onToggleDetail: () => void;
  prices: Map<string, import("@/lib/realtime/priceService").LivePrice>;
  livePortfolio: (SolutionItem & { weight: number })[];
  entryPricesRef: React.RefObject<Map<string, number>>;
  tradeStatusRef: React.RefObject<Map<string, { status: string; buyPrice: number | null; sellPrice: number | null; lockedTp: number | null; lockedSl: number | null }>>;
}) {
  if (isLoading) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-40 mb-4" />
        <div className="h-20 bg-slate-800 rounded" />
      </section>
    );
  }

  if (reports.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold">주간 AI 성적표</h2>
        </div>
        <p className="text-xs text-slate-500">
          매주 월요일에 지난주 AI 추천 포트폴리오의 자동매매 시뮬레이션 성적이 생성됩니다. 각 종목별 익절/손절 결과를 확인할 수 있습니다.
        </p>
      </section>
    );
  }

  const latest = reports[0];
  const weekStartStr = formatWeekDate(latest.weekStart);
  const weekEndStr = formatWeekDate(latest.weekEnd);

  // ── 라이브 포트폴리오 기반 KPI 계산 ──
  const liveStats = (() => {
    if (livePortfolio.length === 0) return null;

    let weightedReturn = 0;
    let totalWeight = 0;
    let tpCount = 0, slCount = 0, waitCount = 0, holdCount = 0;
    let best: { name: string; ret: number } | null = null;
    let worst: { name: string; ret: number } | null = null;

    for (const s of livePortfolio) {
      const lp = prices.get(s.assetId);
      const livePrice = lp?.price && lp.price > 0 ? lp.price : null;
      const entry = entryPricesRef.current?.get(s.assetId);
      const ts = tradeStatusRef.current?.get(s.assetId);
      const status = ts?.status ?? "매수대기";

      if (status === "익절") tpCount++;
      else if (status === "손절") slCount++;
      else if (status === "보유중") holdCount++;
      else waitCount++;

      // 수익률: 매도 완료 시 매도가 기준, 보유중이면 현재가 기준, 대기중이면 0%
      let ret = 0;
      if (status === "익절" || status === "손절") {
        const sellP = ts?.sellPrice ?? livePrice;
        const buyP = ts?.buyPrice ?? entry;
        if (sellP && buyP && buyP > 0) ret = Math.round(((sellP - buyP) / buyP) * 10000) / 100;
      } else if (status === "보유중" && livePrice && entry && entry > 0) {
        ret = Math.round(((livePrice - entry) / entry) * 10000) / 100;
      }

      weightedReturn += ret * s.weight;
      totalWeight += s.weight;

      if (!best || ret > best.ret) best = { name: s.name, ret };
      if (!worst || ret < worst.ret) worst = { name: s.name, ret };
    }

    const portfolioReturn = totalWeight > 0 ? Math.round((weightedReturn / totalWeight) * 100) / 100 : 0;
    // 모두 0%면 best/worst 표시 안 함
    const allZero = (!best || best.ret === 0) && (!worst || worst.ret === 0);

    return {
      portfolioReturn,
      totalCount: livePortfolio.length,
      tpCount, slCount, holdCount, waitCount,
      best: allZero ? null : best,
      worst: allZero ? null : worst,
      hasActivity: tpCount > 0 || slCount > 0 || holdCount > 0, // 매매 활동이 있는지
    };
  })();

  return (
    <section className="space-y-3">
      {/* 메인 카드 */}
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-slate-900/70 overflow-hidden">
        <button onClick={onToggleDetail} className="w-full p-5 hover:bg-slate-800/20 transition-colors text-left">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">주간 AI 성적표</h2>
              <span className="text-[11px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                {weekStartStr} ~ {weekEndStr}
              </span>
            </div>
            {showDetail ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>

          {/* KPI 행 — 라이브 데이터 기반 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <WeeklyKPI
              label="포트폴리오 수익률"
              value={liveStats && liveStats.hasActivity ? `${liveStats.portfolioReturn > 0 ? "+" : ""}${liveStats.portfolioReturn}%` : "-"}
              sub={liveStats ? `${liveStats.totalCount}종목 · ${liveStats.waitCount > 0 ? `${liveStats.waitCount}종목 대기중` : "전종목 진입"}` : ""}
              color={liveStats && liveStats.portfolioReturn > 0 ? "text-red-400" : liveStats && liveStats.portfolioReturn < 0 ? "text-blue-400" : "text-slate-400"}
            />
            <WeeklyKPI
              label="매매 결과"
              value={liveStats && liveStats.hasActivity ? `${liveStats.tpCount}/${liveStats.slCount}/${liveStats.holdCount}` : "-"}
              sub={liveStats && liveStats.hasActivity ? "익절/손절/보유중" : `${liveStats?.waitCount ?? 0}종목 매수 대기중`}
              color={liveStats && liveStats.tpCount > liveStats.slCount ? "text-emerald-400" : liveStats && liveStats.slCount > liveStats.tpCount ? "text-red-400" : "text-amber-400"}
            />
            <WeeklyKPI
              label="최고 성과"
              value={liveStats?.best ? liveStats.best.name : "-"}
              sub={liveStats?.best ? `${liveStats.best.ret > 0 ? "+" : ""}${liveStats.best.ret}%` : "매매 진행 후 표시"}
              color="text-red-400"
            />
            <WeeklyKPI
              label="최악 성과"
              value={liveStats?.worst ? liveStats.worst.name : "-"}
              sub={liveStats?.worst ? `${liveStats.worst.ret > 0 ? "+" : ""}${liveStats.worst.ret}%` : "매매 진행 후 표시"}
              color="text-blue-400"
            />
          </div>
        </button>

        {/* 상세 펼침 */}
        {showDetail && (
          <div className="border-t border-slate-700/50 p-5 space-y-4 bg-slate-950/40">
            {/* 포트폴리오 종목별 자동매매 현황 (AI 추천 포트폴리오와 동일 종목) */}
            {livePortfolio.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5" />
                  종목별 자동매매 결과 ({livePortfolio.length}종목)
                </h3>
                <div className="space-y-2">
                  {livePortfolio.map((s) => {
                    const lp = prices.get(s.assetId);
                    const livePrice = lp?.price && lp.price > 0 ? lp.price : null;
                    const liveChange = lp?.changePercent ?? null;
                    const entryPrice = entryPricesRef.current?.get(s.assetId) ?? null;
                    const ts = tradeStatusRef.current?.get(s.assetId);
                    const isBought = ts && (ts.status === "보유중" || ts.status === "익절" || ts.status === "손절");
                    const basePrice = isBought ? entryPrice : livePrice;
                    const tpPrice = basePrice ? Math.round(basePrice * (1 + Math.abs(s.targetReturnNum) / 100)) : null;
                    const slPrice = basePrice && s.stopLoss != null ? Math.round(basePrice * (1 - s.stopLoss / 100)) : null;

                    return (
                      <LiveTradeRow
                        key={s.assetId}
                        name={s.name}
                        signal={s.signal}
                        weight={s.weight}
                        livePrice={livePrice}
                        liveChange={liveChange}
                        entryPrice={entryPrice}
                        tpPrice={tpPrice}
                        slPrice={slPrice}
                        status={ts?.status ?? "매수대기"}
                        buyPrice={ts?.buyPrice ?? null}
                        sellPrice={ts?.sellPrice ?? null}
                        targetReturnNum={s.targetReturnNum}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI 주간 회고 */}
            {latest.weeklyLesson && (
              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/40">
                <h3 className="text-xs font-semibold text-purple-300 mb-1.5 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  AI 주간 매매 회고
                </h3>
                <div className="space-y-0.5">
                  {latest.weeklyLesson.split("\n").map((line, i) => (
                    <p key={i} className={`text-[11px] ${line.startsWith("→") ? "text-amber-400 pl-2" : "text-slate-400"}`}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 과거 주차 성적 미니 히스토리 */}
      {reports.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] text-slate-500 shrink-0">지난 성적:</span>
          {reports.slice(1, 5).map((r) => (
            <div key={r.weekStart} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px]">
              <span className="text-slate-500">{formatWeekDate(r.weekStart)}~{formatWeekDate(r.weekEnd)}</span>
              <span className={`font-mono font-bold ${r.portfolioReturn > 0 ? "text-red-400" : "text-blue-400"}`}>
                {r.portfolioReturn > 0 ? "+" : ""}{r.portfolioReturn}%
              </span>
              <span className="text-slate-600">
                {r.tpCount}익/{r.slCount}손
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function WeeklyKPI({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
      <p className="text-[10px] text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function PortfolioTradeRow({ result, livePrice, liveChange }: { result: PortfolioResult; livePrice?: number | null; liveChange?: number | null }) {
  const exitStyle = exitReasonStyle[result.exitReason] ?? exitReasonStyle["기간종료"];
  const fmtPrice = (p: number | null) => p ? p.toLocaleString("ko-KR") : "-";

  return (
    <div className="rounded-lg bg-slate-900/60 border border-slate-800/60 p-3 hover:bg-slate-800/40 transition">
      {/* 상단: 종목명 + 시그널 + 현재가 + 청산 태그 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${result.wasCorrect ? "bg-emerald-400" : "bg-red-400"}`} />
          <span className="text-sm text-white font-medium">{result.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            result.signal === "강력매수" ? "bg-red-500/20 text-red-400" :
            result.signal === "매수" ? "bg-orange-500/20 text-orange-400" :
            "bg-slate-500/20 text-slate-400"
          }`}>
            {result.signal}
          </span>
          <span className="text-[10px] text-slate-600 font-mono">비중 {result.weight}%</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 실시간 현재가 */}
          {livePrice ? (
            <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              현재 {livePrice.toLocaleString("ko-KR")}
              {liveChange != null && (
                <span className={`ml-1 ${liveChange > 0 ? "text-red-400" : liveChange < 0 ? "text-blue-400" : "text-slate-500"}`}>
                  {liveChange > 0 ? "+" : ""}{liveChange.toFixed(2)}%
                </span>
              )}
            </span>
          ) : (
            <span className="text-[10px] text-slate-600 animate-pulse">시세 로딩</span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${exitStyle.bg} ${exitStyle.text}`}>
            {exitStyle.icon} {result.exitReason}{result.exitDay ? ` ${result.exitDay}일차` : ""}
          </span>
          <span className={`text-sm font-mono font-bold ${result.actualReturn > 0 ? "text-red-400" : result.actualReturn < 0 ? "text-blue-400" : "text-slate-400"}`}>
            {result.actualReturn > 0 ? "+" : ""}{result.actualReturn.toFixed(2)}%
          </span>
        </div>
      </div>
      {/* 하단: 매매가 정보 */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500">
        <span>매수가 <span className="text-slate-400 font-mono">{fmtPrice(result.entryPrice)}</span></span>
        <span>매도가 <span className="text-slate-400 font-mono">{fmtPrice(result.exitPrice)}</span></span>
        <span className="hidden sm:inline">익절 목표가 <span className="text-red-400/70 font-mono">{fmtPrice(result.tpTarget)}</span></span>
        <span className="hidden sm:inline">손절가 <span className="text-blue-400/70 font-mono">{fmtPrice(result.slTarget)}</span></span>
        <span className="ml-auto">P&L <span className={`font-mono ${result.pnl > 0 ? "text-red-400" : result.pnl < 0 ? "text-blue-400" : "text-slate-400"}`}>{result.pnl > 0 ? "+" : ""}{result.pnl}%</span></span>
      </div>
    </div>
  );
}

function LiveTradeRow({ name, signal, weight, livePrice, liveChange, entryPrice, tpPrice, slPrice, status, buyPrice, sellPrice, targetReturnNum }: {
  name: string; signal: string; weight: number;
  livePrice: number | null; liveChange: number | null;
  entryPrice: number | null; tpPrice: number | null; slPrice: number | null;
  status: string; buyPrice: number | null; sellPrice: number | null;
  targetReturnNum: number;
}) {
  const fmtPrice = (p: number | null) => p ? p.toLocaleString("ko-KR") : "-";
  const isBought = status === "보유중" || status === "익절" || status === "손절";
  const isSold = status === "익절" || status === "손절";

  const statusStyle = status === "보유중" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
    status === "익절" ? "bg-red-500/20 text-red-400 border-red-500/30" :
    status === "손절" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
    "bg-amber-500/20 text-amber-400 border-amber-500/30";

  const statusIcon = status === "보유중" ? "📈" : status === "익절" ? "💰" : status === "손절" ? "🛑" : "⏳";

  // 수익률 계산 (보유중일 때만)
  const unrealizedReturn = isBought && !isSold && livePrice && entryPrice
    ? Math.round(((livePrice - entryPrice) / entryPrice) * 100 * 100) / 100
    : null;

  return (
    <div className={`rounded-lg border p-3 transition ${isSold ? "bg-slate-900/40 border-slate-800/40" : "bg-slate-900/60 border-slate-800/60 hover:bg-slate-800/40"}`}>
      {/* 상단: 종목명 + 상태 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{statusIcon}</span>
          <span className="text-sm text-white font-medium">{name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            signal === "강력매수" ? "bg-red-500/20 text-red-400" :
            signal === "매수" ? "bg-orange-500/20 text-orange-400" :
            "bg-slate-500/20 text-slate-400"
          }`}>{signal}</span>
          <span className="text-[10px] text-slate-600 font-mono">비중 {weight}%</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 실시간 현재가 */}
          {livePrice ? (
            <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              현재 {livePrice.toLocaleString("ko-KR")}
              {liveChange != null && (
                <span className={`ml-1 ${liveChange > 0 ? "text-red-400" : liveChange < 0 ? "text-blue-400" : "text-slate-500"}`}>
                  {liveChange > 0 ? "+" : ""}{liveChange.toFixed(2)}%
                </span>
              )}
            </span>
          ) : <span className="text-[10px] text-slate-600 animate-pulse">시세 로딩</span>}
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${statusStyle}`}>{status}</span>
          {unrealizedReturn != null && (
            <span className={`text-sm font-mono font-bold ${unrealizedReturn > 0 ? "text-red-400" : unrealizedReturn < 0 ? "text-blue-400" : "text-slate-400"}`}>
              {unrealizedReturn > 0 ? "+" : ""}{unrealizedReturn}%
            </span>
          )}
        </div>
      </div>
      {/* 하단: 매매 정보 */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500">
        <span>매수진입가 <span className="text-white font-mono">{fmtPrice(entryPrice)}</span></span>
        {isBought && <span>매수가 <span className="text-slate-400 font-mono">{fmtPrice(buyPrice)}</span></span>}
        {isSold && <span>매도가 <span className="text-slate-400 font-mono">{fmtPrice(sellPrice)}</span></span>}
        <span className={isBought ? "" : "hidden sm:inline"}>익절 목표가 <span className={`font-mono ${isBought ? "text-red-400" : "text-red-400/60"}`}>{fmtPrice(tpPrice)}</span></span>
        <span className={isBought ? "" : "hidden sm:inline"}>손절가 <span className={`font-mono ${isBought ? "text-blue-400" : "text-blue-400/60"}`}>{fmtPrice(slPrice)}</span></span>
      </div>
    </div>
  );
}

function formatWeekDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
