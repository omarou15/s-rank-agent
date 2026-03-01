"use client";

interface ResourceGaugeProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}

export function ResourceGauge({ label, value, max, unit, color }: ResourceGaugeProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isWarning = percentage > 80;
  const isCritical = percentage > 90;

  return (
    <div className="p-4 rounded-xl bg-srank-card border border-srank-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-srank-text-secondary">{label}</span>
        <span
          className={`text-xs font-mono ${
            isCritical
              ? "text-srank-red"
              : isWarning
                ? "text-srank-amber"
                : "text-srank-text-primary"
          }`}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>

      {/* Bar */}
      <div className="h-2 bg-srank-bg rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: isCritical ? "#EF4444" : isWarning ? "#F59E0B" : color,
          }}
        />
      </div>

      <div className="text-[10px] text-srank-text-muted">
        {value} / {max} {unit}
      </div>
    </div>
  );
}
