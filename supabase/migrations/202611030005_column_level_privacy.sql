-- Fine-grained data minimization: RLS controls rows; column grants protect
-- sensitive metadata even on a balance-only shared personal account.
begin;
revoke select on public.accounts from authenticated;
grant select (
  id, household_id, owner_user_id, kind, name, visibility,
  current_balance_cents, created_at
) on public.accounts to authenticated;

-- Do not expose linkage/idempotency/actor IDs through raw journal reads.
revoke select on public.ledger_entries from authenticated;
grant select (
  id, account_id, entry_kind, amount_cents, description,
  occurred_on, created_at
) on public.ledger_entries to authenticated;

commit;
