"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";

const FREE_PATHS = ["/settings/billing", "/settings", "/agent"];

const PLANS = [
  {
    name: "Starter",
    price: "15",
    features: ["1 vCPU, 1 Go RAM", "10 Go stockage", "3 connecteurs", "Skills officiels"],
  },
  {
    name: "Pro",
    price: "39",
    popular: true,
    features: ["2 vCPU, 4 Go RAM", "50 Go stockage", "10 connecteurs", "Skills communautaires", "Always-on 8h/j"],
  },
  {
    name: "Business",
    price: "79",
    features: ["4 vCPU, 8 Go RAM", "100 Go stockage", "Connecteurs illimités", "Tous les skills", "Always-on 24/7"],
  },
];

export function PaywallGate({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    setPlan(localStorage.getItem("s-rank-plan"));
    setLoading(false);
  }, []);

  if (loading) return null;
  if (plan) return <>{children}</>;
  if (FREE_PATHS.some(p => pathname.startsWith(p))) return <>{children}</>;

  const select = (name: string) => {
    localStorage.setItem("s-rank-plan", name);
    setPlan(name);
  };

  return (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a] p-6">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-white mb-2">Choisis ton plan</h1>
          <p className="text-sm text-zinc-500">Commence à utiliser ton agent IA</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <div key={p.name} className={`relative rounded-2xl p-6 transition-all duration-200 cursor-pointer hover:scale-[1.02]
              ${p.popular ? "bg-white text-black ring-2 ring-white" : "bg-[#141414] text-white border border-white/5 hover:border-white/10"}`}
              onClick={() => select(p.name)}>
              
              {p.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-medium px-3 py-1 rounded-full">
                  Populaire
                </span>
              )}

              <p className={`text-sm font-medium mb-1 ${p.popular ? "text-zinc-600" : "text-zinc-400"}`}>{p.name}</p>
              <p className="text-3xl font-semibold mb-5">
                {p.price}€<span className={`text-sm font-normal ${p.popular ? "text-zinc-500" : "text-zinc-600"}`}>/mois</span>
              </p>

              <div className="space-y-2.5 mb-6">
                {p.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check size={14} className={p.popular ? "text-black" : "text-zinc-500"} />
                    <span className={`text-sm ${p.popular ? "text-zinc-700" : "text-zinc-400"}`}>{f}</span>
                  </div>
                ))}
              </div>

              <button className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                p.popular
                  ? "bg-black text-white hover:bg-zinc-800"
                  : "bg-white/10 text-white hover:bg-white/15"
              }`}>
                Choisir
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
