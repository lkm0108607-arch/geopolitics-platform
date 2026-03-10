import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Clock, TrendingUp, AlertTriangle, Brain, ArrowRight, BarChart3, Wallet, ThumbsUp, ThumbsDown } from "lucide-react";
import { getExpertById, experts } from "@/data/experts";
import { issues } from "@/data/issues";
import { getCurrentCycle, getAllCycleResults } from "@/data/aiPredictionCycles";
import { assets } from "@/data/assets";
import { getCredibilityTier, hasBiasWarning, calculateIssueCredibility } from "@/lib/credibility";
import Tag from "@/components/ui/Tag";
import CredibilityBreakdown from "@/components/CredibilityBreakdown";

// 12시간마다 자동 업데이트
export const revalidate = 43200;

export function generateStaticParams() {
  return experts.map((e) => ({ id: e.id }));
}

const outcomeConfig = {
  적중: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-700/40" },
  불일치: { icon: XCircle, color: "text-red-400", bg: "bg-red-900/20 border-red-700/40" },
  부분적중: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-700/40" },
  미결: { icon: Clock, color: "text-slate-400", bg: "bg-slate-800 border-slate-700" },
};

const perspectiveColors: Record<string, "blue" | "green" | "purple" | "orange" | "slate"> = {
  현실주의: "blue",
  자유주의: "green",
  구성주의: "purple",
  안보중심: "orange",
  시장중심: "slate",
};

