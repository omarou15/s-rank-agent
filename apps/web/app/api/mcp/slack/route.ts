import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const SLACK_API_BASE = "https://slack.com/api";

export async function POST(req: NextRequest) {
  try {
    const headersList = headers();
    const token = headersList.get("x-connector-token");
    
    if (!token) {
      return NextResponse.json({ error: "Token Slack manquant" }, { status: 401 });
    }

    const { action, ...params } = await req.json();
    const slackHeaders = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    switch (action) {
      case "verify":
        const authRes = await fetch(`${SLACK_API_BASE}/auth.test`, { 
          method: "POST", 
          headers: slackHeaders 
        });
        const authData = await authRes.json();
        if (!authData.ok) throw new Error(authData.error || "Token invalide");
        return NextResponse.json({ 
          success: true, 
          data: { team: authData.team, user: authData.user, team_id: authData.team_id }
        });

      case "channels":
        const channelsRes = await fetch(`${SLACK_API_BASE}/conversations.list?types=public_channel,private_channel`, { 
          method: "POST", 
          headers: slackHeaders 
        });
        const channelsData = await channelsRes.json();
        if (!channelsData.ok) throw new Error(channelsData.error);
        return NextResponse.json({ 
          success: true, 
          data: channelsData.channels.map((c: any) => ({ 
            id: c.id, name: c.name, is_private: c.is_private 
          }))
        });

      case "send":
        const { channel, text } = params;
        if (!channel || !text) throw new Error("channel et text requis");
        
        const sendRes = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
          method: "POST",
          headers: slackHeaders,
          body: JSON.stringify({ channel, text })
        });
        const sendData = await sendRes.json();
        if (!sendData.ok) throw new Error(sendData.error);
        return NextResponse.json({ success: true, data: sendData });

      case "messages":
        const { channel: msgChannel, limit = 10 } = params;
        if (!msgChannel) throw new Error("channel requis");
        
        const messagesRes = await fetch(`${SLACK_API_BASE}/conversations.history`, {
          method: "POST",
          headers: slackHeaders,
          body: JSON.stringify({ channel: msgChannel, limit })
        });
        const messagesData = await messagesRes.json();
        if (!messagesData.ok) throw new Error(messagesData.error);
        return NextResponse.json({ success: true, data: messagesData.messages });

      default:
        return NextResponse.json({ error: `Action '${action}' non supportée` }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Slack MCP Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur inconnue" 
    }, { status: 500 });
  }
}
