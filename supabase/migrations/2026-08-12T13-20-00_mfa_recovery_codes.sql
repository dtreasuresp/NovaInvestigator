begin;

create table if not exists public.mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_id uuid not null,
  code_hash text not null check (length(code_hash) between 32 and 512),
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists mfa_recovery_codes_generation_hash_unique
  on public.mfa_recovery_codes (user_id, generation_id, code_hash);

create index if not exists mfa_recovery_codes_active_user_idx
  on public.mfa_recovery_codes (user_id, created_at desc)
  where used_at is null and revoked_at is null;

alter table public.mfa_recovery_codes enable row level security;

revoke all on table public.mfa_recovery_codes from public, anon, authenticated;
grant all on table public.mfa_recovery_codes to service_role;

create or replace function public.replace_mfa_recovery_codes(
  p_user_id uuid,
  p_generation_id uuid,
  p_code_hashes text[]
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_inserted_count integer;
begin
  if p_user_id is null
     or p_generation_id is null
     or p_code_hashes is null
     or cardinality(p_code_hashes) < 1
     or cardinality(p_code_hashes) > 20 then
    raise exception using
      errcode = '22023',
      message = 'Invalid MFA recovery code batch';
  end if;

  if exists (
    select 1
    from unnest(p_code_hashes) as submitted_hash
    where submitted_hash is null
      or length(submitted_hash) < 32
      or length(submitted_hash) > 512
  ) then
    raise exception using
      errcode = '22023',
      message = 'Invalid MFA recovery code hash';
  end if;

  update public.mfa_recovery_codes
  set revoked_at = clock_timestamp()
  where user_id = p_user_id
    and revoked_at is null;

  insert into public.mfa_recovery_codes (user_id, generation_id, code_hash)
  select p_user_id, p_generation_id, submitted_hash
  from unnest(p_code_hashes) as submitted_hash;

  get diagnostics v_inserted_count = row_count;

  return v_inserted_count;
end;
$$;

create or replace function public.revoke_mfa_recovery_codes(p_user_id uuid)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_revoked_count integer;
begin
  if p_user_id is null then
    raise exception using
      errcode = '22023',
      message = 'Invalid MFA recovery user';
  end if;

  update public.mfa_recovery_codes
  set revoked_at = clock_timestamp()
  where user_id = p_user_id
    and revoked_at is null;

  get diagnostics v_revoked_count = row_count;

  return v_revoked_count;
end;
$$;

revoke all on function public.replace_mfa_recovery_codes(uuid, uuid, text[]) from public, anon, authenticated;
revoke all on function public.revoke_mfa_recovery_codes(uuid) from public, anon, authenticated;
grant execute on function public.replace_mfa_recovery_codes(uuid, uuid, text[]) to service_role;
grant execute on function public.revoke_mfa_recovery_codes(uuid) to service_role;

commit;
