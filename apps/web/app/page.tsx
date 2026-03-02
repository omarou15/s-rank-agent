import Link from "next/link";

const FEATURES = [
  { icon: "💬", title: "Chat IA + Exécution", desc: "Demande du code, il s'exécute sur ton serveur. Python, Node.js, Bash." },
  { icon: "📁", title: "PC Cloud", desc: "Explorateur de fichiers visuel. L'IA organise tout automatiquement." },
  { icon: "🔌", title: "Connecteurs MCP", desc: "GitHub, Slack, Google Drive, Stripe, Vercel... en 1 clic." },
  { icon: "🧠", title: "Skills Marketplace", desc: "Web scraping, SEO, DevOps, data analysis. Installe en 1 clic." },
  { icon: "🎚️", title: "Slider de Confiance", desc: "4 niveaux d'autonomie. De supervision totale à full auto." },
  { icon: "📊", title: "Monitoring Live", desc: "CPU, RAM, coûts API, logs d'activité en temps réel." },
];

const PLANS = [
  { name: "Starter", price: "15", features: ["1 vCPU, 1Go RAM, 10Go SSD", "On-demand uniquement", "3 connecteurs MCP", "Skills officiels", "7 jours d'historique"] },
  { name: "Pro", price: "39", popular: true, features: ["2 vCPU, 4Go RAM, 50Go SSD", "Always-on (8h/j)", "10 connecteurs MCP", "Skills officiels + communautaires", "30 jours d'historique", "Support email prioritaire"] },
  { name: "Business", price: "79", features: ["4 vCPU, 8Go RAM, 100Go SSD", "Always-on 24/7", "Connecteurs illimités", "Tous les skills + custom", "Historique illimité", "Chat dédié"] },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <span className="font-bold text-lg">S-Rank Agent</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-sm text-zinc-400 hover:text-white hidden sm:block">Features</a>
          <a href="#pricing" className="text-sm text-zinc-400 hover:text-white hidden sm:block">Pricing</a>
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white">Login</Link>
          <Link href="/signup" className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition-colors">
            Commencer
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24 text-center max-w-4xl mx-auto">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-violet-600/10 border border-violet-500/20">
          <span className="text-violet-400 text-sm font-medium">Beta — Accès anticipé</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold mb-6 leading-tight">
          Ton PC cloud
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            piloté par l&apos;IA
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10">
          Demande, il exécute. Code, fichiers, déploiements, APIs — Claude pilote ton serveur cloud. 
          Zéro config, toute la puissance.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup" className="px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold text-lg transition-colors">
            Commencer gratuitement →
          </Link>
          <a href="#features" className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold text-lg border border-zinc-700 transition-colors">
            Voir les features
          </a>
        </div>
        <p className="text-xs text-zinc-600 mt-4">Modèle BYOK — Apporte ta propre clé API Claude</p>
      </section>

      {/* Demo visual */}
      <section className="px-6 max-w-5xl mx-auto mb-24">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-1 shadow-2xl shadow-violet-500/5">
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
            <span className="ml-2 text-xs text-zinc-600">S-Rank Agent — Chat</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex gap-3 justify-end">
              <div className="bg-violet-600 rounded-xl px-4 py-2 text-sm max-w-md">
                Crée un script Python qui scrape les titres de Hacker News
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 text-xs">🤖</div>
              <div className="bg-zinc-800 rounded-xl px-4 py-3 text-sm max-w-lg">
                <p className="mb-2">Voici le script :</p>
                <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-500">python</span>
                    <span className="text-xs text-emerald-400 bg-emerald-600/20 px-2 py-0.5 rounded">▶ Exécuter</span>
                  </div>
                  <code className="text-emerald-400 text-xs">
                    import requests<br />
                    from bs4 import BeautifulSoup<br />
                    <br />
                    r = requests.get(&quot;https://news.ycombinator.com&quot;)<br />
                    soup = BeautifulSoup(r.text, &quot;html.parser&quot;)<br />
                    titles = soup.select(&quot;.titleline &gt; a&quot;)<br />
                    for t in titles[:5]: print(t.text)
                  </code>
                </div>
                <div className="mt-2 bg-zinc-950 rounded-lg p-2 border border-emerald-800/30">
                  <span className="text-[10px] text-emerald-400">✓ Succès · 245ms</span>
                  <pre className="text-xs text-zinc-300 mt-1">Show HN: I built a...<br />Launch YC W26 batch<br />AI agents are...</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Tout ce qu&apos;il te faut</h2>
        <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">Un environnement complet piloté par Claude. Plus besoin de jongler entre 10 outils.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-violet-500/30 transition-colors">
              <span className="text-3xl mb-3 block">{f.icon}</span>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Pourquoi S-Rank ?</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 text-zinc-500 font-medium">Critère</th>
                <th className="text-center py-3 text-zinc-500 font-medium">Claude MCP</th>
                <th className="text-center py-3 text-zinc-500 font-medium">Kimi Claw</th>
                <th className="text-center py-3 text-violet-400 font-bold">S-Rank Agent</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Intelligence IA", "✅", "❌", "✅"],
                ["Simplicité", "❌", "✅", "✅"],
                ["PC Cloud", "❌", "❌", "✅"],
                ["Connecteurs 1-clic", "❌", "❌", "✅"],
                ["Marketplace Skills", "❌", "❌", "✅"],
              ].map(([label, a, b, c]) => (
                <tr key={label} className="border-b border-zinc-800/50">
                  <td className="py-3 text-zinc-300">{label}</td>
                  <td className="py-3 text-center">{a}</td>
                  <td className="py-3 text-center">{b}</td>
                  <td className="py-3 text-center font-medium">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Tarifs simples</h2>
        <p className="text-zinc-400 text-center mb-12">+ ta propre consommation API Claude (BYOK)</p>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`rounded-2xl p-6 border ${
              plan.popular ? "bg-violet-600/5 border-violet-500 shadow-lg shadow-violet-500/10" : "bg-zinc-900 border-zinc-800"
            }`}>
              {plan.popular && <span className="text-xs font-bold text-violet-400 uppercase mb-2 block">Le plus populaire</span>}
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <div className="flex items-baseline gap-1 my-4">
                <span className="text-4xl font-bold text-white">{plan.price}€</span>
                <span className="text-zinc-500 text-sm">/mois</span>
              </div>
              <Link href="/signup" className={`block text-center py-2.5 rounded-xl text-sm font-semibold mb-6 transition-colors ${
                plan.popular ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              }`}>
                Commencer
              </Link>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-400">
                    <span className="text-emerald-400 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Prêt à essayer ?</h2>
        <p className="text-zinc-400 mb-8 max-w-lg mx-auto">Crée ton compte en 30 secondes. Pas de carte bancaire requise.</p>
        <Link href="/signup" className="inline-block px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold text-lg transition-colors">
          Lancer mon agent →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xl">🏆</span>
          <span className="font-bold">S-Rank Agent</span>
        </div>
        <p className="text-xs text-zinc-600">© 2026 S-Rank Agent. Ton PC cloud piloté par l&apos;IA.</p>
      </footer>
    </main>
  );
}
