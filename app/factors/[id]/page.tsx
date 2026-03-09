import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Activity, Clock, Zap, Users, ChevronRight } from "lucide-react";
import { factors, getFactorById } from "@/data/factors";
import { getAssetById } from "@/data/assets";
import { getAllExperts } from "@/data/experts";
import { getRiskColor } from "@/components/ui/RiskGauge";
import type { AssetDirection } from "@/types";

export const revalidate = 43200;

export function generateStaticParams() {
  return factors.map((f) => ({ id: f.id }));
}

function getDirectionArrow(dir: AssetDirection) {
  if (dir === "강세") return { icon: TrendingUp, color: "text-red-400", label: "강세" };
  if (dir === "약세") return { icon: TrendingDown, color: "text-blue-400", label: "약세" };
  if (dir === "변동성확대") return { icon: Activity, color: "text-yellow-400", label: "변동성" };
  return { icon: Minus, color: "text-slate-400", label: "중립" };
}

const categoryColors: Record<string, string> = {
  "정책": "text-blue-400 bg-blue-400/10",
  "지정학": "text-red-400 bg-red-400/10",
  "경제지표": "text-emerald-400 bg-emerald-400/10",
  "시장심리": "text-yellow-400 bg-yellow-400/10",
  "구조적변화": "text-purple-400 bg-purple-400/10",
};

export default async function FactorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factor = getFactorById(id);
  if (!factor) return notFound();

  const allExperts = getAllExperts();
  const expertMap = new Map(allExperts.map((e) => [e.id, e]));
  const relatedExperts = factor.relatedExpertIds
    .map((eid) => expertMap.get(eid))
    .filter(Boolean);
  const catColor = categoryColors[factor.category] || "text-slate-400 bg-slate-400/10";
  const TrendIcon = factor.probTrend === "상승" ? TrendingUp : factor.probTrend === "하락" ? TrendingDown : Minus;
  const trendColor = factor.probTrend === "상승" ? "text-red-400" : factor.probTrend === "하락" ? "text-green-400" : "text-slate-400";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/factors" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        변동 요인
      </Link>

      {/* Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${catColor}`}>
                {factor.category}
              </span>
              <span className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                {factor.probTrend}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{factor.title}</h1>
            <p className="text-sm text-slate-400 max-w-2xl">{factor.summary}</p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-bold ${getRiskColor(factor.probability)}`}>{factor.probability}%</p>
            <p className="text-xs text-slate-500 mt-1">영향 확률</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* 영향 자산 */}
          <section>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-orange-400" />
              영향 자산
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {factor.impactedAssetIds.map((assetId) => {
                const asset = getAssetById(assetId);
                const dir = factor.impactDirection[assetId] as AssetDirection;
                const mag = factor.impactMagnitude[assetId];
                const arrow = dir ? getDirectionArrow(dir) : { icon: Minus, color: "text-slate-400", label: "중립" };
                const ArrowIcon = arrow.icon;

                return (
                  <Link key={assetId} href={`/assets/${assetId}`} className="block group">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white group-hover:text-blue-300 transition-colors">
                            {asset?.name || assetId}
                          </p>
                          {asset && (
                            <p className="text-xs text-slate-500 mt-0.5">현재 {asset.currentValue.toLocaleString()}{asset.unit}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <ArrowIcon className={`w-4 h-4 ${arrow.color}`} />
                              <span className={`text-sm font-bold ${arrow.color}`}>{arrow.label}</span>
                            </div>
                            {mag && <p className="text-xs text-slate-500">영향: {mag}</p>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* 시그널 */}
          {factor.signals.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-400" />
                최근 시그널
              </h2>
              <div className="space-y-2">
                {factor.signals
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((signal) => (
                    <div key={signal.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          signal.type === "경고" ? "bg-red-400" :
                          signal.type === "긍정" ? "bg-green-400" : "bg-yellow-400"
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-white">{signal.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{signal.description}</p>
                          <p className="text-xs text-slate-500 mt-1">{signal.source} · {signal.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* 타임라인 */}
          {factor.timeline.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-cyan-400" />
                타임라인
              </h2>
              <div className="space-y-3">
                {factor.timeline
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((ev, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          ev.significance === "high" ? "bg-red-400" :
                          ev.significance === "medium" ? "bg-yellow-400" : "bg-slate-600"
                        }`} />
                        {i < factor.timeline.length - 1 && <div className="w-px flex-1 bg-slate-800" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-xs text-slate-500 mb-0.5">{ev.date}</p>
                        <p className="text-sm font-medium text-white">{ev.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{ev.description}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>

        {/* 오른쪽: 관련 전문가 */}
        <div className="space-y-6">
          {relatedExperts.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                관련 전문가
              </h2>
              <div className="space-y-2">
                {relatedExperts.map((expert) => expert && (
                  <Link key={expert.id} href={`/experts/${expert.id}`} className="block group">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-slate-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-blue-300">{expert.name}</p>
                          <p className="text-xs text-slate-500">{expert.affiliation}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-blue-400">{expert.credibilityScore}</span>
                          <ChevronRight className="w-3 h-3 text-slate-600" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 기존 이슈 연결 */}
          {factor.legacyIssueId && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-2">기존 이슈 상세 분석</p>
              <Link href={`/issues/${factor.legacyIssueId}`} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                시나리오 상세 보기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
