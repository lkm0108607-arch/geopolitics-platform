import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  getModelWeights,
  saveModelWeights,
  saveLearningLog,
} from "@/lib/ai/dataService";
import { batchLearn } from "@/lib/ai/learner";
import type { PredictionOutcome } from "@/lib/ai/learner";
import type { Direction } from "@/lib/ai/models";
import type { AIPrediction, SubModelVotes } from "@/lib/ai/ensemble";
import { getAssetById } from "@/data/assets";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ─── 포트폴리오 로직 재현 (investment page와 동일) ────────────────────────────

type InvestmentSignal = "강력매수" | "매수" | "관망" | "매도" | "강력매도";

function computeSignal(pred: AIPrediction): InvestmentSignal {
  const { direction, probability, confidence } = pred;

  // investment page와 동일한 로직
  if (direction === "상승") {
    if (probability >= 70 && confidence >= 30) return "강력매수";
    if (probability >= 70) return "매수";
    if (probability >= 55 && confidence >= 25) return "매수";
    if (probability >= 55) return "관망";
  } else if (direction === "하락") {
    if (probability >= 70 && confidence >= 30) return "강력매도";
    if (probability >= 70) return "매도";
    if (probability >= 55 && confidence >= 25) return "매도";
    if (probability >= 55) return "관망";
  }

  // 배심원/토론 데이터 보너스
  const juryVerdict = pred.juryVerdict;
  const debateResult = pred.debateResult;
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

function computeTimingScore(pred: AIPrediction): number {
  // investment page와 동일한 로직
  let score = pred.probability;
  if (pred.confidence >= 35) score += 5;
  else if (pred.confidence >= 25) score += 0;
  else score -= 5;

  // 배심원/토론 보너스
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

interface PortfolioPick {
  assetId: string;
  name: string;
  signal: InvestmentSignal;
  timingScore: number;
  weight: number;
  predictedDirection: string;
  predictedReturn: number;
  stopLossPercent: number;
  holdingDays: number;
  cycleId: string;
}

/** AI 예측 배열에서 추천 포트폴리오 5종목을 추출 */
function buildPortfolio(predictions: AIPrediction[]): PortfolioPick[] {
  const buyItems: { pred: AIPrediction; signal: InvestmentSignal; score: number }[] = [];

  for (const pred of predictions) {
    // ETF만 포함 (지수·금리·환율·원자재 제외), 이름 해결된 종목만
    if (!pred.assetId.startsWith("etf-")) continue;
    const asset = getAssetById(pred.assetId);
    if (!asset || asset.name === pred.assetId) continue;

    const signal = computeSignal(pred);
    if (signal === "강력매수" || signal === "매수") {
      buyItems.push({ pred, signal, score: computeTimingScore(pred) });
    }
  }

  buyItems.sort((a, b) => b.score - a.score);
  const top5 = buyItems.slice(0, 5);
  if (top5.length === 0) return [];

  const totalScore = top5.reduce((s, t) => s + t.score, 0);

  return top5.map((item) => {
    const asset = getAssetById(item.pred.assetId);
    const tp = item.pred.timingPrediction;

    // 목표 수익률
    const base = Math.max(0, (item.pred.probability - 50) * 0.15);
    const predictedReturn = tp
      ? tp.expectedReturnPercent
      : item.pred.direction === "상승" ? base : -base;

    // 손절 기준: timingPrediction이 있으면 사용, 없으면 목표수익률의 70% (최소 1.5%)
    const stopLossPercent = tp
      ? tp.stopLossPercent
      : Math.round(Math.max(1.5, Math.abs(predictedReturn) * 0.7) * 10) / 10;

    // 보유 기간: timingPrediction이 있으면 사용, 없으면 7일 기본
    const holdingDays = tp?.holdingPeriodDays ?? 7;

    return {
      assetId: item.pred.assetId,
      name: asset?.name ?? item.pred.assetId,
      signal: item.signal,
      timingScore: item.score,
      weight: totalScore > 0 ? Math.round((item.score / totalScore) * 100) : 20,
      predictedDirection: item.pred.direction,
      predictedReturn: Math.round(predictedReturn * 10) / 10,
      stopLossPercent,
      holdingDays,
      cycleId: item.pred.cycleId,
    };
  });
}

// ─── 주차 범위 계산 ──────────────────────────────────────────────────────────

function getWeekRange(weeksAgo: number): { weekStart: string; weekEnd: string } {
  const d = new Date();
  const dayOfWeek = d.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday - 7 * weeksAgo);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { weekStart: monday.toISOString(), weekEnd: sunday.toISOString() };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── 자동매매 시뮬레이션 결과 ────────────────────────────────────────────────

type ExitReason = "익절" | "손절" | "기간종료" | "미체결";

export interface PortfolioResult {
  assetId: string;
  name: string;
  signal: string;
  weight: number;
  // 매매 시뮬레이션
  entryPrice: number | null;
  exitPrice: number | null;
  tpTarget: number | null;       // 익절 목표가
  slTarget: number | null;       // 손절가
  exitReason: ExitReason;         // "익절" | "손절" | "기간종료" | "미체결"
  exitDay: number | null;        // 몇째 날에 청산 (1~7, null=미체결 또는 데이터 없음)
  // 성적
  predictedReturn: number;
  actualReturn: number;
  wasCorrect: boolean;
  pnl: number;
}

export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  portfolio: PortfolioResult[];
  portfolioReturn: number;
  hitRate: number;
  hitCount: number;
  totalCount: number;
  tpCount: number;        // 익절 횟수
  slCount: number;        // 손절 횟수
  holdCount: number;      // 기간종료 횟수
  bestPick: { name: string; returnPercent: number } | null;
  worstPick: { name: string; returnPercent: number } | null;
  weeklyLesson: string;
}

// ─── 자동매매 시뮬레이션 로직 ────────────────────────────────────────────────

interface DaySnapshot {
  close: number;
  high: number;
  low: number;
}

async function getWeekSnapshots(
  assetIds: string[],
  weekStart: string,
  weekEnd: string,
): Promise<Map<string, DaySnapshot[]>> {
  // weekEnd + 7일까지 (보유기간이 주를 넘길 수 있음)
  const extendedEnd = new Date(new Date(weekEnd).getTime() + 7 * 86400000).toISOString();

  const { data } = await supabase
    .from("market_snapshots")
    .select("asset_id, close_price, high_price, low_price, recorded_at")
    .in("asset_id", assetIds)
    .gte("recorded_at", weekStart)
    .lte("recorded_at", extendedEnd)
    .order("recorded_at", { ascending: true });

  const map = new Map<string, DaySnapshot[]>();
  for (const row of (data ?? [])) {
    const arr = map.get(row.asset_id) ?? [];
    arr.push({
      close: row.close_price,
      high: row.high_price ?? row.close_price,
      low: row.low_price ?? row.close_price,
    });
    map.set(row.asset_id, arr);
  }
  return map;
}

function simulateTrade(
  pick: PortfolioPick,
  snapshots: DaySnapshot[],
): { entryPrice: number; exitPrice: number; exitReason: ExitReason; exitDay: number; actualReturn: number } {
  if (snapshots.length === 0) {
    return { entryPrice: 0, exitPrice: 0, exitReason: "미체결", exitDay: 0, actualReturn: 0 };
  }

  // 진입가 = 추천 시점의 종가 (day 0)
  const targetEntry = snapshots[0].close;
  if (targetEntry <= 0) {
    return { entryPrice: 0, exitPrice: 0, exitReason: "미체결", exitDay: 0, actualReturn: 0 };
  }

  const tpPrice = targetEntry * (1 + Math.abs(pick.predictedReturn) / 100);
  const slPrice = targetEntry * (1 - pick.stopLossPercent / 100);

  // 1단계: 진입 대기 — 진입가 이하로 내려올 때 매수 체결
  // (day 0은 추천일이므로 day 1부터 체결 탐색)
  let entryDay = -1;
  for (let i = 1; i < snapshots.length && i <= pick.holdingDays; i++) {
    if (snapshots[i].low <= targetEntry) {
      entryDay = i;
      break;
    }
  }

  // 진입가 미도달 → 미체결
  if (entryDay < 0) {
    return { entryPrice: targetEntry, exitPrice: 0, exitReason: "미체결", exitDay: 0, actualReturn: 0 };
  }

  // 2단계: 진입 후 TP/SL 체크 (진입 다음 날부터)
  for (let i = entryDay + 1; i < snapshots.length && i <= pick.holdingDays; i++) {
    const day = snapshots[i];

    // SL 먼저 체크 (보수적: 같은 날 둘 다 터지면 SL 우선)
    if (day.low <= slPrice) {
      const ret = -pick.stopLossPercent;
      return { entryPrice: targetEntry, exitPrice: slPrice, exitReason: "손절", exitDay: i, actualReturn: Math.round(ret * 100) / 100 };
    }

    // TP 체크
    if (day.high >= tpPrice) {
      const ret = Math.abs(pick.predictedReturn);
      return { entryPrice: targetEntry, exitPrice: tpPrice, exitReason: "익절", exitDay: i, actualReturn: Math.round(ret * 100) / 100 };
    }
  }

  // 보유기간 종료 → 마지막 날 종가로 청산
  const lastIdx = Math.min(snapshots.length - 1, pick.holdingDays);
  const exitPrice = snapshots[lastIdx].close;
  const actualReturn = Math.round(((exitPrice - targetEntry) / targetEntry) * 100 * 100) / 100;

  return { entryPrice: targetEntry, exitPrice, exitReason: "기간종료", exitDay: lastIdx, actualReturn };
}

// ─── 특정 주 리포트 생성 ──────────────────────────────────────────────────────

async function buildWeeklyReport(weeksAgo: number): Promise<WeeklyReportData | null> {
  const { weekStart, weekEnd } = getWeekRange(weeksAgo);

  // 1. 해당 주 ai_predictions 조회
  const { data: preds } = await supabase
    .from("ai_predictions")
    .select("*")
    .gte("created_at", weekStart)
    .lte("created_at", weekEnd)
    .order("created_at", { ascending: false });

  if (!preds || preds.length === 0) {
    const { data: latestPred } = await supabase
      .from("ai_predictions")
      .select("cycle_id")
      .lte("created_at", weekEnd)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!latestPred || latestPred.length === 0) return null;

    const { data: cyclePreds } = await supabase
      .from("ai_predictions")
      .select("*")
      .eq("cycle_id", latestPred[0].cycle_id);

    if (!cyclePreds || cyclePreds.length === 0) return null;

    return buildReportFromPredictions(cyclePreds, weekStart, weekEnd);
  }

  const latestCycleId = preds[0].cycle_id;
  const cyclePreds = preds.filter((p: Record<string, string>) => p.cycle_id === latestCycleId);

  return buildReportFromPredictions(cyclePreds, weekStart, weekEnd);
}

