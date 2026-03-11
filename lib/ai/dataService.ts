/**
 * AI 예측 시스템 – Supabase 데이터 접근 레이어
 *
 * market_snapshots, ai_predictions, prediction_results,
 * model_weights, learning_logs 테이블에 대한 CRUD 함수를 제공한다.
 */

import { supabase } from "@/lib/supabase";
import type { EnsembleConfig, SubModelVotes } from "./ensemble";

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

export interface MarketSnapshotRow {
  id?: string;
  asset_id: string;
  close_price: number;
  high_price?: number | null;
  low_price?: number | null;
  volume?: number | null;
  change_percent?: number | null;
  recorded_at: string; // ISO timestamptz
  created_at?: string;
}

export interface AIPredictionRow {
  id?: string;
  cycle_id: string;
  asset_id: string;
  direction: string;
  probability: number;
  confidence: number;
  rationale: string;
  sub_model_votes: SubModelVotes;
  created_at?: string;
}

export interface PredictionResultRow {
  id?: string;
  prediction_id: string;
  cycle_id: string;
  asset_id: string;
  predicted_direction: string;
  actual_direction: string;
  was_correct: boolean;
  actual_change_percent?: number | null;
  evaluated_at?: string;
}

export interface ModelWeightsRow {
  id?: string;
  asset_id?: string | null;  // null = 글로벌, 'etf-069500' = 자산별 개별 가중치
  momentum_weight: number;
  mean_reversion_weight: number;
  volatility_weight: number;
  correlation_weight: number;
  fundamental_weight?: number;
  updated_at?: string;
  reason?: string | null;
}

export interface LearningLogRow {
  id?: string;
  cycle_id: string;
  asset_id: string;
  lesson: string;
  missed_factors: string[];
  model_performance: Record<string, boolean>;
  weight_adjustment: Record<string, number>;
  created_at?: string;
}

// ─── Market Snapshots ─────────────────────────────────────────────────────────

/**
 * 시장 스냅샷을 저장한다.
 */
export async function saveMarketSnapshot(
  assetId: string,
  data: {
    closePrice: number;
    highPrice?: number;
    lowPrice?: number;
    volume?: number;
    changePercent?: number;
    recordedAt?: string;
  },
): Promise<MarketSnapshotRow> {
  const row: Omit<MarketSnapshotRow, "id" | "created_at"> = {
    asset_id: assetId,
    close_price: data.closePrice,
    high_price: data.highPrice ?? null,
    low_price: data.lowPrice ?? null,
    volume: data.volume ?? null,
    change_percent: data.changePercent ?? null,
    recorded_at: data.recordedAt ?? new Date().toISOString(),
  };

  const { data: inserted, error } = await supabase
    .from("market_snapshots")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`시장 스냅샷 저장 실패: ${error.message}`);
  return inserted as MarketSnapshotRow;
}

/**
 * 특정 자산의 최근 N일 가격 히스토리를 조회한다.
 */
export async function getMarketHistory(
  assetId: string,
  days: number = 90,
): Promise<MarketSnapshotRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("market_snapshots")
    .select("*")
    .eq("asset_id", assetId)
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: true });

  if (error) throw new Error(`시장 히스토리 조회 실패: ${error.message}`);
  return (data ?? []) as MarketSnapshotRow[];
}

// ─── AI Predictions ───────────────────────────────────────────────────────────

/**
 * AI 예측을 저장한다.
 */
export async function savePrediction(prediction: {
  cycleId: string;
  assetId: string;
  direction: string;
  probability: number;
  confidence: number;
  rationale: string;
  subModelVotes: SubModelVotes;
  timingPrediction?: unknown;
  debateResult?: unknown;
  juryVerdict?: unknown;
}): Promise<AIPredictionRow> {
  // timingPrediction, debateResult, juryVerdict를 sub_model_votes JSON에 함께 저장
  const extendedVotes = {
    ...(prediction.subModelVotes as unknown as Record<string, unknown>),
    ...(prediction.timingPrediction ? { timingPrediction: prediction.timingPrediction } : {}),
    ...(prediction.debateResult ? { debateResult: prediction.debateResult } : {}),
    ...(prediction.juryVerdict ? { juryVerdict: prediction.juryVerdict } : {}),
  };
  const row = {
    cycle_id: prediction.cycleId,
    asset_id: prediction.assetId,
    direction: prediction.direction,
    probability: prediction.probability,
    confidence: prediction.confidence,
    rationale: prediction.rationale,
    sub_model_votes: extendedVotes,
  };

  // 같은 cycle_id + asset_id 조합이 이미 있으면 덮어쓰기 (중복 방지)
  // Supabase upsert는 unique constraint가 필요하므로, 먼저 삭제 후 삽입
  await supabase
    .from("ai_predictions")
    .delete()
    .eq("cycle_id", prediction.cycleId)
    .eq("asset_id", prediction.assetId);

  const { data, error } = await supabase
    .from("ai_predictions")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`예측 저장 실패: ${error.message}`);
  return data as AIPredictionRow;
}

