/**
 * 고도화된 학습 시스템
 *
 * 예측 실패 시 단순 가중치 조정을 넘어:
 *   1. 기술적 지표 세팅의 문제점 진단
 *   2. 거시경제 데이터 반영 오류 검토
 *   3. 각 서브모델(모멘텀/평균회귀/변동성/교차상관/펀더멘털)별 심층 원인 분석
 *   4. 가중투표 방식의 구조적 문제 검토
 *   5. 부족하거나 개선되어야 할 영역 도출
 *   6. 왜 맞추지 못했는지 근본 원인 규명
 *   7. 값의 오류/잘못된 세팅 여부 진단
 */

import { Direction, ModelVote } from "./models";
import { EnsembleConfig, SubModelVotes, AIPrediction, normalizeWeights } from "./ensemble";
import { PriceBar, calcSMA, calcEMA, calcRSI, calcATR, calcMACD, calcBollingerBands, calcROC } from "./indicators";

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

/** 개별 모델 진단 결과 */
export interface ModelDiagnosis {
  modelName: string;
  predicted: Direction;
  actual: Direction;
  wasCorrect: boolean;
  confidence: number;
  // 진단 상세
  issues: DiagnosisIssue[];
  // 개선 제안
  improvements: string[];
}

/** 진단된 이슈 */
export interface DiagnosisIssue {
  category: "지표_세팅" | "데이터_부족" | "값_오류" | "감도_문제" | "구조적_한계" | "외부_충격";
  severity: "심각" | "주의" | "경미";
  description: string;
  suggestedFix: string;
}

/** 앙상블 구조 진단 */
export interface EnsembleDiagnosis {
  // 가중투표 문제점
  votingIssues: string[];
  // 모델 간 충돌
  modelConflicts: string[];
  // 가중치 분포 문제
  weightDistributionIssue: string | null;
  // 다수결 오류 (다수가 틀린 경우)
  majorityWrong: boolean;
  // 소수 정답 모델 (소수만 맞았을 때)
  correctMinorityModels: string[];
}

/** 근본 원인 분석 */
export interface RootCauseAnalysis {
  primaryCause: string;
  secondaryCauses: string[];
  marketCondition: string;
  wasUnpredictable: boolean;
  unpredictableReason?: string;
}

export interface LearningResult {
  cycleId: string;
  assetId: string;
  predictedDirection: string;
  actualDirection: string;
  wasCorrect: boolean;
  missedFactors: string[];

  // 각 모델별 성과 (기존 호환)
  modelPerformance: {
    momentum: boolean;
    meanReversion: boolean;
    volatility: boolean;
    correlation: boolean;
    fundamental: boolean;
  };

  // 고도화된 진단
  modelDiagnoses: ModelDiagnosis[];
  ensembleDiagnosis: EnsembleDiagnosis;
  rootCause: RootCauseAnalysis;

  weightAdjustment: EnsembleConfig;
  lesson: string; // 종합 리포트 (한국어)
}

export interface PredictionOutcome {
  prediction: AIPrediction;
  actualDirection: Direction;
  actualReturnPercent: number;
  postData?: PriceBar[];
  preData?: PriceBar[]; // 예측 시점의 데이터 (지표 재검증용)
}

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const WEIGHT_REWARD = 0.02;
const WEIGHT_PENALTY = -0.02;
const MIN_WEIGHT = 0.05;

// ─── 모델별 심층 진단 ──────────────────────────────────────────────────────────

function isModelCorrect(vote: ModelVote, actual: Direction): boolean {
  return vote.direction === actual || (vote.direction === "보합" && actual === "보합");
}

/**
 * 모멘텀 모델 진단
 */
