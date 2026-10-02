CREATE TABLE email_outbox (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK (purpose IN ('verify','reset')),
 recipient text NOT NULL CHECK (length(recipient) <= 254),
 template_version integer NOT NULL DEFAULT 1 CHECK (template_version = 1),
 token_hash char(64) NOT NULL,
 encrypted_payload text CHECK (length(encrypted_payload) <= 8192),
 dedupe_key char(64) NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','retry','sent','failed','cancelled')),
 attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
 available_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 claim_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_attempt_at timestamptz,
 finished_at timestamptz,
 last_error_code text
);
CREATE INDEX email_outbox_claim_idx ON email_outbox (available_at,created_at) WHERE status IN ('pending','retry','processing');
CREATE INDEX email_outbox_owner_idx ON email_outbox (user_id);
CREATE TABLE service_heartbeats (
 name text PRIMARY KEY CHECK (name IN ('email')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL CHECK (status IN ('ready','paused','unavailable','stopped'))
);
