/**
 * Real-time Price Service
 *
 * 한국 데이터: 네이버 금융 실시간 API (정확한 거래소/은행 가격)
 *   - ETF: polling.finance.naver.com (실시간)
 *   - KOSPI/KOSDAQ: polling.finance.naver.com (실시간)
 *   - 환율 (USD/KRW 등): api.stock.naver.com (하나은행 고시)
 *   - DXY: api.stock.naver.com (ICE 선물)
 *
 * 글로벌 데이터: Yahoo Finance (네이버 미지원)
 *   - S&P500, Nasdaq, Gold, WTI, Copper, US 10Y Yield
 */

import { koreanETFs } from "@/data/koreanETFs";

// ── Asset ID definitions ──────────────────────────────────────────────────────

// Assets fetched from Naver Finance
const NAVER_GLOBAL_ASSETS = {
  "kospi": { type: "index" as const, code: "KOSPI" },
  "kosdaq": { type: "index" as const, code: "KOSDAQ" },
  "usd-krw": { type: "exchange" as const, code: "FX_USDKRW" },
  "usd-jpy": { type: "exchange" as const, code: "FX_JPYKRW" },
  "dxy": { type: "exchangeList" as const, code: ".DXY" },
};

// Assets fetched from Yahoo Finance (Naver doesn't support these)
const YAHOO_SYMBOLS: Record<string, string> = {
  "sp500": "^GSPC",
  "nasdaq": "^IXIC",
  "gold": "GC=F",
  "wti-oil": "CL=F",
  "copper": "HG=F",
  "us-10y-yield": "^TNX",
};

// ── Build full ASSET_SYMBOLS for backward compatibility ───────────────────────

function buildAssetSymbols(): Record<string, string> {
  const symbols: Record<string, string> = {};

  // Naver global assets
  for (const [assetId, config] of Object.entries(NAVER_GLOBAL_ASSETS)) {
    symbols[assetId] = `naver:${config.code}`;
  }

  // Yahoo global assets
  for (const [assetId, symbol] of Object.entries(YAHOO_SYMBOLS)) {
    symbols[assetId] = symbol;
  }

  // All Korean ETFs
  for (const etf of koreanETFs) {
    symbols[`etf-${etf.ticker}`] = `naver:${etf.ticker}`;
  }

  return symbols;
}

export const ASSET_SYMBOLS: Record<string, string> = buildAssetSymbols();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LivePrice {
  assetId: string;
  price: number;
  previousClose: number;
  changePercent: number;
  updatedAt: string;
}

// ── Naver Finance: Korean ETF prices ──────────────────────────────────────────

const NAVER_STOCK_API = "https://polling.finance.naver.com/api/realtime/domestic/stock";
const NAVER_INDEX_API = "https://polling.finance.naver.com/api/realtime/domestic/index";
const NAVER_EXCHANGE_API = "https://api.stock.naver.com/marketindex/exchange";
const NAVER_EXCHANGE_LIST = "https://api.stock.naver.com/marketindex/exchange?page=1&pageSize=100";

function parseNaverDirection(code: string): "up" | "down" | "flat" {
  // code: "1"=상한, "2"=상승, "3"=보합, "4"=하한, "5"=하락
  if (code === "4" || code === "5") return "down";
  if (code === "1" || code === "2") return "up";
  return "flat";
}

