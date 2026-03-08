import { NextRequest, NextResponse } from "next/server";

interface YahooChartResult {
  meta: {
    currency: string;
    symbol: string;
    regularMarketPrice: number;
    previousClose: number;
    shortName?: string;
    longName?: string;
  };
  indicators: {
    quote: Array<{
      volume: number[];
      high: number[];
      low: number[];
    }>;
  };
}

interface YahooChartResponse {
  chart: {
    result: YahooChartResult[] | null;
    error: { code: string; description: string } | null;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json(
      { error: "Missing required query parameter: ticker" },
      { status: 400 }
    );
  }

  // Sanitize ticker — allow only digits and letters
  if (!/^[A-Za-z0-9]+$/.test(ticker)) {
    return NextResponse.json(
      { error: "Invalid ticker format" },
      { status: 400 }
    );
  }

  const symbol = `${ticker}.KS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance returned status ${res.status}` },
        { status: res.status }
      );
    }

    const data: YahooChartResponse = await res.json();

    if (data.chart.error) {
      return NextResponse.json(
        { error: data.chart.error.description },
        { status: 400 }
      );
    }

    const result = data.chart.result?.[0];

    if (!result) {
      return NextResponse.json(
        { error: `No data found for ticker: ${ticker}` },
        { status: 404 }
      );
    }

    const { meta, indicators } = result;
    const quote = indicators.quote[0];

    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    // Get the latest values from the quote arrays
    const volume = quote.volume?.[quote.volume.length - 1] ?? null;
    const dayHigh = quote.high
      ? Math.max(...quote.high.filter((v) => v != null))
      : null;
    const dayLow = quote.low
      ? Math.min(...quote.low.filter((v) => v != null))
      : null;

    const payload = {
      symbol,
      name: meta.longName ?? meta.shortName ?? symbol,
      currentPrice,
      previousClose,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume,
      marketCap: null as number | null, // v8 chart endpoint does not include marketCap
      dayHigh,
      dayLow,
      currency: meta.currency,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Failed to fetch stock price: ${message}` },
      { status: 500 }
    );
  }
}
