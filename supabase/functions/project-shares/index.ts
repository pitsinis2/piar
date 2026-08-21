import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface GenerateShareRequest {
  projectId: string;
  clientName: string;
  clientEmail?: string;
  expiresInDays?: number;
}

function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

function generateShareToken(): string {
  // Generate client-{uuid} format token
  const uuid = crypto.randomUUID();
  return `client-${uuid}`;
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Verify auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT and get user ID
    let userId: string | null = null;
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      userId = decoded.sub;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // GET: List shares for a project
    if (req.method === "GET") {
      const url = new URL(req.url);
      const projectId = url.searchParams.get("projectId");

      if (!projectId) {
        return new Response(JSON.stringify({ error: "Missing projectId" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get user's org to verify access
      const { data: userOrgs } = await supabase
        .from("team_members")
        .select("org_code")
        .eq("supabase_user_id", userId)
        .limit(1)
        .single();

      if (!userOrgs) {
        return new Response(JSON.stringify({ error: "User not in any organization" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get shares
      const { data: shares, error } = await supabase
        .from("project_shares")
        .select("id,share_token,client_name,client_email,created_at,expires_at,is_active,access_count,last_accessed_at")
        .eq("project_id", projectId)
        .eq("org_code", userOrgs.org_code)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ shares }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // POST: Create a new share link
    if (req.method === "POST") {
      const body = (await req.json()) as GenerateShareRequest;
      const { projectId, clientName, clientEmail, expiresInDays } = body;

      if (!projectId || !clientName) {
        return new Response(
          JSON.stringify({ error: "Missing projectId or clientName" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get user's org
      const { data: userOrgs, error: orgError } = await supabase
        .from("team_members")
        .select("org_code")
        .eq("supabase_user_id", userId)
        .limit(1)
        .single();

      if (orgError || !userOrgs) {
        return new Response(JSON.stringify({ error: "User not in any organization" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Verify project exists and belongs to org
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("org_code", userOrgs.org_code)
        .single();

      if (projectError || !project) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Generate share token
      const shareToken = generateShareToken();
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Create share
      const { data: share, error: createError } = await supabase
        .from("project_shares")
        .insert([
          {
            org_code: userOrgs.org_code,
            project_id: projectId,
            share_token: shareToken,
            client_name: clientName,
            client_email: clientEmail || null,
            created_by_user_id: userId,
            expires_at: expiresAt,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (createError) throw createError;

      const baseUrl = new URL(req.url).origin;
      const shareUrl = `${baseUrl}/client/${shareToken}`;

      return new Response(
        JSON.stringify({
          id: share.id,
          shareToken,
          shareUrl,
          clientName,
          clientEmail,
          createdAt: share.created_at,
          expiresAt,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // DELETE: Revoke a share link
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const projectId = url.searchParams.get("projectId");
      const shareToken = url.searchParams.get("shareToken");

      if (!projectId || !shareToken) {
        return new Response(JSON.stringify({ error: "Missing projectId or shareToken" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get user's org
      const { data: userOrgs } = await supabase
        .from("team_members")
        .select("org_code")
        .eq("supabase_user_id", userId)
        .limit(1)
        .single();

      if (!userOrgs) {
        return new Response(JSON.stringify({ error: "User not in any organization" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Revoke share (set is_active = false)
      const { error: revokeError } = await supabase
        .from("project_shares")
        .update({ is_active: false })
        .eq("share_token", shareToken)
        .eq("project_id", projectId)
        .eq("org_code", userOrgs.org_code);

      if (revokeError) throw revokeError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Project shares error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
