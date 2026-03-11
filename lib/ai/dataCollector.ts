/**
 * 종합 데이터 수집 모듈
 * 다양한 무료 소스에서 시장 데이터, 경제 지표, 뉴스 심리를 수집한다.
 *
 * - Yahoo Finance: VIX, 채권 수익률, 원자재, 통화
 * - RSS 피드: 뉴스 헤드라인 및 심리 분석
 * - 파생 지표: 공포탐욕지수, 수익률 곡선, 원자재 비율
 */

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

export interface CollectedData {
  timestamp: string;

  // 1. 시장 심리
  vix?: number;
  fearGreedIndex?: number;
  putCallRatio?: number;

  // 2. 경제 지표
  us2yYield?: number;
  us10yYield?: number;
  yieldCurveSpread?: number;

  // 3. 글로벌 시장 상태
  globalMarketSummary: {
    asiaStatus: string;
    europeStatus: string;
    usStatus: string;
  };

  // 4. 원자재 시그널
  goldSilverRatio?: number;
  oilGoldRatio?: number;
  copperGoldRatio?: number;

  // 5. 통화 시그널
  dxyTrend?: string;
  usdKrwTrend?: string;

  // 6. 교차시장 시그널
  bondEquitySignal?: string;
  safeHavenDemand?: string;

  // 7. 뉴스 심리
  newsSentiment?: {
    overall: "positive" | "negative" | "neutral";
    headlines: string[];
    sources: string[];
  };

  // 원본 가격 데이터 (다른 모듈에서 활용)
  rawPrices?: Record<string, number>;
}

// ─── Yahoo Finance 데이터 가져오기 ──────────────────────────────────────────────

interface YahooQuoteResult {
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  shortName?: string;
  symbol?: string;
}

/**
 * Yahoo Finance에서 다수 심볼의 실시간 데이터를 가져온다.
 */
async function fetchYahooQuotes(
  symbols: string[],
): Promise<Record<string, YahooQuoteResult>> {
  const result: Record<string, YahooQuoteResult> = {};

  try {
    const symbolStr = symbols.join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolStr)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`Yahoo Finance quote API 오류: ${res.status}`);
      return result;
    }

    const data = await res.json();
    const quotes = data?.quoteResponse?.result ?? [];

    for (const q of quotes) {
      if (q.symbol) {
        result[q.symbol] = {
          regularMarketPrice: q.regularMarketPrice,
          regularMarketChange: q.regularMarketChange,
          regularMarketChangePercent: q.regularMarketChangePercent,
          shortName: q.shortName,
          symbol: q.symbol,
        };
      }
    }
  } catch (err) {
    console.error("Yahoo Finance 데이터 수집 실패:", err);
  }

  return result;
}

// ─── 파생 지표 계산 ──────────────────────────────────────────────────────────

/**
 * VIX 값으로부터 공포탐욕지수를 산출한다.
 * VIX < 12 → 극단적 탐욕 (95)
 * VIX 12-15 → 탐욕 (80)
 * VIX 15-20 → 중립 (50)
 * VIX 20-25 → 공포 (30)
 * VIX 25-30 → 높은 공포 (15)
 * VIX > 30 → 극단적 공포 (5)
 */
function calcFearGreedFromVix(vix: number): number {
  if (vix < 12) return 95;
  if (vix < 15) return 80;
  if (vix < 18) return 65;
  if (vix < 20) return 50;
  if (vix < 23) return 35;
  if (vix < 25) return 25;
  if (vix < 30) return 15;
  if (vix < 35) return 8;
  return 5;
}

/**
 * 안전자산 수요를 VIX, 금/은 비율, 수익률 곡선 등으로 판단한다.
 */
