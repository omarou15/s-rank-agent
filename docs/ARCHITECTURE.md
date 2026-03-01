# Architecture Technique — S-Rank Agent

## Vue d'ensemble

```
┌──────────────────────────────────────────────────┐
│                   UTILISATEUR                     │
│                      │                            │
│              ┌───────▼────────┐                   │
│              │  Next.js (Web) │  ← Vercel         │
│              │  Port 3000     │                    │
│              └───────┬────────┘                    │
│                      │ REST + SSE + WS            │
│              ┌───────▼────────┐                   │
│              │  Hono (API)    │  ← Railway        │
│              │  Port 4000     │                    │
│              └───┬───┬───┬───┘                    │
│           ┌──────┘   │   └──────┐                 │
│     ┌─────▼──┐ ┌─────▼──┐ ┌────▼───┐             │
│     │  Neon  │ │Upstash │ │ Clerk  │             │
│     │(Postgres)│(Redis) │ │ (Auth) │             │
│     └────────┘ └────────┘ └────────┘             │
│                      │                            │
│              ┌───────▼────────┐                   │
│              │ Hetzner Cloud  │                    │
│              │  VPS par user  │  ← Docker inside  │
│              └────────────────┘                    │
└──────────────────────────────────────────────────┘
```

## Flux de données

### Chat + Code Execution

1. User envoie message → Next.js POST /chat/stream
2. API déchiffre la clé Claude de l'utilisateur (AES-256)
3. API appelle Anthropic avec SSE streaming
4. Chaque token est relayé au frontend en temps réel
5. Si Claude génère du code → API l'exécute via SSH sur le VPS user
6. stdout/stderr remontent via WebSocket
7. Résultats affichés inline dans le chat

### File Explorer

1. Frontend demande la liste des fichiers → API GET /files/list
2. API SSH vers le VPS user → `ls -la` parsé en JSON
3. Prévisualisation → API SSH `cat` le fichier, retour au frontend
4. Upload → multipart vers API → SCP vers VPS

### MCP Connectors

1. User active un connecteur → credentials chiffrées en DB
2. Claude reçoit dans son system prompt la liste des connecteurs actifs
3. Claude génère des appels aux APIs via le MCP protocol
4. L'API exécute les appels MCP et retourne les résultats

## Sécurité

| Couche | Mesure |
|--------|--------|
| API Keys | AES-256-GCM, jamais en clair |
| Auth | JWT via Clerk, vérification sur chaque requête |
| VPS | Container Docker isolé par user, firewall |
| Network | TLS 1.3, CORS strict, rate limiting |
| Secrets | Variables d'environnement, jamais en code |
| Logs | Audit trail complet de chaque action |

## Base de données

### Tables principales

- `users` — profil, plan, clé API chiffrée, trust level
- `servers` — VPS Hetzner par user, IP, status, specs
- `conversations` — historique de chat
- `messages` — messages avec tokens/coûts
- `connectors` — credentials chiffrées des services connectés
- `skills` — marketplace (officiels + communautaires)
- `user_skills` — skills installés par user
- `activity_logs` — audit trail complet
