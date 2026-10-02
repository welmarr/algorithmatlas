CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);

CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE problem_progress (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id text NOT NULL,
  explored_at timestamptz NOT NULL DEFAULT now(),
  simulation_count integer NOT NULL DEFAULT 0 CHECK (simulation_count >= 0),
  last_run_at timestamptz,
  PRIMARY KEY (user_id, problem_id)
);

CREATE TABLE simulation_runs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  event_count integer NOT NULL CHECK (event_count >= 0 AND event_count <= 100000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX simulation_runs_user_recent_idx ON simulation_runs (user_id, created_at DESC);

CREATE TABLE saved_inputs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id text NOT NULL,
  name text NOT NULL,
  input jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX saved_inputs_user_recent_idx ON saved_inputs (user_id, created_at DESC);

CREATE TABLE user_submissions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id text NOT NULL,
  language text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_submissions_user_recent_idx ON user_submissions (user_id, created_at DESC);

CREATE TABLE learning_progress (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('exploring', 'practicing', 'confident')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, concept_id)
);

CREATE TABLE provider_configurations (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id text NOT NULL,
  model text NOT NULL,
  endpoint text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider_id)
);
