"use client";

import { useState, useEffect } from "react";
import { Search, Download, Star, Check, Sparkles } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  isOfficial: boolean;
  installs: number;
  rating: number;
  installed?: boolean;
}

const SKILLS: Skill[] = [
  // ═══════ 🏆 FLAGSHIP SKILLS ═══════
  { id: "11", name: "Fullstack SaaS Builder", description: "Crée une app SaaS complète en une conversation. Next.js, auth, DB, Stripe, déploiement Vercel. De l'idée au MVP en live.", category: "Development", author: "S-Rank", isOfficial: true, installs: 4820, rating: 50 },
  { id: "50", name: "Self-Improving Agent", description: "L'agent analyse ses erreurs, optimise ses prompts et améliore ses performances automatiquement à chaque interaction.", category: "AI/ML", author: "S-Rank", isOfficial: true, installs: 5200, rating: 50 },
  { id: "51", name: "Proactive Agent", description: "L'agent anticipe tes besoins. Il surveille, détecte des patterns et propose des actions avant que tu ne les demandes.", category: "AI/ML", author: "S-Rank", isOfficial: true, installs: 3800, rating: 49 },

  // ═══════ 🌐 WEB & BROWSER ═══════
  { id: "1", name: "Web Scraper Pro", description: "Extraire des données de n'importe quel site web. Tables, texte, images, liens. Anti-détection, pagination auto, export CSV/JSON.", category: "Web", author: "S-Rank", isOfficial: true, installs: 3540, rating: 48 },
  { id: "52", name: "Agent Browser", description: "L'agent navigue le web comme un humain. Remplir des formulaires, cliquer, capturer des screenshots, extraire du contenu.", category: "Web", author: "S-Rank", isOfficial: true, installs: 4100, rating: 49 },
  { id: "53", name: "Web Search", description: "Recherche web en temps réel via Google, Bing ou DuckDuckGo. Résultats filtrés, résumés, avec sources citées.", category: "Web", author: "S-Rank", isOfficial: true, installs: 3200, rating: 48 },
  { id: "54", name: "Website Monitor", description: "Surveille des pages web. Alerte quand un prix change, un produit revient en stock, ou un contenu est modifié.", category: "Web", author: "S-Rank", isOfficial: true, installs: 1890, rating: 46 },

  // ═══════ 📊 DATA & ANALYTICS ═══════
  { id: "2", name: "Data Analyst", description: "Analyser CSV, Excel, SQL. Graphiques, stats, rapports automatiques. Pandas, Matplotlib, export PDF.", category: "Data", author: "S-Rank", isOfficial: true, installs: 2890, rating: 48 },
  { id: "16", name: "Neon PostgreSQL", description: "Base de données serverless. Schema, migrations Drizzle ORM, branching DB, requêtes optimisées.", category: "Data", author: "S-Rank", isOfficial: true, installs: 1560, rating: 46 },
  { id: "17", name: "Upstash Redis", description: "Cache, sessions, rate limiting, queues. Redis serverless en 1 commande.", category: "Data", author: "S-Rank", isOfficial: true, installs: 1200, rating: 45 },
  { id: "55", name: "Summarizer", description: "Résume n'importe quel contenu : articles, PDFs, vidéos YouTube, threads Twitter, pages web. Résumés structurés.", category: "Data", author: "S-Rank", isOfficial: true, installs: 3600, rating: 48 },
  { id: "56", name: "JSON/CSV Transformer", description: "Convertir, transformer, fusionner des fichiers de données. JSON ↔ CSV ↔ Excel ↔ SQL. Nettoyage automatique.", category: "Data", author: "S-Rank", isOfficial: true, installs: 1400, rating: 45 },

  // ═══════ 💻 DEVELOPMENT ═══════
  { id: "5", name: "API Builder", description: "APIs REST et GraphQL. Documentation auto, tests, déploiement. OpenAPI spec généré.", category: "Development", author: "S-Rank", isOfficial: true, installs: 1820, rating: 47 },
  { id: "19", name: "GitHub Automator", description: "Repos, branches, PRs, issues, Actions. Automatise tout ton workflow Git. Code review IA.", category: "Development", author: "S-Rank", isOfficial: true, installs: 2650, rating: 48 },
  { id: "57", name: "Code Reviewer", description: "Analyse ton code, détecte les bugs, propose des optimisations. Supporte 15+ langages. Revue de sécurité incluse.", category: "Development", author: "S-Rank", isOfficial: true, installs: 2100, rating: 47 },
  { id: "58", name: "Test Generator", description: "Génère des tests unitaires, d'intégration et E2E automatiquement à partir de ton code. Jest, Pytest, Playwright.", category: "Development", author: "S-Rank", isOfficial: true, installs: 1750, rating: 46 },
  { id: "59", name: "Documentation Generator", description: "Génère une documentation technique complète depuis le code. README, API docs, guides, diagrammes.", category: "Development", author: "S-Rank", isOfficial: true, installs: 1350, rating: 45 },

  // ═══════ 🚀 DEVOPS & DEPLOY ═══════
  { id: "3", name: "DevOps Auto", description: "CI/CD, Docker, Kubernetes. Déploiement automatisé. GitHub Actions, monitoring, alertes.", category: "DevOps", author: "S-Rank", isOfficial: true, installs: 1960, rating: 47 },
  { id: "14", name: "Vercel Deployer", description: "Déploiement auto sur Vercel. Preview deploys, domaine custom, variables d'environnement.", category: "DevOps", author: "S-Rank", isOfficial: true, installs: 1780, rating: 47 },
  { id: "15", name: "Hetzner Cloud Manager", description: "Provisionner des VPS, Docker, firewalls, SSH. Infra cloud complète via API.", category: "DevOps", author: "S-Rank", isOfficial: true, installs: 1340, rating: 46 },
  { id: "60", name: "Docker Compose Builder", description: "Génère des docker-compose.yml complexes. Multi-services, volumes, networks, healthchecks. Deploy en 1 commande.", category: "DevOps", author: "S-Rank", isOfficial: true, installs: 1450, rating: 46 },
  { id: "61", name: "SSL & Domain Manager", description: "Certificats SSL Let's Encrypt, gestion DNS, domaine custom. HTTPS automatique.", category: "DevOps", author: "S-Rank", isOfficial: true, installs: 980, rating: 44 },

  // ═══════ ✍️ CONTENT & MARKETING ═══════
  { id: "4", name: "Content Writer", description: "Articles, emails, posts sociaux, landing pages. SEO optimisé. Ton de voix personnalisable.", category: "Content", author: "S-Rank", isOfficial: true, installs: 3900, rating: 49 },
  { id: "6", name: "SEO Optimizer", description: "Audit SEO complet, mots-clés, meta tags, sitemap, Core Web Vitals, analyse concurrentielle.", category: "Marketing", author: "S-Rank", isOfficial: true, installs: 1580, rating: 46 },
  { id: "62", name: "Humanize AI Text", description: "Réécrire du texte IA pour qu'il semble écrit par un humain. Anti-détection GPTZero, Turnitin, Originality.", category: "Content", author: "S-Rank", isOfficial: true, installs: 3100, rating: 48 },
  { id: "63", name: "Social Media Manager", description: "Planifier et publier sur Twitter/X, LinkedIn, Instagram. Hashtags, analytics, calendrier éditorial.", category: "Marketing", author: "S-Rank", isOfficial: true, installs: 1650, rating: 46 },
  { id: "64", name: "Email Campaign Builder", description: "Templates email, séquences automatisées, A/B testing, suivi ouvertures/clics. SendGrid, Mailchimp, Resend.", category: "Marketing", author: "S-Rank", isOfficial: true, installs: 1250, rating: 45 },

  // ═══════ 🔌 APIS & INTEGRATIONS ═══════
  { id: "12", name: "Stripe Integration", description: "Paiements, abonnements, checkout, webhooks, customer portal. Setup Stripe complet en 5 minutes.", category: "APIs", author: "S-Rank", isOfficial: true, installs: 2100, rating: 48 },
  { id: "13", name: "Clerk Auth Setup", description: "Authentification OAuth (Google, GitHub), JWT, webhooks, middleware. Prêt en 2 minutes.", category: "APIs", author: "S-Rank", isOfficial: true, installs: 1950, rating: 47 },
  { id: "18", name: "Telegram Bot", description: "Bot Telegram complet. Commandes, menus inline, notifications, webhooks, paiements.", category: "APIs", author: "S-Rank", isOfficial: true, installs: 1290, rating: 46 },
  { id: "20", name: "Twilio SMS/Voice", description: "Envoi de SMS, appels vocaux, vérification 2FA. Intégration Twilio complète.", category: "APIs", author: "S-Rank", isOfficial: true, installs: 920, rating: 44 },
  { id: "65", name: "WhatsApp Business", description: "Envoyer/recevoir des messages WhatsApp Business API. Templates, médias, chatbot automatisé.", category: "APIs", author: "S-Rank", isOfficial: true, installs: 1780, rating: 47 },
  { id: "66", name: "Google Workspace", description: "Gmail, Calendar, Docs, Sheets, Drive. Lire, écrire, organiser. Automatisation complète Google.", category: "APIs", author: "S-Rank", isOfficial: true, installs: 2800, rating: 49 },

  // ═══════ 🛠️ TOOLS & PRODUCTIVITY ═══════
  { id: "7", name: "PDF Generator", description: "Rapports PDF, factures, certificats, contrats à partir de données. Templates personnalisables.", category: "Tools", author: "S-Rank", isOfficial: true, installs: 1500, rating: 46 },
  { id: "67", name: "File Converter", description: "Convertir entre formats : PDF↔DOCX, PNG↔SVG, MP4↔MP3, XLSX↔CSV. 50+ formats supportés.", category: "Tools", author: "S-Rank", isOfficial: true, installs: 1350, rating: 45 },
  { id: "68", name: "Image Generator", description: "Générer des images IA via DALL-E, Stable Diffusion, Midjourney API. Logos, illustrations, mockups.", category: "AI/ML", author: "S-Rank", isOfficial: true, installs: 2200, rating: 47 },
  { id: "69", name: "Voice & Audio", description: "Text-to-Speech, Speech-to-Text, transcription audio/vidéo. Whisper, ElevenLabs, Google TTS.", category: "AI/ML", author: "S-Rank", isOfficial: true, installs: 1100, rating: 45 },
  { id: "70", name: "Calendar Manager", description: "Gérer Google Calendar, CalDAV. Créer, modifier, supprimer des événements. Rappels automatiques.", category: "Tools", author: "S-Rank", isOfficial: true, installs: 1650, rating: 46 },
  { id: "71", name: "Obsidian Sync", description: "Lire, écrire, organiser des notes Obsidian. Backlinks, tags, recherche full-text. Second brain piloté par IA.", category: "Tools", author: "S-Rank", isOfficial: true, installs: 1450, rating: 46 },

  // ═══════ 🌍 COMMUNITY SKILLS ═══════
  { id: "8", name: "Email Automator", description: "Templates email, envoi en masse, suivi des ouvertures. SMTP personnalisé.", category: "Marketing", author: "Community", isOfficial: false, installs: 840, rating: 43 },
  { id: "9", name: "Git Workflow", description: "Branches, merge, conflict resolution, changelog auto, semantic versioning.", category: "Development", author: "Community", isOfficial: false, installs: 960, rating: 44 },
  { id: "10", name: "Database Manager", description: "Migrations, backups, queries optimisées, monitoring. Multi-DB (Postgres, MySQL, SQLite).", category: "Data", author: "Community", isOfficial: false, installs: 720, rating: 42 },
  { id: "21", name: "Google Sheets Sync", description: "Lire, écrire, synchroniser des Google Sheets. Rapports automatisés, formules.", category: "Data", author: "Community", isOfficial: false, installs: 680, rating: 41 },
  { id: "22", name: "Discord Bot", description: "Bot Discord complet. Commandes slash, modération, webhooks, embeds, rôles.", category: "APIs", author: "Community", isOfficial: false, installs: 850, rating: 43 },
  { id: "23", name: "Notion Connector", description: "Pages, databases, templates Notion. Sync bidirectionnel, automatisation workflow.", category: "Tools", author: "Community", isOfficial: false, installs: 590, rating: 41 },
  { id: "24", name: "AWS S3 Manager", description: "Upload, download, buckets, permissions S3. CLI intégré, CDN CloudFront.", category: "DevOps", author: "Community", isOfficial: false, installs: 710, rating: 42 },
  { id: "25", name: "OpenAI Proxy", description: "Utiliser GPT-4o en parallèle de Claude pour comparaison de réponses. Multi-modèle.", category: "AI/ML", author: "Community", isOfficial: false, installs: 520, rating: 40 },
  { id: "72", name: "Competitor Tracker", description: "Surveiller les sites de tes concurrents. Prix, features, SEO, réseaux sociaux. Rapports hebdo.", category: "Marketing", author: "Community", isOfficial: false, installs: 630, rating: 42 },
  { id: "73", name: "Invoice Generator", description: "Créer des factures professionnelles, devis, bons de commande. Export PDF, envoi email auto.", category: "Tools", author: "Community", isOfficial: false, installs: 780, rating: 43 },
  { id: "74", name: "Cron Scheduler", description: "Planifier des tâches récurrentes. Daily reports, backups, scraping, notifications. Crontab visuel.", category: "Tools", author: "Community", isOfficial: false, installs: 550, rating: 41 },
  { id: "75", name: "YouTube Analyzer", description: "Extraire et analyser les données YouTube. Transcriptions, stats, tendances, résumés.", category: "Data", author: "Community", isOfficial: false, installs: 470, rating: 40 },
  { id: "76", name: "Figma to Code", description: "Convertir des designs Figma en code React/HTML. Pixel-perfect, responsive, TailwindCSS.", category: "Development", author: "Community", isOfficial: false, installs: 890, rating: 44 },
  { id: "77", name: "WordPress Manager", description: "Gérer un site WordPress. Posts, pages, plugins, thèmes, WooCommerce. API REST.", category: "Web", author: "Community", isOfficial: false, installs: 650, rating: 42 },
  { id: "78", name: "Airtable Connector", description: "CRUD Airtable. Bases, tables, vues, filtres. Automatisation workflow.", category: "Data", author: "Community", isOfficial: false, installs: 420, rating: 39 },
  { id: "79", name: "Linear Tracker", description: "Gestion de projet Linear. Issues, cycles, projets. Sync avec GitHub PRs.", category: "Tools", author: "Community", isOfficial: false, installs: 510, rating: 41 },
  { id: "80", name: "Supabase Setup", description: "Backend-as-a-Service complet. Auth, DB PostgreSQL, Storage, Edge Functions, Realtime.", category: "Development", author: "Community", isOfficial: false, installs: 750, rating: 43 },

  // ═══════ 🔥 INSPIRED BY CLAWHUB TOP SKILLS ═══════
  { id: "81", name: "Capability Evolver", description: "L'agent évolue automatiquement. Il crée, modifie et optimise ses propres skills en fonction de tes besoins.", category: "AI/ML", author: "S-Rank", isOfficial: true, installs: 5800, rating: 50 },
  { id: "82", name: "AgentMail", description: "Boîte mail dédiée à l'agent. Envoyer, recevoir, lire, répondre aux emails. Support tickets, notifications auto.", category: "APIs", author: "S-Rank", isOfficial: true, installs: 3200, rating: 49 },
  { id: "83", name: "Local File System", description: "Accès sécurisé au filesystem du serveur. Lire, écrire, éditer configs, analyser logs, gérer permissions.", category: "Tools", author: "S-Rank", isOfficial: true, installs: 4500, rating: 49 },
  { id: "84", name: "Skill Vetter", description: "Analyse de sécurité des skills communautaires avant installation. Détection malware, injections, fuites de données.", category: "Security", author: "S-Rank", isOfficial: true, installs: 3500, rating: 49 },
  { id: "85", name: "Memory Manager", description: "Mémoire persistante avancée. SOUL.md, contexte cross-session, préférences apprises, historique de décisions.", category: "AI/ML", author: "S-Rank", isOfficial: true, installs: 4200, rating: 49 },
  { id: "86", name: "E-Commerce Builder", description: "Créer une boutique complète. Catalogue, panier, checkout Stripe, gestion stock, emails transactionnels.", category: "Development", author: "S-Rank", isOfficial: true, installs: 2400, rating: 48 },
  { id: "87", name: "Legal Doc Generator", description: "CGV, CGU, politique de confidentialité, contrats, NDA. Conforme RGPD. Adapté à ton activité.", category: "Tools", author: "S-Rank", isOfficial: true, installs: 1900, rating: 47 },
  { id: "88", name: "Finance Tracker", description: "Suivi revenus/dépenses, factures, TVA, prévisions. Dashboard financier. Export comptable.", category: "Tools", author: "S-Rank", isOfficial: true, installs: 1600, rating: 46 },
  { id: "89", name: "RAG Pipeline", description: "Retrieval-Augmented Generation. Indexer des docs, PDFs, sites web et poser des questions dessus.", category: "AI/ML", author: "S-Rank", isOfficial: true, installs: 3100, rating: 48 },
  { id: "90", name: "Multi-Agent Orchestrator", description: "Coordonner plusieurs agents en parallèle. Diviser un projet en sous-tâches, merger les résultats.", category: "AI/ML", author: "S-Rank", isOfficial: true, installs: 2600, rating: 48 },
  { id: "91", name: "API Rate Limiter", description: "Gérer les rate limits de toutes tes APIs. Queue intelligente, retry, backoff exponentiel, monitoring.", category: "Development", author: "Community", isOfficial: false, installs: 680, rating: 42 },
  { id: "92", name: "Webhook Manager", description: "Créer, tester, debugger des webhooks. Tunnel ngrok, logs, replay, mock server.", category: "Development", author: "Community", isOfficial: false, installs: 720, rating: 43 },
  { id: "93", name: "Translation Agent", description: "Traduction de qualité humaine. 50+ langues. Contexte préservé, terminologie cohérente, batch processing.", category: "Content", author: "Community", isOfficial: false, installs: 890, rating: 44 },
  { id: "94", name: "Crypto Tracker", description: "Prix crypto en temps réel, alertes, portfolio tracker, DeFi analytics. CoinGecko + DexScreener.", category: "Data", author: "Community", isOfficial: false, installs: 560, rating: 41 },
  { id: "95", name: "Prompt Engineer", description: "Optimiser tes prompts. A/B testing, scoring, templates, bibliothèque de prompts. Pour Claude, GPT, etc.", category: "AI/ML", author: "Community", isOfficial: false, installs: 940, rating: 44 },
];

