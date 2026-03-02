"use client";

import { useState, useEffect } from "react";
import { TrustSlider } from "@/components/shared/trust-slider";
import { Key, Server, Activity, ExternalLink, Brain, Trash2, Mail, Wallet, ArrowUpRight, CheckCircle, XCircle, Loader2, AlertTriangle, GitBranch } from "lucide-react";

// ── Orchestrator Toggle ──
function OrchestratorToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(localStorage.getItem("s-rank-orchestrator") === "true");
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("s-rank-orchestrator", String(next));
    localStorage.setItem("s-rank-config-event", JSON.stringify({
      type: "orchestrator_mode",
      message: next ? "Mode orchestrateur activé — l'agent délègue le code aux sub-agents" : "Mode direct activé — l'agent code lui-même",
      ts: Date.now(),
    }));
  };

  return (
    <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-amber-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">Mode Orchestrateur</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {enabled ? "L'agent délègue le code à des sub-agents spécialisés" : "L'agent écrit et exécute le code lui-même"}
            </p>
          </div>
        </div>
        <button onClick={toggle}
          className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-amber-500" : "bg-zinc-700"}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
      </div>
      {enabled && (
        <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <p className="text-[11px] text-amber-400/70 leading-relaxed">
            L&apos;agent planifie et supervise. Le code est généré par des sub-agents via API Claude.
            Plus lent (+2-5s par délégation) mais meilleure qualité sur les projets complexes.
          </p>
        </div>
      )}
    </div>
  );
}

