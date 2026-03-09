import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ChevronRight, Zap } from "lucide-react";
import type { Factor } from "@/types";
import { getRiskColor } from "./ui/RiskGauge";

interface FactorCardProps {
  factor: Factor;
  compact?: boolean;
}

const categoryColors: Record<string, { text: string; bg: string }> = {
  "정책": { text: "text-blue-400", bg: "bg-blue-400/10" },
  "지정학": { text: "text-red-400", bg: "bg-red-400/10" },
  "경제지표": { text: "text-emerald-400", bg: "bg-emerald-400/10" },
  "시장심리": { text: "text-yellow-400", bg: "bg-yellow-400/10" },
  "구조적변화": { text: "text-purple-400", bg: "bg-purple-400/10" },
};

function getDirectionArrow(dir: string) {
  if (dir === "강세" || dir === "상승") return { icon: TrendingUp, color: "text-red-400" };
  if (dir === "약세" || dir === "하락") return { icon: TrendingDown, color: "text-blue-400" };
  return { icon: Minus, color: "text-slate-400" };
}

export default function FactorCard({ factor, compact = false }: FactorCardProps) {
  const TrendIcon = factor.probTrend === "상승" ? TrendingUp : factor.probTrend === "하락" ? TrendingDown : Minus;
  const trendColor = factor.probTrend === "상승" ? "text-red-400" : factor.probTrend === "하락" ? "text-green-400" : "text-slate-400";
  const cat = categoryColors[factor.category] || categoryColors["정책"];

  return (
    <Link href={`/factors/${factor.id}`} className="block group">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 hover:bg-slate-800/50 transition-all">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${cat.text} ${cat.bg}`}>
                {factor.category}
              </span>
              <span className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                {factor.probTrend}
              </span>
            </div>
            <h3 className="font-semibold text-white text-base group-hover:text-blue-300 transition-colors leading-tight">
              {factor.title}
            </h3>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-2xl font-bold ${getRiskColor(factor.probability)}`}>{factor.probability}%</p>
            <p className="text-xs text-slate-500">영향 확률</p>
          </div>
        </div>

        {!compact && (
          <p className="text-sm text-slate-400 mb-3 line-clamp-2">{factor.summary}</p>
        )}

        {/* 영향 자산 미니 표시 */}
        {factor.impactedAssetIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {factor.impactedAssetIds.slice(0, 5).map((assetId) => {
              const dir = factor.impactDirection[assetId];
              const arrow = dir ? getDirectionArrow(dir) : { icon: Minus, color: "text-slate-400" };
              const ArrowIcon = arrow.icon;
              return (
                <span key={assetId} className="flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded">
                  <span className="text-slate-300">{assetId}</span>
                  <ArrowIcon className={`w-3 h-3 ${arrow.color}`} />
                </span>
              );
            })}
          </div>
        )}

        {/* 시그널 요약 */}
        {factor.signals.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <Zap className="w-3 h-3 text-yellow-400" />
            최근 시그널 {factor.signals.length}건
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-500">
            영향 자산 {factor.impactedAssetIds.length}개 · 전문가 {factor.relatedExpertIds.length}명
          </span>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
}
