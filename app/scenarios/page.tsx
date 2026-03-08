import Link from "next/link";
import { BarChart3, ExternalLink, Cpu, Info } from "lucide-react";
import { issues } from "@/data/issues";
import { getAllExperts } from "@/data/experts";
import ScenarioCard from "@/components/ScenarioCard";
import { calculateAlgorithmProbabilities } from "@/lib/probability";

export default function ScenariosPage() {
  const allExperts = getAllExperts();

  // 이슈별 알고리즘 확률 사전 계산
  const algoByIssue = new Map(
    issues.map((issue) => [
      issue.id,
      calculateAlgorithmProbabilities(issue, allExperts),
    ])
  );

  // 알고리즘 확률 기준 top 5 시나리오
  const allAlgoScenarios = issues.flatMap((issue) => {
    const algoResults = algoByIssue.get(issue.id) || [];
    return issue.scenarios.map((s) => ({
      ...s,
      issueTitle: issue.title,
      issueId: issue.id,
      algoResult: algoResults.find((r) => r.scenarioId === s.id),
    }));
  });

  const topScenarios = [...allAlgoScenarios]
    .sort((a, b) => {
      const pa = a.algoResult?.algorithmProbability ?? a.probability;
      const pb = b.algoResult?.algorithmProbability ?? b.probability;
      return pb - pa;
    })
    .slice(0, 5);

  const byIssue = issues
    .filter((i) => i.scenarios.length > 0)
    .sort((a, b) => b.probability - a.probability);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-purple-400 text-sm font-medium mb-2">
          <BarChart3 className="w-4 h-4" />
          <span>시나리오 보드</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">전망 시나리오 비교</h1>
        <p className="text-slate-400 text-sm">
          &ldquo;누가 더 맞냐&rdquo;가 아니라, &ldquo;어떤 조건에서 어떤 시나리오가 강해지는가&rdquo;를 비교합니다.
        </p>
      </div>

      {/* 알고리즘 설명 패널 */}
      <div className="bg-slate-900 border border-purple-700/30 rounded-2xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <Cpu className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              확률 산출 알고리즘
              <span className="text-xs text-purple-400 bg-purple-900/30 border border-purple-700/40 px-2 py-0.5 rounded-full">
                신규
              </span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              각 시나리오의 확률은 <strong className="text-slate-200">전문가 신뢰도(60%) × 과거 적중도(40%)</strong>로
              가중 평균 산출됩니다. 신뢰도 높은 전문가의 예측일수록 확률에 더 큰 영향을 미치며,
              이슈별 전문 분야 적합성도 반영됩니다.
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                데이터 충분 = 전문가 2명 이상
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                데이터 보통 = 전문가 1명
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                데이터 부족 = 편집자 추정값
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top probability scenarios */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          현재 가장 유력한 시나리오 Top 5
          <span className="text-xs text-slate-500 font-normal">(알고리즘 기준)</span>
        </h2>
        <div className="space-y-3">
          {topScenarios.map((scenario, idx) => {
            const prob = scenario.algoResult?.algorithmProbability ?? scenario.probability;
            return (
              <Link key={scenario.id} href={`/issues/${scenario.issueId}`} className="block group">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-700 w-8 flex-shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 mb-0.5">{scenario.issueTitle}</p>
                      <p className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {scenario.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{scenario.description}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-2xl font-bold ${
                        prob >= 50 ? "text-red-400" :
                        prob >= 30 ? "text-orange-400" :
                        "text-yellow-400"
                      }`}>{prob}%</p>
                      <p className="text-xs text-slate-500">
                        {scenario.algoResult ? "알고리즘" : "편집자"}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* By issue */}
      {byIssue.map((issue) => {
        const algoResults = algoByIssue.get(issue.id) || [];
        const sortedScenarios = [...issue.scenarios].sort((a, b) => {
          const pa = algoResults.find((r) => r.scenarioId === a.id)?.algorithmProbability ?? a.probability;
          const pb = algoResults.find((r) => r.scenarioId === b.id)?.algorithmProbability ?? b.probability;
          return pb - pa;
        });

        return (
          <section key={issue.id} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{issue.title}</h2>
              <Link
                href={`/issues/${issue.id}`}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                이슈 상세 <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* 확률 분포 바 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400">시나리오별 확률 분포</p>
                <div className="flex items-center gap-1 text-xs text-purple-400">
                  <Info className="w-3 h-3" />
                  <span>알고리즘 산출</span>
                </div>
              </div>
              <div className="space-y-2">
                {sortedScenarios.map((s) => {
                  const algoResult = algoResults.find((r) => r.scenarioId === s.id);
                  const prob = algoResult?.algorithmProbability ?? s.probability;
                  const editorProb = s.probability;
                  const hasDiff = algoResult && Math.abs(algoResult.algorithmProbability - editorProb) >= 3;

                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-32 truncate flex-shrink-0">{s.title}</span>
                      <div className="flex-1 bg-slate-800 rounded-full h-2 relative">
                        {/* 편집자 확률 (반투명 배경) */}
                        {hasDiff && (
                          <div
                            className="absolute h-2 rounded-full bg-slate-600 opacity-40"
                            style={{ width: `${editorProb}%` }}
                          />
                        )}
                        {/* 알고리즘 확률 */}
                        <div
                          className={`h-2 rounded-full ${
                            prob >= 50 ? "bg-red-500" :
                            prob >= 30 ? "bg-orange-500" :
                            prob >= 15 ? "bg-yellow-500" : "bg-slate-500"
                          }`}
                          style={{ width: `${prob}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`text-xs font-bold w-10 text-right ${
                          prob >= 50 ? "text-red-400" :
                          prob >= 30 ? "text-orange-400" :
                          "text-yellow-400"
                        }`}>{prob}%</span>
                        {hasDiff && (
                          <span className={`text-xs w-12 text-right ${
                            (algoResult?.algorithmProbability ?? prob) > editorProb
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}>
                            {(algoResult?.algorithmProbability ?? prob) > editorProb ? "+" : ""}
                            {(algoResult?.algorithmProbability ?? prob) - editorProb}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedScenarios.map((scenario, idx) => {
                const algoResult = algoResults.find((r) => r.scenarioId === scenario.id);
                return (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    rank={idx}
                    algoResult={algoResult}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
