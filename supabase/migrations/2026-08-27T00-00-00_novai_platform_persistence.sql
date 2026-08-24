begin;

-- =============================================================================
-- NovAi Platform Persistence & Multi-Tenant Agent Architecture
-- Tablas: novai_conversations, novai_messages, novai_memories, novai_agent_runs, novai_audit_events
-- =============================================================================

-- 1. Conversaciones de NovAi (Tenant & Workspace scoped)
create table if not exists public.novai_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nueva conversación',
  mode text not null default 'CHAT' check (mode in ('CHAT', 'CONSULTANT', 'ANALYST', 'RESEARCHER', 'DEVELOPER', 'ARCHITECT', 'OPERATOR')),
  app_context text not null default 'general',
  metadata jsonb not null default '{}'::jsonb,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists novai_conversations_tenant_user_idx
  on public.novai_conversations (tenant_id, user_id, updated_at desc);

create index if not exists novai_conversations_workspace_idx
  on public.novai_conversations (workspace_id);

drop trigger if exists novai_conversations_set_updated_at on public.novai_conversations;
create trigger novai_conversations_set_updated_at
before update on public.novai_conversations
for each row execute function public.set_updated_at();

-- 2. Mensajes de Conversaciones
create table if not exists public.novai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.novai_conversations(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  mode text not null default 'CHAT',
  model text,
  tool_calls jsonb,
  token_count integer default 0,
  created_at timestamptz not null default now()
);

create index if not exists novai_messages_conv_created_idx
  on public.novai_messages (conversation_id, created_at asc);

create index if not exists novai_messages_tenant_idx
  on public.novai_messages (tenant_id);

-- 3. Sistema de Memoria Multi-Nivel (User, Workspace, Strategic)
create table if not exists public.novai_memories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  scope text not null check (scope in ('user', 'workspace', 'strategic')),
  category text not null default 'general',
  key text not null,
  content text not null,
  confidence numeric not null default 1.0 check (confidence >= 0.0 and confidence <= 1.0),
  status text not null default 'active' check (status in ('active', 'archived', 'deprecated')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists novai_memories_tenant_scope_idx
  on public.novai_memories (tenant_id, scope, status);

create index if not exists novai_memories_key_idx
  on public.novai_memories (tenant_id, key);

drop trigger if exists novai_memories_set_updated_at on public.novai_memories;
create trigger novai_memories_set_updated_at
before update on public.novai_memories
for each row execute function public.set_updated_at();

-- 4. Ejecuciones de Agente y Métricas de Auditoría
create table if not exists public.novai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.novai_conversations(id) on delete set null,
  mode text not null,
  model text not null,
  task_category text not null default 'general',
  input_tokens integer default 0,
  output_tokens integer default 0,
  duration_ms integer default 0,
  status text not null default 'completed' check (status in ('completed', 'failed', 'aborted')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists novai_agent_runs_tenant_idx
  on public.novai_agent_runs (tenant_id, created_at desc);

-- 5. Eventos de Auditoría de Herramientas y Políticas de Riesgo
create table if not exists public.novai_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references public.novai_agent_runs(id) on delete set null,
  action text not null,
  tool_name text,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  approval_status text not null default 'auto_approved' check (approval_status in ('auto_approved', 'user_approved', 'rejected')),
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists novai_audit_events_tenant_idx
  on public.novai_audit_events (tenant_id, created_at desc);

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

alter table public.novai_conversations enable row level security;
alter table public.novai_messages enable row level security;
alter table public.novai_memories enable row level security;
alter table public.novai_agent_runs enable row level security;
alter table public.novai_audit_events enable row level security;

-- Policies para novai_conversations
create policy novai_conversations_user_read
on public.novai_conversations
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_conversations.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

create policy novai_conversations_user_write
on public.novai_conversations
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_conversations.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_conversations.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

-- Policies para novai_messages
create policy novai_messages_user_read
on public.novai_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.novai_conversations as c
    where c.id = novai_messages.conversation_id
      and c.user_id = (select auth.uid())
      and c.tenant_id = novai_messages.tenant_id
  )
);

create policy novai_messages_user_write
on public.novai_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.novai_conversations as c
    where c.id = novai_messages.conversation_id
      and c.user_id = (select auth.uid())
      and c.tenant_id = novai_messages.tenant_id
  )
);

-- Policies para novai_memories
create policy novai_memories_tenant_member_read
on public.novai_memories
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_memories.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

create policy novai_memories_tenant_member_write
on public.novai_memories
for all
to authenticated
using (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_memories.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_memories.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

-- Policies para agent_runs & audit_events
create policy novai_agent_runs_user_read
on public.novai_agent_runs
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_agent_runs.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

create policy novai_audit_events_user_read
on public.novai_audit_events
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_audit_events.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

commit;
