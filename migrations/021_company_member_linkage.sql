-- Migration 021: Company-Member Linkage
-- Adds companies table and company_id foreign key to members table

-- Create companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS companies (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    text        NOT NULL DEFAULT 'aom',
  name         text        NOT NULL,
  description  text,
  website      text,
  industry     text,
  size         text CHECK (size IN ('micro', 'small', 'medium', 'large', 'enterprise')),
  status       text        DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  metadata     jsonb       DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Add company_id column to members table if it doesn't exist
ALTER TABLE members ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_client_id ON companies(client_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_members_company_id ON members(company_id);

-- Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- RLS policies for companies table
-- anon: AOM dashboard (unauthenticated)
CREATE POLICY "anon_read_aom_companies" ON companies
  FOR SELECT TO anon
  USING (client_id = 'aom');

CREATE POLICY "anon_insert_aom_companies" ON companies
  FOR INSERT TO anon
  WITH CHECK (client_id = 'aom');

CREATE POLICY "anon_update_aom_companies" ON companies
  FOR UPDATE TO anon
  USING (client_id = 'aom');

-- authenticated: explicit per-operation policies for tenant isolation
CREATE POLICY "tenant_select_companies" ON companies
  FOR SELECT TO authenticated
  USING (client_id = current_client_id());

CREATE POLICY "tenant_insert_companies" ON companies
  FOR INSERT TO authenticated
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_update_companies" ON companies
  FOR UPDATE TO authenticated
  USING (client_id = current_client_id());

-- Insert some sample companies for AOM client
INSERT INTO companies (client_id, name, description, website, industry, size, status)
VALUES 
  ('aom', 'AOM Studio', 'AI Operations Management platform', 'https://aom.studio', 'technology', 'small', 'active'),
  ('aom', 'Ambition Mechanical', 'HVAC and mechanical services company', 'https://ambitionmechanical.com', 'construction', 'medium', 'active'),
  ('aom', 'Space Rising', 'Arizona space industry directory', 'https://spacerising.org', 'aerospace', 'small', 'active')
ON CONFLICT DO NOTHING;

-- Update existing AOM members to have company associations (optional - for testing)
-- This assigns members to companies based on email domain or other logic
-- For now, we'll leave company_id as NULL for existing members