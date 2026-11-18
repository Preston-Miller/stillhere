import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    // Signature verification needs the raw body.
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (err) {
    console.error("webhook signature failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // TODO: email the download link (e.g. Resend):
      //   `${siteUrl()}/download?session_id=${session.id}` → session.customer_details?.email
      console.log("purchase", session.id, session.customer_details?.email, session.amount_total);
      break;
    }
    default:
      break;
  }

  return Response.json({ received: true });
}
