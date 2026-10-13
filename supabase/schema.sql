-- Gatherly schema (Supabase Postgres + RLS)
-- Source of truth: prototype at /Users/alexicua/Hangout Planner/

-- Profiles (public info, no email exposed)
create table if not exists profiles (
  id uuid references auth.users on delete cascade,
  username text unique not null,
  display_name text not null,
  photo_url text,
  bio text,
  timezone text default 'America/New_York',
  share_schedule boolean default true,
  default_availability jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id)
);

-- Friendships (with block)
create table if not exists friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references auth.users not null,
  receiver_id uuid references auth.users not null,
  status text check (status in ('pending','accepted','blocked')) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (requester_id, receiver_id)
);

-- Friend groups (reusable groups)
create table if not exists friend_groups (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists friend_group_members (
  group_id uuid references friend_groups on delete cascade,
  user_id uuid references auth.users,
  primary key (group_id, user_id)
);

-- Notifications (in-app + email)
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text not null,
  title text not null,
  body text,
  read boolean default false,
  created_at timestamptz default now()
);

-- Plans / hangouts lifecycle
create table if not exists plans (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references auth.users not null,
  title text not null,
  description text,
  stage text check (stage in ('draft','collecting','voting','confirmed','completed','cancelled')) default 'draft',
  planning_window text check (planning_window in ('week','month','later','custom')) default 'week',
  range_start date,
  range_end date,
  recurring boolean default false,
  cohosts uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists plan_participants (
  plan_id uuid references plans on delete cascade,
  user_id uuid references auth.users,
  role text default 'participant', -- participant, cohost
  joined_at timestamptz default now(),
  primary key (plan_id, user_id)
);

-- Ideas / votes
create table if not exists ideas (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid references plans on delete cascade,
  title text not null,
  description text,
  tag text,
  votes int default 0,
  created_at timestamptz default now()
);

create table if not exists votes (
  idea_id uuid references ideas on delete cascade,
  user_id uuid references auth.users,
  primary key (idea_id, user_id)
);

-- Availability (normalized busy/free only — never event titles/attendees)
create table if not exists availability_blocks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  plan_id uuid references plans,
  source text, -- 'google','apple','manual'
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text check (status in ('free','busy')) default 'busy',
  sync_token text,
  created_at timestamptz default now()
);

-- Tracker (only completed hangouts; cancelled excluded)
create table if not exists hangouts (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid references plans,
  user_id uuid references auth.users not null,
  completed_at timestamptz default now(),
  activity text,
  location text,
  notes text
);

create table if not exists tracker_memories (
  hangout_id uuid references hangouts on delete cascade,
  user_id uuid references auth.users,
  memory_text text,
  photo_url text,
  created_at timestamptz default now(),
  primary key (hangout_id, user_id, created_at)
);

-- RLS policies
alter table profiles enable row level security;
create policy "Users can view any profile" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

alter table friendships enable row level security;
create policy "Users can see own friendships" on friendships for all using (auth.uid() = requester_id or auth.uid() = receiver_id);

alter table friend_groups enable row level security;
create policy "Users can see own groups" on friend_groups for all using (auth.uid() = owner_id);

alter table notifications enable row level security;
create policy "Users see own notifications" on notifications for all using (auth.uid() = user_id);

alter table plans enable row level security;
create policy "Plans visible to participants and host" on plans for select using (auth.uid() = host_id or auth.uid() = any(cohosts) or exists (select 1 from plan_participants where plan_id = plans.id and user_id = auth.uid()));
create policy "Host can manage plan" on plans for all using (auth.uid() = host_id);

alter table hangouts enable row level security;
create policy "Users see own hangouts" on hangouts for all using (auth.uid() = user_id);

alter table tracker_memories enable row level security;
create policy "Users see own memories" on tracker_memories for all using (auth.uid() = user_id);
