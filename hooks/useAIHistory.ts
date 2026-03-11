"use client";

import { useState, useEffect, useCallback } from "react";

export interface AccuracyStats {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  averageConfidence: number;
}

export interface PredictionResult {
  cycleId: string;
  assetId: string;
  direction: string;
  probability: number;
  confidence: number;
  actualDirection: string | null;
  correct: boolean | null;
  generatedAt: string;
  evaluatedAt: string | null;
}

export interface LearningLog {
  cycleId: string;
  timestamp: string;
  adjustments: string;
  reason: string;
}

export interface WeightEntry {
  cycleId: string;
  timestamp: string;
  weights: Record<string, number>;
}

export interface UseAIHistory {
  accuracy: AccuracyStats | null;
  results: PredictionResult[];
  learningLogs: LearningLog[];
  weightHistory: WeightEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAIHistory(assetId?: string): UseAIHistory {
  const [accuracy, setAccuracy] = useState<AccuracyStats | null>(null);
  const [results, setResults] = useState<PredictionResult[]>([]);
  const [learningLogs, setLearningLogs] = useState<LearningLog[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (assetId) {
        params.set("assetId", assetId);
      }

      const url = `/api/ai/history${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();

      if (data.accuracy) setAccuracy(data.accuracy);
      if (Array.isArray(data.results)) setResults(data.results);
      if (Array.isArray(data.learningLogs)) setLearningLogs(data.learningLogs);
      if (Array.isArray(data.weightHistory)) setWeightHistory(data.weightHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch AI history");
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  // Fetch on mount and when assetId changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { accuracy, results, learningLogs, weightHistory, isLoading, error, refresh };
}
