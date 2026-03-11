"use client";

interface LivePriceCardProps {
  assetId: string;
  price: number;
  changePercent: number;
  name: string;
  compact?: boolean;
}

export default function LivePriceCard({
  assetId,
  price,
  changePercent,
  name,
  compact = false,
}: LivePriceCardProps) {
  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;
  const changeColor = isPositive ? "text-red-400" : isNegative ? "text-blue-400" : "text-slate-400";
  const changeBg = isPositive
    ? "bg-red-500/10"
    : isNegative
      ? "bg-blue-500/10"
      : "bg-slate-500/10";

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-xs text-slate-300 font-medium truncate">{name}</span>
        <span className="text-xs font-mono text-white">
          {price.toLocaleString("ko-KR")}
        </span>
        <span className={`text-[11px] font-mono ${changeColor}`}>
          {isPositive ? "+" : ""}
          {changePercent.toFixed(2)}%
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-300">{name}</span>
        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${changeBg} ${changeColor}`}>
          {isPositive ? "+" : ""}
          {changePercent.toFixed(2)}%
        </span>
      </div>
      <div className="text-lg font-mono font-bold text-white">
        {price.toLocaleString("ko-KR")}
      </div>
    </div>
  );
}
