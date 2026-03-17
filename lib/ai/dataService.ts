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
  accuracy_score?: number | null;
  grade?: string | null;
  abstained?: boolean | null;
  evaluated_at?: string;
}

// ─── 누적 메모리 타입 (Phase 2) ──────────────────────────────────────────────

export interface ModelAccuracyRow {
  id?: string;
  asset_id: string;
  model_name: string;
  total_predictions: number;
  correct_predictions: number;
  accuracy_ema: number;
  avg_confidence_when_correct?: number | null;
  avg_confidence_when_wrong?: number | null;
  best_regime?: string | null;
  worst_regime?: string | null;
  last_updated_at?: string;
}

export interface ConfidenceCalibrationRow {
  id?: string;
  model_name: string;
  confidence_bucket: number;
  total_predictions: number;
  correct_predictions: number;
  actual_hit_rate: number;
  last_updated_at?: string;
}

export interface RegimeHistoryRow {
  id?: string;
  detected_at?: string;
  regime: string;
  regime_confidence: number;
  kospi_atr_percent?: number | null;
  avg_model_accuracy?: number | null;
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

/**
 * 시장 스냅샷을 일괄 저장한다. (배치 predict용)
 */
export async function saveMarketSnapshotsBatch(
  snapshots: {
    assetId: string;
    closePrice: number;
    highPrice?: number;
    lowPrice?: number;
    volume?: number;
    changePercent?: number;
  }[],
): Promise<void> {
  if (snapshots.length === 0) return;

  const now = new Date().toISOString();
  const rows = snapshots.map((s) => ({
    asset_id: s.assetId,
    close_price: s.closePrice,
    high_price: s.highPrice ?? null,
    low_price: s.lowPrice ?? null,
    volume: s.volume ?? null,
    change_percent: s.changePercent ?? null,
    recorded_at: now,
  }));

  // 50개씩 분할 삽입
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from("market_snapshots").insert(chunk);
    if (error) console.error(`스냅샷 배치 저장 실패 (${i}~):`, error.message);
  }
}

/**
 * 여러 자산의 히스토리를 한 번에 조회한다. (배치 predict용)
 * 결과: { [assetId]: MarketSnapshotRow[] }
 */
