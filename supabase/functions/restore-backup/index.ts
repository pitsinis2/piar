import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface RestoreRequest {
  orgCode: string;
  backupId: string;
}

function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { orgCode, backupId } = (await req.json()) as RestoreRequest;

    if (!orgCode || !backupId) {
      return new Response(
        JSON.stringify({ error: "Missing orgCode or backupId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Fetch the backup to restore
    const { data: backup, error: backupError } = await supabase
      .from("org_backups")
      .select("*")
      .eq("id", backupId)
      .eq("org_code", orgCode)
      .single();

    if (backupError || !backup) {
      return new Response(
        JSON.stringify({ error: "Backup not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update org_state with the backup data
    const { error: updateError } = await supabase
      .from("org_state")
      .update({
        data: backup.data,
        synced_at: new Date().toISOString(),
      })
      .eq("org_code", orgCode);

    if (updateError) {
      throw new Error(`Failed to restore backup: ${updateError.message}`);
    }

    // Record the restore action
    await supabase.from("org_backups").insert([
      {
        org_code: orgCode,
        data: backup.data,
        backup_type: "restore",
        notes: `Restored from backup ${backupId} created at ${backup.created_at}`,
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Restored backup from ${new Date(backup.created_at).toLocaleString()}`,
        restoredAt: new Date().toISOString(),
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Restore error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
