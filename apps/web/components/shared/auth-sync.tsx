"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { ws } from "@/lib/socket";
import { useAppStore } from "@/lib/stores/app-store";

export function AuthSync({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;

    const init = async () => {
      const token = await getToken();
      if (!token) return;

      // Set API token
      api.setToken(token);

      // Connect WebSocket
      ws.connect(token);

      // Load user profile
      try {
        const profile = await api.get<{
          user: {
            id: string;
            plan: any;
            trustLevel: number;
            agentMode: string;
            apiKeyValid: boolean;
          };
          server: { status: string; ipv4: string | null } | null;
        }>("/settings/profile");

        useAppStore.getState().setUser({
          userId: profile.user.id,
          plan: profile.user.plan,
          trustLevel: profile.user.trustLevel as any,
          agentMode: profile.user.agentMode as any,
          apiKeyValid: profile.user.apiKeyValid,
        });

        if (profile.server) {
          useAppStore.getState().setServerStatus(profile.server.status as any);
          useAppStore.getState().setServerIp(profile.server.ipv4);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };

    init();

    return () => {
      ws.disconnect();
    };
  }, [isSignedIn, getToken]);

  return <>{children}</>;
}
