import { TrendingUp, BarChart3, DollarSign, Droplets, Activity, Users, Target, CheckCircle } from "lucide-react";
import { assets, getAssetsByCategory } from "@/data/assets";
import { getAllAssetPredictions, getAssetPredictionStats } from "@/data/assetPredictions";
import { getTopExperts, getExpertStats } from "@/data/experts";
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
  const topExperts = getTopExperts(500);
  const stats = getExpertStats();
  const allPreds = getAllAssetPredictions();
  const categories: AssetCategory[] = ["금리", "환율", "원자재", "지수"];

  const consensusMap = new Map(
    assets.map((a) => [a.id, calculateAssetConsensus(a, allPreds, topExperts)])
  );

  const totalPreds = allPreds.length;
  const resolvedPreds = allPreds.filter((p) => p.result && p.result !== "미결");
  const overallRate = resolvedPreds.length > 0
    ? Math.round(((resolvedPreds.filter(p=>p.result==="적중").length + resolvedPreds.filter(p=>p.result==="부분적중").length * 0.5) / resolvedPreds.length) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-3">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>적중률 검증 기반 자산 전망</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          자산별 전문가 예측 확률
        </h1>
        <p className="text-slate-400 text-base max-w-2xl">
          {stats.total.toLocaleString()}명 전문가의 과거 적중률을 검증하고, 적중률이 높은 전문가의 현재 견해에
          더 높은 가중치를 부여하여 각 자산의 방향을 확률적으로 예측합니다.
        </p>
      </div>

      {/* 전체 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <Users className="w-4 h-4 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p>
          <p className="text-xs text-slate-400">등록 전문가</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <BarChart3 className="w-4 h-4 text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-white">{totalPreds.toLocaleString()}</p>
          <p className="text-xs text-slate-400">자산 예측 건수</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <Target className="w-4 h-4 text-emerald-400 mb-2" />
          <p className={`text-2xl font-bold ${overallRate >= 50 ? "text-emerald-400" : "text-yellow-400"}`}>{overallRate}%</p>
          <p className="text-xs text-slate-400">전체 적중률</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <CheckCircle className="w-4 h-4 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-white">{resolvedPreds.length}</p>
          <p className="text-xs text-slate-400">검증 완료</p>
        </div>
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
