import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron 전용: 예측 배치 한 단계 실행
 *
 * 호출될 때마다 오늘 사이클의 상태를 확인하고:
 * 1. 예측 0개 → collect 실행
 * 2. 예측 < 전체 → 다음 offset의 predict 실행
 * 3. 예측 완료 + auto_trades 없음 → final 실행
 * 4. 모두 완료 → 아무것도 안 함
 *
 * vercel.json에서 매분 또는 5분 간격으로 여러 번 호출하면
 * 자동으로 전체 예측이 완료됨.
 */
export async function GET(request: Request) {
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
    const host = request.headers.get("host") ?? "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const baseUrl = `${proto}://${host}`;
    const todayCycleId = `ai-cycle-${new Date().toISOString().slice(0, 10)}`;

    // 1. 오늘 사이클 예측 수 확인
    const { count: predCount } = await supabase
      .from("ai_predictions")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", todayCycleId);

    const predictionCount = predCount ?? 0;

    // 2. 예측이 0개 → collect부터 시작
    if (predictionCount === 0) {
      const res = await fetch(`${baseUrl}/api/ai/predict?batch=collect&cycleId=${todayCycleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      return NextResponse.json({
        success: true,
        action: "collect",
        cycleId: todayCycleId,
        result: data,
      });
    }

    // 3. auto_trades 확인
    const { count: tradeCount } = await supabase
      .from("auto_trades")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", todayCycleId);

    // 4. 이미 완료됨
    if ((tradeCount ?? 0) > 0) {
      return NextResponse.json({
        success: true,
        action: "none",
        message: "오늘 예측+자동매매 완료됨",
        cycleId: todayCycleId,
        predictions: predictionCount,
        autoTrades: tradeCount,
      });
    }

    // 5. 예측 수가 충분하면 final 실행
    const MIN_EXPECTED = 50;
    if (predictionCount >= MIN_EXPECTED) {
      const res = await fetch(`${baseUrl}/api/ai/predict?batch=final&cycleId=${todayCycleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      return NextResponse.json({
        success: true,
        action: "final",
        cycleId: todayCycleId,
        predictions: predictionCount,
        result: data,
      });
    }

    // 6. 예측이 부족하면 → 다음 predict 배치 실행
    // offset = 이미 처리된 예측 수 (대략적 추정)
    const { data: existing } = await supabase
      .from("ai_predictions")
      .select("asset_id")
      .eq("cycle_id", todayCycleId);
    const resumeOffset = (existing ?? []).length;

    const res = await fetch(
      `${baseUrl}/api/ai/predict?batch=predict&offset=${resumeOffset}&cycleId=${todayCycleId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );
    const data = await res.json();

    return NextResponse.json({
      success: true,
      action: "predict",
      cycleId: todayCycleId,
      currentPredictions: predictionCount,
      resumeOffset,
      result: data,
    });
  } catch (err) {
    console.error("Cron predict 오류:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
