import { Hono } from "hono";
import { db } from "../db";
import { skills, userSkills } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const skillRoutes = new Hono();

// ── Marketplace (all available skills) ──
skillRoutes.get("/marketplace", async (c) => {
  const category = c.req.query("category");
  const search = c.req.query("q");
  const sort = c.req.query("sort") || "popular";

  let allSkills = await db.query.skills.findMany({
    orderBy: sort === "popular"
      ? [desc(skills.installs)]
      : sort === "rating"
        ? [desc(skills.rating)]
        : [desc(skills.createdAt)],
    limit: 50,
  });

  if (category) {
    allSkills = allSkills.filter((s) => s.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    allSkills = allSkills.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
    );
  }

  return c.json({ skills: allSkills });
});

// ── User's installed skills ──
skillRoutes.get("/installed", async (c) => {
  const userId = c.get("userId");

  const installed = await db.query.userSkills.findMany({
    where: eq(userSkills.userId, userId),
  });

  // Get skill details for installed skills
  const skillIds = installed.map((us) => us.skillId);
  const skillDetails = skillIds.length > 0
    ? await db.query.skills.findMany({
        where: sql`${skills.id} = ANY(${skillIds})`,
      })
    : [];

  return c.json({
    skills: installed.map((us) => ({
      ...us,
      skill: skillDetails.find((s) => s.id === us.skillId),
    })),
  });
});

// ── Install a skill ──
skillRoutes.post("/install", async (c) => {
  const userId = c.get("userId");
  const { skillId } = await c.req.json();

  // Check if already installed
  const existing = await db.query.userSkills.findFirst({
    where: and(eq(userSkills.userId, userId), eq(userSkills.skillId, skillId)),
  });

  if (existing) {
    return c.json({ error: "Skill already installed" }, 400);
  }

  // Install
  await db.insert(userSkills).values({ userId, skillId, active: true });

  // Increment install count
  await db
    .update(skills)
    .set({ installs: sql`${skills.installs} + 1` })
    .where(eq(skills.id, skillId));

  // Install dependencies on user's server via SSH
  const skill = await db.query.skills.findFirst({ where: eq(skills.id, skillId) });
  if (skill?.config) {
    try {
      const { sshService } = await import("../services/ssh");
      const config = skill.config as any;
      const cmds: string[] = [];

      if (config.dependencies?.pip?.length) {
        cmds.push(`pip3 install ${config.dependencies.pip.join(" ")} 2>&1`);
      }
      if (config.dependencies?.npm?.length) {
        cmds.push(`npm install -g ${config.dependencies.npm.join(" ")} 2>&1`);
      }
      if (config.dependencies?.apt?.length) {
        cmds.push(`apt-get install -y ${config.dependencies.apt.join(" ")} 2>&1`);
      }

      for (const cmd of cmds) {
        await sshService.exec(userId, cmd, 120000);
      }
    } catch (err) {
      console.error(`[SKILLS] Failed to install deps for ${skillId}:`, err);
      // Non-blocking: skill is still marked as installed
    }
  }

  return c.json({ success: true });
});

// ── Uninstall a skill ──
skillRoutes.post("/uninstall", async (c) => {
  const userId = c.get("userId");
  const { skillId } = await c.req.json();

  await db
    .delete(userSkills)
    .where(and(eq(userSkills.userId, userId), eq(userSkills.skillId, skillId)));

  return c.json({ success: true });
});
