/**
 * 데이터 수집 API 엔드포인트
 *
 * POST: 전체 데이터 수집 파이프라인을 실행하고 결과를 반환한다.
 *        수집된 데이터는 learning_logs에 저장된다.
 * GET:  가장 최근 수집된 데이터를 조회한다.
 */

import { NextResponse } from "next/server";
import { collectAllData } from "@/lib/ai/dataCollector";
import { analyzeAllAssets } from "@/lib/ai/fundamentalAnalysis";
import { supabase } from "@/lib/supabase";

// 수집 대상 자산 목록
const ASSET_IDS = [
  "gold",
  "wti-oil",
  "kospi",
  "kosdaq",
  "sp500",
  "nasdaq",
  "usd-krw",
  "us-10y",
  "dxy",
];

/**
 * 수집 사이클 ID 생성
 */
function generateCollectCycleId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  return `collect-${dateStr}`;
}

// ─── POST: 데이터 수집 실행 ──────────────────────────────────────────────────

export async function POST() {
  try {
    const cycleId = generateCollectCycleId();

    // 1. 종합 데이터 수집
    const collectedData = await collectAllData();

    // 2. 자산별 펀더멘털 분석
    const fundamentalAnalysis = analyzeAllAssets(ASSET_IDS, collectedData);

    // 3. learning_logs에 수집 결과 저장 (JSON blob)
    try {
      const logEntry = {
        cycle_id: cycleId,
        asset_id: "__data_collection__",
        lesson: JSON.stringify({
          type: "data_collection",
          collectedData,
          fundamentalAnalysis,
        }),
        missed_factors: [],
        model_performance: {},
        weight_adjustment: {},
      };

      await supabase.from("learning_logs").insert(logEntry);
    } catch (saveErr) {
      console.error("수집 데이터 저장 실패 (계속 진행):", saveErr);
    }

    // 4. 응답 구성
    const summary = {
      vix: collectedData.vix,
      fearGreedIndex: collectedData.fearGreedIndex,
      yieldCurveSpread: collectedData.yieldCurveSpread,
      safeHavenDemand: collectedData.safeHavenDemand,
      dxyTrend: collectedData.dxyTrend,
      globalMarket: collectedData.globalMarketSummary,
      newsSentiment: collectedData.newsSentiment?.overall,
      newsHeadlineCount: collectedData.newsSentiment?.headlines.length ?? 0,
    };

    const fundamentalSummary: Record<string, { bias: string; signalCount: number }> = {};
    for (const [assetId, analysis] of Object.entries(fundamentalAnalysis)) {
      fundamentalSummary[assetId] = {
        bias: analysis.overallBias,
        signalCount: analysis.signals.length,
      };
    }

    return NextResponse.json({
      success: true,
      cycleId,
      collectedAt: collectedData.timestamp,
      summary,
      fundamentalSummary,
      collectedData,
      fundamentalAnalysis,
    });
  } catch (err) {
    console.error("데이터 수집 오류:", err);
    return NextResponse.json(
      {
        success: false,
        error: "데이터 수집 중 오류가 발생했습니다.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

// ─── GET: 최근 수집 데이터 조회 ──────────────────────────────────────────────

export async function GET() {
  try {
    // learning_logs에서 가장 최근 data_collection 타입 로그 조회
    const { data, error } = await supabase
      .from("learning_logs")
      .select("*")
      .eq("asset_id", "__data_collection__")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({
        success: true,
        message: "저장된 수집 데이터가 없습니다. POST /api/ai/collect를 먼저 실행하세요.",
        data: null,
      });
    }

    let parsed;
    try {
      parsed = typeof data.lesson === "string" ? JSON.parse(data.lesson) : data.lesson;
    } catch {
      parsed = data.lesson;
    }

    return NextResponse.json({
      success: true,
      cycleId: data.cycle_id,
      collectedAt: data.created_at,
      data: parsed,
    });
  } catch (err) {
    console.error("수집 데이터 조회 오류:", err);
    return NextResponse.json(
      {
        success: false,
        error: "수집 데이터 조회 중 오류가 발생했습니다.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
