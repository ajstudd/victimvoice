import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { staffRole } from '@/lib/support';

export function useAuth(admin = false) {
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  useEffect(() => {
    let active = true;
    const login = admin ? '/admin/login' : '/login';
    if (!isSupabaseConfigured) {
      router.replace(login);
      return;
    }
    const supabase = getSupabase();
    const check = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        const allowed = !error && Boolean(data.user) && (!admin || (await staffRole()) !== 'none');
        if (!active) return;
        setAuthenticated(allowed);
        if (!allowed) router.replace(login);
      } catch {
        if (active) {
          setAuthenticated(false);
          router.replace(login);
        }
      }
    };
    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Avoid making auth requests while its state-change callback holds the lock.
      setTimeout(() => { if (active) void check(); }, 0);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [admin, router]);
  return authenticated;
}
