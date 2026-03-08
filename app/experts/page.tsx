import { Users, Filter } from "lucide-react";
import { getAllExperts } from "@/data/experts";
import ExpertCard from "@/components/ExpertCard";

const allExperts = getAllExperts();
const domains = ["전체", ...Array.from(new Set(allExperts.flatMap((e) => e.domains)))];

export default function ExpertsPage() {
  const sorted = [...allExperts].sort((a, b) => b.credibilityScore - a.credibilityScore);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
          <Users className="w-4 h-4" />
          <span>전문가 허브</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">국제정세 전문가</h1>
        <p className="text-slate-400 text-sm">
          &ldquo;이 사람이 유명한가?&rdquo;가 아닌, &ldquo;이 주제에서 얼마나 신뢰할 수 있는가?&rdquo;를 중심으로 평가합니다.
        </p>
      </div>

      {/* Score legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "신뢰도", desc: "전반적 분석 신뢰도", color: "text-emerald-400" },
          { label: "근거수준", desc: "데이터·자료 인용 충실도", color: "text-blue-400" },
          { label: "독립성", desc: "정부·이념 편향 없음", color: "text-purple-400" },
          { label: "적중률", desc: "과거 전망 정확도", color: "text-yellow-400" },
        ].map(({ label, desc, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <p className={`text-sm font-bold ${color}`}>{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Domain filter */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-slate-500" />
        <div className="flex gap-2 flex-wrap">
          {domains.map((d) => (
            <span
              key={d}
              className={`px-3 py-1 text-xs rounded-full border cursor-pointer transition-colors ${
                d === "전체"
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500"
              }`}
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Expert grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((expert, idx) => (
          <ExpertCard key={expert.id} expert={expert} rank={idx + 1} />
        ))}
      </div>
    </div>
  );
}
