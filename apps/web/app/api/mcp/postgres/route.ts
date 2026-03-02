import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const headersList = headers();
    const token = headersList.get("x-connector-token");
    
    if (!token) {
      return NextResponse.json({ error: "Connection string PostgreSQL manquant" }, { status: 401 });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "verify":
        // Simple connection test
        try {
          const { Client } = require('pg');
          const client = new Client({ connectionString: token });
          await client.connect();
          const result = await client.query('SELECT version()');
          await client.end();
          
          return NextResponse.json({ 
            success: true, 
            data: { version: result.rows[0].version }
          });
        } catch (error: any) {
          throw new Error(`Connexion échouée: ${error.message}`);
        }

      case "query":
        const { query } = params;
        if (!query) throw new Error("query SQL requise");
        
        try {
          const { Client } = require('pg');
          const client = new Client({ connectionString: token });
          await client.connect();
          const result = await client.query(query);
          await client.end();
          
          return NextResponse.json({ 
            success: true, 
            data: { rows: result.rows, rowCount: result.rowCount }
          });
        } catch (error: any) {
          throw new Error(`Erreur SQL: ${error.message}`);
        }

      default:
        return NextResponse.json({ error: `Action '${action}' non supportée` }, { status: 400 });
    }

  } catch (error: any) {
    console.error("PostgreSQL MCP Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur inconnue" 
    }, { status: 500 });
  }
}
