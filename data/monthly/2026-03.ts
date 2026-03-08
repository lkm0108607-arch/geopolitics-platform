/**
 * 2026년 3월 월별 업데이트
 *
 * 이 파일은 scripts/monthly-refresh.ts로 자동 생성 후 내용을 채웁니다.
 * 수동으로 편집 가능합니다.
 */

import type { Signal, Scenario } from "@/types";

export interface MonthlyIssueUpdate {
  issueId: string;
  /** 변경된 위험도 (0-100) */
  probability?: number;
  /** 위험도 트렌드 변화 */
  probTrend?: "상승" | "하락" | "유지";
  /** 이달의 새 신호 */
  newSignals?: Signal[];
  /** 수정된 시나리오 확률 (scenarioId → 새 확률) */
  updatedProbabilities?: Record<string, number>;
  /** 편집자 메모 */
  note?: string;
}

export interface MonthlyExpertUpdate {
  expertId: string;
  /** 최근 견해 업데이트 */
  recentView?: string;
  /** 새 예측 추가 */
  newPrediction?: {
    year: number;
    month: number;
    issue: string;
    prediction: string;
    exactStatement: string;
    actualOutcome: string;
    accuracyNote: string;
    outcome: "적중" | "불일치" | "부분적중" | "미결";
    source: string;
  };
}

/** 2026년 3월 이슈 업데이트 */
export const issueUpdates: MonthlyIssueUpdate[] = [
  {
    issueId: "us-tariff-war",
    probability: 88,
    probTrend: "상승",
    newSignals: [
      {
        id: "sig-tariff-mar-1",
        issueId: "us-tariff-war",
        title: "트럼프, 모든 수입품 10% 기본 관세 3월 15일 발동 예고",
        description: "트럼프 대통령, 전 세계 대상 10% 기본 관세 + 중국 60%, EU 25% 추가 관세 동시 예고. 글로벌 공급망 충격 예상.",
        type: "경고",
        date: "2026-03-05",
        source: "백악관 공식 발표",
      },
      {
        id: "sig-tariff-mar-2",
        issueId: "us-tariff-war",
        title: "중국, 미국산 농산물·반도체 보복 관세 발동",
        description: "중국 상무부, 미국산 대두·옥수수 25%, 반도체 장비 15% 보복 관세 시행 발표",
        type: "경고",
        date: "2026-03-07",
        source: "중국 상무부",
      },
    ],
    updatedProbabilities: {
      "scen-tariff-1": 40,
      "scen-tariff-2": 35,
    },
    note: "3월 관세 발동으로 위험도 최고 수준. 미중 보복 사이클 진입.",
  },
  {
    issueId: "russia-ukraine",
    probability: 80,
    probTrend: "하락",
    newSignals: [
      {
        id: "sig-ru-mar-1",
        issueId: "russia-ukraine",
        title: "미러 3차 휴전 협상 리야드서 진행",
        description: "사우디 리야드에서 미러 실무 협상 3라운드. 영토 문제·안전 보장 쟁점으로 교착 반복",
        type: "긍정",
        date: "2026-03-06",
        source: "로이터",
      },
    ],
    updatedProbabilities: {
      "scen-ru-1": 45,
      "scen-ru-2": 30,
    },
    note: "휴전 협상 진전으로 위험도 소폭 하락. 다만 영토 문제로 최종 합의는 불투명.",
  },
  {
    issueId: "us-china-taiwan",
    probability: 80,
    probTrend: "상승",
    newSignals: [
      {
        id: "sig-tw-mar-1",
        issueId: "us-china-taiwan",
        title: "중국 PLA 동부전구 3월 정례훈련 규모 확대",
        description: "중국 동부전구, 3월 정례 해상훈련 규모를 전년 대비 30% 확대. 대만 동쪽 해역 포함",
        type: "경고",
        date: "2026-03-04",
        source: "대만 국방부",
      },
    ],
    note: "미 관세전쟁과 대만해협 긴장 동시 상승 중.",
  },
  {
    issueId: "global-ai-governance",
    probability: 60,
    probTrend: "상승",
    newSignals: [
      {
        id: "sig-ai-mar-1",
        issueId: "global-ai-governance",
        title: "트럼프, 바이든 AI 안전 행정명령 전면 폐지",
        description: "트럼프 행정부, 바이든 AI 안전·투명성 의무 행정명령 폐지. AI 산업 규제 완화 선언",
        type: "중립",
        date: "2026-03-02",
        source: "백악관",
      },
    ],
    note: "미국 AI 규제 완화로 EU와 표준 충돌 심화 예상.",
  },
];

/** 2026년 3월 전문가 견해 업데이트 */
export const expertUpdates: MonthlyExpertUpdate[] = [
  {
    expertId: "adam-tooze",
    recentView:
      "트럼프 관세는 1930년 스무트-홀리 관세법 이후 최대 규모 보호무역 조치. 글로벌 GDP 1-2% 감소, 인플레이션 재점화 위험. 달러 약세 가능성과 미국 채권 시장 불안이 동시 진행 중.",
    newPrediction: {
      year: 2026,
      month: 3,
      issue: "트럼프 관세전쟁 경제 충격",
      prediction: "2026년 글로벌 무역량 5-8% 감소, 미국 인플레이션 재점화",
      exactStatement:
        '"트럼프의 전방위 관세는 글로벌 공급망을 구조적으로 재편할 것이다. 2026년 글로벌 무역량은 5-8% 줄어들 것이며, 미국 내 수입 물가 상승으로 연준이 금리를 다시 올려야 하는 상황이 올 수 있다."',
      actualOutcome: "미결",
      accuracyNote: "2026년 3월 예측, 결과 미확인",
      outcome: "미결",
      source: "차트북 뉴스레터, 2026.03.05",
    },
  },
  {
    expertId: "nouriel-roubini",
    recentView:
      "관세전쟁·달러 약세·연준 딜레마가 동시에 작동 중. 2026년 미국 경기침체 확률 45%. 스태그플레이션 재현 시나리오가 현실화되고 있다.",
  },
  {
    expertId: "michael-kofman",
    recentView:
      "러시아는 휴전 협상을 시간 벌기로 활용하면서 2026년 하반기 대공세를 준비 중. 서방이 협상 레버리지를 잘못 사용하면 우크라이나가 불리한 조건의 동결에 갇힐 수 있다.",
  },
  {
    expertId: "bonnie-glaser",
    recentView:
      "미국의 무역전쟁이 대만해협으로 연결될 위험이 있다. 중국은 미국의 경제 집중을 틈타 대만 압박을 강화하는 타이밍을 노리고 있다. 3월 PLA 훈련 규모 확대가 신호.",
  },
  {
    expertId: "ian-bremmer",
    recentView:
      "트럼프 관세전쟁은 단순한 무역 정책이 아니라 지정학적 재편 도구다. 동맹국도 예외 없이 적용되면서 NATO와 G7의 결속력이 시험대에 올랐다. 2026년 최대 리스크는 '미국이 동맹을 적으로 만드는 것'.",
  },
];
