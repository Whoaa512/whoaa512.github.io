CREATE TABLE IF NOT EXISTS user_state (
  user_key TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