/**
 * 최신 예측을 조회한다. cycleId가 주어지면 해당 사이클만, 아니면 가장 최근 사이클.
 */
export async function getLatestPredictions(
  cycleId?: string,
): Promise<AIPredictionRow[]> {
  if (cycleId) {
    const { data, error } = await supabase
      .from("ai_predictions")
      .select("*")
      .eq("cycle_id", cycleId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`예측 조회 실패: ${error.message}`);
    return (data ?? []) as AIPredictionRow[];
  }

  // cycleId가 없으면 가장 최근 사이클의 예측을 가져온다
  const { data: latest, error: latestError } = await supabase
    .from("ai_predictions")
    .select("cycle_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (latestError || !latest) return [];

  const { data, error } = await supabase
    .from("ai_predictions")
    .select("*")
    .eq("cycle_id", latest.cycle_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`예측 조회 실패: ${error.message}`);
  return (data ?? []) as AIPredictionRow[];
}

// ─── Prediction Results ───────────────────────────────────────────────────────

/**
 * 예측 평가 결과를 저장한다.
 */
export async function savePredictionResult(result: {
  predictionId: string;
  cycleId: string;
  assetId: string;
  predictedDirection: string;
  actualDirection: string;
  wasCorrect: boolean;
  actualChangePercent?: number;
}): Promise<PredictionResultRow> {
  const row = {
    prediction_id: result.predictionId,
    cycle_id: result.cycleId,
    asset_id: result.assetId,
    predicted_direction: result.predictedDirection,
    actual_direction: result.actualDirection,
    was_correct: result.wasCorrect,
    actual_change_percent: result.actualChangePercent ?? null,
  };

  const { data, error } = await supabase
    .from("prediction_results")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`예측 결과 저장 실패: ${error.message}`);
  return data as PredictionResultRow;
}

// ─── Model Weights ────────────────────────────────────────────────────────────

/** 기본 가중치 (자산별 데이터가 없을 때 fallback) */
const DEFAULT_WEIGHTS: EnsembleConfig = {
  momentumWeight: 0.25,
  meanReversionWeight: 0.20,
  volatilityWeight: 0.15,
  correlationWeight: 0.20,
  fundamentalWeight: 0.20,
};

/**
 * 앙상블 가중치를 조회한다.
 * assetId가 주어지면 해당 자산의 개별 가중치를 조회하고,
 * 없으면 글로벌 가중치 → 기본값 순으로 fallback.
 */
export async function getModelWeights(assetId?: string): Promise<EnsembleConfig> {
  // 1. 자산별 가중치 조회 시도
  if (assetId) {
    try {
      const { data, error } = await supabase
        .from("model_weights")
        .select("*")
        .eq("asset_id", assetId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        const row = data as ModelWeightsRow;
        return {
          momentumWeight: Number(row.momentum_weight),
          meanReversionWeight: Number(row.mean_reversion_weight),
          volatilityWeight: Number(row.volatility_weight),
          correlationWeight: Number(row.correlation_weight),
          fundamentalWeight: Number(row.fundamental_weight ?? 0.20),
        };
      }
    } catch {
      // asset_id 컬럼이 없을 수 있음 → 글로벌 fallback
    }
  }

  // 2. 글로벌 가중치 fallback (asset_id가 null이거나 없는 행)
  const { data, error } = await supabase
    .from("model_weights")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return { ...DEFAULT_WEIGHTS };

  const row = data as ModelWeightsRow;
  return {
    momentumWeight: Number(row.momentum_weight),
    meanReversionWeight: Number(row.mean_reversion_weight),
    volatilityWeight: Number(row.volatility_weight),
    correlationWeight: Number(row.correlation_weight),
    fundamentalWeight: Number(row.fundamental_weight ?? 0.20),
  };
}

/**
 * 갱신된 앙상블 가중치를 저장한다.
 * assetId가 주어지면 해당 자산의 개별 가중치로 저장,
 * 없으면 글로벌 가중치로 저장.
 */
