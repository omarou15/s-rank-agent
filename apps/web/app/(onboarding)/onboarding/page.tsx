"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SERVER_PLANS } from "@/lib/shared";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [apiKey, setApiKey] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const router = useRouter();

  const plans = Object.entries(SERVER_PLANS) as [string, typeof SERVER_PLANS[keyof typeof SERVER_PLANS]][];

  return (
    <div className="min-h-screen bg-srank-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? "bg-srank-primary text-white" : "bg-srank-card text-srank-text-muted border border-srank-border"
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-srank-primary" : "bg-srank-border"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-srank-surface border border-srank-border rounded-2xl p-8">
          {/* Step 1: API Key */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold mb-2">Clé API Claude</h2>
              <p className="text-sm text-srank-text-muted mb-6">
                S-Rank Agent utilise ta propre clé API Anthropic. Tu paies uniquement ce que tu consommes.
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full bg-srank-card border border-srank-border rounded-lg px-4 py-3 text-sm mb-3 focus:outline-none focus:border-srank-primary"
              />
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-srank-primary hover:underline mb-6"
              >
                ℹ️ Comment obtenir ma clé → console.anthropic.com
              </a>
              <button
                onClick={() => setStep(2)}
                disabled={!apiKey.startsWith("sk-ant-")}
                className="w-full py-3 bg-srank-primary text-white font-medium rounded-lg hover:bg-srank-primary-600 disabled:opacity-50 transition-colors"
              >
                Valider et continuer
              </button>
            </>
          )}

          {/* Step 2: Server */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold mb-2">Choisis ton serveur</h2>
              <p className="text-sm text-srank-text-muted mb-6">
                Ton PC cloud personnel. Tu peux changer de plan à tout moment.
              </p>
              <div className="space-y-3 mb-6">
                {plans.map(([key, plan]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      selectedPlan === key
                        ? "border-srank-primary bg-srank-primary/5"
                        : "border-srank-border hover:border-srank-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm capitalize">{key}</span>
                        <p className="text-xs text-srank-text-muted mt-0.5">
                          {plan.vcpus} vCPU · {plan.ramGb} Go RAM · {plan.diskGb} Go SSD
                        </p>
                      </div>
                      <span className="text-lg font-bold text-srank-primary">{plan.priceMonthly}€<span className="text-xs text-srank-text-muted">/mois</span></span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-srank-card border border-srank-border rounded-lg hover:bg-srank-hover">
                  Retour
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-srank-primary text-white font-medium rounded-lg hover:bg-srank-primary-600">
                  Lancer mon serveur
                </button>
              </div>
            </>
          )}

          {/* Step 3: Connectors */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold mb-2">Connecteurs (optionnel)</h2>
              <p className="text-sm text-srank-text-muted mb-6">
                Connecte tes services pour donner des super-pouvoirs à ton agent. Tu pourras aussi le faire plus tard.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {["GitHub", "Slack", "Google Drive", "PostgreSQL", "Stripe", "Vercel"].map((name) => (
                  <button
                    key={name}
                    className="p-3 rounded-lg border border-srank-border text-sm hover:border-srank-primary/30 hover:bg-srank-hover transition-all"
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/chat")}
                  className="flex-1 py-3 bg-srank-card border border-srank-border rounded-lg hover:bg-srank-hover text-sm"
                >
                  Passer pour le moment
                </button>
                <button
                  onClick={() => router.push("/connectors")}
                  className="flex-1 py-3 bg-srank-primary text-white font-medium rounded-lg hover:bg-srank-primary-600 text-sm"
                >
                  Configurer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
