# OffGridAI web

@AGENTS.md

Marketing site + checkout + delivery for OffGridAI (offline LLM + RAG over the survival PDFs in `../knowledge`). Next.js 16 App Router, Tailwind v4, deployed on Vercel.

- **Current mode: selling (live at www.stillhereoffline.com since 2026-11-17).** `BuyButton` links to `/checkout`, which embeds Stripe Checkout (`ui_mode: "embedded_page"`, needs `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; without it, a button falls back to the hosted page via a form POST to `/api/checkout`). The old waitlist (`app/waitlist.tsx`, `/api/click`, `/api/waitlist`, Neon via `lib/db.ts`, `/api/admin` with Basic auth `ADMIN_PASSWORD`) is unused but kept for its signup data. The installer is `releases/Stillhere-<ver>.dmg` in the private R2 bucket `stillhere-releases`. `/install` is the "How to open Stillhere" help page for the macOS unsigned-app warning.
- Copy, price display, topic list, specs, FAQ: `lib/content.ts`. `PRICE_DISPLAY` must match the Stripe Price.
- Purchase flow (no DB): `/api/checkout` → Stripe Checkout → `/download?session_id=cs_...` (verifies `payment_status === "paid"`) → `/api/download` re-verifies and 302s to a 1h R2 presigned URL. The session ID is the receipt; links are re-usable.
- Download email (`lib/email.ts`, Resend): sent by the webhook `/api/webhooks/stripe` (`checkout.session.completed` / `async_payment_succeeded`) and, as a backup, by `/download` via `after()`. Sent once per purchase: flag `download_email_sent` in the Checkout Session metadata plus a Resend Idempotency-Key.
- Env vars: see `.env.example`.
