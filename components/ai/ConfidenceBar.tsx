"use client";

interface ConfidenceBarProps {
  value: number; // 0-100
  label?: string;
  size?: "sm" | "md";
}

const sizeConfig = {
  sm: { bar: "h-1.5", text: "text-[10px]" },
  md: { bar: "h-2.5", text: "text-xs" },
};

export default function ConfidenceBar({ value, label, size = "md" }: ConfidenceBarProps) {
  const s = sizeConfig[size];
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="w-full">
      {(label || true) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className={`${s.text} text-slate-400`}>{label}</span>}
          <span className={`${s.text} font-mono text-slate-300 ${!label ? "ml-auto" : ""}`}>
            {clamped.toFixed(1)}%
          </span>
        </div>
      )}
      <div className={`w-full ${s.bar} rounded-full bg-slate-700 overflow-hidden`}>
        <div
          className={`${s.bar} rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
