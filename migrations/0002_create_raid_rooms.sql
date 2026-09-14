-- レイド魔法陣: ルームテーブル
CREATE TABLE IF NOT EXISTS raid_rooms (
  code        TEXT    PRIMARY KEY,
  host_id     TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);

-- レイド魔法陣: 参加者テーブル
CREATE TABLE IF NOT EXISTS raid_members (
  room_code   TEXT    NOT NULL,
  device_id   TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  joined_at   INTEGER NOT NULL,
  PRIMARY KEY (room_code, device_id)
);

-- レイド魔法陣: シグナリングメッセージ（WebRTC の SDP / ICE を中継する）
-- id は SQLite の rowid 別名で自動採番され、ポーリングのカーソルとして使う
CREATE TABLE IF NOT EXISTS raid_signals (
  id          INTEGER PRIMARY KEY,
  room_code   TEXT    NOT NULL,
  from_id     TEXT    NOT NULL,
  to_id       TEXT    NOT NULL,
  kind        TEXT    NOT NULL,
  payload     TEXT    NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raid_signals_poll    ON raid_signals(room_code, id);
CREATE INDEX IF NOT EXISTS idx_raid_members_room    ON raid_members(room_code);
CREATE INDEX IF NOT EXISTS idx_raid_rooms_expires   ON raid_rooms(expires_at);
