import { NextResponse } from "next/server";
import { getLatestAutoTrades } from "@/lib/ai/dataService";

export const dynamic = "force-dynamic";

/**
 * GET: 최신 사이클의 자동매매 현황 조회
 * 프론트엔드에서 포트폴리오 자동매매 상태를 표시하는 데 사용
 */
export async function GET() {
  try {
    const trades = await getLatestAutoTrades();
    return NextResponse.json({ success: true, trades });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
