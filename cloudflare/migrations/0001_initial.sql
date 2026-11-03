-- Cloudflare D1 (SQLite) schema: no Supabase, no external authentication provider.
-- Migration contains no live user records. All application data is private by default.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO schema_meta (key,value) VALUES ('schema_version','1');

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL CHECK(length(trim(display_name)) BETWEEN 1 AND 80),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS household_members (
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(household_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_members_household ON household_members(household_id);

-- No household may ever include more than two members, including races.
CREATE TRIGGER IF NOT EXISTS enforce_two_member_limit
BEFORE INSERT ON household_members
BEGIN
  SELECT CASE WHEN
    (SELECT count(*) FROM household_members WHERE household_id=NEW.household_id)>=2
  THEN RAISE(ABORT,'household member limit reached') END;
END;

-- WebAuthn/passkey credentials; enrollment/sign-in API is not active yet.
CREATE TABLE IF NOT EXISTS passkeys (
  credential_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  public_key BLOB NOT NULL,
  sign_count INTEGER NOT NULL DEFAULT 0 CHECK(sign_count>=0),
  transports TEXT,
  device_type TEXT,
  backed_up INTEGER NOT NULL DEFAULT 0 CHECK(backed_up IN (0,1)),
  nickname TEXT NOT NULL DEFAULT 'Passkey',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkeys(user_id);

CREATE TABLE IF NOT EXISTS auth_challenges (
  challenge_hash TEXT PRIMARY KEY,
  purpose TEXT NOT NULL CHECK(purpose IN ('register','login','recover')),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_challenge_expiry ON auth_challenges(expires_at);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS recovery_codes (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  redeemed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_recovery_user ON recovery_codes(user_id);

CREATE TABLE IF NOT EXISTS invitations (
  token_hash TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at INTEGER NOT NULL,
  accepted_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  accepted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_invitations_household ON invitations(household_id);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
  owner_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK(kind IN ('personal','bill_pay','groceries')),
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80),
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK(visibility IN ('private','balance','summary','full')),
  opening_balance_cents INTEGER NOT NULL DEFAULT 0
    CHECK(opening_balance_cents BETWEEN -999999999 AND 999999999),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK(
    (kind='personal' AND owner_user_id IS NOT NULL)
    OR (kind!='personal' AND owner_user_id IS NULL AND visibility='full')
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_shared_kind
ON accounts(household_id,kind) WHERE kind!='personal';
CREATE INDEX IF NOT EXISTS idx_accounts_household ON accounts(household_id);
CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(owner_user_id);

-- One immutable event per logical operation. Transfers can NEVER become an
-- expense: from/to are two sides of the same atomic INSERT.
CREATE TABLE IF NOT EXISTS ledger_events (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK(kind IN ('expense','income','transfer')),
  from_account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 999999999),
  description TEXT NOT NULL CHECK(length(trim(description)) BETWEEN 1 AND 150),
  occurred_on TEXT NOT NULL CHECK(length(occurred_on)=10),
  client_operation_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(actor_user_id,client_operation_id),
  CHECK(
    (kind='expense' AND from_account_id IS NOT NULL AND to_account_id IS NULL)
    OR (kind='income' AND to_account_id IS NOT NULL AND from_account_id IS NULL)
    OR (kind='transfer' AND from_account_id IS NOT NULL AND to_account_id IS NOT NULL
      AND from_account_id!=to_account_id)
  )
);
CREATE INDEX IF NOT EXISTS idx_ledger_from ON ledger_events(from_account_id,occurred_on);
CREATE INDEX IF NOT EXISTS idx_ledger_to ON ledger_events(to_account_id,occurred_on);
CREATE INDEX IF NOT EXISTS idx_ledger_household_date ON ledger_events(household_id,occurred_on DESC);

-- Reconstructed balances eliminate drift caused by independently cached
-- mutable account balances. Each account's balance remains separate.
CREATE VIEW IF NOT EXISTS account_balances AS
SELECT a.id AS account_id, a.household_id, a.owner_user_id, a.kind,
       a.name, a.visibility, a.opening_balance_cents,
       a.opening_balance_cents + COALESCE((
         SELECT SUM(CASE
           WHEN e.kind='income' AND e.to_account_id=a.id THEN e.amount_cents
           WHEN e.kind='expense' AND e.from_account_id=a.id THEN -e.amount_cents
           WHEN e.kind='transfer' AND e.from_account_id=a.id THEN -e.amount_cents
           WHEN e.kind='transfer' AND e.to_account_id=a.id THEN e.amount_cents
           ELSE 0 END)
         FROM ledger_events e
         WHERE e.from_account_id=a.id OR e.to_account_id=a.id
       ),0) AS balance_cents
FROM accounts a;

-- Defensive database validation in addition to future server authorization.
CREATE TRIGGER IF NOT EXISTS validate_ledger_event
BEFORE INSERT ON ledger_events
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM household_members m
    WHERE m.household_id=NEW.household_id AND m.user_id=NEW.actor_user_id
  ) THEN RAISE(ABORT,'actor is not a household member') END;

  SELECT CASE WHEN NEW.from_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM accounts a
    WHERE a.id=NEW.from_account_id AND a.household_id=NEW.household_id
      AND (a.kind!='personal' OR a.owner_user_id=NEW.actor_user_id)
  ) THEN RAISE(ABORT,'source account unavailable') END;

  SELECT CASE WHEN NEW.to_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM accounts a
    WHERE a.id=NEW.to_account_id AND a.household_id=NEW.household_id
      AND (a.kind!='personal' OR a.owner_user_id=NEW.actor_user_id)
  ) THEN RAISE(ABORT,'destination account unavailable') END;

  SELECT CASE WHEN NEW.kind='transfer'
    AND (SELECT balance_cents FROM account_balances
         WHERE account_id=NEW.from_account_id)<NEW.amount_cents
  THEN RAISE(ABORT,'insufficient source balance') END;
END;

-- Corrections require audited compensating entries in a later migration.
CREATE TRIGGER IF NOT EXISTS immutable_ledger_update
BEFORE UPDATE ON ledger_events BEGIN SELECT RAISE(ABORT,'ledger events are immutable'); END;
CREATE TRIGGER IF NOT EXISTS immutable_ledger_delete
BEFORE DELETE ON ledger_events BEGIN SELECT RAISE(ABORT,'ledger events are immutable'); END;

CREATE TRIGGER IF NOT EXISTS lock_opening_balance
BEFORE UPDATE OF opening_balance_cents ON accounts
WHEN EXISTS (
  SELECT 1 FROM ledger_events e
  WHERE e.from_account_id=OLD.id OR e.to_account_id=OLD.id
)
BEGIN SELECT RAISE(ABORT,'opening balance locked after activity'); END;

-- Explicit audit trails for owner-controlled sharing and shared rule changes.
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_household ON audit_events(household_id,created_at DESC);