function diagnoseMomentum(
  vote: ModelVote,
  actual: Direction,
  preData?: PriceBar[],
  postData?: PriceBar[],
): ModelDiagnosis {
  const issues: DiagnosisIssue[] = [];
  const improvements: string[] = [];
  const correct = isModelCorrect(vote, actual);

  if (!correct && preData && preData.length >= 20) {
    // SMA 교차 상태 점검
    const sma10 = calcSMA(preData, 10);
    const sma50 = calcSMA(preData, Math.min(50, preData.length));
    if (sma10 != null && sma50 != null) {
      const crossRatio = (sma10 - sma50) / sma50;
      if (Math.abs(crossRatio) < 0.005) {
        issues.push({
          category: "감도_문제",
          severity: "주의",
          description: `SMA 교차 비율 ${(crossRatio * 100).toFixed(2)}%로 매우 근접. 교차 구간에서 노이즈에 취약`,
          suggestedFix: "SMA 교차 판단 시 최소 괴리율 임계값(예: 0.5%) 추가하여 오신호 필터링",
        });
        improvements.push("SMA 교차 최소 괴리율 필터 도입 검토");
      }
    }

    // RSI 위치 점검
    const rsi = calcRSI(preData);
    if (rsi != null) {
      if (vote.direction === "상승" && rsi > 65 && actual === "하락") {
        issues.push({
          category: "지표_세팅",
          severity: "심각",
          description: `RSI ${rsi.toFixed(1)}로 이미 과열 구간이었으나 모멘텀이 상승 판단. 과매수 필터 부재`,
          suggestedFix: "모멘텀 모델에 RSI>65 시 상승 신호 감쇄 로직 추가",
        });
        improvements.push("모멘텀 모델에 RSI 과열 경고 필터 통합");
      }
      if (vote.direction === "하락" && rsi < 35 && actual === "상승") {
        issues.push({
          category: "지표_세팅",
          severity: "심각",
          description: `RSI ${rsi.toFixed(1)}로 과매도 구간이었으나 모멘텀이 하락 판단. 반등 가능성 미반영`,
          suggestedFix: "모멘텀 모델에 RSI<35 시 하락 신호 감쇄 로직 추가",
        });
        improvements.push("모멘텀 모델에 과매도 반등 경고 필터 통합");
      }
    }

    // MACD 히스토그램 방향 점검
    const macd = calcMACD(preData);
    if (macd != null) {
      if (vote.direction === "상승" && macd.histogram < 0 && actual === "하락") {
        issues.push({
          category: "값_오류",
          severity: "주의",
          description: `MACD 히스토그램 음수(${macd.histogram.toFixed(3)})였으나 상승 예측. 다른 지표가 MACD를 오버라이드`,
          suggestedFix: "MACD 히스토그램 부호와 최종 판단 일치 여부 교차검증 추가",
        });
      }
    }

    // ROC 갑작스런 반전 점검
    if (postData && postData.length >= 5) {
      const preROC = calcROC(preData, 5);
      const postROC = calcROC(postData, 5);
      if (preROC != null && postROC != null) {
        if ((preROC > 2 && postROC < -2) || (preROC < -2 && postROC > 2)) {
          issues.push({
            category: "외부_충격",
            severity: "심각",
            description: `ROC가 ${preROC.toFixed(1)}% → ${postROC.toFixed(1)}%로 급반전. 예측 시점 이후 급격한 추세 전환 발생`,
            suggestedFix: "변동성 모델과 연계하여 급반전 가능성 사전 경고 시스템 강화",
          });
          improvements.push("ROC 급반전 감지 및 사전 경고 메커니즘 추가");
        }
      }
    }
  }

  if (!correct && issues.length === 0) {
    issues.push({
      category: "구조적_한계",
      severity: "경미",
      description: "명확한 지표 오류 없이 방향 오판. 시장 노이즈 또는 이벤트 리스크",
      suggestedFix: "모멘텀 모델의 최종 판단 시 확신도 임계값 강화 검토",
    });
  }

  return { modelName: "모멘텀", predicted: vote.direction, actual, wasCorrect: correct, confidence: vote.confidence, issues, improvements };
}

/**
 * 평균회귀 모델 진단
 */
