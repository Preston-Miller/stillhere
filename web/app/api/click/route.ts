import { recordClick } from "@/lib/db";

// Counts clicks on a price button, to compare against signups.
export async function POST(request: Request) {
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
