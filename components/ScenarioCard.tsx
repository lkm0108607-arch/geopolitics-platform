import { Scenario } from "@/types";
import { Shield, TrendingUp, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { AlgoProbabilityResult } from "@/lib/probability";
import { getConfidenceLabel, getProbabilityDelta } from "@/lib/probability";

interface ScenarioCardProps {
  scenario: Scenario;
  rank?: number;
  algoResult?: AlgoProbabilityResult;
}

const typeColors: Record<string, string> = {
  확전: "border-red-500/50 bg-red-950/20",
  현상유지: "border-slate-500/50 bg-slate-800/20",
  외교타결: "border-green-500/50 bg-green-950/20",
  봉합: "border-yellow-500/50 bg-yellow-950/20",
  급변: "border-purple-500/50 bg-purple-950/20",
  디커플링: "border-orange-500/50 bg-orange-950/20",
  제한적충돌: "border-orange-500/50 bg-orange-950/20",
  대리전: "border-red-500/50 bg-red-950/20",
  전면전: "border-red-700/60 bg-red-950/30",
  조기중재: "border-green-500/50 bg-green-950/20",
};

const typeIconColors: Record<string, string> = {
  확전: "text-red-400",
  현상유지: "text-slate-400",
  외교타결: "text-green-400",
  봉합: "text-yellow-400",
  급변: "text-purple-400",
  디커플링: "text-orange-400",
  제한적충돌: "text-orange-400",
  대리전: "text-red-400",
  전면전: "text-red-500",
  조기중재: "text-green-400",
};

function getProbabilityColor(prob: number) {
  if (prob >= 50) return "text-red-400";
  if (prob >= 30) return "text-orange-400";
  if (prob >= 15) return "text-yellow-400";
  return "text-slate-400";
}

export default function ScenarioCard({ scenario, rank, algoResult }: ScenarioCardProps) {
  const borderClass = typeColors[scenario.type] || "border-slate-700 bg-slate-900";
  const iconClass = typeIconColors[scenario.type] || "text-slate-400";

  const delta = algoResult ? getProbabilityDelta(algoResult) : null;
  const confidence = algoResult ? getConfidenceLabel(algoResult.confidence) : null;
  const displayProb = algoResult ? algoResult.algorithmProbability : scenario.probability;

  return (
    <div className={`border rounded-xl p-5 ${borderClass}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          {rank !== undefined && (
            <span className="text-xs text-slate-500 mb-1 block">시나리오 {rank + 1}</span>
          )}
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${iconClass}`} />
            <span className={`text-xs font-semibold ${iconClass}`}>{scenario.type}</span>
          </div>
          <h3 className="font-bold text-white mt-1">{scenario.title}</h3>
        </div>

        {/* 확률 표시 */}
        <div className="text-right flex-shrink-0">
          <p className={`text-3xl font-bold ${getProbabilityColor(displayProb)}`}>
            {displayProb}%
          </p>
          {algoResult ? (
            <div className="flex flex-col items-end gap-0.5">
              <p className="text-xs text-slate-500">알고리즘 산출</p>
              {delta !== null && Math.abs(delta) >= 3 && (
                <p className={`text-xs font-medium ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}%
                  <span className="text-slate-600 ml-1">편집 대비</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">추정 확률</p>
          )}
        </div>
      </div>

      {/* 알고리즘 신뢰도 배지 */}
      {algoResult && (
        <div className="flex items-center gap-2 mb-3">
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
            algoResult.confidence === "high"
              ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-400"
              : algoResult.confidence === "medium"
              ? "border-yellow-700/40 bg-yellow-900/20 text-yellow-400"
              : "border-slate-700/40 bg-slate-800/30 text-slate-500"
          }`}>
            <Info className="w-3 h-3" />
            <span>{confidence?.label}</span>
            {algoResult.expertCount > 0 && (
              <span className="ml-1 opacity-70">· 전문가 {algoResult.expertCount}명</span>
            )}
          </div>
          {algoResult.avgExpertCredibility > 0 && (
            <span className="text-xs text-slate-600">
              평균 신뢰도 {algoResult.avgExpertCredibility}
            </span>
          )}
        </div>
      )}

      <p className="text-sm text-slate-400 mb-4">{scenario.description}</p>

      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          지지 전문가 {scenario.supportingExperts.length}명
        </span>
        {scenario.highCredibilityCount > 0 && (
          <span className="text-blue-400 font-medium">
            고신뢰 {scenario.highCredibilityCount}명 포함
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mb-1.5">
            <CheckCircle className="w-3 h-3" /> 핵심 근거
          </p>
          <ul className="space-y-1">
            {scenario.keyEvidence.slice(0, 2).map((e, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">·</span>
                {e}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mb-1.5">
            <AlertTriangle className="w-3 h-3" /> 반대 근거
          </p>
          <ul className="space-y-1">
            {scenario.counterEvidence.slice(0, 2).map((e, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                <span className="text-red-500 mt-0.5">·</span>
                {e}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {scenario.triggers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <p className="text-xs font-semibold text-orange-400 mb-1.5">판세 전환 트리거</p>
          <div className="flex flex-wrap gap-1.5">
            {scenario.triggers.map((t, i) => (
              <span key={i} className="text-xs bg-orange-900/30 text-orange-300 border border-orange-700/40 px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
