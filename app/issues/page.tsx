import { Map, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { issues } from "@/data/issues";
import IssueCard from "@/components/IssueCard";

// 12시간마다 자동 업데이트
export const revalidate = 43200;

const regions = ["전체", ...Array.from(new Set(issues.map((i) => i.region)))];

export default function IssuesPage() {
  const sorted = [...issues].sort((a, b) => b.probability - a.probability);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
          <Map className="w-4 h-4" />
          <span>이슈 허브</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">국제정세 이슈</h1>
        <p className="text-slate-400 text-sm">
          지역별·분야별 핵심 국제이슈를 발생 확률 순으로 확인하세요.
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-400">
            {issues.filter((i) => i.probTrend === "상승").length}
          </p>
          <p className="text-xs text-slate-400">확률 상승</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <Minus className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-slate-300">
            {issues.filter((i) => i.probTrend === "유지").length}
          </p>
          <p className="text-xs text-slate-400">확률 유지</p>
        </div>
        <div className="bg-green-950/30 border border-green-800/40 rounded-xl p-4 text-center">
          <TrendingDown className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-green-400">
            {issues.filter((i) => i.probTrend === "하락").length}
          </p>
          <p className="text-xs text-slate-400">확률 하락</p>
        </div>
      </div>

      {/* Region filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {regions.map((region) => (
          <span
            key={region}
            className={`px-3 py-1.5 text-sm rounded-full border cursor-pointer transition-colors ${
              region === "전체"
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
            }`}
          >
            {region}
          </span>
        ))}
      </div>

      {/* Issue grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}
