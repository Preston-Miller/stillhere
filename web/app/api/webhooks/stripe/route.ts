import type Stripe from "stripe";
import { getPaidSession, stripe } from "@/lib/stripe";
import { sendDownloadEmail } from "@/lib/email";

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
    // "completed" fires for card payments; bank payments complete unpaid and send "async_payment_succeeded" later.
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = await getPaidSession(event.data.object.id);
      if (!session) break; // not paid (yet)
      try {
        const result = await sendDownloadEmail(session);
        console.log("purchase", session.id, session.amount_total, "email:", result);
      } catch (err) {
        console.error("download email failed", session.id, err);
        return new Response("Email failed", { status: 500 }); // Stripe retries the webhook
      }
      break;
    }
    default:
      break;
  }

  return Response.json({ received: true });
}
