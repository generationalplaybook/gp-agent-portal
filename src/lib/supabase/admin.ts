import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client — server-only. NEVER import this from a Client Component or
// expose SUPABASE_SERVICE_ROLE_KEY to the browser. Used for privileged admin actions like
// inviting new agents (auth.admin.inviteUserByEmail), which the anon/session client can't do.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
