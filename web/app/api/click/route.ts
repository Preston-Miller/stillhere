import { recordClick } from "@/lib/db";

// Counts clicks on a price button, to compare against signups.
export async function POST(request: Request) {
  // Retired: the site sells now and no page shows the waitlist form. Closed so nobody can script junk rows
  // into the database. Set WAITLIST_OPEN=1 to reopen (add rate limiting first).
  if (process.env.WAITLIST_OPEN !== "1") return new Response(null, { status: 410 });
  let location = "unknown";
  try {
    const body = await request.json();
    if (typeof body.location === "string") location = body.location.slice(0, 40);
  } catch {}
  try {
    await recordClick(location);
  } catch (err) {
    console.error("click error", err);
  }
  return new Response(null, { status: 204 });
}
