# OffGridAI web

@AGENTS.md

Marketing site + checkout + delivery for OffGridAI (offline LLM + RAG over the survival PDFs in `../knowledge`). Next.js 16 App Router, Tailwind v4, deployed on Vercel.

- **Current mode: selling (live at www.stillhereoffline.com since 2026-11-17).** `BuyButton` on the homepage posts to `/api/checkout`. The old waitlist (`app/waitlist.tsx`, `/api/click`, `/api/waitlist`, Neon via `lib/db.ts`, `/api/admin` with Basic auth `ADMIN_PASSWORD`) is unused but kept for its signup data. The installer is `releases/Stillhere-<ver>.dmg` in the private R2 bucket `stillhere-releases`. `/install` is the "How to open Stillhere" help page for the macOS unsigned-app warning.
- Copy, price display, topic list, specs, FAQ: `lib/content.ts`. `PRICE_DISPLAY` must match the Stripe Price.
- Purchase flow (no DB): `/api/checkout` → Stripe Checkout → `/download?session_id=cs_...` (verifies `payment_status === "paid"`) → `/api/download` re-verifies and 302s to a 1h R2 presigned URL. The session ID is the receipt; links are re-usable.
- Webhook `/api/webhooks/stripe` verifies signature; emailing the link is a TODO.
- Env vars: see `.env.example`.
