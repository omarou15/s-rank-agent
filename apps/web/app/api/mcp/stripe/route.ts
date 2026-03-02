import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export async function POST(req: NextRequest) {
  try {
    const headersList = headers();
    const token = headersList.get("x-connector-token");
    
    if (!token) {
      return NextResponse.json({ error: "Token Stripe manquant" }, { status: 401 });
    }

    const { action, ...params } = await req.json();
    const stripeHeaders = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded"
    };

    switch (action) {
      case "verify":
        const balanceRes = await fetch(`${STRIPE_API_BASE}/balance`, { headers: stripeHeaders });
        if (!balanceRes.ok) throw new Error("Token Stripe invalide");
        const balance = await balanceRes.json();
        return NextResponse.json({ success: true, data: balance });

      case "customers":
        const customersRes = await fetch(`${STRIPE_API_BASE}/customers?limit=100`, { headers: stripeHeaders });
        const customers = await customersRes.json();
        return NextResponse.json({ success: true, data: customers.data });

      case "payments":
        const paymentsRes = await fetch(`${STRIPE_API_BASE}/charges?limit=100`, { headers: stripeHeaders });
        const payments = await paymentsRes.json();
        return NextResponse.json({ success: true, data: payments.data });

      case "products":
        const productsRes = await fetch(`${STRIPE_API_BASE}/products?limit=100`, { headers: stripeHeaders });
        const products = await productsRes.json();
        return NextResponse.json({ success: true, data: products.data });

      case "create-product":
        const { name, description, price, currency = "eur" } = params;
        if (!name || !price) throw new Error("name et price requis");
        
        // Create product
        const productBody = new URLSearchParams({ name, description: description || "" });
        const productRes = await fetch(`${STRIPE_API_BASE}/products`, {
          method: "POST",
          headers: stripeHeaders,
          body: productBody
        });
        const product = await productRes.json();
        
        // Create price
        const priceBody = new URLSearchParams({
          product: product.id,
          unit_amount: (price * 100).toString(),
          currency
        });
        const priceRes = await fetch(`${STRIPE_API_BASE}/prices`, {
          method: "POST",
          headers: stripeHeaders,
          body: priceBody
        });
        const priceData = await priceRes.json();
        
        return NextResponse.json({ success: true, data: { product, price: priceData } });

      default:
        return NextResponse.json({ error: `Action '${action}' non supportée` }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Stripe MCP Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur inconnue" 
    }, { status: 500 });
  }
}
