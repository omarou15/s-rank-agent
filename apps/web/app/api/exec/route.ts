// NOT edge runtime — this is a regular serverless function so we can use child_process
import { exec } from "child_process";
import { NextRequest, NextResponse } from "next/server";

const VPS_URL = "http://46.225.103.230:3100";
const VPS_KEY = "changeme";
const EXEC_TIMEOUT = 30_000; // 30 seconds
const MAX_OUTPUT = 50_000; // 50KB max output

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + `\n...[tronqué, ${str.length} chars total]`;
}

// Try VPS execution first
async function tryVPS(code: string, language: string): Promise<{ ok: boolean; data?: any }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout for VPS
    const res = await fetch(`${VPS_URL}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": VPS_KEY },
      body: JSON.stringify({ code, language }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false };
    const data = await res.json();
    if (data.error) return { ok: false };
    return {
      ok: true,
      data: {
        stdout: data.stdout || data.output || "",
        stderr: data.stderr || "",
        exitCode: typeof data.exitCode === "number" ? data.exitCode : (typeof data.exit_code === "number" ? data.exit_code : 0),
        duration: data.duration || 0,
        source: "vps",
      },
    };
  } catch {
    return { ok: false };
  }
}

// Local fallback execution via child_process
function execLocal(code: string, language: string): Promise<{ stdout: string; stderr: string; exitCode: number; duration: number }> {
  return new Promise((resolve) => {
    const start = Date.now();

    let cmd: string;
    switch (language) {
      case "bash":
      case "sh":
        cmd = code;
        break;
      case "node":
      case "javascript":
      case "js":
        cmd = `node -e ${JSON.stringify(code)}`;
        break;
      case "python3":
      case "python":
        // Try python3 first, might not be available on Vercel
        cmd = `python3 -c ${JSON.stringify(code)} 2>/dev/null || python -c ${JSON.stringify(code)}`;
        break;
      default:
        cmd = code;
    }

    exec(
      cmd,
      {
        timeout: EXEC_TIMEOUT,
        maxBuffer: MAX_OUTPUT * 2,
        env: { ...process.env, HOME: "/tmp", TERM: "xterm" },
        cwd: "/tmp",
        shell: "/bin/bash",
      },
      (error, stdout, stderr) => {
        const duration = Date.now() - start;
        resolve({
          stdout: truncate(stdout || "", MAX_OUTPUT),
          stderr: truncate(stderr || (error && !stdout ? error.message : "") || "", MAX_OUTPUT),
          exitCode: error ? (error as any).code || 1 : 0,
          duration,
        });
      }
    );
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, language } = body;

    if (!code) {
      return NextResponse.json({ stdout: "", stderr: "No code provided", exitCode: 1, duration: 0, source: "local" });
    }

    const lang = (language || "bash").toLowerCase();

    // 1. Try VPS first (fast timeout)
    const vps = await tryVPS(code, lang);
    if (vps.ok && vps.data) {
      return NextResponse.json(vps.data);
    }

    // 2. Fallback: local execution
    const result = await execLocal(code, lang);
    return NextResponse.json({ ...result, source: "local" });
  } catch (err: any) {
    return NextResponse.json(
      { stdout: "", stderr: `Exec error: ${err.message}`, exitCode: 1, duration: 0, source: "local" }
    );
  }
}
