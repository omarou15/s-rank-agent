# 🏆 S-Rank Agent — Règles pour Agents IA

**LIS CE FICHIER EN ENTIER AVANT DE MODIFIER QUOI QUE CE SOIT.**

## 1. Design System — Apple Glass Liquid UI

Tout le projet utilise un design visionOS/Apple Glass. **Ne JAMAIS utiliser les classes suivantes :**
- ❌ `bg-gray-900`, `bg-gray-800`, `border-gray-800`, `border-gray-700`
- ❌ `bg-zinc-900`, `bg-zinc-800` (sauf pour inputs internes)
- ❌ `shadow-lg shadow-blue-500/20` (trop heavy)

**TOUJOURS utiliser :**
- ✅ `bg-white/[0.02]` — fond de carte
- ✅ `border border-white/[0.06]` — bordure de carte
- ✅ `backdrop-blur-sm` — si besoin de blur
- ✅ `bg-zinc-950` — fond d'input
- ✅ `border-zinc-800` — bordure d'input
- ✅ `text-white` / `text-zinc-500` / `text-zinc-600` — texte
- ✅ `text-[10px]`, `text-[11px]`, `text-xs` — petits textes
- ✅ `rounded-xl` — coins de carte
- ✅ `rounded-lg` — coins d'input/bouton

**Layout des pages dashboard :**
```tsx
<div className="h-full overflow-y-auto">
  <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
    {/* contenu */}
  </div>
</div>
```

## 2. Architecture — Règles Critiques

### Clerk Auth
- TOUJOURS utiliser `const { user, isLoaded } = useUser();`
- TOUJOURS vérifier `if (!isLoaded) return;` avant d'accéder à `user.id`
- Le `uid` est `user?.id || "default"` — ne JAMAIS charger des données avant `isLoaded`

### localStorage Keys (convention)
- `s-rank-chat-${uid}` — messages du chat
- `s-rank-api-key` — clé API Claude
- `s-rank-connectors` — config connecteurs MCP
- `s-rank-trust-level` — niveau de confiance (1-4)
- `s-rank-agent-mode` — "on-demand" | "always-on"
- `s-rank-orchestrator` — "true" | "false"
- `s-rank-memory` — mémoire de l'agent
- `s-rank-installed-skills` — skills installés
- `s-rank-agent` — Tamagotchi agent (xp, level, name...)
- `s-rank-tasks` — tâches du Command Center
- `s-rank-stats` — statistiques quotidiennes
- `s-rank-config-event` — événements cross-tab (JSON avec type + message + ts)
- `s-rank-xp-event` — événements XP pour le Tamagotchi
- `s-rank-email-config` — config SMTP
- `s-rank-hetzner-token` — token Hetzner (chiffré)

### Communication cross-composants
On utilise `localStorage.setItem("s-rank-config-event", JSON.stringify({...}))` pour notifier le chat depuis d'autres pages (connectors, settings, skills).

### Chat — Tags Internes
L'agent Claude utilise ces tags dans ses réponses (le frontend les parse) :
- `[EXEC:lang]...[/EXEC]` — exécution de code
- `[MCP:service/method]...[/MCP]` — appel connecteur MCP
- `[FILE:/path]` — lien fichier téléchargeable
- `[ARTIFACT:type]...[/ARTIFACT]` — HTML artifact rendu inline
- `[MEMORY:fact]` — mémorisation
- `[CRON:spec]` — création de cron job
- `[DELEGATE:lang]...[/DELEGATE]` — délégation sub-agent (mode orchestrateur)

### VPS
- IP: 46.225.103.230 (Hetzner)
- API: port 3100 (/health, /exec, /files/*)
- Exécution via POST /exec avec { code, language }

## 3. Composants Existants — Ne PAS Recréer

Ces composants existent déjà, les réutiliser :
- `@/components/shared/trust-slider` — TrustSlider
- `@/components/chat/chat-input` — ChatInput + UploadedFile type

## 4. Avant de Modifier un Fichier

1. **LIRE** le fichier en entier d'abord
2. **VÉRIFIER** que tous les composants/fonctions référencés existent
3. **RESPECTER** le design system (pas de gray-900, pas de shadow-lg)
4. **TESTER** que le build passe (`npx next build` ou au minimum vérifier les imports)
5. **NE PAS** supprimer de fonctionnalités existantes en refactoring

## 5. Pages du Dashboard

| Route | Fichier | Description |
|-------|---------|-------------|
| /chat | (dashboard)/chat/page.tsx | Chat principal + boucle agentique |
| /files | (dashboard)/files/page.tsx | Explorateur de fichiers VPS |
| /connectors | (dashboard)/connectors/page.tsx | Connecteurs MCP (7) |
| /skills | (dashboard)/skills/page.tsx | Marketplace 78 skills |
| /monitoring | (dashboard)/monitoring/page.tsx | Command Center (Tasks, Crons, Evolution) |
| /settings | (dashboard)/settings/page.tsx | Paramètres (mode, trust, email, wallet, orchestrateur) |

## 6. Erreurs Fréquentes à Éviter

- ❌ Référencer un composant sans le définir (ex: `<EmailCard />` sans function EmailCard)
- ❌ Utiliser `user.id` sans vérifier `isLoaded`
- ❌ Oublier d'exporter default le composant page
- ❌ Dupliquer des variables dans un switch/case sans block scope
- ❌ Écraser le design glass par du generic gray
- ❌ Ajouter des fonctionnalités déjà présentes dans d'autres pages (ex: agent mode dans connectors ET settings)
