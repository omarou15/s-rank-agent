"use client";

import { TRUST_LEVELS } from "@s-rank/shared";
import type { TrustLevel } from "@s-rank/shared";

interface TrustSliderProps {
  value: TrustLevel;
  onChange: (level: TrustLevel) => void;
}

export function TrustSlider({ value, onChange }: TrustSliderProps) {
  const level = TRUST_LEVELS[value];

  const colors: Record<TrustLevel, string> = {
    1: "text-srank-cyan",
    2: "text-srank-green",
    3: "text-srank-amber",
    4: "text-srank-red",
  };

  return (
    <div>
      <input
        type="range"
        min={1}
        max={4}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as TrustLevel)}
        className="w-full accent-srank-primary"
      />
      <div className="flex justify-between text-[10px] text-srank-text-muted mt-1 mb-3">
        <span>Supervisé</span>
        <span>Full Auto</span>
      </div>
      <div className="p-3 rounded-lg bg-srank-bg">
        <span className={`text-sm font-semibold ${colors[value]}`}>
          Niveau {value} — {level.name}
        </span>
        <p className="text-xs text-srank-text-muted mt-1">
          {level.description}
        </p>
      </div>
    </div>
  );
}
