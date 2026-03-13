import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Pro에서는 60초, Hobby에서는 무시됨 (10초)
import { runEnsemble } from "@/lib/ai/ensemble";
import type { EnsembleInput } from "@/lib/ai/ensemble";
import type { PriceBar } from "@/lib/ai/indicators";
import type { CrossAssetInput, Direction } from "@/lib/ai/models";
import {
  saveMarketSnapshotsBatch,
  getMarketHistoryBatch,
  savePrediction,
  getLatestPredictions,
  getModelWeights,
  saveAutoTrades,
} from "@/lib/ai/dataService";
import { buildPortfolio } from "@/lib/ai/portfolioBuilder";
import { collectAllData } from "@/lib/ai/dataCollector";
import { analyzeFundamentals } from "@/lib/ai/fundamentalAnalysis";
import { computeAdvancedSignals } from "@/lib/ai/advancedAnalysis";
import { analyzeHistoricalPatterns } from "@/lib/ai/historicalPatternAnalysis";
import { koreanETFs } from "@/data/koreanETFs";
import { fetchAllLivePrices, type LivePrice } from "@/lib/realtime/priceService";

// ─── 자산 ID 매핑 ─────────────────────────────────────────────────────────────

const YAHOO_GLOBAL_SYMBOLS: Record<string, string> = {
  "^GSPC": "sp500",
  "^IXIC": "nasdaq",
  "GC=F": "gold",
  "CL=F": "wti-oil",
  "HG=F": "copper",
  "^TNX": "us-10y-yield",
};

const NAVER_ASSET_IDS = [
  "kospi", "kosdaq", "usd-krw", "usd-jpy", "dxy",
  ...koreanETFs.map((etf) => `etf-${etf.ticker}`),
];

const ALL_ASSET_IDS = [
  ...Object.values(YAHOO_GLOBAL_SYMBOLS),
  ...NAVER_ASSET_IDS,
];

const SYMBOL_TO_ASSET: Record<string, string> = { ...YAHOO_GLOBAL_SYMBOLS };
const ASSET_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(YAHOO_GLOBAL_SYMBOLS).map(([sym, asset]) => [asset, sym]),
);

// ─── 시간 제한 설정 ──────────────────────────────────────────────────────────

/** 배치당 최대 실행 시간 (ms). 이 시간이 지나면 남은 자산을 다음 배치로 넘긴다. */
const TIME_LIMIT_MS = 7000;

/** 시간 초과 체크 */
function isTimeUp(startTime: number): boolean {
  return Date.now() - startTime >= TIME_LIMIT_MS;
}

// ─── Yahoo Finance 데이터 가져오기 ──────────────────────────────────────────────

interface YahooSparkEntry {
  timestamp?: number[];
  close?: (number | null)[];
  [key: string]: unknown;
}

async function fetchYahooHistorical(
  symbols: string[],
): Promise<Record<string, PriceBar[]>> {
  const result: Record<string, PriceBar[]> = {};
  const BATCH = 20;

  const batches: string[][] = [];
  for (let i = 0; i < symbols.length; i += BATCH) {
    batches.push(symbols.slice(i, i + BATCH));
  }

  const batchResults = await Promise.allSettled(
    batches.map((batch) => fetchYahooBatch(batch)),
  );

  for (const batchResult of batchResults) {
    if (batchResult.status === "fulfilled") {
      Object.assign(result, batchResult.value);
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

    if (!res.ok) return result;

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
        bars.push({ close, high: undefined, low: undefined, volume: undefined });
      }

      result[assetId] = bars;
    }
  } catch (err) {
    console.error("Yahoo Finance 배치 데이터 가져오기 실패:", err);
  }

  return result;
}

/**
 * 네이버 금융 차트 API에서 ETF/주식 과거 데이터를 가져온다.
 */
