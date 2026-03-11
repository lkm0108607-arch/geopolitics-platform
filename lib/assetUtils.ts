import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

export function getChangeColor(change: number): string {
  if (change > 0) return "text-red-400";
  if (change < 0) return "text-blue-400";
  return "text-slate-400";
}

export function getDirectionInfoStatic(direction: string) {
  switch (direction) {
    case "상승": case "강세": return { icon: TrendingUp, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30", label: "상승" };
    case "하락": case "약세": return { icon: TrendingDown, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30", label: "하락" };
    case "변동성확대": return { icon: Activity, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", label: "변동성" };
    default: return { icon: Minus, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/30", label: "보합" };
  }
}
