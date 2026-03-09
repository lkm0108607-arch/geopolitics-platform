import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Activity, ChevronRight } from "lucide-react";
import type { Asset, AssetConsensusResult } from "@/types";

interface AssetCardProps {
  asset: Asset;
  consensus?: AssetConsensusResult;
  compact?: boolean;
}

function getChangeColor(change: number): string {
  if (change > 0) return "text-red-400";
  if (change < 0) return "text-blue-400";
  return "text-slate-400";
}

function getDirectionInfo(direction: string) {
  switch (direction) {
    case "상승": return { icon: TrendingUp, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30", label: "상승" };
    case "하락": return { icon: TrendingDown, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30", label: "하락" };
    case "변동성확대": return { icon: Activity, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", label: "변동성" };
    default: return { icon: Minus, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/30", label: "보합" };
  }
}

function formatValue(value: number, unit: string): string {
  if (unit === "원") return value.toLocaleString() + "원";
  if (unit === "%") return value.toFixed(2) + "%";
  if (unit === "달러/온스" || unit === "달러/배럴" || unit === "달러/톤") return "$" + value.toLocaleString();
  if (unit === "pt") return value.toLocaleString();
  if (unit === "엔") return "¥" + value.toFixed(1);
  return value.toLocaleString() + unit;
}

export default function AssetCard({ asset, consensus, compact = false }: AssetCardProps) {
  const dir = consensus ? getDirectionInfo(consensus.direction) : null;
  const DirIcon = dir?.icon || Minus;

  return (
    <Link href={`/assets/${asset.id}`} className="block group">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 hover:bg-slate-800/50 transition-all">
        {/* 상단: 이름 + 현재가 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 mb-0.5">{asset.nameEn}</p>
            <h3 className="font-semibold text-white text-base group-hover:text-blue-300 transition-colors">
              {asset.name}
            </h3>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-bold text-white">{formatValue(asset.currentValue, asset.unit)}</p>
            <p className={`text-sm font-medium ${getChangeColor(asset.changePercent)}`}>
              {asset.changePercent > 0 ? "+" : ""}{asset.changePercent.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* 전문가 컨센서스 */}
        {consensus && (
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 border ${dir!.bg} ${dir!.border} mb-3`}>
            <div className="flex items-center gap-2">
              <DirIcon className={`w-4 h-4 ${dir!.color}`} />
              <span className={`text-sm font-semibold ${dir!.color}`}>
                전문가 컨센서스: {dir!.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {consensus.bullCount > 0 && (
                <span className="text-red-400">{consensus.bullCount}명 상승</span>
              )}
              {consensus.bearCount > 0 && (
                <span className="text-blue-400">{consensus.bearCount}명 하락</span>
              )}
              {consensus.neutralCount > 0 && (
                <span className="text-slate-400">{consensus.neutralCount}명 보합</span>
              )}
            </div>
          </div>
        )}

        {!compact && consensus && (
          <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
            <span>신뢰도 {consensus.confidence}%</span>
            <span>참여 전문가 평균 {consensus.avgExpertCredibility}점</span>
          </div>
        )}

        {/* 하단 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-500">
            {asset.relatedFactorIds.length}개 변동요인
          </span>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

export { formatValue, getDirectionInfo, getChangeColor };