async function fetchNaverChart(ticker: string): Promise<PriceBar[]> {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 120);

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
    const lines = text.trim().split("\n");
    const bars: PriceBar[] = [];

    for (const line of lines) {
      const cleaned = line.trim().replace(/,\s*$/, "");
      if (!cleaned.startsWith("[\"20")) continue;

      const inner = cleaned.slice(1, -1);
      const parts = inner.split(",").map((s) => s.trim().replace(/"/g, ""));
      if (parts.length < 5) continue;

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

function generateCycleId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  return `ai-cycle-${dateStr}`;
}

const NAVER_CHART_CODE: Record<string, string> = {
  "kospi": "KOSPI",
  "kosdaq": "KOSDAQ",
};

function getNaverTicker(assetId: string): string | null {
  if (assetId.startsWith("etf-")) return assetId.replace("etf-", "");
  if (NAVER_CHART_CODE[assetId]) return NAVER_CHART_CODE[assetId];
  return null;
}

function getBaseUrl(request: Request): string {
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

// ─── POST: 배치 예측 실행 ──────────────────────────────────────────────────────
//
// ?batch=collect                 : 데이터 수집 단계
// ?batch=predict&offset=0       : 시간 기반 자산 예측 (offset부터 시작, 7초 안에 가능한 만큼)
// ?batch=final                  : 자동매매 기록 단계
//
// 각 배치는 독립적인 서버리스 실행이므로 10초 제한 내 완료 가능.
// 시간 기반으로 자동 조절하므로 느린 네트워크에서도 체인이 끊기지 않음.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const batch = searchParams.get("batch") ?? "collect";
  const cycleId = searchParams.get("cycleId") ?? generateCycleId();
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const baseUrl = getBaseUrl(request);

  // ── 인증 ──
  const cronSecret = process.env.CRON_SECRET;
  const internalSecret = searchParams.get("secret");
  if (
    process.env.NODE_ENV === "production" &&
    cronSecret &&
    batch !== "collect" &&
    internalSecret !== cronSecret
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (batch === "collect") {
      return await runBatchCollect(cycleId, baseUrl, cronSecret);
    }
    if (batch === "final") {
      return await runBatchFinal(cycleId);
    }
    if (batch === "predict") {
      return await runBatchPredict(cycleId, offset, baseUrl, cronSecret);
    }

    return NextResponse.json({ error: "Invalid batch type" }, { status: 400 });
  } catch (err) {
    console.error(`AI 예측 배치 ${batch} (offset=${offset}) 오류:`, err);
    return NextResponse.json(
      {
        success: false,
        batch,
        cycleId,
        offset,
        error: "AI 예측 실행 중 오류가 발생했습니다.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

// ─── Batch collect: 데이터 수집 + 스냅샷 저장 ──────────────────────────────────

async function runBatchCollect(cycleId: string, baseUrl: string, secret?: string) {
  const t0 = Date.now();
  console.log(`[collect] 데이터 수집 시작: ${cycleId}`);

  // 1. Yahoo + Naver + Macro 병렬 수집
  const yahooSymbols = Object.keys(YAHOO_GLOBAL_SYMBOLS);
  const [yahooData, naverPrices, _collectedData] = await Promise.all([
    fetchYahooHistorical(yahooSymbols),
    fetchAllLivePrices().catch(() => [] as LivePrice[]),
    collectAllData().catch((err) => {
      console.error("거시경제 데이터 수집 실패 (계속 진행):", err);
      return null;
    }),
  ]);

  // 2. 스냅샷 일괄 저장
  const snapshots: {
    assetId: string;
    closePrice: number;
    highPrice?: number;
    lowPrice?: number;
    volume?: number;
    changePercent?: number;
  }[] = [];

  for (const lp of naverPrices) {
    if (lp.price > 0) {
      snapshots.push({
        assetId: lp.assetId,
        closePrice: lp.price,
        changePercent: lp.changePercent,
      });
    }
  }

  for (const [, assetId] of Object.entries(YAHOO_GLOBAL_SYMBOLS)) {
    const data = yahooData[assetId];
    if (data && data.length >= 2) {
      const latest = data[data.length - 1];
      const prev = data[data.length - 2];
      const changePercent = ((latest.close - prev.close) / prev.close) * 100;
      snapshots.push({
        assetId,
        closePrice: latest.close,
        highPrice: latest.high,
        lowPrice: latest.low,
        volume: latest.volume,
        changePercent,
      });
    }
  }

  await saveMarketSnapshotsBatch(snapshots);

  // 3. 다음 배치 체이닝 → predict offset=0
  const secretParam = secret ? `&secret=${secret}` : "";
  fireAndForget(`${baseUrl}/api/ai/predict?batch=predict&offset=0&cycleId=${cycleId}${secretParam}`);

  const elapsed = Date.now() - t0;
  console.log(`[collect] 완료: ${snapshots.length}개 스냅샷, ${elapsed}ms`);

  return NextResponse.json({
    success: true,
    batch: "collect",
    cycleId,
    snapshotsSaved: snapshots.length,
    elapsedMs: elapsed,
    message: "데이터 수집 완료, 예측 배치 시작됨",
  });
}

// ─── Batch predict: 시간 기반 자산 예측 ──────────────────────────────────────

async function runBatchPredict(
  cycleId: string,
  offset: number,
  baseUrl: string,
  secret?: string,
) {
  const t0 = Date.now();
  const remaining = ALL_ASSET_IDS.slice(offset);

  if (remaining.length === 0) {
    // 모든 자산 처리 완료 → final로
    const secretParam = secret ? `&secret=${secret}` : "";
    fireAndForget(`${baseUrl}/api/ai/predict?batch=final&cycleId=${cycleId}${secretParam}`);
    return NextResponse.json({
      success: true, batch: "predict", cycleId, offset,
      message: "모든 자산 처리 완료, final 배치로 이동",
    });
  }

  console.log(`[predict] offset=${offset}, 남은 자산=${remaining.length}`);

  // 1. 남은 자산 중 최대 20개 히스토리 미리 로드 (넉넉하게 가져와서 시간 절약)
  const prefetchSize = Math.min(20, remaining.length);
  const prefetchAssets = remaining.slice(0, prefetchSize);
  const historyMap = await getMarketHistoryBatch(prefetchAssets, 90);

  if (isTimeUp(t0)) {
    // 히스토리 로드만으로 시간 초과 → 더 적은 수로 재시도
    const secretParam = secret ? `&secret=${secret}` : "";
    fireAndForget(`${baseUrl}/api/ai/predict?batch=predict&offset=${offset}&cycleId=${cycleId}${secretParam}`);
    return NextResponse.json({
      success: true, batch: "predict", cycleId, offset,
      processed: 0, message: "히스토리 로드 지연, 재시도",
    });
  }

  // 히스토리 → PriceBar 변환
  const assetDataMap: Record<string, PriceBar[]> = {};
  for (const assetId of prefetchAssets) {
    const history = historyMap[assetId];
    if (history && history.length >= 20) {
      assetDataMap[assetId] = history.map((h) => ({
        close: Number(h.close_price),
        high: h.high_price != null ? Number(h.high_price) : undefined,
        low: h.low_price != null ? Number(h.low_price) : undefined,
        volume: h.volume != null ? Number(h.volume) : undefined,
      }));
    }
  }

  // 히스토리 부족 자산: 네이버 차트 / Yahoo fallback (시간 체크하며)
  for (const assetId of prefetchAssets) {
    if (isTimeUp(t0)) break;
    if (assetDataMap[assetId] && assetDataMap[assetId].length >= 20) continue;

    // Yahoo 글로벌 자산
    if (Object.values(YAHOO_GLOBAL_SYMBOLS).includes(assetId)) {
      const sym = ASSET_TO_SYMBOL[assetId];
      if (sym) {
        try {
          const yahooData = await fetchYahooHistorical([sym]);
          if (yahooData[assetId] && yahooData[assetId].length >= 20) {
            assetDataMap[assetId] = yahooData[assetId];
          }
        } catch { /* ignore */ }
      }
      continue;
    }

    // 네이버 차트 fallback
    const ticker = getNaverTicker(assetId);
    if (ticker) {
      try {
        const bars = await fetchNaverChart(ticker);
        if (bars.length >= 20) {
          assetDataMap[assetId] = bars;
        }
      } catch { /* ignore */ }
    }
  }

  // 2. 거시경제 데이터
  let collectedData = null;
  if (!isTimeUp(t0)) {
    try {
      collectedData = await collectAllData();
    } catch { /* ignore */ }
  }

  // 3. 교차 자산 데이터
  const crossAssets: CrossAssetInput[] = Object.entries(assetDataMap).map(
    ([id, data]) => ({ assetId: id, data }),
  );

  // 4. 시간 기반 예측 실행: 시간이 남는 한 계속 처리
  let processed = 0;
  for (const assetId of prefetchAssets) {
    if (isTimeUp(t0)) break;

    const data = assetDataMap[assetId];
    if (!data || data.length < 20) {
      processed++; // 데이터 부족 → 건너뛰기 (offset은 전진)
      continue;
    }

    const assetWeights = await getModelWeights(assetId);
    if (isTimeUp(t0)) break;

    const otherAssets = crossAssets.filter((ca) => ca.assetId !== assetId);

    let fundamentalSignals = null;
    if (collectedData) {
      try {
        fundamentalSignals = analyzeFundamentals(assetId, collectedData);
      } catch { /* ignore */ }
    }

    const advancedSignals = computeAdvancedSignals(data, collectedData?.vix);

    let historicalPatternResult = null;
    if (!isTimeUp(t0)) {
      try {
        historicalPatternResult = await analyzeHistoricalPatterns(assetId, data, collectedData);
      } catch { /* ignore */ }
    }

    if (isTimeUp(t0)) break;

    const input: EnsembleInput = {
      assetId,
      data,
      crossAssets: otherAssets,
      config: assetWeights,
      cycleId,
      collectedData,
      fundamentalSignals,
      advancedSignals,
      historicalPatternResult,
    };

    const prediction = runEnsemble(input);

    try {
      await savePrediction({
        cycleId: prediction.cycleId,
        assetId: prediction.assetId,
        direction: prediction.direction,
        probability: prediction.probability,
        confidence: prediction.confidence,
        rationale: prediction.rationale,
        subModelVotes: prediction.subModelVotes,
        timingPrediction: prediction.timingPrediction,
        debateResult: prediction.debateResult,
        juryVerdict: prediction.juryVerdict,
      });
    } catch (err) {
      console.error(`예측 저장 실패 (${assetId}):`, err);
    }

    processed++;
  }

  // 5. 다음 체이닝
  const newOffset = offset + processed;
  const secretParam = secret ? `&secret=${secret}` : "";

  if (newOffset >= ALL_ASSET_IDS.length) {
    // 모든 자산 완료 → final
    fireAndForget(`${baseUrl}/api/ai/predict?batch=final&cycleId=${cycleId}${secretParam}`);
  } else {
    // 남은 자산 → 다음 predict 배치
    fireAndForget(`${baseUrl}/api/ai/predict?batch=predict&offset=${newOffset}&cycleId=${cycleId}${secretParam}`);
  }

  const elapsed = Date.now() - t0;
  console.log(`[predict] offset=${offset}, 처리=${processed}, 경과=${elapsed}ms, 다음offset=${newOffset}`);

  return NextResponse.json({
    success: true,
    batch: "predict",
    cycleId,
    offset,
    processed,
    newOffset,
    totalAssets: ALL_ASSET_IDS.length,
    elapsedMs: elapsed,
    done: newOffset >= ALL_ASSET_IDS.length,
  });
}

// ─── Batch final: 자동매매 기록 ──────────────────────────────────────────────

async function runBatchFinal(cycleId: string) {
  console.log(`[final] 자동매매 기록: ${cycleId}`);

  const predictions = await getLatestPredictions(cycleId);
  if (predictions.length === 0) {
    return NextResponse.json({
      success: true,
      batch: "final",
      cycleId,
      autoTrades: 0,
      message: "예측 없음, 자동매매 생략",
    });
  }

  const ensembleLike = predictions.map((p) => ({
    assetId: p.asset_id,
    direction: p.direction as Direction,
    probability: p.probability,
    confidence: p.confidence,
    rationale: p.rationale,
    subModelVotes: p.sub_model_votes,
    cycleId: p.cycle_id,
    generatedAt: p.created_at ?? new Date().toISOString(),
  }));

  const portfolio = buildPortfolio(ensembleLike);

  if (portfolio.length === 0) {
    return NextResponse.json({
      success: true,
      batch: "final",
      cycleId,
      autoTrades: 0,
      message: "매수 시그널 없음",
    });
  }

  let naverPrices: LivePrice[] = [];
  try {
    naverPrices = await fetchAllLivePrices();
  } catch { /* ignore */ }

  const livePriceMap = new Map<string, number>();
  for (const lp of naverPrices) {
    if (lp.price > 0) livePriceMap.set(lp.assetId, lp.price);
  }

  const autoTradeRows = portfolio
    .map((pick) => {
      const entryPrice = livePriceMap.get(pick.assetId) ?? 0;
      const tpTarget = entryPrice > 0
        ? Math.round(entryPrice * (1 + Math.abs(pick.predictedReturn) / 100))
        : 0;
      const slTarget = entryPrice > 0
        ? Math.round(entryPrice * (1 - pick.stopLossPercent / 100))
        : 0;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pick.holdingDays);

      return {
        cycle_id: cycleId,
        asset_id: pick.assetId,
        name: pick.name,
        signal: pick.signal,
        weight: pick.weight,
        entry_price: entryPrice,
        tp_target: tpTarget,
        sl_target: slTarget,
        predicted_return: pick.predictedReturn,
        holding_days: pick.holdingDays,
        status: "pending" as const,
        expires_at: expiresAt.toISOString(),
      };
    })
    .filter((t) => t.entry_price > 0);

  let autoTradeCount = 0;
  if (autoTradeRows.length > 0) {
    try {
      await saveAutoTrades(autoTradeRows);
      autoTradeCount = autoTradeRows.length;
    } catch (err) {
      console.error("자동매매 저장 실패:", err);
    }
  }

  return NextResponse.json({
    success: true,
    batch: "final",
    cycleId,
    totalPredictions: predictions.length,
    autoTrades: autoTradeCount,
    generatedAt: new Date().toISOString(),
  });
}

// ─── fire-and-forget 유틸 ──────────────────────────────────────────────────

function fireAndForget(url: string) {
  console.log(`[chain] → ${url}`);
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }).catch((err) => {
    console.error(`체이닝 호출 실패 (${url}):`, err);
  });
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
