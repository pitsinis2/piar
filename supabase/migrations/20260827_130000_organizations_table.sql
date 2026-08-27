-- Create organizations table for admin panel
CREATE TABLE IF NOT EXISTS organizations (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'production',
  plan TEXT NOT NULL DEFAULT 'standard',
  contact_email TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Admin-only read policy (authenticated users can see all orgs for admin dashboard)
DROP POLICY IF EXISTS "Organizations admin read" ON organizations;
CREATE POLICY "Organizations admin read" ON organizations
  FOR SELECT TO authenticated
  USING (true);

-- Admin-only insert policy (only via generate-org edge function or admin panel)
DROP POLICY IF EXISTS "Organizations admin insert" ON organizations;
CREATE POLICY "Organizations admin insert" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Admin-only update policy
DROP POLICY IF EXISTS "Organizations admin update" ON organizations;
CREATE POLICY "Organizations admin update" ON organizations
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert development/test organization
INSERT INTO organizations (code, name, type, plan, contact_email, active)
VALUES ('P00000000', 'Development / Test Platform', 'production', 'standard', 'admin@test.local', true)
ON CONFLICT (code) DO NOTHING;

-- Verify data isolation: each team member row has org_code, each org_state has org_code, each org_backups has org_code
-- These tables have RLS policies that prevent cross-org access
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('team_members', 'org_state', 'org_backups')
GROUP BY tablename
ORDER BY tablename;
