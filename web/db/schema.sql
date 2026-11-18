-- OffGridAI waitlist schema (Neon Postgres). Apply with: node --env-file=.env.local scripts/migrate.mjs

create table if not exists waitlist (
  id bigint generated always as identity primary key,
  email text not null check (length(email) <= 254),
  source text,
  created_at timestamptz not null default now()
);
create unique index if not exists waitlist_email_key on waitlist (lower(email));

create table if not exists price_clicks (
  id bigint generated always as identity primary key,
  location text,
  created_at timestamptz not null default now()
);
