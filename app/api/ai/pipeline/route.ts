import { NextResponse } from "next/server";

/**
 * AI 전체 파이프라인 (수동 실행 / 디버깅용)
 *
 * ⚠️ Cron에서는 더 이상 사용하지 않음.
 * Cron은 개별 라우트로 분리됨:
 *   - GET /api/ai/evaluate    (KST 14:00) 이전 예측 평가 + 학습
 *   - GET /api/cron/predict   (KST 14:05) 새 예측 생성
 *   - GET /api/cron/weekly    (KST 14:10, 월요일만) 주간 리포트 + 강화학습
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

  // ── 3단계: 월요일이면 주간 리포트 생성 + 주간 강화학습 ──
  let weeklyResult = null;
  const kstDay = new Date(
    Date.now() + 9 * 60 * 60 * 1000 + new Date().getTimezoneOffset() * 60000,
  ).getDay();

  if (kstDay === 1) {
    // 월요일
    log.push("3단계: 주간 리포트 생성 (월요일)...");
    try {
      const weeklyRes = await fetch(`${baseUrl}/api/ai/weekly-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (weeklyRes.ok) {
        weeklyResult = await weeklyRes.json();
        log.push(
          `주간 자동매매 리포트 완료: 포트폴리오 수익률 ${weeklyResult?.portfolioReturn ?? 0}%, 적중률 ${weeklyResult?.hitRate ?? 0}%, 익절 ${weeklyResult?.tpCount ?? 0}건/손절 ${weeklyResult?.slCount ?? 0}건/기간종료 ${weeklyResult?.holdCount ?? 0}건`,
        );
      } else {
        const errText = await weeklyRes.text().catch(() => "unknown");
        log.push(`주간 리포트 실패 (HTTP ${weeklyRes.status}): ${errText.slice(0, 200)}`);
      }
    } catch (err) {
      log.push(`주간 리포트 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
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
      weeklyReport: weeklyResult
        ? {
            success: true,
            portfolioReturn: weeklyResult.portfolioReturn,
            hitRate: weeklyResult.hitRate,
            tpCount: weeklyResult.tpCount,
            slCount: weeklyResult.slCount,
            holdCount: weeklyResult.holdCount,
            learningApplied: weeklyResult.learningApplied,
          }
        : kstDay === 1
          ? { success: false }
          : { skipped: true, reason: "월요일에만 실행" },
    },
    log,
  });
}

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
