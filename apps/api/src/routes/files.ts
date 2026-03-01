import { Hono } from "hono";
import { db } from "../db";
import { servers, activityLogs } from "../db/schema";
import { eq } from "drizzle-orm";
import { sshService } from "../services/ssh";
import { filePathSchema } from "@s-rank/shared";

export const fileRoutes = new Hono();

async function requireServer(userId: string) {
  const server = await db.query.servers.findFirst({ where: eq(servers.userId, userId) });
  if (!server || server.status !== "running") throw new Error("SERVER_NOT_RUNNING");
  return server;
}

fileRoutes.get("/list", async (c) => {
  const userId = c.get("userId");
  const path = c.req.query("path") || "/home/agent";
  const validation = filePathSchema.safeParse(path);
  if (!validation.success) return c.json({ error: "Invalid path" }, 400);

  try {
    await requireServer(userId);
    const result = await sshService.exec(userId, `ls -la --time-style=long-iso "${path}" 2>/dev/null | tail -n +2`);
    if (result.exitCode !== 0) return c.json({ error: "Directory not found", path }, 404);

    const files = result.stdout.split("\n").filter(Boolean).map((line) => {
      const parts = line.split(/\s+/);
      const perms = parts[0];
      const size = parseInt(parts[4]) || 0;
      const name = parts.slice(7).join(" ");
      if (name === "." || name === "..") return null;
      const isDir = perms.startsWith("d");
      const ext = isDir ? null : name.includes(".") ? name.split(".").pop() : null;
      return { name, path: `${path}/${name}`.replace("//", "/"), type: isDir ? "directory" : "file", size, modified: `${parts[5]}T${parts[6]}`, extension: ext, permissions: perms };
    }).filter(Boolean);

    return c.json({ path, files });
  } catch (err: any) {
    if (err.message === "SERVER_NOT_RUNNING") return c.json({ error: "Server not running" }, 400);
    return c.json({ error: err.message }, 500);
  }
});

fileRoutes.get("/read", async (c) => {
  const userId = c.get("userId");
  const path = c.req.query("path");
  if (!path) return c.json({ error: "Path required" }, 400);
  try {
    await requireServer(userId);
    const content = await sshService.readFile(userId, path);
    const stat = await sshService.exec(userId, `stat -c '%s' "${path}" 2>/dev/null`);
    return c.json({ path, content, size: parseInt(stat.stdout.trim()) || 0 });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

fileRoutes.post("/write", async (c) => {
  const userId = c.get("userId");
  const { path, content } = await c.req.json();
  if (!path || content === undefined) return c.json({ error: "Path and content required" }, 400);
  try {
    await requireServer(userId);
    await sshService.writeFile(userId, path, content);
    await db.insert(activityLogs).values({ userId, action: "file_created", status: "success", description: `Wrote: ${path}` });
    return c.json({ success: true, path });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

fileRoutes.post("/mkdir", async (c) => {
  const userId = c.get("userId");
  const { path } = await c.req.json();
  try { await requireServer(userId); await sshService.exec(userId, `mkdir -p "${path}"`); return c.json({ success: true, path }); }
  catch (err: any) { return c.json({ error: err.message }, 500); }
});

fileRoutes.delete("/delete", async (c) => {
  const userId = c.get("userId");
  const path = c.req.query("path");
  if (!path) return c.json({ error: "Path required" }, 400);
  const forbidden = ["/", "/home", "/home/agent", "/root", "/etc", "/var"];
  if (forbidden.includes(path)) return c.json({ error: "Cannot delete system directory" }, 403);
  try {
    await requireServer(userId);
    await sshService.deleteFile(userId, path);
    await db.insert(activityLogs).values({ userId, action: "file_modified", status: "success", description: `Deleted: ${path}` });
    return c.json({ success: true, path });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

fileRoutes.post("/move", async (c) => {
  const userId = c.get("userId");
  const { from, to } = await c.req.json();
  if (!from || !to) return c.json({ error: "from and to required" }, 400);
  try {
    await requireServer(userId);
    await sshService.moveFile(userId, from, to);
    await db.insert(activityLogs).values({ userId, action: "file_modified", status: "success", description: `Moved: ${from} → ${to}` });
    return c.json({ success: true, from, to });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

fileRoutes.get("/search", async (c) => {
  const userId = c.get("userId");
  const query = c.req.query("q");
  const path = c.req.query("path") || "/home/agent";
  if (!query) return c.json({ results: [] });
  try {
    await requireServer(userId);
    const result = await sshService.exec(userId, `find "${path}" -maxdepth 5 -name "*${query}*" -type f 2>/dev/null | head -50`);
    return c.json({ results: result.stdout.split("\n").filter(Boolean).map((p) => ({ path: p, name: p.split("/").pop() })) });
  } catch { return c.json({ results: [] }); }
});

fileRoutes.post("/upload", async (c) => {
  const userId = c.get("userId");
  const { path, content, encoding } = await c.req.json();
  if (!path || !content) return c.json({ error: "Path and content required" }, 400);
  try {
    await requireServer(userId);
    if (encoding === "base64") {
      await sshService.exec(userId, `mkdir -p "$(dirname '${path}')" && echo '${content}' | base64 -d > '${path}'`);
    } else {
      await sshService.writeFile(userId, path, content);
    }
    await db.insert(activityLogs).values({ userId, action: "file_created", status: "success", description: `Uploaded: ${path}` });
    return c.json({ success: true, path });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});
