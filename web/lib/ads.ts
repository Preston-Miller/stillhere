import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { siteUrl, stripe } from "./stripe";

/*
 * Purchase reporting for ads (server side). See app/ad-tags.tsx for the browser tags.
 *
 * A purchase is reported once: the first time its receipt page is opened within a day of buying,
 * marked by a flag in the Checkout Session's metadata. Ad platforms only ever get an opaque order ID,
 * never the Checkout Session ID (that is the download link).
 */

const FLAG = "ads_purchase_reported";
const FRESH_MS = 24 * 60 * 60 * 1000;
const META_API = "https://graph.facebook.com/v23.0";

export type PurchaseConversion = { orderId: string; value: number; currency: string };

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Same order, same ID, but it can't be turned back into the session ID. */
export function opaqueOrderId(sessionId: string): string {
  return `sh_${sha256(`stillhere-order:${sessionId}`).slice(0, 24)}`;
}

/**
 * Returns the purchase to report if this is the first look at a fresh, paid order, and marks it
 * reported. Returns null for old orders, repeat visits and free (100%-off) orders.
 */
export async function claimPurchaseConversion(session: Stripe.Checkout.Session): Promise<PurchaseConversion | null> {
  if (session.metadata?.[FLAG]) return null;
  if (!session.amount_total || session.amount_total <= 0) return null;
  if (Date.now() - session.created * 1000 > FRESH_MS) return null;
  try {
    // Metadata updates merge keys, so this leaves the email flag alone.
    await stripe().checkout.sessions.update(session.id, { metadata: { [FLAG]: new Date().toISOString() } });
  } catch (err) {
    console.error("could not flag purchase conversion", err);
    return null;
  }
  return {
    orderId: opaqueOrderId(session.id),
    value: session.amount_total / 100,
    currency: (session.currency ?? "usd").toUpperCase(),
  };
}

export type BrowserInfo = { ip?: string; userAgent?: string; fbp?: string; fbc?: string };

/** Meta Conversions API: the Purchase event, sent from the server. Skipped unless both Meta settings exist. */
export async function sendMetaPurchase(
  session: Stripe.Checkout.Session,
  purchase: PurchaseConversion,
  browser: BrowserInfo,
): Promise<void> {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token) return;

  const email = session.customer_details?.email?.trim().toLowerCase();
  const country = session.customer_details?.address?.country?.toLowerCase();
  const event = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: purchase.orderId,
    action_source: "website",
    // A clean address: the real one carries the receipt.
    event_source_url: `${siteUrl()}/download`,
    user_data: {
      ...(email && { em: [sha256(email)] }),
      ...(country && { country: [sha256(country)] }),
      ...(browser.ip && { client_ip_address: browser.ip }),
      ...(browser.userAgent && { client_user_agent: browser.userAgent }),
      ...(browser.fbp && { fbp: browser.fbp }),
      ...(browser.fbc && { fbc: browser.fbc }),
    },
    custom_data: { currency: purchase.currency, value: purchase.value, order_id: purchase.orderId },
  };
  const body: Record<string, unknown> = { data: [event] };
  // Set META_TEST_EVENT_CODE to see events in Events Manager → Test events without counting them.
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;

  const res = await fetch(`${META_API}/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error("meta purchase event failed", res.status, await res.text());
}
