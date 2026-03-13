"use client";

import { useState, useEffect, useCallback } from "react";

export interface AutoTrade {
  id: string;
  cycle_id: string;
  asset_id: string;
  name: string;
  signal: string;
  weight: number;
  entry_price: number;
  tp_target: number;
  sl_target: number;
  predicted_return: number;
  holding_days: number;
  status: "pending" | "filled" | "tp_hit" | "sl_hit" | "expired" | "cancelled";
  fill_price: number | null;
  fill_date: string | null;
  exit_price: number | null;
  exit_date: string | null;
  exit_reason: string | null;
  actual_return: number | null;
  exit_day: number | null;
  created_at: string;
  expires_at: string;
}

export function useAutoTrades() {
  const [trades, setTrades] = useState<AutoTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/auto-trades");
      const data = await res.json();
      if (data.success && data.trades) {
        setTrades(data.trades as AutoTrade[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "자동매매 조회 실패");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  return { trades, isLoading, error, refresh: fetchTrades };
}
