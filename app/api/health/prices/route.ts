import { NextResponse } from "next/server";
import {
  fetchAllLivePrices,
  validatePrices,
  type LivePrice,
} from "@/lib/realtime/priceService";
import { koreanETFs } from "@/data/koreanETFs";

const NAVER_STOCK_API =
  "https://polling.finance.naver.com/api/realtime/domestic/stock";

/**
 * Price Health Check API
 *
 * 1. 전체 가격 데이터 유효성 검사 (0원, 비정상 변동률 등)
 * 2. ETF 이름 교차 검증 (네이버 금융 API vs 로컬 DB)
 * 3. 데이터 소스별 응답 상태 확인
 */
export async function GET() {
  const startTime = Date.now();

  // 1. Fetch all prices
  let prices: LivePrice[] = [];
  let fetchError: string | null = null;
  try {
    prices = await fetchAllLivePrices();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  // 2. Validate prices (zero, missing, suspicious changes)
  const priceIssues = validatePrices(prices);

  // 3. Cross-check ETF names against Naver Finance (sample 5 random ETFs)
  const nameIssues: Array<{
    ticker: string;
    localName: string;
    naverName: string;
    match: boolean;
  }> = [];

  const sampleSize = 5;
  const shuffled = [...koreanETFs].sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, sampleSize);

  const nameCheckPromises = sample.map(async (etf) => {
    try {
      const res = await fetch(`${NAVER_STOCK_API}/${etf.ticker}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json();
      const d = data?.datas?.[0];
      if (!d?.stockName) return null;

      const naverName = d.stockName.trim();
      const localName = etf.nameKr.trim();
      const match =
        naverName === localName ||
        naverName.replace(/\s/g, "") === localName.replace(/\s/g, "");

      return { ticker: etf.ticker, localName, naverName, match };
    } catch {
      return null;
    }
  });

  const nameResults = await Promise.allSettled(nameCheckPromises);
  for (const r of nameResults) {
    if (r.status === "fulfilled" && r.value) {
      nameIssues.push(r.value);
    }
  }

  // 4. Source status summary
  const naverPrices = prices.filter(
    (p) =>
      p.assetId.startsWith("etf-") ||
      ["kospi", "kosdaq", "usd-krw", "usd-jpy", "dxy"].includes(p.assetId),
  );
  const yahooPrices = prices.filter((p) =>
    ["sp500", "nasdaq", "gold", "wti-oil", "copper", "us-10y-yield"].includes(
      p.assetId,
    ),
  );

  const nameMismatches = nameIssues.filter((n) => !n.match);
  const healthy =
    !fetchError &&
    priceIssues.length === 0 &&
    nameMismatches.length === 0 &&
    prices.length > 0;

  const elapsed = Date.now() - startTime;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "issues_detected",
      checkedAt: new Date().toISOString(),
      elapsedMs: elapsed,
      summary: {
        totalPricesFetched: prices.length,
        naverPrices: naverPrices.length,
        yahooPrices: yahooPrices.length,
        priceIssues: priceIssues.length,
        nameChecked: nameIssues.length,
        nameMismatches: nameMismatches.length,
      },
      ...(fetchError && { fetchError }),
      ...(priceIssues.length > 0 && { priceIssues }),
      ...(nameMismatches.length > 0 && { nameMismatches }),
      nameVerification: nameIssues,
    },
    {
      status: healthy ? 200 : 207,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
