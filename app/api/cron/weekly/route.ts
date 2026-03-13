import { NextResponse } from "next/server";
import { POST as runWeeklyReport } from "@/app/api/ai/weekly-report/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron 전용: 주간 리포트 + 강화학습 (월요일만)
 * 매일 KST 14:10 실행, 월요일이 아니면 스킵
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

  // 월요일 체크 (KST 기준)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const kstDay = kstNow.getUTCDay();

  if (kstDay !== 1) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "월요일에만 실행",
      kstDay,
    });
  }

  try {
    // POST 핸들러에 빈 Request를 전달 (body 파싱은 catch로 {} 처리됨)
    const fakeRequest = new Request("http://localhost/api/ai/weekly-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return await runWeeklyReport(fakeRequest);
  } catch (err) {
    console.error("Cron weekly-report 오류:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
