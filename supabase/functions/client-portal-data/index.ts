import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface ClientPortalResponse {
  project: {
    id: string;
    name: string;
    address?: string;
    startDate: string;
    endDate: string;
    status: string;
    completionPercent: number;
  };
  areas: Array<{
    id: string;
    name: string;
    photoCount: number;
  }>;
  notes: Array<{
    id: string;
    title: string;
    content?: string;
    createdAt: string;
    areaId?: string;
    areaName?: string;
    photos?: string[];
    isCompleted?: boolean;
  }>;
  team: Array<{
    id: string;
    name: string;
    role?: string;
    email?: string;
    phone?: string;
  }>;
}

function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Extract share token from URL path
    const url = new URL(req.url);
    const shareToken = url.pathname.split("/").pop();

    if (!shareToken || shareToken === "client-portal-data") {
      return new Response(JSON.stringify({ error: "Missing share token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // 1. Get share record (validates token)
    const { data: share, error: shareError } = await supabase
      .from("project_shares")
      .select("*")
      .eq("share_token", shareToken)
      .eq("is_active", true)
      .single();

    if (shareError || !share) {
      return new Response(JSON.stringify({ error: "Share link not found or expired" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Check if link has expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Share link has expired" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Get project data
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", share.project_id)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Get areas
    const { data: areas, error: areasError } = await supabase
      .from("areas")
      .select("*")
      .eq("project_id", share.project_id)
      .order("name");

    if (areasError) throw areasError;

    // 5. Get notes (only show_on_master_plan ones)
    const { data: notes, error: notesError } = await supabase
      .from("notes")
      .select(
        `
        id,
        title,
        content,
        created_at,
        area_id,
        image_storage_path,
        image_name
      `
      )
      .eq("project_id", share.project_id)
      .eq("show_on_master_plan", true)
      .order("created_at", { ascending: false });

    if (notesError) throw notesError;

    // 6. Get team members (only those with show_on_client_portal = true)
    const { data: teamMembers, error: teamError } = await supabase
      .from("team_members")
      .select("*")
      .eq("org_code", share.org_code)
      .eq("show_on_client_portal", true);

    if (teamError) throw teamError;

    // 7. Calculate project completion
    const startDate = new Date(project.start_date || new Date());
    const endDate = new Date(project.end_date || new Date());
    const today = new Date();

    const totalDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysPassed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const completionPercent = Math.min(100, Math.round((daysPassed / totalDays) * 100));

    // 8. Build response
    const response: ClientPortalResponse = {
      project: {
        id: project.id,
        name: project.name,
        address: project.address,
        startDate: project.start_date,
        endDate: project.end_date,
        status: project.status || "active",
        completionPercent,
      },
      areas: (areas || []).map(area => ({
        id: area.id,
        name: area.name,
        photoCount: notes?.filter(n => n.area_id === area.id).length || 0,
      })),
      notes: (notes || []).map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.created_at,
        areaId: note.area_id,
        areaName: areas?.find(a => a.id === note.area_id)?.name,
        photos: note.image_storage_path ? [note.image_storage_path] : [],
        isCompleted: false,
      })),
      team: (teamMembers || []).map(member => ({
        id: member.id,
        name: member.display_name || member.email,
        role: member.role,
        email: member.email,
        phone: member.phone,
      })),
    };

    // 9. Update access tracking
    await supabase
      .from("project_shares")
      .update({
        last_accessed_at: new Date().toISOString(),
        access_count: (share.access_count || 0) + 1,
      })
      .eq("id", share.id);

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "private, max-age=300", // 5 min cache
      },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Client portal error:", message);
    return new Response(
      JSON.stringify({ error: message || "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
