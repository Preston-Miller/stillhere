"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useCallback, useState } from "react";

const KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = KEY ? loadStripe(KEY) : null;

/** Stripe's payment form, embedded on this page. Without a publishable key it falls back to Stripe's hosted page. */
export function EmbeddedPay() {
  const [failed, setFailed] = useState(false);
  const fetchClientSecret = useCallback(async () => {
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.clientSecret) {
      setFailed(true);
      throw new Error(d.error ?? "Could not start checkout");
    }
    return d.clientSecret as string;
  }, []);

  if (!stripePromise || failed) {
    return (
      <div className="rounded-xl border border-line bg-panel p-6 text-center">
        <p className="text-fg/90">{failed ? "The payment form didn't load." : "Pay securely with Stripe."}</p>
        <form action="/api/checkout" method="POST" className="mt-4">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-amber px-6 py-3 font-semibold text-bg hover:brightness-110"
          >
            Continue to payment
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-line bg-panel">
      {/* Sits behind Stripe's form and shows until the form paints over it. */}
      <p className="absolute inset-x-0 top-40 text-center text-sm text-muted">Loading secure payment…</p>
      <div className="relative">
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