function calcSafeHavenDemand(
  vix?: number,
  goldSilverRatio?: number,
  yieldCurveSpread?: number,
): string {
  let score = 0;

  if (vix !== undefined) {
    if (vix > 25) score += 2;
    else if (vix > 20) score += 1;
    else if (vix < 15) score -= 1;
  }

  if (goldSilverRatio !== undefined) {
    // 금/은 비율이 높을수록 안전자산 선호
    if (goldSilverRatio > 80) score += 2;
    else if (goldSilverRatio > 70) score += 1;
    else if (goldSilverRatio < 60) score -= 1;
  }

  if (yieldCurveSpread !== undefined) {
    // 수익률 곡선 역전 → 안전자산 수요 증가
    if (yieldCurveSpread < 0) score += 2;
    else if (yieldCurveSpread < 0.5) score += 1;
  }

  if (score >= 3) return "높음";
  if (score >= 1) return "보통";
  return "낮음";
}

/**
 * 채권-주식 시그널을 판단한다.
 */
function calcBondEquitySignal(
  us10yYield?: number,
  yieldCurveSpread?: number,
  vix?: number,
): string {
  const parts: string[] = [];

  if (yieldCurveSpread !== undefined) {
    if (yieldCurveSpread < 0) {
      parts.push("수익률 곡선 역전으로 경기침체 경고");
    } else if (yieldCurveSpread < 0.5) {
      parts.push("수익률 곡선 평탄화, 경기 둔화 우려");
    } else {
      parts.push("수익률 곡선 정상, 경기 확장 시그널");
    }
  }

  if (us10yYield !== undefined) {
    if (us10yYield > 4.5) {
      parts.push("높은 국채 금리가 주식시장에 부담");
    } else if (us10yYield < 3.5) {
      parts.push("낮은 국채 금리가 주식시장에 우호적");
    }
  }

  if (vix !== undefined && vix > 25) {
    parts.push("높은 변동성으로 채권 선호 증가");
  }

  return parts.length > 0 ? parts.join(". ") : "채권-주식 시그널 중립";
}

/**
 * 변동률로부터 추세 문자열을 생성한다.
 */
function calcTrend(changePercent?: number): string {
  if (changePercent === undefined) return "데이터 없음";
  if (changePercent > 0.5) return "강세";
  if (changePercent > 0.1) return "소폭 강세";
  if (changePercent < -0.5) return "약세";
  if (changePercent < -0.1) return "소폭 약세";
  return "보합";
}

// ─── 글로벌 시장 상태 판단 ─────────────────────────────────────────────────────

interface RegionalStatus {
  asiaStatus: string;
  europeStatus: string;
  usStatus: string;
}

function calcGlobalMarketStatus(
  quotes: Record<string, YahooQuoteResult>,
): RegionalStatus {
  // 아시아 지수
  const asiaSymbols = ["^KS11", "^N225", "^HSI", "000001.SS"];
  const asiaChanges: number[] = [];
  for (const sym of asiaSymbols) {
    if (quotes[sym]?.regularMarketChangePercent !== undefined) {
      asiaChanges.push(quotes[sym].regularMarketChangePercent!);
    }
  }

  // 유럽 지수
  const europeSymbols = ["^FTSE", "^GDAXI", "^FCHI"];
  const europeChanges: number[] = [];
  for (const sym of europeSymbols) {
    if (quotes[sym]?.regularMarketChangePercent !== undefined) {
      europeChanges.push(quotes[sym].regularMarketChangePercent!);
    }
  }

  // 미국 지수
  const usSymbols = ["^GSPC", "^IXIC", "^DJI"];
  const usChanges: number[] = [];
  for (const sym of usSymbols) {
    if (quotes[sym]?.regularMarketChangePercent !== undefined) {
      usChanges.push(quotes[sym].regularMarketChangePercent!);
    }
  }

  function resolveStatus(changes: number[]): string {
    if (changes.length === 0) return "데이터 없음";
    const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
    const allUp = changes.every((c) => c > 0);
    const allDown = changes.every((c) => c < 0);
    if (allUp && avg > 0.3) return "상승";
    if (allDown && avg < -0.3) return "하락";
    if (Math.abs(avg) < 0.2) return "보합";
    return "혼조";
  }

  return {
    asiaStatus: resolveStatus(asiaChanges),
    europeStatus: resolveStatus(europeChanges),
    usStatus: resolveStatus(usChanges),
  };
}