export async function saveModelWeights(
  weights: EnsembleConfig,
  reason: string,
  assetId?: string,
): Promise<ModelWeightsRow> {
  // asset_id + fundamental_weight 포함 전체 시도
  const fullRow: Record<string, unknown> = {
    momentum_weight: weights.momentumWeight,
    mean_reversion_weight: weights.meanReversionWeight,
    volatility_weight: weights.volatilityWeight,
    correlation_weight: weights.correlationWeight,
    fundamental_weight: weights.fundamentalWeight,
    reason,
  };
  if (assetId) fullRow.asset_id = assetId;

  let { data, error } = await supabase
    .from("model_weights")
    .insert(fullRow)
    .select()
    .single();

  // asset_id 또는 fundamental_weight 컬럼이 없으면 단계별 fallback
  if (error) {
    const fallbackRow: Record<string, unknown> = {
      momentum_weight: weights.momentumWeight,
      mean_reversion_weight: weights.meanReversionWeight,
      volatility_weight: weights.volatilityWeight,
      correlation_weight: weights.correlationWeight,
      reason: assetId ? `[asset:${assetId}] ${reason}` : reason,
    };
    // fundamental_weight 컬럼 시도
    try {
      fallbackRow.fundamental_weight = weights.fundamentalWeight;
      ({ data, error } = await supabase.from("model_weights").insert(fallbackRow).select().single());
    } catch { /* ignore */ }
    // 그래도 실패하면 최소 필드만
    if (error) {
      delete fallbackRow.fundamental_weight;
      ({ data, error } = await supabase.from("model_weights").insert(fallbackRow).select().single());
    }
  }

  if (error) throw new Error(`가중치 저장 실패: ${error.message}`);
  return data as ModelWeightsRow;
}

// ─── Learning Logs ────────────────────────────────────────────────────────────

/**
 * 학습 로그를 저장한다.
 */
export async function saveLearningLog(log: {
  cycleId: string;
  assetId: string;
  lesson: string;
  missedFactors: string[];
  modelPerformance: Record<string, boolean>;
  weightAdjustment: EnsembleConfig;
}): Promise<LearningLogRow> {
  const row = {
    cycle_id: log.cycleId,
    asset_id: log.assetId,
    lesson: log.lesson,
    missed_factors: log.missedFactors,
    model_performance: log.modelPerformance,
    weight_adjustment: {
      momentumWeight: log.weightAdjustment.momentumWeight,
      meanReversionWeight: log.weightAdjustment.meanReversionWeight,
      volatilityWeight: log.weightAdjustment.volatilityWeight,
      correlationWeight: log.weightAdjustment.correlationWeight,
    },
  };

  const { data, error } = await supabase
    .from("learning_logs")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`학습 로그 저장 실패: ${error.message}`);
  return data as LearningLogRow;
}

/**
 * 최근 학습 로그를 조회한다.
 */
export async function getLearningLogs(
  limit: number = 20,
): Promise<LearningLogRow[]> {
  const { data, error } = await supabase
    .from("learning_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`학습 로그 조회 실패: ${error.message}`);
  return (data ?? []) as LearningLogRow[];
}

// ─── 정확도 통계 ──────────────────────────────────────────────────────────────

export interface AccuracyStats {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number; // 0-100
  byDirection: Record<string, { total: number; correct: number; accuracy: number }>;
}

/**
 * 예측 정확도 통계를 계산한다.
 */
export async function getPredictionAccuracy(
  assetId?: string,
  limit: number = 100,
): Promise<AccuracyStats> {
  let query = supabase
    .from("prediction_results")
    .select("*")
    .order("evaluated_at", { ascending: false })
    .limit(limit);

  if (assetId) {
    query = query.eq("asset_id", assetId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`정확도 통계 조회 실패: ${error.message}`);

  const results = (data ?? []) as PredictionResultRow[];
  const totalPredictions = results.length;
  const correctPredictions = results.filter((r) => r.was_correct).length;

  // 방향별 통계
  const byDirection: AccuracyStats["byDirection"] = {};
  for (const r of results) {
    const dir = r.predicted_direction;
    if (!byDirection[dir]) {
      byDirection[dir] = { total: 0, correct: 0, accuracy: 0 };
    }
    byDirection[dir].total++;
    if (r.was_correct) byDirection[dir].correct++;
  }

  for (const dir of Object.keys(byDirection)) {
    const d = byDirection[dir];
    d.accuracy = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
  }

  return {
    totalPredictions,
    correctPredictions,
    accuracy:
      totalPredictions > 0
        ? Math.round((correctPredictions / totalPredictions) * 100)
        : 0,
    byDirection,
  };
}
