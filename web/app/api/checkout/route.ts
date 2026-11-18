import { siteUrl, stripe } from "@/lib/stripe";

export async function POST() {
  const price = process.env.STRIPE_PRICE_ID;
  if (!price) {
    return new Response("Checkout is not configured (STRIPE_PRICE_ID missing).", { status: 500 });
  }

  const base = siteUrl();
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      // Shown above the Pay button: requirements first, plus the 30-day refund promise.
      custom_text: {
        submit: {
          message:
            "stillhere needs a Mac with Apple Silicon (M1 or newer), macOS 14 or later, and 16 GB of memory. Not happy with it? Email us within 30 days for a full refund.",
        },
      },
      customer_creation: "always",
      success_url: `${base}/download?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?canceled=1#buy`,
    });
    return Response.redirect(session.url!, 303);
  } catch (err) {
    console.error("checkout error", err);
    return new Response("Could not start checkout. Please try again.", { status: 500 });
  }
}
