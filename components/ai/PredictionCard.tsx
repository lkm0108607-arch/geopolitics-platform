"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import DirectionBadge from "./DirectionBadge";
import ConfidenceBar from "./ConfidenceBar";
import SubModelBreakdown from "./SubModelBreakdown";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import type { LivePrice } from "@/lib/realtime/priceService";
import { getAssetById } from "@/data/assets";

interface PredictionCardProps {
  prediction: AIPrediction;
  livePrice?: LivePrice;
  showDetail: boolean;
  onToggleDetail: () => void;
}

export default function PredictionCard({
  prediction,
  livePrice,
  showDetail,
  onToggleDetail,
}: PredictionCardProps) {
  const asset = getAssetById(prediction.assetId);
  const displayName = asset?.name ?? prediction.assetId;

  const changeColor =
    livePrice && livePrice.changePercent > 0
      ? "text-red-400"
      : livePrice && livePrice.changePercent < 0
        ? "text-blue-400"
        : "text-slate-400";

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 overflow-hidden transition-all">
      {/* Compact header */}
      <button
        onClick={onToggleDetail}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="text-left min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              {displayName}
            </div>
            {livePrice && livePrice.price > 0 && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-slate-300">
                  {livePrice.price.toLocaleString("ko-KR")}
                </span>
                <span className={`text-[11px] font-mono ${changeColor}`}>
                  {livePrice.changePercent > 0 ? "+" : ""}
                  {livePrice.changePercent.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DirectionBadge direction={prediction.direction} size="sm" />
          <div className="text-right">
            <div className="text-sm font-mono font-semibold text-white">
              {prediction.probability.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500">확률</div>
          </div>
          <div className="w-24 hidden sm:block">
            <ConfidenceBar value={prediction.confidence} size="sm" />
          </div>
          {showDetail ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {showDetail && (
        <div className="border-t border-slate-700/50 p-4 space-y-4 bg-slate-900/40">
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-1">종합 판단 근거</h4>
            <div className="space-y-1.5">
              {prediction.rationale.split("\n").map((line, i) => {
                if (!line.trim()) return null;
                if (line.startsWith("종합 판단:")) {
                  return <div key={i} className="text-sm font-semibold text-white pb-1 border-b border-slate-700/40">{line}</div>;
                }
                if (line.startsWith("▸")) {
                  return (
                    <div key={i} className="text-xs text-slate-300 pt-0.5">
                      <span className="text-purple-400 font-semibold">{line.slice(0, line.indexOf(":") + 1)}</span>
                      <span className="text-slate-400">{line.slice(line.indexOf(":") + 1)}</span>
                    </div>
                  );
                }
                if (line.trim().startsWith("→")) {
                  const isUp = line.includes("상승");
                  const isDown = line.includes("하락");
                  return <div key={i} className={`text-[11px] pl-4 ${isUp ? "text-red-400" : isDown ? "text-blue-400" : "text-slate-500"}`}>{line.trim()}</div>;
                }
                return <p key={i} className="text-xs text-slate-400">{line}</p>;
              })}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">서브모델 분석</h4>
            <SubModelBreakdown
              votes={prediction.subModelVotes}
              historicalAnalysis={prediction.historicalAnalysis}
              debateResult={prediction.debateResult}
              juryVerdict={prediction.juryVerdict}
            />
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-500">
            <span>생성: {prediction.generatedAt ? new Date(prediction.generatedAt).toLocaleString("ko-KR") : "방금 전"}</span>
            <span>사이클: {prediction.cycleId}</span>
          </div>
        </div>
      )}
    </div>
  );
}
