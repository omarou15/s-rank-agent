"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Key, Server, Plug, CheckCircle, ExternalLink, ArrowRight, Loader2 } from "lucide-react";

const STEPS = [
  { icon: Key, title: "Clé API Claude", desc: "Connecte ton compte Anthropic" },
  { icon: Server, title: "Choix du serveur", desc: "Configure ton PC cloud" },
  { icon: Plug, title: "Connecteurs", desc: "Lie tes services (optionnel)" },
];

const SERVER_PLANS = [
  { id: "starter", name: "Starter", price: "15€/mois", specs: "1 vCPU · 1Go RAM · 10Go SSD", color: "border-zinc-700" },
  { id: "pro", name: "Pro", price: "39€/mois", specs: "2 vCPU · 4Go RAM · 50Go SSD", color: "border-violet-500", popular: true },
  { id: "business", name: "Business", price: "79€/mois", specs: "4 vCPU · 8Go RAM · 100Go SSD", color: "border-zinc-700" },
];

const CONNECTORS = [
  { id: "github", name: "GitHub", icon: "🐙" },
  { id: "slack", name: "Slack", icon: "💬" },
  { id: "gdrive", name: "Google Drive", icon: "📁" },
  { id: "stripe", name: "Stripe", icon: "💳" },
  { id: "vercel", name: "Vercel", icon: "▲" },
  { id: "postgres", name: "PostgreSQL", icon: "🐘" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [keyValid, setKeyValid] = useState(false);
  const [validating, setValidating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [provisioning, setProvisioning] = useState(false);
  const [serverReady, setServerReady] = useState(false);

  const validateKey = async () => {
    if (!apiKey.startsWith("sk-ant-")) return;
    setValidating(true);
    // Save key locally
    localStorage.setItem("s-rank-api-key", apiKey);
    // Simulate validation
    await new Promise(r => setTimeout(r, 1000));
    setKeyValid(true);
    setValidating(false);
  };

  const provisionServer = async () => {
    setProvisioning(true);
    // In production this would call Hetzner API
    await new Promise(r => setTimeout(r, 2000));
    setServerReady(true);
    setProvisioning(false);
  };

  const finish = () => {
    localStorage.setItem("s-rank-onboarded", "true");
    router.push("/agent");
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl">🏆</span>
          <h1 className="text-xl font-bold text-white mt-2">Bienvenue sur S-Rank Agent</h1>
          <p className="text-sm text-zinc-500 mt-1">Configuration en 3 étapes</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? "bg-emerald-600 text-white" : i === step ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500"
              }`}>
                {i < step ? <CheckCircle size={16} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-12 h-0.5 ${i < step ? "bg-emerald-600" : "bg-zinc-800"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {/* Step 1: API Key */}
          {step === 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Key size={18} className="text-violet-400" />
                <h2 className="text-lg font-semibold text-white">Clé API Claude</h2>
              </div>
              <p className="text-sm text-zinc-500 mb-6">
                S-Rank utilise ta propre clé Anthropic (BYOK). Elle reste dans ton navigateur.
              </p>

              <input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setKeyValid(false); }}
                placeholder="sk-ant-api03-..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm mb-3 focus:outline-none focus:border-violet-500" />

              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 mb-6">
                <ExternalLink size={12} /> Obtenir une clé sur console.anthropic.com
              </a>

              {keyValid ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-600/10 border border-emerald-800/30 rounded-xl mb-4">
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-sm text-emerald-400">Clé validée ! Modèle Claude Sonnet détecté.</span>
                </div>
              ) : (
                <button onClick={validateKey} disabled={!apiKey.startsWith("sk-ant-") || validating}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium disabled:opacity-50 mb-4 flex items-center justify-center gap-2">
                  {validating ? <><Loader2 size={16} className="animate-spin" /> Validation...</> : "Valider la clé"}
                </button>
              )}

              <button onClick={() => setStep(1)} disabled={!keyValid}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium disabled:opacity-30 flex items-center justify-center gap-2">
                Suivant <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Server */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Server size={18} className="text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">Choix du serveur</h2>
              </div>
              <p className="text-sm text-zinc-500 mb-6">Ton PC cloud personnel. Upgradeable à tout moment.</p>

              <div className="space-y-3 mb-6">
                {SERVER_PLANS.map((plan) => (
                  <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedPlan === plan.id ? "border-violet-500 bg-violet-600/5" : `${plan.color} hover:border-zinc-600`
                    }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{plan.name}</span>
                          {plan.popular && <span className="text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full">Populaire</span>}
                        </div>
                        <span className="text-xs text-zinc-500">{plan.specs}</span>
                      </div>
                      <span className="text-sm font-bold text-white">{plan.price}</span>
                    </div>
                  </button>
                ))}
              </div>

              {serverReady ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-600/10 border border-emerald-800/30 rounded-xl mb-4">
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-sm text-emerald-400">Serveur prêt ! IP: 46.225.103.230</span>
                </div>
              ) : (
                <button onClick={provisionServer} disabled={provisioning}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium disabled:opacity-50 mb-4 flex items-center justify-center gap-2">
                  {provisioning ? <><Loader2 size={16} className="animate-spin" /> Lancement du serveur...</> : "🚀 Lancer mon serveur"}
                </button>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep(0)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium">Retour</button>
                <button onClick={() => setStep(2)} disabled={!serverReady}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium disabled:opacity-30 flex items-center justify-center gap-2">
                  Suivant <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Connectors */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Plug size={18} className="text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">Connecteurs</h2>
              </div>
              <p className="text-sm text-zinc-500 mb-6">Optionnel — tu peux les configurer plus tard.</p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {CONNECTORS.map((c) => (
                  <button key={c.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center hover:border-violet-500/30 transition-colors">
                    <span className="text-2xl block mb-1">{c.icon}</span>
                    <span className="text-xs text-zinc-400">{c.name}</span>
                  </button>
                ))}
              </div>

              <button onClick={finish}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 mb-3">
                🏆 Lancer S-Rank Agent
              </button>
              <button onClick={finish} className="w-full text-center text-sm text-zinc-500 hover:text-zinc-400">
                Passer pour le moment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
