"use client";

import { useLivePrices } from "@/components/LivePriceProvider";

const ASSET_NAMES: Record<string, string> = {
  kospi: "KOSPI",
  sp500: "S&P 500",
  nasdaq: "NASDAQ",
  kosdaq: "KOSDAQ",
  dxy: "달러인덱스",
  gold: "금",
  "wti-oil": "WTI유",
  copper: "구리",
  "usd-krw": "USD/KRW",
  "usd-jpy": "USD/JPY",
  "us-10y-yield": "미국10Y",
};

export default function PriceTicker() {
  const { prices } = useLivePrices();

  const items = Array.from(prices.values());
  if (items.length === 0) return null;

  // Duplicate items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="w-full overflow-hidden bg-slate-900/80 border-b border-slate-800">
      <div className="ticker-scroll flex items-center whitespace-nowrap py-2">
        {doubled.map((p, idx) => {
          const isPositive = p.changePercent > 0;
          const isNegative = p.changePercent < 0;
          const changeColor = isPositive
            ? "text-red-400"
            : isNegative
              ? "text-blue-400"
              : "text-slate-400";
          const name = ASSET_NAMES[p.assetId] || p.assetId;

          return (
            <span key={`${p.assetId}-${idx}`} className="inline-flex items-center gap-2 px-4">
              <span className="text-xs text-slate-400">{name}</span>
              <span className="text-xs font-mono text-white">
                {p.price.toLocaleString("ko-KR")}
              </span>
              <span className={`text-[11px] font-mono ${changeColor}`}>
                {isPositive ? "+" : ""}
                {p.changePercent.toFixed(2)}%
              </span>
              <span className="text-slate-700 mx-1">|</span>
            </span>
          );
        })}
      </div>
      <style jsx>{`
        .ticker-scroll {
          animation: ticker-scroll 40s linear infinite;
        }
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
