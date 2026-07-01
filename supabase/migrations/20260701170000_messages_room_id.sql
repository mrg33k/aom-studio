-- corner:one-write-path R2 (2026-07-01): canonical room identity on messages.
--
-- room_id names the THREAD a row lives in, ending the project-doubles-as-
-- mission / client_id-doubles-as-channel ambiguity that mis-filed messages:
--
--   shared rooms:   room_id = client_id                      ('shared:<slug>')
--   mission rooms:  room_id = <client_id>:mission:<canonical mission_slug>
--   project rooms:  room_id = <client_id>:project:<project>
--   agent 1:1:      room_id = <client_id>:agent:<agent>
--
-- Additive + nullable: api/_lib/write-message.js dual-writes it from this
-- migration on; scripts/backfill-room-id.py (AOM-EA) derives it for history.
-- Readers move in R3; nothing depends on it yet. Reversible: DROP COLUMN.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS room_id text;

-- Reader-shaped index for R3 (thread fetch = room_id + newest-first).
CREATE INDEX IF NOT EXISTS idx_messages_room_id_timestamp
  ON messages (room_id, "timestamp" DESC);
