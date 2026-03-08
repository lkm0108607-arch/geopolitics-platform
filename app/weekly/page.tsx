"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Newspaper,
  RefreshCw,
  Target,
  Clock,
  ArrowRight,
  Shield,
  CheckCircle,
  XCircle,
  MinusCircle,
  HelpCircle,
  BarChart3,
  Zap,
  ExternalLink,
  Activity,
} from "lucide-react";
import { weeklyReports, getCurrentWeekReport, getPastWeekReports } from "@/data/weeklyPredictions";
import { computeAIScore, getAccuracyGrade } from "@/data/aiScorecard";
import { formatWeekRange } from "@/data/meta";
import type { WeeklyReport, WeeklyPrediction } from "@/types";

// ─── News feed types ──────────────────────────────────────────────────────────

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  category: string;
  tags?: string[];
  relevance?: string[];
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function getResultBadge(result?: "적중" | "부분적중" | "불일치" | "미결") {
  switch (result) {
    case "적중":
      return {
        label: "적중",
        bg: "bg-emerald-500/15",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
        icon: CheckCircle,
      };
    case "부분적중":
      return {
        label: "부분적중",
        bg: "bg-yellow-500/15",
        text: "text-yellow-400",
        border: "border-yellow-500/30",
        icon: MinusCircle,
      };
    case "불일치":
      return {
        label: "불일치",
        bg: "bg-red-500/15",
        text: "text-red-400",
        border: "border-red-500/30",
        icon: XCircle,
      };
    default:
      return {
        label: "미결",
        bg: "bg-slate-500/15",
        text: "text-slate-400",
        border: "border-slate-500/30",
        icon: HelpCircle,
      };
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "bg-emerald-500";
  if (confidence >= 60) return "bg-blue-500";
  if (confidence >= 40) return "bg-yellow-500";
  return "bg-orange-500";
}

function getConfidenceTextColor(confidence: number): string {
  if (confidence >= 80) return "text-emerald-400";
  if (confidence >= 60) return "text-blue-400";
  if (confidence >= 40) return "text-yellow-400";
  return "text-orange-400";
}

function getRiskBarColor(risk: number): string {
  if (risk >= 80) return "bg-red-500";
  if (risk >= 60) return "bg-orange-500";
  if (risk >= 40) return "bg-yellow-500";
  return "bg-green-500";
}

function getRiskGaugeColor(risk: number): string {
  if (risk >= 80) return "text-red-400";
  if (risk >= 60) return "text-orange-400";
  if (risk >= 40) return "text-yellow-400";
  return "text-green-400";
}

function getRiskLabel(risk: number): string {
  if (risk >= 80) return "극심";
  if (risk >= 60) return "높음";
  if (risk >= 40) return "보통";
  return "낮음";
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const issueTitles: Record<string, string> = {
  "us-tariff-war": "트럼프 관세전쟁",
  "us-china-taiwan": "대만해협 긴장",
  "russia-ukraine": "러시아-우크라이나 전쟁",
  "israel-iran": "이스라엘-이란",
  "north-korea": "북한 핵·미사일",
  "us-china-trade": "미중 경제 디커플링",
  "global-ai-governance": "글로벌 AI 거버넌스",
  "europe-fragmentation": "유럽 NATO 균열",
};

// ─── News Feed Component ──────────────────────────────────────────────────────

function NewsFeedSection() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error("뉴스를 불러오지 못했습니다.");
      const data = await res.json();
      if (data.ok && Array.isArray(data.news)) {
        setNews(data.news);
        setLastFetched(new Date());
      } else {
        throw new Error(data.error || "뉴스 데이터 형식 오류");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => fetchNews(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  // Group news by category
  const grouped = news.reduce<Record<string, NewsItem[]>>((acc, item) => {
    const cat = item.category || "기타";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const categoryIcons: Record<string, string> = {
    "국제정치": "🌍",
    "한국경제": "🇰🇷",
    "금·은·원자재": "🥇",
    "주식·ETF": "📈",
    "외환·통화": "💱",
    "에너지": "⛽",
    "미중관계": "🇺🇸🇨🇳",
    "러우전쟁": "⚔️",
    "중동": "🏜️",
    "한반도": "🇰🇷🇰🇵",
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-blue-400" />
          실시간 뉴스 피드
        </h2>
        <div className="flex items-center gap-3">
          {lastFetched && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Activity className="w-3 h-3 text-green-400 animate-pulse" />
              {lastFetched.getHours()}:{String(lastFetched.getMinutes()).padStart(2, "0")} 갱신
            </span>
          )}
          <button
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            className="text-xs text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </div>
      </div>

      {loading && !refreshing ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
            <p className="text-sm text-slate-400">뉴스를 불러오는 중...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-red-900/30 rounded-xl p-6">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchNews()}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300"
          >
            다시 시도
          </button>
        </div>
      ) : news.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-400">현재 표시할 뉴스가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
          {Object.entries(grouped)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 6)
            .map(([category, items]) => (
              <div key={category} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">{categoryIcons[category] || "📰"}</span>
                  <h3 className="text-sm font-semibold text-white">{category}</h3>
                  <span className="text-xs text-slate-500 ml-auto">{items.length}건</span>
                </div>
                <div className="space-y-2">
                  {items.slice(0, 4).map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <div className="flex items-start gap-2 py-1.5 hover:bg-slate-800/50 rounded-lg px-2 -mx-2 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 group-hover:text-blue-300 transition-colors leading-snug line-clamp-2">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">{item.source}</span>
                            <span className="text-xs text-slate-600">·</span>
                            <span className="text-xs text-slate-500">
                              {formatTimeAgo(item.publishedAt)}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}

// ─── Prediction Card Component ────────────────────────────────────────────────

function PredictionCard({
  prediction,
  showResult = true,
}: {
  prediction: WeeklyPrediction;
  showResult?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const badge = getResultBadge(prediction.result);
  const BadgeIcon = badge.icon;
  const issueTitle = issueTitles[prediction.issueId] || prediction.issueId;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500 font-medium">{issueTitle}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              {prediction.scenario}
            </span>
          </div>
          <p className="text-sm font-semibold text-white leading-snug">
            {prediction.prediction}
          </p>
        </div>
        {showResult && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badge.bg} ${badge.text} ${badge.border} flex-shrink-0`}
          >
            <BadgeIcon className="w-3 h-3" />
            {badge.label}
          </div>
        )}
      </div>

      {/* Probability bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">확률</span>
          <span className={`text-xs font-bold ${getConfidenceTextColor(prediction.probability)}`}>
            {prediction.probability}%
          </span>
        </div>
        <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getConfidenceColor(prediction.probability)}`}
            style={{ width: `${prediction.probability}%` }}
          />
        </div>
      </div>

      {/* Expandable detail */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1 mt-1"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            접기
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            상세 분석
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <div className="text-sm text-slate-300 leading-relaxed mb-3 whitespace-pre-line">
            {prediction.rationale.split(/【(.+?)】/).map((part, idx) =>
              idx % 2 === 1 ? (
                <span key={idx} className="text-blue-400 font-semibold">【{part}】</span>
              ) : (
                <span key={idx}>{part}</span>
              )
            )}
          </div>
          {prediction.actualOutcome && (
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 font-medium mb-1">실제 결과</p>
              <p className="text-sm text-slate-300">{prediction.actualOutcome}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Past Week Accordion ──────────────────────────────────────────────────────

function PastWeekSection({ report }: { report: WeeklyReport }) {
  const [open, setOpen] = useState(false);
  const weekRange = formatWeekRange(report.weekStart, report.weekEnd);

  const resolved = report.predictions.filter(
    (p) => p.result && p.result !== "미결"
  );
  const correct = resolved.filter((p) => p.result === "적중").length;
  const partial = resolved.filter((p) => p.result === "부분적중").length;
  const incorrect = resolved.filter((p) => p.result === "불일치").length;
  const pending = report.predictions.filter(
    (p) => !p.result || p.result === "미결"
  ).length;

  const accuracy =
    resolved.length > 0
      ? Math.round(((correct + partial * 0.5) / resolved.length) * 100)
      : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-500" />
          <div className="text-left">
            <p className="text-sm font-semibold text-white">
              {report.year}년 {report.weekNumber}주차
              <span className="text-slate-500 font-normal ml-2">{weekRange}</span>
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {correct > 0 && (
                <span className="text-xs text-emerald-400">{correct} 적중</span>
              )}
              {partial > 0 && (
                <span className="text-xs text-yellow-400">{partial} 부분적중</span>
              )}
              {incorrect > 0 && (
                <span className="text-xs text-red-400">{incorrect} 불일치</span>
              )}
              {pending > 0 && (
                <span className="text-xs text-slate-500">{pending} 미결</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {resolved.length > 0 && (
            <span
              className={`text-sm font-bold ${
                accuracy >= 70
                  ? "text-emerald-400"
                  : accuracy >= 50
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {accuracy}%
            </span>
          )}
          {open ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-800 pt-3">
          {report.summary && (
            <p className="text-sm text-slate-400 mb-3">{report.summary}</p>
          )}
          {report.predictions.map((pred) => (
            <PredictionCard key={pred.id} prediction={pred} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Weekly Accuracy Mini Chart ───────────────────────────────────────────────

function AccuracyMiniChart() {
  const aiScore = computeAIScore();
  const weeks = [...aiScore.weeklyAccuracy].reverse().slice(-8);
  const grade = getAccuracyGrade(aiScore.accuracyRate);

  if (weeks.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          주간 적중률
        </h3>
        <p className="text-xs text-slate-500">아직 집계된 데이터가 없습니다.</p>
      </div>
    );
  }

  const maxRate = Math.max(...weeks.map((w) => w.accuracyRate), 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          주간 적중률 추이
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${grade.color}`}>{grade.grade}</span>
          <div className="text-right">
            <p className={`text-xs font-medium ${grade.color}`}>{grade.label}</p>
            <p className="text-xs text-slate-500">누적 {aiScore.accuracyRate}%</p>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-24">
        {weeks.map((week) => {
          const height = maxRate > 0 ? (week.accuracyRate / maxRate) * 100 : 0;
          const barColor =
            week.accuracyRate >= 70
              ? "bg-emerald-500"
              : week.accuracyRate >= 50
                ? "bg-yellow-500"
                : week.accuracyRate >= 30
                  ? "bg-orange-500"
                  : "bg-red-500";

          return (
            <div
              key={`${week.year}-${week.weekNumber}`}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-[10px] text-slate-500 font-medium">
                {week.accuracyRate}%
              </span>
              <div className="w-full bg-slate-800 rounded-t-sm relative" style={{ height: "100%" }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-700 ${barColor}`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-600">{week.weekNumber}주</span>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800">
        <div className="text-center">
          <p className="text-lg font-bold text-white">{aiScore.totalPredictions}</p>
          <p className="text-[10px] text-slate-500">총 예측</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-400">{aiScore.correct}</p>
          <p className="text-[10px] text-slate-500">적중</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-yellow-400">{aiScore.partiallyCorrect}</p>
          <p className="text-[10px] text-slate-500">부분적중</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-400">{aiScore.incorrect}</p>
          <p className="text-[10px] text-slate-500">불일치</p>
        </div>
      </div>

      {aiScore.streak > 0 && (
        <div className="mt-3 flex items-center gap-2 bg-emerald-500/10 rounded-lg px-3 py-2 border border-emerald-500/20">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">
            현재 {aiScore.streak}연속 적중 중 (최고 {aiScore.bestStreak}연속)
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Overall Risk Gauge ───────────────────────────────────────────────────────

function OverallRiskGauge({ probability }: { probability: number }) {
  const rotation = (probability / 100) * 180 - 90; // -90 to 90 degrees
  const color = getRiskGaugeColor(probability);
  const label = getRiskLabel(probability);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-orange-400" />
        주간 종합 적중률
      </h3>

      <div className="flex flex-col items-center">
        {/* Semicircle gauge */}
        <div className="relative w-40 h-20 mb-2">
          {/* Background arc */}
          <svg viewBox="0 0 120 60" className="w-full h-full">
            {/* Background track */}
            <path
              d="M 10 55 A 50 50 0 0 1 110 55"
              fill="none"
              stroke="rgb(30 41 59)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Colored segments */}
            <path
              d="M 10 55 A 50 50 0 0 1 35 15"
              fill="none"
              stroke="rgb(34 197 94)"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M 35 15 A 50 50 0 0 1 60 5"
              fill="none"
              stroke="rgb(234 179 8)"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M 60 5 A 50 50 0 0 1 85 15"
              fill="none"
              stroke="rgb(249 115 22)"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M 85 15 A 50 50 0 0 1 110 55"
              fill="none"
              stroke="rgb(239 68 68)"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.3"
            />
            {/* Needle */}
            <line
              x1="60"
              y1="55"
              x2="60"
              y2="15"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${rotation}, 60, 55)`}
              className="transition-transform duration-700"
            />
            <circle cx="60" cy="55" r="4" fill="white" />
          </svg>
        </div>

        <div className="text-center">
          <p className={`text-3xl font-bold ${color}`}>{probability}%</p>
          <p className={`text-sm font-medium ${color}`}>{label}</p>
        </div>

        <div className="flex items-center justify-between w-full mt-3 px-2">
          <span className="text-[10px] text-green-400">안전</span>
          <span className="text-[10px] text-red-400">위험</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function WeeklyPage() {
  const currentWeek = getCurrentWeekReport() ?? weeklyReports[weeklyReports.length - 1];
  const pastWeeks = getPastWeekReports();
  const weekRange = formatWeekRange(currentWeek.weekStart, currentWeek.weekEnd);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-3">
          <Calendar className="w-4 h-4" />
          <span>주간 예측 대시보드</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          이번 주 예측
          <span className="text-blue-400 ml-3 text-2xl md:text-3xl">{weekRange}</span>
        </h1>
        <p className="text-slate-400 text-base max-w-2xl">
          AI 기반 국제정세 예측 리포트. 주요 이슈별 시나리오 분석과 위험도 평가를 확인하세요.
        </p>
      </div>

      {/* Top stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-blue-400 mb-2">
            <Target className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white">{currentWeek.predictions.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">이번 주 예측</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-orange-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white">{currentWeek.accuracyRate}%</p>
          <p className="text-xs text-slate-400 mt-0.5">적중률</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-purple-400 mb-2">
            <BarChart3 className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white">{pastWeeks.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">과거 주간 리포트</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-emerald-400 mb-2">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white">
            {(() => {
              const score = computeAIScore();
              return `${score.accuracyRate}%`;
            })()}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">누적 적중률</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content: 2/3 */}
        <div className="lg:col-span-2 space-y-8">
          {/* Current week predictions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                {currentWeek.year}년 {currentWeek.weekNumber}주차 AI 예측
              </h2>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {currentWeek.weekStart} ~ {currentWeek.weekEnd}
                </span>
              </div>
            </div>

            {/* Week summary */}
            {currentWeek.summary && (
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/30 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-300 leading-relaxed">{currentWeek.summary}</p>
              </div>
            )}

            {/* Prediction cards */}
            <div className="space-y-3">
              {currentWeek.predictions.map((pred) => (
                <PredictionCard key={pred.id} prediction={pred} showResult={!!pred.result} />
              ))}
            </div>
          </section>

          {/* Past weeks archive */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                과거 주간 리포트
              </h2>
              <Link
                href="/scorecard"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                AI 성적표 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {pastWeeks.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                <p className="text-sm text-slate-400">아직 과거 리포트가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastWeeks.map((report) => (
                  <PastWeekSection key={report.id} report={report} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: 1/3 */}
        <div className="space-y-6">
          {/* Overall risk gauge */}
          <OverallRiskGauge probability={currentWeek.accuracyRate} />

          {/* Accuracy mini chart */}
          <AccuracyMiniChart />

          {/* Live news feed */}
          <NewsFeedSection />

          {/* Scorecard CTA */}
          <Link href="/scorecard" className="block">
            <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-700/40 rounded-xl p-5 hover:border-purple-500/60 transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-white">AI 예측 성적표</span>
              </div>
              <p className="text-sm text-slate-300 mb-3">
                AI 예측의 정확도를 이슈별, 주간별로 상세히 분석합니다.
              </p>
              <span className="text-sm text-purple-400 font-medium flex items-center gap-1">
                성적표 보기 <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          {/* Hot issues this week */}
          {currentWeek.predictions.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                이번 주 핫이슈
              </h3>
              <div className="space-y-2">
                {[...new Set(currentWeek.predictions.map((p) => p.issueId))].map((issueId) => (
                  <Link
                    key={issueId}
                    href={`/issues/${issueId}`}
                    className="group flex items-center gap-2 py-1.5 hover:bg-slate-800/50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <span className="text-sm text-slate-300 group-hover:text-blue-300 transition-colors">
                      {issueTitles[issueId] || issueId}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 ml-auto transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
