import { NextResponse } from "next/server";
import { getActiveAutoTrades, updateAutoTrade } from "@/lib/ai/dataService";
import { fetchAllLivePrices } from "@/lib/realtime/priceService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron 전용: 자동매매 상태 체크
 * 매일 KST 14:15 실행 (predict 완료 후)
 *
 * pending → 현재가 ≤ 진입가이면 filled (매수 체결)
 * filled  → 현재가 ≥ 익절가이면 tp_hit, 현재가 ≤ 손절가이면 sl_hit
 * filled  → 만료일 초과 시 expired (기간종료, 현재가로 청산)
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
    const trades = await getActiveAutoTrades();
    if (trades.length === 0) {
      return NextResponse.json({ success: true, message: "활성 거래 없음", checked: 0 });
    }

    // 현재 시세 조회
    const livePrices = await fetchAllLivePrices().catch(() => []);
    const priceMap = new Map<string, number>();
    for (const lp of livePrices) {
      if (lp.price > 0) priceMap.set(lp.assetId, lp.price);
    }

    const now = new Date();
    let filledCount = 0;
    let tpCount = 0;
    let slCount = 0;
    let expiredCount = 0;
    let cancelledCount = 0;

    for (const trade of trades) {
      const currentPrice = priceMap.get(trade.asset_id);
      if (!currentPrice) continue;

      const createdAt = new Date(trade.created_at!);
      const expiresAt = new Date(trade.expires_at);
      const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / 86400000);

      if (trade.status === "pending") {
        // 만료 체크
        if (now > expiresAt) {
          await updateAutoTrade(trade.id!, {
            status: "cancelled",
            exit_reason: "미체결",
            exit_date: now.toISOString(),
          });
          cancelledCount++;
          continue;
        }

        // 매수 체결 체크: 현재가가 진입가 이하이면 체결
        if (currentPrice <= trade.entry_price) {
          await updateAutoTrade(trade.id!, {
            status: "filled",
            fill_price: trade.entry_price,
            fill_date: now.toISOString(),
          });
          filledCount++;

          // 같은 날 TP/SL 체크
          if (currentPrice >= trade.tp_target) {
            const actualReturn = Math.round(Math.abs(trade.predicted_return) * 100) / 100;
            await updateAutoTrade(trade.id!, {
              status: "tp_hit",
              exit_price: trade.tp_target,
              exit_date: now.toISOString(),
              exit_reason: "익절",
              actual_return: actualReturn,
              exit_day: daysSinceCreation,
            });
            tpCount++;
          } else if (currentPrice <= trade.sl_target) {
            const actualReturn = -Math.round(((trade.entry_price - trade.sl_target) / trade.entry_price) * 100 * 100) / 100;
            await updateAutoTrade(trade.id!, {
              status: "sl_hit",
              exit_price: trade.sl_target,
              exit_date: now.toISOString(),
              exit_reason: "손절",
              actual_return: actualReturn,
              exit_day: daysSinceCreation,
            });
            slCount++;
          }
        }
      } else if (trade.status === "filled") {
        const fillDate = trade.fill_date ? new Date(trade.fill_date) : createdAt;
        const daysSinceFill = Math.floor((now.getTime() - fillDate.getTime()) / 86400000);

        // 손절 우선 체크 (보수적)
        if (currentPrice <= trade.sl_target) {
          const actualReturn = -Math.round(((trade.entry_price - trade.sl_target) / trade.entry_price) * 100 * 100) / 100;
          await updateAutoTrade(trade.id!, {
            status: "sl_hit",
            exit_price: trade.sl_target,
            exit_date: now.toISOString(),
            exit_reason: "손절",
            actual_return: actualReturn,
            exit_day: daysSinceFill,
          });
          slCount++;
        } else if (currentPrice >= trade.tp_target) {
          const actualReturn = Math.round(Math.abs(trade.predicted_return) * 100) / 100;
          await updateAutoTrade(trade.id!, {
            status: "tp_hit",
            exit_price: trade.tp_target,
            exit_date: now.toISOString(),
            exit_reason: "익절",
            actual_return: actualReturn,
            exit_day: daysSinceFill,
          });
          tpCount++;
        } else if (now > expiresAt) {
          // 기간종료: 현재가로 청산
          const actualReturn = Math.round(((currentPrice - trade.entry_price) / trade.entry_price) * 100 * 100) / 100;
          await updateAutoTrade(trade.id!, {
            status: "expired",
            exit_price: currentPrice,
            exit_date: now.toISOString(),
            exit_reason: "기간종료",
            actual_return: actualReturn,
            exit_day: daysSinceFill,
          });
          expiredCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: trades.length,
      filled: filledCount,
      tpHit: tpCount,
      slHit: slCount,
      expired: expiredCount,
      cancelled: cancelledCount,
    });
  } catch (err) {
    console.error("자동매매 체크 오류:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
