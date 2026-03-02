"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Zap, FolderOpen, Plug, Brain, Mail, Wallet, Terminal, SlidersHorizontal, Puzzle, ChevronRight, Check, Eye, Code2, Rocket } from "lucide-react";

// ── Scroll animation hook ──
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

// ── Animated section wrapper ──
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}>
      {children}
    </div>
  );
}

// ── Data ──
const FEATURES = [
  { icon: Code2, title: "Chat + Exécution", desc: "Demande du code, il s'exécute sur ton serveur. Python, Node, Bash. Résultats inline.", color: "#0A84FF" },
  { icon: FolderOpen, title: "PC Cloud", desc: "Explorateur de fichiers visuel. L'IA organise tout par projet automatiquement.", color: "#30D158" },
  { icon: Plug, title: "Connecteurs MCP", desc: "GitHub, Slack, Google Drive, Stripe, Vercel... activables en 1 clic.", color: "#FF9F0A" },
  { icon: Brain, title: "Mémoire Long-Terme", desc: "L'agent retient tes préférences, projets et contexte entre les sessions.", color: "#BF5AF2" },
  { icon: Eye, title: "Vision & Artifacts", desc: "Analyse d'images, graphiques inline, composants HTML rendus en live.", color: "#FF375F" },
  { icon: Wallet, title: "Wallet Autonome", desc: "Wallet prépayé avec limites. L'agent achète des services cloud pour toi.", color: "#64D2FF" },
  { icon: Terminal, title: "Terminal Live", desc: "Terminal interactif. Décris en français, il exécute la commande.", color: "#30D158" },
  { icon: SlidersHorizontal, title: "Slider de Confiance", desc: "4 niveaux d'autonomie. De supervision totale à full auto.", color: "#FF9F0A" },
  { icon: Puzzle, title: "25+ Skills", desc: "SaaS Builder, Stripe, Vercel, Telegram, Web Scraping... prêts à l'emploi.", color: "#0A84FF" },
];

const USE_CASES = [
  { icon: Rocket, title: "SaaS complet en 1 conversation", desc: "Next.js + Auth + DB + Stripe + Deploy. L'agent fait tout.", tags: ["Next.js", "Stripe", "Vercel"] },
  { icon: Code2, title: "Analyser des données", desc: "Upload CSV, analyse Python, graphiques matplotlib, rapport PDF.", tags: ["Python", "Pandas", "PDF"] },
  { icon: Zap, title: "Automatiser des workflows", desc: "Scraping, comparaison prix, rapport Slack. Programmé en cron.", tags: ["Cron", "Slack", "APIs"] },
];

const PLANS = [
  { name: "Starter", price: "15", features: ["1 vCPU, 1Go RAM", "On-demand", "3 connecteurs", "Skills officiels"], gradient: "linear-gradient(135deg, #30D158, #34C759)" },
  { name: "Pro", price: "39", popular: true, features: ["2 vCPU, 4Go RAM", "Always-on 8h/j", "10 connecteurs", "Skills communautaires"], gradient: "linear-gradient(135deg, #0A84FF, #5E5CE6)" },
  { name: "Business", price: "79", features: ["4 vCPU, 8Go RAM", "Always-on 24/7", "Illimité", "Skills custom"], gradient: "linear-gradient(135deg, #BF5AF2, #AF52DE)" },
];