export async function getMarketHistoryBatch(
  assetIds: string[],
  days: number = 90,
): Promise<Record<string, MarketSnapshotRow[]>> {
  const result: Record<string, MarketSnapshotRow[]> = {};
  if (assetIds.length === 0) return result;

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Supabase .in() 최대 제한 고려, 50개씩 분할
  const CHUNK = 50;
  for (let i = 0; i < assetIds.length; i += CHUNK) {
    const chunk = assetIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("market_snapshots")
      .select("*")
      .in("asset_id", chunk)
      .gte("recorded_at", since.toISOString())
      .order("recorded_at", { ascending: true });

    if (error) {
      console.error(`히스토리 배치 조회 실패:`, error.message);
      continue;
    }

    for (const row of (data ?? []) as MarketSnapshotRow[]) {
      if (!result[row.asset_id]) result[row.asset_id] = [];
      result[row.asset_id].push(row);
    }
  }

  return result;
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
  abstained?: boolean;
  abstainReason?: string;
}): Promise<AIPredictionRow> {
  // timingPrediction, debateResult, juryVerdict, abstained를 sub_model_votes JSON에 함께 저장
  const extendedVotes = {
    ...(prediction.subModelVotes as unknown as Record<string, unknown>),
    ...(prediction.timingPrediction ? { timingPrediction: prediction.timingPrediction } : {}),
    ...(prediction.debateResult ? { debateResult: prediction.debateResult } : {}),
    ...(prediction.juryVerdict ? { juryVerdict: prediction.juryVerdict } : {}),
    ...(prediction.abstained ? { abstained: true, abstainReason: prediction.abstainReason } : {}),
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

  // 같은 cycle_id + asset_id에 이미 예측이 있는지 확인
  const { data: existing } = await supabase
    .from("ai_predictions")
    .select("id")
    .eq("cycle_id", prediction.cycleId)
    .eq("asset_id", prediction.assetId);

  if (existing && existing.length > 0) {
    // 이미 평가된 예측이 있으면 삭제하지 않고 스킵 (고아 결과 방지)
    const existingIds = existing.map((e) => e.id);
    const { data: hasResults } = await supabase
      .from("prediction_results")
      .select("prediction_id")
      .in("prediction_id", existingIds)
      .limit(1);

    if (hasResults && hasResults.length > 0) {
      // 이미 평가됨 → 기존 예측 유지, 새로 저장하지 않음
      return existing[0] as unknown as AIPredictionRow;
    }

    // 미평가 예측만 삭제 후 재생성
    await supabase
      .from("ai_predictions")
      .delete()
      .eq("cycle_id", prediction.cycleId)
      .eq("asset_id", prediction.assetId);
  }

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

  if (latestError || !latest) {
    console.warn("[getLatestPredictions] 최신 예측 사이클 없음:", latestError?.message ?? "데이터 없음");
    return [];
  }

  const { data, error } = await supabase
    .from("ai_predictions")
    .select("*")
    .eq("cycle_id", latest.cycle_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`예측 조회 실패: ${error.message}`);
  return (data ?? []) as AIPredictionRow[];
}

/**
 * 아직 평가되지 않은 예측을 조회한다.
 * prediction_results에 해당 prediction_id가 없는 예측만 반환.
 * 최근 7일 이내 예측 중에서 검색하며, 가장 오래된 미평가 사이클부터 반환.
 */
export async function getUnevaluatedPredictions(): Promise<AIPredictionRow[]> {
  // 1. 최근 7일간 고유 사이클 목록 조회 (전체 예측을 가져오면 1000행 제한에 걸림)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 오늘 사이클은 아직 예측 진행중일 수 있으므로 제외 (어제 이전 사이클만 평가)
  const todayCycleId = `ai-cycle-${new Date().toISOString().slice(0, 10)}`;

  const { data: cycleSample, error: csErr } = await supabase
    .from("ai_predictions")
    .select("cycle_id")
    .gte("created_at", sevenDaysAgo.toISOString())
    .neq("cycle_id", todayCycleId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (csErr || !cycleSample || cycleSample.length === 0) {
    // 어제 이전 사이클이 없으면 오늘 사이클 포함해서 재시도
    console.log("[getUnevaluatedPredictions] 어제 이전 사이클 없음, 오늘 포함 재시도");
    const { data: fallbackSample } = await supabase
      .from("ai_predictions")
      .select("cycle_id")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true })
      .limit(500);

    if (!fallbackSample || fallbackSample.length === 0) {
      console.warn("[getUnevaluatedPredictions] 최근 7일간 예측이 없습니다.");
      return [];
    }
    // fallback으로 진행
    return findUnevaluatedInCycles(fallbackSample);
  }

  return findUnevaluatedInCycles(cycleSample);
}

/** 사이클 목록에서 미평가 사이클을 찾아 해당 예측을 반환 */
async function findUnevaluatedInCycles(
  cycleSample: { cycle_id: string }[],
): Promise<AIPredictionRow[]> {
  const uniqueCycles = [...new Set(cycleSample.map((c) => c.cycle_id))];

  // 2. 각 사이클별로 미평가 예측이 있는지 확인 (가장 오래된 것부터)
  for (const cycleId of uniqueCycles) {
    const { data: cyclePreds } = await supabase
      .from("ai_predictions")
      .select("*")
      .eq("cycle_id", cycleId)
      .order("created_at", { ascending: false });

    if (!cyclePreds || cyclePreds.length === 0) continue;

    // 중복 자산 제거 (같은 asset_id → 가장 최신 것만)
    const assetMap = new Map<string, AIPredictionRow>();
    for (const p of cyclePreds as AIPredictionRow[]) {
      if (!assetMap.has(p.asset_id)) {
        assetMap.set(p.asset_id, p);
      }
    }
    const dedupedPreds = Array.from(assetMap.values());

    // 이 사이클의 예측 중 평가된 것 확인
    const predIds = dedupedPreds.map((p) => p.id!).filter(Boolean);
    const evaluatedIds = new Set<string>();

    const CHUNK = 50;
    for (let i = 0; i < predIds.length; i += CHUNK) {
      const chunk = predIds.slice(i, i + CHUNK);
      const { data: results } = await supabase
        .from("prediction_results")
        .select("prediction_id")
        .in("prediction_id", chunk);

      if (results) {
        for (const r of results) {
          evaluatedIds.add((r as { prediction_id: string }).prediction_id);
        }
      }
    }

    const unevaluated = dedupedPreds.filter((p) => p.id && !evaluatedIds.has(p.id));

    if (unevaluated.length > 0) {
      console.log(
        `[getUnevaluatedPredictions] 미평가 사이클 ${cycleId} 발견: ` +
        `${unevaluated.length}건 미평가 / ${dedupedPreds.length}건 총 (중복 제거 후)`,
      );
      return unevaluated;
    }
  }

  console.warn("[getUnevaluatedPredictions] 모든 사이클 평가 완료.");
  return [];
}

