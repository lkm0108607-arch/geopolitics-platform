import { NextResponse } from "next/server";
import { runEnsemble } from "@/lib/ai/ensemble";
import type { EnsembleInput } from "@/lib/ai/ensemble";
import type { PriceBar } from "@/lib/ai/indicators";
import type { CrossAssetInput } from "@/lib/ai/models";
import {
  saveMarketSnapshot,
  getMarketHistory,
  savePrediction,
  getLatestPredictions,
  getModelWeights,
} from "@/lib/ai/dataService";
import { collectAllData } from "@/lib/ai/dataCollector";
import { analyzeFundamentals } from "@/lib/ai/fundamentalAnalysis";
import { computeAdvancedSignals } from "@/lib/ai/advancedAnalysis";
import { analyzeHistoricalPatterns } from "@/lib/ai/historicalPatternAnalysis";
import { koreanETFs } from "@/data/koreanETFs";
import { fetchAllLivePrices, type LivePrice } from "@/lib/realtime/priceService";

// ─── 자산 ID 매핑 ─────────────────────────────────────────────────────────────

// Yahoo Finance로 히스토리 데이터를 가져올 글로벌 자산만 (네이버 미지원 자산)
const YAHOO_GLOBAL_SYMBOLS: Record<string, string> = {
  "^GSPC": "sp500",
  "^IXIC": "nasdaq",
  "GC=F": "gold",
  "CL=F": "wti-oil",
  "HG=F": "copper",
  "^TNX": "us-10y-yield",
};

// 한국 자산 (네이버 금융 실시간 + Supabase 히스토리)
const NAVER_ASSET_IDS = [
  "kospi", "kosdaq", "usd-krw", "usd-jpy", "dxy",
  ...koreanETFs.map((etf) => `etf-${etf.ticker}`),
];

// 산업 자산 → 대표 ETF 매핑 (대표 ETF 데이터를 프록시로 사용)
const INDUSTRY_PROXY_MAP: Record<string, string> = {
  "semiconductor": "etf-091160",   // KODEX 반도체
  "ai-tech": "etf-133690",         // TIGER 미국나스닥100
  "ev-battery": "etf-305720",      // KODEX 2차전지산업
  "bio-pharma": "etf-244580",      // KODEX 바이오
  "defense": "etf-409820",         // KODEX 미국나스닥100레버리지
  "shipbuilding": "etf-139220",    // TIGER 200 건설 (조선ETF 미제공, 근접 대체)
};

const INDUSTRY_ASSET_IDS = Object.keys(INDUSTRY_PROXY_MAP);

// 전체 예측 대상 자산 ID 목록
const ALL_ASSET_IDS = [
  ...Object.values(YAHOO_GLOBAL_SYMBOLS),
  ...NAVER_ASSET_IDS,
  ...INDUSTRY_ASSET_IDS,
];

const SYMBOL_TO_ASSET: Record<string, string> = { ...YAHOO_GLOBAL_SYMBOLS };
const ASSET_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(YAHOO_GLOBAL_SYMBOLS).map(([sym, asset]) => [asset, sym]),
);

// ─── Yahoo Finance 데이터 가져오기 ──────────────────────────────────────────────

// Yahoo Finance spark API 응답 형태: { "^GSPC": { timestamp: [...], close: [...], ... } }
interface YahooSparkEntry {
  timestamp?: number[];
  close?: (number | null)[];
  [key: string]: unknown;
}

/**
 * Yahoo Finance spark API를 배치로 호출한다.
 * URL 길이 제한으로 한 번에 최대 20개 심볼만 요청.
 */
async function fetchYahooHistorical(
  symbols: string[],
): Promise<Record<string, PriceBar[]>> {
  const result: Record<string, PriceBar[]> = {};
  const BATCH_SIZE = 20;

  // 배치 분할
  const batches: string[][] = [];
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    batches.push(symbols.slice(i, i + BATCH_SIZE));
  }

  // 배치 병렬 처리 (최대 5개씩)
  const PARALLEL_LIMIT = 5;
  for (let i = 0; i < batches.length; i += PARALLEL_LIMIT) {
    const batchGroup = batches.slice(i, i + PARALLEL_LIMIT);
    const batchResults = await Promise.allSettled(
      batchGroup.map((batch) => fetchYahooBatch(batch)),
    );

    for (const batchResult of batchResults) {
      if (batchResult.status === "fulfilled") {
        Object.assign(result, batchResult.value);
      }
    }
  }

  return result;
}