// ─── RSS 뉴스 심리 분석 ────────────────────────────────────────────────────────

interface NewsSentimentResult {
  overall: "positive" | "negative" | "neutral";
  headlines: string[];
  sources: string[];
}

const POSITIVE_KEYWORDS = [
  "rally", "surge", "gain", "rise", "jump", "soar", "boost",
  "record", "high", "growth", "strong", "bullish", "recover",
  "optimism", "upgrade", "beat", "exceed", "positive",
];

const NEGATIVE_KEYWORDS = [
  "crash", "plunge", "drop", "fall", "decline", "tumble", "sink",
  "low", "recession", "crisis", "fear", "bearish", "sell-off",
  "selloff", "warning", "downgrade", "miss", "negative", "slump",
  "inflation", "default", "bankruptcy",
];

/**
 * RSS 피드에서 뉴스 헤드라인을 가져와 심리를 분석한다.
 */
async function fetchNewsSentiment(): Promise<NewsSentimentResult> {
  const feeds = [
    {
      url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147",
      source: "CNBC",
    },
    {
      url: "https://feeds.reuters.com/reuters/businessNews",
      source: "Reuters",
    },
    {
      url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US",
      source: "Yahoo Finance",
    },
  ];

  const allHeadlines: string[] = [];
  const allSources: string[] = [];

  for (const feed of feeds) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(feed.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; GeopoliticsPlatform/1.0)",
        },
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      if (!res.ok) continue;

      const xml = await res.text();

      // 간단한 XML 파싱: <title> 태그에서 헤드라인 추출
      const titleMatches = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)
        ?? xml.match(/<title>(.*?)<\/title>/g)
        ?? [];

      for (const match of titleMatches.slice(0, 10)) {
        const text = match
          .replace(/<title>/, "")
          .replace(/<\/title>/, "")
          .replace("<![CDATA[", "")
          .replace("]]>", "")
          .trim();

        if (text && text.length > 10 && !text.includes("RSS") && !text.includes("CNBC")) {
          allHeadlines.push(text);
          if (!allSources.includes(feed.source)) {
            allSources.push(feed.source);
          }
        }
      }
    } catch {
      // 개별 피드 실패는 무시
      console.warn(`RSS 피드 수집 실패: ${feed.source}`);
    }
  }

  // 심리 분석: 키워드 카운트
  let positiveCount = 0;
  let negativeCount = 0;

  for (const headline of allHeadlines) {
    const lower = headline.toLowerCase();
    for (const kw of POSITIVE_KEYWORDS) {
      if (lower.includes(kw)) positiveCount++;
    }
    for (const kw of NEGATIVE_KEYWORDS) {
      if (lower.includes(kw)) negativeCount++;
    }
  }

  let overall: "positive" | "negative" | "neutral" = "neutral";
  if (positiveCount > negativeCount * 1.3) {
    overall = "positive";
  } else if (negativeCount > positiveCount * 1.3) {
    overall = "negative";
  }

  return {
    overall,
    headlines: allHeadlines.slice(0, 15),
    sources: allSources,
  };
}

// ─── 메인 수집 함수 ──────────────────────────────────────────────────────────

/**
 * 모든 데이터 소스로부터 종합 데이터를 수집한다.
 * 개별 소스 실패 시에도 나머지 데이터는 정상 반환된다.
 */
