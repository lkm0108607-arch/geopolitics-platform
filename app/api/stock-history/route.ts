import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const range = searchParams.get("range") || "3mo"; // 1d,5d,1mo,3mo,6mo,1y,2y,5y
  const interval = searchParams.get("interval") || "1d"; // 1m,5m,15m,1h,1d,1wk,1mo

  if (!ticker || !/^[A-Za-z0-9]+$/.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
  }

  const symbol = `${ticker}.KS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      return NextResponse.json(
        { error: "No data found" },
        { status: 404 }
      );
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const volumes = quote.volume || [];

    // Build candle data array
    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (
        closes[i] != null &&
        opens[i] != null &&
        highs[i] != null &&
        lows[i] != null
      ) {
        candles.push({
          time: timestamps[i],
          open: Math.round(opens[i]),
          high: Math.round(highs[i]),
          low: Math.round(lows[i]),
          close: Math.round(closes[i]),
          volume: volumes[i] ?? 0,
        });
      }
    }

    return NextResponse.json(
      { symbol, candles },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch: ${message}` },
      { status: 500 }
    );
  }
}
