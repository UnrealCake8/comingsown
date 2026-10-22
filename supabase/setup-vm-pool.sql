-- Run once in the Supabase SQL Editor before deploying the matching API.
-- Safe to rerun. Existing users and VM assignments are preserved.
begin;

create schema if not exists mao_internal;

create table if not exists mao.vm_pool (
  vm_number integer primary key check (vm_number > 0),
  enabled boolean not null default true
);
comment on table mao.vm_pool is
  'Admin-managed pool of real vmN.asanib.com desktops. Add only provisioned, ready desktops.';
alter table mao.vm_pool enable row level security;
revoke all on mao.vm_pool from public, anon, authenticated;
grant select, insert, update, delete on mao.vm_pool to service_role;

-- Fail rather than silently reassign anyone if legacy data has duplicates.
create unique index if not exists mao_vm_assignment_user_unique
  on mao.vm_assignments (user_id);
create unique index if not exists mao_vm_assignment_number_unique
  on mao.vm_assignments (vm_number);

grant usage on schema mao to service_role;
grant select on mao.profiles to service_role;
grant select, insert on mao.vm_assignments to service_role;

-- Only the trusted server may invoke this operation, after authenticating the user.
-- SECURITY INVOKER retains the caller's permissions; no privilege escalation.
create or replace function mao.claim_vm(p_user_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  chosen integer;
begin
  if p_user_id is null then
    raise exception 'User required' using errcode = '22023';
  end if;
  if not exists (select 1 from mao.profiles where user_id = p_user_id) then
    raise exception 'Mao profile required' using errcode = '23503';
  end if;

  -- Small pool: serialize claims in the database, including repeated requests
  -- for the same user. The lock is released automatically at transaction end.
  perform pg_catalog.pg_advisory_xact_lock(18226, 1);

  select a.vm_number into chosen
    from mao.vm_assignments a where a.user_id = p_user_id;
  if chosen is not null then
    return chosen;
  end if;

  select p.vm_number into chosen
    from mao.vm_pool p
    where p.enabled
      and not exists (
        select 1 from mao.vm_assignments a where a.vm_number = p.vm_number
      )
    order by p.vm_number
    limit 1
    for update of p;

  if chosen is null then
    return null; -- Registration remains usable when all desktops are taken.
  end if;

  insert into mao.vm_assignments (user_id, vm_number)
    values (p_user_id, chosen);
  return chosen;
end;
$$;
revoke all on function mao.claim_vm(uuid) from public, anon, authenticated;
grant execute on function mao.claim_vm(uuid) to service_role;

-- Claim as part of Mao registration, not every Auth signup in a shared project.
create or replace function mao_internal.assign_vm_on_mao_registration()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform mao.claim_vm(new.user_id);
  return new;
end;
$$;
revoke all on function mao_internal.assign_vm_on_mao_registration()
  from public, anon, authenticated;
grant usage on schema mao_internal to service_role;
grant execute on function mao_internal.assign_vm_on_mao_registration()
  to service_role;
drop trigger if exists assign_vm_on_mao_registration on mao.profiles;
create trigger assign_vm_on_mao_registration
  after insert on mao.profiles
  for each row execute function mao_internal.assign_vm_on_mao_registration();

notify pgrst, 'reload schema';
commit;
