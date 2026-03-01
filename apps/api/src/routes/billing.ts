import { Hono } from "hono";
import Stripe from "stripe";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export const billingRoutes = new Hono();

// ── Create Checkout Session ──
billingRoutes.post("/checkout", async (c) => {
  const { userId, priceId } = await c.req.json();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return c.json({ error: "User not found" }, 404);

  // Create or get Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, user.id));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings?billing=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings?billing=cancelled`,
    metadata: { userId: user.id },
  });

  return c.json({ url: session.url });
});

// ── Customer Portal ──
billingRoutes.post("/portal", async (c) => {
  const { userId } = await c.req.json();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user?.stripeCustomerId) {
    return c.json({ error: "No billing account" }, 400);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings`,
  });

  return c.json({ url: session.url });
});

// ── Stripe Webhook ──
billingRoutes.post("/webhook", async (c) => {
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`[BILLING] Webhook error: ${err.message}`);
    return c.json({ error: "Invalid signature" }, 400);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId) {
        // Determine plan from price
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0]?.price.id;

        const planMap: Record<string, string> = {
          [process.env.STRIPE_STARTER_PRICE_ID!]: "starter",
          [process.env.STRIPE_PRO_PRICE_ID!]: "pro",
          [process.env.STRIPE_BUSINESS_PRICE_ID!]: "business",
        };

        const plan = planMap[priceId] || "starter";

        await db
          .update(users)
          .set({
            plan: plan as any,
            stripeSubscriptionId: session.subscription as string,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        console.log(`[BILLING] User ${userId} subscribed to ${plan}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      // Downgrade to starter
      await db
        .update(users)
        .set({
          plan: "starter",
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        })
        .where(eq(users.stripeCustomerId, subscription.customer as string));
      break;
    }
  }

  return c.json({ received: true });
});
