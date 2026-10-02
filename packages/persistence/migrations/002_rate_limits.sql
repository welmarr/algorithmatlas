CREATE TABLE rate_limits (
  key_hash char(64) PRIMARY KEY,
  window_end timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts >= 1)
);
CREATE INDEX rate_limits_window_end_idx ON rate_limits (window_end);
