import type Stripe from "stripe";
import { siteUrl, stripe } from "@/lib/stripe";
import { REQUIREMENTS_SHORT } from "@/lib/content";

// Two ways in:
//   fetch with JSON  → an embedded Checkout Session; the /checkout page mounts it and gets { clientSecret }.
//   plain form POST  → a Stripe-hosted Checkout page (fallback when JavaScript or the publishable key is missing).
export async function POST(request: Request) {
  const price = process.env.STRIPE_PRICE_ID;
  if (!price) {
    return new Response("Checkout is not configured (STRIPE_PRICE_ID missing).", { status: 500 });
  }

  const base = siteUrl();
  const embedded = (request.headers.get("content-type") ?? "").includes("application/json");
  const common: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    // Shown above the Pay button: requirements first, plus the 30-day refund promise.
    custom_text: {
      submit: {
        message: `stillhere needs ${REQUIREMENTS_SHORT}. Not happy with it? Email us within 30 days for a full refund.`,
      },
    },
    customer_creation: "always",
    // Card, Apple Pay and Link stay. Pay-later plans and extra wallets are clutter on a one-time $19.99 purchase.
    excluded_payment_method_types: ["affirm", "klarna", "cashapp", "amazon_pay"],
    // Match the site: dark panel, amber button.
    branding_settings: {
      display_name: "stillhere",
      background_color: "#141711",
      button_color: "#e3a72a",
      border_style: "rounded",
    },
  };

  try {
    if (embedded) {
      const session = await stripe().checkout.sessions.create({
        ...common,
        ui_mode: "embedded_page",
        return_url: `${base}/download?session_id={CHECKOUT_SESSION_ID}`,
      });
      return Response.json({ clientSecret: session.client_secret });
    }
    const session = await stripe().checkout.sessions.create({
      ...common,
      success_url: `${base}/download?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?canceled=1#buy`,
    });
    return Response.redirect(session.url!, 303);
  } catch (err) {
    console.error("checkout error", err);
    return embedded
      ? Response.json({ error: "Could not start checkout. Please try again." }, { status: 500 })
      : new Response("Could not start checkout. Please try again.", { status: 500 });
  }
}
