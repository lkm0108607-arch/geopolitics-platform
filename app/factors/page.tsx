import { Shield, Landmark, BarChart3, Brain, Layers, Activity } from "lucide-react";
import { factors, getFactorsByCategory } from "@/data/factors";
import FactorCard from "@/components/FactorCard";
import type { FactorCategory } from "@/types";

export const revalidate = 43200;

const categoryMeta: Record<FactorCategory, { label: string; icon: typeof Shield; color: string; desc: string }> = {
  "정책": { label: "정책", icon: Landmark, color: "text-blue-400", desc: "중앙은행 금리 결정, 재정정책, 규제 변화" },
  "지정학": { label: "지정학", icon: Shield, color: "text-red-400", desc: "국제 분쟁, 무역전쟁, 외교 변화" },
  "경제지표": { label: "경제지표", icon: BarChart3, color: "text-emerald-400", desc: "CPI, GDP, 고용 등 핵심 매크로 데이터" },
  "시장심리": { label: "시장심리", icon: Brain, color: "text-yellow-400", desc: "투자자 심리, 자금 흐름, 리스크 선호도" },
  "구조적변화": { label: "구조적 변화", icon: Layers, color: "text-purple-400", desc: "AI 혁명, 에너지 전환 등 장기 메가트렌드" },
};

export default function FactorsPage() {
  const categories: FactorCategory[] = ["정책", "경제지표", "지정학", "시장심리", "구조적변화"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-orange-400 text-sm font-medium mb-3">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>자산 가격 변동 요인 분석</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          변동 요인
        </h1>
        <p className="text-slate-400 text-base max-w-2xl">
          금리, 환율, 원자재, 지수에 영향을 미치는 핵심 요인들을 추적합니다.
          각 요인이 어떤 자산에 어떤 방향으로 영향을 주는지 확인하세요.
        </p>
      </div>

      {/* 카테고리별 요인 */}
      {categories.map((cat) => {
        const meta = categoryMeta[cat];
        const Icon = meta.icon;
        const catFactors = getFactorsByCategory(cat).filter((f) => f.isActive);
        if (catFactors.length === 0) return null;

        return (
          <section key={cat} className="mb-10">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Icon className={`w-5 h-5 ${meta.color}`} />
                {meta.label}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{meta.desc}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catFactors
                .sort((a, b) => b.probability - a.probability)
                .map((factor) => (
                  <FactorCard key={factor.id} factor={factor} />
                ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
