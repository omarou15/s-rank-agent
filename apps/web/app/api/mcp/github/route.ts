import { NextRequest, NextResponse } from "next/server";
import { getConnectorContext, shouldExecute, createMCPResponse } from "../middleware";

const GITHUB_API_BASE = "https://api.github.com";

export async function POST(req: NextRequest) {
  try {
    const { token, mode } = getConnectorContext(req);
    const { action, ...params } = await req.json();

    // Vérification du mode on-demand/always-on
    if (!shouldExecute(mode, action)) {
      return NextResponse.json(
        createMCPResponse(false, null, `Action '${action}' nécessite confirmation en mode on-demand`, true),
        { status: 403 }
      );
    }

    const githubHeaders = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "S-Rank-Agent"
    };

    switch (action) {
      case "verify":
        const userRes = await fetch(`${GITHUB_API_BASE}/user`, { headers: githubHeaders });
        if (!userRes.ok) throw new Error("Token invalide");
        const userData = await userRes.json();
        return NextResponse.json(createMCPResponse(true, { 
          login: userData.login, 
          name: userData.name, 
          id: userData.id,
          mode 
        }));

      case "repos":
        const reposRes = await fetch(`${GITHUB_API_BASE}/user/repos?per_page=100`, { headers: githubHeaders });
        const repos = await reposRes.json();
        return NextResponse.json(createMCPResponse(true, 
          repos.map((r: any) => ({ name: r.name, full_name: r.full_name, private: r.private }))
        ));

      case "issues":
        const { repo } = params;
        if (!repo) throw new Error("Paramètre 'repo' manquant");
        const issuesRes = await fetch(`${GITHUB_API_BASE}/repos/${repo}/issues`, { headers: githubHeaders });
        const issues = await issuesRes.json();
        return NextResponse.json(createMCPResponse(true, issues));

      case "create-issue":
        const { repo: targetRepo, title, body, labels } = params;
        if (!targetRepo || !title) throw new Error("repo et title requis");
        
        const createRes = await fetch(`${GITHUB_API_BASE}/repos/${targetRepo}/issues`, {
          method: "POST",
          headers: { ...githubHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, labels })
        });
        const newIssue = await createRes.json();
        return NextResponse.json(createMCPResponse(true, newIssue));

      case "file":
        const { repo: fileRepo, path } = params;
        if (!fileRepo || !path) throw new Error("repo et path requis");
        
        const fileRes = await fetch(`${GITHUB_API_BASE}/repos/${fileRepo}/contents/${path}`, { headers: githubHeaders });
        const fileData = await fileRes.json();
        const fileContent = fileData.content ? atob(fileData.content) : null;
        return NextResponse.json(createMCPResponse(true, { ...fileData, decoded_content: fileContent }));

      case "commit":
        const { repo: commitRepo, path: commitPath, content: commitContent, message, branch = "main" } = params;
        if (!commitRepo || !commitPath || !commitContent || !message) {
          throw new Error("repo, path, content et message requis");
        }

        // Get current file SHA if it exists
        let sha = null;
        try {
          const existingRes = await fetch(`${GITHUB_API_BASE}/repos/${commitRepo}/contents/${commitPath}`, { headers: githubHeaders });
          if (existingRes.ok) {
            const existingFile = await existingRes.json();
            sha = existingFile.sha;
          }
        } catch (e) {
          // File doesn't exist, that's ok
        }

        const commitData: any = {
          message,
          content: btoa(commitContent),
          branch
        };
        if (sha) commitData.sha = sha;

        const commitRes = await fetch(`${GITHUB_API_BASE}/repos/${commitRepo}/contents/${commitPath}`, {
          method: "PUT",
          headers: { ...githubHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(commitData)
        });
        const commitResult = await commitRes.json();
        return NextResponse.json(createMCPResponse(true, commitResult));

      default:
        return NextResponse.json(createMCPResponse(false, null, `Action '${action}' non supportée`), { status: 400 });
    }

  } catch (error: any) {
    console.error("GitHub MCP Error:", error);
    return NextResponse.json(createMCPResponse(false, null, error.message || "Erreur inconnue"), { status: 500 });
  }
}
