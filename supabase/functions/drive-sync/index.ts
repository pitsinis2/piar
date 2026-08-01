// Supabase Edge Function: drive-sync
//
// Purpose:
// - Run every 15 minutes via scheduled trigger
// - Claim companies that are due for their configured local time (2x/day)
// - For each claimed company, start a sync run and (later) export incrementally to Google Drive.
//
// Notes:
// - The real export pipeline is intentionally TODO until the app data is stored in Postgres and
//   the Google OAuth connect flow is implemented.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type DueCompany = { company_id: string; slot: 1 | 2 };

function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

serve(async (_req) => {
  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: due, error: dueError } = await supabase.rpc("drive_sync_claim_due_companies");
    if (dueError) throw dueError;
    const dueCompanies: DueCompany[] = Array.isArray(due) ? due : [];

    const results: Array<{ companyId: string; slot: 1 | 2; ok: boolean; error?: string }> = [];

    for (const entry of dueCompanies) {
      const companyId = entry.company_id;
      const slot = entry.slot;
      try {
        const { data: runRow, error: runError } = await supabase
          .from("drive_sync_runs")
          .insert({ company_id: companyId, slot, status: "running" })
          .select("id")
          .single();
        if (runError) throw runError;

        // TODO: Implement incremental export to Drive:
        // - Load OAuth tokens from company_drive_oauth
        // - Ensure Drive root folder exists
        // - Export new/changed items since last_sync_at
        // - Update company_drive_sync_settings.last_sync_at

        await supabase
          .from("drive_sync_runs")
          .update({ status: "success", finished_at: new Date().toISOString() })
          .eq("id", runRow.id);

        results.push({ companyId, slot, ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ companyId, slot, ok: false, error: message });
        await supabase
          .from("drive_sync_runs")
          .update({ status: "error", finished_at: new Date().toISOString(), error: message })
          .match({ company_id: companyId, slot, status: "running" });
      }
    }

    return new Response(JSON.stringify({ ok: true, claimed: dueCompanies.length, results }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      headers: { "content-type": "application/json" },
      status: 500,
    });
  }
});

