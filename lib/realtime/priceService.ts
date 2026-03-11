/**
 * Real-time Price Service
 *
 * Fetches live prices from Yahoo Finance for all tracked assets
 * and major Korean sector ETFs.
 */

// Yahoo Finance symbols for all tracked assets + major Korean sector ETFs
export const ASSET_SYMBOLS: Record<string, string> = {
  // Main assets
  "kospi": "^KS11",
  "sp500": "^GSPC",
  "nasdaq": "^IXIC",
  "kosdaq": "^KQ11",
  "dxy": "DX-Y.NYB",
  "gold": "GC=F",
  "wti-oil": "CL=F",
  "copper": "HG=F",
  "usd-krw": "KRW=X",
  "usd-jpy": "JPY=X",
  "us-10y-yield": "^TNX",
  // Korean ETFs (assetId -> Yahoo symbol)
  "kodex-semiconductor": "091160.KS",
  "tiger-secondary-battery": "305540.KS",
  "kodex-bio": "244580.KS",
  "kodex-defense": "451600.KS",
  "tiger-ai-semi": "396500.KS",
  "kodex-gold": "132030.KS",
  "tiger-us-snp500": "360750.KS",
  "tiger-us-nasdaq": "133690.KS",
  "kodex-200": "069500.KS",
  "tiger-shipbuilding": "139220.KS",
  // ETF (etf-TICKER format)
  "etf-069500": "069500.KS",
  "etf-132030": "132030.KS",
  "etf-305080": "305080.KS",
  "etf-091160": "091160.KS",
  "etf-305540": "305540.KS",
  "etf-244580": "244580.KS",
  "etf-451600": "451600.KS",
  "etf-396500": "396500.KS",
  "etf-360750": "360750.KS",
  "etf-133690": "133690.KS",
  "etf-139220": "139220.KS",
  "etf-364690": "364690.KS",
  "etf-455850": "455850.KS",
  "etf-102110": "102110.KS",
  "etf-226490": "226490.KS",
  "etf-252670": "252670.KS",
  "etf-114800": "114800.KS",
  "etf-117690": "117690.KS",
  "etf-458730": "458730.KS",
  "etf-304940": "304940.KS",
  "etf-371160": "371160.KS",
  "etf-381180": "381180.KS",
  "etf-143850": "143850.KS",
  "etf-261240": "261240.KS",
  "etf-309230": "309230.KS",
  "etf-411060": "411060.KS",
  "etf-379800": "379800.KS",
  "etf-453810": "453810.KS",
  "etf-395170": "395170.KS",
  "etf-449770": "449770.KS",
  "etf-472150": "472150.KS",
};

// Reverse lookup: symbol -> assetId
const SYMBOL_TO_ASSET: Record<string, string> = Object.fromEntries(
  Object.entries(ASSET_SYMBOLS).map(([assetId, symbol]) => [symbol, assetId])
);

export interface LivePrice {
  assetId: string;
  price: number;
  previousClose: number;
  changePercent: number;
  updatedAt: string;
}

const YAHOO_SPARK_URL = "https://query1.finance.yahoo.com/v8/finance/spark";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

/**
 * Fetches live prices for ALL tracked assets from Yahoo Finance spark API.
 * Splits into batches to avoid URL length limits.
 */
export async function fetchAllLivePrices(): Promise<LivePrice[]> {
  const allSymbols = Object.values(ASSET_SYMBOLS);

  // Yahoo Finance spark API has URL length limits, so batch into groups of 10
  const batchSize = 10;
  const batches: string[][] = [];
  for (let i = 0; i < allSymbols.length; i += batchSize) {
    batches.push(allSymbols.slice(i, i + batchSize));
  }

  const results: LivePrice[] = [];

  const batchResults = await Promise.allSettled(
    batches.map((batch) => fetchBatch(batch))
  );

  for (const result of batchResults) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    }
  }

  return results;
}

/**
 * Fetches a batch of symbols from Yahoo Finance spark API.
 */
async function fetchBatch(symbols: string[]): Promise<LivePrice[]> {
  const symbolsParam = symbols.join(",");
  const url = `${YAHOO_SPARK_URL}?symbols=${encodeURIComponent(symbolsParam)}&range=1d&interval=1m`;

  const res = await fetch(url, {
    headers: HEADERS,
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`Yahoo Finance spark API error: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  const prices: LivePrice[] = [];
  const now = new Date().toISOString();

  for (const symbol of symbols) {
    try {
      const sparkData = data[symbol];
      if (!sparkData) continue;

      const closeArray: number[] = sparkData.close ?? [];
      const previousClose: number = sparkData.previousClose ?? 0;

      if (closeArray.length === 0 || previousClose === 0) continue;

      // Use the last close value as the current price
      const lastClose = closeArray[closeArray.length - 1];
      if (lastClose == null || lastClose === 0) continue;

      const changePercent = ((lastClose - previousClose) / previousClose) * 100;

      const assetId = SYMBOL_TO_ASSET[symbol];
      if (!assetId) continue;

      prices.push({
        assetId,
        price: lastClose,
        previousClose,
        changePercent: parseFloat(changePercent.toFixed(2)),
        updatedAt: now,
      });
    } catch {
      // Skip individual symbol errors
      continue;
    }
  }

  return prices;
}

/**
 * Fetches live price for a single asset by its assetId.
 */
export async function fetchLivePrice(assetId: string): Promise<LivePrice | null> {
  const symbol = ASSET_SYMBOLS[assetId];
  if (!symbol) return null;

  const url = `${YAHOO_SPARK_URL}?symbols=${encodeURIComponent(symbol)}&range=1d&interval=1m`;

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    const sparkData = data[symbol];
    if (!sparkData) return null;

    const closeArray: number[] = sparkData.close ?? [];
    const previousClose: number = sparkData.previousClose ?? 0;

    if (closeArray.length === 0 || previousClose === 0) return null;

    const lastClose = closeArray[closeArray.length - 1];
    if (lastClose == null || lastClose === 0) return null;

    const changePercent = ((lastClose - previousClose) / previousClose) * 100;

    return {
      assetId,
      price: lastClose,
      previousClose,
      changePercent: parseFloat(changePercent.toFixed(2)),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
