import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Hero */}
      <div className="text-center max-w-3xl">
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-srank-primary/10 border border-srank-primary/20">
          <span className="text-srank-primary text-sm font-medium">Beta — Early Access</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-srank-primary via-srank-cyan to-srank-green bg-clip-text text-transparent">
          S-Rank Agent
        </h1>

        <p className="text-xl md:text-2xl text-srank-text-secondary mb-4">
          Ton PC cloud piloté par l&apos;IA.
        </p>
        <p className="text-lg text-srank-text-muted mb-10">
          Demande, il exécute. Code, fichiers, déploiement, connecteurs — un agent autonome propulsé par Claude.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-3 bg-srank-primary hover:bg-srank-primary-600 text-white font-semibold rounded-lg transition-colors"
          >
            Commencer gratuitement
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-srank-surface hover:bg-srank-hover border border-srank-border text-srank-text-primary font-semibold rounded-lg transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-5xl w-full">
        {[
          { icon: "💬", title: "Chat + Code", desc: "Parle à Claude, il exécute du code sur ton serveur en temps réel" },
          { icon: "📁", title: "PC Cloud", desc: "Explorateur de fichiers visuel avec organisation automatique par l'IA" },
          { icon: "🔌", title: "Connecteurs MCP", desc: "GitHub, Slack, Google Drive, bases de données — en 1 clic" },
          { icon: "🧩", title: "Skills", desc: "Marketplace de skills pour spécialiser ton agent" },
          { icon: "🎚️", title: "Slider de Confiance", desc: "Contrôle l'autonomie de ton agent, de supervisé à full auto" },
          { icon: "📊", title: "Monitoring", desc: "Suis tes coûts, logs, et ressources serveur en temps réel" },
        ].map((f) => (
          <div key={f.title} className="p-6 rounded-xl bg-srank-surface border border-srank-border hover:border-srank-primary/30 transition-colors">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
            <p className="text-srank-text-muted text-sm">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
