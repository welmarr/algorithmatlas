ALTER TABLE users ADD COLUMN email_verified_at timestamptz;

CREATE TABLE account_tokens (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify', 'reset')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_tokens_user_purpose_idx ON account_tokens (user_id, purpose);
CREATE INDEX account_tokens_expiry_idx ON account_tokens (expires_at);
