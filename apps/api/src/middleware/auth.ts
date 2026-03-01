import { createMiddleware } from "hono/factory";
import { verifyToken } from "@clerk/backend";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

type AuthEnv = {
  Variables: {
    userId: string;
    clerkId: string;
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing or invalid token" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    if (!payload.sub) {
      return c.json({ error: "Unauthorized: Invalid token" }, 401);
    }

    // Get user from DB
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, payload.sub),
    });

    if (!user) {
      return c.json({ error: "Unauthorized: User not found" }, 401);
    }

    c.set("userId", user.id);
    c.set("clerkId", payload.sub);

    await next();
  } catch (error) {
    console.error("[AUTH] Token verification failed:", error);
    return c.json({ error: "Unauthorized: Token verification failed" }, 401);
  }
});
