-- Handoff nonces already exchanged for an editor session: a handoff token opens
-- one session only. Rows are purged once the token itself has expired.
CREATE TABLE consumed_handoffs (
  nonce       TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX consumed_handoffs_expires_idx ON consumed_handoffs (expires_at);
