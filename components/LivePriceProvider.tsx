"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { LivePrice } from "@/lib/realtime/priceService";

const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds

interface LivePriceContextValue {
  prices: Map<string, LivePrice>;
  lastFetched: Date | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const LivePriceContext = createContext<LivePriceContextValue>({
  prices: new Map(),
  lastFetched: null,
  isLoading: false,
  error: null,
  refresh: async () => {},
});

export function useLivePrices(): LivePriceContextValue {
  return useContext(LivePriceContext);
}

interface LivePriceProviderProps {
  children: ReactNode;
}

export function LivePriceProvider({ children }: LivePriceProviderProps) {
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/live-update");
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();
      const newPrices = new Map<string, LivePrice>();

      if (Array.isArray(data.prices)) {
        for (const p of data.prices) {
          newPrices.set(p.assetId, {
            assetId: p.assetId,
            price: p.price,
            previousClose: p.previousClose,
            changePercent: p.changePercent,
            updatedAt: p.updatedAt,
          });
        }
      }

      setPrices(newPrices);
      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch prices");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll every 60 seconds
  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <LivePriceContext.Provider
      value={{ prices, lastFetched, isLoading, error, refresh }}
    >
      {children}
    </LivePriceContext.Provider>
  );
}
