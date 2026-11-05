import { createClient } from "@supabase/supabase-js";
export function createAccountClient(
  url: string,
  key: string,
  token: string,
  fetcher?: typeof fetch,
) {
  return createClient(url, key, {
    accessToken: async () => token,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(fetcher ? { global: { fetch: fetcher } } : {}),
  });
}
