-- Power Shield accuracy feedback — measure prediction quality from real users.

create table if not exists public.power_shield_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_id uuid references public.prepaid_electricity_meters(id) on delete set null,
  context text not null check (context in ('post_payment', 'alert_check')),
  outcome text not null check (outcome in ('accurate', 'too_early', 'too_late', 'no_blackout', 'had_blackout')),
  predicted_depletion_at timestamptz,
  alert_level text,
  hours_remaining_at_feedback double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_power_shield_feedback_user
  on public.power_shield_feedback(user_id, created_at desc);

create index if not exists idx_power_shield_feedback_outcome
  on public.power_shield_feedback(outcome, created_at desc);

alter table public.power_shield_feedback enable row level security;

drop policy if exists "Users manage own power shield feedback" on public.power_shield_feedback;
create policy "Users manage own power shield feedback"
  on public.power_shield_feedback
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
