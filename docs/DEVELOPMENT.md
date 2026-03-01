# 🏆 S-RANK AGENT — Plan de Développement & Déploiement

> **Version** : 1.0  
> **Date** : Mars 2026  
> **Durée MVP** : 6 semaines (42 jours)  
> **Méthode** : Trunk-based development, sprints de 1 semaine  

---

## 📐 Architecture & Choix Techniques

### Stack Retenue

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Monorepo** | Turborepo + pnpm | Build incrémental, cache partagé, un seul `pnpm install` |
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSR, React Server Components, performance |
| **UI** | TailwindCSS + shadcn/ui | Dark mode natif, composants accessibles, customisables |
| **Backend API** | Hono + TypeScript (Node.js) | Ultra léger (14kb), edge-ready, middleware riche |
| **Temps réel** | Socket.io | Chat streaming, terminal live, file watcher |
| **Base de données** | PostgreSQL (Neon serverless) | Branching DB, auto-scaling, $0 au repos |
| **Cache/Queues** | Redis (Upstash) | Sessions, rate limiting, job queues, serverless |
| **Auth** | Clerk | OAuth (Google/GitHub), JWT, webhooks, 10k MAU gratuit |
| **ORM** | Drizzle ORM | Type-safe, léger, migrations SQL natives |
| **Billing** | Stripe | Subscriptions, webhooks, customer portal |
| **Containers Users** | Docker + Hetzner Cloud API | VPS isolés, API programmatique, à partir de 3.29€/mois |
| **Secrets** | Doppler (ou dotenv-vault) | Rotation, audit, sync env variables |
| **CI/CD** | GitHub Actions | Tests, lint, build, deploy automatique |
| **Monitoring** | Sentry + Axiom | Erreurs, logs, traces — plans gratuits généreux |
| **Hébergement Plateforme** | Vercel (front) + Railway (API) | Zero-config, auto-scaling, preview deploys |

### Déploiement Cible