function diagnoseMeanReversion(
  vote: ModelVote,
  actual: Direction,
  preData?: PriceBar[],
): ModelDiagnosis {
  const issues: DiagnosisIssue[] = [];
  const improvements: string[] = [];
  const correct = isModelCorrect(vote, actual);

  if (!correct && preData && preData.length >= 20) {
    const rsi = calcRSI(preData);
    const bb = calcBollingerBands(preData);

    // RSI 극단값에서 회귀 예측 실패 → 추세가 극단값을 지속한 경우
    if (rsi != null) {
      if (rsi > 70 && vote.direction === "하락" && actual === "상승") {
        issues.push({
          category: "구조적_한계",
          severity: "심각",
          description: `RSI ${rsi.toFixed(1)}에서 하락(회귀) 예측했으나 과매수 상태가 지속. 강한 추세에서 RSI 70+ 유지 가능`,
          suggestedFix: "과매수 RSI 기준값을 동적으로 조정 (강추세 시 80으로 상향)",
        });
        improvements.push("추세 강도에 따른 RSI 과매수/과매도 동적 임계값 도입");
      }
      if (rsi < 30 && vote.direction === "상승" && actual === "하락") {
        issues.push({
          category: "구조적_한계",
          severity: "심각",
          description: `RSI ${rsi.toFixed(1)}에서 상승(반등) 예측했으나 하락 지속. 강한 하락추세에서 과매도 연장`,
          suggestedFix: "하락추세 판별 후 과매도 반등 신호 감쇄 적용",
        });
        improvements.push("하락추세 감지 시 평균회귀 신호 약화 로직 추가");
      }
    }

    // 볼린저 밴드 이탈 지속
    if (bb != null) {
      if (bb.percentB > 1.0 && vote.direction === "하락" && actual === "상승") {
        issues.push({
          category: "지표_세팅",
          severity: "주의",
          description: `BB %B ${(bb.percentB * 100).toFixed(0)}%에서 하락 예측했으나 밴드 워킹 발생. 강추세에서 밴드 상단 주행 가능`,
          suggestedFix: "볼린저 밴드 워킹(band walking) 감지 로직 추가 — 밴드 이탈 3일 이상 시 회귀 신호 비활성화",
        });
        improvements.push("볼린저 밴드 워킹 감지 및 회귀 신호 비활성화 조건 추가");
      }
    }
  }

  if (!correct && issues.length === 0) {
    issues.push({
      category: "데이터_부족",
      severity: "경미",
      description: "평균회귀 모델 오판 — 근본 원인 특정 불가",
      suggestedFix: "더 많은 오실레이터(Williams %R, CCI 등)와 교차검증 강화",
    });
  }

  return { modelName: "평균회귀", predicted: vote.direction, actual, wasCorrect: correct, confidence: vote.confidence, issues, improvements };
}

/**
 * 변동성 모델 진단
 */
function diagnoseVolatility(
  vote: ModelVote,
  actual: Direction,
  preData?: PriceBar[],
  actualReturn?: number,
): ModelDiagnosis {
  const issues: DiagnosisIssue[] = [];
  const improvements: string[] = [];
  const correct = isModelCorrect(vote, actual);

  if (!correct && preData && preData.length >= 15) {
    const atr14 = calcATR(preData, 14);
    const atr5 = calcATR(preData, 5);

    if (atr14 != null && atr5 != null && atr14 !== 0) {
      const ratio = atr5 / atr14;

      // 변동성 축소 예측 → 실제 폭발
      if (ratio < 0.8 && actual === "변동성확대") {
        issues.push({
          category: "감도_문제",
          severity: "심각",
          description: `ATR 비율 ${ratio.toFixed(2)}로 변동성 축소 판단했으나 이후 변동성 폭발. 축소 후 폭발 패턴 미감지`,
          suggestedFix: "변동성 수축 지속 기간 + 볼린저 밴드 폭 동시 모니터링으로 폭발 사전 경고 강화",
        });
        improvements.push("변동성 수축→폭발 전환 패턴 감지 로직 추가");
      }

      // 큰 수익률 변동을 예측 못한 경우
      if (actualReturn != null && Math.abs(actualReturn) > 5 && vote.direction === "보합") {
        issues.push({
          category: "감도_문제",
          severity: "심각",
          description: `보합 예측이었으나 실제 ${actualReturn > 0 ? "+" : ""}${actualReturn.toFixed(1)}% 변동. 대규모 이벤트 감지 실패`,
          suggestedFix: "VIX 급등, 뉴스 이벤트 등 외부 충격 지표와 변동성 모델 연계 강화",
        });
        improvements.push("외부 이벤트 리스크 감지와 변동성 모델 연계");
      }
    }
  }

  if (!correct && issues.length === 0) {
    issues.push({
      category: "구조적_한계",
      severity: "경미",
      description: "변동성 판단 오류 — 세부 원인 특정 불가",
      suggestedFix: "변동성 체제 분류(극저/저/보통/고/극고) 세분화 검토",
    });
  }

  return { modelName: "변동성", predicted: vote.direction, actual, wasCorrect: correct, confidence: vote.confidence, issues, improvements };
}

