-- Secure household foundation — stage only. Not applied to a live database yet.
-- Requires Supabase Auth and PostgreSQL pgcrypto/gen_random_uuid support.
-- Deliberately NO general table INSERT/UPDATE/DELETE rights for client roles.
-- Real ledger writes must use future audited, atomic database routines.

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Member'
    check (char_length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id) -- Checkpoint scope: one household per person.
);
create index if not exists idx_members_household on public.household_members(household_id);

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code_hash bytea unique not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('personal','shared_bill_pay','shared_groceries')),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  visibility text not null default 'private'
    check (visibility in ('private','balance','summary','full')),
  opening_balance_cents bigint not null default 0,
  current_balance_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  constraint valid_account_ownership check (
    (kind = 'personal' and owner_user_id is not null
      and (household_id is not null or visibility = 'private'))
    or
    (kind <> 'personal' and household_id is not null
      and owner_user_id is null and visibility = 'full')
  )
);
create unique index if not exists idx_one_shared_account_per_kind
  on public.accounts(household_id, kind) where kind <> 'personal';
create index if not exists idx_accounts_owner on public.accounts(owner_user_id);
create index if not exists idx_accounts_household on public.accounts(household_id);

-- Immutable journal rows are prepared for next checkpoint; writing disabled for now.
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  created_by uuid not null references auth.users(id),
  entry_kind text not null check (entry_kind in ('expense','income','transfer_in','transfer_out')),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 999999999999),
  description text not null check (char_length(btrim(description)) between 1 and 150),
  transfer_group_id uuid,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint transfer_group_consistency check (
    (entry_kind in ('transfer_in','transfer_out') and transfer_group_id is not null)
    or (entry_kind in ('expense','income') and transfer_group_id is null)
  )
);
create index if not exists idx_entries_account_date
  on public.ledger_entries(account_id, occurred_on desc, id desc);

-- All private helpers run with a fixed search_path to prevent shadowed-object attacks.
create or replace function private.is_member(_household_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.household_members hm
    where hm.household_id = _household_id and hm.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_view_history(_account_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.accounts a
    where a.id = _account_id and (
      a.owner_user_id = (select auth.uid())
      or (
        a.household_id is not null
        and private.is_member(a.household_id)
        and (a.kind <> 'personal' or a.visibility = 'full')
      )
    )
  );
$$;

revoke all on function private.is_member(uuid) from public;
revoke all on function private.can_view_history(uuid) from public;
grant execute on function private.is_member(uuid), private.can_view_history(uuid) to authenticated;

-- Every exposed table has RLS, and access grants are explicit.
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.accounts enable row level security;
alter table public.ledger_entries enable row level security;

revoke all on public.profiles, public.households, public.household_members,
  public.household_invites, public.accounts, public.ledger_entries from anon, authenticated;
grant select on public.profiles, public.households, public.household_members,
  public.accounts, public.ledger_entries to authenticated;
grant update(display_name) on public.profiles to authenticated;

create policy "own_profile_read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "own_profile_name_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "member_household_read" on public.households
  for select to authenticated using (private.is_member(id));

create policy "member_roster_read" on public.household_members
  for select to authenticated using (private.is_member(household_id));

-- Members see shared account balances; personal visibility is owner-controlled.
-- Balance/summary sharing grants account-row access, not transaction history.
create policy "permitted_account_read" on public.accounts
  for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or (
      household_id is not null
      and private.is_member(household_id)
      and (kind <> 'personal' or visibility <> 'private')
    )
  );

-- Summary/balance sharing never allows raw ledger entry access.
create policy "permitted_history_read" on public.ledger_entries
  for select to authenticated using (private.can_view_history(account_id));

-- No policies for invites: codes are kept behind security-definer RPC only.
-- No INSERT/UPDATE/DELETE policies for accounts, membership, or ledger journal.

-- Automatically create a private profile after a Supabase Auth registration.
create or replace function private.after_auth_signup()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name)
    values (new.id, 'Member')
    on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.after_auth_signup() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_household_app on auth.users;