// ─── Prediction Results ───────────────────────────────────────────────────────

/**
 * 예측 평가 결과를 저장한다.
 * 같은 prediction_id에 대한 결과가 이미 있으면 중복 저장하지 않는다.
 */
export async function savePredictionResult(result: {
  predictionId: string;
  cycleId: string;
  assetId: string;
  predictedDirection: string;
  actualDirection: string;
  wasCorrect: boolean;
  actualChangePercent?: number;
  accuracyScore?: number;
  grade?: string;
  abstained?: boolean;
}): Promise<PredictionResultRow> {
  // 이미 평가된 예측인지 확인 (중복 결과 방지)
  const { data: existing } = await supabase
    .from("prediction_results")
    .select("id")
    .eq("prediction_id", result.predictionId)
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0] as unknown as PredictionResultRow;
  }

  const row: Record<string, unknown> = {
    prediction_id: result.predictionId,
    cycle_id: result.cycleId,
    asset_id: result.assetId,
    predicted_direction: result.predictedDirection,
    actual_direction: result.actualDirection,
    was_correct: result.wasCorrect,
    actual_change_percent: result.actualChangePercent ?? null,
  };

  // 새 필드 추가 (컬럼이 없으면 fallback으로 무시됨)
  if (result.accuracyScore !== undefined) row.accuracy_score = result.accuracyScore;
  if (result.grade) row.grade = result.grade;
  if (result.abstained !== undefined) row.abstained = result.abstained;

  let { data, error } = await supabase
    .from("prediction_results")
    .insert(row)
    .select()
    .single();

  // accuracy_score/grade/abstained 컬럼이 없으면 기본 필드만으로 재시도
  if (error) {
    const fallbackRow = {
      prediction_id: result.predictionId,
      cycle_id: result.cycleId,
      asset_id: result.assetId,
      predicted_direction: result.predictedDirection,
      actual_direction: result.actualDirection,
      was_correct: result.wasCorrect,
      actual_change_percent: result.actualChangePercent ?? null,
    };
    ({ data, error } = await supabase
      .from("prediction_results")
      .insert(fallbackRow)
      .select()
      .single());
  }

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

// ─── Auto Trades ─────────────────────────────────────────────────────────────

export interface AutoTradeRow {
  id?: string;
  cycle_id: string;
  asset_id: string;
  name: string;
  signal: string;
  weight: number;
  entry_price: number;
  tp_target: number;
  sl_target: number;
  predicted_return: number;
  holding_days: number;
  status: "pending" | "filled" | "tp_hit" | "sl_hit" | "expired" | "cancelled";
  fill_price?: number | null;
  fill_date?: string | null;
  exit_price?: number | null;
  exit_date?: string | null;
  exit_reason?: string | null;  // '익절' | '손절' | '기간종료'
  actual_return?: number | null;
  exit_day?: number | null;
  created_at?: string;
  updated_at?: string;
  expires_at: string;
}

/**
 * 자동매매 거래를 일괄 저장한다. (cycle_id + asset_id 중복 시 무시)
 */
export async function saveAutoTrades(
  trades: Omit<AutoTradeRow, "id" | "created_at" | "updated_at">[],
): Promise<AutoTradeRow[]> {
  if (trades.length === 0) return [];

  const rows = trades.map((t) => ({
    cycle_id: t.cycle_id,
    asset_id: t.asset_id,
    name: t.name,
    signal: t.signal,
    weight: t.weight,
    entry_price: t.entry_price,
    tp_target: t.tp_target,
    sl_target: t.sl_target,
    predicted_return: t.predicted_return,
    holding_days: t.holding_days,
    status: t.status,
    expires_at: t.expires_at,
  }));

  const { data, error } = await supabase
    .from("auto_trades")
    .upsert(rows, { onConflict: "cycle_id,asset_id", ignoreDuplicates: true })
    .select();

  if (error) throw new Error(`자동매매 저장 실패: ${error.message}`);
  return (data ?? []) as AutoTradeRow[];
}

