interface ScoreBadgeProps {
  score: number;
  label: string;
  size?: "sm" | "md";
}

function getScoreColor(score: number) {
  if (score >= 85) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
  if (score >= 70) return "text-blue-400 bg-blue-400/10 border-blue-400/30";
  if (score >= 55) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  return "text-red-400 bg-red-400/10 border-red-400/30";
}

export default function ScoreBadge({ score, label, size = "md" }: ScoreBadgeProps) {
  const padding = size === "sm" ? "px-2 py-0.5" : "px-3 py-1";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={`inline-flex flex-col items-center border rounded-lg ${padding} ${getScoreColor(score)}`}>
      <span className={`font-bold ${size === "sm" ? "text-sm" : "text-lg"}`}>{score}</span>
      <span className={`${textSize} opacity-80`}>{label}</span>
    </div>
  );
}