async function fetchYahooBatch(
  symbols: string[],
): Promise<Record<string, PriceBar[]>> {
  const result: Record<string, PriceBar[]> = {};

  try {
    const symbolStr = symbols.join(",");
    const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${symbolStr}&range=3mo&interval=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error(`Yahoo Finance API 오류 (배치): ${res.status}`);
      return result;
    }

    const data = await res.json();

    for (const symbol of symbols) {
      const assetId = SYMBOL_TO_ASSET[symbol];
      if (!assetId) continue;

      const entry = data[symbol] as YahooSparkEntry | undefined;
      if (!entry?.close || !entry?.timestamp) continue;

      const bars: PriceBar[] = [];
      for (let i = 0; i < entry.close.length; i++) {
        const close = entry.close[i];
        if (close == null) continue;

        bars.push({
          close,
          high: undefined,
          low: undefined,
          volume: undefined,
        });
      }

      result[assetId] = bars;
    }
  } catch (err) {
    console.error("Yahoo Finance 배치 데이터 가져오기 실패:", err);
  }

  return result;
}

/**
 * Supabase market_snapshots에서 히스토리를 로드하여 assetDataMap에 추가
 */
async function loadFromSupabase(
  assetId: string,
  assetDataMap: Record<string, PriceBar[]>,
): Promise<void> {
  try {
    const history = await getMarketHistory(assetId, 90);
    if (history.length >= 20) {
      assetDataMap[assetId] = history.map((h) => ({
        close: Number(h.close_price),
        high: h.high_price != null ? Number(h.high_price) : undefined,
        low: h.low_price != null ? Number(h.low_price) : undefined,
        volume: h.volume != null ? Number(h.volume) : undefined,
      }));
    }
  } catch {
    // 히스토리 없으면 건너뛰기
  }
}

/**
 * 네이버 금융 차트 API에서 ETF/주식 과거 데이터를 가져온다.
 * Supabase에 히스토리가 부족할 때 fallback으로 사용.
 */
async function fetchNaverChart(ticker: string): Promise<PriceBar[]> {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 120); // 120일치

    const startStr = start.toISOString().slice(0, 10).replace(/-/g, "");
    const endStr = end.toISOString().slice(0, 10).replace(/-/g, "");

    const url = `https://fchart.stock.naver.com/siseJson.nhn?symbol=${ticker}&requestType=1&startTime=${startStr}&endTime=${endStr}&timeframe=day`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) return [];

    const text = await res.text();
    // 네이버 차트 응답 형태: ["20260102", 61355, 65520, 61355, 65480, 3121543, 0.6],
    const lines = text.trim().split("\n");
    const bars: PriceBar[] = [];

    for (const line of lines) {
      const cleaned = line.trim().replace(/,\s*$/, ""); // 끝 쉼표 제거
      // ["20260102", 숫자, 숫자, 숫자, 숫자, ...] 패턴 매칭
      if (!cleaned.startsWith("[\"20")) continue;

      const inner = cleaned.slice(1, -1); // 바깥 [] 제거
      const parts = inner.split(",").map((s) => s.trim().replace(/"/g, ""));
      if (parts.length < 5) continue;

      // parts: [날짜, 시가, 고가, 저가, 종가, 거래량, 외국인소진율]
      const close = parseFloat(parts[4]);
      const high = parseFloat(parts[2]);
      const low = parseFloat(parts[3]);
      const volume = parts.length >= 6 ? parseFloat(parts[5]) : undefined;

      if (isNaN(close) || close <= 0) continue;

      bars.push({
        close,
        high: isNaN(high) ? undefined : high,
        low: isNaN(low) ? undefined : low,
        volume: volume && !isNaN(volume) ? volume : undefined,
      });
    }

    return bars;
  } catch (err) {
    console.error(`네이버 차트 데이터 가져오기 실패 (${ticker}):`, err);
    return [];
  }
}

/**
 * 네이버 ticker로 히스토리를 가져와서 assetDataMap에 추가
 */
