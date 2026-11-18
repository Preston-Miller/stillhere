// Waitlist storage on Neon Postgres (connected via the Vercel Marketplace, which sets DATABASE_URL).
// Schema: db/schema.sql.
import { neon } from "@neondatabase/serverless";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

/** Adds an email. Duplicates (any letter case) are ignored. */
export async function addSignup(email: string, source: string): Promise<void> {
  await sql()`insert into waitlist (email, source) values (${email}, ${source}) on conflict do nothing`;
}

export async function recordClick(location: string): Promise<void> {
  await sql()`insert into price_clicks (location) values (${location})`;
}

export async function getSignups(): Promise<{ email: string; joined: string; source: string }[]> {
  const rows = await sql()`select email, created_at, coalesce(source, '') as source from waitlist order by created_at`;
  return rows.map((r) => ({ email: r.email, joined: new Date(r.created_at).toISOString(), source: r.source }));
}

export async function getClicks(): Promise<Record<string, number>> {
  const rows = await sql()`select coalesce(location, 'unknown') as location, count(*)::int as n from price_clicks group by 1`;
  return Object.fromEntries(rows.map((r) => [r.location, r.n]));
}