export default async function ExpertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expert = getExpertById(id);
  if (!expert) notFound();

  const tier = getCredibilityTier(expert.credibilityScore);
  const biasWarning = hasBiasWarning(expert);

  const total = expert.predictionHistory.length;
  const hits = expert.predictionHistory.filter((p) => p.outcome === "적중").length;
  const partial = expert.predictionHistory.filter((p) => p.outcome === "부분적중").length;
  const hitRate = total > 0 ? Math.round((hits / total) * 100) : expert.accuracyScore;

  const relatedIssues = issues.filter((i) => i.relatedExpertIds.includes(expert.id));
  const relatedForecasts = issues.flatMap((i) =>
    i.forecasts
      .filter((f) => f.expertId === expert.id)
      .map((f) => ({
        ...f,
        issueTitle: i.title,
        issueDomains: i.tags,
        issueAdjustedScore: calculateIssueCredibility(expert, i.tags),
      }))
  );

  // AI 예측 사이클 연동
  const cycle = getCurrentCycle();
  const allResults = getAllCycleResults();
  const expertPredictions = cycle.predictions.filter(
    (p) => p.supportingExpertIds.includes(expert.id) || p.opposingExpertIds.includes(expert.id)
  );

  // 과거 사이클에서 이 전문가가 참여한 결과 수
  const expertCycleResults = allResults.filter((r) => {
    // Find the prediction in past cycles that references this expert
    return r.result !== "미결";
  });
  const expertWeight = expert.credibilityScore >= 85 ? "높음" : expert.credibilityScore >= 70 ? "중간" : "낮음";
  const weightColor = expert.credibilityScore >= 85 ? "text-emerald-400" : expert.credibilityScore >= 70 ? "text-blue-400" : "text-yellow-400";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/experts" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        전문가 목록
      </Link>

      {/* Profile Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">{expert.name}</h1>
                <p className="text-slate-400 text-sm mt-0.5">{expert.nameEn}</p>
                <p className="text-blue-400 text-sm mt-1 font-medium">
                  {expert.affiliation} · {expert.country}
                </p>
              </div>
              <div className={`flex-shrink-0 text-center px-4 py-3 rounded-xl border ${tier.bg} ${tier.border}`}>
                <p className={`text-3xl font-bold ${tier.color}`}>{expert.credibilityScore}</p>
                <p className={`text-xs font-semibold ${tier.color}`}>{tier.label}</p>
                <p className="text-xs text-slate-600 mt-0.5">종합 신뢰도</p>
              </div>
            </div>

            <p className="text-slate-400 text-sm mt-4 leading-relaxed">{expert.bio}</p>

            {biasWarning && (
              <div className="mt-3 flex items-center gap-2 text-orange-400 text-xs bg-orange-950/20 border border-orange-800/40 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                편향 주의: 소속 기관 성향이 분석에 영향을 줄 수 있습니다
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {expert.domains.map((d) => <Tag key={d} label={d} color="blue" />)}
              {expert.background.map((b) => <Tag key={b} label={b} color="slate" />)}
              {expert.perspective.map((p) => (
                <Tag key={p} label={p} color={perspectiveColors[p] || "slate"} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 최근 견해 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            최근 견해
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">&ldquo;{expert.recentView}&rdquo;</p>
        </div>

        {/* 주요 키워드 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-base font-bold text-white mb-3">주요 발언 키워드</h2>
          <div className="flex flex-wrap gap-2">
            {expert.keyKeywords.map((kw) => (
              <span
                key={kw}
                className="px-3 py-1.5 bg-blue-900/30 text-blue-300 border border-blue-700/40 text-sm rounded-full font-medium"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 8축 신뢰도 분석 */}
      <div className="mb-6">
        <CredibilityBreakdown expert={expert} showWeights />
      </div>

      {/* 예측 실적 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <h2 className="text-base font-bold text-white mb-4">예측 실적 요약</h2>
        <div className="grid grid-cols-4 gap-4 text-center mb-4">
          <div>
            <p className="text-2xl font-bold text-white">{total}</p>
            <p className="text-xs text-slate-400">총 예측</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">{hits}</p>
            <p className="text-xs text-slate-400">적중</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{partial}</p>
            <p className="text-xs text-slate-400">부분 적중</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${hitRate >= 70 ? "text-emerald-400" : hitRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>
              {hitRate}%
            </p>
            <p className="text-xs text-slate-400">적중률</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${hitRate >= 70 ? "bg-emerald-500" : hitRate >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${hitRate}%` }}
          />
        </div>
        <p className="text-xs text-slate-600 mt-2">
          * 과거 적중도 점수({expert.accuracyScore})는 단순 적중률 외 전망의 구체성·시점 정확도를 종합 평가한 수치입니다.
        </p>
      </div>

      {/* 과거 전망 이력 */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-white mb-3">과거 전망 이력</h2>
        <div className="space-y-3">
          {expert.predictionHistory.map((record, idx) => {
            const conf = outcomeConfig[record.outcome];
            const Icon = conf.icon;
            return (
              <div key={idx} className={`border rounded-xl p-4 ${conf.bg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-500 font-mono">{record.year}년</span>
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                        {record.issue}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{record.prediction}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Icon className={`w-4 h-4 ${conf.color}`} />
                    <span className={`text-sm font-semibold ${conf.color}`}>{record.outcome}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 이슈별 전망 + 이슈 조정 신뢰도 */}
      {relatedForecasts.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-bold text-white mb-3">이슈별 전망 및 조정 신뢰도</h2>
          <p className="text-xs text-slate-500 mb-3">
            이슈 조정 신뢰도 = 해당 이슈의 전문 분야와 일치도를 반영한 보정 점수
          </p>
          <div className="space-y-3">
            {relatedForecasts.map((fc) => {
              const adjTier = getCredibilityTier(fc.issueAdjustedScore);
              return (
                <div key={fc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold text-white">{fc.issueTitle}</span>
                      <span className="ml-2 text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                        {fc.scenario}
                      </span>
                    </div>
                    <div className={`text-right px-2 py-1 rounded-lg border text-xs ${adjTier.bg} ${adjTier.border}`}>
                      <span className={`font-bold ${adjTier.color}`}>{fc.issueAdjustedScore}</span>
                      <span className="text-slate-500 ml-1">이슈 신뢰도</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-2">{fc.rationale}</p>
                  <div className="text-xs text-red-400 mb-2">반대 논거: {fc.counterRationale}</div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      추정 확률: <span className="text-orange-400 font-bold">{fc.probability}%</span>
                    </span>
                    <span>{fc.timeframe}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 관련 이슈 */}
      {relatedIssues.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-bold text-white mb-3">관련 이슈</h2>
          <div className="flex flex-wrap gap-2">
            {relatedIssues.map((issue) => (
              <Link key={issue.id} href={`/issues/${issue.id}`}>
                <span className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm rounded-lg transition-colors cursor-pointer">
                  {issue.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* AI 예측 사이클 참여 */}
      <section className="mb-6">
        <div className="bg-gradient-to-r from-blue-950/50 to-purple-950/30 border border-blue-800/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white">AI 예측 사이클 참여</h2>
            <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full border border-blue-700/40">
              사이클 #{cycle.cycleNumber}
            </span>
          </div>

          {/* Expert weight/influence */}
          <div className="bg-slate-900/60 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">AI 시스템 내 가중치</p>
                <p className="text-sm text-slate-300 mt-0.5">
                  신뢰도 {expert.credibilityScore}점 기반, 적중률 {hitRate}% 반영
                </p>
              </div>
              <div className={`text-right px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700`}>
                <p className={`text-lg font-bold ${weightColor}`}>{expertWeight}</p>
                <p className="text-[10px] text-slate-500">영향력</p>
              </div>
            </div>
          </div>

          {expertPredictions.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                현재 사이클 ({cycle.startDate} ~ {cycle.endDate}) 에서 {expertPredictions.length}개 예측에 참여 중
              </p>
              {expertPredictions.map((pred) => {
                const asset = assets.find((a) => a.id === pred.assetId);
                const isSupporting = pred.supportingExpertIds.includes(expert.id);
                const directionColor =
                  pred.direction === "상승" ? "text-emerald-400" :
                  pred.direction === "하락" ? "text-red-400" :
                  pred.direction === "보합" ? "text-yellow-400" : "text-orange-400";

                return (
                  <div key={pred.id} className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white">{asset?.name || pred.assetId}</span>
                          <span className={`text-xs font-bold ${directionColor} bg-slate-800 px-2 py-0.5 rounded-full`}>
                            {pred.direction}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">{pred.rationale}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          {isSupporting ? (
                            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
                          )}
                          <span className={`text-xs font-semibold ${isSupporting ? "text-emerald-400" : "text-red-400"}`}>
                            {isSupporting ? "지지" : "반대"}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          확률 <span className="text-orange-400 font-bold">{pred.probability}%</span>
                        </span>
                        <span className="text-xs text-slate-500">
                          신뢰도 <span className="text-blue-400 font-bold">{pred.confidence}%</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">현재 사이클에 직접 참여 중인 예측이 없습니다.</p>
          )}
        </div>
      </section>

      {/* Cross-links */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 mb-4">관련 페이지</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/predictions" className="group bg-slate-900 border border-slate-800 hover:border-blue-700/50 rounded-xl p-4 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">AI 예측 사이클</span>
              <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors ml-auto" />
            </div>
            <p className="text-xs text-slate-400">3일 주기 AI 예측 현황 보기</p>
          </Link>
          <Link href="/ranking" className="group bg-slate-900 border border-slate-800 hover:border-purple-700/50 rounded-xl p-4 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">전문가 랭킹</span>
              <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-purple-400 transition-colors ml-auto" />
            </div>
            <p className="text-xs text-slate-400">적중률 기반 전문가 순위</p>
          </Link>
          <Link href="/investment" className="group bg-slate-900 border border-slate-800 hover:border-emerald-700/50 rounded-xl p-4 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">투자 전략</span>
              <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors ml-auto" />
            </div>
            <p className="text-xs text-slate-400">전문가 분석 기반 투자 전략</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