const STEPS = [
  { n: "1", title: "Connecte ta clé API", desc: "Apporte ta clé Claude (BYOK). Tes tokens, ton budget." },
  { n: "2", title: "Ton serveur se lance", desc: "VPS cloud isolé avec Docker, Python, Node. Prêt en 30s." },
  { n: "3", title: "Demande, il exécute", desc: "L'agent code, déploie, connecte les APIs et gère tout." },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <main className="min-h-screen text-white overflow-x-hidden" style={{ background: "#000" }}>
      {/* ── Ambient background glow ── */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(10,132,255,0.08) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 80% 20%, rgba(94,92,230,0.05) 0%, transparent 50%)",
      }} />

      {/* ── Nav — Glass ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? "rgba(0,0,0,0.6)" : "transparent",
          backdropFilter: scrolled ? "blur(40px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(40px) saturate(180%)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
        }}>
        <div className="flex items-center justify-between px-6 py-3.5 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0A84FF, #5E5CE6)" }}>
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <span className="text-[15px] font-semibold text-white/90">S-Rank Agent</span>
          </Link>
          <div className="flex items-center gap-5">
            <a href="#use-cases" className="text-[13px] text-white/40 hover:text-white/80 transition-colors hidden sm:block">Use Cases</a>
            <a href="#features" className="text-[13px] text-white/40 hover:text-white/80 transition-colors hidden sm:block">Features</a>
            <a href="#pricing" className="text-[13px] text-white/40 hover:text-white/80 transition-colors hidden sm:block">Pricing</a>
            <Link href="/login" className="text-[13px] text-white/40 hover:text-white/80 transition-colors">Login</Link>
            <Link href="/signup" className="px-4 py-2 text-[13px] font-medium text-white rounded-full transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #0A84FF, #5E5CE6)", boxShadow: "0 4px 16px rgba(10,132,255,0.3)" }}>
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative px-6 pt-32 pb-28 text-center max-w-4xl mx-auto">
        <Reveal>
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full"
            style={{ background: "rgba(10,132,255,0.08)", border: "1px solid rgba(10,132,255,0.15)" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#30D158" }} />
            <span className="text-[13px] font-medium text-white/60">Beta — Accès anticipé</span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <h1 className="text-5xl sm:text-7xl font-bold mb-7 leading-[1.1] tracking-tight">
            Ton PC cloud{" "}
            <span className="bg-clip-text text-transparent" style={{
              backgroundImage: "linear-gradient(135deg, #0A84FF 0%, #5E5CE6 40%, #BF5AF2 70%, #FF375F 100%)"
            }}>piloté par l&apos;IA</span>
          </h1>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="text-lg sm:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed">
            Demande, il exécute. Code, fichiers, déploiements, APIs — Claude pilote ton serveur cloud. Zéro config, toute la puissance.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[15px] font-semibold text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #0A84FF, #5E5CE6)", boxShadow: "0 8px 32px rgba(10,132,255,0.3)" }}>
              Commencer gratuitement
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#use-cases" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[15px] font-semibold text-white/70 transition-all hover:scale-105 active:scale-95"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              Voir ce que ça fait
            </a>
          </div>
          <p className="text-xs text-white/20 mt-5">Modèle BYOK — Apporte ta propre clé API Claude</p>
        </Reveal>
      </section>

      {/* ── Demo window ── */}
      <Reveal className="px-6 max-w-4xl mx-auto mb-32">
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(15,15,20,0.6)",
            backdropFilter: "blur(40px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
          }}>
          <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#FEBC2E" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
            <span className="ml-3 text-[11px] text-white/25">S-Rank Agent — Chat</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-br-md px-4 py-3 text-[14px] max-w-sm"
                style={{ background: "linear-gradient(135deg, rgba(10,132,255,0.2), rgba(94,92,230,0.15))", border: "1px solid rgba(10,132,255,0.15)" }}>
                Crée-moi un SaaS de facturation avec auth, dashboard et paiements Stripe. Déploie-le.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0A84FF, #5E5CE6)" }}>
                <span className="text-[10px] font-bold">S</span>
              </div>
              <div className="text-[14px] text-white/70 space-y-3 max-w-md">
                <p>OK, tu veux un SaaS de facturation complet. Je m&apos;en occupe.</p>
                <div className="space-y-1.5">
                  {["Projet Next.js initialisé", "Auth Clerk configurée (Google)", "Base PostgreSQL créée (Neon)", "3 produits Stripe créés", "Déploiement Vercel..."].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]" style={{
                      opacity: 1,
                      animation: `fadeSlideIn 0.5s ease ${i * 0.15}s both`,
                    }}>
                      <Check size={12} style={{ color: i === 4 ? "#0A84FF" : "#30D158" }} />
                      <span className="text-white/50">{s}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl px-3 py-2 mt-2 text-[11px]"
                  style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.15)", color: "rgba(48,209,88,0.8)" }}>
                  ✓ Déployé · facturation-app.vercel.app
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── How it works ── */}
      <section className="px-6 py-24 max-w-4xl mx-auto">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16 text-white/90">Comment ça marche</h2>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-10">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.15}>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: "rgba(10,132,255,0.1)", border: "1px solid rgba(10,132,255,0.15)" }}>
                  <span className="text-xl font-bold" style={{ color: "#0A84FF" }}>{s.n}</span>
                </div>
                <h3 className="font-semibold text-white/85 mb-2 text-lg">{s.title}</h3>
                <p className="text-sm text-white/35 leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section id="use-cases" className="px-6 py-24 max-w-5xl mx-auto">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-white/90">Ce que tu peux faire</h2>
          <p className="text-white/30 text-center mb-16 max-w-xl mx-auto">Pas un chatbot. Un développeur, analyste et DevOps disponible 24/7.</p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {USE_CASES.map((uc, i) => {
            const Icon = uc.icon;
            return (
              <Reveal key={uc.title} delay={i * 0.1}>
                <div className="group rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] cursor-default"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(20px)",
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(10,132,255,0.1)" }}>
                    <Icon size={18} style={{ color: "#0A84FF" }} />
                  </div>
                  <h3 className="font-semibold text-white/85 mb-2 text-[15px]">{uc.title}</h3>
                  <p className="text-[13px] text-white/35 mb-4 leading-relaxed">{uc.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {uc.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-md text-[10px] text-white/25"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}>{t}</span>
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="px-6 py-24 max-w-6xl mx-auto">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-white/90">Tout ce qu&apos;il te faut</h2>
          <p className="text-white/30 text-center mb-16 max-w-xl mx-auto">Un environnement complet piloté par Claude.</p>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={(i % 3) * 0.1}>
                <div className="group rounded-2xl p-5 transition-all duration-300 hover:bg-white/[0.04]"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${f.color}15` }}>
                      <Icon size={16} style={{ color: f.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white/80 mb-1 text-[14px]">{f.title}</h3>
                      <p className="text-[12px] text-white/30 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="px-6 py-24 max-w-4xl mx-auto">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3 text-white/90">Tarifs simples</h2>
          <p className="text-white/30 text-center mb-14">+ ta propre consommation API Claude (BYOK)</p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.12}>
              <div className="rounded-2xl p-6 transition-all duration-300 hover:scale-[1.03]"
                style={{
                  background: plan.popular ? "rgba(10,132,255,0.05)" : "rgba(255,255,255,0.02)",
                  border: plan.popular ? "1px solid rgba(10,132,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: plan.popular ? "0 8px 40px rgba(10,132,255,0.1)" : "none",
                }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: plan.gradient }}>
                    <Zap size={14} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[14px] font-semibold text-white/85 block">{plan.name}</span>
                    {plan.popular && <span className="text-[9px] font-bold" style={{ color: "#0A84FF" }}>POPULAIRE</span>}
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-bold text-white/90">{plan.price}€</span>
                  <span className="text-[13px] text-white/25">/mois</span>
                </div>
                <Link href="/signup" className="block text-center py-2.5 rounded-xl text-[13px] font-semibold mb-5 transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    background: plan.popular ? "linear-gradient(135deg, #0A84FF, #5E5CE6)" : "rgba(255,255,255,0.06)",
                    color: plan.popular ? "white" : "rgba(255,255,255,0.6)",
                    border: plan.popular ? "none" : "1px solid rgba(255,255,255,0.08)",
                  }}>
                  Commencer
                </Link>
                <ul className="space-y-2.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/40">
                      <Check size={13} style={{ color: "#30D158" }} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="px-6 py-28 text-center">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white/90">Prêt à essayer ?</h2>
          <p className="text-white/30 mb-10 max-w-md mx-auto">Crée ton compte en 30 secondes. Pas de carte bancaire.</p>
          <Link href="/signup" className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-[16px] font-semibold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #0A84FF, #5E5CE6)", boxShadow: "0 8px 40px rgba(10,132,255,0.35)" }}>
            Lancer mon agent
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0A84FF, #5E5CE6)" }}>
            <span className="text-[10px] font-bold text-white">S</span>
          </div>
          <span className="text-[13px] font-semibold text-white/50">S-Rank Agent</span>
        </div>
        <p className="text-[11px] text-white/15">© 2026 S-Rank Agent. Ton PC cloud piloté par l&apos;IA.</p>
      </footer>

      {/* ── Global animation keyframes ── */}
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        html { scroll-behavior: smooth; }
      `}</style>
    </main>
  );
}
