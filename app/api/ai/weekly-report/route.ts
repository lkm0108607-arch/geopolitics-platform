import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  getModelWeights,
  saveModelWeights,
  saveLearningLog,
  getAutoTradesForWeek,
  type AutoTradeRow,
} from "@/lib/ai/dataService";
import { batchLearn } from "@/lib/ai/learner";
import type { PredictionOutcome } from "@/lib/ai/learner";
import type { Direction } from "@/lib/ai/models";
import type { AIPrediction, SubModelVotes } from "@/lib/ai/ensemble";
import { buildPortfolio, type PortfolioPick } from "@/lib/ai/portfolioBuilder";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

// ─── 자동매매 결과 타입 ──────────────────────────────────────────────────────

type ExitReason = "익절" | "손절" | "기간종료" | "미체결";

export interface PortfolioResult {
  assetId: string;
  name: string;
  signal: string;
  weight: number;
  entryPrice: number | null;
  exitPrice: number | null;
  tpTarget: number | null;
  slTarget: number | null;
  exitReason: ExitReason;
  exitDay: number | null;
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
  tpCount: number;
  slCount: number;
  holdCount: number;
  bestPick: { name: string; returnPercent: number } | null;
  worstPick: { name: string; returnPercent: number } | null;
  weeklyLesson: string;
}

// ─── auto_trades DB에서 리포트 생성 (우선) ───────────────────────────────────

function buildReportFromAutoTrades(
  trades: AutoTradeRow[],
  weekStart: string,
  weekEnd: string,
): WeeklyReportData | null {
  if (trades.length === 0) return null;

  // 완료되지 않은 거래도 포함 (pending/filled는 진행중으로 표시)
  let tpCount = 0;
  let slCount = 0;
  let holdCount = 0;

  const portfolioResults: PortfolioResult[] = trades.map((t) => {
    let exitReason: ExitReason = "기간종료";
    let actualReturn = Number(t.actual_return ?? 0);

    if (t.status === "tp_hit") {
      exitReason = "익절";
      tpCount++;
    } else if (t.status === "sl_hit") {
      exitReason = "손절";
      slCount++;
    } else if (t.status === "expired") {
      exitReason = "기간종료";
      holdCount++;
    } else if (t.status === "cancelled") {
      exitReason = "미체결";
      holdCount++;
    } else if (t.status === "pending") {
      exitReason = "미체결";
      actualReturn = 0;
      holdCount++;
    } else if (t.status === "filled") {
      // 아직 진행중 — 기간종료로 표시하되 수익률은 0
      exitReason = "기간종료";
      actualReturn = 0;
      holdCount++;
    }

    const pnl = Math.round((Number(t.weight) * actualReturn) / 100 * 100) / 100;

    return {
      assetId: t.asset_id,
      name: t.name,
      signal: t.signal,
      weight: Number(t.weight),
      entryPrice: Number(t.entry_price),
      exitPrice: t.exit_price ? Number(t.exit_price) : null,
      tpTarget: Number(t.tp_target),
      slTarget: Number(t.sl_target),
      exitReason,
      exitDay: t.exit_day ?? null,
      predictedReturn: Number(t.predicted_return),
      actualReturn,
      wasCorrect: actualReturn > 0,
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

// ─── 시뮬레이션 fallback (auto_trades 테이블 없는 과거 주차용) ──────────────

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

  const targetEntry = snapshots[0].close;
  if (targetEntry <= 0) {
    return { entryPrice: 0, exitPrice: 0, exitReason: "미체결", exitDay: 0, actualReturn: 0 };
  }

  const tpPrice = targetEntry * (1 + Math.abs(pick.predictedReturn) / 100);
  const slPrice = targetEntry * (1 - pick.stopLossPercent / 100);

  let entryDay = -1;
  for (let i = 1; i < snapshots.length && i <= pick.holdingDays; i++) {
    if (snapshots[i].low <= targetEntry) {
      entryDay = i;
      break;
    }
  }

  if (entryDay < 0) {
    return { entryPrice: targetEntry, exitPrice: 0, exitReason: "미체결", exitDay: 0, actualReturn: 0 };
  }

  for (let i = entryDay + 1; i < snapshots.length && i <= pick.holdingDays; i++) {
    const day = snapshots[i];
    if (day.low <= slPrice) {
      const ret = -pick.stopLossPercent;
      return { entryPrice: targetEntry, exitPrice: slPrice, exitReason: "손절", exitDay: i, actualReturn: Math.round(ret * 100) / 100 };
    }
    if (day.high >= tpPrice) {
      const ret = Math.abs(pick.predictedReturn);
      return { entryPrice: targetEntry, exitPrice: tpPrice, exitReason: "익절", exitDay: i, actualReturn: Math.round(ret * 100) / 100 };
    }
  }

  const lastIdx = Math.min(snapshots.length - 1, pick.holdingDays);
  const exitPrice = snapshots[lastIdx].close;
  const actualReturn = Math.round(((exitPrice - targetEntry) / targetEntry) * 100 * 100) / 100;

  return { entryPrice: targetEntry, exitPrice, exitReason: "기간종료", exitDay: lastIdx, actualReturn };
}

async function buildReportFromSimulation(
  rawPreds: Record<string, unknown>[],
  weekStart: string,
  weekEnd: string,
): Promise<WeeklyReportData | null> {
  const predictions: AIPrediction[] = rawPreds.map((p) => {
    const votes = p.sub_model_votes as Record<string, unknown> | null;
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

  const portfolio = buildPortfolio(predictions);
  if (portfolio.length === 0) return null;

  const assetIds = portfolio.map((p) => p.assetId);
  const snapshotsMap = await getWeekSnapshots(assetIds, weekStart, weekEnd);

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

// ─── 특정 주 리포트 생성 ────────────────────────────────────────────────────

async function buildWeeklyReport(weeksAgo: number): Promise<WeeklyReportData | null> {
  const { weekStart, weekEnd } = getWeekRange(weeksAgo);

  // 1. auto_trades 테이블에서 실제 자동매매 기록 조회 (우선)
  try {
    const autoTrades = await getAutoTradesForWeek(weekStart, weekEnd);
    if (autoTrades.length > 0) {
      return buildReportFromAutoTrades(autoTrades, weekStart, weekEnd);
    }
  } catch {
    // auto_trades 테이블이 없거나 에러 시 시뮬레이션 fallback
  }

  // 2. fallback: ai_predictions 기반 시뮬레이션 (auto_trades 없는 과거 주차)
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

    return buildReportFromSimulation(cyclePreds, weekStart, weekEnd);
  }

  const latestCycleId = preds[0].cycle_id;
  const cyclePreds = preds.filter((p: Record<string, string>) => p.cycle_id === latestCycleId);

  return buildReportFromSimulation(cyclePreds, weekStart, weekEnd);
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