/**
 * 교차상관 모델 진단
 */
function diagnoseCorrelation(
  vote: ModelVote,
  actual: Direction,
): ModelDiagnosis {
  const issues: DiagnosisIssue[] = [];
  const improvements: string[] = [];
  const correct = isModelCorrect(vote, actual);

  if (!correct) {
    issues.push({
      category: "구조적_한계",
      severity: "주의",
      description: `상관관계 기반 예측 '${vote.direction}'이 실제 '${actual}'과 불일치. 상관관계 일시 붕괴 또는 레짐 변경 가능성`,
      suggestedFix: "상관관계 매트릭스의 동적 업데이트 — 최근 30일 롤링 상관계수 적용 검토",
    });
    improvements.push("정적 상관계수 → 롤링 상관계수로 전환 검토");

    if (vote.confidence > 60) {
      issues.push({
        category: "감도_문제",
        severity: "주의",
        description: `확신도 ${vote.confidence}%로 높았으나 오판. 높은 상관관계 신뢰도에 대한 과신`,
        suggestedFix: "상관관계 모델의 최대 확신도 캡을 현행보다 낮추거나, 상관계수의 최근 안정성 검증 추가",
      });
      improvements.push("상관관계 확신도 상한 조정 검토");
    }
  }

  return { modelName: "교차상관", predicted: vote.direction, actual, wasCorrect: correct, confidence: vote.confidence, issues, improvements };
}

/**
 * 펀더멘털 모델 진단
 */
function diagnoseFundamental(
  vote: ModelVote,
  actual: Direction,
): ModelDiagnosis {
  const issues: DiagnosisIssue[] = [];
  const improvements: string[] = [];
  const correct = isModelCorrect(vote, actual);

  if (!correct) {
    if (vote.confidence < 30) {
      issues.push({
        category: "데이터_부족",
        severity: "주의",
        description: `펀더멘털 모델 확신도 ${vote.confidence}%로 매우 낮음. 거시경제 데이터 수집 실패 또는 부족 가능성`,
        suggestedFix: "거시경제 데이터 소스 다각화 — 추가 API(FRED, 한국은행 등) 연동 검토",
      });
      improvements.push("거시경제 데이터 소스 확대 (FRED, BOK API 등)");
    } else {
      issues.push({
        category: "지표_세팅",
        severity: "주의",
        description: `펀더멘털 분석이 '${vote.direction}'이었으나 실제 '${actual}'. 거시경제 시그널 해석 오류 가능`,
        suggestedFix: "자산별 펀더멘털 시그널의 가중치 재검토. VIX, 수익률곡선 등 핵심 시그널 영향력 재보정",
      });
      improvements.push("자산별 펀더멘털 시그널 가중치 재보정");
    }

    // 뉴스 심리가 반대로 작용했을 가능성
    if (vote.rationale.includes("뉴스 심리")) {
      issues.push({
        category: "값_오류",
        severity: "경미",
        description: "뉴스 심리 분석이 실제 시장 반응과 불일치. 키워드 기반 감성분석의 한계",
        suggestedFix: "뉴스 감성분석 키워드 사전 업데이트 및 역발상(contrarian) 필터 추가",
      });
      improvements.push("뉴스 감성분석 정확도 개선");
    }
  }

  return { modelName: "펀더멘털", predicted: vote.direction, actual, wasCorrect: correct, confidence: vote.confidence, issues, improvements };
}

// ─── 앙상블 구조 진단 ──────────────────────────────────────────────────────────

