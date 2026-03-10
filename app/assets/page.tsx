import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, BarChart3, DollarSign,
  Droplets, Activity, Factory, ChevronRight, ExternalLink,
  AlertTriangle, Zap, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { assets, getAssetsByCategory } from "@/data/assets";
import { getFactorsForAsset } from "@/data/factors";
import { getETFByTicker } from "@/data/koreanETFs";
import type { AssetCategory, Asset } from "@/types";

export const revalidate = 43200;

const categoryMeta: Record<AssetCategory, { label: string; description: string; icon: typeof TrendingUp; color: string; bgColor: string }> = {
  "금리": {
    label: "금리",
    description: "중앙은행 기준금리와 장기채 수익률",
    icon: BarChart3,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
  },
  "환율": {
    label: "환율",
    description: "주요 통화쌍 및 달러 강세 흐름",
    icon: DollarSign,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  "원자재": {
    label: "원자재",
    description: "금, 원유, 산업금속 등 실물 자산",
    icon: Droplets,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
  },
  "지수": {
    label: "주요 지수",
    description: "국내외 대표 주가지수",
    icon: TrendingUp,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
  },
  "산업": {
    label: "산업 섹터",
    description: "주요 산업별 투자 테마",
    icon: Factory,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
  },
};

function getChangeColor(change: number): string {
  if (change > 0) return "text-red-400";
  if (change < 0) return "text-blue-400";
  return "text-slate-400";
}

function getChangeBg(change: number): string {
  if (change > 0) return "bg-red-400/10";
  if (change < 0) return "bg-blue-400/10";
  return "bg-slate-400/10";
}

function getTrendLabel(change: number): { label: string; icon: typeof TrendingUp } {
  if (change > 2) return { label: "강한 상승세", icon: TrendingUp };
  if (change > 0) return { label: "소폭 상승", icon: ArrowUpRight };
  if (change < -2) return { label: "강한 하락세", icon: TrendingDown };
  if (change < 0) return { label: "소폭 하락", icon: ArrowDownRight };
  return { label: "보합", icon: Minus };
}

function formatValue(value: number, unit: string): string {
  if (unit === "원/3.75g") return value.toLocaleString() + "원/돈";
  if (unit === "원" || unit === "원/돈" || unit === "원/리터" || unit === "원/kg") return value.toLocaleString() + "원";
  if (unit === "%") return value.toFixed(2) + "%";
  if (unit === "달러/온스" || unit === "달러/배럴" || unit === "달러/톤") return "$" + value.toLocaleString();
  if (unit === "pt" || unit === "지수") return value.toLocaleString();
  if (unit === "엔") return "\u00A5" + value.toFixed(1);
  return value.toLocaleString() + unit;
}

function AssetOutlookCard({ asset }: { asset: Asset }) {
  const factors = getFactorsForAsset(asset.id);
  const trend = getTrendLabel(asset.changePercent);
  const TrendIcon = trend.icon;

  // Get related ETFs
  const relatedETFs = (asset.relatedETFTickers || [])
    .map((ticker) => getETFByTicker(ticker))
    .filter(Boolean);

  // Pick top factors (max 3)
  const topFactors = factors.slice(0, 3);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all">
      {/* Header: Name + Price */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 mb-0.5">{asset.nameEn}</p>
            <Link
              href={`/assets/${asset.id}`}
              className="font-semibold text-white text-base hover:text-blue-300 transition-colors"
            >
              {asset.name}
            </Link>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-bold text-white">{formatValue(asset.currentValue, asset.unit)}</p>
            <div className={`flex items-center justify-end gap-1 ${getChangeColor(asset.changePercent)}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">
                {asset.changePercent > 0 ? "+" : ""}{asset.changePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Trend badge */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getChangeBg(asset.changePercent)} ${getChangeColor(asset.changePercent)}`}>
          <TrendIcon className="w-3 h-3" />
          {trend.label}
        </div>
      </div>

      {/* Description (medium-term outlook) */}
      <div className="px-5 pb-4">
        <p className="text-sm text-slate-400 leading-relaxed">
          {asset.description}
        </p>
      </div>

      {/* Key Factors */}
      {topFactors.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            핵심 변동 요인
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topFactors.map((factor) => {
              const dir = factor.impactDirection[asset.id];
              const dirColor = dir === "강세" ? "text-red-400 border-red-400/20"
                : dir === "약세" ? "text-blue-400 border-blue-400/20"
                : "text-slate-400 border-slate-700";
              return (
                <Link
                  key={factor.id}
                  href={`/factors/${factor.id}`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border bg-slate-800/50 hover:bg-slate-800 transition-colors ${dirColor}`}
                >
                  {dir === "강세" ? <ArrowUpRight className="w-3 h-3" /> : dir === "약세" ? <ArrowDownRight className="w-3 h-3" /> : null}
                  {factor.title.length > 14 ? factor.title.slice(0, 14) + "..." : factor.title}
                </Link>
              );
            })}
            {factors.length > 3 && (
              <span className="text-xs text-slate-600 self-center">+{factors.length - 3}</span>
            )}
          </div>
        </div>
      )}

      {/* Related ETFs */}
      {relatedETFs.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-medium text-slate-500 mb-2">관련 ETF</p>
          <div className="flex flex-wrap gap-1.5">
            {relatedETFs.map((etf) => etf && (
              <span
                key={etf.ticker}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-300 border border-slate-700"
              >
                {etf.nameKr}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <Link
        href={`/assets/${asset.id}`}
        className="flex items-center justify-between px-5 py-3 border-t border-slate-800 hover:bg-slate-800/50 transition-colors group"
      >
        <span className="text-xs text-slate-500">
          {factors.length}개 변동요인 {relatedETFs.length > 0 && `\u00B7 ${relatedETFs.length}개 ETF`}
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-500 group-hover:text-blue-400 transition-colors">
          상세 전망
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </Link>
    </div>
  );
}

export default function AssetsPage() {
  const categories: AssetCategory[] = ["금리", "환율", "원자재", "지수", "산업"];

  // Calculate summary stats
  const totalAssets = assets.length;
  const risingAssets = assets.filter((a) => a.changePercent > 0).length;
  const fallingAssets = assets.filter((a) => a.changePercent < 0).length;
  const flatAssets = assets.filter((a) => a.changePercent === 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-3">
          <Activity className="w-4 h-4" />
          <span>자산 전망 대시보드</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          자산별 중장기 전망
        </h1>
        <p className="text-slate-400 text-base max-w-2xl">
          금리, 환율, 원자재, 주요 지수, 산업 섹터의 현재 상태와 중장기 방향성을 한눈에 파악하세요.
          각 자산의 핵심 변동 요인과 관련 ETF 정보를 함께 제공합니다.
        </p>
      </div>

      {/* Market overview bar */}
      <div className="flex flex-wrap items-center gap-4 mb-10 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">전체 {totalAssets}개 자산</span>
          <span className="text-slate-700">|</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-red-400" />
          <span className="text-sm text-red-400 font-medium">{risingAssets}개 상승</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-sm text-blue-400 font-medium">{fallingAssets}개 하락</span>
        </div>
        {flatAssets > 0 && (
          <div className="flex items-center gap-1.5">
            <Minus className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm text-slate-400 font-medium">{flatAssets}개 보합</span>
          </div>
        )}
        <div className="ml-auto">
          <Link
            href="/predictions"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors"
          >
            AI 예측 확률 보기
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Category sections */}
      {categories.map((cat) => {
        const meta = categoryMeta[cat];
        const Icon = meta.icon;
        const catAssets = getAssetsByCategory(cat);

        return (
          <section key={cat} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${meta.bgColor}`}>
                <Icon className={`w-4.5 h-4.5 ${meta.color}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{meta.label}</h2>
                <p className="text-xs text-slate-500">{meta.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catAssets.map((asset) => (
                <AssetOutlookCard key={asset.id} asset={asset} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Bottom note */}
      <div className="mt-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          본 페이지의 자산 정보는 중장기적 방향성 파악을 위한 참고 자료이며 투자 조언이 아닙니다.
          AI 기반 확률 예측은{" "}
          <Link href="/predictions" className="text-blue-400 hover:underline">AI 예측 페이지</Link>
          에서 확인하세요.
        </p>
      </div>
    </div>
  );
}
