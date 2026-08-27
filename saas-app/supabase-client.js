import { createClient } from "@supabase/supabase-js";

// Env values can arrive with paste artifacts (masked "•" chars, zero-width
// spaces, stray whitespace). HTTP headers only allow ISO-8859-1, so any
// non-ASCII character in the key crashes every Supabase request. Validate
// and fall back to the known-good values rather than shipping a broken build.
function cleanEnvValue(value, fallback) {
  const v = String(value || "").trim();
  if (!v || /[^\x20-\x7E]/.test(v)) {
    if (v) console.warn("Ignoring env value with invalid characters; using built-in fallback.");
    return fallback;
  }
  return v;
}

const SUPABASE_URL = cleanEnvValue(
  import.meta.env.VITE_SUPABASE_URL,
  "https://ivdszujgmhpkebdgwoav.supabase.co"
);
const SUPABASE_ANON_KEY = cleanEnvValue(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZHN6dWpnbWhwa2ViZGd3b2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MjE1NDQsImV4cCI6MjEwMTA5NzU0NH0.KZMYtxCF0uzM-BlgEsqPEWOu689S3RnOCzbAg8jTCFQ"
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const STORAGE_BUCKET = "project-files";

// Step 2: Get tenant ID from Supabase JWT, fallback to state
export function getTenantId() {
  // Try to get from session JWT
  if (typeof window !== 'undefined' && window.supabase) {
    try {
      const session = window.supabase.auth.getSession?.()?.data?.session;
      if (session?.user?.user_metadata?.org_code) {
        return session.user.user_metadata.org_code;
      }
    } catch (e) {
      // Fall through to state
    }
  }

  // Fallback to current state
  if (typeof state !== 'undefined' && state.currentOrgCode) {
    return state.currentOrgCode;
  }

  // Dev default
  console.warn("No org_code in session; using dev default P00000000");
  return "P00000000";
}

// appback.js is a classic (non-module) script and cannot use `import`.
// This module is loaded first via <script type="module">, so bridge to
// globals for appback.js to consume. Only getAssetUrl/uploadAssetToStorage
// read these; nothing else should reach into window.supabase directly.
window.supabase = supabase;
window.STORAGE_BUCKET = STORAGE_BUCKET;
window.getTenantId = getTenantId;
// Accept the env value only if it actually looks like a Google client ID;
// otherwise use the known-good one (guards against placeholder/stale envs).
const googleClientIdEnv = cleanEnvValue(import.meta.env.VITE_GOOGLE_CLIENT_ID, "");
window.GOOGLE_CLIENT_ID = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(googleClientIdEnv)
  ? googleClientIdEnv
  : "492857024431-7hotva9fppa5e1dete5s98rhchrnhjce.apps.googleusercontent.com";
