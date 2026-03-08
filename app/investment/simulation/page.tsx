"use client";

import { useState, useEffect } from "react";
import { Wallet } from "lucide-react";
import { etfRecommendations } from "@/data/investmentStrategy";

export default function SimulationPage() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Wallet className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-400 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-4">모의투자 테스트</h1>
      <p className="text-slate-400 mb-4">ETF 데이터 로드 확인: {etfRecommendations.length}개 종목</p>
      <div className="space-y-2">
        {etfRecommendations.map((etf) => (
          <div key={etf.ticker} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex justify-between">
            <div>
              <p className="text-sm font-medium text-white">{etf.nameKr}</p>
              <p className="text-xs text-slate-500">{etf.ticker} · {etf.category}</p>
            </div>
            <p className="text-sm text-white">{etf.currentPrice.toLocaleString()}원</p>
          </div>
        ))}
      </div>
    </div>
  );
}
