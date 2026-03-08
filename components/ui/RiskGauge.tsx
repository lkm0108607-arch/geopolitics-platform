interface RiskGaugeProps {
  level: number; // 0-100
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function getRiskColor(level: number): string {
  if (level >= 80) return "text-red-400";
  if (level >= 60) return "text-orange-400";
  if (level >= 40) return "text-yellow-400";
  return "text-green-400";
}

export function getRiskBgColor(level: number): string {
  if (level >= 80) return "bg-red-500";
  if (level >= 60) return "bg-orange-500";
  if (level >= 40) return "bg-yellow-500";
  return "bg-green-500";
}

export function getRiskLabel(level: number): string {
  if (level >= 80) return "매우 높음";
  if (level >= 60) return "높음";
  if (level >= 40) return "보통";
  return "낮음";
}

export default function RiskGauge({ level, size = "md", showLabel = true }: RiskGaugeProps) {
  const barH = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className={`flex items-center justify-between ${textSize}`}>
          <span className="text-slate-400">발생 확률</span>
          <span className={`font-bold ${getRiskColor(level)}`}>
            {level}<span className="font-normal text-xs">%</span>
          </span>
        </div>
      )}
      <div className={`w-full bg-slate-700 rounded-full ${barH} overflow-hidden`}>
        <div
          className={`${barH} rounded-full transition-all ${getRiskBgColor(level)}`}
          style={{ width: `${level}%` }}
        />
      </div>
      {showLabel && (
        <p className={`${getRiskColor(level)} font-semibold text-xs`}>{getRiskLabel(level)}</p>
      )}
    </div>
  );
}
