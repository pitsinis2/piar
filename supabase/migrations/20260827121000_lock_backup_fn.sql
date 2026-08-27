-- Only the scheduler may run backups, not app clients.
revoke execute on function run_org_backups() from public;
revoke execute on function run_org_backups() from anon;
revoke execute on function run_org_backups() from authenticated;
