import Stripe from "stripe";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key);
  }
  return client;
}

/**
 * Returns the session if it's a completed purchase that still counts, otherwise null.
 * A fully refunded or disputed charge revokes the download (payment_status stays "paid" after a refund,
 * so the charge has to be checked). Partial refunds keep access. 100%-off promo codes count as paid.
 */
export async function getPaidSession(sessionId: string | undefined | null) {
  if (!sessionId || !sessionId.startsWith("cs_")) return null;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge"],
    });
    if (session.payment_status === "no_payment_required" && session.status === "complete") return session;
    if (session.payment_status !== "paid") return null;
    const pi = session.payment_intent;
    const charge = pi && typeof pi !== "string" ? pi.latest_charge : null;
    if (charge && typeof charge !== "string" && (charge.refunded || charge.disputed)) return null;
    return session;
  } catch {
    return null;
  }
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
