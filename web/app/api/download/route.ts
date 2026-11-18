import type { NextRequest } from "next/server";
import { signedDownloadUrl } from "@/lib/r2";
import { getPaidSession } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const session = await getPaidSession(request.nextUrl.searchParams.get("session_id"));
  if (!session) return new Response("No paid purchase found for this link.", { status: 403 });

  try {
    const platform = request.nextUrl.searchParams.get("os") === "windows" ? "windows" : "mac";
    const url = await signedDownloadUrl(platform);
    return new Response(null, {
      status: 302,
      headers: { Location: url, "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("download error", err);
    return new Response("Download is temporarily unavailable. Please try again shortly.", { status: 503 });
  }
}
