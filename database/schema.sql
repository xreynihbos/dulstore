create extension if not exists pgcrypto;

create table if not exists workspaces (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 created_at timestamptz default now()
);
create table if not exists workspace_members (
 workspace_id uuid references workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'agent' check(role in ('owner','admin','agent')),
 primary key(workspace_id,user_id)
);
create table if not exists websites (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references workspaces(id) on delete cascade,
 name text not null,
 domain text not null,
 site_key text not null unique default encode(gen_random_bytes(24),'hex'),
 allowed_domains text[] not null default '{}',
 enabled boolean not null default true,
 widget_config jsonb not null default '{"theme":"auto","position":"right","primaryColor":"#635bff"}',
 created_at timestamptz default now()
);
create table if not exists ai_agents (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references workspaces(id) on delete cascade,
 website_id uuid references websites(id) on delete cascade,
 name text not null default 'Dulstore AI',
 enabled boolean not null default false,
 model text not null default 'gemini-2.5-flash',
 system_prompt text not null default 'Kamu adalah customer support yang ramah. Jawab berdasarkan informasi yang diketahui. Jika tidak yakin, tawarkan bantuan staf.',
 created_at timestamptz default now()
);
create table if not exists visitors (
 id uuid primary key default gen_random_uuid(),
 website_id uuid not null references websites(id) on delete cascade,
 name text,
 email text,
 created_at timestamptz default now()
);
create table if not exists chat_sessions (
 id uuid primary key default gen_random_uuid(),
 website_id uuid not null references websites(id) on delete cascade,
 visitor_id uuid references visitors(id) on delete set null,
 session_secret_hash text not null,
 status text not null default 'open' check(status in ('open','pending','resolved')),
 channel text not null default 'website',
 ai_active boolean not null default true,
 created_at timestamptz default now(),
 last_message_at timestamptz
);
create table if not exists messages (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references chat_sessions(id) on delete cascade,
 sender_type text not null check(sender_type in ('visitor','agent','ai','system')),
 body text not null,
 created_at timestamptz default now()
);
create index if not exists messages_session_time on messages(session_id,created_at);
create index if not exists sessions_site_status on chat_sessions(website_id,status);
create index if not exists websites_site_key on websites(site_key);

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table websites enable row level security;
alter table ai_agents enable row level security;
alter table visitors enable row level security;
alter table chat_sessions enable row level security;
alter table messages enable row level security;

-- Dashboard policies: members can see their workspace data.
create policy "members read own workspaces" on workspaces for select
 using (exists(select 1 from workspace_members m where m.workspace_id=id and m.user_id=auth.uid()));
create policy "members read memberships" on workspace_members for select using(user_id=auth.uid());
create policy "members manage websites" on websites for all
 using(exists(select 1 from workspace_members m where m.workspace_id=websites.workspace_id and m.user_id=auth.uid() and m.role in ('owner','admin')))
 with check(exists(select 1 from workspace_members m where m.workspace_id=websites.workspace_id and m.user_id=auth.uid() and m.role in ('owner','admin')));
create policy "members manage ai agents" on ai_agents for all
 using(exists(select 1 from workspace_members m where m.workspace_id=ai_agents.workspace_id and m.user_id=auth.uid()))
 with check(exists(select 1 from workspace_members m where m.workspace_id=ai_agents.workspace_id and m.user_id=auth.uid()));
create policy "members read visitors" on visitors for select
 using(exists(select 1 from websites w join workspace_members m on m.workspace_id=w.workspace_id where w.id=visitors.website_id and m.user_id=auth.uid()));
create policy "members read sessions" on chat_sessions for select
 using(exists(select 1 from websites w join workspace_members m on m.workspace_id=w.workspace_id where w.id=chat_sessions.website_id and m.user_id=auth.uid()));
create policy "members update sessions" on chat_sessions for update
 using(exists(select 1 from websites w join workspace_members m on m.workspace_id=w.workspace_id where w.id=chat_sessions.website_id and m.user_id=auth.uid()));
create policy "members read messages" on messages for select
 using(exists(select 1 from chat_sessions s join websites w on w.id=s.website_id join workspace_members m on m.workspace_id=w.workspace_id where s.id=messages.session_id and m.user_id=auth.uid()));
create policy "members send agent messages" on messages for insert
 with check(sender_type='agent' and exists(select 1 from chat_sessions s join websites w on w.id=s.website_id join workspace_members m on m.workspace_id=w.workspace_id where s.id=messages.session_id and m.user_id=auth.uid()));

-- Create first workspace after signup from Supabase SQL editor, replacing USER_UUID:
-- insert into workspaces(name) values ('Dulstore') returning id;
-- insert into workspace_members(workspace_id,user_id,role) values ('WORKSPACE_UUID','USER_UUID','owner');
-- Add a website and AI agent from SQL editor or implement admin setup UI.
