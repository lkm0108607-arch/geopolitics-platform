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

// ─── Yahoo Finance 심볼 매핑 ──────────────────────────────────────────────────

// 주요 글로벌 자산
const GLOBAL_SYMBOL_TO_ASSET: Record<string, string> = {
  "^KS11": "kospi",
  "^GSPC": "sp500",
  "^IXIC": "nasdaq",
  "^KQ11": "kosdaq",
  "DX-Y.NYB": "dxy",
  "GC=F": "gold",
  "CL=F": "wti-oil",
  "HG=F": "copper",
  "KRW=X": "usd-krw",
  "JPY=X": "usd-jpy",
  "^TNX": "us-10y-yield",
};

// 국내 ETF 전종목 — koreanETFs 데이터베이스에서 자동 생성
function buildETFSymbolMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const etf of koreanETFs) {
    const yahooSymbol = `${etf.ticker}.KS`;
    // assetId: ticker를 그대로 사용 (예: "069500", "091160")
    map[yahooSymbol] = `etf-${etf.ticker}`;
  }
  return map;
}

const ETF_SYMBOL_TO_ASSET = buildETFSymbolMap();

// 전체 심볼 매핑 (글로벌 + ETF)
const SYMBOL_TO_ASSET: Record<string, string> = {
  ...GLOBAL_SYMBOL_TO_ASSET,
  ...ETF_SYMBOL_TO_ASSET,
};

const ASSET_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(SYMBOL_TO_ASSET).map(([sym, asset]) => [asset, sym]),
);

// Yahoo Finance에서 지원되는 자산 ID 목록
const YAHOO_ASSET_IDS = Object.values(SYMBOL_TO_ASSET);

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

    // 1. Yahoo Finance에서 시장 데이터 가져오기 + 거시경제 데이터 수집
    const symbols = Object.keys(SYMBOL_TO_ASSET);
    const [yahooData, collectedData] = await Promise.all([
      fetchYahooHistorical(symbols),
      collectAllData().catch((err) => {
        console.error("거시경제 데이터 수집 실패 (계속 진행):", err);
        return null;
      }),
    ]);

    // 2. 현재 모델 가중치 조회
    const weights = await getModelWeights();

    // 3. 사용 가능한 자산 데이터 수집 (Yahoo + Supabase 히스토리 보완)
    const assetDataMap: Record<string, PriceBar[]> = {};

    for (const assetId of YAHOO_ASSET_IDS) {
      // Yahoo에서 가져온 데이터가 있으면 사용
      if (yahooData[assetId] && yahooData[assetId].length >= 20) {
        assetDataMap[assetId] = yahooData[assetId];

        // 최신 가격을 market_snapshots에 저장
        const latestBar = yahooData[assetId][yahooData[assetId].length - 1];
        const prevBar =
          yahooData[assetId].length >= 2
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
        } catch {
          // 스냅샷 저장 실패는 예측에 영향 주지 않음
        }
      } else {
        // Yahoo 데이터가 부족하면 Supabase에서 보완
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
          // Supabase 히스토리 없으면 건너뛰기
        }
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
