import { Hono } from "hono";
import { db } from "../db";
import { users } from "../db/schema";

export const authRoutes = new Hono();

// Clerk webhook — sync user creation/updates
authRoutes.post("/webhook", async (c) => {
  const body = await c.req.json();
  const { type, data } = body;

  switch (type) {
    case "user.created": {
      const { id, email_addresses, first_name, last_name } = data;
      const email = email_addresses?.[0]?.email_address;
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;

      if (!email) {
        return c.json({ error: "No email found" }, 400);
      }

      await db.insert(users).values({
        clerkId: id,
        email,
        name,
        plan: "starter",
        trustLevel: 2,
      });

      console.log(`[AUTH] User created: ${email}`);
      return c.json({ success: true });
    }

    case "user.updated": {
      const { id, email_addresses, first_name, last_name } = data;
      const email = email_addresses?.[0]?.email_address;
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;

      const { eq } = await import("drizzle-orm");
      await db
        .update(users)
        .set({ email: email || undefined, name, updatedAt: new Date() })
        .where(eq(users.clerkId, id));

      console.log(`[AUTH] User updated: ${id}`);
      return c.json({ success: true });
    }

    case "user.deleted": {
      const { id } = data;
      const { eq } = await import("drizzle-orm");
      await db.delete(users).where(eq(users.clerkId, id));

      console.log(`[AUTH] User deleted: ${id}`);
      return c.json({ success: true });
    }

    default:
      return c.json({ received: true });
  }
});