async function buildReportFromPredictions(
  rawPreds: Record<string, unknown>[],
  weekStart: string,
  weekEnd: string,
): Promise<WeeklyReportData | null> {
  // AIPrediction 형태로 변환 (timingPrediction, debateResult, juryVerdict 포함)
  const predictions: AIPrediction[] = rawPreds.map((p) => {
    const votes = p.sub_model_votes as Record<string, unknown> | null;
    // savePrediction에서 sub_model_votes JSON에 함께 저장한 데이터 추출
    const rawTiming = (p as Record<string, unknown>).timing_prediction ??
      votes?.timingPrediction ?? null;
    const rawDebate = votes?.debateResult ?? null;
    const rawJury = votes?.juryVerdict ?? null;

    return {
      assetId: p.asset_id as string,
      direction: p.direction as Direction,
      probability: p.probability as number,
      confidence: p.confidence as number,
      rationale: (p.rationale as string) ?? "",
      subModelVotes: votes as unknown as SubModelVotes,
      generatedAt: (p.created_at as string) ?? "",
      cycleId: p.cycle_id as string,
      timingPrediction: rawTiming as AIPrediction["timingPrediction"],
      debateResult: rawDebate as AIPrediction["debateResult"],
      juryVerdict: rawJury as AIPrediction["juryVerdict"],
    };
  });

  // 포트폴리오 추출
  const portfolio = buildPortfolio(predictions);
  if (portfolio.length === 0) return null;

  const assetIds = portfolio.map((p) => p.assetId);

  // 자동매매 시뮬레이션: market_snapshots에서 주간 가격 데이터 조회
  const snapshotsMap = await getWeekSnapshots(assetIds, weekStart, weekEnd);

  // prediction_results도 fallback으로 조회
  const { data: results } = await supabase
    .from("prediction_results")
    .select("*")
    .in("asset_id", assetIds)
    .gte("evaluated_at", weekStart)
    .lte("evaluated_at", new Date(new Date(weekEnd).getTime() + 7 * 86400000).toISOString());

  const resultMap = new Map<string, Record<string, unknown>>();
  for (const r of (results ?? [])) {
    resultMap.set(r.asset_id, r);
  }

  // 포트폴리오 자동매매 시뮬레이션
  let tpCount = 0;
  let slCount = 0;
  let holdCount = 0;

  const portfolioResults: PortfolioResult[] = portfolio.map((pick) => {
    const snapshots = snapshotsMap.get(pick.assetId) ?? [];
    const result = resultMap.get(pick.assetId);

    let entryPrice: number | null = null;
    let exitPrice: number | null = null;
    let tpTarget: number | null = null;
    let slTarget: number | null = null;
    let exitReason: ExitReason = "기간종료";
    let exitDay: number | null = null;
    let actualReturn = 0;
    let wasCorrect = false;

    if (snapshots.length > 0 && snapshots[0].close > 0) {
      // 시뮬레이션 실행 (진입가 도달 시 매수, TP/SL 도달 시 매도)
      const sim = simulateTrade(pick, snapshots);
      entryPrice = sim.entryPrice > 0 ? sim.entryPrice : snapshots[0].close;
      tpTarget = Math.round(entryPrice * (1 + Math.abs(pick.predictedReturn) / 100));
      slTarget = Math.round(entryPrice * (1 - pick.stopLossPercent / 100));
      exitPrice = sim.exitPrice > 0 ? Math.round(sim.exitPrice) : null;
      exitReason = sim.exitReason;
      exitDay = sim.exitDay > 0 ? sim.exitDay : null;
      actualReturn = sim.actualReturn;
      wasCorrect = actualReturn > 0;
    } else if (result) {
      // snapshots 없으면 prediction_results fallback
      actualReturn = Math.round(((result.actual_change_percent as number) ?? 0) * 100) / 100;
      wasCorrect = result.was_correct as boolean;
    }

    if (exitReason === "익절") tpCount++;
    else if (exitReason === "손절") slCount++;
    else holdCount++;

    const pnl = Math.round((pick.weight * actualReturn) / 100 * 100) / 100;

    return {
      assetId: pick.assetId,
      name: pick.name,
      signal: pick.signal,
      weight: pick.weight,
      entryPrice,
      exitPrice,
      tpTarget,
      slTarget,
      exitReason,
      exitDay,
      predictedReturn: pick.predictedReturn,
      actualReturn,
      wasCorrect,
      pnl,
    };
  });

  const portfolioReturn = Math.round(
    portfolioResults.reduce((sum, r) => sum + r.pnl, 0) * 100
  ) / 100;

  const hitCount = portfolioResults.filter((r) => r.wasCorrect).length;
  const totalCount = portfolioResults.length;
  const hitRate = totalCount > 0 ? Math.round((hitCount / totalCount) * 100) : 0;

  const sorted = [...portfolioResults].sort((a, b) => b.actualReturn - a.actualReturn);
  const bestPick = sorted.length > 0
    ? { name: sorted[0].name, returnPercent: sorted[0].actualReturn }
    : null;
  const worstPick = sorted.length > 0
    ? { name: sorted[sorted.length - 1].name, returnPercent: sorted[sorted.length - 1].actualReturn }
    : null;

  const weeklyLesson = generatePortfolioLesson(portfolioResults, portfolioReturn, hitRate, tpCount, slCount, holdCount, bestPick, worstPick);

  return {
    weekStart, weekEnd, portfolio: portfolioResults,
    portfolioReturn, hitRate, hitCount, totalCount,
    tpCount, slCount, holdCount,
    bestPick, worstPick, weeklyLesson,
  };
}

