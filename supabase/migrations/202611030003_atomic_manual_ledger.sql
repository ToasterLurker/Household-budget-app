-- Test-only money-safe ledger foundation, secured behind authenticated RPCs.
-- This permits atomic, manual ledger writes for authorized users. The UI
-- should not enable real financial recording until full live-client tests pass.
begin;

alter table public.ledger_entries
  add column if not exists client_operation_id uuid;
create unique index if not exists idx_entries_idempotency
  on public.ledger_entries(created_by,client_operation_id)
  where client_operation_id is not null;

-- Audit changes to personal visibility, preserving previous and new states.
create table if not exists public.account_visibility_audit (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id),
  old_visibility text not null,
  new_visibility text not null,
  changed_at timestamptz not null default now()
);
create index if not exists idx_visibility_audit_account
  on public.account_visibility_audit(account_id,changed_at desc);
alter table public.account_visibility_audit enable row level security;
revoke all on public.account_visibility_audit from anon,authenticated;
grant select on public.account_visibility_audit to authenticated;
create policy "owner_only_visibility_audit" on public.account_visibility_audit
for select to authenticated
using (exists (
  select 1 from public.accounts a
  where a.id=account_id and a.owner_user_id=(select auth.uid())
));

-- Per-account money-safe manual expense/income operation.
create or replace function private.record_manual_entry(
  _account_id uuid, _entry_kind text, _amount_cents bigint,
  _description text, _occurred_on date, _operation_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
  _uid uuid := (select auth.uid());
  _acct public.accounts%rowtype;
  _existing uuid;
  _entry_id uuid;
begin
  if _uid is null then raise exception 'Sign-in required'; end if;
  if _operation_id is null then raise exception 'Operation ID is required'; end if;
  if _entry_kind not in ('income','expense') then
    raise exception 'Unsupported entry type';
  end if;
  if _amount_cents is null or _amount_cents < 1 or _amount_cents > 999999999 then
    raise exception 'Invalid amount';
  end if;
  if char_length(btrim(coalesce(_description,''))) not between 1 and 150
    or _occurred_on is null then raise exception 'Invalid entry details'; end if;

  -- Lock before selecting a prior operation; a duplicate operation can never
  -- affect money twice. The unique index is a second concurrency guard.
  select * into _acct from public.accounts where id=_account_id for update;
  if not found then raise exception 'Account unavailable'; end if;
  if not ((_acct.kind='personal' and _acct.owner_user_id=_uid)
    or (_acct.kind<>'personal' and private.is_member(_acct.household_id))) then
    raise exception 'Account unavailable';
  end if;

  select id into _existing from public.ledger_entries
  where created_by=_uid and client_operation_id=_operation_id limit 1;
  if found then
    if not exists (
      select 1 from public.ledger_entries
      where id=_existing and account_id=_account_id
        and entry_kind=_entry_kind and amount_cents=_amount_cents
        and description=btrim(_description) and occurred_on=_occurred_on
    ) then raise exception 'Operation ID already used for different details'; end if;
    return _existing;
  end if;

  insert into public.ledger_entries(
    account_id,created_by,entry_kind,amount_cents,description,occurred_on,client_operation_id)
  values (_account_id,_uid,_entry_kind,_amount_cents,btrim(_description),_occurred_on,_operation_id)
  returning id into _entry_id;

  update public.accounts
  set current_balance_cents=current_balance_cents
    + case when _entry_kind='income' then _amount_cents else -_amount_cents end
  where id=_account_id;

  return _entry_id;
end;
$$;

-- Atomic double-entry transfer: paired ledger entries, one logical transfer,
-- and balanced adjustments to separate accounts. A transfer is NOT spending.
create or replace function private.record_manual_transfer(
  _from_id uuid, _to_id uuid, _amount_cents bigint,
  _description text, _occurred_on date, _operation_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
  _uid uuid := (select auth.uid());
  _from public.accounts%rowtype;
  _to public.accounts%rowtype;
  _existing uuid;
  _group uuid;
  _transfer_out uuid;
begin
  if _uid is null then raise exception 'Sign-in required'; end if;
  if _operation_id is null then raise exception 'Operation ID is required'; end if;
  if _from_id is null or _to_id is null or _from_id=_to_id then
    raise exception 'Transfer requires two distinct accounts'; end if;
  if _amount_cents is null or _amount_cents < 1 or _amount_cents > 999999999 then
    raise exception 'Invalid transfer amount'; end if;
  if char_length(btrim(coalesce(_description,''))) not between 1 and 150
    or _occurred_on is null then raise exception 'Invalid transfer details'; end if;

  -- Lock both account rows in stable UUID order to prevent transfer deadlocks.
  perform id from public.accounts where id in (_from_id,_to_id)
    order by id for update;

  select * into _from from public.accounts where id=_from_id;
  if not found then raise exception 'Account unavailable'; end if;
  select * into _to from public.accounts where id=_to_id;
  if not found then raise exception 'Account unavailable'; end if;
  if not ((_from.kind='personal' and _from.owner_user_id=_uid)
    or (_from.kind<>'personal' and private.is_member(_from.household_id)))
    or not ((_to.kind='personal' and _to.owner_user_id=_uid)
    or (_to.kind<>'personal' and private.is_member(_to.household_id))) then
    raise exception 'Account unavailable';
  end if;

  -- A private account must belong to the actor; shared accounts require
  -- membership. No direct movement into another member's private account.
  select id into _existing from public.ledger_entries
  where created_by=_uid and client_operation_id=_operation_id limit 1;
  if found then
    if not exists (
      select 1 from public.ledger_entries o
      join public.ledger_entries i
        on i.transfer_group_id=o.transfer_group_id
      where o.id=_existing and o.account_id=_from_id and o.entry_kind='transfer_out'
        and i.account_id=_to_id and i.entry_kind='transfer_in'
        and o.amount_cents=_amount_cents and i.amount_cents=_amount_cents
        and o.description=btrim(_description) and i.description=btrim(_description)
        and o.occurred_on=_occurred_on and i.occurred_on=_occurred_on
    ) then raise exception 'Operation ID already used for different details'; end if;
    return _existing;
  end if;

  if _from.current_balance_cents < _amount_cents then
    raise exception 'Insufficient account balance for transfer';
  end if;

  _group := gen_random_uuid();
  insert into public.ledger_entries(
    account_id,created_by,entry_kind,amount_cents,description,
    occurred_on,client_operation_id,transfer_group_id)
  values (_from_id,_uid,'transfer_out',_amount_cents,btrim(_description),
    _occurred_on,_operation_id,_group)
  returning id into _transfer_out;
  insert into public.ledger_entries(
    account_id,created_by,entry_kind,amount_cents,description,
    occurred_on,transfer_group_id)
  values (_to_id,_uid,'transfer_in',_amount_cents,btrim(_description),_occurred_on,_group);

  update public.accounts set current_balance_cents=current_balance_cents-_amount_cents
  where id=_from_id;
  update public.accounts set current_balance_cents=current_balance_cents+_amount_cents
  where id=_to_id;
  return _transfer_out;
end;
$$;

-- An owner can choose how much personal account detail a partner may see.
create or replace function private.set_personal_account_visibility(
  _account_id uuid, _visibility text)
returns void language plpgsql security definer set search_path=''
as $$
declare
  _uid uuid := (select auth.uid());
  _acct public.accounts%rowtype;
begin
  if _uid is null then raise exception 'Sign-in required'; end if;
  if _visibility not in ('private','balance','summary','full') then
    raise exception 'Unsupported visibility';
  end if;
  select * into _acct from public.accounts where id=_account_id for update;
  if not found or _acct.kind<>'personal' or _acct.owner_user_id<>_uid then
    raise exception 'Account unavailable';
  end if;
  if _acct.visibility is distinct from _visibility then
    update public.accounts set visibility=_visibility where id=_account_id;
    insert into public.account_visibility_audit(
      account_id,actor_user_id,old_visibility,new_visibility)
    values (_account_id,_uid,_acct.visibility,_visibility);
  end if;
end;
$$;

-- All elevated methods are in the non-exposed private schema.
revoke all on function private.record_manual_entry(uuid,text,bigint,text,date,uuid),
  private.record_manual_transfer(uuid,uuid,bigint,text,date,uuid),
  private.set_personal_account_visibility(uuid,text) from public,anon;
grant execute on function private.record_manual_entry(uuid,text,bigint,text,date,uuid),
  private.record_manual_transfer(uuid,uuid,bigint,text,date,uuid),
  private.set_personal_account_visibility(uuid,text) to authenticated;

-- Public API contains invoker-only forwarding functions, not definer code.
create function public.record_manual_entry(
  _account_id uuid, _entry_kind text, _amount_cents bigint,
  _description text, _occurred_on date, _operation_id uuid)
returns uuid language sql security invoker set search_path=''
as $$ select private.record_manual_entry(
  _account_id,_entry_kind,_amount_cents,_description,_occurred_on,_operation_id) $$;

create function public.record_manual_transfer(
  _from_id uuid, _to_id uuid, _amount_cents bigint,
  _description text, _occurred_on date, _operation_id uuid)
returns uuid language sql security invoker set search_path=''
as $$ select private.record_manual_transfer(
  _from_id,_to_id,_amount_cents,_description,_occurred_on,_operation_id) $$;

create function public.set_personal_account_visibility(
  _account_id uuid, _visibility text)
returns void language sql security invoker set search_path=''
as $$ select private.set_personal_account_visibility(_account_id,_visibility) $$;

revoke all on function public.record_manual_entry(uuid,text,bigint,text,date,uuid),
  public.record_manual_transfer(uuid,uuid,bigint,text,date,uuid),
  public.set_personal_account_visibility(uuid,text) from public,anon;
grant execute on function public.record_manual_entry(uuid,text,bigint,text,date,uuid),
  public.record_manual_transfer(uuid,uuid,bigint,text,date,uuid),
  public.set_personal_account_visibility(uuid,text) to authenticated;

commit;
