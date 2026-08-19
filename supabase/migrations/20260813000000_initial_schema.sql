-- Lilly's App (ChoreQuest) — initial schema migrated from Base44 entities

create extension if not exists "pgcrypto";

-- Profiles extend Supabase auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  display_name text,
  app_role text check (app_role in ('parent', 'kid')),
  family_id uuid,
  avatar_emoji text default '🦊',
  age integer,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  currency_symbol text not null default '$',
  currency_code text not null default 'USD',
  max_chores_per_day integer not null default 1,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_family_id_fkey foreign key (family_id) references public.families(id) on delete set null;

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  value numeric not null,
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  recurrence text not null default 'daily' check (recurrence in ('one_time', 'daily', 'weekly')),
  emoji text default '✨',
  active boolean not null default true,
  requires_photo boolean not null default true,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.chore_claims (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  chore_id uuid not null references public.chores(id) on delete cascade,
  chore_title text,
  chore_emoji text,
  chore_value numeric,
  kid_email text not null,
  kid_name text,
  status text not null default 'claimed' check (status in ('claimed', 'before_done', 'submitted', 'approved', 'redo')),
  before_photo_url text,
  after_photo_url text,
  review_comment text,
  paid_amount numeric,
  claim_date date,
  ai_verdict text check (ai_verdict in ('pending', 'looks_good', 'needs_review', 'suspicious')),
  ai_score numeric,
  ai_reasoning text,
  requires_photo boolean default true,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.family_quests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  emoji text default '🏆',
  target_count integer not null,
  reward text,
  status text not null default 'active' check (status in ('active', 'completed')),
  deadline date,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.allowances (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  kid_email text not null,
  kid_name text,
  amount numeric not null,
  day_of_week integer not null default 0,
  active boolean not null default true,
  last_paid_date date,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  kid_email text not null,
  family_id uuid not null references public.families(id) on delete cascade,
  amount numeric not null,
  type text not null default 'earn' check (type in ('earn', 'bonus', 'spend', 'cashout')),
  description text,
  claim_id uuid references public.chore_claims(id) on delete set null,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.family_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  amount numeric not null,
  type text not null default 'deposit' check (type in ('deposit', 'payout', 'refund', 'adjustment')),
  description text,
  actor_email text,
  kid_email text,
  claim_id uuid references public.chore_claims(id) on delete set null,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  kid_email text not null,
  title text not null,
  emoji text default '🎯',
  target_amount numeric not null,
  saved_amount numeric not null default 0,
  allocation_pct numeric not null default 0,
  status text not null default 'active' check (status in ('active', 'achieved', 'archived')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.cashout_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  kid_email text not null,
  kid_name text,
  kid_emoji text,
  amount numeric not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'denied')),
  payment_method text,
  parent_note text,
  resolved_at timestamptz,
  resolved_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  emoji text default '🎁',
  price numeric not null,
  kind text not null default 'real' check (kind in ('real', 'virtual')),
  active boolean not null default true,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  kid_email text not null,
  kid_name text,
  item_id uuid not null references public.shop_items(id) on delete cascade,
  item_title text,
  item_emoji text,
  price numeric not null,
  status text not null default 'pending' check (status in ('pending', 'fulfilled')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text,
  emoji text,
  tier text not null default 'bronze' check (tier in ('bronze', 'silver', 'gold', 'legendary')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  kid_email text not null,
  family_id uuid not null references public.families(id) on delete cascade,
  badge_key text not null,
  badge_title text,
  badge_emoji text,
  badge_tier text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.streaks (
  id uuid primary key default gen_random_uuid(),
  kid_email text not null,
  family_id uuid not null references public.families(id) on delete cascade,
  current_count integer not null default 0,
  longest_count integer not null default 0,
  last_completed_date date,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  recipient_email text not null,
  type text not null default 'message' check (type in ('approval', 'redo', 'submission', 'purchase', 'quest', 'message', 'badge')),
  title text not null,
  body text,
  emoji text default '🔔',
  link text,
  read boolean not null default false,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  author_email text not null,
  author_name text,
  author_emoji text,
  author_role text check (author_role in ('parent', 'kid')),
  text text not null,
  scope text not null default 'family' check (scope in ('family', 'claim')),
  claim_id uuid references public.chore_claims(id) on delete cascade,
  reactions jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid references public.families(id) on delete set null,
  title text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  is_streaming boolean not null default false,
  created_date timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_date trigger
create or replace function public.set_updated_date()
returns trigger language plpgsql as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_date();
create trigger families_updated before update on public.families for each row execute function public.set_updated_date();
create trigger chores_updated before update on public.chores for each row execute function public.set_updated_date();
create trigger chore_claims_updated before update on public.chore_claims for each row execute function public.set_updated_date();

-- Helper for RLS
create or replace function public.my_profile()
returns public.profiles
language sql stable security definer set search_path = public
as $$ select * from public.profiles where id = auth.uid() $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.chores enable row level security;
alter table public.chore_claims enable row level security;
alter table public.family_quests enable row level security;
alter table public.allowances enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.family_wallet_transactions enable row level security;
alter table public.savings_goals enable row level security;
alter table public.cashout_requests enable row level security;
alter table public.shop_items enable row level security;
alter table public.purchases enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.streaks enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.coach_conversations enable row level security;
alter table public.coach_messages enable row level security;

-- Profiles
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or family_id = (select family_id from public.my_profile())
);
create policy profiles_update on public.profiles for update using (id = auth.uid());

-- Families
create policy families_select on public.families for select using (id = (select family_id from public.my_profile()));
create policy families_insert on public.families for insert with check (true);
create policy families_update on public.families for update using (
  id = (select family_id from public.my_profile()) and (select app_role from public.my_profile()) = 'parent'
);

-- Family-scoped read for members
create policy family_data_read on public.chores for select using (family_id = (select family_id from public.my_profile()));
create policy family_data_read_claims on public.chore_claims for select using (family_id = (select family_id from public.my_profile()));
create policy family_data_read_quests on public.family_quests for select using (family_id = (select family_id from public.my_profile()));
create policy family_data_read_allowances on public.allowances for select using (family_id = (select family_id from public.my_profile()));
create policy family_data_read_wallet on public.wallet_transactions for select using (family_id = (select family_id from public.my_profile()));
create policy family_data_read_fwallet on public.family_wallet_transactions for select using (family_id = (select family_id from public.my_profile()));
create policy family_data_read_goals on public.savings_goals for select using (family_id = (select family_id from public.my_profile()));
create policy family_data_read_cashouts on public.cashout_requests for select using (family_id = (select family_id from public.my_profile()));
create policy family_data_read_shop on public.shop_items for select using (family_id = (select family_id from public.my_profile()));
create policy family_data_read_purchases on public.purchases for select using (family_id = (select family_id from public.my_profile()));
create policy family_data_read_user_badges on public.user_badges for select using (family_id = (select family_id from public.my_profile()));
create policy family_data_read_streaks on public.streaks for select using (family_id = (select family_id from public.my_profile()));
create policy family_data_read_messages on public.messages for select using (family_id = (select family_id from public.my_profile()));

-- Parent write policies (simplified — parents manage family data)
create policy parent_chores_all on public.chores for all using (
  family_id = (select family_id from public.my_profile()) and (select app_role from public.my_profile()) = 'parent'
);
create policy parent_quests_all on public.family_quests for all using (
  family_id = (select family_id from public.my_profile()) and (select app_role from public.my_profile()) = 'parent'
);
create policy parent_allowances_all on public.allowances for all using (
  family_id = (select family_id from public.my_profile()) and (select app_role from public.my_profile()) = 'parent'
);
create policy parent_shop_all on public.shop_items for all using (
  family_id = (select family_id from public.my_profile()) and (select app_role from public.my_profile()) = 'parent'
);

-- Family members can create/read/update most transactional data
create policy members_claims_all on public.chore_claims for all using (family_id = (select family_id from public.my_profile()));
create policy members_wallet_all on public.wallet_transactions for all using (family_id = (select family_id from public.my_profile()));
create policy members_fwallet_all on public.family_wallet_transactions for all using (family_id = (select family_id from public.my_profile()));
create policy members_goals_all on public.savings_goals for all using (family_id = (select family_id from public.my_profile()));
create policy members_cashouts_all on public.cashout_requests for all using (family_id = (select family_id from public.my_profile()));
create policy members_purchases_all on public.purchases for all using (family_id = (select family_id from public.my_profile()));
create policy members_user_badges_all on public.user_badges for all using (family_id = (select family_id from public.my_profile()));
create policy members_streaks_all on public.streaks for all using (family_id = (select family_id from public.my_profile()));
create policy members_messages_all on public.messages for all using (family_id = (select family_id from public.my_profile()));

-- Notifications — recipient only
create policy notifications_select on public.notifications for select using (recipient_email = (select email from public.my_profile()));
create policy notifications_insert on public.notifications for insert with check (family_id = (select family_id from public.my_profile()));
create policy notifications_update on public.notifications for update using (recipient_email = (select email from public.my_profile()));
create policy notifications_delete on public.notifications for delete using (recipient_email = (select email from public.my_profile()));

-- Badges — public read
create policy badges_select on public.badges for select using (true);

-- Coach — own conversations
create policy coach_conv_select on public.coach_conversations for select using (user_id = auth.uid());
create policy coach_conv_insert on public.coach_conversations for insert with check (user_id = auth.uid());
create policy coach_msg_select on public.coach_messages for select using (
  conversation_id in (select id from public.coach_conversations where user_id = auth.uid())
);
create policy coach_msg_insert on public.coach_messages for insert with check (
  conversation_id in (select id from public.coach_conversations where user_id = auth.uid())
);

-- Expose public tables to Data API roles. Required when auto_expose_new_tables is off
-- (Supabase default since 2026-05-30). RLS policies above still enforce row access.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

-- Seed default badges
insert into public.badges (key, title, description, emoji, tier) values
  ('first_quest', 'First Quest', 'Completed your first chore', '⭐', 'bronze'),
  ('streak_3', 'On a Roll', '3-day streak', '🔥', 'bronze'),
  ('streak_7', 'Week Warrior', '7-day streak', '🔥', 'silver'),
  ('streak_14', 'Unstoppable', '14-day streak', '🔥', 'gold'),
  ('earner_10', 'Big Earner', 'Earned $10 total', '💰', 'bronze'),
  ('earner_50', 'Money Maker', 'Earned $50 total', '💰', 'silver'),
  ('quest_master', 'Quest Master', 'Completed a family quest', '🏆', 'gold');

-- Storage bucket for chore photos
insert into storage.buckets (id, name, public) values ('chore-photos', 'chore-photos', true)
on conflict (id) do nothing;

create policy chore_photos_upload on storage.objects for insert with check (bucket_id = 'chore-photos' and auth.role() = 'authenticated');
create policy chore_photos_read on storage.objects for select using (bucket_id = 'chore-photos');
