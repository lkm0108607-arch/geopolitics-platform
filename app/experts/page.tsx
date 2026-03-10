"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Users, Filter, Search, ChevronDown, Brain, ArrowRight,
  TrendingUp, BarChart3, Wallet, Award, CheckCircle,
  AlertTriangle, Info, Star, Loader2,
} from "lucide-react";
import { getAllExperts, getExpertCount } from "@/data/experts";
import { getCurrentCycle, getAllCycleResults, allCycles, computeCyclePerformance } from "@/data/aiPredictionCycles";
import { SCORE_WEIGHTS, getCredibilityTier, getAccuracyGrade, hasBiasWarning } from "@/lib/credibility";
import ExpertCard from "@/components/ExpertCard";
import Tag from "@/components/ui/Tag";
import type { Expert } from "@/types";

const allExperts = getAllExperts();
const totalExpertCount = getExpertCount();
const domains = ["전체", ...Array.from(new Set(allExperts.flatMap((e) => e.domains)))];

const cycle = getCurrentCycle();
const performance = computeCyclePerformance();
const allResults = getAllCycleResults();

// Count experts supporting/opposing current predictions
const supportingExpertIds = new Set(cycle.predictions.flatMap((p) => p.supportingExpertIds));
const opposingExpertIds = new Set(cycle.predictions.flatMap((p) => p.opposingExpertIds));
const participatingExpertIds = new Set([...supportingExpertIds, ...opposingExpertIds]);

// Expert contributions across all cycles (for AI 기여도 tab)
const expertContributions = new Map<string, { supports: number; opposes: number; supportedCorrect: number; supportedTotal: number }>();
for (const c of allCycles) {
  for (const pred of c.predictions) {
    for (const expId of pred.supportingExpertIds) {
      const existing = expertContributions.get(expId) || { supports: 0, opposes: 0, supportedCorrect: 0, supportedTotal: 0 };
      existing.supports++;
      const result = allResults.find(r => r.predictionId === pred.id);
      if (result) {
        existing.supportedTotal++;
        if (result.result === "적중") existing.supportedCorrect++;
        else if (result.result === "부분적중") existing.supportedCorrect += 0.5;
      }
      expertContributions.set(expId, existing);
    }
    for (const expId of pred.opposingExpertIds) {
      const existing = expertContributions.get(expId) || { supports: 0, opposes: 0, supportedCorrect: 0, supportedTotal: 0 };
      existing.opposes++;
      expertContributions.set(expId, existing);
    }
  }
}
const sortedContributions = [...expertContributions.entries()]
  .sort((a, b) => (b[1].supports + b[1].opposes) - (a[1].supports + a[1].opposes));

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

const PAGE_SIZE = 60;

type TabId = "search" | "ranking" | "contribution";

const tabs: { id: TabId; label: string }[] = [
  { id: "search", label: "전문가 검색" },
  { id: "ranking", label: "신뢰도 랭킹" },
  { id: "contribution", label: "AI 기여도" },
];

