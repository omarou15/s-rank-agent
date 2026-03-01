import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { Server as SocketServer } from "socket.io";
import { createServer } from "http";

// Routes
import { authRoutes } from "./routes/auth";
import { chatRoutes } from "./routes/chat";
import { fileRoutes } from "./routes/files";
import { connectorRoutes } from "./routes/connectors";
import { skillRoutes } from "./routes/skills";
import { serverRoutes } from "./routes/servers";
import { monitoringRoutes } from "./routes/monitoring";
import { billingRoutes } from "./routes/billing";
import { settingsRoutes } from "./routes/settings";

// Middleware
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";

const app = new Hono();

// ── Global Middleware ──
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:3000",
      "https://app.s-rank-agent.com",
      /\.vercel\.app$/,
    ],
    credentials: true,
  })
);

// ── Health Check ──
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "s-rank-agent-api",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});

// ── Public Routes (no auth) ──
app.route("/auth", authRoutes);
app.route("/billing", billingRoutes);

// ── Protected Routes ──
app.use("/chat/*", authMiddleware);
app.use("/files/*", authMiddleware);
app.use("/connectors/*", authMiddleware);
app.use("/skills/*", authMiddleware);
app.use("/servers/*", authMiddleware);
app.use("/monitoring/*", authMiddleware);
app.use("/settings/*", authMiddleware);

app.use("/chat/*", rateLimitMiddleware);

app.route("/chat", chatRoutes);
app.route("/files", fileRoutes);
app.route("/connectors", connectorRoutes);
app.route("/skills", skillRoutes);
app.route("/servers", serverRoutes);
app.route("/monitoring", monitoringRoutes);
app.route("/settings", settingsRoutes);

// ── 404 ──
app.notFound((c) => {
  return c.json({ error: "Not Found", path: c.req.path }, 404);
});

// ── Error Handler ──
app.onError((err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err.message);
  return c.json(
    {
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500
  );
});

// ── Start Server with Socket.IO ──
const PORT = parseInt(process.env.PORT || "4000", 10);

const httpServer = createServer(serve({ fetch: app.fetch, port: PORT }).server!);

// WebSocket server for real-time features
const io = new SocketServer(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://app.s-rank-agent.com",
      /\.vercel\.app$/,
    ],
    credentials: true,
  },
});

// Setup authenticated WebSocket handlers
import { setupWebSocket } from "./ws/handler";
setupWebSocket(io);

// Export for route handlers to emit events
export { io };

console.log(`
╔══════════════════════════════════════════╗
║         🏆 S-RANK AGENT API             ║
║         Running on port ${PORT}            ║
║         Environment: ${process.env.NODE_ENV || "development"}     ║
╚══════════════════════════════════════════╝
`);
