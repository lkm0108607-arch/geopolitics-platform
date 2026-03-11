"use client";

import { useState, useEffect, useCallback } from "react";

export type ExitReason = "익절" | "손절" | "기간종료";

export interface PortfolioResult {
  assetId: string;
  name: string;
  signal: string;
  weight: number;
  entryPrice: number | null;
  exitPrice: number | null;
  tpTarget: number | null;
  slTarget: number | null;
  exitReason: ExitReason;
  exitDay: number | null;
  predictedReturn: number;
  actualReturn: number;
  wasCorrect: boolean;
  pnl: number;
}

export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  portfolio: PortfolioResult[];
  portfolioReturn: number;
  hitRate: number;
  hitCount: number;
  totalCount: number;
  tpCount: number;
  slCount: number;
  holdCount: number;
  bestPick: { name: string; returnPercent: number } | null;
  worstPick: { name: string; returnPercent: number } | null;
  weeklyLesson: string;
}

export function useWeeklyReport() {
  const [reports, setReports] = useState<WeeklyReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/weekly-report");
      const data = await res.json();
      if (data.success && data.reports) {
        setReports(data.reports as WeeklyReportData[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "주간 리포트 조회 실패");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, isLoading, error, refresh: fetchReports };
}