export default function ExpertsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("search");
  const [selectedDomain, setSelectedDomain] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [searchResults, setSearchResults] = useState<Expert[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchExperts = useCallback(async (q: string, domain: string, page: number, append: boolean) => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (domain !== "전체") params.set("domain", domain);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/experts/search?${params.toString()}`);
      const data = await res.json();

      if (append) {
        setSearchResults((prev) => [...prev, ...data.results]);
      } else {
        setSearchResults(data.results);
      }
      setSearchTotal(data.total);
      setSearchTotalPages(data.totalPages);
    } catch (err) {
      console.error("Expert search failed:", err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search on query/domain change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchPage(1);
      fetchExperts(searchQuery, selectedDomain, 1, false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, selectedDomain, fetchExperts]);

  const loadMoreResults = () => {
    const nextPage = searchPage + 1;
    setSearchPage(nextPage);
    fetchExperts(searchQuery, selectedDomain, nextPage, true);
  };

  const hasMore = searchPage < searchTotalPages;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* AI 예측 사이클 연동 배너 */}
      <div className="bg-gradient-to-r from-blue-950/60 to-purple-950/40 border border-blue-800/40 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold mb-2">
          <Brain className="w-4 h-4" />
          AI 예측에 참여 중인 전문가 풀
        </div>
        <p className="text-slate-300 text-sm leading-relaxed mb-3">
          이 전문가들의 분석과 신뢰도 점수는 AI 3일 예측 사이클에 직접 반영됩니다.
          적중률이 높은 전문가의 의견에 더 큰 가중치를 부여합니다.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-900/60 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-white">{totalExpertCount.toLocaleString()}</p>
            <p className="text-xs text-slate-400">전체 전문가</p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-blue-400">{participatingExpertIds.size}</p>
            <p className="text-xs text-slate-400">현재 사이클 참여</p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-emerald-400">{supportingExpertIds.size}</p>
            <p className="text-xs text-slate-400">예측 지지</p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-orange-400">{opposingExpertIds.size}</p>
            <p className="text-xs text-slate-400">예측 반대</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <Link href="/predictions" className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
            <TrendingUp className="w-3 h-3" />
            AI 예측 사이클 보기 <ArrowRight className="w-3 h-3" />
          </Link>
          <Link href="/investment" className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors">
            <Wallet className="w-3 h-3" />
            투자 전략 보기 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
          <Users className="w-4 h-4" />
          <span>전문가 허브</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">전문가 &amp; 신뢰도 랭킹</h1>
        <p className="text-slate-400 text-sm">
          &ldquo;이 사람이 유명한가?&rdquo;가 아닌, &ldquo;이 주제에서 얼마나 신뢰할 수 있는가?&rdquo;를 중심으로 평가합니다.
          <span className="text-slate-500 ml-2">총 {totalExpertCount.toLocaleString()}명</span>
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== Tab 1: 전문가 검색 ===== */}
      {activeTab === "search" && (
        <>
          {/* Score legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: "신뢰도", desc: "전반적 분석 신뢰도", color: "text-emerald-400" },
              { label: "근거수준", desc: "데이터·자료 인용 충실도", color: "text-blue-400" },
              { label: "독립성", desc: "정부·이념 편향 없음", color: "text-purple-400" },
              { label: "적중률", desc: "과거 전망 정확도", color: "text-yellow-400" },
            ].map(({ label, desc, color }) => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <p className={`text-sm font-bold ${color}`}>{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              placeholder="전문가 이름, 소속, 키워드 검색... (110K+ 전체 검색)"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Domain filter */}
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-slate-500" />
            <div className="flex gap-2 flex-wrap">
              {domains.map((d) => (
                <button
                  key={d}
                  onClick={() => { setSelectedDomain(d); }}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    d === selectedDomain
                      ? "bg-blue-600 text-white border-blue-500"
                      : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            {isSearching ? "검색 중..." : `${searchTotal.toLocaleString()}명`} {selectedDomain !== "전체" ? `(${selectedDomain})` : ""} · 신뢰도순 정렬
          </p>

          {/* Expert grid */}
          {isSearching && searchResults.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              <span className="ml-2 text-sm text-slate-400">전문가 검색 중...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((expert, idx) => (
                <ExpertCard key={expert.id} expert={expert} rank={idx + 1} />
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMoreResults}
                disabled={isSearching}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                더 보기 ({(searchTotal - searchResults.length).toLocaleString()}명 남음)
              </button>
            </div>
          )}
        </>
      )}

      {/* ===== Tab 2: 신뢰도 랭킹 ===== */}
      {activeTab === "ranking" && (
        <>
          {/* 가중치 시각화 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">신뢰도 점수 가중치 구조</h2>
            </div>
            <div className="flex items-end gap-1 h-16 mb-2">
              {(Object.entries(SCORE_WEIGHTS) as [string, number][]).map(([key, weight]) => {
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

                  <p className="text-xs text-slate-600 mb-2">총 {sorted.length}명 중 상위 50명</p>
                  <div className="space-y-2">
                    {sorted.slice(0, 50).map((expert, idx) => {
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
        </>
      )}

      {/* ===== Tab 3: AI 기여도 ===== */}
      {activeTab === "contribution" && (
        <div className="bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-800/40 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">AI 예측 기여도 랭킹</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            AI 3일 예측 사이클에서 가장 많이 인용되는 전문가 — 신뢰도 기반 가중 분석에 직접 반영
          </p>

          {/* AI 적중률 요약 */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 mb-5">
            <p className="text-sm text-white font-semibold">
              AI 예측 적중률{" "}
              <span className={`text-lg ${performance.accuracyRate >= 70 ? "text-emerald-400" : performance.accuracyRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                {performance.accuracyRate}%
              </span>
              <span className="text-slate-400 font-normal"> — 전문가 신뢰도 기반 가중 분석</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              총 {performance.totalCycles}개 사이클 · {performance.totalPredictions}건 예측 · 적중 {performance.correct} · 부분적중 {performance.partial} · 불일치 {performance.incorrect} · 미결 {performance.pending}
            </p>
          </div>

          {/* 전문가 기여도 목록 */}
          <div className="space-y-2 mb-5">
            {sortedContributions.slice(0, 10).map(([expId, contrib], idx) => {
              const expert = allExperts.find(e => e.id === expId);
              if (!expert) return null;
              const total = contrib.supports + contrib.opposes;
              const accuracy = contrib.supportedTotal > 0
                ? Math.round((contrib.supportedCorrect / contrib.supportedTotal) * 100)
                : null;

              return (
                <Link key={expId} href={`/experts/${expId}`} className="block group">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 hover:border-blue-700/50 transition-all">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getBadgeColor(idx + 1)}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors">
                            {expert.name}
                          </p>
                          <span className="text-[10px] text-slate-500">{expert.affiliation}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="text-blue-400">
                            지지 <strong>{contrib.supports}</strong>건
                          </span>
                          <span className="text-orange-400">
                            반대 <strong>{contrib.opposes}</strong>건
                          </span>
                          <span className="text-slate-500">
                            총 인용 <strong>{total}</strong>건
                          </span>
                          {accuracy !== null && (
                            <span className={`font-semibold ${accuracy >= 70 ? "text-emerald-400" : accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                              지지 적중률 {accuracy}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-lg font-bold text-blue-400">{total}</p>
                        <p className="text-[10px] text-slate-500">인용</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Cross-links to related pages */}
      <div className="mt-12 border-t border-slate-800 pt-8">
        <h3 className="text-sm font-semibold text-slate-400 mb-4">관련 페이지</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/predictions" className="group bg-slate-900 border border-slate-800 hover:border-blue-700/50 rounded-xl p-4 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">AI 예측 사이클</span>
            </div>
            <p className="text-xs text-slate-400">전문가 의견이 반영된 3일 주기 AI 예측을 확인하세요.</p>
          </Link>
          <Link href="/investment" className="group bg-slate-900 border border-slate-800 hover:border-emerald-700/50 rounded-xl p-4 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">투자 전략</span>
            </div>
            <p className="text-xs text-slate-400">전문가 분석 기반 투자 전략과 자산 배분을 확인하세요.</p>
          </Link>
          <Link href="/assets" className="group bg-slate-900 border border-slate-800 hover:border-purple-700/50 rounded-xl p-4 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">자산 전망</span>
            </div>
            <p className="text-xs text-slate-400">주요 자산별 AI 전망과 전문가 분석을 확인하세요.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
