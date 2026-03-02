"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { Shield, Zap, Rocket, CreditCard } from "lucide-react";

// Pages that don't need a subscription
const FREE_PAGES = ["/settings/billing", "/settings", "/agent"];

export function PaywallGate({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    // Free pages always accessible
    if (FREE_PAGES.some(p => pathname.startsWith(p))) {
      setHasAccess(true);
      return;
    }

    // Check if user has an active plan
    const plan = localStorage.getItem("s-rank-plan");
    const hasApiKey = !!localStorage.getItem("s-rank-api-key");

    // Need both: a plan AND an API key to access features
    if (plan && plan !== "none") {
      setHasAccess(true);
    } else {
      setHasAccess(false);
    }
  }, [isLoaded, pathname]);

  // Still loading
  if (hasAccess === null) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Has access → show content
  if (hasAccess) return <>{children}</>;

  // No access → paywall
  return (
    <div className="h-full flex items-center justify-center bg-zinc-950 p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
          <Shield size={32} className="text-white" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Choisis ton plan pour commencer
        </h1>
        <p className="text-sm text-zinc-400 mb-8">
          S-Rank Agent nécessite un abonnement actif pour accéder au chat, au terminal, aux fichiers et aux connecteurs.
        </p>

        {/* Quick plan cards */}
        <div className="space-y-3 mb-6">
          <button onClick={() => { localStorage.setItem("s-rank-plan", "starter"); setHasAccess(true); }}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-violet-500/50 transition-colors text-left">
            <Zap size={20} className="text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Starter — 15€/mois</p>
              <p className="text-[11px] text-zinc-500">1 vCPU · 1Go RAM · 3 connecteurs</p>
            </div>
          </button>

          <button onClick={() => { localStorage.setItem("s-rank-plan", "pro"); setHasAccess(true); }}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-violet-500 bg-violet-600/10 hover:bg-violet-600/20 transition-colors text-left relative">
            <Rocket size={20} className="text-violet-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Pro — 39€/mois <span className="text-[10px] text-violet-400 ml-1">POPULAIRE</span></p>
              <p className="text-[11px] text-zinc-400">2 vCPU · 4Go RAM · 10 connecteurs · Always-on</p>
            </div>
          </button>

          <button onClick={() => { localStorage.setItem("s-rank-plan", "business"); setHasAccess(true); }}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-violet-500/50 transition-colors text-left">
            <CreditCard size={20} className="text-cyan-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Business — 79€/mois</p>
              <p className="text-[11px] text-zinc-500">4 vCPU · 8Go RAM · Illimité · 24/7</p>
            </div>
          </button>
        </div>

        <p className="text-[10px] text-zinc-600">
          Tu peux gérer ton abonnement dans Paramètres → Abonnement
        </p>
      </div>
    </div>
  );
}
