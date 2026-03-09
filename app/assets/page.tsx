import { TrendingUp, BarChart3, DollarSign, Droplets, Activity } from "lucide-react";
import { assets, getAssetsByCategory } from "@/data/assets";
import { assetPredictions } from "@/data/assetPredictions";
import { getAllExperts } from "@/data/experts";
import { calculateAssetConsensus } from "@/lib/assetProbability";
import AssetCard from "@/components/AssetCard";
import type { AssetCategory } from "@/types";

export const revalidate = 43200;

const categoryMeta: Record<AssetCategory, { label: string; icon: typeof TrendingUp; color: string }> = {
  "금리": { label: "금리", icon: BarChart3, color: "text-emerald-400" },
  "환율": { label: "환율", icon: DollarSign, color: "text-blue-400" },
  "원자재": { label: "원자재", icon: Droplets, color: "text-yellow-400" },
  "지수": { label: "지수", icon: TrendingUp, color: "text-purple-400" },
};

export default function AssetsPage() {
  const allExperts = getAllExperts();
  const categories: AssetCategory[] = ["금리", "환율", "원자재", "지수"];

  // 각 자산별 컨센서스 미리 계산
  const consensusMap = new Map(
    assets.map((a) => [a.id, calculateAssetConsensus(a, assetPredictions, allExperts)])
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-3">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>전문가 신뢰도 기반 자산 전망</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          자산별 전문가 컨센서스
        </h1>
        <p className="text-slate-400 text-base max-w-2xl">
          과거 적중률이 검증된 전문가들의 예측을 신뢰도 가중 방식으로 종합합니다.
          각 자산을 클릭하면 예측 근거와 과거 유사 패턴을 확인할 수 있습니다.
        </p>
      </div>

      {/* 카테고리별 자산 목록 */}
      {categories.map((cat) => {
        const meta = categoryMeta[cat];
        const Icon = meta.icon;
        const catAssets = getAssetsByCategory(cat);

        return (
          <section key={cat} className="mb-10">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Icon className={`w-5 h-5 ${meta.color}`} />
              {meta.label}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  consensus={consensusMap.get(asset.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
