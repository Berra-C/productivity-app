create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.app_accounts (
  id uuid primary key default gen_random_uuid(),
  username citext not null unique,
  credential_salt text not null,
  credential_hash text not null,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.app_accounts(id) on delete cascade,
  token_hash text not null unique,
  device_name text not null default 'Cihaz',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked boolean not null default false
);
create index if not exists app_sessions_account_idx on public.app_sessions(account_id);
create index if not exists app_sessions_token_idx on public.app_sessions(token_hash) where revoked=false;

create table if not exists public.app_states (
  account_id uuid primary key references public.app_accounts(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_login_attempts (
  id bigint generated always as identity primary key,
  username citext not null,
  ip_hash text not null,
  success boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists app_login_attempts_lookup_idx on public.app_login_attempts(username, ip_hash, created_at desc);

alter table public.app_accounts enable row level security;
alter table public.app_sessions enable row level security;
alter table public.app_states enable row level security;
alter table public.app_login_attempts enable row level security;

-- Bu tablolar doğrudan tarayıcıdan okunmaz/yazılmaz. Tüm erişim Edge Function içindeki
-- service-role anahtarı üzerinden yapılır. Bu nedenle anon/authenticated policy tanımlanmaz.

create or replace function public.cleanup_app_login_attempts()
returns void language sql security definer set search_path=public as $$
  delete from public.app_login_attempts where created_at < now() - interval '7 days';
$$;
