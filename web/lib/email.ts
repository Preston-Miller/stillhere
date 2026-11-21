import type Stripe from "stripe";
import { siteUrl, stripe } from "@/lib/stripe";
import { PRICE_DISPLAY, SUPPORT_EMAIL } from "@/lib/content";

// The "here's your download" email, sent once per purchase through Resend's HTTP API (no SDK).
//   RESEND_API_KEY  required; without it nothing is sent (logged instead).
//   EMAIL_FROM      optional; defaults to stillhere <download@stillhereoffline.com> (the domain must be verified in Resend).
// Sent from two places so a buyer gets it even if one path fails: the Stripe webhook and the /download page.
// Duplicates are stopped twice over: a flag in the Checkout Session's metadata (permanent) and Resend's
// Idempotency-Key (covers the two paths racing in the same second).

const SENT_FLAG = "download_email_sent";

export function downloadUrl(sessionId: string): string {
  return `${siteUrl()}/download?session_id=${encodeURIComponent(sessionId)}`;
}

export async function sendDownloadEmail(session: Stripe.Checkout.Session): Promise<"sent" | "already" | "skipped"> {
  const to = session.customer_details?.email;
  if (!to) return "skipped";
  if (session.metadata?.[SENT_FLAG]) return "already";
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY not set; download email not sent for", session.id);
    return "skipped";
  }

  const first = session.customer_details?.name?.split(" ")[0];
  const link = downloadUrl(session.id);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `download-email/${session.id}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "stillhere <download@stillhereoffline.com>",
      to: [to],
      reply_to: SUPPORT_EMAIL,
      ...downloadEmailContent(first, link),
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);

  await stripe().checkout.sessions.update(session.id, {
    metadata: { ...(session.metadata ?? {}), [SENT_FLAG]: new Date().toISOString() },
  });
  return "sent";
}

/** Subject and bodies of the download email (exported so it can be previewed or test-sent on its own). */
export function downloadEmailContent(first: string | undefined, link: string) {
  return { subject: "Your stillhere download", html: html(first, link), text: text(first, link) };
}

function text(first: string | undefined, link: string): string {
  return [
    `Thanks${first ? `, ${first}` : ""}. Your stillhere purchase is confirmed.`,
    "",
    "Download it on your Mac or Windows computer (not your phone):",
    link,
    "",
    "Keep this email. That link is your receipt, and you can use it to download stillhere again any time.",
    "",
    "Open it once while you still have internet. The first launch downloads the AI (3 to 7 GB) and lets you add",
    "offline maps. After that it works with no connection. Don't wait for an emergency to open it the first time.",
    "",
    `Step-by-step install help (on Windows there's a one-time warning to click past): ${siteUrl()}/install`,
    "",
    "Questions, or want a refund within 30 days? Just reply to this email.",
    "",
    "stillhere",
  ].join("\n");
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function html(first: string | undefined, link: string): string {
  const p = (s: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#2b2d29">${s}</p>`;
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
<p style="margin:0 0 24px;font-size:22px;font-weight:600;color:#0c0e0b">stillhere</p>
${p(`Thanks${first ? `, ${esc(first)}` : ""}. Your purchase is confirmed (${PRICE_DISPLAY}).`)}
${p("Download it on your <b>Mac or Windows computer</b>, not your phone:")}
<p style="margin:0 0 24px"><a href="${esc(link)}" style="display:inline-block;background:#e3a72a;color:#0c0e0b;text-decoration:none;font-weight:600;font-size:16px;padding:12px 22px;border-radius:8px">Go to your download</a></p>
${p("Keep this email. That link is your receipt, and you can use it to download stillhere again any time.")}
${p("<b>Open it once while you still have internet.</b> The first launch downloads the AI (3 to 7 GB) and lets you add offline maps. After that it works with no connection. Don't wait for an emergency to open it the first time.")}
${p(`<a href="${siteUrl()}/install" style="color:#9a6b00">Step-by-step install help</a>, including the one-time warning Windows shows.`)}
${p("Questions, or want a refund within 30 days? Just reply to this email.")}
</div></body></html>`;
}