function diagnoseEnsemble(
  votes: SubModelVotes,
  finalDirection: Direction,
  actual: Direction,
  wasCorrect: boolean,
): EnsembleDiagnosis {
  const votingIssues: string[] = [];
  const modelConflicts: string[] = [];
  let weightDistributionIssue: string | null = null;
  const correctMinorityModels: string[] = [];

  const models: [string, ModelVote][] = [
    ["모멘텀", votes.momentum],
    ["평균회귀", votes.meanReversion],
    ["변동성", votes.volatility],
    ["교차상관", votes.correlation],
    ["펀더멘털", votes.fundamental],
  ];

  // 다수결 분석
  const correctModels = models.filter(([, v]) => v.direction === actual);
  const wrongModels = models.filter(([, v]) => v.direction !== actual);
  const majorityWrong = wrongModels.length > correctModels.length;

  if (majorityWrong && !wasCorrect) {
    votingIssues.push(
      `5개 모델 중 ${wrongModels.length}개가 오판 (${wrongModels.map(([n]) => n).join(", ")}). 다수결 오류 발생`,
    );
  }

  // 소수 정답 모델
  if (!wasCorrect && correctModels.length > 0) {
    for (const [name] of correctModels) {
      correctMinorityModels.push(name);
    }
    votingIssues.push(
      `${correctMinorityModels.join(", ")} 모델이 올바른 방향을 예측했으나 가중치 부족으로 최종 판단에 반영되지 않음`,
    );
  }

  // 모델 간 충돌 감지
  const directions = new Set(models.map(([, v]) => v.direction));
  if (directions.size >= 4) {
    modelConflicts.push("5개 모델이 4개 이상 서로 다른 방향 예측 — 시장 불확실성 극대화 상태");
  } else if (directions.size === 3) {
    modelConflicts.push("5개 모델이 3개 방향으로 분산 — 시장 방향성 불분명");
  }

  // 고확신 모델이 틀렸는지 체크
  const highConfWrong = models.filter(
    ([, v]) => v.confidence > 70 && v.direction !== actual,
  );
  if (highConfWrong.length > 0) {
    votingIssues.push(
      `고확신(70%+) 모델 오판: ${highConfWrong.map(([n, v]) => `${n}(${v.confidence}%)`).join(", ")}. 확신도 보정 필요`,
    );
  }

  // 저확신 모델이 맞았는지 체크
  const lowConfCorrect = models.filter(
    ([, v]) => v.confidence < 40 && v.direction === actual,
  );
  if (lowConfCorrect.length > 0) {
    votingIssues.push(
      `저확신(<40%) 모델이 정답: ${lowConfCorrect.map(([n, v]) => `${n}(${v.confidence}%)`).join(", ")}. 해당 모델의 가중치 상향 검토`,
    );
  }

  return {
    votingIssues,
    modelConflicts,
    weightDistributionIssue,
    majorityWrong,
    correctMinorityModels,
  };
}

// ─── 근본 원인 분석 ────────────────────────────────────────────────────────────

