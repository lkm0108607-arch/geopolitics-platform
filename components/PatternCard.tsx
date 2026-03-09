import type { HistoricalPattern } from "@/types";
import { Clock, AlertTriangle } from "lucide-react";

interface PatternCardProps {
  pattern: HistoricalPattern;
}

function getSimilarityColor(sim: number) {
  if (sim >= 75) return { text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30", label: "높은 유사도" };
  if (sim >= 50) return { text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", label: "보통 유사도" };
  return { text: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/30", label: "낮은 유사도" };
}

export default function PatternCard({ pattern }: PatternCardProps) {
  const sim = getSimilarityColor(pattern.similarity);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-white text-sm leading-tight mb-1">
            {pattern.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {pattern.period}
          </div>
        </div>
        <div className={`text-right px-3 py-1.5 rounded-lg border ${sim.bg} ${sim.border}`}>
          <p className={`text-lg font-bold ${sim.text}`}>{pattern.similarity}%</p>
          <p className={`text-[10px] ${sim.text}`}>{sim.label}</p>
        </div>
      </div>

      {/* 설명 */}
      <p className="text-sm text-slate-400 mb-3">{pattern.description}</p>

      {/* 당시 결과 */}
      <div className="bg-slate-800/60 rounded-lg p-3 mb-3">
        <p className="text-xs text-slate-500 mb-1">당시 자산 움직임</p>
        <p className="text-sm text-white font-medium">{pattern.outcome}</p>
        <p className="text-xs text-slate-400 mt-1">{pattern.assetMovement}</p>
      </div>

      {/* 차이점 */}
      {pattern.keyDifferences.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-yellow-400 font-medium">현재와 다른 점</span>
          </div>
          <ul className="space-y-1">
            {pattern.keyDifferences.map((diff, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                <span className="text-slate-600 mt-0.5">-</span>
                {diff}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
