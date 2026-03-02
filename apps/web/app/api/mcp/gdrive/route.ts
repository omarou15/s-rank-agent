import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const GDRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const GDRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

export async function POST(req: NextRequest) {
  try {
    const headersList = headers();
    const token = headersList.get("x-connector-token");
    
    if (!token) {
      return NextResponse.json({ error: "Token Google Drive manquant" }, { status: 401 });
    }

    const { action, ...params } = await req.json();
    const gdriveHeaders = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    };

    switch (action) {
      case "verify":
        const aboutRes = await fetch(`${GDRIVE_API_BASE}/about?fields=user`, { headers: gdriveHeaders });
        if (!aboutRes.ok) throw new Error("Token Google Drive invalide");
        const aboutData = await aboutRes.json();
        return NextResponse.json({ 
          success: true, 
          data: { 
            email: aboutData.user.emailAddress,
            name: aboutData.user.displayName 
          }
        });

      case "files":
        const { q = "", pageSize = 50 } = params;
        const searchQuery = q ? `name contains '${q}'` : "";
        const filesRes = await fetch(
          `${GDRIVE_API_BASE}/files?q=${encodeURIComponent(searchQuery)}&pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,size)`, 
          { headers: gdriveHeaders }
        );
        const files = await filesRes.json();
        return NextResponse.json({ success: true, data: files.files });

      case "download":
        const { fileId } = params;
        if (!fileId) throw new Error("fileId requis");
        
        const downloadRes = await fetch(`${GDRIVE_API_BASE}/files/${fileId}?alt=media`, { headers: gdriveHeaders });
        if (!downloadRes.ok) throw new Error("Téléchargement échoué");
        
        const content = await downloadRes.text();
        return NextResponse.json({ success: true, data: { content, fileId } });

      default:
        return NextResponse.json({ error: `Action '${action}' non supportée` }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Google Drive MCP Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur inconnue" 
    }, { status: 500 });
  }
}