function analyzeRootCause(
  prediction: AIPrediction,
  actual: Direction,
  actualReturn: number,
  diagnoses: ModelDiagnosis[],
  ensembleDiag: EnsembleDiagnosis,
  preData?: PriceBar[],
  postData?: PriceBar[],
): RootCauseAnalysis {
  const secondaryCauses: string[] = [];

  // 예측 불가 이벤트 판별
  if (Math.abs(actualReturn) > 8) {
    return {
      primaryCause: `극단적 시장 변동 (${actualReturn > 0 ? "+" : ""}${actualReturn.toFixed(1)}%) — 예측 모델의 일반적 범위를 벗어난 이벤트 리스크`,
      secondaryCauses: ["이벤트 리스크(실적발표, 정책변동, 지정학 등) 미반영 가능성 높음"],
      marketCondition: "극단적 변동",
      wasUnpredictable: true,
      unpredictableReason: "8% 이상의 급변은 기술적 분석 모델의 일반적 예측 범위를 초과",
    };
  }

  // 모든 모델이 틀린 경우
  if (diagnoses.every((d) => !d.wasCorrect)) {
    const allIssues = diagnoses.flatMap((d) => d.issues);
    const severeIssues = allIssues.filter((i) => i.severity === "심각");

    if (severeIssues.length > 0) {
      return {
        primaryCause: `전 모델 오판 — 핵심 원인: ${severeIssues[0].description}`,
        secondaryCauses: severeIssues.slice(1).map((i) => i.description),
        marketCondition: "구조적 변환점",
        wasUnpredictable: false,
      };
    }

    return {
      primaryCause: "전 모델 동시 오판 — 시장 레짐 전환 또는 예측 불가 외부 이벤트",
      secondaryCauses: ["모든 서브모델의 기본 가정(추세지속, 평균회귀 등)이 동시에 무효화"],
      marketCondition: "레짐 전환",
      wasUnpredictable: true,
      unpredictableReason: "모든 분석 프레임워크가 동시에 실패 — 시장의 근본적 구조 변화 시사",
    };
  }

  // 과반 모델 오판
  if (ensembleDiag.majorityWrong) {
    secondaryCauses.push("가중투표에서 다수파가 오판 방향을 지지");
    if (ensembleDiag.correctMinorityModels.length > 0) {
      secondaryCauses.push(
        `${ensembleDiag.correctMinorityModels.join(", ")} 모델이 올바른 방향을 제시했으나 소수파로 무시됨`,
      );
    }

    return {
      primaryCause: `다수결 오류 — ${diagnoses.filter((d) => !d.wasCorrect).length}개 모델이 잘못된 방향 지지`,
      secondaryCauses,
      marketCondition: "혼조 시장",
      wasUnpredictable: false,
    };
  }

  // 특정 모델의 과도한 영향
  const wrongHighConf = diagnoses.filter((d) => !d.wasCorrect && d.confidence > 70);
  if (wrongHighConf.length > 0) {
    return {
      primaryCause: `고확신 모델의 오판 — ${wrongHighConf.map((d) => `${d.modelName}(${d.confidence}%)`).join(", ")}이 잘못된 방향을 강하게 지지`,
      secondaryCauses: wrongHighConf.flatMap((d) => d.issues.map((i) => i.description)),
      marketCondition: "신호 왜곡",
      wasUnpredictable: false,
    };
  }

  // 기본 원인
  const allImprovements = diagnoses.flatMap((d) => d.improvements);
  return {
    primaryCause: `종합적 판단 오류 — 개별 모델의 미세 오차가 앙상블에서 누적`,
    secondaryCauses: allImprovements.length > 0 ? allImprovements.slice(0, 3) : ["전반적 모델 세밀도 개선 필요"],
    marketCondition: "일반",
    wasUnpredictable: false,
  };
}

// ─── 가중치 조정 (개선된 버전) ─────────────────────────────────────────────────

function adjustWeights(
  currentWeights: EnsembleConfig,
  diagnoses: ModelDiagnosis[],
  ensembleDiag: EnsembleDiagnosis,
): EnsembleConfig {
  const adjusted: EnsembleConfig = { ...currentWeights };

  const keyMap: Record<string, keyof EnsembleConfig> = {
    "모멘텀": "momentumWeight",
    "평균회귀": "meanReversionWeight",
    "변동성": "volatilityWeight",
    "교차상관": "correlationWeight",
    "펀더멘털": "fundamentalWeight",
  };

  for (const diag of diagnoses) {
    const key = keyMap[diag.modelName];
    if (!key) continue;

    if (diag.wasCorrect) {
      // 맞은 모델: 확신도에 비례한 보상
      const bonus = WEIGHT_REWARD * (diag.confidence / 100 + 0.5);
      adjusted[key] = Math.max(adjusted[key] + bonus, MIN_WEIGHT);
    } else {
      // 틀린 모델: 심각한 이슈가 있으면 더 큰 페널티
      const severeCount = diag.issues.filter((i) => i.severity === "심각").length;
      const penalty = WEIGHT_PENALTY * (1 + severeCount * 0.5);
      adjusted[key] = Math.max(adjusted[key] + penalty, MIN_WEIGHT);
    }
  }

  // 소수 정답 모델에 추가 보너스
  if (ensembleDiag.correctMinorityModels.length > 0) {
    for (const name of ensembleDiag.correctMinorityModels) {
      const key = keyMap[name];
      if (key) {
        adjusted[key] = Math.max(adjusted[key] + WEIGHT_REWARD * 1.5, MIN_WEIGHT);
      }
    }
  }

  return normalizeWeights(adjusted);
}

// ─── 종합 리포트 생성 ──────────────────────────────────────────────────────────

