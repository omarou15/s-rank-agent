import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_SK = process.env.STRIPE_SECRET_KEY || "";

const WALLET_PRICES: Record<string, { priceId: string; amount: number }> = {
  "10": { priceId: "price_1T6Nio0TpM7C7af1khTYXwjE", amount: 10 },
  "25": { priceId: "price_1T6Nio0TpM7C7af1ewQuIbpj", amount: 25 },
  "50": { priceId: "price_1T6Nio0TpM7C7af1J7hpHmqC", amount: 50 },
  "100": { priceId: "price_1T6Nip0TpM7C7af12sUMetxA", amount: 100 },
};

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json();
    const tier = WALLET_PRICES[String(amount)];
    if (!tier) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const origin = req.headers.get("origin") || "https://web-phi-three-57.vercel.app";

    const params = new URLSearchParams({
      mode: "payment",
      "payment_method_types[0]": "card",
      "line_items[0][price]": tier.priceId,
      "line_items[0][quantity]": "1",
      success_url: `${origin}/settings/billing?wallet_success=true&amount=${amount}`,
      cancel_url: `${origin}/settings/billing?wallet_canceled=true`,
      "metadata[type]": "wallet_topup",
      "metadata[amount]": String(amount),
    });

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

    return NextResponse.json({ url: data.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
