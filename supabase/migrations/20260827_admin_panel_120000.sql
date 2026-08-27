-- Create admin_users table for admin panel authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  name text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Create organizations table (if not exists)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type text DEFAULT 'production', -- 'production', 'demo', 'internal'
  plan text DEFAULT 'standard', -- 'standard', 'pro', 'enterprise'
  contact_email text,
  active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure team_members table has org_code column (if not already)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS org_code text UNIQUE;

-- Create app_users table for per-org users (if not exists)
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_code text NOT NULL REFERENCES organizations(code) ON DELETE CASCADE,
  username text NOT NULL,
  first_name text,
  last_name text,
  email text,
  pin text,
  default_pin boolean DEFAULT false,
  role text DEFAULT 'operator', -- 'admin', 'manager', 'operator'
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_code, username)
);

-- Insert initial admin user (email: pitsinisf@gmail.com, password: 123456)
INSERT INTO admin_users (email, password, name, active)
VALUES ('pitsinisf@gmail.com', '123456', 'Fotis Pitsinis', true)
ON CONFLICT (email) DO NOTHING;

-- Enable RLS on admin_users (restrict to authenticated users)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on app_users
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Note: Admin users table is not accessible via normal Supabase auth
-- Access is through the admin panel only (read-only via edge function or direct query with service role)