export async function collectAllData(): Promise<CollectedData> {
  const timestamp = new Date().toISOString();

  // 수집할 Yahoo Finance 심볼
  const yahooSymbols = [
    // 심리/변동성
    "^VIX",
    // 채권 수익률
    "^TNX",   // 10년 국채
    "^FVX",   // 5년 국채
    "^IRX",   // 13주 T-Bill (2년 대용)
    // 원자재
    "GC=F",   // 금
    "SI=F",   // 은
    "CL=F",   // WTI 원유
    "HG=F",   // 구리
    // 통화
    "DX-Y.NYB", // 달러 인덱스
    "KRW=X",    // USD/KRW
    // 글로벌 지수
    "^GSPC",    // S&P 500
    "^IXIC",    // 나스닥
    "^DJI",     // 다우
    "^KS11",    // KOSPI
    "^N225",    // 니케이
    "^HSI",     // 항셍
    "000001.SS", // 상해종합
    "^FTSE",    // FTSE 100
    "^GDAXI",   // DAX
    "^FCHI",    // CAC 40
  ];

  // Yahoo Finance와 RSS를 병렬로 수집
  const [quotes, newsSentiment] = await Promise.all([
    fetchYahooQuotes(yahooSymbols),
    fetchNewsSentiment(),
  ]);

  // 원본 가격 데이터 저장
  const rawPrices: Record<string, number> = {};
  for (const [sym, q] of Object.entries(quotes)) {
    if (q.regularMarketPrice !== undefined) {
      rawPrices[sym] = q.regularMarketPrice;
    }
  }

  // VIX
  const vix = quotes["^VIX"]?.regularMarketPrice;
  const fearGreedIndex = vix !== undefined ? calcFearGreedFromVix(vix) : undefined;

  // Put/Call 비율 추정 (VIX 기반 근사)
  const putCallRatio = vix !== undefined
    ? Number((0.7 + (vix - 15) * 0.02).toFixed(2))
    : undefined;

  // 채권 수익률
  const us10yYield = quotes["^TNX"]?.regularMarketPrice;
  // ^IRX는 13주 T-Bill이므로 2년 수익률 근사로 ^FVX(5Y) 사용
  const us2yYield = quotes["^FVX"]?.regularMarketPrice ?? quotes["^IRX"]?.regularMarketPrice;
  const yieldCurveSpread =
    us10yYield !== undefined && us2yYield !== undefined
      ? Number((us10yYield - us2yYield).toFixed(3))
      : undefined;

  // 원자재 비율
  const goldPrice = quotes["GC=F"]?.regularMarketPrice;
  const silverPrice = quotes["SI=F"]?.regularMarketPrice;
  const oilPrice = quotes["CL=F"]?.regularMarketPrice;
  const copperPrice = quotes["HG=F"]?.regularMarketPrice;

  const goldSilverRatio =
    goldPrice !== undefined && silverPrice !== undefined && silverPrice > 0
      ? Number((goldPrice / silverPrice).toFixed(2))
      : undefined;

  const oilGoldRatio =
    oilPrice !== undefined && goldPrice !== undefined && goldPrice > 0
      ? Number((oilPrice / goldPrice).toFixed(4))
      : undefined;

  const copperGoldRatio =
    copperPrice !== undefined && goldPrice !== undefined && goldPrice > 0
      ? Number((copperPrice / goldPrice).toFixed(6))
      : undefined;

  // 통화 추세
  const dxyChange = quotes["DX-Y.NYB"]?.regularMarketChangePercent;
  const dxyTrend = calcTrend(dxyChange);

  const usdKrwChange = quotes["KRW=X"]?.regularMarketChangePercent;
  const usdKrwTrend = calcTrend(usdKrwChange);

  // 글로벌 시장 상태
  const globalMarketSummary = calcGlobalMarketStatus(quotes);

  // 안전자산 수요
  const safeHavenDemand = calcSafeHavenDemand(vix, goldSilverRatio, yieldCurveSpread);

  // 채권-주식 시그널
  const bondEquitySignal = calcBondEquitySignal(us10yYield, yieldCurveSpread, vix);

  return {
    timestamp,

    vix,
    fearGreedIndex,
    putCallRatio,

    us2yYield,
    us10yYield,
    yieldCurveSpread,

    globalMarketSummary,

    goldSilverRatio,
    oilGoldRatio,
    copperGoldRatio,

    dxyTrend,
    usdKrwTrend,

    bondEquitySignal,
    safeHavenDemand,

    newsSentiment,

    rawPrices,
  };
}
