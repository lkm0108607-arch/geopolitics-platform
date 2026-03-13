import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 예측 체인 복구 크론
 * 매일 KST 14:20 실행 (predict 시작 15분 후)
 *
 * 오늘의 사이클이 완료되지 않았으면 (예측 수 < 기대치),
 * 마지막 처리된 offset을 계산하여 체인을 이어서 실행한다.
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
    const todayCycleId = `ai-cycle-${new Date().toISOString().slice(0, 10)}`;

    // 오늘 사이클의 예측 수 확인
    const { count, error: countErr } = await supabase
      .from("ai_predictions")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", todayCycleId);

    if (countErr) {
      return NextResponse.json({ success: false, error: countErr.message }, { status: 500 });
    }

    const predictionCount = count ?? 0;

    // 최소 기대 예측 수 (전체 자산의 50% 이상이면 정상 완료로 간주)
    // 일부 자산은 데이터 부족으로 건너뛸 수 있으므로 50% 기준 사용
    const MIN_EXPECTED = 50;

    if (predictionCount >= MIN_EXPECTED) {
      // 오늘 사이클의 auto_trades 존재 여부 확인 (final 배치 완료 여부)
      const { count: tradeCount } = await supabase
        .from("auto_trades")
        .select("*", { count: "exact", head: true })
        .eq("cycle_id", todayCycleId);

      if ((tradeCount ?? 0) > 0) {
        return NextResponse.json({
          success: true,
          message: "오늘 예측 정상 완료됨",
          cycleId: todayCycleId,
          predictions: predictionCount,
          autoTrades: tradeCount,
        });
      }

      // 예측은 있는데 auto_trades가 없으면 final 배치만 재실행
      const host = request.headers.get("host") ?? "localhost:3000";
      const proto = request.headers.get("x-forwarded-proto") ?? "http";
      const baseUrl = `${proto}://${host}`;
      const secretParam = cronSecret ? `&secret=${cronSecret}` : "";

      fetch(`${baseUrl}/api/ai/predict?batch=final&cycleId=${todayCycleId}${secretParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "final 배치 재실행 (자동매매 기록 누락)",
        cycleId: todayCycleId,
        predictions: predictionCount,
      });
    }

    // 예측이 부족하면 → 이미 처리된 자산 목록을 확인하고 이어서 실행
    const { data: existingPredictions } = await supabase
      .from("ai_predictions")
      .select("asset_id")
      .eq("cycle_id", todayCycleId);

    const completedAssets = new Set(
      (existingPredictions ?? []).map((p: { asset_id: string }) => p.asset_id),
    );

    // ALL_ASSET_IDS 순서대로 마지막 완료된 자산의 offset 계산
    // (동적으로 import 불가하므로, 예측 수를 offset으로 사용)
    const resumeOffset = completedAssets.size;

    const host = request.headers.get("host") ?? "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const baseUrl = `${proto}://${host}`;
    const secretParam = cronSecret ? `&secret=${cronSecret}` : "";

    if (predictionCount === 0) {
      // 아예 시작 안 됨 → collect부터
      fetch(`${baseUrl}/api/ai/predict?batch=collect&cycleId=${todayCycleId}${secretParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "예측 전체 재시작 (collect부터)",
        cycleId: todayCycleId,
      });
    }

    // 중간에 끊긴 경우 → predict offset부터 재개
    fetch(`${baseUrl}/api/ai/predict?batch=predict&offset=${resumeOffset}&cycleId=${todayCycleId}${secretParam}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "예측 체인 복구 시작",
      cycleId: todayCycleId,
      existingPredictions: predictionCount,
      resumeOffset,
    });
  } catch (err) {
    console.error("예측 복구 크론 오류:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
