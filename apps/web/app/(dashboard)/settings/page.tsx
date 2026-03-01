"use client";

import { useState, useEffect } from "react";
import { TRUST_LEVELS, PLAN_LIMITS } from "@s-rank/shared";
import type { TrustLevel, Plan } from "@s-rank/shared";
import { useApi } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/stores/app-store";

export default function SettingsPage() {
  const { get, post, loading } = useApi();
  const appStore = useAppStore();

  const [apiKey, setApiKey] = useState("");
  const [apiKeyValid, setApiKeyValid] = useState(appStore.user?.apiKeyValid || false);
  const [trustLevel, setTrustLevel] = useState<TrustLevel>((appStore.user?.trustLevel as TrustLevel) || 2);
  const [agentMode, setAgentMode] = useState<"on-demand" | "always-on">((appStore.user?.agentMode as any) || "on-demand");
  const [currentPlan, setCurrentPlan] = useState<Plan>((appStore.user?.plan as Plan) || "starter");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    get<{ user: any; server: any }>("/settings/profile")
      .then((data) => {
        if (data.user) {
          setApiKeyValid(data.user.apiKeyValid || false);
          setTrustLevel(data.user.trustLevel || 2);
          setAgentMode(data.user.agentMode || "on-demand");
          setCurrentPlan(data.user.plan || "starter");
        }
      })
      .catch(() => {});
  }, []);

  const saveApiKey = async () => {
    if (!apiKey.startsWith("sk-")) { setMessage("La cl\u00E9 doit commencer par sk-"); return; }
    setSaving(true); setMessage("");
    try {
      await post("/settings/api-key", { apiKey });
      setApiKeyValid(true);
      setApiKey("");
      setMessage("\u2705 Cl\u00E9 valid\u00E9e et sauvegard\u00E9e !");
    } catch (err: any) {
      setMessage(`\u274C ${err.message}`);
    } finally { setSaving(false); }
  };

  const saveTrustLevel = async (level: TrustLevel) => {
    setTrustLevel(level);
    try { await post("/settings/trust-level", { level }); } catch { /* ignore */ }
  };

  const saveAgentMode = async (mode: "on-demand" | "always-on") => {
    setAgentMode(mode);
    try { await post("/settings/agent-mode", { mode }); } catch { /* ignore */ }
  };

  const trust = TRUST_LEVELS[trustLevel];
  const planLimits = PLAN_LIMITS[currentPlan];
  const trustColors = { 1: "bg-srank-green", 2: "bg-srank-cyan", 3: "bg-srank-amber", 4: "bg-srank-red" };

  return (
    <div className="h-screen overflow-y-auto">
      <div className="px-6 py-6 max-w-3xl mx-auto space-y-8">
        <h1 className="text-lg font-semibold">Param\u00E8tres</h1>

        {/* API Key */}
        <div className="p-5 rounded-xl bg-srank-card border border-srank-border">
          <h2 className="text-sm font-semibold mb-1">Cl\u00E9 API Claude</h2>
          <p className="text-xs text-srank-text-muted mb-4">
            Votre propre cl\u00E9 Anthropic. Factur\u00E9 directement sur votre compte.{" "}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" className="text-srank-primary hover:underline">Obtenir une cl\u00E9</a>
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${apiKeyValid ? "bg-srank-green" : "bg-srank-red"}`} />
            <span className="text-xs">{apiKeyValid ? "Cl\u00E9 valide" : "Aucune cl\u00E9 configur\u00E9e"}</span>
          </div>
          <div className="flex gap-2">
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..." className="flex-1 bg-srank-bg border border-srank-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-srank-primary placeholder:text-srank-text-muted" />
            <button onClick={saveApiKey} disabled={saving || !apiKey}
              className="px-4 py-2 text-xs bg-srank-primary text-white rounded-lg hover:bg-srank-primary-600 disabled:opacity-50 transition-colors">
              {saving ? "Validation..." : "Sauvegarder"}
            </button>
          </div>
          {message && <p className="text-xs mt-2">{message}</p>}
        </div>

        {/* Trust Level */}
        <div className="p-5 rounded-xl bg-srank-card border border-srank-border">
          <h2 className="text-sm font-semibold mb-1">Niveau de confiance</h2>
          <p className="text-xs text-srank-text-muted mb-4">Contr\u00F4le le degr\u00E9 d'autonomie de l'agent.</p>
          <div className="flex gap-2 mb-4">
            {([1, 2, 3, 4] as TrustLevel[]).map((level) => (
              <button key={level} onClick={() => saveTrustLevel(level)}
                className={`flex-1 py-3 rounded-xl border-2 text-center transition-all ${
                  trustLevel === level ? "border-srank-primary bg-srank-primary/5" : "border-srank-border hover:border-srank-primary/30"
                }`}>
                <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${trustColors[level]}`} />
                <span className="text-xs font-semibold">{level}</span>
              </button>
            ))}
          </div>
          <div className="p-3 bg-srank-bg rounded-lg">
            <p className="text-xs font-semibold text-srank-text-primary">{trust.name}</p>
            <p className="text-xs text-srank-text-muted mt-1">{trust.description}</p>
          </div>
        </div>

        {/* Agent Mode */}
        <div className="p-5 rounded-xl bg-srank-card border border-srank-border">
          <h2 className="text-sm font-semibold mb-4">Mode de l'agent</h2>
          <div className="flex gap-3">
            {[
              { mode: "on-demand" as const, label: "On-Demand", desc: "L'agent r\u00E9pond quand tu lui parles" },
              { mode: "always-on" as const, label: "Always-On", desc: "L'agent travaille en continu en arri\u00E8re-plan" },
            ].map(({ mode, label, desc }) => (
              <button key={mode} onClick={() => saveAgentMode(mode)}
                className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${
                  agentMode === mode ? "border-srank-primary bg-srank-primary/5" : "border-srank-border hover:border-srank-primary/30"
                }`}>
                <span className="text-xs font-semibold">{label}</span>
                <p className="text-[10px] text-srank-text-muted mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Plan */}
        <div className="p-5 rounded-xl bg-srank-card border border-srank-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Plan actuel</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-srank-primary/10 text-srank-primary rounded-full uppercase">{currentPlan}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {(["starter", "pro", "business"] as Plan[]).map((plan) => {
              const limits = PLAN_LIMITS[plan];
              const isCurrent = currentPlan === plan;
              return (
                <div key={plan} className={`p-3 rounded-lg border ${isCurrent ? "border-srank-primary bg-srank-primary/5" : "border-srank-border"}`}>
                  <p className="text-xs font-semibold capitalize">{plan}</p>
                  <p className="text-lg font-bold mt-1">{limits.price === 0 ? "Gratuit" : `${limits.price}\u20AC`}</p>
                  <p className="text-[10px] text-srank-text-muted">{limits.serverSize}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