create trigger on_auth_user_created_household_app
  after insert on auth.users for each row execute function private.after_auth_signup();

-- Creates two zero-balance shared accounts, owned by the household.
create or replace function public.create_household(_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _uid uuid := (select auth.uid());
declare _hid uuid;
begin
  if _uid is null then raise exception 'Sign-in required'; end if;
  if char_length(btrim(coalesce(_name, ''))) not between 1 and 80 then
    raise exception 'Household name must be 1-80 characters';
  end if;
  if exists (select 1 from public.household_members where user_id = _uid) then
    raise exception 'Already a member of a household';
  end if;
  insert into public.households(name, created_by)
    values (btrim(_name), _uid) returning id into _hid;
  insert into public.household_members(household_id, user_id) values (_hid, _uid);
  insert into public.accounts(household_id, owner_user_id, kind, name, visibility)
  values (_hid, null, 'shared_bill_pay', 'Bill-Pay', 'full'),
         (_hid, null, 'shared_groceries', 'Groceries', 'full');
  return _hid;
end;
$$;

-- A member can create a short-lived, single-use, high-entropy invitation.
create or replace function public.create_household_invite(_household_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare _uid uuid := (select auth.uid());
declare _code text;
begin
  if _uid is null or not private.is_member(_household_id) then
    raise exception 'Not authorized to invite to this household';
  end if;
  perform 1 from public.households where id = _household_id for update;
  if (select count(*) from public.household_members where household_id = _household_id) >= 2 then
    raise exception 'Household is full';
  end if;
  _code := encode(gen_random_bytes(32), 'hex');
  insert into public.household_invites(household_id, code_hash, created_by, expires_at)
  values (_household_id, digest(_code, 'sha256'), _uid, now() + interval '48 hours');
  return _code;
end;
$$;

create or replace function public.join_household_with_invite(_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _uid uuid := (select auth.uid());
declare _invite public.household_invites%rowtype;
begin
  if _uid is null then raise exception 'Sign-in required'; end if;
  if _code is null or _code !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid invite code';
  end if;
  if exists (select 1 from public.household_members where user_id = _uid) then
    raise exception 'Already a member of a household';
  end if;

  -- Lock the token row; a second simultaneous accept cannot use it.
  select * into _invite from public.household_invites
  where code_hash = digest(_code, 'sha256') for update;
  if not found or _invite.used_at is not null or _invite.expires_at <= now() then
    raise exception 'Invite is invalid, used, or expired';
  end if;
  -- Serialize membership additions on the household row.
  perform 1 from public.households where id = _invite.household_id for update;
  if (select count(*) from public.household_members
      where household_id = _invite.household_id) >= 2 then
    raise exception 'Household is full';
  end if;
  insert into public.household_members(household_id, user_id)
    values (_invite.household_id, _uid);
  update public.household_invites set used_at = now() where id = _invite.id;
  return _invite.household_id;
end;
$$;

-- Create a personal account with zero balance, bound to its owner.
-- Personal account sharing remains private until the owner explicitly changes it.
create or replace function public.create_personal_account(_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare _uid uuid := (select auth.uid());
declare _hid uuid;
declare _aid uuid;
begin
  if _uid is null then raise exception 'Sign-in required'; end if;
  if char_length(btrim(coalesce(_name, ''))) not between 1 and 80 then
    raise exception 'Account name must be 1-80 characters';
  end if;
  select household_id into _hid from public.household_members where user_id = _uid;
  insert into public.accounts(household_id, owner_user_id, kind, name, visibility)
    values (_hid, _uid, 'personal', btrim(_name), 'private')
    returning id into _aid;
  return _aid;
end;
$$;

revoke all on function public.create_household(text),
  public.create_household_invite(uuid),
  public.join_household_with_invite(text),
  public.create_personal_account(text) from public, anon;
grant execute on function public.create_household(text),
  public.create_household_invite(uuid),
  public.join_household_with_invite(text),
  public.create_personal_account(text) to authenticated;

commit;
