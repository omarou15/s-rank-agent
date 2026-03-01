import { sshService, type ExecResult } from "./ssh";
import { db } from "../db";
import { activityLogs } from "../db/schema";

export type Language = "python" | "javascript" | "typescript" | "bash" | "shell";

interface ExecutionOptions {
  userId: string;
  code: string;
  language: Language;
  timeout?: number;
  cwd?: string;
}

const LANGUAGE_COMMANDS: Record<Language, (code: string, cwd: string) => string> = {
  python: (code, cwd) =>
    `cd "${cwd}" && timeout 60 python3 -c ${JSON.stringify(code)} 2>&1`,
  javascript: (code, cwd) =>
    `cd "${cwd}" && timeout 60 node -e ${JSON.stringify(code)} 2>&1`,
  typescript: (code, cwd) =>
    `cd "${cwd}" && timeout 60 npx ts-node -e ${JSON.stringify(code)} 2>&1`,
  bash: (code, cwd) =>
    `cd "${cwd}" && timeout 60 bash -c ${JSON.stringify(code)} 2>&1`,
  shell: (code, cwd) =>
    `cd "${cwd}" && timeout 60 sh -c ${JSON.stringify(code)} 2>&1`,
};

export class ExecutionService {
  async execute(opts: ExecutionOptions): Promise<ExecResult> {
    const {
      userId,
      code,
      language,
      timeout = 60000,
      cwd = "/home/agent/workspace",
    } = opts;

    const commandBuilder = LANGUAGE_COMMANDS[language];
    if (!commandBuilder) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const command = commandBuilder(code, cwd);
    const start = Date.now();

    try {
      const result = await sshService.exec(userId, command, timeout);

      // Log execution
      await db.insert(activityLogs).values({
        userId,
        action: "code_execution",
        status: result.exitCode === 0 ? "success" : "error",
        description: `${language}: ${code.slice(0, 100)}${code.length > 100 ? "..." : ""}`,
        details: {
          language,
          exitCode: result.exitCode,
          outputLength: result.stdout.length + result.stderr.length,
        },
        durationMs: result.duration,
      });

      return result;
    } catch (error: any) {
      await db.insert(activityLogs).values({
        userId,
        action: "code_execution",
        status: "error",
        description: `${language} execution failed: ${error.message}`,
        durationMs: Date.now() - start,
      });

      throw error;
    }
  }

  detectLanguage(code: string): Language {
    const trimmed = code.trim();

    if (trimmed.startsWith("#!/bin/bash") || trimmed.startsWith("#!/bin/sh")) {
      return "bash";
    }

    if (
      trimmed.includes("import ") && trimmed.includes("from ") ||
      trimmed.includes("def ") ||
      trimmed.includes("print(")
    ) {
      return "python";
    }

    if (
      trimmed.includes("interface ") ||
      trimmed.includes(": string") ||
      trimmed.includes(": number") ||
      trimmed.includes("<T>")
    ) {
      return "typescript";
    }

    if (
      trimmed.includes("const ") ||
      trimmed.includes("let ") ||
      trimmed.includes("console.log") ||
      trimmed.includes("require(") ||
      trimmed.includes("=>")
    ) {
      return "javascript";
    }

    if (
      trimmed.startsWith("ls ") ||
      trimmed.startsWith("cd ") ||
      trimmed.startsWith("mkdir ") ||
      trimmed.startsWith("cat ") ||
      trimmed.includes(" | ") ||
      trimmed.startsWith("apt ") ||
      trimmed.startsWith("npm ") ||
      trimmed.startsWith("pip ")
    ) {
      return "bash";
    }

    return "bash";
  }
}

export const executionService = new ExecutionService();