```
┌─────────────────────────────────────────────────────────┐
│                    UTILISATEUR (Browser)                 │
│                         │                               │
│                    ┌────▼────┐                           │
│                    │ Vercel  │  ← Next.js Frontend       │
│                    └────┬────┘                           │
│                         │ API calls + WebSocket          │
│                    ┌────▼────┐                           │
│                    │ Railway │  ← Hono API + Socket.io   │
│                    └────┬────┘                           │
│              ┌──────────┼──────────┐                     │
│         ┌────▼────┐ ┌───▼───┐ ┌───▼────┐               │
│         │  Neon   │ │Upstash│ │ Clerk  │               │
│         │ (Postgres)│ │(Redis)│ │ (Auth) │               │
│         └─────────┘ └───────┘ └────────┘               │
│                         │                               │
│              ┌──────────▼──────────┐                     │
│              │   Hetzner Cloud     │                     │
│              │  ┌───┐ ┌───┐ ┌───┐ │                     │
│              │  │VPS│ │VPS│ │VPS│ │  ← 1 par user       │
│              │  │ 1 │ │ 2 │ │ N │ │    (Docker inside)  │
│              │  └───┘ └───┘ └───┘ │                     │
│              └─────────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Structure du Monorepo

```
s-rank-agent/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Lint + Tests on PR
│   │   ├── deploy-web.yml         # Deploy frontend to Vercel
│   │   ├── deploy-api.yml         # Deploy API to Railway
│   │   └── deploy-preview.yml     # Preview deploys on PR
│   ├── ISSUE_TEMPLATE/
│   │   ├── feature.md
│   │   ├── bug.md
│   │   └── task.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── apps/
│   ├── web/                       # Next.js 14 Frontend
│   │   ├── app/
│   │   │   ├── (auth)/            # Auth pages (login, signup)
│   │   │   ├── (dashboard)/       # Main app layout
│   │   │   │   ├── chat/          # Chat + code execution
│   │   │   │   ├── files/         # File explorer (PC Cloud)
│   │   │   │   ├── connectors/    # MCP connectors dashboard
│   │   │   │   ├── skills/        # Skills marketplace
│   │   │   │   ├── monitoring/    # Dashboard monitoring
│   │   │   │   └── settings/      # Settings, API key, billing
│   │   │   ├── (onboarding)/      # Wizard setup
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui components
│   │   │   ├── chat/              # Chat components
│   │   │   ├── files/             # File explorer components
│   │   │   ├── connectors/        # Connector cards
│   │   │   ├── monitoring/        # Dashboard widgets
│   │   │   └── shared/            # Layout, nav, sidebar
│   │   ├── lib/
│   │   │   ├── api.ts             # API client
│   │   │   ├── socket.ts          # WebSocket client
│   │   │   └── stores/            # Zustand stores
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                       # Hono Backend API
│       ├── src/
│       │   ├── index.ts           # Entry point
│       │   ├── routes/
│       │   │   ├── auth.ts        # Auth webhooks (Clerk)
│       │   │   ├── chat.ts        # Chat + Claude API proxy
│       │   │   ├── files.ts       # File operations
│       │   │   ├── connectors.ts  # MCP connector management
│       │   │   ├── skills.ts      # Skills CRUD
│       │   │   ├── servers.ts     # Server provisioning (Hetzner)
│       │   │   ├── billing.ts     # Stripe webhooks
│       │   │   └── monitoring.ts  # Logs, metrics, costs
│       │   ├── services/
│       │   │   ├── claude.ts      # Claude API integration
│       │   │   ├── docker.ts      # Docker management on VPS
│       │   │   ├── hetzner.ts     # Hetzner Cloud API
│       │   │   ├── mcp.ts         # MCP protocol handler
│       │   │   ├── file-manager.ts # AI file organization
│       │   │   └── trust-slider.ts # Permission engine
│       │   ├── middleware/
│       │   │   ├── auth.ts        # JWT verification
│       │   │   ├── rate-limit.ts  # Rate limiting
│       │   │   └── logger.ts      # Request logging
│       │   ├── db/
│       │   │   ├── schema.ts      # Drizzle schema
│       │   │   ├── migrations/    # SQL migrations
│       │   │   └── index.ts       # DB connection
│       │   ├── ws/
│       │   │   ├── index.ts       # WebSocket server
│       │   │   ├── chat.ts        # Chat streaming handler
│       │   │   ├── terminal.ts    # Terminal relay
│       │   │   └── files.ts       # File watcher relay
│       │   └── utils/
│       │       ├── crypto.ts      # AES-256 encryption for API keys
│       │       ├── errors.ts      # Error handling
│       │       └── validators.ts  # Zod schemas
│       ├── Dockerfile
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── shared/                    # Shared types & utilities
│   │   ├── src/
│   │   │   ├── types/             # TypeScript interfaces
│   │   │   │   ├── user.ts
│   │   │   │   ├── chat.ts
│   │   │   │   ├── connector.ts
│   │   │   │   ├── skill.ts
│   │   │   │   ├── server.ts
│   │   │   │   └── monitoring.ts
│   │   │   ├── constants.ts       # Trust levels, plans, etc.
│   │   │   └── validators.ts      # Shared Zod schemas
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/                        # Shared UI components (optional)
│   │   └── package.json
│   │
│   └── docker-images/             # Docker images for user servers
│       ├── base/
│       │   └── Dockerfile         # Base image (Ubuntu + Python + Node)
│       ├── skills/
│       │   └── Dockerfile         # Image with pre-installed skills
│       └── README.md
│
├── infra/
│   ├── docker-compose.dev.yml     # Local dev environment
│   ├── hetzner/
│   │   ├── cloud-init.yml         # User server initial setup
│   │   └── firewall-rules.json    # Network security rules
│   └── scripts/
│       ├── setup-dev.sh           # Dev environment setup
│       ├── provision-server.sh    # Provision user VPS
│       └── seed-db.sh             # Seed database
│
├── docs/
│   ├── DEVELOPMENT.md             # This file
│   ├── ARCHITECTURE.md            # Technical architecture details
│   ├── API.md                     # API documentation
│   ├── CONNECTORS.md              # How to build a connector
│   └── SKILLS.md                  # How to build a skill
│
├── turbo.json                     # Turborepo config
├── pnpm-workspace.yaml            # pnpm workspace config
├── package.json                   # Root package.json
├── .gitignore
├── .env.example                   # Environment variables template
├── LICENSE
└── README.md
```

---

## 🌿 Stratégie Git

### Branches

```
main          ← Production (protected, deploy auto)
  │
  ├── feat/*  ← Feature branches (ex: feat/chat-streaming)
  ├── fix/*   ← Bug fixes (ex: fix/auth-redirect)
  ├── infra/* ← Infrastructure (ex: infra/ci-pipeline)
  └── docs/*  ← Documentation
```

### Règles

| Règle | Détail |
|-------|--------|
| **Protection main** | Pas de push direct. Merge via PR uniquement. |
| **CI obligatoire** | Tests + lint doivent passer avant merge. |
| **Commits** | Conventional Commits : `feat:`, `fix:`, `chore:`, `docs:`, `infra:` |
| **PR naming** | `[PHASE-X] feat: description courte` |
| **Squash merge** | Un commit propre par feature sur main. |

### Workflow par Feature

```
1. git checkout -b feat/chat-streaming
2. Développer + tester localement
3. git push origin feat/chat-streaming
4. Ouvrir PR → CI automatique (lint + tests)
5. Review (auto si solo) → Squash merge dans main
6. Deploy automatique (Vercel + Railway)
```

---

## 🗓️ Planning Détaillé — 6 Semaines

---

### 🔵 SEMAINE 1 — Fondations & Infrastructure

> **Objectif** : Le repo est prêt, l'auth fonctionne, un serveur Hetzner se provisionne via API.

#### Jour 1-2 : Setup Projet

| Tâche | Branche | Détail |
|-------|---------|--------|
| Créer le repo GitHub `s-rank-agent` | `main` | Init + README + LICENSE (MIT) |
| Init Turborepo + pnpm workspace | `infra/init-monorepo` | `turbo.json`, `pnpm-workspace.yaml`, structure dossiers |
| Setup `apps/web` (Next.js 14) | `infra/init-monorepo` | App Router, TailwindCSS, shadcn/ui, dark mode |
| Setup `apps/api` (Hono) | `infra/init-monorepo` | Entry point, CORS, health check |
| Setup `packages/shared` | `infra/init-monorepo` | Types de base, constants |
| Docker Compose local | `infra/init-monorepo` | PostgreSQL + Redis local |
| `.env.example` | `infra/init-monorepo` | Toutes les variables d'environnement |

**Commandes clés :**
```bash
# Init monorepo
mkdir s-rank-agent && cd s-rank-agent
pnpm init
pnpm add -Dw turbo
mkdir -p apps/web apps/api packages/shared

# Init Next.js
cd apps/web
pnpm create next-app . --typescript --tailwind --app --src-dir=false

# Init Hono
cd ../api
pnpm init
pnpm add hono @hono/node-server
```

#### Jour 2-3 : CI/CD Pipeline

| Tâche | Branche | Détail |
|-------|---------|--------|
| GitHub Actions — CI | `infra/ci-pipeline` | Lint (ESLint + Prettier) + type-check sur chaque PR |
| GitHub Actions — Deploy Web | `infra/ci-pipeline` | Auto-deploy `apps/web` vers Vercel sur merge main |
| GitHub Actions — Deploy API | `infra/ci-pipeline` | Auto-deploy `apps/api` vers Railway sur merge main |
| Preview Deploys | `infra/ci-pipeline` | Preview URL pour chaque PR (Vercel) |
| Protection branche main | Manuel | Branch protection rules sur GitHub |

**`.github/workflows/ci.yml` :**
```yaml
name: CI
on:
  pull_request:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint type-check test
```

#### Jour 3-4 : Authentification

| Tâche | Branche | Détail |
|-------|---------|--------|
| Intégrer Clerk (frontend) | `feat/auth` | Sign-up, Sign-in, OAuth Google + GitHub |
| Middleware auth (API) | `feat/auth` | JWT verification via Clerk SDK |
| Webhook Clerk → DB | `feat/auth` | Sync user creation → PostgreSQL |
| Pages auth UI | `feat/auth` | Login/signup dark mode |

#### Jour 4-5 : Base de Données

| Tâche | Branche | Détail |
|-------|---------|--------|
| Setup Neon PostgreSQL | `feat/database` | Créer le projet Neon, connection string |
| Drizzle ORM schema | `feat/database` | Tables : users, servers, conversations, messages, connectors, skills |
| Migrations initiales | `feat/database` | `drizzle-kit generate` + `drizzle-kit push` |
| Setup Upstash Redis | `feat/database` | Sessions, rate limiting |

**Schema DB initial :**
```
users          → id, clerk_id, email, plan, api_key_encrypted, trust_level, created_at
servers        → id, user_id, hetzner_id, status, plan_size, ip, created_at
conversations  → id, user_id, title, created_at, updated_at
messages       → id, conversation_id, role, content, tokens_used, created_at
connectors     → id, user_id, type, credentials_encrypted, status, config
skills         → id, name, description, author, category, installs, config
user_skills    → user_id, skill_id, installed_at
activity_logs  → id, user_id, action, details, cost, created_at
```

#### Jour 5-6 : Provisioning Serveur Hetzner

| Tâche | Branche | Détail |
|-------|---------|--------|
| Service Hetzner Cloud API | `feat/server-provisioning` | Créer/supprimer/lister des VPS via API |
| Cloud-init script | `feat/server-provisioning` | Setup Docker, SSH, firewall sur chaque nouveau VPS |
| Route API `/servers` | `feat/server-provisioning` | POST (créer), GET (status), DELETE (supprimer) |
| SSH Key management | `feat/server-provisioning` | Générer et stocker clé SSH par user |

#### Jour 6-7 : Layout Principal + Sidebar

| Tâche | Branche | Détail |
|-------|---------|--------|
| Layout dashboard | `feat/dashboard-layout` | Sidebar (nav) + main content area |
| Navigation | `feat/dashboard-layout` | Chat, Files, Connectors, Skills, Monitoring, Settings |
| Dark mode premium | `feat/dashboard-layout` | Palette violet/cyan/emerald sur fond sombre |
| Responsive | `feat/dashboard-layout` | Mobile-first, sidebar collapsible |

**✅ Milestone Semaine 1 :**
- [ ] Monorepo fonctionnel avec CI/CD
- [ ] Auth complète (signup → login → dashboard)
- [ ] DB schema + migrations
- [ ] Un VPS Hetzner se provisionne via l'API
- [ ] Layout principal dark mode
- [ ] Premier deploy en production (même vide)

---

### 🟢 SEMAINE 2 — Chat & Exécution de Code

> **Objectif** : L'utilisateur peut chatter avec Claude et exécuter du code sur son serveur.

#### Jour 8-9 : Intégration Claude API

| Tâche | Branche | Détail |
|-------|---------|--------|
| Service Claude (backend) | `feat/claude-integration` | Proxy API avec la clé user (déchiffrée) |
| Chiffrement AES-256 | `feat/claude-integration` | Encrypt/decrypt des clés API utilisateur |
| Streaming SSE | `feat/claude-integration` | Stream des réponses Claude vers le frontend |
| Page settings : API Key | `feat/claude-integration` | Input + validation + bouton "i" (How to get it) |

#### Jour 9-11 : Interface Chat

| Tâche | Branche | Détail |
|-------|---------|--------|
| Chat UI | `feat/chat-ui` | Messages, input, streaming, markdown rendering |
| Code blocks interactifs | `feat/chat-ui` | Syntax highlighting + bouton "Exécuter" |
| Historique conversations | `feat/chat-ui` | Liste sidebar, persistance DB |
| Nouveau chat / renommer / supprimer | `feat/chat-ui` | CRUD conversations |

#### Jour 11-13 : Exécution de Code

| Tâche | Branche | Détail |
|-------|---------|--------|
| WebSocket server (Socket.io) | `feat/code-execution` | Connexion persistante frontend ↔ API |
| SSH tunnel vers VPS user | `feat/code-execution` | Exécution de commandes sur le container Docker |
| Sandbox d'exécution | `feat/code-execution` | Timeout, limites mémoire, isolation |
| Output streaming | `feat/code-execution` | stdout/stderr en temps réel dans le chat |
| Support multi-langage | `feat/code-execution` | Python, Node.js, Bash détectés automatiquement |

#### Jour 13-14 : Trust Slider (v1)

| Tâche | Branche | Détail |
|-------|---------|--------|
| Composant Slider UI | `feat/trust-slider` | 4 niveaux, persisté en DB |
| Permission engine (backend) | `feat/trust-slider` | Intercepte les actions selon le niveau |
| Confirmation modal | `feat/trust-slider` | Pop-up pour actions critiques (niveaux 1-2) |

**✅ Milestone Semaine 2 :**
- [ ] Chat fonctionnel avec Claude (streaming)
- [ ] Exécution de code Python/JS/Bash sur le serveur user
- [ ] Résultats inline dans le chat
- [ ] Slider de confiance opérationnel (4 niveaux)
- [ ] Clé API chiffrée et sécurisée

---

### 🟡 SEMAINE 3 — Explorateur de Fichiers & PC Cloud

> **Objectif** : Le serveur de l'utilisateur ressemble à un vrai PC avec un explorateur de fichiers.

#### Jour 15-17 : Explorateur de Fichiers

| Tâche | Branche | Détail |
|-------|---------|--------|
| API fichiers (backend) | `feat/file-explorer` | LIST, READ, WRITE, DELETE, MOVE, RENAME via SSH |
| Arborescence UI | `feat/file-explorer` | Tree view avec icônes par type de fichier |
| Navigation | `feat/file-explorer` | Clic pour naviguer, breadcrumb, retour |
| Actions contextuelles | `feat/file-explorer` | Clic droit : renommer, supprimer, déplacer, télécharger |

#### Jour 17-19 : Prévisualisation & Upload

| Tâche | Branche | Détail |
|-------|---------|--------|
| Preview images | `feat/file-preview` | PNG, JPG, SVG, GIF dans un panneau latéral |
| Preview code | `feat/file-preview` | Syntax highlighting (Monaco Editor light) |
| Preview PDF | `feat/file-preview` | Rendu PDF inline |
| Preview Markdown | `feat/file-preview` | Markdown → HTML rendu |
| Drag & Drop upload | `feat/file-preview` | Upload fichiers vers le serveur user |
| Recherche | `feat/file-preview` | Recherche par nom de fichier |

#### Jour 19-21 : Gestion Automatique par l'IA

| Tâche | Branche | Détail |
|-------|---------|--------|
| Service file-manager (backend) | `feat/ai-file-manager` | Claude analyse et organise les fichiers |
| Auto-classement | `feat/ai-file-manager` | Nouveaux fichiers rangés par projet/type |
| Suggestions de nommage | `feat/ai-file-manager` | Claude propose des noms descriptifs |
| Nettoyage périodique | `feat/ai-file-manager` | Détection fichiers temporaires, proposition de suppression |

**✅ Milestone Semaine 3 :**
- [ ] Explorateur de fichiers complet (navigation, CRUD)
- [ ] Prévisualisation images, code, PDF, Markdown
- [ ] Upload drag & drop
- [ ] L'IA organise les fichiers automatiquement
- [ ] Recherche fonctionnelle

---

### 🟠 SEMAINE 4 — Connecteurs MCP

> **Objectif** : L'utilisateur connecte GitHub, Slack, Google Drive, etc. en 1 clic.

#### Jour 22-24 : Framework MCP

| Tâche | Branche | Détail |
|-------|---------|--------|
| Architecture MCP handler | `feat/mcp-framework` | Interface commune pour tous les connecteurs |
| Stockage credentials | `feat/mcp-framework` | Chiffrement AES-256, CRUD credentials |
| Dashboard connecteurs UI | `feat/mcp-framework` | Grid de cards avec toggle ON/OFF |
| Info-bulle "How to get token" | `feat/mcp-framework` | Lien direct vers chaque plateforme |
| Status check | `feat/mcp-framework` | Ping pour vérifier la validité des credentials |

#### Jour 24-26 : Connecteurs Prioritaires (Lot 1)

| Tâche | Branche | Détail |
|-------|---------|--------|
| GitHub connector | `feat/connector-github` | OAuth App → clone, commit, push, PR, issues |
| Slack connector | `feat/connector-slack` | Bot token → lire/envoyer messages, channels |
| Google Drive connector | `feat/connector-gdrive` | OAuth → upload, download, liste fichiers |

#### Jour 26-28 : Connecteurs Prioritaires (Lot 2)

| Tâche | Branche | Détail |
|-------|---------|--------|
| PostgreSQL connector | `feat/connector-postgres` | Connection string → requêtes, schema, backups |
| Stripe connector | `feat/connector-stripe` | API key → paiements, clients, webhooks |
| Vercel connector | `feat/connector-vercel` | Token → déployer, preview, logs |

**✅ Milestone Semaine 4 :**
- [ ] 6 connecteurs MCP fonctionnels
- [ ] Dashboard connecteurs avec toggle ON/OFF
- [ ] Bouton "i" avec guide pour chaque token
- [ ] L'agent Claude peut utiliser les connecteurs via le chat

---

### 🔴 SEMAINE 5 — Marketplace Skills + Monitoring

> **Objectif** : Les skills sont installables et le dashboard de monitoring fonctionne.

#### Jour 29-31 : Marketplace de Skills

| Tâche | Branche | Détail |
|-------|---------|--------|
| Schema Skill | `feat/skills-marketplace` | Structure JSON d'un skill (prompt, deps, config) |
| API Skills (CRUD) | `feat/skills-marketplace` | Lister, installer, désinstaller |
| UI Marketplace | `feat/skills-marketplace` | Grid de cards, catégories, recherche |
| Installation 1-clic | `feat/skills-marketplace` | L'agent installe les deps automatiquement |
| 5-10 Skills officiels | `feat/skills-marketplace` | Web scraping, data analysis, DevOps, SEO, content |

#### Jour 31-33 : Skills Communautaires

| Tâche | Branche | Détail |
|-------|---------|--------|
| Publication de skills | `feat/skills-community` | Formulaire pour soumettre un skill |
| Système de notation | `feat/skills-community` | Stars + reviews |
| Validation basique | `feat/skills-community` | Review automatique (structure, sécurité) |

#### Jour 33-35 : Dashboard Monitoring

| Tâche | Branche | Détail |
|-------|---------|--------|
| Logs d'activité | `feat/monitoring` | Timeline chronologique des actions de l'agent |
| Coûts API Claude | `feat/monitoring` | Tokens consommés, estimation $, graphiques |
| Ressources serveur | `feat/monitoring` | CPU, RAM, stockage (via SSH métriques) |
| Statut connecteurs | `feat/monitoring` | Vue rapide de tous les connecteurs |
| Tâches en cours | `feat/monitoring` | Liste des tâches (mode always-on) |

**✅ Milestone Semaine 5 :**
- [ ] Marketplace avec 5-10 skills officiels
- [ ] Installation en 1 clic
- [ ] Publication de skills communautaires
- [ ] Dashboard monitoring complet (logs, coûts, ressources)

---

### 🟣 SEMAINE 6 — Onboarding, Billing & Launch

> **Objectif** : Le produit est prêt pour la beta. Tout est connecté, testé, et payable.

#### Jour 36-37 : Onboarding Wizard

| Tâche | Branche | Détail |
|-------|---------|--------|
| Étape 1 : Clé API | `feat/onboarding` | Input + validation + lien Anthropic |
| Étape 2 : Choix serveur | `feat/onboarding` | Cards comparatifs des plans |
| Étape 3 : Connecteurs | `feat/onboarding` | Dashboard connecteurs rapide + "Passer" |
| Message de bienvenue agent | `feat/onboarding` | Premier message de l'agent personnalisé |
| Tour guidé | `feat/onboarding` | Tooltips sur les zones clés de l'interface |

#### Jour 37-38 : Billing Stripe

| Tâche | Branche | Détail |
|-------|---------|--------|
| Stripe Products + Prices | `feat/billing` | 3 plans (Starter, Pro, Business) |
| Checkout Session | `feat/billing` | Redirection vers Stripe Checkout |
| Webhooks Stripe | `feat/billing` | Sync subscription status → DB |
| Customer Portal | `feat/billing` | Gérer l'abonnement, factures, annulation |
| Gating features | `feat/billing` | Limiter features selon le plan |

#### Jour 38-39 : Mode Always-On / On-Demand

| Tâche | Branche | Détail |
|-------|---------|--------|
| Agent background worker | `feat/agent-modes` | Process persistant sur le VPS user |
| Switch UI | `feat/agent-modes` | Toggle always-on / on-demand |
| Queue de tâches | `feat/agent-modes` | Redis queue pour tâches de fond |
| Notifications | `feat/agent-modes` | Notifier quand une tâche background est terminée |

#### Jour 39-40 : Tests & Sécurité

| Tâche | Branche | Détail |
|-------|---------|--------|
| Tests E2E (Playwright) | `feat/testing` | Flows critiques : signup → onboarding → chat → exécuter code |
| Tests unitaires | `feat/testing` | Services critiques : crypto, permissions, Claude proxy |
| Security audit | `feat/testing` | Injection, XSS, CORS, rate limiting, credential leaks |
| Load testing | `feat/testing` | 50 users simultanés |

#### Jour 40-42 : Landing Page & Documentation

| Tâche | Branche | Détail |
|-------|---------|--------|
| Landing page | `feat/landing` | Hero, features, pricing, CTA |
| Documentation | `feat/landing` | Getting started, API docs, guides connecteurs |
| README.md final | `feat/landing` | Présentation projet |
| SEO + Analytics | `feat/landing` | Meta tags, Open Graph, Plausible Analytics |
| Beta launch prep | `feat/landing` | Email list, social media, Product Hunt draft |

**✅ Milestone Semaine 6 :**
- [ ] Onboarding wizard complet (3 étapes)
- [ ] Billing Stripe fonctionnel (3 plans)
- [ ] Mode always-on / on-demand
- [ ] Tests E2E passent
- [ ] Landing page live
- [ ] Documentation complète
- [ ] **🚀 BETA LAUNCH**

---

## 🚀 Procédure de Déploiement

### Setup Initial (Day 0)

```bash
# 1. Créer le repo
gh repo create s-rank-agent --public --clone
cd s-rank-agent

# 2. Init monorepo
pnpm init
echo '{ "packages": ["apps/*", "packages/*"] }' > pnpm-workspace.yaml

# 3. Setup Turborepo
pnpm add -Dw turbo
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "type-check": {},
    "test": {}
  }
}
EOF

# 4. Créer la structure
mkdir -p apps/web apps/api packages/shared packages/docker-images infra docs .github/workflows
```

### Déploiement par Environnement

| Environnement | Trigger | URL |
|--------------|---------|-----|
| **Local** | `pnpm dev` | `localhost:3000` (web) + `localhost:4000` (api) |
| **Preview** | PR ouverte | `pr-123.s-rank-agent.vercel.app` |
| **Production** | Merge dans `main` | `app.s-rank-agent.com` |

### Commandes Quotidiennes

```bash
# Développer
pnpm dev                    # Lance web + api en parallèle

# Tester
pnpm turbo test             # Tous les tests
pnpm turbo lint             # Lint tout le monorepo
pnpm turbo type-check       # TypeScript check

# Déployer (automatique via CI, mais si besoin)
pnpm turbo build            # Build tout
git push origin main        # Trigger deploy auto
```

### Variables d'Environnement

```env
# ── Auth (Clerk) ──
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# ── Database (Neon) ──
DATABASE_URL=postgresql://...@ep-xxx.neon.tech/srank

# ── Redis (Upstash) ──
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...

# ── Hetzner Cloud ──
HETZNER_API_TOKEN=...

# ── Stripe ──
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# ── Encryption ──
ENCRYPTION_KEY=...          # 32 bytes hex for AES-256

# ── Monitoring ──
SENTRY_DSN=https://...
AXIOM_TOKEN=...
```

---

## 📊 Résumé des Livrables par Semaine

| Semaine | Focus | PRs Estimées | Deploy |
|---------|-------|-------------|--------|
| **S1** | Fondations (repo, auth, DB, infra, layout) | ~7 PRs | ✅ Premier deploy prod |
| **S2** | Chat + Code Execution + Trust Slider | ~5 PRs | ✅ Chat fonctionnel |
| **S3** | Explorateur fichiers + PC Cloud + IA files | ~4 PRs | ✅ PC Cloud visible |
| **S4** | 6 Connecteurs MCP + Dashboard connecteurs | ~4 PRs | ✅ Connecteurs live |
| **S5** | Marketplace Skills + Monitoring Dashboard | ~4 PRs | ✅ Skills installables |
| **S6** | Onboarding + Billing + Tests + Landing + Launch | ~6 PRs | 🚀 **BETA LAUNCH** |

**Total estimé : ~30 PRs, ~180 fichiers, ~15,000 lignes de code**

---

## ⚠️ Règles pour les Agents IA Supplémentaires

Si des agents IA sont ajoutés en renfort, ils doivent respecter :

1. **Une branche par tâche** — jamais de travail direct sur `main`.
2. **Nommage strict** — `feat/`, `fix/`, `infra/`, `docs/` + description courte.
3. **Tests obligatoires** — toute PR doit inclure au moins un test.
4. **Pas de conflits** — chaque agent travaille sur un scope isolé (ex: un travaille sur le chat, l'autre sur les fichiers).
5. **Types partagés** — les types dans `packages/shared` sont la source de vérité.
6. **Conventional Commits** — format `feat: description` obligatoire.
7. **PR description** — chaque PR inclut : ce qui a été fait, comment tester, screenshots si UI.

---

*Ce plan est un document vivant. Il sera mis à jour à chaque fin de semaine en fonction de l'avancement réel.*
