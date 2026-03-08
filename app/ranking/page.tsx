import Link from "next/link";
import { Award, TrendingUp, CheckCircle, AlertTriangle, Info, Star } from "lucide-react";
import { getAllExperts } from "@/data/experts";
import { SCORE_WEIGHTS, getCredibilityTier, getAccuracyGrade, hasBiasWarning } from "@/lib/credibility";
import Tag from "@/components/ui/Tag";

function getBadgeColor(rank: number) {
  if (rank === 1) return "bg-yellow-500 text-yellow-950";
  if (rank === 2) return "bg-slate-300 text-slate-900";
  if (rank === 3) return "bg-amber-700 text-amber-100";
  return "bg-slate-800 text-slate-400";
}

type ScoreKey =
  | "credibilityScore"
  | "accuracyScore"
  | "evidenceScore"
  | "domainFitScore"
  | "consistencyScore"
  | "biasScore";

const categories: {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Award;
  color: string;
  description: string;
  note: string;
  scoreKey: ScoreKey;
  weight?: number;
}[] = [
  {
    id: "accuracy",
    title: "★ 과거 적중도",
    subtitle: `최우선 가중치 ${SCORE_WEIGHTS.accuracyScore}%`,
    icon: CheckCircle,
    color: "text-yellow-400",
    description: "투자·경제 예측 활용의 핵심 — 실제 결과와 전망 부합 정도",
    note: "A+(85+) 투자 핵심참고 · A(75+) 우선참고 · B(65+) 보조참고 · C 신중히",
    scoreKey: "accuracyScore",
    weight: SCORE_WEIGHTS.accuracyScore,
  },
  {
    id: "overall",
    title: "종합 신뢰도",
    subtitle: "8축 가중합 점수",
    icon: Award,
    color: "text-blue-400",
    description: "8축 가중 평균 — 적중도(30%)+전문(20%)+근거(20%) 중심",
    note: `적중도(${SCORE_WEIGHTS.accuracyScore}%) + 전문(${SCORE_WEIGHTS.domainFitScore}%) + 근거(${SCORE_WEIGHTS.evidenceScore}%) + 일관성(${SCORE_WEIGHTS.consistencyScore}%) + 기관(${SCORE_WEIGHTS.institutionScore}%) + 최신성(${SCORE_WEIGHTS.recencyScore}%) + 편향(${SCORE_WEIGHTS.biasScore}%) + 대중(${SCORE_WEIGHTS.publicRatingScore}%)`,
    scoreKey: "credibilityScore",
  },
  {
    id: "evidence",
    title: "근거 품질",
    subtitle: `가중치 ${SCORE_WEIGHTS.evidenceScore}%`,
    icon: TrendingUp,
    color: "text-blue-400",
    description: "데이터·역사적 맥락·공식자료 인용 수준",
    note: "투자 판단 근거로 활용 시 근거 품질 높은 전문가 우선",
    scoreKey: "evidenceScore",
    weight: SCORE_WEIGHTS.evidenceScore,
  },
  {
    id: "domainFit",
    title: "전문 적합성",
    subtitle: `가중치 ${SCORE_WEIGHTS.domainFitScore}%`,
    icon: Award,
    color: "text-purple-400",
    description: "해당 이슈와 전공·경력 일치도",
    note: "유명인이라도 전문 분야 외 발언은 자동 감산 적용",
    scoreKey: "domainFitScore",
    weight: SCORE_WEIGHTS.domainFitScore,
  },
  {
    id: "bias",
    title: "편향 보정",
    subtitle: `가중치 ${SCORE_WEIGHTS.biasScore}%`,
    icon: AlertTriangle,
    color: "text-orange-400",
    description: "정치·이념 편향 없음 (높을수록 중립)",
    note: "낮은 점수 = 특정 정부·정당 성향. 투자 분석에 편향 전문가 단독 의존 위험",
    scoreKey: "biasScore",
    weight: SCORE_WEIGHTS.biasScore,
  },
];

