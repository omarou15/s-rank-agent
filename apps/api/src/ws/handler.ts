import { Server as SocketServer, Socket } from "socket.io";
import { verifyToken } from "@clerk/backend";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { executionService } from "../services/execution";
import type { Language } from "../services/execution";

export function setupWebSocket(io: SocketServer) {
  // Auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });

      if (!payload.sub) {
        return next(new Error("Invalid token"));
      }

      const user = await db.query.users.findFirst({
        where: eq(users.clerkId, payload.sub),
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      (socket as any).userId = user.id;
      next();
    } catch {
      next(new Error("Token verification failed"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log(`[WS] User connected: ${userId} (${socket.id})`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // ── Execute Code ──
    socket.on("execute", async (data: { code: string; language?: string; cwd?: string }) => {
      try {
        const language = (data.language ||
          executionService.detectLanguage(data.code)) as Language;

        socket.emit("execution:start", { language });

        const result = await executionService.execute({
          userId,
          code: data.code,
          language,
          cwd: data.cwd,
        });

        socket.emit("execution:output", {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          duration: result.duration,
          language,
        });
      } catch (error: any) {
        socket.emit("execution:error", {
          message: error.message,
        });
      }
    });

    // ── Terminal (interactive) ──
    socket.on("terminal:input", async (data: { command: string }) => {
      try {
        const result = await executionService.execute({
          userId,
          code: data.command,
          language: "bash",
        });

        socket.emit("terminal:output", {
          output: result.stdout || result.stderr,
          exitCode: result.exitCode,
        });
      } catch (error: any) {
        socket.emit("terminal:output", {
          output: `Error: ${error.message}`,
          exitCode: 1,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[WS] User disconnected: ${userId}`);
    });
  });
}
