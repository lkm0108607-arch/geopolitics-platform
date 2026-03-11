import { NextResponse } from "next/server";

/**
 * AI 전체 파이프라인 (Vercel Cron 전용)
 *
 * 매일 오후 2시 (KST) 자동 실행:
 * 1단계: 이전 예측 평가 + 학습 (POST /api/ai/evaluate)
 * 2단계: 새 예측 생성 (POST /api/ai/predict)
 *
 * 모든 정보가 자동으로 업데이트됩니다:
 * - 예측 정확도 (prediction_results)
 * - 학습 로그 (learning_logs)
 * - 모델 가중치 (model_weights)
 * - 새 예측 (ai_predictions)
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5분 타임아웃

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (
    process.env.NODE_ENV === "production" &&
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const log: string[] = [];
  let evaluateResult = null;
  let predictResult = null;

  const baseUrl = getBaseUrl(request);

  // ── 1단계: 이전 예측 평가 + 학습 ──
  log.push("1단계: 이전 예측 평가 시작...");
  try {
    const evalRes = await fetch(`${baseUrl}/api/ai/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (evalRes.ok) {
      evaluateResult = await evalRes.json();
      const summary = evaluateResult?.summary;
      if (summary) {
        log.push(
          `평가 완료: ${summary.evaluated}개 평가, ${summary.correct}개 적중 (정확도 ${summary.accuracy}%)`
        );
      } else {
        log.push("평가 완료 (상세 없음)");
      }
    } else {
      const errText = await evalRes.text().catch(() => "unknown");
      log.push(`평가 실패 (HTTP ${evalRes.status}): ${errText.slice(0, 200)}`);
    }
  } catch (err) {
    log.push(`평가 오류: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 2단계: 새 예측 생성 ──
  log.push("2단계: 새 예측 생성 시작...");
  try {
    const predRes = await fetch(`${baseUrl}/api/ai/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (predRes.ok) {
      predictResult = await predRes.json();
      log.push(
        `예측 생성 완료: ${predictResult?.totalAssets ?? 0}개 자산, 사이클 ${predictResult?.cycleId ?? "unknown"}`
      );
    } else {
      const errText = await predRes.text().catch(() => "unknown");
      log.push(`예측 생성 실패 (HTTP ${predRes.status}): ${errText.slice(0, 200)}`);
    }
  } catch (err) {
    log.push(`예측 생성 오류: ${err instanceof Error ? err.message : String(err)}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log.push(`파이프라인 완료 (${elapsed}초)`);

  return NextResponse.json({
    success: true,
    pipeline: "evaluate → predict",
    executedAt: new Date().toISOString(),
    elapsedSeconds: parseFloat(elapsed),
    steps: {
      evaluate: evaluateResult
        ? {
            success: true,
            accuracy: evaluateResult.summary?.accuracy ?? null,
            evaluated: evaluateResult.summary?.evaluated ?? 0,
            correct: evaluateResult.summary?.correct ?? 0,
          }
        : { success: false },
      predict: predictResult
        ? {
            success: true,
            cycleId: predictResult.cycleId,
            totalAssets: predictResult.totalAssets,
          }
        : { success: false },
    },
    log,
  });
}

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
