import { Expert } from "@/types";
import {
  getScoreBreakdown,
  calculateCredibility,
  getCredibilityTier,
  getAccuracyGrade,
  hasBiasWarning,
  SCORE_WEIGHTS,
} from "@/lib/credibility";
import { AlertTriangle, Info, TrendingUp, Star } from "lucide-react";

interface CredibilityBreakdownProps {
  expert: Expert;
  showWeights?: boolean;
}

function getBarColor(score: number, isPrimary: boolean): string {
  if (isPrimary && score >= 85) return "bg-emerald-500";
  if (isPrimary && score >= 70) return "bg-blue-500";
  if (isPrimary) return "bg-yellow-500";
  if (score >= 85) return "bg-emerald-600/70";
  if (score >= 70) return "bg-blue-600/70";
  return "bg-slate-500";
}

function getScoreTextColor(score: number, isPrimary: boolean): string {
  if (!isPrimary) return "text-slate-400";
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-blue-400";
  if (score >= 55) return "text-yellow-400";
  return "text-red-400";
}

export default function CredibilityBreakdown({ expert, showWeights = true }: CredibilityBreakdownProps) {
  const breakdown = getScoreBreakdown(expert);
  const computed = calculateCredibility(expert);
  const tier = getCredibilityTier(computed);
  const accuracyGrade = getAccuracyGrade(expert.accuracyScore);
  const biasWarning = hasBiasWarning(expert);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      {/* Header: 종합 점수 + 투자 활용 등급 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-white">신뢰도 점수 분석</h3>
          <p className="text-xs text-slate-500 mt-0.5">8축 가중 평가 · 과거 적중도 최우선(30%)</p>
        </div>
        <div className="flex gap-3">
          {/* 종합 신뢰도 */}
          <div className={`text-center px-4 py-2 rounded-xl border ${tier.bg} ${tier.border}`}>
            <p className={`text-3xl font-bold ${tier.color}`}>{computed}</p>
            <p className={`text-xs font-semibold ${tier.color}`}>{tier.label}</p>
            <p className="text-xs text-slate-600">종합</p>
          </div>
          {/* 투자 활용 등급 */}
          <div className="text-center px-4 py-2 rounded-xl border border-slate-700 bg-slate-800">
            <p className={`text-3xl font-bold ${accuracyGrade.color}`}>{accuracyGrade.grade}</p>
            <p className={`text-xs font-semibold ${accuracyGrade.color}`}>{accuracyGrade.invest}</p>
            <p className="text-xs text-slate-600">투자 활용</p>
          </div>
        </div>
      </div>

      {/* 편향 경고 */}
      {biasWarning && (
        <div className="bg-orange-950/30 border border-orange-700/40 rounded-lg p-3 mb-5 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-200">
            <span className="font-semibold">편향 주의:</span> 특정 정치·이념 성향이 분석에 영향을 줄 수 있습니다.
            투자 판단에 활용 시 반드시 다른 전문가 견해와 교차 검증하세요.
          </p>
        </div>
      )}

      {/* 8축 바 차트 — 가중치 내림차순(적중도 최상단) */}
      <div className="space-y-5">
        {breakdown.map((item, idx) => (
          <div key={item.key}>
            {/* 첫 번째(적중도) 구분선 */}
            {idx === 1 && (
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 border-t border-dashed border-slate-700" />
                <span className="text-xs text-slate-600">보조 지표</span>
                <div className="flex-1 border-t border-dashed border-slate-700" />
              </div>
            )}

            <div className={`${item.isPrimary ? "" : "opacity-80"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {/* 최상위 축 강조 */}
                  {item.key === "accuracyScore" && (
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  )}
                  <span className={`text-sm font-medium ${item.isPrimary ? "text-white" : "text-slate-400"}`}>
                    {item.label}
                  </span>
                  {showWeights && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                      item.isPrimary
                        ? "bg-blue-900/50 text-blue-300 border border-blue-700/40"
                        : "bg-slate-800 text-slate-600"
                    }`}>
                      ×{item.weight}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {showWeights && (
                    <span className="text-xs text-slate-600 font-mono">
                      기여 {item.weighted}점
                    </span>
                  )}
                  <span className={`text-sm font-bold w-8 text-right ${getScoreTextColor(item.score, item.isPrimary)}`}>
                    {item.score}
                  </span>
                </div>
              </div>

              <div className="bg-slate-800 rounded-full overflow-hidden" style={{ height: item.isPrimary ? "10px" : "6px" }}>
                <div
                  className={`rounded-full transition-all ${getBarColor(item.score, item.isPrimary)}`}
                  style={{ width: `${item.score}%`, height: "100%" }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 가중치 구조 설명 */}
      {showWeights && (
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center gap-1.5 mb-3">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-slate-300">가중치 설계 원칙</span>
          </div>

          {/* 시각적 막대 비교 */}
          <div className="flex items-end gap-1 h-10 mb-2">
            {(Object.entries(SCORE_WEIGHTS) as [string, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([key, weight]) => {
                const isAccuracy = key === "accuracyScore";
                return (
                  <div key={key} className="flex-1 flex flex-col items-center">
                    <span className={`text-[10px] font-bold ${isAccuracy ? "text-yellow-400" : "text-slate-600"}`}>
                      {weight}
                    </span>
                    <div
                      className={`w-full rounded-t ${isAccuracy ? "bg-yellow-500" : "bg-slate-600"}`}
                      style={{ height: `${weight * 1.2}px` }}
                    />
                  </div>
                );
              })}
          </div>
          <div className="flex gap-1 mb-3">
            {(Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[])
              .sort((a, b) => SCORE_WEIGHTS[b] - SCORE_WEIGHTS[a])
              .map((key) => (
                <div key={key} className="flex-1 text-center">
                  <span className={`text-[9px] ${key === "accuracyScore" ? "text-yellow-400 font-bold" : "text-slate-600"}`}>
                    {key === "accuracyScore" ? "적중★" :
                     key === "domainFitScore" ? "전문" :
                     key === "evidenceScore" ? "근거" :
                     key === "consistencyScore" ? "일관" :
                     key === "institutionScore" ? "기관" :
                     key === "recencyScore" ? "최신" :
                     key === "biasScore" ? "편향" : "대중"}
                  </span>
                </div>
              ))}
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
            <div className="flex items-start gap-1.5">
              <TrendingUp className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p>
                <span className="text-yellow-400 font-semibold">과거 적중도 30% 최우선</span> —
                투자·경제 흐름 예측에서 과거 예측이 실제로 맞았는가가 가장 중요한 신뢰 기준
              </p>
            </div>
            <p className="pl-4.5">
              전문 적합성·근거 품질 각 20% — 해당 분야 전문가의 데이터 기반 분석만 참고
            </p>
            <p className="pl-4.5 text-slate-700">
              대중 평가 2% 최소화 — 팔로워·인지도는 예측 정확도와 무관
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
