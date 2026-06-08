create table if not exists public.mobile_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  app_version text not null default '1.0.0',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (expo_push_token)
);

create index if not exists idx_mobile_push_tokens_company_enabled
  on public.mobile_push_tokens (company_id, enabled, updated_at desc);

create table if not exists public.push_notification_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  event_fingerprint text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (event_type, event_fingerprint)
);

create index if not exists idx_push_notification_events_company_created
  on public.push_notification_events (company_id, created_at desc);

alter table public.mobile_push_tokens enable row level security;
alter table public.push_notification_events enable row level security;

drop policy if exists "Members view company push tokens" on public.mobile_push_tokens;
create policy "Members view company push tokens"
  on public.mobile_push_tokens
  for select
  using (company_id = public.current_company_id());

drop policy if exists "Members manage own push token" on public.mobile_push_tokens;
create policy "Members manage own push token"
  on public.mobile_push_tokens
  for all
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  )
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

drop policy if exists "Members view company push events" on public.push_notification_events;
create policy "Members view company push events"
  on public.push_notification_events
  for select
  using (company_id = public.current_company_id());
