export type Plan = "starter" | "pro" | "business";

export type TrustLevel = 1 | 2 | 3 | 4;

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  plan: Plan;
  trustLevel: TrustLevel;
  apiKeyEncrypted: string | null;
  apiKeyValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  trustLevel: TrustLevel;
  agentMode: "on-demand" | "always-on";
  theme: "dark"; // dark mode only for MVP
  expertMode: boolean;
}
