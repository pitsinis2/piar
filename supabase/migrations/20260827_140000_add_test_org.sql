-- Insert P00000000 test organization
INSERT INTO organizations (code, name, type, plan, contact_email, active)
VALUES ('P00000000', 'Development / Test Platform', 'production', 'standard', 'admin@test.local', true)
ON CONFLICT (code) DO UPDATE SET
  name = 'Development / Test Platform',
  active = true,
  updated_at = CURRENT_TIMESTAMP;
