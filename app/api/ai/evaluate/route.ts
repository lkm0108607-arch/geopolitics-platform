import { NextResponse } from "next/server";
import { learn } from "@/lib/ai/learner";
import { isUnlearnableEvent } from "@/lib/ai/learner";
import type { PredictionOutcome } from "@/lib/ai/learner";
import type { Direction } from "@/lib/ai/models";
import type { AIPrediction, EnsembleConfig, SubModelVotes } from "@/lib/ai/ensemble";
import {
  getLatestPredictions,
  getUnevaluatedPredictions,
  savePredictionResult,
  getModelWeights,
  saveModelWeights,
  saveLearningLog,
  upsertModelAccuracy,
  upsertConfidenceCalibration,
} from "@/lib/ai/dataService";
import { ASSET_SYMBOLS, fetchLivePrice } from "@/lib/realtime/priceService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
 * +-0.5% 이내는 보합 (기존 0.3%에서 확대), +-3% 이상이면 변동성확대.
 */
function determineDirection(changePercent: number): Direction {
  if (Math.abs(changePercent) > 3) return "변동성확대";
  if (changePercent > 0.5) return "상승";
  if (changePercent < -0.5) return "하락";
  return "보합";
}

// ─── 등급 기반 정확도 평가 (이진→연속) ───────────────────────────────────────

type AccuracyGrade = "정확" | "부분정확" | "미세오차" | "오답" | "심각오답";

interface GradedScore {
  score: number;      // -0.5 ~ 1.0
  grade: AccuracyGrade;
}

/**
 * 예측 정확도를 등급으로 평가한다.
 *
 * - 정확 (방향 일치 + |변동| > 1%): score=1.0
 * - 부분정확 (방향 일치 + |변동| 0.1~1%): score=0.7
 * - 미세오차 (|변동| < 0.5%): score=0.5
 * - 오답 (반대 방향): score=0.0
 * - 심각오답 (반대 방향 + |변동| > 3%): score=-0.5
 */
function calculateAccuracyScore(
  predictedDirection: string,
  actualChangePercent: number,
): GradedScore {
  const absChange = Math.abs(actualChangePercent);
  const actualDir = determineDirection(actualChangePercent);
  const directionMatch = predictedDirection === actualDir;

  // 미세 변동 (|변동| < 0.5%) → 어느 예측이든 부분적으로 인정
  if (absChange < 0.5) {
    if (predictedDirection === "보합") {
      return { score: 1.0, grade: "정확" };
    }
    return { score: 0.5, grade: "미세오차" };
  }

  // 방향 일치
  if (directionMatch) {
    if (absChange > 1) {
      return { score: 1.0, grade: "정확" };
    }
    return { score: 0.7, grade: "부분정확" };
  }

  // 방향 불일치 - 반대 방향인지 확인
  const isOpposite =
    (predictedDirection === "상승" && actualChangePercent < -0.5) ||
    (predictedDirection === "하락" && actualChangePercent > 0.5);

  if (isOpposite && absChange > 3) {
    return { score: -0.5, grade: "심각오답" };
  }

  return { score: 0.0, grade: "오답" };
}

// ─── 핵심 평가 로직 ──────────────────────────────────────────────────────────