function generateDetailedLesson(
  prediction: AIPrediction,
  actual: Direction,
  actualReturn: number,
  diagnoses: ModelDiagnosis[],
  ensembleDiag: EnsembleDiagnosis,
  rootCause: RootCauseAnalysis,
  wasCorrect: boolean,
  newWeights: EnsembleConfig,
): string {
  const parts: string[] = [];

  // 헤더
  if (wasCorrect) {
    parts.push(`✅ 예측 성공: ${prediction.assetId} — "${prediction.direction}" 예측 적중 (실제 ${actualReturn > 0 ? "+" : ""}${actualReturn.toFixed(1)}%)`);
  } else {
    parts.push(`❌ 예측 실패: ${prediction.assetId} — "${prediction.direction}" 예측 → 실제 "${actual}" (${actualReturn > 0 ? "+" : ""}${actualReturn.toFixed(1)}%)`);
  }

  // 모델별 성과
  parts.push("\n─── 서브모델별 진단 ───");
  for (const diag of diagnoses) {
    const status = diag.wasCorrect ? "✓" : "✗";
    parts.push(`${status} ${diag.modelName}: ${diag.predicted} (확신도 ${diag.confidence.toFixed(0)}%)`);
    if (diag.issues.length > 0) {
      for (const issue of diag.issues) {
        parts.push(`  [${issue.severity}][${issue.category}] ${issue.description}`);
        parts.push(`  → 개선: ${issue.suggestedFix}`);
      }
    }
  }

  // 앙상블 진단
  if (ensembleDiag.votingIssues.length > 0 || ensembleDiag.modelConflicts.length > 0) {
    parts.push("\n─── 앙상블 구조 진단 ───");
    for (const issue of ensembleDiag.votingIssues) parts.push(`• ${issue}`);
    for (const conflict of ensembleDiag.modelConflicts) parts.push(`• ${conflict}`);
  }

  // 근본 원인
  if (!wasCorrect) {
    parts.push("\n─── 근본 원인 분석 ───");
    parts.push(`주요 원인: ${rootCause.primaryCause}`);
    if (rootCause.secondaryCauses.length > 0) {
      parts.push(`부차적 원인:`);
      for (const cause of rootCause.secondaryCauses) parts.push(`  - ${cause}`);
    }
    parts.push(`시장 상태: ${rootCause.marketCondition}`);
    if (rootCause.wasUnpredictable && rootCause.unpredictableReason) {
      parts.push(`※ ${rootCause.unpredictableReason}`);
    }
  }

  // 개선 종합
  const allImprovements = [...new Set(diagnoses.flatMap((d) => d.improvements))];
  if (allImprovements.length > 0) {
    parts.push("\n─── 개선 사항 ───");
    for (const imp of allImprovements) parts.push(`→ ${imp}`);
  }

  // 새 가중치
  parts.push(`\n─── 조정된 가중치 ───`);
  parts.push(`  모멘텀: ${(newWeights.momentumWeight * 100).toFixed(1)}%`);
  parts.push(`  평균회귀: ${(newWeights.meanReversionWeight * 100).toFixed(1)}%`);
  parts.push(`  변동성: ${(newWeights.volatilityWeight * 100).toFixed(1)}%`);
  parts.push(`  교차상관: ${(newWeights.correlationWeight * 100).toFixed(1)}%`);
  parts.push(`  펀더멘털: ${(newWeights.fundamentalWeight * 100).toFixed(1)}%`);

  return parts.join("\n");
}

// ─── 메인 학습 함수 ───────────────────────────────────────────────────────────

