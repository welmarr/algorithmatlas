CREATE TABLE operational_controls (
  name text PRIMARY KEY CHECK(name IN ('python_disabled','python_guest_disabled','python_verified_disabled','runner_paused','email_paused','signup_disabled')),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE operational_metrics (
  day date NOT NULL,
  name text NOT NULL,
  value bigint NOT NULL DEFAULT 0 CHECK(value >= 0),
  PRIMARY KEY(day,name)
);
CREATE TABLE runner_runtime (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  runtime_id text NOT NULL,
  heartbeat_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE execution_jobs (
  id uuid PRIMARY KEY,
  capability_hash char(64) NOT NULL,
  owner_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  client_hash char(64) NOT NULL,
  ip_hash char(64) NOT NULL,
  idempotency_hash char(64) NOT NULL,
  request_hash char(64) NOT NULL,
  status text NOT NULL CHECK(status IN ('queued','running','cancelling','completed','failed','cancelled')),
  source text CHECK(length(source)<=4096),
  input jsonb CHECK(octet_length(input::text)<=20000),
  result jsonb CHECK(octet_length(result::text)<=300000),
  error_line integer,
  termination_reason text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count BETWEEN 0 AND 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz NOT NULL,
  queue_deadline timestamptz NOT NULL,
  cancel_requested_at timestamptz,
  UNIQUE(client_hash,idempotency_hash)
);
CREATE INDEX execution_jobs_claim ON execution_jobs(created_at,id) WHERE status='queued';
CREATE INDEX execution_jobs_expiry ON execution_jobs(expires_at);
CREATE INDEX execution_jobs_client_active ON execution_jobs(client_hash,status);
