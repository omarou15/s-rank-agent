"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Check, ExternalLink, Zap, CheckCircle, XCircle } from "lucide-react";

const PLANS = [
  {
    id: "starter", name: "Starter", price: 15,
    features: ["1 vCPU, 1Go RAM, 10Go SSD", "On-demand uniquement", "3 connecteurs MCP", "Skills officiels", "7 jours d'historique", "Support communauté"],
  },
  {
    id: "pro", name: "Pro", price: 39, popular: true,
    features: ["2 vCPU, 4Go RAM, 50Go SSD", "Always-on (8h/j)", "10 connecteurs MCP", "Skills officiels + communautaires", "30 jours d'historique", "Email prioritaire"],
  },
  {
    id: "business", name: "Business", price: 79,
    features: ["4 vCPU, 8Go RAM, 100Go SSD", "Always-on 24/7", "Connecteurs illimités", "Tous les skills + custom", "Historique illimité", "Chat dédié"],
  },
];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState("starter");
  const [loading, setLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("s-rank-plan");
    if (stored) setCurrentPlan(stored);

    if (searchParams.get("success") === "true") {
      const plan = searchParams.get("plan") || "pro";
      setCurrentPlan(plan);
      localStorage.setItem("s-rank-plan", plan);
      setSuccessMsg(`Abonnement ${plan} activé ! Merci.`);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
    if (searchParams.get("canceled") === "true") {
      setErrorMsg("Paiement annulé.");
      setTimeout(() => setErrorMsg(""), 5000);
    }
  }, [searchParams]);

  const subscribe = async (planId: string) => {
    setLoading(planId);
    setErrorMsg("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg(data.error || "Erreur lors de la création du checkout");
        setLoading(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setLoading(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard size={18} className="text-violet-400" />
          <h1 className="text-lg font-semibold text-white">Abonnement</h1>
        </div>
        <p className="text-xs text-zinc-500 mb-6">
          Plan actuel : <span className="text-violet-400 font-semibold capitalize">{currentPlan}</span>
          {" · "}Coûts API Claude facturés séparément (BYOK)
        </p>

        {successMsg && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-600/10 border border-emerald-800/30 rounded-xl">
            <CheckCircle size={16} className="text-emerald-400" />
            <span className="text-sm text-emerald-400">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-600/10 border border-red-800/30 rounded-xl">
            <XCircle size={16} className="text-red-400" />
            <span className="text-sm text-red-400">{errorMsg}</span>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <div key={plan.id} className={`rounded-2xl p-5 border flex flex-col ${
                plan.popular ? "bg-violet-600/5 border-violet-500" : "bg-zinc-900 border-zinc-800"
              }`}>
                {plan.popular && (
                  <div className="flex items-center gap-1 text-xs font-bold text-violet-400 mb-2">
                    <Zap size={12} /> Populaire
                  </div>
                )}
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <div className="flex items-baseline gap-1 my-3">
                  <span className="text-3xl font-bold text-white">{plan.price}€</span>
                  <span className="text-zinc-500 text-sm">/mois</span>
                </div>
                <ul className="space-y-2 flex-1 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                      <Check size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="py-2.5 text-center text-sm font-medium text-emerald-400 bg-emerald-600/10 rounded-xl border border-emerald-800/30">
                    Plan actuel
                  </div>
                ) : (
                  <button onClick={() => subscribe(plan.id)} disabled={loading === plan.id}
                    className={`py-2.5 text-center text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${
                      plan.popular ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-white"
                    }`}>
                    {loading === plan.id ? "Redirection vers Stripe..." : "Souscrire"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Facturation</h2>
          <p className="text-xs text-zinc-400 mb-3">Paiement sécurisé par Stripe. Tu peux modifier ou annuler à tout moment.</p>
          <div className="flex items-center gap-4">
            <a href="https://dashboard.stripe.com/test/subscriptions" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
              <ExternalLink size={12} /> Dashboard Stripe
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
