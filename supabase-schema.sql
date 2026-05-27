-- ============================================================
-- עוזר לגיל הזהב – Supabase Schema
-- הרץ את כל הקובץ הזה ב-Supabase SQL Editor
-- ============================================================

-- Profiles (one per registered user)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  name text not null,
  role text not null check (role in ('elderly', 'family')),
  wake_up_time text default '07:00',
  created_at timestamptz default now()
);

-- Medications (per elderly user)
create table if not exists medications (
  id uuid default gen_random_uuid() primary key,
  elderly_user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  times text[] not null default '{}',
  days int[] not null default '{}',
  notes text default '',
  active boolean default true,
  created_at timestamptz default now()
);

-- Medication logs (when pills were taken)
create table if not exists medication_logs (
  id uuid default gen_random_uuid() primary key,
  elderly_user_id uuid references profiles(id) on delete cascade not null,
  medication_names text[] not null default '{}',
  scheduled_time text,
  taken_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Family contact list (phone/WhatsApp contacts per elderly user)
create table if not exists family_members (
  id uuid default gen_random_uuid() primary key,
  elderly_user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  relation text not null,
  phone text not null,
  email text default ''
);

-- Links between family app-users and elderly users
create table if not exists family_links (
  family_user_id uuid references profiles(id) on delete cascade not null,
  elderly_user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (family_user_id, elderly_user_id)
);

-- Calendar events (per elderly user)
create table if not exists calendar_events (
  id uuid default gen_random_uuid() primary key,
  elderly_user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  date text not null,
  time text default '',
  is_holiday boolean default false,
  is_birthday boolean default false
);

-- Push notification subscriptions (per family user device)
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  subscription jsonb not null,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table medications enable row level security;
alter table medication_logs enable row level security;
alter table family_members enable row level security;
alter table family_links enable row level security;
alter table calendar_events enable row level security;
alter table push_subscriptions enable row level security;

-- Helper: is the current user a family member linked to elderly_id?
create or replace function is_linked_family(elderly_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from family_links
    where family_user_id = auth.uid() and elderly_user_id = elderly_id
  );
$$;

-- PROFILES: everyone can read (needed for username lookup), only owner can write
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- MEDICATIONS
create policy "meds_select" on medications for select
  using (elderly_user_id = auth.uid() or is_linked_family(elderly_user_id));
create policy "meds_insert" on medications for insert
  with check (elderly_user_id = auth.uid());
create policy "meds_update" on medications for update
  using (elderly_user_id = auth.uid());
create policy "meds_delete" on medications for delete
  using (elderly_user_id = auth.uid());

-- MEDICATION LOGS
create policy "logs_select" on medication_logs for select
  using (elderly_user_id = auth.uid() or is_linked_family(elderly_user_id));
create policy "logs_insert" on medication_logs for insert
  with check (elderly_user_id = auth.uid());

-- FAMILY MEMBERS (contacts)
create policy "fam_members_all" on family_members for all
  using (elderly_user_id = auth.uid());

-- FAMILY LINKS
create policy "links_select" on family_links for select
  using (family_user_id = auth.uid() or elderly_user_id = auth.uid());
create policy "links_insert" on family_links for insert
  with check (family_user_id = auth.uid());
create policy "links_delete" on family_links for delete
  using (family_user_id = auth.uid() or elderly_user_id = auth.uid());

-- PUSH SUBSCRIPTIONS
create policy "push_subs_own" on push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- CALENDAR EVENTS
create policy "cal_select" on calendar_events for select
  using (elderly_user_id = auth.uid() or is_linked_family(elderly_user_id));
create policy "cal_insert" on calendar_events for insert
  with check (elderly_user_id = auth.uid());
create policy "cal_update" on calendar_events for update
  using (elderly_user_id = auth.uid());
create policy "cal_delete" on calendar_events for delete
  using (elderly_user_id = auth.uid());
