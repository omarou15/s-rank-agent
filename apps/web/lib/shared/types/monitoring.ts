export type ActivityAction =
  | "chat_message"
  | "code_execution"
  | "file_created"
  | "file_modified"
  | "file_deleted"
  | "file_moved"
  | "connector_action"
  | "skill_installed"
  | "skill_removed"
  | "server_started"
  | "server_stopped"
  | "deployment"
  | "error";

export type ActivityStatus = "success" | "error" | "pending" | "cancelled";

export interface ActivityLog {
  id: string;
  userId: string;
  action: ActivityAction;
  status: ActivityStatus;
  description: string;
  details: Record<string, unknown> | null;
  tokensUsed: number | null;
  costUsd: number | null;
  duration: number | null; // ms
  createdAt: Date;
}

export interface UsageStats {
  period: "day" | "week" | "month";
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCostUsd: number;
  totalCodeExecutions: number;
  totalFileOperations: number;
  totalConnectorActions: number;
  dataPoints: UsageDataPoint[];
}

export interface UsageDataPoint {
  date: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  codeExecutions: number;
}

export interface DashboardSummary {
  server: {
    status: string;
    cpuPercent: number;
    ramPercent: number;
    diskPercent: number;
  };
  usage: {
    todayTokens: number;
    todayCost: number;
    monthTokens: number;
    monthCost: number;
  };
  connectors: {
    total: number;
    active: number;
    errors: number;
  };
  skills: {
    installed: number;
    active: number;
  };
  agent: {
    mode: "on-demand" | "always-on";
    activeTasks: number;
    trustLevel: number;
  };
}
