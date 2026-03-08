/**
 * 플랫폼 메타데이터 & 월별 갱신 설정
 *
 * ─── 갱신 방법 ──────────────────────────────────────────────────────────────
 * 1. `npm run refresh` 실행 → scripts/monthly-refresh.ts가 자동 갱신
 * 2. 새 월별 파일 data/monthly/YYYY-MM.ts 작성 후 위 스크립트 실행
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface PlatformMeta {
  lastRefreshed: string;   // ISO date — 마지막 갱신일
  nextRefresh: string;     // ISO date — 다음 갱신 예정일
  currentMonth: string;    // "YYYY-MM" 형식
  version: string;         // 데이터 버전
  hotIssueIds: string[];   // 이달의 핫이슈 (수동 설정 가능)
  editorNote?: string;     // 이달 갱신 주요 사항
  refreshCycle: "daily" | "weekly" | "monthly";  // 갱신 주기
  currentWeekStart: string;  // 이번 주 시작일 (월요일)
  currentWeekEnd: string;    // 이번 주 종료일 (일요일)
}

export const platformMeta: PlatformMeta = {
  lastRefreshed:  "2026-03-08",
  nextRefresh:    "2026-03-09",
  currentMonth:   "2026-03",
  version:        "2026.03.8",
  refreshCycle:   "daily",
  currentWeekStart: "2026-03-02",
  currentWeekEnd:   "2026-03-08",
  hotIssueIds: [
    "us-tariff-war",        // 트럼프 관세전쟁 — 3월 최대 이슈
    "russia-ukraine",       // 러우 휴전 협상
    "us-china-taiwan",      // 대만해협 긴장
    "global-ai-governance", // AI 패권
    "north-korea",          // 북핵·러북 군사협력
    "europe-fragmentation", // 유럽 NATO 균열
  ],
  editorNote:
    "2026년 3월 8일: 트럼프 2기 고관세 정책 전면화로 글로벌 무역전쟁 격화. " +
    "러우 휴전 협상 3라운드 진행 중. AI 규제 G7 표준 두고 미중 대립 심화. " +
    "매일 업데이트 · 주간 예측 리포트 발행.",
};

/** 다음 갱신까지 남은 일수 */
export function daysUntilRefresh(meta: PlatformMeta = platformMeta): number {
  const diff = new Date(meta.nextRefresh).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** 갱신 시점 초과 여부 */
export function isRefreshDue(meta: PlatformMeta = platformMeta): boolean {
  return new Date(meta.nextRefresh) <= new Date();
}

/** 갱신일 한국어 표기 */
export function formatRefreshDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 현재 주차 번호 (ISO 8601) */
export function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil((diff / oneWeek) + start.getDay() / 7);
}

/** 오늘 날짜 한국어 */
export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 주간 범위 한국어 표기 */
export function formatWeekRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`;
}
