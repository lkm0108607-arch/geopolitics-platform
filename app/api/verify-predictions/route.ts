import { NextResponse } from "next/server";
import { getLatestPredictions } from "@/lib/ai/dataService";

/**
 * AI 예측 검증 API
 *
 * 최신 예측을 조회하여 검증 상태를 반환한다.
 * Supabase 기반 AI 예측 시스템과 연동.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Cron 인증 (Vercel Cron 또는 수동 호출 시)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (
    process.env.NODE_ENV === "production" &&
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const predictions = await getLatestPredictions();
    const timestamp = new Date().toISOString();

    const activePredictions = predictions.map((pred) => ({
      predictionId: pred.id,
      assetId: pred.asset_id,
      direction: pred.direction,
      probability: pred.probability,
      confidence: pred.confidence,
    }));

    return NextResponse.json({
      timestamp,
      cycleId: predictions[0]?.cycle_id ?? null,
      predictionsChecked: activePredictions.length,
      predictions: activePredictions,
      message: `${activePredictions.length}개 예측 확인 완료.`,
      nextCheck: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.error("예측 검증 오류:", err);
    return NextResponse.json(
      {
        error: "예측 검증 중 오류가 발생했습니다.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
