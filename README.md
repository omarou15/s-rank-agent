# 🏆 S-Rank Agent

> **Your AI-powered cloud PC. Ask, it executes.**

S-Rank Agent is the first cloud PC powered by AI. It combines the intelligence of Claude with a full execution environment — server, files, terminal, connectors — giving you an autonomous agent that can code, deploy, manage files, and interact with your entire tech stack.

---

## ✨ Features

- **💬 Chat + Code Execution** — Talk to Claude, it executes code on your server in real-time
- **📁 Cloud PC** — Visual file explorer with AI-powered automatic file organization
- **🔌 MCP Connectors** — Connect GitHub, Slack, Google Drive, databases, and more in 1 click
- **🧩 Skills Marketplace** — Install pre-built AI skills or create your own
- **📊 Monitoring Dashboard** — Track costs, logs, server resources, and agent activity
- **🎚️ Trust Slider** — Control agent autonomy from "ask before every action" to "full auto"

## 🏗️ Architecture

```
Monorepo (Turborepo + pnpm)
├── apps/web        → Next.js 14 (Vercel)
├── apps/api        → Hono API (Railway)
├── packages/shared → Shared types & constants
└── packages/docker-images → User server images
```

| Layer | Tech | Hosting |
|-------|------|---------|
| Frontend | Next.js 14, TailwindCSS, shadcn/ui | Vercel |
| Backend | Hono, Socket.io, Drizzle ORM | Railway |
| Database | PostgreSQL (Neon) + Redis (Upstash) | Serverless |
| User Servers | Docker on Hetzner Cloud VPS | Hetzner |
| Auth | Clerk | Managed |
| Billing | Stripe | Managed |

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local dev)

### Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/s-rank-agent.git
cd s-rank-agent

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Fill in your credentials in .env

# Start local database
docker compose -f infra/docker-compose.dev.yml up -d

# Push database schema
pnpm db:push

# Start development
pnpm dev
```

The web app runs at `http://localhost:3000` and the API at `http://localhost:4000`.

## 📋 Development

See [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for the full development plan, branching strategy, and deployment procedures.

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm type-check` | TypeScript check all packages |
| `pnpm test` | Run all tests |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

### Branch Naming

- `feat/*` — New features
- `fix/*` — Bug fixes
- `infra/*` — Infrastructure
- `docs/*` — Documentation

## 💰 Plans

| | Starter (15€/mo) | Pro (39€/mo) | Business (79€/mo) |
|---|---|---|---|
| Server | 1 vCPU, 1GB RAM | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM |
| Connectors | 3 | 10 | Unlimited |
| Agent Mode | On-demand | Always-on (8h/d) | Always-on 24/7 |
| Skills | Official only | + Community | + Custom |
| Storage | 10 GB | 50 GB | 100 GB |

> **BYOK**: Users bring their own Claude API key. S-Rank Agent never stores keys in plaintext.

## 📄 License

MIT

---

Built with 🧠 Claude and ☕ by the S-Rank team.
