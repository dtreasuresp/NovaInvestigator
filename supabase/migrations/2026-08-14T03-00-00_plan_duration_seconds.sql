-- Add duration_seconds column to public.plans table to support configurable duration for one-time plans (e.g. 24 hours) vs lifetime plans (null).
begin;

alter table public.plans
  add column if not exists duration_seconds integer
    check (duration_seconds is null or duration_seconds > 0);

comment on column public.plans.duration_seconds is
  'Access duration in seconds for one_time plans. NULL indicates lifetime / permanent access with no expiration.';

-- Initialize one_time_access default duration to 24 hours (86400 seconds)
update public.plans
set duration_seconds = 86400
where code = 'one_time_access'
  and interval = 'one_time'
  and duration_seconds is null;

commit;
