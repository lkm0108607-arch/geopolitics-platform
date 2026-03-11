import { NextResponse } from "next/server";
import { fetchAllLivePrices, type LivePrice } from "@/lib/realtime/priceService";
import { supabase } from "@/lib/supabase";

/**
 * Live Update API
 *
 * Fetches real-time prices for ALL tracked assets and Korean sector ETFs
 * from Yahoo Finance, saves snapshots to Supabase, and returns the data.
 */

export async function GET() {
  const now = new Date();
  let prices: LivePrice[] = [];
  let status: "ok" | "degraded" | "error" = "ok";

  try {
    prices = await fetchAllLivePrices();

    if (prices.length === 0) {
      status = "degraded";
    }
  } catch (err) {
    console.error("Failed to fetch live prices:", err);
    status = "error";
  }

  // Save snapshots to Supabase (best-effort, don't fail the request)
  if (prices.length > 0) {
    try {
      const snapshots = prices.map((p) => ({
        asset_id: p.assetId,
        price: p.price,
        previous_close: p.previousClose,
        change_percent: p.changePercent,
        fetched_at: p.updatedAt,
      }));

      const { error: dbError } = await supabase
        .from("market_snapshots")
        .insert(snapshots);

      if (dbError) {
        console.error("Supabase insert error:", dbError.message);
      }
    } catch (err) {
      console.error("Failed to save snapshots to Supabase:", err);
    }
  }

  const response = {
    timestamp: now.toISOString(),
    nextUpdateIn: 60,
    assetsUpdated: prices.length,
    totalAssets: 21, // Total symbols tracked
    prices,
    expertPool: {
      total: 100000,
      activeParticipants: 10024,
      avgAccuracy: 65,
      eliteAccuracy: 91,
      lastPoolUpdate: now.toISOString(),
    },
    status,
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
