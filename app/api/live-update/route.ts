import { NextResponse } from "next/server";
import { fetchAllLivePrices, ASSET_SYMBOLS, type LivePrice } from "@/lib/realtime/priceService";
import { supabase } from "@/lib/supabase";

/**
 * Live Update API
 *
 * Fetches real-time prices for ALL tracked assets and Korean ETFs
 * from Yahoo Finance and returns the data.
 * Saves snapshots to Supabase every 5th call (to avoid overwhelming DB).
 */

let callCount = 0;

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

  // Save snapshots to Supabase every 5th call (~50 seconds)
  callCount++;
  if (prices.length > 0 && callCount % 5 === 0) {
    try {
      // Only save a subset to avoid DB bloat (main assets + recommended ETFs)
      const mainAssets = prices.filter(
        (p) => !p.assetId.startsWith("etf-") || isRecommendedETF(p.assetId)
      );
      const snapshots = mainAssets.map((p) => ({
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

  const totalAssets = Object.keys(ASSET_SYMBOLS).length;

  const response = {
    timestamp: now.toISOString(),
    nextUpdateIn: 10,
    assetsUpdated: prices.length,
    totalAssets,
    prices,
    status,
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
    },
  });
}

// Check if an ETF is in the recommended list
function isRecommendedETF(assetId: string): boolean {
  const recommendedTickers = new Set([
    "069500", "091160", "305540", "132030", "360750",
    "133690", "244580", "451600", "396500", "139220",
    "102110", "226490", "252670", "305080",
  ]);
  const ticker = assetId.replace("etf-", "");
  return recommendedTickers.has(ticker);
}
