-- Privileged household operations must live outside the exposed public API schema.
-- Public RPC endpoints are narrow SECURITY INVOKER wrappers; the implementation
-- maintains explicit auth.uid and membership guards in the private schema.
begin;

alter function public.create_household(text) set schema private;
alter function public.create_household_invite(uuid) set schema private;
alter function public.join_household_with_invite(text) set schema private;
alter function public.create_personal_account(text) set schema private;

-- Keep underlying elevated routines callable only by a signed-in client role.
revoke all on function private.create_household(text),
  private.create_household_invite(uuid),
  private.join_household_with_invite(text),
  private.create_personal_account(text) from public, anon;
grant execute on function private.create_household(text),
  private.create_household_invite(uuid),
  private.join_household_with_invite(text),
  private.create_personal_account(text) to authenticated;

create function public.create_household(_name text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_household(_name) $$;

create function public.create_household_invite(_household_id uuid)
returns text language sql security invoker set search_path = ''
as $$ select private.create_household_invite(_household_id) $$;

create function public.join_household_with_invite(_code text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.join_household_with_invite(_code) $$;

create function public.create_personal_account(_name text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_personal_account(_name) $$;

revoke all on function public.create_household(text),
  public.create_household_invite(uuid),
  public.join_household_with_invite(text),
  public.create_personal_account(text) from public, anon;
grant execute on function public.create_household(text),
  public.create_household_invite(uuid),
  public.join_household_with_invite(text),
  public.create_personal_account(text) to authenticated;

-- Cover foreign key columns for low-cost queries and account deletion/retention.
create index if not exists idx_households_created_by on public.households(created_by);
create index if not exists idx_household_invites_household on public.household_invites(household_id);
create index if not exists idx_household_invites_creator on public.household_invites(created_by);
create index if not exists idx_entries_creator on public.ledger_entries(created_by);

commit;
