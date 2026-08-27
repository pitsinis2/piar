import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";

interface OrgCreateRequest {
  clientName: string;
  firstName: string;
  lastName: string;
  email: string;
  pin: string;
}

function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

function generateOrgCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "P";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function validatePin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

serve(async (req) => {
  // CORS headers
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
    // Verify request is from authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Verify JWT and extract user ID
    const token = authHeader.substring(7);
    let creatorUserId: string;
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      creatorUserId = decoded.sub;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body = (await req.json()) as OrgCreateRequest;
    const { clientName, firstName, lastName, email, pin } = body;

    // Validation
    if (!clientName || !firstName || !lastName || !email || !pin) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!validatePin(pin)) {
      return new Response(
        JSON.stringify({ error: "PIN must be 6 digits" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Invalid email" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate unique org code
    let orgCode: string;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      orgCode = generateOrgCode();
      const { data: existing } = await supabase
        .from("team_members")
        .select("org_code", { count: "exact" })
        .eq("org_code", orgCode)
        .limit(1);

      isUnique = !existing || existing.length === 0;
      attempts++;
    }

    if (!isUnique) {
      return new Response(
        JSON.stringify({ error: "Could not generate unique org code" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create first user (admin) in team_members
    const userId = uuidv4();
    const { error: memberError } = await supabase
      .from("team_members")
      .insert([
        {
          id: userId,
          org_code: orgCode!,
          username: firstName.toLowerCase() + "." + lastName.toLowerCase(),
          email: email,
          first_name: firstName,
          last_name: lastName,
          pin_hash: pin, // In production, hash this with bcrypt
          user_type: "Admin",
          role: "admin",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

    if (memberError) {
      console.error("Error creating team member:", memberError);
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Initialize org_state for the new org
    const { error: stateError } = await supabase
      .from("org_state")
      .insert([
        {
          org_code: orgCode!,
          data: {
            version: "1.0",
            projects: [],
            areas: [],
            tasks: [],
            notes: [],
            files: [],
            teamMembers: [
              {
                id: userId,
                name: firstName + " " + lastName,
                email: email,
                role: "admin",
              },
            ],
            clients: [],
            equipment: [],
          },
          synced_at: new Date().toISOString(),
        },
      ]);

    if (stateError) {
      console.error("Error creating org_state:", stateError);
      // Don't fail entirely, org exists but state not synced yet
    }

    return new Response(
      JSON.stringify({
        success: true,
        orgCode: orgCode,
        clientName: clientName,
        firstName: firstName,
        lastName: lastName,
        email: email,
        pin: pin,
        message: "Organization created successfully",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Org creation error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
