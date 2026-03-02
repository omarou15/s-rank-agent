import { NextRequest } from "next/server";
import { headers } from "next/headers";

export interface ConnectorContext {
  token: string;
  userId?: string;
  mode: "on-demand" | "always-on";
}

export function getConnectorContext(req: NextRequest): ConnectorContext {
  const headersList = headers();
  const token = headersList.get("x-connector-token");
  const userId = headersList.get("x-user-id");
  const mode = headersList.get("x-connector-mode") as "on-demand" | "always-on" || "on-demand";

  if (!token) {
    throw new Error("Token de connecteur manquant");
  }

  return {
    token,
    userId: userId || undefined,
    mode
  };
}

export function shouldExecute(mode: "on-demand" | "always-on", action: string): boolean {
  // Always-on: toutes les actions sont autorisées automatiquement
  if (mode === "always-on") return true;
  
  // On-demand: seules les actions de lecture/vérification sont autorisées sans confirmation
  const readOnlyActions = ["verify", "repos", "channels", "users", "files", "projects", "deployments"];
  return readOnlyActions.includes(action);
}

export function createMCPResponse(success: boolean, data?: any, error?: string, requiresConfirmation?: boolean) {
  return {
    success,
    data,
    error,
    requiresConfirmation: requiresConfirmation || false
  };
}
