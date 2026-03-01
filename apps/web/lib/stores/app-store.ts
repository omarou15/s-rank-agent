import { create } from "zustand";
import type { TrustLevel, Plan } from "@s-rank/shared";

interface AppStore {
  // User
  userId: string | null;
  plan: Plan;
  trustLevel: TrustLevel;
  agentMode: "on-demand" | "always-on";
  apiKeyValid: boolean;

  // Server
  serverStatus: "provisioning" | "running" | "stopped" | "error" | null;
  serverIp: string | null;

  // UI
  sidebarCollapsed: boolean;

  // Actions
  setUser: (data: {
    userId: string;
    plan: Plan;
    trustLevel: TrustLevel;
    agentMode: "on-demand" | "always-on";
    apiKeyValid: boolean;
  }) => void;
  setTrustLevel: (level: TrustLevel) => void;
  setAgentMode: (mode: "on-demand" | "always-on") => void;
  setServerStatus: (status: AppStore["serverStatus"]) => void;
  setServerIp: (ip: string | null) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  userId: null,
  plan: "starter",
  trustLevel: 2,
  agentMode: "on-demand",
  apiKeyValid: false,
  serverStatus: null,
  serverIp: null,
  sidebarCollapsed: false,

  setUser: (data) => set(data),
  setTrustLevel: (trustLevel) => set({ trustLevel }),
  setAgentMode: (agentMode) => set({ agentMode }),
  setServerStatus: (serverStatus) => set({ serverStatus }),
  setServerIp: (serverIp) => set({ serverIp }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