// ─── GET: 최근 4주 포트폴리오 리포트 조회 ────────────────────────────────────

export async function GET() {
  try {
    const reports: WeeklyReportData[] = [];
    for (let i = 0; i < 4; i++) {
      const report = await buildWeeklyReport(i);
      if (report) reports.push(report);
    }
    return NextResponse.json({ success: true, reports });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// ─── POST: 주간 포트폴리오 강화학습 실행 ─────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const currentWeek = (body as Record<string, boolean>).currentWeek ?? false;
    const weeksAgo = currentWeek ? 0 : 1;

    const report = await buildWeeklyReport(weeksAgo);
    if (!report || report.portfolio.length === 0) {
      return NextResponse.json({
        success: false,
        error: "해당 주간 포트폴리오 데이터가 없습니다.",
      }, { status: 404 });
    }

    const { weekStart, weekEnd } = getWeekRange(weeksAgo);

    const { data: preds } = await supabase
      .from("ai_predictions")
      .select("*")
      .in("asset_id", report.portfolio.map((p) => p.assetId))
      .gte("created_at", weekStart)
      .lte("created_at", weekEnd);

    const { data: results } = await supabase
      .from("prediction_results")
      .select("*")
      .in("asset_id", report.portfolio.map((p) => p.assetId))
      .gte("evaluated_at", weekStart);

    const resultMap = new Map<string, Record<string, unknown>>();
    for (const r of (results ?? [])) {
      resultMap.set(r.asset_id, r);
    }

    const currentWeights = await getModelWeights();
    const outcomes: PredictionOutcome[] = [];

    for (const pred of (preds ?? [])) {
      const result = resultMap.get(pred.asset_id);
      if (!result) continue;

      const predForLearner: AIPrediction = {
        assetId: pred.asset_id,
        direction: pred.direction as Direction,
        probability: pred.probability,
        confidence: pred.confidence,
        rationale: pred.rationale ?? "",
        subModelVotes: pred.sub_model_votes as SubModelVotes,
        generatedAt: pred.created_at ?? new Date().toISOString(),
        cycleId: pred.cycle_id,
      };

      outcomes.push({
        prediction: predForLearner,
        actualDirection: result.actual_direction as Direction,
        actualReturnPercent: (result.actual_change_percent as number) ?? 0,
      });
    }

    if (outcomes.length > 0) {
      const batchResult = batchLearn(outcomes, currentWeights);
      const weekLabel = `${fmtDate(weekStart)}~${fmtDate(weekEnd)}`;

      try {
        await saveModelWeights(
          batchResult.finalWeights,
          `주간 포트폴리오 학습 (${weekLabel}): 수익률 ${report.portfolioReturn}%, 적중률 ${report.hitRate}%, 익절 ${report.tpCount}건/손절 ${report.slCount}건`,
        );
      } catch (err) {
        console.error("주간 가중치 저장 실패:", err);
      }

      try {
        await saveLearningLog({
          cycleId: `weekly-portfolio-${weekStart.slice(0, 10)}`,
          assetId: "PORTFOLIO_WEEKLY",
          lesson: `[주간 포트폴리오 회고 ${weekLabel}]\n${report.weeklyLesson}`,
          missedFactors: [],
          modelPerformance: {},
          weightAdjustment: batchResult.finalWeights,
        });
      } catch (err) {
        console.error("주간 학습 로그 저장 실패:", err);
      }
    }

    return NextResponse.json({
      success: true,
      weekStart: fmtDate(weekStart),
      weekEnd: fmtDate(weekEnd),
      portfolioReturn: report.portfolioReturn,
      hitRate: report.hitRate,
      tpCount: report.tpCount,
      slCount: report.slCount,
      holdCount: report.holdCount,
      portfolioCount: report.portfolio.length,
      learningApplied: outcomes.length > 0,
    });
  } catch (err) {
    console.error("주간 포트폴리오 학습 오류:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// ─── 포트폴리오 회고 생성 ────────────────────────────────────────────────────

function generatePortfolioLesson(
  results: PortfolioResult[],
  portfolioReturn: number,
  hitRate: number,
  tpCount: number,
  slCount: number,
  holdCount: number,
  bestPick: { name: string; returnPercent: number } | null,
  worstPick: { name: string; returnPercent: number } | null,
): string {
  const lines: string[] = [];

  lines.push(`추천 포트폴리오 ${results.length}종목 자동매매 결과: 수익률 ${portfolioReturn > 0 ? "+" : ""}${portfolioReturn}%, 적중률 ${hitRate}%`);
  lines.push(`매매 결과: 익절 ${tpCount}건 | 손절 ${slCount}건 | 기간종료 ${holdCount}건`);

  for (const r of results) {
    const icon = r.exitReason === "익절" ? "💰" : r.exitReason === "손절" ? "🛑" : "⏰";
    const entryStr = r.entryPrice ? r.entryPrice.toLocaleString("ko-KR") : "-";
    const exitStr = r.exitPrice ? r.exitPrice.toLocaleString("ko-KR") : "-";
    const dayStr = r.exitDay ? `${r.exitDay}일차` : "-";
    lines.push(`${icon} ${r.name} (비중 ${r.weight}%): ${entryStr}→${exitStr} [${r.exitReason} ${dayStr}] ${r.actualReturn > 0 ? "+" : ""}${r.actualReturn}%`);
  }

  if (bestPick) lines.push(`최고: ${bestPick.name} (${bestPick.returnPercent > 0 ? "+" : ""}${bestPick.returnPercent}%)`);
  if (worstPick && worstPick.name !== bestPick?.name) {
    lines.push(`최악: ${worstPick.name} (${worstPick.returnPercent > 0 ? "+" : ""}${worstPick.returnPercent}%)`);
  }

  // 자동매매 전략 피드백
  if (tpCount > slCount && portfolioReturn > 0) {
    lines.push("→ 익절 전략 유효. TP/SL 비율 양호. 현재 매매 기준 유지.");
  } else if (slCount > tpCount) {
    lines.push("→ 손절 빈도 높음. 손절 기준 완화 또는 진입 시그널 강화 필요.");
  } else if (holdCount > tpCount + slCount) {
    lines.push("→ 기간종료 비율 높음. 보유기간 연장 또는 목표수익률 하향 검토.");
  } else if (portfolioReturn > 0 && hitRate >= 60) {
    lines.push("→ 포트폴리오 전략 유효. 현재 종목 선정 기준 유지.");
  } else if (portfolioReturn > 0) {
    lines.push("→ 수익은 발생했으나 적중률 개선 필요. 저신뢰 종목 필터링 강화.");
  } else {
    lines.push("→ 포트폴리오 성과 부진. 매수 시그널 기준 상향 및 시장 구조 변화 재분석 필요.");
  }

  return lines.join("\n");
}