async function fetchNaverETFPrice(ticker: string): Promise<LivePrice | null> {
  try {
    const res = await fetch(`${NAVER_STOCK_API}/${ticker}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await res.json();
    const d = data?.datas?.[0];
    if (!d?.closePriceRaw) return null;

    const price = parseInt(d.closePriceRaw, 10);
    const changeAbs = parseInt(d.compareToPreviousClosePriceRaw, 10) || 0;
    const dir = parseNaverDirection(d.compareToPreviousPrice?.code);
    const previousClose = dir === "down" ? price + changeAbs : price - changeAbs;
    const changePercent = parseFloat(d.fluctuationsRatio) || 0;
    const signedChange = dir === "down" ? -Math.abs(changePercent) : Math.abs(changePercent);

    return {
      assetId: `etf-${ticker}`,
      price,
      previousClose: previousClose > 0 ? previousClose : price,
      changePercent: parseFloat(signedChange.toFixed(2)),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchNaverIndex(assetId: string, indexCode: string): Promise<LivePrice | null> {
  try {
    const res = await fetch(`${NAVER_INDEX_API}/${indexCode}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await res.json();
    const d = data?.datas?.[0];
    if (!d?.closePrice) return null;

    const priceStr = d.closePrice.replace(/,/g, "");
    const price = parseFloat(priceStr);
    const changeAbsStr = (d.compareToPreviousClosePrice || "0").replace(/,/g, "");
    const changeAbs = parseFloat(changeAbsStr);
    const dir = parseNaverDirection(d.compareToPreviousPrice?.code);
    const previousClose = dir === "down" ? price + changeAbs : price - changeAbs;
    const changePercent = parseFloat(d.fluctuationsRatio) || 0;
    const signedChange = dir === "down" ? -Math.abs(changePercent) : Math.abs(changePercent);

    return {
      assetId,
      price,
      previousClose,
      changePercent: parseFloat(signedChange.toFixed(2)),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchNaverExchange(assetId: string, exchangeCode: string): Promise<LivePrice | null> {
  try {
    const res = await fetch(`${NAVER_EXCHANGE_API}/${exchangeCode}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await res.json();
    const info = data?.exchangeInfo;
    if (!info?.closePrice) return null;

    const price = parseFloat(info.closePrice.replace(/,/g, ""));
    const change = parseFloat((info.fluctuations || "0").replace(/,/g, ""));
    const previousClose = price - change;
    const changePercent = parseFloat(info.fluctuationsRatio) || 0;
    const dir = parseNaverDirection(info.fluctuationsType?.code);
    const signedChange = dir === "down" ? -Math.abs(changePercent) : Math.abs(changePercent);

    return {
      assetId,
      price,
      previousClose: previousClose > 0 ? previousClose : price,
      changePercent: parseFloat(signedChange.toFixed(2)),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchNaverDXY(): Promise<LivePrice | null> {
  try {
    const res = await fetch(NAVER_EXCHANGE_LIST, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await res.json();
    const dxyItem = data?.normalList?.find(
      (item: { reutersCode: string }) => item.reutersCode === ".DXY"
    );
    if (!dxyItem?.closePrice) return null;

    const price = parseFloat(dxyItem.closePrice.replace(/,/g, ""));
    const change = parseFloat((dxyItem.fluctuations || "0").replace(/,/g, ""));
    const previousClose = price - change;
    const changePercent = parseFloat(dxyItem.fluctuationsRatio) || 0;
    const dir = parseNaverDirection(dxyItem.fluctuationsType?.code);
    const signedChange = dir === "down" ? -Math.abs(changePercent) : Math.abs(changePercent);

    return {
      assetId: "dxy",
      price,
      previousClose: previousClose > 0 ? previousClose : price,
      changePercent: parseFloat(signedChange.toFixed(2)),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Fetches ALL Naver Finance data (Korean ETFs + Korean indices + exchange rates)
 */
async function fetchAllNaverPrices(): Promise<LivePrice[]> {
  const results: LivePrice[] = [];

  // 1. Korean ETFs (parallel batches of 15)
  const tickers = koreanETFs.map((e) => e.ticker);
  const batchSize = 15;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((ticker) => fetchNaverETFPrice(ticker))
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
  }

  // 2. Korean indices + exchange rates + DXY (all in parallel)
  const globalPromises = await Promise.allSettled([
    fetchNaverIndex("kospi", "KOSPI"),
    fetchNaverIndex("kosdaq", "KOSDAQ"),
    fetchNaverExchange("usd-krw", "FX_USDKRW"),
    fetchNaverExchange("usd-jpy", "FX_JPYKRW"),
    fetchNaverDXY(),
  ]);

  for (const r of globalPromises) {
    if (r.status === "fulfilled" && r.value) results.push(r.value);
  }

  return results;
}

// ── Yahoo Finance: Global assets ──────────────────────────────────────────────

const YAHOO_SPARK_URL = "https://query1.finance.yahoo.com/v8/finance/spark";
const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

async function fetchAllYahooPrices(): Promise<LivePrice[]> {
  const symbols = Object.values(YAHOO_SYMBOLS);
  const symbolToAsset: Record<string, string> = {};
  for (const [assetId, symbol] of Object.entries(YAHOO_SYMBOLS)) {
    symbolToAsset[symbol] = assetId;
  }

  try {
    const url = `${YAHOO_SPARK_URL}?symbols=${encodeURIComponent(symbols.join(","))}&range=1d&interval=1m`;
    const res = await fetch(url, { headers: YAHOO_HEADERS, cache: "no-store" });
    if (!res.ok) return [];

    const data = await res.json();
    const prices: LivePrice[] = [];
    const now = new Date().toISOString();

    for (const symbol of symbols) {
      try {
        const sparkData = data[symbol];
        if (!sparkData) continue;

        const closeArray: number[] = sparkData.close ?? [];
        const previousClose: number =
          sparkData.previousClose ?? sparkData.chartPreviousClose ?? 0;

        if (closeArray.length === 0) continue;
        const lastClose = closeArray[closeArray.length - 1];
        if (lastClose == null || lastClose === 0) continue;

        const prevForCalc = previousClose > 0 ? previousClose : lastClose;
        const changePercent =
          prevForCalc > 0 ? ((lastClose - prevForCalc) / prevForCalc) * 100 : 0;

        const assetId = symbolToAsset[symbol];
        if (!assetId) continue;

        prices.push({
          assetId,
          price: lastClose,
          previousClose: prevForCalc,
          changePercent: parseFloat(changePercent.toFixed(2)),
          updatedAt: now,
        });
      } catch {
        continue;
      }
    }
    return prices;
  } catch {
    return [];
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches live prices for ALL tracked assets.
 */
export async function fetchAllLivePrices(): Promise<LivePrice[]> {
  const [naverResult, yahooResult] = await Promise.allSettled([
    fetchAllNaverPrices(),
    fetchAllYahooPrices(),
  ]);

  const results: LivePrice[] = [];
  if (naverResult.status === "fulfilled") results.push(...naverResult.value);
  if (yahooResult.status === "fulfilled") results.push(...yahooResult.value);
  return results;
}

/**
 * Fetches live price for a single asset by its assetId.
 */
export async function fetchLivePrice(assetId: string): Promise<LivePrice | null> {
  // Korean ETF → Naver
  if (assetId.startsWith("etf-")) {
    return fetchNaverETFPrice(assetId.replace("etf-", ""));
  }

  // Naver global assets
  const naverConfig = NAVER_GLOBAL_ASSETS[assetId as keyof typeof NAVER_GLOBAL_ASSETS];
  if (naverConfig) {
    if (naverConfig.type === "index") return fetchNaverIndex(assetId, naverConfig.code);
    if (naverConfig.type === "exchange") return fetchNaverExchange(assetId, naverConfig.code);
    if (naverConfig.type === "exchangeList") return fetchNaverDXY();
  }

  // Yahoo global assets
  const yahooSymbol = YAHOO_SYMBOLS[assetId];
  if (yahooSymbol) {
    const prices = await fetchAllYahooPrices();
    return prices.find((p) => p.assetId === assetId) ?? null;
  }

  return null;
}

// ── Validation: price sanity check ────────────────────────────────────────────

export interface PriceValidation {
  assetId: string;
  name: string;
  price: number;
  source: string;
  issue: string;
}

/**
 * Validates fetched prices for obvious errors:
 * - Price is 0 or negative
 * - Change percent > 30% (suspicious)
 * - Missing data
 */
export function validatePrices(prices: LivePrice[]): PriceValidation[] {
  const issues: PriceValidation[] = [];

  // Check ETFs have matching names in database
  for (const etf of koreanETFs) {
    const price = prices.find((p) => p.assetId === `etf-${etf.ticker}`);
    if (!price) {
      issues.push({
        assetId: `etf-${etf.ticker}`,
        name: etf.nameKr,
        price: 0,
        source: "naver",
        issue: "가격 데이터 없음",
      });
    } else if (price.price <= 0) {
      issues.push({
        assetId: price.assetId,
        name: etf.nameKr,
        price: price.price,
        source: "naver",
        issue: "가격이 0 이하",
      });
    } else if (Math.abs(price.changePercent) > 30) {
      issues.push({
        assetId: price.assetId,
        name: etf.nameKr,
        price: price.price,
        source: "naver",
        issue: `변동률 ${price.changePercent}% (비정상)`,
      });
    }
  }

  return issues;
}
