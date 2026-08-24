begin;

do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef(p.oid)
  into v_definition
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and p.proname = 'submit_vid_request';

  if v_definition is null then
    raise exception 'Expected function public.submit_vid_request was not found';
  end if;

  v_definition := replace(v_definition, 'kyc.request.submitted', 'vid.request.submitted');
  execute v_definition;
end;
$migration$;

commit;
