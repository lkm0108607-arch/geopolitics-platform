import { NextResponse } from "next/server";
import { learn } from "@/lib/ai/learner";
import type { PredictionOutcome } from "@/lib/ai/learner";
import type { Direction } from "@/lib/ai/models";
import type { AIPrediction, SubModelVotes } from "@/lib/ai/ensemble";
import {
  getLatestPredictions,
  savePredictionResult,
  getModelWeights,
  saveModelWeights,
  saveLearningLog,
} from "@/lib/ai/dataService";
import { ASSET_SYMBOLS, fetchLivePrice } from "@/lib/realtime/priceService";

// ─── 현재 가격 가져오기 (네이버 금융 + Yahoo Finance) ─────────────────────────

interface CurrentPriceData {
  price: number;
  changePercent: number;
  previousClose: number;
}

async function fetchCurrentPriceForAsset(
  assetId: string,
): Promise<CurrentPriceData | null> {
  try {
    const livePrice = await fetchLivePrice(assetId);
    if (!livePrice || livePrice.price <= 0) return null;

    return {
      price: livePrice.price,
      changePercent: livePrice.changePercent,
      previousClose: livePrice.previousClose,
    };
  } catch {
    return null;
  }
}

/**
 * 가격 변동률로부터 방향을 판단한다.
 * +-0.3% 이내는 보합, +-3% 이상이면 변동성확대 가능성 고려.
 */
function determineDirection(changePercent: number): Direction {
  if (Math.abs(changePercent) > 3) return "변동성확대";
  if (changePercent > 0.3) return "상승";
  if (changePercent < -0.3) return "하락";
  return "보합";
}

// ─── POST: 예측 평가 ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetCycleId = (body as Record<string, string>).cycleId ?? undefined;

    // 1. 최근 사이클의 예측 조회
    const predictions = await getLatestPredictions(targetCycleId);

    if (predictions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "평가할 예측이 없습니다. 먼저 POST /api/ai/predict를 실행하세요.",
        },
        { status: 404 },
      );
    }

    const cycleId = predictions[0].cycle_id;

    // 2. 현재 모델 가중치 조회
    let currentWeights = await getModelWeights();

    // 3. 현재 시장 데이터 가져오기 (네이버 금융 + Yahoo Finance)
    const priceResults: Record<string, CurrentPriceData | null> = {};

    // 배치로 가격 조회 (한번에 10개씩)
    const batchSize = 10;
    for (let i = 0; i < predictions.length; i += batchSize) {
      const batch = predictions.slice(i, i + batchSize);
      const pricePromises = batch.map(async (pred) => {
        const priceData = await fetchCurrentPriceForAsset(pred.asset_id);
        priceResults[pred.asset_id] = priceData;
      });
      await Promise.allSettled(pricePromises);
    }

    // 4. 각 예측에 대해 평가 수행
    const evaluationResults = [];
    const learningResults = [];

    for (const pred of predictions) {
      const priceData = priceResults[pred.asset_id];
      if (!priceData) {
        evaluationResults.push({
          assetId: pred.asset_id,
          status: "skipped",
          reason: "현재 시장 데이터를 가져올 수 없음",
        });
        continue;
      }

      const actualDirection = determineDirection(priceData.changePercent);
      const wasCorrect = pred.direction === actualDirection;

      // 예측 결과 저장
      try {
        await savePredictionResult({
          predictionId: pred.id!,
          cycleId,
          assetId: pred.asset_id,
          predictedDirection: pred.direction,
          actualDirection,
          wasCorrect,
          actualChangePercent: priceData.changePercent,
        });
      } catch (err) {
        console.error(`결과 저장 실패 (${pred.asset_id}):`, err);
      }

      // 5. 학습 실행
      const predictionForLearner: AIPrediction = {
        assetId: pred.asset_id,
        direction: pred.direction as Direction,
        probability: pred.probability,
        confidence: pred.confidence,
        rationale: pred.rationale,
        subModelVotes: pred.sub_model_votes as SubModelVotes,
        generatedAt: pred.created_at ?? new Date().toISOString(),
        cycleId: pred.cycle_id,
      };

      const outcome: PredictionOutcome = {
        prediction: predictionForLearner,
        actualDirection,
        actualReturnPercent: priceData.changePercent,
      };

      const learningResult = learn(outcome, currentWeights);
      learningResults.push(learningResult);

      // 가중치 업데이트 (누적)
      currentWeights = learningResult.weightAdjustment;

      // 학습 로그 저장
      try {
        await saveLearningLog({
          cycleId,
          assetId: pred.asset_id,
          lesson: learningResult.lesson,
          missedFactors: learningResult.missedFactors,
          modelPerformance: learningResult.modelPerformance,
          weightAdjustment: learningResult.weightAdjustment,
        });
      } catch (err) {
        console.error(`학습 로그 저장 실패 (${pred.asset_id}):`, err);
      }

      evaluationResults.push({
        assetId: pred.asset_id,
        status: "evaluated",
        predictedDirection: pred.direction,
        actualDirection,
        actualChangePercent: priceData.changePercent,
        wasCorrect,
        lesson: learningResult.lesson,
      });
    }

    // 6. 최종 가중치 저장
    const evaluated = evaluationResults.filter((r) => r.status === "evaluated");
    const correctCount = evaluated.filter(
      (r) => "wasCorrect" in r && r.wasCorrect,
    ).length;
    const accuracy =
      evaluated.length > 0
        ? Math.round((correctCount / evaluated.length) * 100)
        : 0;

    const reason = `사이클 ${cycleId} 평가 완료: 정확도 ${accuracy}% (${correctCount}/${evaluated.length})`;

    try {
      await saveModelWeights(currentWeights, reason);
    } catch (err) {
      console.error("가중치 저장 실패:", err);
    }

    // 7. 응답 반환
    return NextResponse.json({
      success: true,
      cycleId,
      evaluatedAt: new Date().toISOString(),
      summary: {
        totalPredictions: predictions.length,
        evaluated: evaluated.length,
        skipped: evaluationResults.filter((r) => r.status === "skipped").length,
        correct: correctCount,
        accuracy,
      },
      updatedWeights: {
        momentum: currentWeights.momentumWeight,
        meanReversion: currentWeights.meanReversionWeight,
        volatility: currentWeights.volatilityWeight,
        correlation: currentWeights.correlationWeight,
      },
      results: evaluationResults,
    });
  } catch (err) {
    console.error("AI 평가 실행 오류:", err);
    return NextResponse.json(
      {
        success: false,
        error: "AI 예측 평가 중 오류가 발생했습니다.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
