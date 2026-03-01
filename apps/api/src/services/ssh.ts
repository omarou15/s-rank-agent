import { Client } from "ssh2";
import { db } from "../db";
import { servers } from "../db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "../utils/crypto";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export class SSHService {
  private connections: Map<string, Client> = new Map();

  async getConnection(userId: string): Promise<Client> {
    // Check cache
    const cached = this.connections.get(userId);
    if (cached) return cached;

    // Get server info
    const server = await db.query.servers.findFirst({
      where: eq(servers.userId, userId),
    });

    if (!server || !server.ipv4 || server.status !== "running") {
      throw new Error("Server not available");
    }

    // Get SSH key
    const privateKey = server.sshKeyEncrypted
      ? decrypt(server.sshKeyEncrypted)
      : undefined;

    return new Promise((resolve, reject) => {
      const conn = new Client();

      conn.on("ready", () => {
        this.connections.set(userId, conn);
        resolve(conn);
      });

      conn.on("error", (err) => {
        this.connections.delete(userId);
        reject(new Error(`SSH connection failed: ${err.message}`));
      });

      conn.on("close", () => {
        this.connections.delete(userId);
      });

      conn.connect({
        host: server.ipv4,
        port: 22,
        username: "root",
        privateKey,
        readyTimeout: 10000,
      });
    });
  }

  async exec(userId: string, command: string, timeout = 30000): Promise<ExecResult> {
    const conn = await this.getConnection(userId);
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          return reject(err);
        }

        let stdout = "";
        let stderr = "";

        stream.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on("close", (code: number) => {
          clearTimeout(timer);
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code || 0,
            duration: Date.now() - start,
          });
        });
      });
    });
  }

  async listFiles(userId: string, path: string): Promise<string> {
    const result = await this.exec(
      userId,
      `ls -la --time-style=long-iso "${path}" 2>/dev/null | tail -n +2`
    );
    return result.stdout;
  }

  async readFile(userId: string, path: string): Promise<string> {
    const result = await this.exec(userId, `cat "${path}"`);
    if (result.exitCode !== 0) {
      throw new Error(`Cannot read file: ${result.stderr}`);
    }
    return result.stdout;
  }

  async writeFile(userId: string, path: string, content: string): Promise<void> {
    const escaped = content.replace(/'/g, "'\\''");
    const result = await this.exec(
      userId,
      `mkdir -p "$(dirname '${path}')" && cat > '${path}' << 'SRANK_EOF'\n${escaped}\nSRANK_EOF`
    );
    if (result.exitCode !== 0) {
      throw new Error(`Cannot write file: ${result.stderr}`);
    }
  }

  async deleteFile(userId: string, path: string): Promise<void> {
    await this.exec(userId, `rm -rf "${path}"`);
  }

  async moveFile(userId: string, from: string, to: string): Promise<void> {
    await this.exec(userId, `mv "${from}" "${to}"`);
  }

  async getMetrics(userId: string) {
    const [cpu, mem, disk, uptime] = await Promise.all([
      this.exec(userId, "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'"),
      this.exec(userId, "free -m | awk 'NR==2{printf \"%s %s\", $3, $2}'"),
      this.exec(userId, "df -BG / | awk 'NR==2{printf \"%s %s\", $3, $2}'"),
      this.exec(userId, "cat /proc/uptime | awk '{print $1}'"),
    ]);

    const [ramUsed, ramTotal] = mem.stdout.split(" ").map(Number);
    const [diskUsed, diskTotal] = disk.stdout
      .replace(/G/g, "")
      .split(" ")
      .map(Number);

    return {
      cpuPercent: parseFloat(cpu.stdout) || 0,
      ramUsedMb: ramUsed || 0,
      ramTotalMb: ramTotal || 0,
      diskUsedGb: diskUsed || 0,
      diskTotalGb: diskTotal || 0,
      uptimeSeconds: parseInt(uptime.stdout) || 0,
    };
  }

  disconnect(userId: string) {
    const conn = this.connections.get(userId);
    if (conn) {
      conn.end();
      this.connections.delete(userId);
    }
  }

  disconnectAll() {
    this.connections.forEach((conn) => conn.end());
    this.connections.clear();
  }
}

export const sshService = new SSHService();
