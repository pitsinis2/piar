import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Admin-panel backend. All reads/writes run with the service role, so the
// panel never needs direct table grants. Access requires a signed-in Supabase
// user who is listed in public.platform_admins - see the auth check below.

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

// Names anyone would try first. An org login is admin-level, and the org code
// is not a secret, so a guessable username is most of the way into a tenant.
const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "superuser", "sysadmin",
  "developer", "dev", "support", "test", "tester", "demo", "user", "guest",
]);

function isAllowedUsername(username: string): boolean {
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) return false;
  return !RESERVED_USERNAMES.has(username);
}

function usernameRejectionReason(username: string): string {
  if (RESERVED_USERNAMES.has(username)) {
    return `"${username}" is too easy to guess - choose a name specific to the person`;
  }
  return "Username must be 3-30 characters: letters, numbers, dot, dash or underscore";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("OK", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });

    // Access is a real signed-in session plus membership of platform_admins.
    // The previous gate was a static token that the panel shipped in its own
    // page source, so anyone who opened the page could read and reuse it.
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!accessToken) return json({ error: "Not signed in" }, 401);

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    const caller = userData?.user;
    if (userError || !caller) return json({ error: "Session expired - sign in again" }, 401);

    // Matched on the email Supabase verified for this session, lowercased.
    const callerEmail = String(caller.email || "").trim().toLowerCase();
    if (!callerEmail) return json({ error: "Account has no email" }, 403);

    const { data: adminRow, error: adminError } = await supabase
      .from("platform_admins")
      .select("email, active")
      .eq("email", callerEmail)
      .maybeSingle();
    if (adminError) {
      console.error("platform_admins lookup:", adminError.message);
      return json({ error: "Could not verify admin access" }, 500);
    }
    if (!adminRow?.active) {
      console.warn("admin-org denied for", callerEmail);
      return json({ error: "This account is not an administrator" }, 403);
    }

    const body = await req.json();
    const action = String(body.action || "");
    const orgCode = String(body.orgCode || "").toUpperCase();

    // ── INFO: users + usage for one org ──────────────────────────────
    if (action === "info") {
      if (!orgCode) return json({ error: "Missing orgCode" }, 400);

      const { data: stateRow, error: stateErr } = await supabase
        .from("org_state")
        .select("state, updated_at")
        .eq("org_code", orgCode)
        .maybeSingle();
      if (stateErr) console.error("org_state read:", stateErr.message);

      const d = (stateRow?.state ?? {}) as Record<string, unknown[]>;
      const users = (Array.isArray(d.users) ? d.users : []).map((u: any) => ({
        id: u.id,
        name: [u.name, u.surname].filter(Boolean).join(" ") || u.username || "—",
        username: u.username || "",
        role: u.role || "user",
        status: u.status || "active",
        email: u.email || "",
        tel: u.tel || "",
        mustChangePin: u.mustChangePin !== false, // true = still on default PIN
        lastLoginAt: u.lastLoginAt || null,
        loginEnabled: u.loginEnabled !== false,
      }));

      const counts = {
        users: users.length,
        projects: Array.isArray(d.projects) ? d.projects.length : 0,
        areas: Array.isArray(d.areas) ? d.areas.length : 0,
        clients: Array.isArray(d.clients) ? d.clients.length : 0,
        equipment: Array.isArray(d.equipment) ? d.equipment.length : 0,
      };

      const { count: backupCount } = await supabase
        .from("org_backups")
        .select("*", { count: "exact", head: true })
        .eq("org_code", orgCode);

      const { data: logins, error: loginErr } = await supabase
        .from("team_members")
        .select("username, email, role, active, created_at")
        .eq("org_code", orgCode);
      if (loginErr) console.error("team_members read:", loginErr.message);

      return json({
        users,
        counts,
        backups: backupCount ?? 0,
        lastSync: stateRow?.updated_at ?? null,
        logins: logins ?? [],
        _errors: [stateErr?.message, loginErr?.message].filter(Boolean),
      });
    }

    // ── RESET PIN of an internal app user (inside org_state) ─────────
    if (action === "resetPin") {
      const userId = String(body.userId || "");
      const newPin = String(body.newPin || "123456");
      if (!orgCode || !userId) return json({ error: "Missing orgCode or userId" }, 400);
      if (!/^\d{6}$/.test(newPin)) return json({ error: "PIN must be 6 digits" }, 400);

      const { data: stateRow, error: readErr } = await supabase
        .from("org_state")
        .select("state")
        .eq("org_code", orgCode)
        .single();
      if (readErr || !stateRow) return json({ error: "Org state not found" }, 404);

      const state = stateRow.state as Record<string, unknown>;
      const users = Array.isArray(state.users) ? (state.users as any[]) : [];
      const user = users.find((u) => u.id === userId);
      if (!user) return json({ error: "User not found in org" }, 404);

      user.pinCode = newPin;
      user.mustChangePin = true;

      const { error: writeErr } = await supabase
        .from("org_state")
        .update({ state, updated_at: new Date().toISOString() })
        .eq("org_code", orgCode);
      if (writeErr) return json({ error: writeErr.message }, 500);

      return json({ success: true, userName: [user.name, user.surname].filter(Boolean).join(" ") });
    }

    // ── RESET the org-level login PIN (Supabase Auth password) ───────
    if (action === "resetOrgPin") {
      const username = String(body.username || "");
      const newPin = String(body.newPin || "123456");
      if (!orgCode || !username) return json({ error: "Missing orgCode or username" }, 400);
      if (!/^\d{6}$/.test(newPin)) return json({ error: "PIN must be 6 digits" }, 400);

      const { data: member } = await supabase
        .from("team_members")
        .select("supabase_user_id")
        .eq("org_code", orgCode)
        .eq("username", username)
        .maybeSingle();
      if (!member?.supabase_user_id) return json({ error: "Login account not found" }, 404);

      const { error: authErr } = await supabase.auth.admin.updateUserById(
        member.supabase_user_id,
        { password: newPin },
      );
      if (authErr) return json({ error: authErr.message }, 500);

      return json({ success: true });
    }

    // ── DELETE a login account (auth user + team_members row) ────────
    if (action === "deleteLogin") {
      const username = String(body.username || "").trim().toLowerCase();
      if (!orgCode || !username) return json({ error: "Missing orgCode or username" }, 400);

      const { data: rows, error: listErr } = await supabase
        .from("team_members")
        .select("username, role, active, supabase_user_id")
        .eq("org_code", orgCode);
      if (listErr) return json({ error: "team_members: " + listErr.message }, 500);

      const target = (rows ?? []).find((r) => r.username === username);
      if (!target) return json({ error: "Login account not found" }, 404);

      // Never leave an organisation with no way in.
      const otherAdmins = (rows ?? []).filter(
        (r) => r.username !== username && r.role === "admin" && r.active !== false,
      );
      if (target.role === "admin" && otherAdmins.length === 0) {
        return json({
          error: "This is the only admin login for the organisation - create another one first",
        }, 409);
      }

      const { error: delMemberErr } = await supabase
        .from("team_members")
        .delete()
        .eq("org_code", orgCode)
        .eq("username", username);
      if (delMemberErr) return json({ error: "team_members: " + delMemberErr.message }, 500);

      // The credential itself, so the account cannot sign in again.
      if (target.supabase_user_id) {
        const { error: delAuthErr } = await supabase.auth.admin.deleteUser(target.supabase_user_id);
        if (delAuthErr) {
          return json({
            error: "Login row removed, but the auth account remained: " + delAuthErr.message,
          }, 500);
        }
      }

      return json({ success: true, message: `Login "${username}" deleted` });
    }

    // ── CREATE MEMBER LOGIN: add org-level login credentials for a workspace member
    if (action === "createMemberLogin") {
      const userId = String(body.userId || "");
      const username = String(body.username || "").trim().toLowerCase();
      const pin = String(body.pin || "123456");
      if (!orgCode || !userId || !username) return json({ error: "Missing orgCode, userId, or username" }, 400);
      // Same naming rules as the org admin login: a member login is still a way
      // into the tenant, so no guessable names here either.
      if (!isAllowedUsername(username)) {
        return json({ error: usernameRejectionReason(username) }, 400);
      }
      if (!/^\d{6}$/.test(pin)) return json({ error: "PIN must be 6 digits" }, 400);

      const syntheticEmail = `${username}@${orgCode.toLowerCase()}.internal`;
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: syntheticEmail,
        password: pin,
        email_confirm: true,
      });
      if (authErr) return json({ error: "auth: " + authErr.message }, 500);

      const { error: memberErr } = await supabase.from("team_members").upsert(
        [{
          org_code: orgCode,
          supabase_user_id: authUser.user.id,
          username,
          email: null,
          // team_members.role only accepts 'admin' or 'worker'.
          role: "worker",
        }],
        { onConflict: "org_code,username" }
      );
      if (memberErr) return json({ error: "team_members: " + memberErr.message }, 500);

      return json({ success: true, message: `Login created for ${username}` });
    }

    // ── CREATE ORG: full provisioning so the client can actually log in
    if (action === "createOrg") {
      const name = String(body.name || "").trim();
      const type = body.type === "demo" ? "demo" : "production";
      const plan = String(body.plan || "standard");
      const contactEmail = String(body.contactEmail || "").trim() || null;
      // No fallbacks here on purpose. These used to default to "admin" and
      // "123456", which meant a guessable admin account could be created
      // without anyone choosing one. The caller must state both.
      const username = String(body.username || "").trim().toLowerCase();
      const pin = String(body.pin || "");

      // Organisation codes are 10 digits, no letter prefix.
      if (!/^\d{10}$/.test(orgCode)) {
        return json({ error: "Code must be exactly 10 digits" }, 400);
      }
      if (!name) return json({ error: "Organization name is required" }, 400);
      if (!username) return json({ error: "Admin username is required" }, 400);
      if (!isAllowedUsername(username)) {
        return json({ error: usernameRejectionReason(username) }, 400);
      }
      if (!/^\d{6}$/.test(pin)) return json({ error: "PIN must be 6 digits" }, 400);

      const { data: existing } = await supabase
        .from("organizations")
        .select("code")
        .ilike("code", orgCode)
        .maybeSingle();
      if (existing) return json({ error: `Code ${existing.code} is already in use` }, 409);

      // 1. Tenant row (team_members has an FK to org_codes)
      const { error: tenantErr } = await supabase
        .from("org_codes")
        .upsert([{ org_code: orgCode, name }], { onConflict: "org_code" });
      if (tenantErr) return json({ error: "org_codes: " + tenantErr.message }, 500);

      // 2. Admin panel registry row
      const { error: orgErr } = await supabase.from("organizations").insert([
        { code: orgCode, name, type, plan, contact_email: contactEmail, active: true },
      ]);
      if (orgErr) return json({ error: "organizations: " + orgErr.message }, 500);

      // 3. Auth account for the org-level login (synthetic email + PIN)
      const syntheticEmail = `${username}@${orgCode.toLowerCase()}.internal`;
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: syntheticEmail,
        password: pin,
        email_confirm: true,
      });
      if (authErr) return json({ error: "auth: " + authErr.message }, 500);

      // 4. Team member row linking the auth account to the org
      const { error: memberErr } = await supabase.from("team_members").insert([
        {
          org_code: orgCode,
          supabase_user_id: authUser.user.id,
          username,
          email: contactEmail,
          role: "admin",
        },
      ]);
      if (memberErr) return json({ error: "team_members: " + memberErr.message }, 500);

      // A second admin login called "developer" with PIN 123456 used to be
      // created here on every organisation - not asked for, not shown in the
      // credentials handed to the client, and guessable. Removed: an org gets
      // exactly the one admin login named above, and nothing else.

      // 5. Seed empty workspace state (first user created on first login)
      const now = new Date().toISOString();
      const { error: stateErr } = await supabase.from("org_state").upsert(
        [{ org_code: orgCode, state: { users: [] }, updated_at: now }],
        { onConflict: "org_code" },
      );
      if (stateErr) console.error("org_state seed failed:", stateErr.message);

      return json({ success: true, orgCode, username, pin });
    }

    // ── DELETE entire org (all associated data) ─────────────────────────
    if (action === "deleteOrg") {
      if (!orgCode) return json({ error: "Missing orgCode" }, 400);

      // Delete the login accounts first, while team_members still maps them.
      // Without this every deleted org left its auth users behind forever,
      // holding on to usernames and appearing in the dashboard as orphans.
      const { data: doomedMembers } = await supabase
        .from("team_members")
        .select("supabase_user_id")
        .eq("org_code", orgCode);
      for (const member of doomedMembers ?? []) {
        if (!member?.supabase_user_id) continue;
        const { error: delErr } = await supabase.auth.admin.deleteUser(member.supabase_user_id);
        if (delErr) console.error("auth user delete failed:", delErr.message);
      }

      const tables = ["org_backups", "team_members", "org_state", "organizations", "org_codes"];
      for (const table of tables) {
        const { error: deleteErr } = await supabase
          .from(table)
          .delete()
          .eq(table === "organizations" ? "code" : "org_code", orgCode);
        if (deleteErr) {
          console.error(`${table} deletion failed:`, deleteErr.message);
          return json({ error: `${table}: ${deleteErr.message}` }, 500);
        }
      }

      return json({ success: true, message: `Organization ${orgCode} deleted completely` });
    }

    // ── RESET ALL: delete all organizations and data (total format) ──────
    if (action === "resetAll") {
      const tables = ["org_backups", "team_members", "org_state", "organizations", "org_codes"];
      for (const table of tables) {
        const { error: deleteErr } = await supabase.from(table).delete().neq("id", "");
        if (deleteErr) {
          console.error(`${table} reset failed:`, deleteErr.message);
          return json({ error: `${table}: ${deleteErr.message}` }, 500);
        }
      }

      return json({ success: true, message: "All organizations and data deleted. System reset complete." });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("admin-org error:", message);
    return json({ error: message }, 500);
  }
});
