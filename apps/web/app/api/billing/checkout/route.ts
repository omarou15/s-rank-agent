import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_SK = process.env.STRIPE_SECRET_KEY!;

const PRICES: Record<string, string> = {
  starter: "price_1T6Msm0TpM7C7af1OH9o94IF",
  pro: "price_1T6Msm0TpM7C7af148Mu7b8J",
  business: "price_1T6Msn0TpM7C7af1nZuQa3Fo",
};

export async function POST(req: NextRequest) {
  try {
    const { planId, email } = await req.json();
    const priceId = PRICES[planId];
    if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const origin = req.headers.get("origin") || "https://web-phi-three-57.vercel.app";

    const params = new URLSearchParams({
      mode: "subscription",
      "payment_method_types[0]": "card",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${origin}/settings/billing?success=true&plan=${planId}`,
      cancel_url: `${origin}/settings/billing?canceled=true`,
      "metadata[planId]": planId,
    });
    if (email) params.set("customer_email", email);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SK}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });

    return NextResponse.json({ url: data.url, sessionId: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
