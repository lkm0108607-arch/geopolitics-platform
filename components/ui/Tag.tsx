interface TagProps {
  label: string;
  color?: "blue" | "purple" | "green" | "orange" | "red" | "slate";
  size?: "sm" | "md";
}

const colorMap = {
  blue: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  purple: "bg-purple-900/50 text-purple-300 border-purple-700/50",
  green: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
  orange: "bg-orange-900/50 text-orange-300 border-orange-700/50",
  red: "bg-red-900/50 text-red-300 border-red-700/50",
  slate: "bg-slate-800 text-slate-300 border-slate-700",
};

export default function Tag({ label, color = "slate", size = "md" }: TagProps) {
  const padding = size === "sm" ? "px-1.5 py-0" : "px-2 py-0.5";
  const text = size === "sm" ? "text-[10px]" : "text-xs";
  return (
    <span className={`inline-block ${padding} ${text} font-medium border rounded-full ${colorMap[color]}`}>
      {label}
    </span>
  );
}
