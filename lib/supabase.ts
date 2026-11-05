import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
export const phoneLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_PHONE_LOGIN === 'true';
let client: SupabaseClient | undefined;

export function getSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Sign-in is not configured yet. Please try again once setup is complete.');
  }
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true } }
    );
  }
  return client;
}

export async function isAdmin() {
  const { data, error } = await getSupabase().rpc('is_admin');
  if (error) throw error;
  return data === true;
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('adminToken');
}

export async function signInWithGoogle(admin = false) {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback${admin ? '?admin=true' : ''}`,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}
