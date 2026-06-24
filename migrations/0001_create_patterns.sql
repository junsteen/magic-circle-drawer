-- アカシックレコード: 魔法陣パターンテーブル
CREATE TABLE IF NOT EXISTS patterns (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  data        TEXT    NOT NULL,
  thumbnail   TEXT,
  author_id   TEXT    NOT NULL,
  downloads   INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patterns_created_at ON patterns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_downloads   ON patterns(downloads DESC);
