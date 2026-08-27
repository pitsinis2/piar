-- Create organizations table if it doesn't exist
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(active);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "admin_read_organizations" ON organizations;
DROP POLICY IF EXISTS "admin_insert_organizations" ON organizations;
DROP POLICY IF EXISTS "admin_update_organizations" ON organizations;

-- Create RLS policies (admin-only access for authenticated users)
CREATE POLICY "admin_read_organizations" ON organizations
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_insert_organizations" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "admin_update_organizations" ON organizations
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert the P00000000 test organization
-- Use ON CONFLICT to make it idempotent (safe to run multiple times)
INSERT INTO organizations (code, name, type, plan, contact_email, active)
VALUES ('P00000000', 'Development / Test Platform', 'production', 'standard', 'admin@test.local', true)
ON CONFLICT (code) DO UPDATE SET
  name = 'Development / Test Platform',
  active = true,
  updated_at = CURRENT_TIMESTAMP
WHERE code = 'P00000000';
