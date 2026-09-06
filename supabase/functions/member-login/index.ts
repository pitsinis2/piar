import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Creates org-level login credentials for workspace members, called from the
// app itself. Authorization: the caller must be a logged-in Supabase user who
// is an admin in team_members for their org. The new login is always created
// inside the caller's own org — the org code is never taken from the request.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("OK", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });

    // Identify the caller from their JWT.
    const { data: callerData, error: callerErr } = await supabase.auth.getUser(jwt);
    if (callerErr || !callerData?.user) return json({ error: "Invalid session" }, 401);

    // The caller must be an org admin; their org is where the login is created.
    const { data: caller, error: memberErr } = await supabase
      .from("team_members")
      .select("org_code, role")
      .eq("supabase_user_id", callerData.user.id)
      .maybeSingle();
    if (memberErr || !caller) return json({ error: "Caller is not a team member" }, 403);
    if (caller.role !== "admin") return json({ error: "Only admins can manage member logins" }, 403);

    const orgCode = String(caller.org_code || "").toUpperCase();
    const body = await req.json();
    const action = String(body.action || "create");
    const username = String(body.username || "").trim().toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(username)) {
      return json({ error: "Username must use English letters, digits, - or _" }, 400);
    }

    if (action === "create") {
      const pin = String(body.pin || "123456");
      // team_members.role only accepts 'admin' or 'worker'; the app's own role
      // vocabulary (admin/manager/user) has to be mapped onto that.
      const role = body.role === "admin" ? "admin" : "worker";
      if (!/^\d{6}$/.test(pin)) return json({ error: "PIN must be 6 digits" }, 400);

      // If this org already has a login with this username, hand its id back so
      // the caller can link to it instead of creating a duplicate account.
      const { data: existing } = await supabase
        .from("team_members")
        .select("username, supabase_user_id")
        .eq("org_code", orgCode)
        .eq("username", username)
        .maybeSingle();
      if (existing) {
        return json({
          success: true,
          adopted: true,
          username,
          supabaseUserId: existing.supabase_user_id,
        });
      }

      const syntheticEmail = `${username}@${orgCode.toLowerCase()}.internal`;
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: syntheticEmail,
        password: pin,
        email_confirm: true,
      });
      if (authErr) return json({ error: "auth: " + authErr.message }, 500);

      const { error: insertErr } = await supabase.from("team_members").insert([
        {
          org_code: orgCode,
          supabase_user_id: authUser.user.id,
          username,
          email: null,
          role,
        },
      ]);
      if (insertErr) {
        // Roll back the orphaned auth account so a retry works.
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return json({ error: "team_members: " + insertErr.message }, 500);
      }

      return json({ success: true, username, supabaseUserId: authUser.user.id });
    }

    // Everything below changes an existing login, so work out what is being
    // targeted and refuse the two ways an org can lock itself out.
    const { data: target } = await supabase
      .from("team_members")
      .select("username, role, active, supabase_user_id")
      .eq("org_code", orgCode)
      .eq("username", username)
      .maybeSingle();

    if (action === "disable" || action === "delete") {
      if (!target) {
        // Nothing to revoke. Deleting something already gone is a success, not
        // an error - the caller wanted it absent and it is.
        return json({ success: true, username, alreadyGone: true });
      }
      if (target.supabase_user_id === callerData.user.id) {
        return json({ error: "You cannot remove your own login" }, 409);
      }
      if (target.role === "admin") {
        const { data: admins } = await supabase
          .from("team_members")
          .select("username")
          .eq("org_code", orgCode)
          .eq("role", "admin")
          .neq("active", false)
          .neq("username", username);
        if (!admins?.length) {
          return json({ error: "This is the organisation's only admin login" }, 409);
        }
      }
    }

    // Deactivate: the login stays, but it can no longer sign in. Reversible.
    if (action === "disable") {
      const { error } = await supabase
        .from("team_members")
        .update({ active: false })
        .eq("org_code", orgCode)
        .eq("username", username);
      if (error) return json({ error: "team_members: " + error.message }, 500);
      return json({ success: true, username, active: false });
    }

    // Reactivate someone who was deactivated.
    if (action === "enable") {
      if (!target) return json({ error: "No login account for this member" }, 404);
      const { error } = await supabase
        .from("team_members")
        .update({ active: true })
        .eq("org_code", orgCode)
        .eq("username", username);
      if (error) return json({ error: "team_members: " + error.message }, 500);
      return json({ success: true, username, active: true });
    }

    // Delete: the credential itself goes, so the account cannot come back.
    if (action === "delete") {
      const { error: delErr } = await supabase
        .from("team_members")
        .delete()
        .eq("org_code", orgCode)
        .eq("username", username);
      if (delErr) return json({ error: "team_members: " + delErr.message }, 500);

      if (target?.supabase_user_id) {
        const { error: authErr } = await supabase.auth.admin.deleteUser(target.supabase_user_id);
        if (authErr) {
          return json({ error: "Login removed, but the credential remained: " + authErr.message }, 500);
        }
      }
      return json({ success: true, username, deleted: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("member-login error:", message);
    return json({ error: message }, 500);
  }
});
