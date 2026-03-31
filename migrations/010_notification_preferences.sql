-- 010: User notification preferences for sourcing directory
-- Stores per-user, per-tenant notification toggle settings
-- preference_key: 'companies_new', 'articles_semiconductor', 'articles_space',
--                 'articles_biotech', 'articles_defense', 'jobs_new',
--                 'events_new', 'digest_frequency'
-- For digest_frequency: frequency column holds 'real-time' or 'weekly'

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,       -- links to auth.users.id
  tenant_id      uuid NOT NULL REFERENCES directory_tenants(id) ON DELETE CASCADE,
  preference_key text NOT NULL,
  enabled        boolean DEFAULT true,
  frequency      text DEFAULT 'real-time',  -- 'real-time' or 'weekly'
  updated_at     timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user   ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_tenant ON user_notification_preferences(tenant_id);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read and write their own preferences only
CREATE POLICY "users read own prefs"
  ON user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own prefs"
  ON user_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own prefs"
  ON user_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own prefs"
  ON user_notification_preferences FOR DELETE
  USING (auth.uid() = user_id);
