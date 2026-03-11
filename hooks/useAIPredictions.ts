"use client";

import { useState, useEffect, useCallback } from "react";

export interface SubModelVote {
  direction: string;
  confidence: number;
  rationale: string;
}

export interface AIPrediction {
  assetId: string;
  direction: "상승" | "하락" | "보합" | "변동성확대";
  probability: number;
  confidence: number;
  rationale: string;
  subModelVotes: {
    momentum: SubModelVote;
    meanReversion: SubModelVote;
    volatility: SubModelVote;
    correlation: SubModelVote;
    fundamental: SubModelVote;
  };
  generatedAt: string;
  cycleId: string;
  historicalAnalysis?: {
    regime: string;
    regimeConfidence: number;
    historicalBias: {
      direction: "상승" | "하락" | "보합";
      strength: number;
      similarPeriodCount: number;
      avgReturnAfter: number;
      winRate: number;
    };
    patterns: Array<{ name: string; signal: string }>;
  } | null;
  debateResult?: {
    agreementLevel: string;
    consensusDirection: string;
    consensusConfidence: number;
    keyArguments: string[];
    resolvedConflicts: string[];
    unresolvedConflicts: string[];
  } | null;
  juryVerdict?: {
    finalVerdict: string;
    finalConfidence: number;
    verdictSummary: { trust: number; partialTrust: number; doubt: number; distrust: number };
    dissentingCount: number;
  } | null;
  timingPrediction?: {
    entrySignal: "강력매수" | "매수" | "관망" | "매도" | "강력매도";
    expectedPeakDays: number;
    expectedTroughDays: number;
    expectedReturnPercent: number;
    stopLossPercent: number;
    holdingPeriodDays: number;
    trendDurationDays: number;
    entryTiming: string;
    exitTiming: string;
    riskReward: number;
  } | null;
}

export interface UseAIPredictions {
  predictions: AIPrediction[];
  cycleId: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const REFRESH_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export function useAIPredictions(): UseAIPredictions {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/predict");
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();

      if (Array.isArray(data.predictions)) {
        setPredictions(data.predictions);
      }
      if (data.cycleId) {
        setCycleId(data.cycleId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch AI predictions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh every 3 minutes
  useEffect(() => {
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { predictions, cycleId, isLoading, error, refresh };
}
