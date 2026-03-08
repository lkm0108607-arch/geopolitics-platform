import Link from "next/link";
import { ChevronRight, Award, AlertTriangle, Star } from "lucide-react";
import { Expert } from "@/types";
import { getCredibilityTier, getAccuracyGrade, hasBiasWarning } from "@/lib/credibility";
import Tag from "./ui/Tag";

interface ExpertCardProps {
  expert: Expert;
  compact?: boolean;
  rank?: number;
}

const perspectiveColors: Record<string, "blue" | "green" | "purple" | "orange" | "slate"> = {
  현실주의: "blue",
  자유주의: "green",
  구성주의: "purple",
  안보중심: "orange",
  시장중심: "slate",
};

export default function ExpertCard({ expert, compact = false, rank }: ExpertCardProps) {
  const tier = getCredibilityTier(expert.credibilityScore);
  const accuracyGrade = getAccuracyGrade(expert.accuracyScore);
  const biasWarning = hasBiasWarning(expert);

  return (
    <Link href={`/experts/${expert.id}`} className="block group">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 hover:bg-slate-800/50 transition-all">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {rank && (
              <div className="flex items-center gap-1 mb-1">
                <Award className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs text-yellow-400 font-medium">#{rank}</span>
              </div>
            )}
            <h3 className="font-bold text-white text-lg leading-tight group-hover:text-blue-300 transition-colors">
              {expert.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{expert.nameEn}</p>
            <p className="text-sm text-slate-400 mt-1">{expert.affiliation}</p>
          </div>
          <div className={`text-right flex-shrink-0 px-3 py-2 rounded-xl border ${tier.bg} ${tier.border}`}>
            <p className={`text-2xl font-bold ${tier.color}`}>{expert.credibilityScore}</p>
            <p className={`text-xs font-medium ${tier.color}`}>{tier.label}</p>
          </div>
        </div>

        {biasWarning && (
          <div className="flex items-center gap-1.5 text-orange-400 text-xs bg-orange-950/20 border border-orange-800/30 rounded px-2 py-1 mb-2">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            편향 주의
          </div>
        )}

        {!compact && (
          <p className="text-sm text-slate-400 mb-3 line-clamp-2">{expert.bio}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          {expert.domains.slice(0, 2).map((d) => (
            <Tag key={d} label={d} color="blue" />
          ))}
          {expert.perspective.slice(0, 1).map((p) => (
            <Tag key={p} label={p} color={perspectiveColors[p] || "slate"} />
          ))}
        </div>

        {/* 핵심 3축 — 과거 적중도 최우선 배치 */}
        <div className="border-t border-slate-800 pt-3 mb-2">
          {/* 과거 적중도 — 1순위, 강조 표시 */}
          <div className="flex items-center justify-between mb-2 bg-slate-800/60 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs text-slate-300 font-medium">과거 적중도</span>
              <span className="text-[10px] text-slate-600 font-mono">×30%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-slate-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${expert.accuracyScore >= 85 ? "bg-emerald-500" : expert.accuracyScore >= 70 ? "bg-blue-500" : "bg-yellow-500"}`}
                  style={{ width: `${expert.accuracyScore}%` }}
                />
              </div>
              <span className={`font-bold text-sm w-6 text-right ${accuracyGrade.color}`}>
                {expert.accuracyScore}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                expert.accuracyScore >= 85 ? "text-emerald-400 border-emerald-700/40 bg-emerald-900/20" :
                expert.accuracyScore >= 75 ? "text-blue-400 border-blue-700/40 bg-blue-900/20" :
                "text-yellow-400 border-yellow-700/40 bg-yellow-900/20"
              }`}>{accuracyGrade.grade}</span>
            </div>
          </div>

          {/* 전문 적합성 + 근거 품질 */}
          <div className="grid grid-cols-2 gap-2 text-xs text-center">
            <div>
              <p className="text-slate-500 mb-0.5">전문 적합성</p>
              <p className={`font-bold text-sm ${expert.domainFitScore >= 85 ? "text-emerald-400" : expert.domainFitScore >= 70 ? "text-blue-400" : "text-yellow-400"}`}>
                {expert.domainFitScore}
              </p>
              <p className="text-slate-600 text-[10px]">×20%</p>
            </div>
            <div>
              <p className="text-slate-500 mb-0.5">근거 품질</p>
              <p className={`font-bold text-sm ${expert.evidenceScore >= 85 ? "text-emerald-400" : expert.evidenceScore >= 70 ? "text-blue-400" : "text-yellow-400"}`}>
                {expert.evidenceScore}
              </p>
              <p className="text-slate-600 text-[10px]">×20%</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
}