export default function RankingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-2">
          <Award className="w-4 h-4" />
          <span>신뢰도 랭킹</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">전문가 신뢰도 평가</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          절대적 순위표가 아닌 <strong className="text-slate-200">이슈별·분야별 참고지표</strong>입니다.
          8축 가중 평가로 &ldquo;유명한가&rdquo;가 아닌 &ldquo;얼마나 정확하고 근거 있는가&rdquo;를 측정합니다.
        </p>
      </div>

      {/* 가중치 시각화 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">신뢰도 점수 가중치 구조</h2>
        </div>
        <div className="flex items-end gap-1 h-16 mb-2">
          {(Object.entries(SCORE_WEIGHTS) as [string, number][]).map(([key, weight]) => {
            const labels: Record<string, string> = {
              domainFitScore: "전문\n적합성",
              accuracyScore: "과거\n적중도",
              evidenceScore: "근거\n품질",
              institutionScore: "기관\n신뢰도",
              consistencyScore: "논리\n일관성",
              recencyScore: "최신성",
              publicRatingScore: "대중\n평가",
              biasScore: "편향\n보정",
            };
            const barColors: Record<string, string> = {
              domainFitScore: "bg-purple-500",
              accuracyScore: "bg-emerald-500",
              evidenceScore: "bg-blue-500",
              institutionScore: "bg-cyan-500",
              consistencyScore: "bg-indigo-500",
              recencyScore: "bg-slate-500",
              publicRatingScore: "bg-orange-400",
              biasScore: "bg-yellow-500",
            };
            return (
              <div key={key} className="flex-1 flex flex-col items-center gap-1">
                <span className={`text-xs font-bold ${weight >= 20 ? "text-white" : "text-slate-400"}`}>
                  {weight}%
                </span>
                <div
                  className={`w-full rounded-t ${barColors[key] || "bg-slate-600"}`}
                  style={{ height: `${weight * 2.4}px` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-1">
          {Object.keys(SCORE_WEIGHTS).map((key) => {
            const short: Record<string, string> = {
              domainFitScore: "전문",
              accuracyScore: "적중",
              evidenceScore: "근거",
              institutionScore: "기관",
              consistencyScore: "일관",
              recencyScore: "최신",
              publicRatingScore: "대중",
              biasScore: "편향",
            };
            return (
              <div key={key} className="flex-1 text-center">
                <span className="text-[10px] text-slate-500">{short[key]}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-600 mt-3">
          <span className="text-yellow-400 font-semibold">과거 적중도 30% 최우선</span> —
          투자·경제 예측 활용이 플랫폼 목적이므로 실제 맞은 전망이 가장 중요합니다.
          대중 평가(2%)는 의도적으로 최소화 — 팔로워·인지도는 예측 정확도와 무관합니다.
        </p>
      </div>

      {/* 면책 공지 */}
      <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200/80">
            이 랭킹은 <strong>절대적 평가가 아닌 이슈별 참고지표</strong>입니다.
            특정 분야의 고신뢰 전문가도 다른 분야에서는 신뢰도가 제한될 수 있습니다.
            전문가 상세 페이지에서 이슈별 조정 신뢰도를 함께 확인하세요.
          </p>
        </div>
      </div>

      {/* 카테고리별 랭킹 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {categories.map(({ id, title, subtitle, icon: Icon, color, description, note, scoreKey }) => {
          const allExperts = getAllExperts();
          const sorted = [...allExperts].sort(
            (a, b) => (b[scoreKey] as number) - (a[scoreKey] as number)
          );

          return (
            <section key={id}>
              <div className="flex items-start gap-3 mb-4">
                <Icon className={`w-5 h-5 ${color} mt-0.5`} />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{title}</h2>
                    <span className={`text-xs font-mono ${color} bg-slate-800 px-2 py-0.5 rounded`}>
                      {subtitle}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{note}</p>
                </div>
              </div>

              <div className="space-y-2">
                {sorted.map((expert, idx) => {
                  const score = expert[scoreKey] as number;
                  const tier = getCredibilityTier(score);
                  const accGrade = getAccuracyGrade(expert.accuracyScore);
                  const bias = hasBiasWarning(expert);

                  return (
                    <Link key={expert.id} href={`/experts/${expert.id}`} className="block group">
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getBadgeColor(idx + 1)}`}
                          >
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors">
                                {expert.name}
                              </p>
                              {bias && scoreKey !== "biasScore" && (
                                <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0" aria-label="편향 주의" />
                              )}
                              {/* 투자 활용 등급 (적중도 랭킹에서만 표시) */}
                              {id === "accuracy" && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  expert.accuracyScore >= 85 ? "text-emerald-400 border-emerald-700/40 bg-emerald-900/20" :
                                  expert.accuracyScore >= 75 ? "text-blue-400 border-blue-700/40 bg-blue-900/20" :
                                  "text-yellow-400 border-yellow-700/40 bg-yellow-900/20"
                                }`}>{accGrade.grade} {accGrade.invest}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 hidden sm:block">{expert.affiliation}</p>
                            <div className="flex items-center gap-1 mt-1">
                              {expert.domains.slice(0, 2).map((d) => (
                                <Tag key={d} label={d} color="blue" size="sm" />
                              ))}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className={`text-xl font-bold ${tier.color}`}>{score}</p>
                            <p className={`text-xs ${tier.color}`}>{tier.label}</p>
                          </div>
                        </div>

                        {/* 점수 바 */}
                        <div className="mt-2 ml-10 bg-slate-800 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              score >= 85 ? "bg-emerald-500" :
                              score >= 70 ? "bg-blue-500" :
                              score >= 55 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
