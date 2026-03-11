import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  getLearningLogs,
  getPredictionAccuracy,
} from "@/lib/ai/dataService";

// ─── GET: AI 히스토리 조회 ────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // 1. 최근 예측 + 결과 (prediction_results JOIN ai_predictions)
    let predictionsQuery = supabase
      .from("ai_predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (assetId) {
      predictionsQuery = predictionsQuery.eq("asset_id", assetId);
    }

    const { data: predictions, error: predError } = await predictionsQuery;
    if (predError) {
      throw new Error(`예측 조회 실패: ${predError.message}`);
    }

    // 예측 ID로 결과 매핑
    const predictionIds = (predictions ?? [])
      .map((p: Record<string, unknown>) => p.id as string)
      .filter(Boolean);

    let results: Record<string, unknown>[] = [];
    if (predictionIds.length > 0) {
      const { data: resultData, error: resultError } = await supabase
        .from("prediction_results")
        .select("*")
        .in("prediction_id", predictionIds);

      if (!resultError && resultData) {
        results = resultData;
      }
    }

    // 예측과 결과를 합침 (camelCase로 변환)
    const resultMap = new Map<string, Record<string, unknown>>();
    for (const r of results) {
      resultMap.set(r.prediction_id as string, r);
    }

    const predictionsWithResults = (predictions ?? []).map(
      (pred: Record<string, unknown>) => {
        const result = resultMap.get(pred.id as string);
        return {
          cycleId: pred.cycle_id as string,
          assetId: pred.asset_id as string,
          direction: pred.direction as string,
          probability: pred.probability as number,
          confidence: pred.confidence as number,
          rationale: pred.rationale as string,
          generatedAt: (pred.created_at as string) ?? null,
          actualDirection: result ? (result.actual_direction as string) : null,
          correct: result ? (result.was_correct as boolean) : null,
          evaluatedAt: result ? (result.evaluated_at as string) : null,
        };
      },
    );

    // 2. 모델 가중치 히스토리
    const { data: weightHistory, error: weightError } = await supabase
      .from("model_weights")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (weightError) {
      console.error("가중치 히스토리 조회 실패:", weightError.message);
    }

    // 3. 학습 로그
    const learningLogs = await getLearningLogs(limit);

    // 4. 정확도 통계
    const rawAccuracy = await getPredictionAccuracy(assetId, 200);

    // averageConfidence 계산
    const allPreds = predictions ?? [];
    const avgConf =
      allPreds.length > 0
        ? allPreds.reduce(
            (sum: number, p: Record<string, unknown>) =>
              sum + (p.confidence as number),
            0,
          ) / allPreds.length
        : 0;

    const accuracy = {
      ...rawAccuracy,
      averageConfidence: Math.round(avgConf * 10) / 10,
    };

    // 5. 자산별 정확도 (assetId가 지정되지 않은 경우만)
    let assetAccuracies: Record<
      string,
      { total: number; correct: number; accuracy: number }
    > = {};

    if (!assetId) {
      const { data: allResults, error: allResultsError } = await supabase
        .from("prediction_results")
        .select("asset_id, was_correct")
        .order("evaluated_at", { ascending: false })
        .limit(500);

      if (!allResultsError && allResults) {
        for (const r of allResults) {
          const aid = r.asset_id as string;
          if (!assetAccuracies[aid]) {
            assetAccuracies[aid] = { total: 0, correct: 0, accuracy: 0 };
          }
          assetAccuracies[aid].total++;
          if (r.was_correct) assetAccuracies[aid].correct++;
        }

        for (const aid of Object.keys(assetAccuracies)) {
          const a = assetAccuracies[aid];
          a.accuracy =
            a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0;
        }
      }
    }

    // camelCase 변환: learningLogs
    const mappedLearningLogs = learningLogs.map((log) => ({
      cycleId: log.cycle_id,
      timestamp: log.created_at ?? "",
      adjustments: JSON.stringify(log.weight_adjustment),
      reason: log.lesson,
    }));

    // camelCase 변환: weightHistory
    const mappedWeightHistory = (weightHistory ?? []).map(
      (w: Record<string, unknown>) => ({
        cycleId: (w.reason as string) ?? "",
        timestamp: (w.updated_at as string) ?? "",
        weights: {
          momentum: w.momentum_weight as number,
          meanReversion: w.mean_reversion_weight as number,
          volatility: w.volatility_weight as number,
          correlation: w.correlation_weight as number,
          fundamental: (w.fundamental_weight as number) ?? 0.2,
        },
      }),
    );

    return NextResponse.json({
      success: true,
      queriedAt: new Date().toISOString(),
      filters: { assetId: assetId ?? "all", limit },
      results: predictionsWithResults,
      weightHistory: mappedWeightHistory,
      learningLogs: mappedLearningLogs,
      accuracy,
      assetAccuracies: assetId ? undefined : assetAccuracies,
    });
  } catch (err) {
    console.error("AI 히스토리 조회 오류:", err);
    return NextResponse.json(
      {
        success: false,
        error: "AI 히스토리 조회 중 오류가 발생했습니다.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
