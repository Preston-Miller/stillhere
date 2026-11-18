import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getClicks, getSignups } from "@/lib/db";

// Password-protected view of demand. Browser shows a login prompt (any username, password = ADMIN_PASSWORD).
//   /api/admin            → summary page
//   /api/admin?format=csv → download the email list

function authorized(request: NextRequest): boolean {
  const password = process.env.ADMIN_PASSWORD;
  const header = request.headers.get("authorization");
  if (!password || !header?.startsWith("Basic ")) return false;
  const given = Buffer.from(header.slice(6), "base64").toString().split(":").slice(1).join(":");
  const a = Buffer.from(given);
  const b = Buffer.from(password);
  return a.length === b.length && timingSafeEqual(a, b);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return new Response("Login required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Stillhere admin"', "Cache-Control": "no-store" },
    });
  }

  const [signups, clicks] = await Promise.all([getSignups(), getClicks()]);

  if (request.nextUrl.searchParams.get("format") === "csv") {
    const csv = ["email,joined,source", ...signups.map((r) => `${r.email},${r.joined},${r.source}`)].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="offgridai-waitlist.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const totalClicks = Object.values(clicks).reduce((a, b) => a + b, 0);
  const rate = totalClicks ? `${Math.round((signups.length / totalClicks) * 100)}%` : "–";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stillhere waitlist</title>
<style>body{font:16px/1.5 system-ui,sans-serif;background:#0c0e0b;color:#ebe8dc;max-width:720px;margin:40px auto;padding:0 16px}
.n{font-size:40px;font-weight:700;color:#e3a72a}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}
.c{border:1px solid #2a2f24;padding:16px}a{color:#e3a72a}td{padding:4px 12px 4px 0;border-bottom:1px solid #2a2f24}small{color:#9b9a8a}</style></head><body>
<h1>Stillhere waitlist</h1>
<div class="grid"><div class="c"><div class="n">${totalClicks}</div><small>price clicks</small></div>
<div class="c"><div class="n">${signups.length}</div><small>signups</small></div>
<div class="c"><div class="n">${rate}</div><small>clicked → signed up</small></div></div>
<p><small>Clicks by button: ${Object.entries(clicks).map(([k, v]) => `${esc(k)} ${v}`).join(" · ") || "none yet"}</small></p>
<p><a href="?format=csv">Download emails (CSV)</a></p>
<table>${signups.slice(-50).reverse().map((r) => `<tr><td>${esc(r.email)}</td><td><small>${esc(r.joined.slice(0, 10))}</small></td><td><small>${esc(r.source)}</small></td></tr>`).join("")}</table>
${signups.length > 50 ? "<p><small>Showing the latest 50.</small></p>" : ""}
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
