export type ServerStatus =
  | "provisioning"
  | "running"
  | "stopped"
  | "error"
  | "deleting";

export type ServerSize = "starter" | "pro" | "business";

export interface Server {
  id: string;
  userId: string;
  hetznerId: number;
  name: string;
  status: ServerStatus;
  size: ServerSize;
  ipv4: string | null;
  ipv6: string | null;
  specs: ServerSpecs;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServerSpecs {
  vcpus: number;
  ramGb: number;
  diskGb: number;
  priceMonthly: number;
}

export const SERVER_PLANS: Record<ServerSize, ServerSpecs> = {
  starter: { vcpus: 1, ramGb: 1, diskGb: 10, priceMonthly: 15 },
  pro: { vcpus: 2, ramGb: 4, diskGb: 50, priceMonthly: 39 },
  business: { vcpus: 4, ramGb: 8, diskGb: 100, priceMonthly: 79 },
};

export interface ServerMetrics {
  cpuPercent: number;
  ramUsedMb: number;
  ramTotalMb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  uptimeSeconds: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: Date;
  extension: string | null;
  children?: FileNode[];
}