async function runEvaluation(targetCycleId?: string) {
  try {
    // 1. 미평가 예측 조회 (targetCycleId 지정 시 해당 사이클만)
    let predictions;
    if (targetCycleId) {
      predictions = await getLatestPredictions(targetCycleId);
    } else {
      // 핵심 변경: 이미 평가된 예측을 건너뛰고 미평가 예측만 가져옴
      predictions = await getUnevaluatedPredictions();

      // 미평가 예측이 없으면 최신 사이클 fallback (재평가 허용)
      if (predictions.length === 0) {
        console.log("[evaluate] 미평가 예측 없음 → 최신 사이클 fallback 시도");
        predictions = await getLatestPredictions();
      }
    }

    if (predictions.length === 0) {
      // 디버깅용: ai_predictions 테이블 전체 건수 확인
      let debugInfo = "";
      try {
        const { count } = await (await import("@/lib/supabase")).supabase
          .from("ai_predictions")
          .select("*", { count: "exact", head: true });
        debugInfo = ` (ai_predictions 테이블 전체: ${count ?? 0}건)`;
      } catch { /* ignore */ }

      return NextResponse.json(
        {
          success: false,
          error: `평가할 예측이 없습니다.${debugInfo} 먼저 POST /api/ai/predict를 실행하세요.`,
        },
        { status: 404 },
      );
    }

    const cycleId = predictions[0].cycle_id;

    // 2.5 중복 예측 제거: 같은 asset_id가 여러 건이면 가장 최신 것만 사용
    const seenAssets = new Map<string, typeof predictions[0]>();
    for (const pred of predictions) {
      const existing = seenAssets.get(pred.asset_id);
      if (!existing || (pred.created_at && existing.created_at && pred.created_at > existing.created_at)) {
        seenAssets.set(pred.asset_id, pred);
      }
    }
    const uniquePredictions = Array.from(seenAssets.values());
    if (uniquePredictions.length < predictions.length) {
      console.log(
        `[evaluate] 중복 제거: ${predictions.length}건 → ${uniquePredictions.length}건 (${predictions.length - uniquePredictions.length}건 중복)`,
      );
    }
    predictions = uniquePredictions;

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

    // 4. 각 예측에 대해 개별 평가 + 자산별 독립 강화학습
    const evaluationResults = [];
    const learningResults = [];
    const perAssetWeights: Record<string, EnsembleConfig> = {};
    let abstainedCount = 0;
    let unlearnableCount = 0;
    let totalAccuracyScore = 0;
    let gradedCount = 0;

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

      // abstained 예측 판별 (sub_model_votes에 저장된 abstained 플래그 확인)
      const votes = pred.sub_model_votes as unknown as Record<string, unknown>;
      const isAbstained = votes?.abstained === true;

      const actualDirection = determineDirection(priceData.changePercent);
      const wasCorrect = pred.direction === actualDirection;

      // 등급 기반 정확도 계산
      const gradedResult = calculateAccuracyScore(pred.direction, priceData.changePercent);

      // 예측 결과 저장 (abstained 포함, 마킹)
      try {
        await savePredictionResult({
          predictionId: pred.id!,
          cycleId,
          assetId: pred.asset_id,
          predictedDirection: pred.direction,
          actualDirection,
          wasCorrect,
          actualChangePercent: priceData.changePercent,
          accuracyScore: gradedResult.score,
          grade: gradedResult.grade,
          abstained: isAbstained,
        });
      } catch (err) {
        console.error(`결과 저장 실패 (${pred.asset_id}):`, err);
      }

      // abstained 예측은 정확도 통계에서 제외, 학습도 스킵
      if (isAbstained) {
        abstainedCount++;
        evaluationResults.push({
          assetId: pred.asset_id,
          status: "abstained",
          reason: "관망 예측 — 평가 제외",
          actualDirection,
          actualChangePercent: priceData.changePercent,
        });
        continue;
      }

      // 등급 점수 누적 (abstained 제외)
      totalAccuracyScore += gradedResult.score;
      gradedCount++;

      // 5. 자산별 개별 가중치 로드 → 학습 → 개별 저장
      const assetWeights = await getModelWeights(pred.asset_id);

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

      // 학습 불가 이벤트 체크 (Phase 1-C)
      const unlearnableCheck = isUnlearnableEvent(outcome);
      if (unlearnableCheck.unlearnable) {
        unlearnableCount++;
        console.log(`[evaluate] 학습불가 이벤트 (${pred.asset_id}): ${unlearnableCheck.reason}`);

        evaluationResults.push({
          assetId: pred.asset_id,
          status: "unlearnable",
          reason: unlearnableCheck.reason,
          predictedDirection: pred.direction,
          actualDirection,
          actualChangePercent: priceData.changePercent,
          wasCorrect,
          accuracyScore: gradedResult.score,
          grade: gradedResult.grade,
        });
        continue; // learn() 스킵
      }

      const learningResult = learn(outcome, assetWeights);
      learningResults.push(learningResult);

      // 자산별 개별 가중치 저장
      const updatedWeights = learningResult.weightAdjustment;
      perAssetWeights[pred.asset_id] = updatedWeights;

      try {
        await saveModelWeights(
          updatedWeights,
          `${pred.asset_id} 개별 학습: ${wasCorrect ? "정답" : "오답"} (${priceData.changePercent.toFixed(2)}%) [${gradedResult.grade}]`,
          pred.asset_id,
        );
      } catch (err) {
        console.error(`자산별 가중치 저장 실패 (${pred.asset_id}):`, err);
      }

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

      // Phase 2-C: 누적 모델 정확도 + 신뢰도 교정 적재
      try {
        const modelNames = ["momentum", "meanReversion", "volatility", "correlation", "fundamental"] as const;
        const modelKorean: Record<string, string> = {
          momentum: "모멘텀", meanReversion: "평균회귀", volatility: "변동성",
          correlation: "교차상관", fundamental: "펀더멘털",
        };
        for (const mn of modelNames) {
          const modelCorrect = learningResult.modelPerformance[mn];
          const modelVote = (pred.sub_model_votes as SubModelVotes)[mn];
          const modelConf = modelVote?.confidence ?? 50;
          const confBucket = Math.floor(modelConf / 10) * 10; // 0, 10, 20, ..., 90

          await upsertModelAccuracy(
            pred.asset_id,
            modelKorean[mn],
            modelCorrect,
            modelConf,
            learningResult.marketRegime,
          ).catch(() => {});

          await upsertConfidenceCalibration(
            modelKorean[mn],
            confBucket,
            modelCorrect,
          ).catch(() => {});
        }
      } catch {
        // 누적 데이터 적재 실패는 무시 (테이블 미생성 등)
      }

      evaluationResults.push({
        assetId: pred.asset_id,
        status: "evaluated",
        predictedDirection: pred.direction,
        actualDirection,
        actualChangePercent: priceData.changePercent,
        wasCorrect,
        accuracyScore: gradedResult.score,
        grade: gradedResult.grade,
        lesson: learningResult.lesson,
        weights: {
          momentum: updatedWeights.momentumWeight,
          meanReversion: updatedWeights.meanReversionWeight,
          volatility: updatedWeights.volatilityWeight,
          correlation: updatedWeights.correlationWeight,
          fundamental: updatedWeights.fundamentalWeight,
        },
      });
    }

    // 6. 통계 계산 (abstained 제외)
    const evaluated = evaluationResults.filter((r) => r.status === "evaluated");
    const correctCount = evaluated.filter(
      (r) => "wasCorrect" in r && r.wasCorrect,
    ).length;
    const accuracy =
      evaluated.length > 0
        ? Math.round((correctCount / evaluated.length) * 100)
        : 0;
    const avgAccuracyScore = gradedCount > 0
      ? Math.round((totalAccuracyScore / gradedCount) * 100) / 100
      : 0;

    // 7. 응답 반환
    return NextResponse.json({
      success: true,
      cycleId,
      evaluatedAt: new Date().toISOString(),
      summary: {
        totalPredictions: predictions.length,
        evaluated: evaluated.length,
        abstained: abstainedCount,
        unlearnable: unlearnableCount,
        skipped: evaluationResults.filter((r) => r.status === "skipped").length,
        correct: correctCount,
        accuracy,
        avgAccuracyScore,
        perAssetLearning: true,
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

// ─── GET: Vercel Cron 전용 (이전 예측 평가 + 강화학습) ──────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (
    process.env.NODE_ENV === "production" &&
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runEvaluation();
}

// ─── POST: 예측 평가 (수동 호출용) ──────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const targetCycleId = (body as Record<string, string>).cycleId ?? undefined;
  return runEvaluation(targetCycleId);
}
