"use client";

import { useState, useEffect } from "react";
import { Shield, ShieldCheck, ShieldAlert, Zap } from "lucide-react";

const TRUST_LEVELS = [
  { level: 1, name: "Supervision", description: "Confirmation avant chaque action", icon: ShieldAlert, color: "text-red-400", bg: "bg-red-400",
    detail: "L'agent demande ta permission pour tout : créer un fichier, exécuter du code, appeler une API." },
  { level: 2, name: "Prudent", description: "Confirmation pour actions critiques", icon: Shield, color: "text-yellow-400", bg: "bg-yellow-400",
    detail: "L'agent agit librement pour les tâches courantes. Confirmation requise pour : supprimer, déployer, payer." },
  { level: 3, name: "Autonome", description: "Agit librement, notifie après", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-400",
    detail: "L'agent exécute toutes les actions et te notifie des résultats. Tu peux annuler après coup." },
  { level: 4, name: "Full Auto", description: "Aucune interruption", icon: Zap, color: "text-violet-400", bg: "bg-violet-400",
    detail: "Mode 100% autonome. L'agent enchaîne les tâches sans interruption. Tout est logué." },
];

export function TrustSlider({ onChange }: { onChange?: (level: number) => void }) {
  const [level, setLevel] = useState(2);

  useEffect(() => {
    const stored = localStorage.getItem("s-rank-trust-level");
    if (stored) setLevel(parseInt(stored));
  }, []);

  const handleChange = (n: number) => {
    setLevel(n);
    localStorage.setItem("s-rank-trust-level", String(n));
    onChange?.(n);
    // Broadcast to chat
    const names: Record<number,string> = { 1: "Supervision totale", 2: "Prudent", 3: "Autonome", 4: "Full Auto" };
    localStorage.setItem("s-rank-config-event", JSON.stringify({
      type: "trust_changed",
      message: `Autonomie → ${names[n]} (${n}/4)`,
      ts: Date.now(),
    }));
  };

  const current = TRUST_LEVELS[level - 1];
  const Icon = current.icon;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl ${current.bg}/10 flex items-center justify-center`}>
          <Icon size={20} className={current.color} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${current.color}`}>{current.name}</span>
            <span className="text-xs text-zinc-600">Niveau {level}</span>
          </div>
          <p className="text-xs text-zinc-500">{current.description}</p>
        </div>
      </div>

      <input type="range" min={1} max={4} step={1} value={level}
        onChange={(e) => handleChange(parseInt(e.target.value))}
        className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-violet-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-violet-300 [&::-webkit-slider-thumb]:shadow-lg" />

      <div className="flex justify-between mt-2">
        {TRUST_LEVELS.map((t) => (
          <button key={t.level} onClick={() => handleChange(t.level)}
            className={`text-[10px] w-16 text-center ${t.level === level ? current.color : "text-zinc-600"}`}>
            {t.name}
          </button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
        <p className="text-xs text-zinc-400">{current.detail}</p>
      </div>
    </div>
  );
}
