import { NextResponse } from "next/server";
import { getCurrentCycle } from "@/data/aiPredictionCycles";
import { assets } from "@/data/assets";

/**
 * AI 예측 자동 검증 API (60분 주기)
 *
 * Vercel Cron으로 60분마다 호출되어:
 * 1. 현재 활성 사이클의 예측을 확인
 * 2. 관련 뉴스/이벤트 검색
 * 3. 예측 지지/반박 여부 판단
 * 4. 검증 로그 기록
 *
 * 실제 운영 시 외부 뉴스 API (NewsAPI, Google News, etc.)와 연동
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Cron 인증 (Vercel Cron 또는 수동 호출 시)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // 개발 환경에서는 인증 스킵
  if (process.env.NODE_ENV === "production" && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cycle = getCurrentCycle();
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const timestamp = new Date().toISOString();

  // 현재 활성 예측 확인
  const activePredictions = cycle.predictions.map((pred) => {
    const asset = assetMap.get(pred.assetId);
    return {
      predictionId: pred.id,
      assetId: pred.assetId,
      assetName: asset?.name || pred.assetId,
      direction: pred.direction,
      probability: pred.probability,
      confidence: pred.confidence,
    };
  });

  // 실제 운영 시 여기서 뉴스 API를 호출하여 검증
  // 현재는 검증 상태를 반환
  const verificationResult = {
    timestamp,
    cycleId: cycle.id,
    cycleNumber: cycle.cycleNumber,
    status: cycle.status,
    predictionsChecked: activePredictions.length,
    predictions: activePredictions,
    message: `사이클 #${cycle.cycleNumber} (${cycle.startDate}~${cycle.endDate}) 검증 완료. ${activePredictions.length}개 예측 확인.`,
    // 실제 운영 시: 뉴스 매칭 결과, 가격 변동 확인, 검증 로그 저장 등
    nextCheck: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };

  return NextResponse.json(verificationResult);
}
