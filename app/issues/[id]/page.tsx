import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Clock, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import { getIssueById } from "@/data/issues";
import { getExpertById, getAllExperts } from "@/data/experts";
import RiskGauge from "@/components/ui/RiskGauge";
import Tag from "@/components/ui/Tag";
import ScenarioCard from "@/components/ScenarioCard";
import ExpertCard from "@/components/ExpertCard";
import { issues } from "@/data/issues";
import { calculateAlgorithmProbabilities } from "@/lib/probability";

export function generateStaticParams() {
  return issues.map((i) => ({ id: i.id }));
}

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = getIssueById(id);
  if (!issue) notFound();

  const relatedExperts = issue.relatedExpertIds
    .map(getExpertById)
    .filter(Boolean) as NonNullable<ReturnType<typeof getExpertById>>[];

  const TrendIcon =
    issue.probTrend === "상승" ? TrendingUp : issue.probTrend === "하락" ? TrendingDown : Minus;
  const trendColor =
    issue.probTrend === "상승" ? "text-red-400" : issue.probTrend === "하락" ? "text-green-400" : "text-slate-400";

  const allExperts = getAllExperts();
  const algoResults = calculateAlgorithmProbabilities(issue, allExperts);
  const topScenario = [...issue.scenarios].sort((a, b) => {
    const pa = algoResults.find((r) => r.scenarioId === a.id)?.algorithmProbability ?? a.probability;
    const pb = algoResults.find((r) => r.scenarioId === b.id)?.algorithmProbability ?? b.probability;
    return pb - pa;
  })[0];
  const topAlgo = algoResults.find((r) => r.scenarioId === topScenario?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/issues" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        이슈 목록
      </Link>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{issue.region}</span>
              <span className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                발생 확률 {issue.probTrend}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">{issue.title}</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">{issue.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {issue.tags.map((tag) => (
                <Tag key={tag} label={tag} color="slate" />
              ))}
            </div>
          </div>
          <div className="md:w-56 flex-shrink-0">
            <RiskGauge level={issue.probability} size="lg" />
            {topScenario && (
              <div className="mt-4 p-3 bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">최유력 시나리오</p>
                <p className="text-sm font-semibold text-white">{topScenario.title}</p>
                <p className="text-lg font-bold text-orange-400">
                  {topAlgo?.algorithmProbability ?? topScenario.probability}%
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {topAlgo ? "알고리즘 산출" : "편집자 추정"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Scenarios */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              시나리오 비교
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...issue.scenarios]
                .sort((a, b) => {
                  const pa = algoResults.find((r) => r.scenarioId === a.id)?.algorithmProbability ?? a.probability;
                  const pb = algoResults.find((r) => r.scenarioId === b.id)?.algorithmProbability ?? b.probability;
                  return pb - pa;
                })
                .map((scenario, idx) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    rank={idx}
                    algoResult={algoResults.find((r) => r.scenarioId === scenario.id)}
                  />
                ))}
            </div>
          </section>

          {/* Timeline */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              주요 사건 타임라인
            </h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700" />
              <div className="space-y-4 pl-10">
                {[...issue.timeline].reverse().map((event, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        event.significance === "high"
                          ? "bg-red-500"
                          : event.significance === "medium"
                          ? "bg-yellow-500"
                          : "bg-slate-500"
                      }`}
                    />
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">{event.date}</span>
                        {event.significance === "high" && (
                          <span className="text-xs text-red-400 font-medium">핵심사건</span>
                        )}
                      </div>
                      <p className="font-semibold text-white text-sm">{event.title}</p>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Signals */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              최근 판세 신호
            </h2>
            <div className="space-y-3">
              {issue.signals.map((signal) => (
                <div
                  key={signal.id}
                  className={`border rounded-xl p-4 ${
                    signal.type === "경고"
                      ? "bg-red-950/20 border-red-800/40"
                      : signal.type === "긍정"
                      ? "bg-green-950/20 border-green-800/40"
                      : "bg-yellow-950/20 border-yellow-800/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        signal.type === "경고" ? "bg-red-400" :
                        signal.type === "긍정" ? "bg-green-400" : "bg-yellow-400"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold ${
                            signal.type === "경고" ? "text-red-400" :
                            signal.type === "긍정" ? "text-green-400" : "text-yellow-400"
                          }`}
                        >
                          {signal.type}
                        </span>
                        <span className="text-xs text-slate-500">{signal.date}</span>
                      </div>
                      <p className="font-semibold text-white text-sm">{signal.title}</p>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{signal.description}</p>
                      <p className="text-slate-500 text-xs mt-1">출처: {signal.source}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Expert views */}
          <section>
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              관련 전문가 견해
            </h2>
            <div className="space-y-3">
              {relatedExperts.map((expert) => (
                <ExpertCard key={expert.id} expert={expert} compact />
              ))}
            </div>
          </section>

          {/* Forecast summary */}
          {issue.forecasts.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-white mb-3">전문가 전망 요약</h2>
              <div className="space-y-3">
                {issue.forecasts.map((fc) => {
                  const expert = getExpertById(fc.expertId);
                  return (
                    <div key={fc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">{expert?.name}</span>
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                          {fc.scenario}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 leading-relaxed">{fc.rationale}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>추정 확률: <span className="text-orange-400 font-bold">{fc.probability}%</span></span>
                        <span>{fc.timeframe}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-800">
                        <p className="text-xs text-red-400">반대 논거: {fc.counterRationale}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
