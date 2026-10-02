CREATE TABLE python_workspaces (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 64),
 source text NOT NULL CHECK (length(source) BETWEEN 1 AND 4096),
 input jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX python_workspaces_owner_idx ON python_workspaces(user_id, created_at DESC);
