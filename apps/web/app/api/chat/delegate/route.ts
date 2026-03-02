export const runtime = "edge";

export async function POST(req: Request) {
  const body = await req.json();
  const { brief, language, apiKey, context } = body;

  if (!apiKey) return Response.json({ error: "API key required" }, { status: 400 });
  if (!brief) return Response.json({ error: "Brief required" }, { status: 400 });

  const lang = (language || "python3").toLowerCase();

  const systemPrompt = `Tu es un développeur expert. Tu reçois un brief technique et tu retournes UNIQUEMENT du code.

RÈGLES STRICTES:
- Retourne UNIQUEMENT le code, rien d'autre
- Pas de \`\`\`, pas de markdown, pas d'explication
- Pas de "voici le code", pas de commentaires inutiles
- Le code doit être COMPLET et EXÉCUTABLE directement
- Si le brief mentionne un fichier à créer, utilise le bon path
- Gère les erreurs proprement (try/except, try/catch)
- Utilise des noms de variables clairs

LANGAGE: ${lang}
ENVIRONNEMENT: Ubuntu ARM, Python 3.12, Node.js 20, home=/home/agent
PACKAGES PYTHON DISPONIBLES: matplotlib, pandas, numpy, requests, beautifulsoup4, python-docx, openpyxl, python-pptx, pillow
${context ? `\nCONTEXTE SUPPLÉMENTAIRE:\n${context}` : ""}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: brief }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return Response.json({ error: `Sub-agent error: ${error}` }, { status: 400 });
  }

  const data = await response.json();
  const code = data.content?.[0]?.text || "";

  // Clean any accidental markdown fences
  const cleaned = code
    .replace(/^```\w*\n?/gm, "")
    .replace(/\n?```$/gm, "")
    .trim();

  return Response.json({
    code: cleaned,
    language: lang,
    tokens: {
      input: data.usage?.input_tokens || 0,
      output: data.usage?.output_tokens || 0,
    },
  });
}
