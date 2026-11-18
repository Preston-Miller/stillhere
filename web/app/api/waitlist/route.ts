import { addSignup } from "@/lib/db";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request: Request) {
  // Retired: the site sells now and no page shows the waitlist form. Closed so nobody can script junk rows
  // into the database. Set WAITLIST_OPEN=1 to reopen (add rate limiting first).
  if (process.env.WAITLIST_OPEN !== "1") return new Response(null, { status: 410 });
  let body: { email?: unknown; source?: unknown; website?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  // Honeypot: real people never fill the hidden "website" field. Pretend success for bots.
  if (typeof body.website === "string" && body.website.trim()) return Response.json({ ok: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) {
    return Response.json({ error: "That email doesn't look right." }, { status: 400 });
  }
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : "site";

  try {
    await addSignup(email, source); // duplicates are fine: they're already on the list
    return Response.json({ ok: true });
  } catch (err) {
    console.error("waitlist error", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
