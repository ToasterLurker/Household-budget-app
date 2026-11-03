-- Safe one-time starting balances for new accounts. Before any journal entries
-- have been recorded, an owner or household member can set their account's
-- historical opening balance without fabricating income or spending.
begin;

create table if not exists public.account_opening_audit (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id),
  old_opening_cents bigint not null,
  new_opening_cents bigint not null,
  changed_at timestamptz not null default now()
);
create index if not exists idx_opening_audit_account on
  public.account_opening_audit(account_id,changed_at desc);
alter table public.account_opening_audit enable row level security;
revoke all on public.account_opening_audit from anon,authenticated;
grant select on public.account_opening_audit to authenticated;
create policy "authorized_opening_audit_read" on public.account_opening_audit
  for select to authenticated using (
    exists (select 1 from public.accounts a where a.id=account_id
      and ((a.kind='personal' and a.owner_user_id=(select auth.uid()))
        or (a.kind<>'personal' and private.is_member(a.household_id))))
  );

create or replace function private.set_account_opening_balance(
  _account_id uuid, _new_balance_cents bigint)
returns void language plpgsql security definer set search_path=''
as $$
declare
  _uid uuid := (select auth.uid());
  _acct public.accounts%rowtype;
begin
  if _uid is null then raise exception 'Sign-in required'; end if;
  if _new_balance_cents is null or _new_balance_cents < -999999999
    or _new_balance_cents > 999999999 then
    raise exception 'Opening balance outside permitted range'; end if;
  select * into _acct from public.accounts where id=_account_id for update;
  if not found or not (
    (_acct.kind='personal' and _acct.owner_user_id=_uid)
    or (_acct.kind<>'personal' and private.is_member(_acct.household_id))
  ) then raise exception 'Account unavailable'; end if;

  if exists (select 1 from public.ledger_entries where account_id=_account_id) then
    raise exception 'Opening balance is locked after the first recorded transaction';
  end if;

  if _acct.opening_balance_cents is distinct from _new_balance_cents then
    update public.accounts set
      opening_balance_cents=_new_balance_cents,
      current_balance_cents=_new_balance_cents
    where id=_account_id;
    insert into public.account_opening_audit(
      account_id,actor_user_id,old_opening_cents,new_opening_cents)
    values (_account_id,_uid,_acct.opening_balance_cents,_new_balance_cents);
  end if;
end;
$$;
revoke all on function private.set_account_opening_balance(uuid,bigint) from public,anon;
grant execute on function private.set_account_opening_balance(uuid,bigint) to authenticated;

create function public.set_account_opening_balance(
  _account_id uuid, _new_balance_cents bigint)
returns void language sql security invoker set search_path=''
as $$ select private.set_account_opening_balance(_account_id,_new_balance_cents) $$;
revoke all on function public.set_account_opening_balance(uuid,bigint) from public,anon;
grant execute on function public.set_account_opening_balance(uuid,bigint) to authenticated;

commit;
