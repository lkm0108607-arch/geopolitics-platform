import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { Issue } from "@/types";
import RiskGauge, { getRiskColor, getRiskLabel } from "./ui/RiskGauge";
import Tag from "./ui/Tag";

interface IssueCardProps {
  issue: Issue;
  compact?: boolean;
}

export default function IssueCard({ issue, compact = false }: IssueCardProps) {
  const TrendIcon =
    issue.probTrend === "상승" ? TrendingUp : issue.probTrend === "하락" ? TrendingDown : Minus;
  const trendColor =
    issue.probTrend === "상승" ? "text-red-400" : issue.probTrend === "하락" ? "text-green-400" : "text-slate-400";

  return (
    <Link href={`/issues/${issue.id}`} className="block group">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 hover:bg-slate-800/50 transition-all">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                {issue.region}
              </span>
              <span className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                {issue.probTrend}
              </span>
            </div>
            <h3 className="font-semibold text-white text-base group-hover:text-blue-300 transition-colors leading-tight">
              {issue.title}
            </h3>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-2xl font-bold ${getRiskColor(issue.probability)}`}>{issue.probability}%</p>
            <p className="text-xs text-slate-500">발생 확률</p>
          </div>
        </div>

        {!compact && (
          <p className="text-sm text-slate-400 mb-3 line-clamp-2">{issue.summary}</p>
        )}

        <RiskGauge level={issue.probability} size="sm" showLabel={false} />

        {!compact && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {issue.tags.slice(0, 3).map((tag) => (
              <Tag key={tag} label={tag} color="slate" />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-500">
            {issue.scenarios.length}개 시나리오 · 전문가 {issue.relatedExpertIds.length}명
          </span>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
}
