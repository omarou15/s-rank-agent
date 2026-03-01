import { cn } from "@/lib/utils";

interface ResourceBarProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  color?: "cyan" | "primary" | "green" | "amber" | "red";
}

export function ResourceBar({
  label,
  value,
  max = 100,
  unit = "%",
  color = "cyan",
}: ResourceBarProps) {
  const percent = Math.min((value / max) * 100, 100);

  const colorMap = {
    cyan: "bg-srank-cyan",
    primary: "bg-srank-primary",
    green: "bg-srank-green",
    amber: "bg-srank-amber",
    red: "bg-srank-red",
  };

  // Auto color based on threshold
  const effectiveColor =
    percent > 90 ? "red" : percent > 70 ? "amber" : color;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-srank-text-secondary">{label}</span>
        <span className="text-xs font-mono text-srank-text-primary">
          {value}{unit}
        </span>
      </div>
      <div className="h-1.5 bg-srank-bg rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            colorMap[effectiveColor]
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
