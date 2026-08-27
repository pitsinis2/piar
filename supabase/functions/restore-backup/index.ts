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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { orgCode, backupId } = (await req.json()) as RestoreRequest;

    if (!orgCode || !backupId) {
      return new Response(
        JSON.stringify({ error: "Missing orgCode or backupId" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Verify the caller is actually a member of this org: resolve their JWT
    // to a user, then check team_members. Prevents restoring another org's
    // state with a stolen backup id.
    const token = authHeader.substring(7);
    const { data: caller, error: callerErr } = await supabase.auth.getUser(token);
    if (callerErr || !caller?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const { data: membership } = await supabase
      .from("team_members")
      .select("id")
      .eq("org_code", orgCode)
      .eq("supabase_user_id", caller.user.id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member of this org" }), {
        status: 403,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Fetch the backup to restore
    const { data: backup, error: backupError } = await supabase
      .from("org_backups")
      .select("id, org_code, state, backed_up_at")
      .eq("id", backupId)
      .eq("org_code", orgCode)
      .single();

    if (backupError || !backup) {
      return new Response(
        JSON.stringify({ error: "Backup not found" }),
        { status: 404, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Safety snapshot of the current state before overwriting it, so a
    // mistaken restore can itself be undone.
    const { data: currentState } = await supabase
      .from("org_state")
      .select("state")
      .eq("org_code", orgCode)
      .maybeSingle();
    if (currentState?.state) {
      await supabase.from("org_backups").insert([
        { org_code: orgCode, state: currentState.state },
      ]);
    }

    // Restore
    const { error: updateError } = await supabase
      .from("org_state")
      .update({
        state: backup.state,
        updated_at: new Date().toISOString(),
      })
      .eq("org_code", orgCode);

    if (updateError) {
      throw new Error(`Failed to restore backup: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Restored backup from ${new Date(backup.backed_up_at).toLocaleString()}`,
        restoredAt: new Date().toISOString(),
      }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Restore error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
