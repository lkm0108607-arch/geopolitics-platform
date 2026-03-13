import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron 전용: 예측 배치 시작 (collect 트리거)
 * 매일 KST 14:05 실행 (evaluate 완료 후)
 *
 * predict route를 HTTP로 호출하여 배치 체이닝을 시작한다.
 * 직접 import하면 같은 서버리스 함수 내에서 실행되어 10초 제한에 걸림.
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

    // batch=collect 호출 (데이터 수집 → predict → final 자동 체이닝)
    const res = await fetch(`${baseUrl}/api/ai/predict?batch=collect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
    });

    const data = await res.json();

    return NextResponse.json({
      success: true,
      message: "예측 배치 실행 시작됨",
      collectResult: data,
    });
  } catch (err) {
    console.error("Cron predict 오류:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
