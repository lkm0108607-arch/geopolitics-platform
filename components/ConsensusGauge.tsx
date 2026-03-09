import type { AssetConsensusResult } from "@/types";
import { TrendingUp, TrendingDown, Activity, Minus } from "lucide-react";

interface ConsensusGaugeProps {
  consensus: AssetConsensusResult;
  size?: "sm" | "md" | "lg";
}

export default function ConsensusGauge({ consensus, size = "md" }: ConsensusGaugeProps) {
  const total = consensus.bullCount + consensus.bearCount + consensus.neutralCount;
  if (total === 0) {
    return (
      <div className="text-xs text-slate-500 text-center py-2">전문가 예측 없음</div>
    );
  }

  const bullPct = Math.round((consensus.bullCount / total) * 100);
  const bearPct = Math.round((consensus.bearCount / total) * 100);
  const neutralPct = 100 - bullPct - bearPct;

  const sizeClasses = {
    sm: { bar: "h-2", text: "text-xs" },
    md: { bar: "h-3", text: "text-sm" },
    lg: { bar: "h-4", text: "text-base" },
  };

  const s = sizeClasses[size];

  const dirIcon = consensus.direction === "상승" ? TrendingUp
    : consensus.direction === "하락" ? TrendingDown
    : consensus.direction === "변동성확대" ? Activity
    : Minus;
  const DirIcon = dirIcon;

  const dirColor = consensus.direction === "상승" ? "text-red-400"
    : consensus.direction === "하락" ? "text-blue-400"
    : consensus.direction === "변동성확대" ? "text-yellow-400"
    : "text-slate-400";

  return (
    <div>
      {/* 방향 라벨 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <DirIcon className={`w-4 h-4 ${dirColor}`} />
          <span className={`${s.text} font-semibold ${dirColor}`}>
            컨센서스: {consensus.direction}
          </span>
        </div>
        <span className="text-xs text-slate-500">
          신뢰도 {consensus.confidence}%
        </span>
      </div>

      {/* 비율 바 */}
      <div className={`flex w-full ${s.bar} rounded-full overflow-hidden bg-slate-800`}>
        {bullPct > 0 && (
          <div className="bg-red-500 transition-all" style={{ width: `${bullPct}%` }} />
        )}
        {neutralPct > 0 && (
          <div className="bg-slate-600 transition-all" style={{ width: `${neutralPct}%` }} />
        )}
        {bearPct > 0 && (
          <div className="bg-blue-500 transition-all" style={{ width: `${bearPct}%` }} />
        )}
      </div>

      {/* 라벨 */}
      <div className="flex justify-between mt-1.5 text-xs">
        <span className="text-red-400">상승 {consensus.bullCount}명 ({bullPct}%)</span>
        {consensus.neutralCount > 0 && (
          <span className="text-slate-400">보합 {consensus.neutralCount}명</span>
        )}
        <span className="text-blue-400">하락 {consensus.bearCount}명 ({bearPct}%)</span>
      </div>
    </div>
  );
}
