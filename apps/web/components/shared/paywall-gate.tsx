"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Zap, Rocket, Building2 } from "lucide-react";

const FREE_PAGES = ["/settings/billing", "/settings", "/agent"];

export function PaywallGate({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useUser();
  const pathname = usePathname();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (FREE_PAGES.some(p => pathname.startsWith(p))) { setHasAccess(true); return; }
    const plan = localStorage.getItem("s-rank-plan");
    setHasAccess(!!plan && plan !== "none");
  }, [isLoaded, pathname]);

  if (hasAccess === null) return (
    <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  if (hasAccess) return <>{children}</>;

  return (
    <div className="h-full flex items-center justify-center bg-[#0a0a0a] p-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-white flex items-center justify-center">
          <span className="text-2xl font-black text-black">S</span>
        </div>

        <h1 className="text-xl font-semibold text-white mb-1.5">Choisis ton plan</h1>
        <p className="text-sm text-zinc-500 mb-8">Un abonnement est requis pour accéder à S-Rank Agent.</p>

        <div className="space-y-2.5">
          {[
            { id: "starter", icon: Zap, name: "Starter", price: "15€", desc: "1 vCPU · 1Go RAM · 3 connecteurs" },
            { id: "pro", icon: Rocket, name: "Pro", price: "39€", desc: "2 vCPU · 4Go RAM · Always-on", popular: true },
            { id: "business", icon: Building2, name: "Business", price: "79€", desc: "4 vCPU · 8Go RAM · Illimité" },
          ].map(plan => (
            <button key={plan.id} onClick={() => { localStorage.setItem("s-rank-plan", plan.id); setHasAccess(true); }}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all duration-200 ${
                plan.popular
                  ? "bg-white text-black hover:bg-zinc-100"
                  : "bg-white/5 text-white hover:bg-white/10 border border-white/5"
              }`}>
              <plan.icon size={18} className={plan.popular ? "text-black" : "text-zinc-400"} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{plan.name} — {plan.price}/mois</p>
                <p className={`text-xs ${plan.popular ? "text-black/60" : "text-zinc-500"}`}>{plan.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