// Wallet Component (existing)
function WalletCard() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topUpLoading, setTopUpLoading] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [limitsSaved, setLimitsSaved] = useState(false);

  useEffect(() => {
    fetch("/api/wallet").then(r => r.json()).then(w => {
      setWallet(w); setDailyLimit(String(w.daily_limit || 10)); setMonthlyLimit(String(w.monthly_limit || 100));
    }).catch(() => {}).finally(() => setLoading(false));

    const params = new URLSearchParams(window.location.search);
    if (params.get("wallet_success") === "true") {
      const amount = parseInt(params.get("amount") || "0");
      if (amount > 0) {
        fetch("/api/wallet/topup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, method: "stripe" }) })
          .then(r => r.json()).then(setWallet).catch(() => {});
      }
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  const topUp = async (amount: number) => {
    setTopUpLoading(amount);
    try {
      const res = await fetch("/api/billing/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {} finally { setTopUpLoading(null); }
  };

  const saveLimits = () => {
    fetch("/api/wallet/limits", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily: parseFloat(dailyLimit) || 10, monthly: parseFloat(monthlyLimit) || 100 }) })
      .then(r => r.json()).then(setWallet);
    setLimitsSaved(true);
    setTimeout(() => setLimitsSaved(false), 2000);
  };

  if (loading) return <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse h-48" />;

  return (
    <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
      <div className="flex items-center gap-2 mb-1">
        <Wallet size={16} className="text-amber-400" />
        <h2 className="text-sm font-semibold text-white">Wallet Agent</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-4">Solde prépayé pour que ton agent achète des services (domaines, APIs, serveurs).</p>
      
      <div className="bg-zinc-950 rounded-xl p-4 mb-4 border border-zinc-800">
        <p className="text-[10px] text-zinc-500 uppercase">Solde disponible</p>
        <p className="text-3xl font-bold text-white">{(wallet?.balance || 0).toFixed(2)}€</p>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500">
          <span>Dépensé aujourd&apos;hui: <span className="text-zinc-300">{(wallet?.daily_spent || 0).toFixed(2)}€</span> / {wallet?.daily_limit || 10}€</span>
          <span>Ce mois: <span className="text-zinc-300">{(wallet?.monthly_spent || 0).toFixed(2)}€</span> / {wallet?.monthly_limit || 100}€</span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-zinc-400 mb-2">Recharger le wallet</p>
        <div className="grid grid-cols-4 gap-2">
          {[10, 25, 50, 100].map(a => (
            <button key={a} onClick={() => topUp(a)} disabled={topUpLoading === a}
              className="py-2 rounded-lg text-sm font-medium bg-zinc-800 border border-zinc-700 hover:border-violet-500/30 text-white transition-colors disabled:opacity-50">
              {topUpLoading === a ? <Loader2 size={14} className="animate-spin mx-auto" /> : `${a}€`}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 mt-1">Paiement sécurisé par Stripe</p>
      </div>

      <div className="mb-3">
        <p className="text-xs text-zinc-400 mb-2">Limites de dépenses</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Par jour</label>
            <div className="flex items-center gap-1">
              <input value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500" />
              <span className="text-[10px] text-zinc-500">€</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Par mois</label>
            <div className="flex items-center gap-1">
              <input value={monthlyLimit} onChange={(e) => setMonthlyLimit(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500" />
              <span className="text-[10px] text-zinc-500">€</span>
            </div>
          </div>
        </div>
        <button onClick={saveLimits} className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${limitsSaved ? "bg-green-600 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"}`}>
          {limitsSaved ? "✓ Sauvegardé" : "Sauvegarder les limites"}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [agentMode, setAgentMode] = useState<"on-demand" | "always-on">("on-demand");
  const [isLoading, setIsLoading] = useState(false);

  // Load agent mode on mount
  useEffect(() => {
    const loadMode = async () => {
      try {
        const response = await fetch("/api/settings/agent-mode");
        if (response.ok) {
          const data = await response.json();
          if (data.mode && ["on-demand", "always-on"].includes(data.mode)) {
            setAgentMode(data.mode);
            return;
          }
        }
      } catch (error) {
        console.log("API not available, using localStorage");
      }

      // Fallback to localStorage
      const stored = localStorage.getItem("s-rank-agent-mode");
      if (stored && ["on-demand", "always-on"].includes(stored)) {
        setAgentMode(stored as "on-demand" | "always-on");
      }
    };
    loadMode();
  }, []);

  // Update agent mode
  const updateAgentMode = async (newMode: "on-demand" | "always-on") => {
    if (isLoading || agentMode === newMode) return;
    
    setIsLoading(true);
    const previousMode = agentMode;
    
    try {
      // Optimistic update
      setAgentMode(newMode);
      localStorage.setItem("s-rank-agent-mode", newMode);

      // Save to API
      const response = await fetch("/api/settings/agent-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });

      if (!response.ok) throw new Error("API failed");
      
      console.log(`✅ Agent mode changed to: ${newMode}`);
      
    } catch (error) {
      console.error("Failed to update agent mode:", error);
      
      // Revert on error
      setAgentMode(previousMode);
      localStorage.setItem("s-rank-agent-mode", previousMode);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Paramètres</h1>
        <p className="text-zinc-400 text-sm">Configure ton agent S-Rank selon tes préférences.</p>
      </div>

      <div className="grid gap-6">
        {/* Agent Mode - FIXED VERSION */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Mode agent</h2>
          </div>
          <div className="flex gap-3">
            {[
              { mode: "on-demand", label: "On-Demand", desc: "Répond quand tu lui parles" }, 
              { mode: "always-on", label: "Always-On", desc: "Travaille en continu" }
            ].map(({ mode, label, desc }) => (
              <button 
                key={mode} 
                onClick={() => updateAgentMode(mode as "on-demand" | "always-on")}
                disabled={isLoading}
                className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                  agentMode === mode 
                    ? "border-violet-500 bg-violet-500/5" 
                    : "border-zinc-800 hover:border-zinc-700"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white">{label}</span>
                    <p className="text-[10px] text-zinc-500 mt-1">{desc}</p>
                  </div>
                  {isLoading && (
                    <Loader2 size={12} className="animate-spin text-violet-400" />
                  )}
                </div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 mt-3">
            {agentMode === "on-demand" 
              ? "L'agent attendra tes instructions avant d'agir sur les tâches sensibles"
              : "L'agent travaillera de manière proactive et autonome"
            }
          </p>
        </div>

        {/* Trust Level */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={16} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Niveau de confiance</h2>
          </div>
          <TrustSlider />
        </div>

        {/* Orchestrator Mode */}
        <OrchestratorToggle />

        {/* Email */}
        <EmailCard />

        {/* Wallet */}
        <WalletCard />

        {/* Other settings sections would go here */}
      </div>
    </div>
  );
}
