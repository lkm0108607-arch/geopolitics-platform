/**
 * AI 추천 포트폴리오 빌더
 *
 * 예측 결과에서 매수 시그널 상위 5종목을 선정하고,
 * 자동매매에 필요한 진입가/익절가/손절가/보유기간을 계산한다.
 *
 * predict, weekly-report, investment page에서 공통으로 사용.
 */

import type { AIPrediction } from "./ensemble";
import { getAssetById } from "@/data/assets";

// ── 투자 시그널 ──────────────────────────────────────────────────────────────

export type InvestmentSignal = "강력매수" | "매수" | "관망" | "매도" | "강력매도";

export function computeSignal(pred: AIPrediction): InvestmentSignal {
  const { direction, probability, confidence } = pred;

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

export function computeTimingScore(pred: AIPrediction): number {
  let score = pred.probability;
  if (pred.confidence >= 35) score += 5;
  else if (pred.confidence >= 25) score += 0;
  else score -= 5;

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

// ── 포트폴리오 종목 ─────────────────────────────────────────────────────────

export interface PortfolioPick {
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
export function buildPortfolio(predictions: AIPrediction[]): PortfolioPick[] {
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
