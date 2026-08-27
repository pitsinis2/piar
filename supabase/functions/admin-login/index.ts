import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
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
    const body = await req.json();
    const { email, password } = body;

    // Hardcoded admin credentials for now
    const ADMIN_EMAIL = "pitsinisf@gmail.com";
    const ADMIN_PASSWORD = "123456";
    const ADMIN_NAME = "Fotis Pitsinis";

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: "admin-001",
            email: ADMIN_EMAIL,
            name: ADMIN_NAME,
            active: true,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid credentials" }),
      {
        headers: { "Content-Type": "application/json" },
        status: 401,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