/**
 * 활성 상태(pending/filled)인 자동매매를 조회한다.
 */
export async function getActiveAutoTrades(): Promise<AutoTradeRow[]> {
  const { data, error } = await supabase
    .from("auto_trades")
    .select("*")
    .in("status", ["pending", "filled"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(`활성 자동매매 조회 실패: ${error.message}`);
  return (data ?? []) as AutoTradeRow[];
}

/**
 * 자동매매 거래를 업데이트한다.
 */
export async function updateAutoTrade(
  id: string,
  updates: Partial<Pick<AutoTradeRow, "status" | "fill_price" | "fill_date" | "exit_price" | "exit_date" | "exit_reason" | "actual_return" | "exit_day">>,
): Promise<void> {
  const { error } = await supabase
    .from("auto_trades")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`자동매매 업데이트 실패: ${error.message}`);
}

/**
 * 특정 기간의 자동매매 거래를 조회한다.
 */
export async function getAutoTradesForWeek(
  weekStart: string,
  weekEnd: string,
): Promise<AutoTradeRow[]> {
  const { data, error } = await supabase
    .from("auto_trades")
    .select("*")
    .gte("created_at", weekStart)
    .lte("created_at", weekEnd)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`주간 자동매매 조회 실패: ${error.message}`);
  return (data ?? []) as AutoTradeRow[];
}

/**
 * 최신 사이클의 자동매매 거래를 조회한다.
 */
