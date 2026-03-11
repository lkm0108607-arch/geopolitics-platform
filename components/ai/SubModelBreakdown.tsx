"use client";

import { TrendingUp, RefreshCw, Activity, Link2, BookOpen, Clock, BarChart3, MessageSquare, Gavel } from "lucide-react";
import DirectionBadge from "./DirectionBadge";
import ConfidenceBar from "./ConfidenceBar";
import type { SubModelVote } from "@/hooks/useAIPredictions";

interface HistoricalAnalysis {
  regime: string;
  regimeConfidence: number;
  historicalBias: {
    direction: "상승" | "하락" | "보합";
    strength: number;
    similarPeriodCount: number;
    avgReturnAfter: number;
    winRate: number;
  };
  patterns: Array<{ name: string; signal: string }>;
}

interface DebateResultInfo {
  agreementLevel: string;
  consensusDirection: string;
  consensusConfidence: number;
  keyArguments: string[];
  resolvedConflicts: string[];
  unresolvedConflicts: string[];
}

interface JuryVerdictInfo {
  finalVerdict: string;
  finalConfidence: number;
  verdictSummary: { trust: number; partialTrust: number; doubt: number; distrust: number };
  dissentingCount: number;
}

interface SubModelBreakdownProps {
  votes: {
    momentum: SubModelVote;
    meanReversion: SubModelVote;
    volatility: SubModelVote;
    correlation: SubModelVote;
    fundamental: SubModelVote;
  };
  historicalAnalysis?: HistoricalAnalysis | null;
  debateResult?: DebateResultInfo | null;
  juryVerdict?: JuryVerdictInfo | null;
}

const modelMeta = [
  { key: "momentum" as const, name: "모멘텀", Icon: TrendingUp },
  { key: "meanReversion" as const, name: "평균회귀", Icon: RefreshCw },
  { key: "volatility" as const, name: "변동성", Icon: Activity },
  { key: "correlation" as const, name: "교차상관", Icon: Link2 },
  { key: "fundamental" as const, name: "펀더멘털", Icon: BookOpen },
];

type DirectionType = "상승" | "하락" | "보합" | "변동성확대";

function isValidDirection(d: string): d is DirectionType {
  return ["상승", "하락", "보합", "변동성확대"].includes(d);
}

const regimeBadgeColor: Record<string, string> = {
  "trending": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "mean-reverting": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "volatile": "bg-red-500/20 text-red-400 border-red-500/30",
  "calm": "bg-green-500/20 text-green-400 border-green-500/30",
};

const regimeLabel: Record<string, string> = {
  "trending": "추세 장세",
  "mean-reverting": "평균회귀 장세",
  "volatile": "고변동성 장세",
  "calm": "안정 장세",
};

const biasDirectionColor: Record<string, string> = {
  "상승": "text-emerald-400",
  "하락": "text-red-400",
  "보합": "text-slate-400",
};

const agreementColor: Record<string, string> = {
  "만장일치": "text-emerald-400",
  "다수결": "text-blue-400",
  "분열": "text-amber-400",
  "교착": "text-red-400",
};

const verdictColor: Record<string, string> = {
  "신뢰": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "부분신뢰": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "의심": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "불신": "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function SubModelBreakdown({ votes, historicalAnalysis, debateResult, juryVerdict }: SubModelBreakdownProps) {
  if (!votes) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modelMeta.map(({ key, name, Icon }) => {
          const vote = votes[key];
          if (!vote) return null;

          return (
            <div
              key={key}
              className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-200">{name}</span>
              </div>
              {isValidDirection(vote.direction) && (
                <DirectionBadge direction={vote.direction} size="sm" />
              )}
              <ConfidenceBar value={vote.confidence ?? 0} size="sm" />
              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                {vote.rationale ?? ""}
              </p>
            </div>
          );
        })}
      </div>

      {/* AI 토론 결과 */}
      {debateResult && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-slate-200">AI 토론 결과 (12라운드)</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">합의 수준:</span>
            <span className={`font-medium ${agreementColor[debateResult.agreementLevel] ?? "text-slate-300"}`}>
              {debateResult.agreementLevel}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-400">합의 방향:</span>
            <span className="text-white font-medium">{debateResult.consensusDirection}</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-400">확신도:</span>
            <span className="text-white font-medium">{Math.round(debateResult.consensusConfidence)}%</span>
          </div>
          {debateResult.keyArguments.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500">핵심 논점:</span>
              {debateResult.keyArguments.slice(0, 3).map((arg, i) => (
                <p key={i} className="text-[11px] text-slate-400 pl-2 border-l border-orange-500/30">
                  {arg}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI 배심원 판정 */}
      {juryVerdict && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-slate-200">30인 AI 배심원단 판정</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-3 py-1 rounded-full border font-medium ${
                verdictColor[juryVerdict.finalVerdict] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30"
              }`}
            >
              {juryVerdict.finalVerdict}
            </span>
            <span className="text-xs text-slate-400">확신도 {Math.round(juryVerdict.finalConfidence)}%</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="text-center">
              <p className="text-emerald-400 font-medium">{juryVerdict.verdictSummary.trust}</p>
              <p className="text-[10px] text-slate-500">신뢰</p>
            </div>
            <div className="text-center">
              <p className="text-blue-400 font-medium">{juryVerdict.verdictSummary.partialTrust}</p>
              <p className="text-[10px] text-slate-500">부분신뢰</p>
            </div>
            <div className="text-center">
              <p className="text-amber-400 font-medium">{juryVerdict.verdictSummary.doubt}</p>
              <p className="text-[10px] text-slate-500">의심</p>
            </div>
            <div className="text-center">
              <p className="text-red-400 font-medium">{juryVerdict.verdictSummary.distrust}</p>
              <p className="text-[10px] text-slate-500">불신</p>
            </div>
          </div>
          {juryVerdict.dissentingCount > 0 && (
            <p className="text-[11px] text-slate-500">반대 의견: {juryVerdict.dissentingCount}건</p>
          )}
        </div>
      )}

      {historicalAnalysis && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-200">역사적 패턴 분석</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">시장 레짐:</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                regimeBadgeColor[historicalAnalysis.regime] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30"
              }`}
            >
              {regimeLabel[historicalAnalysis.regime] ?? historicalAnalysis.regime}
            </span>
            <span className="text-[11px] text-slate-500">
              (확신도 {Math.round(historicalAnalysis.regimeConfidence * 100)}%)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500">방향</span>
              <p className={`font-medium ${biasDirectionColor[historicalAnalysis.historicalBias.direction] ?? "text-slate-300"}`}>
                {historicalAnalysis.historicalBias.direction}
              </p>
            </div>
            <div>
              <span className="text-slate-500">승률</span>
              <p className="text-slate-300 font-medium">
                {Math.round(historicalAnalysis.historicalBias.winRate * 100)}%
              </p>
            </div>
            <div>
              <span className="text-slate-500">유사 기간</span>
              <p className="text-slate-300 font-medium">
                {historicalAnalysis.historicalBias.similarPeriodCount}건
              </p>
            </div>
            <div>
              <span className="text-slate-500">평균 수익률</span>
              <p className="text-slate-300 font-medium">
                {(historicalAnalysis.historicalBias.avgReturnAfter * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          {historicalAnalysis.patterns.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-400">감지된 패턴</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {historicalAnalysis.patterns.map((p, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600/50"
                  >
                    {p.name}: {p.signal}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
