"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Activity, ChevronRight } from "lucide-react";
import type { Asset, AssetConsensusResult } from "@/types";
import { useTranslation } from "@/components/LanguageProvider";
import { formatValueLocale } from "@/lib/localeUnits";

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

function getDirectionInfo(direction: string, t: any) {
  switch (direction) {
    case "상승": return { icon: TrendingUp, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30", label: t.factors.rising };
    case "하락": return { icon: TrendingDown, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30", label: t.factors.falling };
    case "변동성확대": return { icon: Activity, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", label: t.assets.volatility };
    default: return { icon: Minus, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/30", label: t.assets.sideways };
  }
}

export default function AssetCard({ asset, consensus, compact = false }: AssetCardProps) {
  const { locale, t } = useTranslation();
  const dir = consensus ? getDirectionInfo(consensus.direction, t) : null;
  const DirIcon = dir?.icon || Minus;

  const displayName = asset.name;
  const secondaryName = asset.nameEn;

  return (
    <Link href={`/assets/${asset.id}`} className="block group">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 hover:bg-slate-800/50 transition-all">
        {/* Top: Name + Current price */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 mb-0.5">{secondaryName}</p>
            <h3 className="font-semibold text-white text-base group-hover:text-blue-300 transition-colors">
              {displayName}
            </h3>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-bold text-white">{formatValueLocale(asset.currentValue, asset.unit, locale as any)}</p>
            <p className={`text-sm font-medium ${getChangeColor(asset.changePercent)}`}>
              {asset.changePercent > 0 ? "+" : ""}{asset.changePercent.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Expert consensus */}
        {consensus && (
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 border ${dir!.bg} ${dir!.border} mb-3`}>
            <div className="flex items-center gap-2">
              <DirIcon className={`w-4 h-4 ${dir!.color}`} />
              <span className={`text-sm font-semibold ${dir!.color}`}>
                {t.assets.consensus}: {dir!.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {consensus.bullCount > 0 && (
                <span className="text-red-400">{consensus.bullCount}{t.home.people} {t.factors.rising}</span>
              )}
              {consensus.bearCount > 0 && (
                <span className="text-blue-400">{consensus.bearCount}{t.home.people} {t.factors.falling}</span>
              )}
              {consensus.neutralCount > 0 && (
                <span className="text-slate-400">{consensus.neutralCount}{t.home.people} {t.assets.sideways}</span>
              )}
            </div>
          </div>
        )}

        {!compact && consensus && (
          <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
            <span>{t.assets.confidenceLabel} {consensus.confidence}%</span>
            <span>{t.assets.avgExpertScore} {consensus.avgExpertCredibility}{t.assets.points}</span>
          </div>
        )}

        {/* Bottom */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-500">
            {t.assets.factorCount.replace("{count}", String(asset.relatedFactorIds.length))}
          </span>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

export { getChangeColor };

function getDirectionInfoLegacy(direction: string) {
  switch (direction) {
    case "상승": return { icon: TrendingUp, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30", label: "상승" };
    case "하락": return { icon: TrendingDown, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30", label: "하락" };
    case "변동성확대": return { icon: Activity, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", label: "변동성" };
    default: return { icon: Minus, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/30", label: "보합" };
  }
}

export { getDirectionInfoLegacy as getDirectionInfo };
