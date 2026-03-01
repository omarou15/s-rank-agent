"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { ws } from "@/lib/socket";
import { useAppStore } from "@/lib/stores/app-store";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

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
          userId: string;
          plan: any;
          trustLevel: any;
          agentMode: any;
          apiKeyValid: boolean;
        }>("/settings/profile");

        if (profile) {
          setUser({
            userId: profile.userId,
            plan: profile.plan,
            trustLevel: profile.trustLevel,
            agentMode: profile.agentMode,
            apiKeyValid: profile.apiKeyValid,
          });
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };

    init();

    return () => {
      ws.disconnect();
    };
  }, [isLoaded, isSignedIn, getToken, setUser]);

  return <>{children}</>;
}
