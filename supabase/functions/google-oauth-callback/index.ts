import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface OAuthRequest {
  code: string;
  state: string;
}

function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { code, state } = (await req.json()) as OAuthRequest;

    if (!code) {
      return new Response(JSON.stringify({ error: "Missing authorization code" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clientId = getEnv("VITE_GOOGLE_CLIENT_ID");
    const clientSecret = getEnv("GOOGLE_OAUTH_CLIENT_SECRET");
    const redirectUri = getEnv("GOOGLE_OAUTH_REDIRECT_URI");

    // Exchange code for tokens
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange failed:", error);
      return new Response(JSON.stringify({ error: "Token exchange failed" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenResponse.json();

    // Return access token to client
    return new Response(
      JSON.stringify({
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in,
        refreshToken: tokenData.refresh_token,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("OAuth callback error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
