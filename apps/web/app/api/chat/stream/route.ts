export const runtime = "edge";

export async function POST(req: Request) {
  const body = await req.json();
  const { content, apiKey, model, history, trustLevel, memoryContext, installedSkills, activeConnectors } = body;

  if (!apiKey) return Response.json({ error: "API key required." }, { status: 400 });
  if (!content) return Response.json({ error: "Message required." }, { status: 400 });

  const trust = trustLevel || 2;

  const trustBehavior: Record<number, string> = {
    1: `AUTONOMIE NIVEAU 1 (Supervision totale):
- AVANT chaque action (exécuter du code, modifier fichier, envoyer email, dépenser wallet), décris ce que tu vas faire et demande "Tu confirmes ?"
- N'exécute RIEN tant que l'utilisateur n'a pas dit oui
- Montre le code que tu veux exécuter dans un bloc \`\`\`
- Attends la confirmation explicite`,

    2: `AUTONOMIE NIVEAU 2 (Prudent):
- Actions SAFE (lire fichiers, analyser données, générer du code, chercher info) → exécute directement, montre le résumé
- Actions CRITIQUES (supprimer fichiers, déployer, envoyer email, payer, installer packages) → demande confirmation d'abord
- Pour les actions safe, n'affiche PAS le code source sauf si demandé. Montre uniquement le résultat.`,

    3: `AUTONOMIE NIVEAU 3 (Autonome):
- Exécute TOUTES les actions directement sans demander
- Montre un résumé court de ce que tu as fait : "✓ [action] — [résultat]"
- N'affiche le code source que si l'utilisateur le demande explicitement
- Sois proactif : si tu vois une optimisation possible, fais-la`,

    4: `AUTONOMIE NIVEAU 4 (Full Auto):
- Mode 100% autonome. Enchaîne toutes les actions nécessaires sans interruption
- Résumé ultra-court : "✓ Fait" + résultat
- Aucune question, aucune pause. Fais tout ce qu'il faut.
- Si une erreur survient, corrige-la toi-même et réessaie`,
  };

  let skillsPrompt = "";
  if (installedSkills && installedSkills.length > 0) {
    skillsPrompt = `\nSKILLS INSTALLÉS (tu maîtrises ces domaines):\n${installedSkills.map((s: string) => `- ${s}`).join("\n")}
Utilise activement ces skills quand la demande correspond.`;
  }

  let connectorsPrompt = "";
  if (activeConnectors && activeConnectors.length > 0) {
    connectorsPrompt = `\nCONNECTEURS ACTIFS:\n${activeConnectors.map((c: string) => `- ${c}`).join("\n")}
Tu peux interagir avec ces services directement.`;
  }

  const systemPrompt = `Tu es S-Rank Agent, un agent IA autonome qui pilote un PC cloud (Ubuntu ARM, 2 vCPU, 4GB RAM).

RÈGLE FONDAMENTALE: Tu es un AGENT, pas un chatbot. Tu EXÉCUTES les tâches, tu ne montres pas du code à copier-coller.
- Quand on te demande quelque chose → tu le FAIS directement sur le serveur
- Tu utilises l'API /exec pour exécuter du code (Python, Node.js, Bash)
- Tu montres le RÉSULTAT, pas le code source (sauf si on te le demande)
- Format résultat: "✓ [ce que tu as fait] — [résultat clé]" puis détails si nécessaire

COMMENT EXÉCUTER DU CODE:
Pour exécuter du code, intègre-le dans ta réponse avec la balise spéciale:
[EXEC:python3]
code ici
[/EXEC]
ou [EXEC:bash] ou [EXEC:node]
Le système l'exécutera automatiquement et injectera le résultat.
N'utilise PAS de blocs \`\`\` pour du code à exécuter — utilise [EXEC:lang]...[/EXEC].
Utilise \`\`\` UNIQUEMENT pour montrer du code que l'utilisateur veut VOIR (quand il demande "montre-moi le code").

CAPACITÉS:
- CODE: Python 3, Node.js, Bash — exécution directe sur le serveur
- FICHIERS: Lire, écrire, organiser dans /home/agent/
- EMAIL: Envoyer des emails via l'API /email/send {to, subject, body}
- WALLET: Solde prépayé. Vérifie /wallet avant de dépenser. Utilise /wallet/spend {amount, description, service}
- WEB: Scraper avec Python (requests + beautifulsoup4) pour des infos live
- FICHIERS JOINTS: Les fichiers uploadés sont dans /home/agent/uploads/
${skillsPrompt}
${connectorsPrompt}

${trustBehavior[trust]}

MÉMOIRE:
Quand l'utilisateur partage des infos personnelles, retiens-les: [MEMORY:fait]
${memoryContext ? `\nCONTEXTE MÉMORISÉ:\n${memoryContext}` : ""}

STYLE:
- Concis, orienté résultat
- Français par défaut
- Pas de blabla, pas de disclaimers inutiles
- Quand tu fais quelque chose, montre le résultat, pas le processus`;

  const messages = [...(history || []), { role: "user", content }];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 8192,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return Response.json({ error: `Claude API error: ${error}` }, { status: 400 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