export default function SkillsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [skills, setSkills] = useState(SKILLS);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("s-rank-installed-skills");
    if (stored) {
      const ids = JSON.parse(stored) as string[];
      setSkills((prev) => prev.map((s) => ({ ...s, installed: ids.includes(s.id) })));
    }
  }, []);

  const installSkill = async (id: string) => {
    setInstalling(id);
    await new Promise((r) => setTimeout(r, 1200));
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, installed: true } : s));
    const installedSkills = skills.filter((s) => s.installed || s.id === id);
    localStorage.setItem("s-rank-installed-skills", JSON.stringify(installedSkills.map((s) => s.name)));
    // Proactive event → chat
    const skillName = skills.find(s => s.id === id)?.name || "Skill";
    localStorage.setItem("s-rank-pending-event", JSON.stringify({
      type: "skill_installed",
      message: `🧩 **${skillName}** installé. Je maîtrise maintenant ce domaine — dis-moi si tu veux l'utiliser.`,
      importance: "high",
    }));
    setInstalling(null);
  };

  const uninstallSkill = (id: string) => {
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, installed: false } : s));
    const installedSkills = skills.filter((s) => s.installed && s.id !== id);
    localStorage.setItem("s-rank-installed-skills", JSON.stringify(installedSkills.map((s) => s.name)));
  };

  const categories = ["all", ...new Set(SKILLS.map((s) => s.category))];
  const filtered = skills
    .filter((s) => category === "all" || s.category === category)
    .filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-white">Skills Marketplace</h1>
          <p className="text-xs text-zinc-500 mt-1">{skills.filter((s) => s.installed).length} installés · {SKILLS.length} disponibles</p>
        </div>

        {/* Search + Filters */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un skill..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                category === cat ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}>
              {cat === "all" ? "Tous" : cat}
            </button>
          ))}
        </div>

        {/* Skills grid */}
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((skill) => (
            <div key={skill.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{skill.name}</span>
                    {skill.isOfficial && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-violet-600/20 text-violet-400 rounded-full">
                        <Sparkles size={10} /> Officiel
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600">{skill.author}</span>
                </div>
                <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">{skill.category}</span>
              </div>

              <p className="text-xs text-zinc-400 flex-1 mb-3">{skill.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-0.5"><Download size={10} /> {skill.installs.toLocaleString()}</span>
                  <span className="flex items-center gap-0.5"><Star size={10} /> {(skill.rating / 10).toFixed(1)}</span>
                </div>

                {skill.installed ? (
                  <button onClick={() => uninstallSkill(skill.id)}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-emerald-600/10 text-emerald-400 rounded-lg hover:bg-red-600/10 hover:text-red-400 transition-colors">
                    <Check size={12} /> Installé
                  </button>
                ) : (
                  <button onClick={() => installSkill(skill.id)} disabled={installing === skill.id}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50">
                    {installing === skill.id ? "Installation..." : "Installer"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
