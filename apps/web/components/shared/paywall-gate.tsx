"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Zap, Rocket, Building } from "lucide-react";

const FREE_PAGES = ["/settings/billing", "/settings", "/agent"];

export function PaywallGate({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useUser();
  const pathname = usePathname();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (FREE_PAGES.some(p => pathname.startsWith(p))) { setHasAccess(true); return; }
    const plan = localStorage.getItem("s-rank-plan");
    setHasAccess(plan && plan !== "none" ? true : false);
  }, [isLoaded, pathname]);

  if (hasAccess === null) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-5 h-5 border-2 rounded-full animate-spin"
        style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "rgba(10,132,255,0.6)" }} />
    </div>
  );

  if (hasAccess) return <>{children}</>;

  const plans = [
    { id: "starter", name: "Starter", price: "15", icon: Zap, desc: "1 vCPU · 1Go RAM · 3 connecteurs", gradient: "linear-gradient(135deg, #30D158, #34C759)" },
    { id: "pro", name: "Pro", price: "39", icon: Rocket, desc: "2 vCPU · 4Go RAM · Always-on", gradient: "linear-gradient(135deg, #0A84FF, #5E5CE6)", popular: true },
    { id: "business", name: "Business", price: "79", icon: Building, desc: "4 vCPU · 8Go RAM · Illimité", gradient: "linear-gradient(135deg, #BF5AF2, #AF52DE)" },
  ];

  return (
    <div className="h-full flex items-center justify-center p-4" style={{ background: "linear-gradient(180deg, rgba(5,5,15,1) 0%, #000 100%)" }}>
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #0A84FF, #5E5CE6)", boxShadow: "0 8px 32px rgba(10,132,255,0.3)" }}>
          <span className="text-2xl font-bold text-white">S</span>
        </div>
        <h1 className="text-xl font-semibold text-white/90 mb-1.5">Choisis ton plan</h1>
        <p className="text-sm text-white/35 mb-8">Accède à ton agent et toutes les fonctionnalités.</p>

        <div className="space-y-3">
          {plans.map(p => {
            const Icon = p.icon;
            return (
              <button key={p.id} onClick={() => { localStorage.setItem("s-rank-plan", p.id); setHasAccess(true); }}
                className="w-full flex items-center gap-3.5 p-4 rounded-2xl transition-all text-left hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: p.popular ? "rgba(10,132,255,0.06)" : "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(20px)",
                  border: p.popular ? "1px solid rgba(10,132,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: p.popular ? "0 4px 24px rgba(10,132,255,0.1)" : "none",
                }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: p.gradient }}>
                  <Icon size={14} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-white/85">{p.name}</span>
                    {p.popular && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: "#0A84FF", background: "rgba(10,132,255,0.12)" }}>POPULAIRE</span>}
                  </div>
                  <p className="text-[11px] text-white/30 mt-0.5">{p.desc}</p>
                </div>
                <span className="text-sm font-semibold text-white/70">{p.price}€</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
