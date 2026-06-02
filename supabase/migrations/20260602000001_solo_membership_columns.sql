-- Solo membership tier support
-- Adds columns to track solo plan subscriptions (monthly vs annual)
-- Applies to space-rising membership page M2

ALTER TABLE directory_companies
ADD COLUMN IF NOT EXISTS paid_stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS membership_billing text;

-- Create index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_dir_companies_subscription
ON directory_companies(paid_stripe_subscription_id)
WHERE paid_stripe_subscription_id IS NOT NULL;

-- Add comment for context
COMMENT ON COLUMN directory_companies.paid_stripe_subscription_id
IS 'Stripe subscription ID for recurring membership (monthly plans)';

COMMENT ON COLUMN directory_companies.membership_billing
IS 'Billing frequency: annual (one-time payment) or monthly (recurring subscription)';
