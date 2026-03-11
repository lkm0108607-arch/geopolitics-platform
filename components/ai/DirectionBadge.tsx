"use client";

import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

type Direction = "상승" | "하락" | "보합" | "변동성확대";
type BadgeSize = "sm" | "md" | "lg";

interface DirectionBadgeProps {
  direction: Direction;
  size?: BadgeSize;
}

const directionConfig: Record<Direction, { color: string; bg: string; Icon: typeof TrendingUp }> = {
  "상승": { color: "text-red-400", bg: "bg-red-500/15 border-red-500/30", Icon: TrendingUp },
  "하락": { color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30", Icon: TrendingDown },
  "보합": { color: "text-slate-400", bg: "bg-slate-500/15 border-slate-500/30", Icon: Minus },
  "변동성확대": { color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30", Icon: Activity },
};

const sizeConfig: Record<BadgeSize, { pill: string; icon: string; text: string }> = {
  sm: { pill: "px-2 py-0.5 gap-1 border", icon: "w-3 h-3", text: "text-[11px]" },
  md: { pill: "px-3 py-1 gap-1.5 border", icon: "w-4 h-4", text: "text-xs" },
  lg: { pill: "px-4 py-1.5 gap-2 border", icon: "w-5 h-5", text: "text-sm" },
};

export default function DirectionBadge({ direction, size = "md" }: DirectionBadgeProps) {
  const config = directionConfig[direction] ?? directionConfig["보합"];
  const { color, bg, Icon } = config;
  const s = sizeConfig[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${bg} ${color} ${s.pill} ${s.text}`}
    >
      <Icon className={s.icon} />
      {direction}
    </span>
  );
}
