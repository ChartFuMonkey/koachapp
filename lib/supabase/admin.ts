import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. NEVER import this in client components.
//
// Lazy via Proxy so `createClient` isn't called at module evaluation time:
// Vercel's "collect page data" phase imports pages without runtime env vars,
// and `createClient` throws synchronously if supabaseUrl is missing.
let cached: SupabaseClient | undefined;
function getClient(): SupabaseClient {
  if (!cached) {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return cached;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
});
