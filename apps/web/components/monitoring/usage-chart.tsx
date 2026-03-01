"use client";

interface DataPoint {
  label: string;
  tokens: number;
  cost: number;
}

interface UsageChartProps {
  data: DataPoint[];
  type?: "tokens" | "cost";
}

export function UsageChart({ data, type = "tokens" }: UsageChartProps) {
  if (data.length === 0) return null;

  const values = data.map((d) => (type === "tokens" ? d.tokens : d.cost));
  const max = Math.max(...values, 1);

  return (
    <div className="p-4 rounded-xl bg-srank-card border border-srank-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          {type === "tokens" ? "Tokens" : "Co\u00FBt"} par jour
        </h3>
        <span className="text-xs text-srank-text-muted">7 derniers jours</span>
      </div>

      <div className="flex items-end gap-2 h-32">
        {data.map((d, i) => {
          const height = (values[i] / max) * 100;
          const color = type === "tokens" ? "bg-srank-cyan" : "bg-srank-amber";
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-srank-text-muted font-mono">
                {type === "tokens"
                  ? `${(values[i] / 1000).toFixed(0)}k`
                  : `$${values[i].toFixed(2)}`}
              </span>
              <div className="w-full relative" style={{ height: "100px" }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t ${color} transition-all duration-500`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
              </div>
              <span className="text-[9px] text-srank-text-muted">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
