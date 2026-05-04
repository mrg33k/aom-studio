-- EAN-1: EA naming primitive
-- display_name = user-provided name (nullable until user names the EA)
-- last_naming_nudge_at = cadence tracking for the conversational naming prompt
--
-- Render rule: display_name || name  (name already holds "{workspace} EA" from create-world)
-- When display_name IS NULL: EA may include naming nudge in system prompt
-- When display_name IS NOT NULL: EA never nudges again

ALTER TABLE agent_status
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS last_naming_nudge_at timestamptz;
