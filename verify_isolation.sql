-- Show RLS policies on core tables
SELECT 
  tablename,
  policyname,
  permissive,
  ARRAY_AGG(DISTINCT role::text) as roles,
  qual
FROM pg_policies
WHERE tablename IN ('team_members', 'org_state', 'org_backups')
GROUP BY tablename, policyname, permissive, qual
ORDER BY tablename, policyname;

-- Show how many team_members we have per org
SELECT 
  org_code,
  COUNT(*) as member_count
FROM team_members
GROUP BY org_code
ORDER BY org_code;

-- Show org_backups count per org
SELECT 
  org_code,
  COUNT(*) as backup_count,
  MAX(created_at) as latest_backup
FROM org_backups
GROUP BY org_code
ORDER BY org_code;