export function learn(
  outcome: PredictionOutcome,
  currentWeights: EnsembleConfig,
): LearningResult {
  const { prediction, actualDirection, actualReturnPercent, postData, preData } = outcome;
  const wasCorrect = prediction.direction === actualDirection;

  // 1. 각 모델별 심층 진단
  const votes = prediction.subModelVotes;
  const modelDiagnoses: ModelDiagnosis[] = [
    diagnoseMomentum(votes.momentum, actualDirection, preData, postData),
    diagnoseMeanReversion(votes.meanReversion, actualDirection, preData),
    diagnoseVolatility(votes.volatility, actualDirection, preData, actualReturnPercent),
    diagnoseCorrelation(votes.correlation, actualDirection),
    diagnoseFundamental(votes.fundamental, actualDirection),
  ];

  // 2. 앙상블 구조 진단
  const ensembleDiagnosis = diagnoseEnsemble(
    votes,
    prediction.direction,
    actualDirection,
    wasCorrect,
  );

  // 3. 근본 원인 분석
  const rootCause = analyzeRootCause(
    prediction,
    actualDirection,
    actualReturnPercent,
    modelDiagnoses,
    ensembleDiagnosis,
    preData,
    postData,
  );

  // 4. 가중치 조정
  const weightAdjustment = adjustWeights(currentWeights, modelDiagnoses, ensembleDiagnosis);

  // 5. 놓친 요인 (기존 호환용)
  const missedFactors = modelDiagnoses
    .filter((d) => !d.wasCorrect)
    .flatMap((d) => d.issues.map((i) => `[${d.modelName}] ${i.description}`));

  // 6. 모델 성과 (기존 호환용)
  const modelPerformance = {
    momentum: modelDiagnoses[0].wasCorrect,
    meanReversion: modelDiagnoses[1].wasCorrect,
    volatility: modelDiagnoses[2].wasCorrect,
    correlation: modelDiagnoses[3].wasCorrect,
    fundamental: modelDiagnoses[4].wasCorrect,
  };

  // 7. 종합 리포트
  const lesson = generateDetailedLesson(
    prediction,
    actualDirection,
    actualReturnPercent,
    modelDiagnoses,
    ensembleDiagnosis,
    rootCause,
    wasCorrect,
    weightAdjustment,
  );

  return {
    cycleId: prediction.cycleId,
    assetId: prediction.assetId,
    predictedDirection: prediction.direction,
    actualDirection,
    wasCorrect,
    missedFactors,
    modelPerformance,
    modelDiagnoses,
    ensembleDiagnosis,
    rootCause,
    weightAdjustment,
    lesson,
  };
}

// ─── 배치 학습 ──────────────────────────────────────────────────────────────

export function batchLearn(
  outcomes: PredictionOutcome[],
  initialWeights: EnsembleConfig,
): { results: LearningResult[]; finalWeights: EnsembleConfig; summary: string } {
  let currentWeights = { ...initialWeights };
  const results: LearningResult[] = [];
  let correctCount = 0;

  for (const outcome of outcomes) {
    const result = learn(outcome, currentWeights);
    results.push(result);
    currentWeights = result.weightAdjustment;
    if (result.wasCorrect) correctCount++;
  }

  const accuracy = outcomes.length > 0
    ? ((correctCount / outcomes.length) * 100).toFixed(1)
    : "0.0";

  // 전체 이슈 통계
  const allIssues = results.flatMap((r) => r.modelDiagnoses.flatMap((d) => d.issues));
  const severeCount = allIssues.filter((i) => i.severity === "심각").length;
  const warningCount = allIssues.filter((i) => i.severity === "주의").length;

  const allImprovements = [...new Set(results.flatMap((r) => r.modelDiagnoses.flatMap((d) => d.improvements)))];

  const summary = [
    `═══ 배치 학습 리포트 ═══`,
    `총 ${outcomes.length}건 학습 완료 | 정확도: ${accuracy}% (${correctCount}/${outcomes.length})`,
    `발견된 이슈: 심각 ${severeCount}건, 주의 ${warningCount}건`,
    ``,
    `조정된 가중치:`,
    `  모멘텀: ${(currentWeights.momentumWeight * 100).toFixed(1)}%`,
    `  평균회귀: ${(currentWeights.meanReversionWeight * 100).toFixed(1)}%`,
    `  변동성: ${(currentWeights.volatilityWeight * 100).toFixed(1)}%`,
    `  교차상관: ${(currentWeights.correlationWeight * 100).toFixed(1)}%`,
    `  펀더멘털: ${(currentWeights.fundamentalWeight * 100).toFixed(1)}%`,
    ``,
    allImprovements.length > 0
      ? `우선 개선 사항:\n${allImprovements.slice(0, 5).map((i) => `  → ${i}`).join("\n")}`
      : "특별한 개선 사항 없음",
  ].join("\n");

  return { results, finalWeights: currentWeights, summary };
}