async function loadFromNaverChart(
  assetId: string,
  ticker: string,
  assetDataMap: Record<string, PriceBar[]>,
): Promise<void> {
  const bars = await fetchNaverChart(ticker);
  if (bars.length >= 20) {
    assetDataMap[assetId] = bars;
  }
}

/**
 * 사이클 ID 생성: ai-cycle-YYYY-MM-DD
 */
function generateCycleId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  return `ai-cycle-${dateStr}`;
}

// ─── POST: 예측 실행 ──────────────────────────────────────────────────────────

export async function POST() {
  try {
    const cycleId = generateCycleId();

    // 1. 데이터 수집: Yahoo(글로벌 히스토리) + Naver(한국 실시간) + 거시경제
    const yahooSymbols = Object.keys(YAHOO_GLOBAL_SYMBOLS);
    const [yahooData, naverPrices, collectedData] = await Promise.all([
      fetchYahooHistorical(yahooSymbols),
      fetchAllLivePrices().catch(() => [] as LivePrice[]),
      collectAllData().catch((err) => {
        console.error("거시경제 데이터 수집 실패 (계속 진행):", err);
        return null;
      }),
    ]);

    // 네이버 실시간 가격을 Supabase에 저장 (히스토리 축적)
    for (const lp of naverPrices) {
      try {
        await saveMarketSnapshot(lp.assetId, {
          closePrice: lp.price,
          changePercent: lp.changePercent,
        });
      } catch {
        // 저장 실패는 예측에 영향 주지 않음
      }
    }

    // 2. 현재 모델 가중치 조회
    const weights = await getModelWeights();

    // 3. 사용 가능한 자산 데이터 수집
    const assetDataMap: Record<string, PriceBar[]> = {};

    // 3a. 글로벌 자산: Yahoo 히스토리 우선 → Supabase 보완
    for (const [, assetId] of Object.entries(YAHOO_GLOBAL_SYMBOLS)) {
      if (yahooData[assetId] && yahooData[assetId].length >= 20) {
        assetDataMap[assetId] = yahooData[assetId];

        const latestBar = yahooData[assetId][yahooData[assetId].length - 1];
        const prevBar = yahooData[assetId].length >= 2
          ? yahooData[assetId][yahooData[assetId].length - 2]
          : null;
        const changePercent = prevBar
          ? ((latestBar.close - prevBar.close) / prevBar.close) * 100
          : undefined;
        try {
          await saveMarketSnapshot(assetId, {
            closePrice: latestBar.close,
            highPrice: latestBar.high,
            lowPrice: latestBar.low,
            volume: latestBar.volume,
            changePercent,
          });
        } catch { /* ignore */ }
      } else {
        await loadFromSupabase(assetId, assetDataMap);
      }
    }

    // 비-ETF 한국 자산의 네이버 차트 코드 매핑
    const NAVER_CHART_CODE: Record<string, string> = {
      "kospi": "KOSPI",
      "kosdaq": "KOSDAQ",
    };

    // 3b. 한국 자산 (네이버 금융): Supabase 히스토리 → 없으면 네이버 차트 API fallback
    for (const assetId of NAVER_ASSET_IDS) {
      await loadFromSupabase(assetId, assetDataMap);
      if (!assetDataMap[assetId] || assetDataMap[assetId].length < 20) {
        // Supabase에 데이터 부족 → 네이버 차트에서 직접 가져오기
        let ticker: string | null = null;
        if (assetId.startsWith("etf-")) {
          ticker = assetId.replace("etf-", "");
        } else if (NAVER_CHART_CODE[assetId]) {
          ticker = NAVER_CHART_CODE[assetId];
        }
        if (ticker) {
          await loadFromNaverChart(assetId, ticker, assetDataMap);
        }
      }
    }

    // 3c. 산업 자산: 대표 ETF 데이터 프록시 → 없으면 네이버 차트 fallback
    for (const [industryId, proxyEtfId] of Object.entries(INDUSTRY_PROXY_MAP)) {
      if (assetDataMap[proxyEtfId] && assetDataMap[proxyEtfId].length >= 20) {
        assetDataMap[industryId] = assetDataMap[proxyEtfId];
      } else {
        // 프록시 ETF의 ticker로 네이버 차트에서 가져오기
        const ticker = proxyEtfId.replace("etf-", "");
        await loadFromNaverChart(industryId, ticker, assetDataMap);
      }
    }

    // 4. 각 자산에 대해 앙상블 예측 실행
    const predictions = [];

    // 교차 자산 데이터 준비
    const crossAssets: CrossAssetInput[] = Object.entries(assetDataMap).map(
      ([id, data]) => ({ assetId: id, data }),
    );

    for (const [assetId, data] of Object.entries(assetDataMap)) {
      if (data.length < 20) continue; // 최소 20개 데이터 포인트 필요

      const otherAssets = crossAssets.filter((ca) => ca.assetId !== assetId);

      // 펀더멘털 시그널 생성 (수집 데이터가 있는 경우)
      let fundamentalSignals = null;
      if (collectedData) {
        try {
          fundamentalSignals = analyzeFundamentals(assetId, collectedData);
        } catch {
          // 펀더멘털 분석 실패 시 null 유지
        }
      }

      const advancedSignals = computeAdvancedSignals(data, collectedData?.vix);

      // 역사적 패턴 분석 (실패해도 예측 진행)
      let historicalPatternResult = null;
      try {
        historicalPatternResult = await analyzeHistoricalPatterns(assetId, data, collectedData);
      } catch (err) {
        console.error(`역사적 패턴 분석 실패 (${assetId}, 계속 진행):`, err);
      }

      const input: EnsembleInput = {
        assetId,
        data,
        crossAssets: otherAssets,
        config: weights,
        cycleId,
        collectedData,
        fundamentalSignals,
        advancedSignals,
        historicalPatternResult,
      };

      const prediction = runEnsemble(input);

      // Supabase에 예측 저장
      try {
        await savePrediction({
          cycleId: prediction.cycleId,
          assetId: prediction.assetId,
          direction: prediction.direction,
          probability: prediction.probability,
          confidence: prediction.confidence,
          rationale: prediction.rationale,
          subModelVotes: prediction.subModelVotes,
        });
      } catch (err) {
        console.error(`예측 저장 실패 (${assetId}):`, err);
      }

      predictions.push(prediction);
    }

    return NextResponse.json({
      success: true,
      cycleId,
      totalAssets: predictions.length,
      generatedAt: new Date().toISOString(),
      weights: {
        momentum: weights.momentumWeight,
        meanReversion: weights.meanReversionWeight,
        volatility: weights.volatilityWeight,
        correlation: weights.correlationWeight,
        fundamental: weights.fundamentalWeight,
      },
      macroDataAvailable: collectedData !== null,
      predictions,
    });
  } catch (err) {
    console.error("AI 예측 실행 오류:", err);
    return NextResponse.json(
      {
        success: false,
        error: "AI 예측 실행 중 오류가 발생했습니다.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

// ─── GET: 최신 예측 조회 ──────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get("cycleId") ?? undefined;

    const predictions = await getLatestPredictions(cycleId);

    if (predictions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "저장된 예측이 없습니다. POST /api/ai/predict를 먼저 실행하세요.",
        predictions: [],
      });
    }

    // snake_case → camelCase 변환 (클라이언트 훅 호환)
    // asset_id 기준 중복 제거 (가장 최근 예측만 유지)
    const seen = new Set<string>();
    const deduplicated = predictions.filter((p) => {
      if (seen.has(p.asset_id)) return false;
      seen.add(p.asset_id);
      return true;
    });

    const mapped = deduplicated.map((p) => ({
      assetId: p.asset_id,
      direction: p.direction,
      probability: p.probability,
      confidence: p.confidence,
      rationale: p.rationale,
      subModelVotes: p.sub_model_votes,
      generatedAt: p.created_at ?? new Date().toISOString(),
      cycleId: p.cycle_id,
    }));

    return NextResponse.json({
      success: true,
      cycleId: predictions[0]?.cycle_id,
      totalAssets: mapped.length,
      predictions: mapped,
    });
  } catch (err) {
    console.error("예측 조회 오류:", err);
    return NextResponse.json(
      {
        success: false,
        error: "예측 조회 중 오류가 발생했습니다.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
