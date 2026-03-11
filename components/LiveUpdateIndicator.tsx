"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Wifi, WifiOff, ChevronUp, ChevronDown, Clock, Activity, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "./LanguageProvider";

const UPDATE_INTERVAL_MS = 1 * 60 * 1000; // 1분

interface UpdateLog {
  time: string;
  type: string;
  detail: string;
}

export default function LiveUpdateIndicator() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [nextUpdate, setNextUpdate] = useState<Date>(new Date(Date.now() + UPDATE_INTERVAL_MS));
  const [countdown, setCountdown] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [updateCount, setUpdateCount] = useState(0);
  const [logs, setLogs] = useState<UpdateLog[]>([
    { time: formatTime(new Date()), type: "System", detail: "initialized" },
  ]);

  function formatTime(d: Date): string {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function formatDate(d: Date): string {
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) + " " + formatTime(d);
  }

  const performUpdate = useCallback(async () => {
    setIsUpdating(true);
    const startTime = Date.now();

    const newLogs: UpdateLog[] = [];

    try {
      // 1. Fetch live market data
      const marketRes = await fetch("/api/live-update");
      if (marketRes.ok) {
        const data = await marketRes.json();
        newLogs.push({
          time: formatTime(new Date()),
          type: t.common.marketData,
          detail: `${data.assetsUpdated} ${t.common.assetsUpdated}`,
        });
      }

      // 2. Refresh Next.js page data
      router.refresh();
      newLogs.push({
        time: formatTime(new Date()),
        type: "Page",
        detail: t.common.pageRefresh,
      });

      newLogs.push({
        time: formatTime(new Date()),
        type: "AI",
        detail: t.common.aiRefresh,
      });

      const elapsed = Date.now() - startTime;
      newLogs.push({
        time: formatTime(new Date()),
        type: t.common.complete,
        detail: `${t.common.complete} (${(elapsed / 1000).toFixed(1)}s)`,
      });

    } catch {
      newLogs.push({
        time: formatTime(new Date()),
        type: "Error",
        detail: t.common.errorRetry,
      });
    }

    const now = new Date();
    setLastUpdated(now);
    setNextUpdate(new Date(now.getTime() + UPDATE_INTERVAL_MS));
    setUpdateCount((c) => c + 1);
    setLogs((prev) => [...newLogs, ...prev].slice(0, 20));
    setIsUpdating(false);
  }, [router]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = nextUpdate.getTime() - now;

      if (diff <= 0) {
        performUpdate();
        return;
      }

      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setCountdown(`${min}:${sec.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [nextUpdate, performUpdate]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Progress bar percentage
  const elapsed = Date.now() - lastUpdated.getTime();
  const progressPercent = Math.min((elapsed / UPDATE_INTERVAL_MS) * 100, 100);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Expanded panel */}
      {isExpanded && (
        <div className="bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-xl shadow-2xl w-80 overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">{t.common.live} Update</span>
            </div>
            <button
              onClick={() => performUpdate()}
              disabled={isUpdating}
              className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isUpdating ? "animate-spin" : ""}`} />
              {t.common.manualRefresh}
            </button>
          </div>

          {/* Stats */}
          <div className="px-4 py-3 grid grid-cols-2 gap-3 border-b border-slate-700/50">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t.common.lastUpdated}</div>
              <div className="text-sm text-white font-mono">{formatDate(lastUpdated)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t.common.nextUpdate}</div>
              <div className="text-sm text-emerald-400 font-mono">{countdown}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t.common.updateCycle}</div>
              <div className="text-sm text-white">1{t.common.min}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t.common.cumulativeUpdates}</div>
              <div className="text-sm text-white">{updateCount}{t.common.times}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-4 py-2 border-b border-slate-700/50">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>{t.common.updateProgress}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Logs */}
          <div className="px-4 py-2 max-h-40 overflow-y-auto">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{t.common.updateLog}</div>
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 py-1 text-xs">
                <span className="text-slate-600 font-mono shrink-0">{log.time}</span>
                <span className={`shrink-0 px-1 rounded text-[10px] font-medium ${
                  log.type === t.common.complete ? "bg-emerald-900/50 text-emerald-400" :
                  log.type === "Error" ? "bg-red-900/50 text-red-400" :
                  "bg-slate-800 text-slate-400"
                }`}>
                  {log.type}
                </span>
                <span className="text-slate-300">{log.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compact indicator (always visible) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full border shadow-lg transition-all duration-300 ${
          isUpdating
            ? "bg-blue-950/90 border-blue-500/50 shadow-blue-500/20"
            : isOnline
            ? "bg-slate-900/90 border-slate-700 hover:border-emerald-500/50 shadow-emerald-500/10"
            : "bg-red-950/90 border-red-700 shadow-red-500/20"
        } backdrop-blur-lg`}
      >
        {/* Live dot */}
        <div className="relative flex items-center justify-center">
          {isUpdating ? (
            <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          ) : isOnline ? (
            <>
              <span className="absolute w-3 h-3 rounded-full bg-emerald-400/30 animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
            </>
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-red-400" />
          )}
        </div>

        {/* Label */}
        <span className="text-xs font-medium text-slate-300">
          {isUpdating ? t.common.updating : isOnline ? t.common.live : t.common.offline}
        </span>

        {/* Countdown */}
        {!isUpdating && isOnline && (
          <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {countdown}
          </span>
        )}

        {/* Expand icon */}
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-slate-500" />
        ) : (
          <ChevronUp className="w-3 h-3 text-slate-500" />
        )}
      </button>
    </div>
  );
}