export async function getLatestAutoTrades(): Promise<AutoTradeRow[]> {
  // 가장 최근 cycle_id 조회
  const { data: latest } = await supabase
    .from("auto_trades")
    .select("cycle_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return [];

  const { data, error } = await supabase
    .from("auto_trades")
    .select("*")
    .eq("cycle_id", latest.cycle_id)
    .order("weight", { ascending: false });

  if (error) throw new Error(`최신 자동매매 조회 실패: ${error.message}`);
  return (data ?? []) as AutoTradeRow[];
}

// ─── 정확도 통계 ──────────────────────────────────────────────────────────────

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

// ─── Phase 2: 누적 메모리 인프라 ─────────────────────────────────────────────

/**
 * 자산별 모델별 누적 정확도를 업데이트한다.
 * EMA(지수이동평균) 방식으로 최근 성과에 가중치를 둔다.
 */
export async function upsertModelAccuracy(
  assetId: string,
  modelName: string,
  wasCorrect: boolean,
  confidence: number,
  regime: string,
): Promise<void> {
  const EMA_ALPHA = 0.1; // EMA 가중치 (최근 값 10% 반영)

  try {
    // 기존 데이터 조회
    const { data: existing } = await supabase
      .from("model_accuracy_history")
      .select("*")
      .eq("asset_id", assetId)
      .eq("model_name", modelName)
      .single();

    if (existing) {
      const row = existing as ModelAccuracyRow;
      const newTotal = row.total_predictions + 1;
      const newCorrect = row.correct_predictions + (wasCorrect ? 1 : 0);
      const newEMA = row.accuracy_ema * (1 - EMA_ALPHA) + (wasCorrect ? 1 : 0) * EMA_ALPHA;

      // 정답/오답 시 평균 confidence 업데이트
      const updates: Record<string, unknown> = {
        total_predictions: newTotal,
        correct_predictions: newCorrect,
        accuracy_ema: Math.round(newEMA * 1000) / 1000,
        last_updated_at: new Date().toISOString(),
      };

      if (wasCorrect) {
        const prevAvg = row.avg_confidence_when_correct ?? confidence;
        const prevCount = row.correct_predictions;
        updates.avg_confidence_when_correct = prevCount > 0
          ? Math.round(((prevAvg * prevCount + confidence) / (prevCount + 1)) * 100) / 100
          : confidence;
      } else {
        const prevAvg = row.avg_confidence_when_wrong ?? confidence;
        const prevWrongCount = row.total_predictions - row.correct_predictions;
        updates.avg_confidence_when_wrong = prevWrongCount > 0
          ? Math.round(((prevAvg * prevWrongCount + confidence) / (prevWrongCount + 1)) * 100) / 100
          : confidence;
      }

      await supabase
        .from("model_accuracy_history")
        .update(updates)
        .eq("asset_id", assetId)
        .eq("model_name", modelName);
    } else {
      // 새 레코드 생성
      await supabase
        .from("model_accuracy_history")
        .insert({
          asset_id: assetId,
          model_name: modelName,
          total_predictions: 1,
          correct_predictions: wasCorrect ? 1 : 0,
          accuracy_ema: wasCorrect ? 1.0 : 0.0,
          avg_confidence_when_correct: wasCorrect ? confidence : null,
          avg_confidence_when_wrong: wasCorrect ? null : confidence,
          best_regime: wasCorrect ? regime : null,
          worst_regime: wasCorrect ? null : regime,
        });
    }
  } catch {
    // 테이블이 없으면 무시
  }
}

/**
 * 여러 자산의 모델 정확도를 배치 조회한다.
 */
export async function getModelAccuracyBatch(
  assetIds: string[],
): Promise<Record<string, ModelAccuracyRow[]>> {
  const result: Record<string, ModelAccuracyRow[]> = {};
  if (assetIds.length === 0) return result;

  try {
    const { data, error } = await supabase
      .from("model_accuracy_history")
      .select("*")
      .in("asset_id", assetIds);

    if (error || !data) return result;

    for (const row of data as ModelAccuracyRow[]) {
      if (!result[row.asset_id]) result[row.asset_id] = [];
      result[row.asset_id].push(row);
    }
  } catch {
    // 테이블이 없으면 빈 결과 반환
  }
  return result;
}

/**
 * 신뢰도 교정 데이터를 업데이트한다.
 */
export async function upsertConfidenceCalibration(
  modelName: string,
  confidenceBucket: number,
  wasCorrect: boolean,
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from("confidence_calibration")
      .select("*")
      .eq("model_name", modelName)
      .eq("confidence_bucket", confidenceBucket)
      .single();

    if (existing) {
      const row = existing as ConfidenceCalibrationRow;
      const newTotal = row.total_predictions + 1;
      const newCorrect = row.correct_predictions + (wasCorrect ? 1 : 0);
      const newHitRate = newTotal > 0 ? newCorrect / newTotal : 0;

      await supabase
        .from("confidence_calibration")
        .update({
          total_predictions: newTotal,
          correct_predictions: newCorrect,
          actual_hit_rate: Math.round(newHitRate * 1000) / 1000,
          last_updated_at: new Date().toISOString(),
        })
        .eq("model_name", modelName)
        .eq("confidence_bucket", confidenceBucket);
    } else {
      await supabase
        .from("confidence_calibration")
        .insert({
          model_name: modelName,
          confidence_bucket: confidenceBucket,
          total_predictions: 1,
          correct_predictions: wasCorrect ? 1 : 0,
          actual_hit_rate: wasCorrect ? 1.0 : 0.0,
        });
    }
  } catch {
    // 테이블이 없으면 무시
  }
}

/**
 * 특정 모델의 신뢰도 교정 커브를 조회한다.
 */
export async function getConfidenceCalibration(
  modelName: string,
): Promise<ConfidenceCalibrationRow[]> {
  try {
    const { data, error } = await supabase
      .from("confidence_calibration")
      .select("*")
      .eq("model_name", modelName)
      .order("confidence_bucket", { ascending: true });

    if (error || !data) return [];
    return data as ConfidenceCalibrationRow[];
  } catch {
    return [];
  }
}

/**
 * 시장 레짐 감지 기록을 저장한다.
 */
export async function saveRegimeDetection(
  regime: string,
  confidence: number,
  atrPercent?: number,
  accuracy?: number,
): Promise<void> {
  try {
    await supabase
      .from("regime_history")
      .insert({
        regime,
        regime_confidence: confidence,
        kospi_atr_percent: atrPercent ?? null,
        avg_model_accuracy: accuracy ?? null,
      });
  } catch {
    // 테이블이 없으면 무시
  }
}
