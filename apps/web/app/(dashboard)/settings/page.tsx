"use client";

import { useState, useEffect } from "react";
import { TrustSlider } from "@/components/shared/trust-slider";
import { Key, Server, Activity, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("s-rank-api-key");
    if (stored) { setHasKey(true); setApiKey(stored); }

    fetch("/api/server/status").then(r => r.json()).then(setServerStatus).catch(() => {});
  }, []);

  const saveKey = () => {
    if (!apiKey.startsWith("sk-ant-")) { setMessage("La clé doit commencer par sk-ant-"); return; }
    localStorage.setItem("s-rank-api-key", apiKey);
    setHasKey(true);
    setMessage("Clé sauvegardée !");
    setTimeout(() => setMessage(""), 3000);
  };

  const removeKey = () => {
    localStorage.removeItem("s-rank-api-key");
    setApiKey("");
    setHasKey(false);
    setMessage("Clé supprimée");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-lg font-semibold text-white">Paramètres</h1>

        {/* API Key */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <Key size={16} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Clé API Claude</h2>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            Modèle BYOK — ta clé reste dans ton navigateur.{" "}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-0.5">
              Obtenir une clé <ExternalLink size={10} />
            </a>
          </p>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${hasKey ? "bg-emerald-400" : "bg-red-400"}`} />
            <span className="text-xs text-zinc-400">{hasKey ? "Clé configurée" : "Aucune clé"}</span>
          </div>
          <div className="flex gap-2">
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 placeholder:text-zinc-600" />
            <button onClick={saveKey} className="px-4 py-2 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-500">
              Sauvegarder
            </button>
          </div>
          {hasKey && (
            <button onClick={removeKey} className="text-xs text-red-400 hover:text-red-300 mt-2">
              Supprimer la clé
            </button>
          )}
          {message && <p className="text-xs text-emerald-400 mt-2">{message}</p>}
        </div>

        {/* Trust Slider */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
          <h2 className="text-sm font-semibold text-white mb-4">Niveau de confiance</h2>
          <TrustSlider />
        </div>

        {/* Server Status */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Server size={16} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Serveur</h2>
          </div>
          {serverStatus?.status === "running" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">En ligne</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-500 uppercase">IP</p>
                  <p className="text-sm text-white font-mono">{serverStatus.server?.ip || "—"}</p>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-500 uppercase">Type</p>
                  <p className="text-sm text-white">{serverStatus.server?.type || "—"}</p>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-500 uppercase">Location</p>
                  <p className="text-sm text-white">{serverStatus.server?.location || "—"}</p>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-500 uppercase">Uptime</p>
                  <p className="text-sm text-white">{serverStatus.uptime ? `${Math.round(serverStatus.uptime / 60)} min` : "—"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-xs text-red-400">Hors ligne</span>
            </div>
          )}
        </div>

        {/* Agent Mode */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Mode agent</h2>
          </div>
          <div className="flex gap-3">
            {[
              { mode: "on-demand", label: "On-Demand", desc: "Répond quand tu lui parles" },
              { mode: "always-on", label: "Always-On", desc: "Travaille en continu (bientôt)", disabled: true },
            ].map(({ mode, label, desc, disabled }) => (
              <button key={mode} disabled={disabled}
                className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                  mode === "on-demand" ? "border-violet-500 bg-violet-500/5" : "border-zinc-800 opacity-50 cursor-not-allowed"
                }`}>
                <span className="text-xs font-semibold text-white">{label}</span>
                <p className="text-[10px] text-zinc-500 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
