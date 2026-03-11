"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  subtext?: string;
}

const trendConfig = {
  up: { Icon: TrendingUp, color: "text-red-400" },
  down: { Icon: TrendingDown, color: "text-blue-400" },
  neutral: { Icon: Minus, color: "text-slate-400" },
};

export default function StatCard({ label, value, icon: MainIcon, trend, subtext }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <MainIcon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && (
          <span className={trendConfig[trend].color}>
            {(() => {
              const TrendIcon = trendConfig[trend].Icon;
              return <TrendIcon className="w-4 h-4 mb-1" />;
            })()}
          </span>
        )}
      </div>
      {subtext && <p className="text-[11px] text-slate-500 mt-1">{subtext}</p>}
    </div>
  );
}
