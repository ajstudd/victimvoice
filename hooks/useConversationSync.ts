import { useCallback, useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { startRefreshLoop } from '@/shared/refresh-loop';

export function useConversationSync<T>(
  load: (signal: AbortSignal) => Promise<T>,
  onSuccess: (value: T) => void,
  onError: (error: unknown) => void,
  onAccountChange: () => void,
) {
  const current = useRef<ReturnType<typeof startRefreshLoop<T>> | null>(null);
  useEffect(() => {
    const isActive = () => document.visibilityState === 'visible' && navigator.onLine !== false;
    const loop = startRefreshLoop({ load, onSuccess, onError, active: isActive() });
    current.current = loop;
    const visibility = () => { loop.setActive(isActive()); };
    const resume = () => {
      if (!loop.setActive(isActive()) && isActive()) loop.refresh();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('online', resume);
    window.addEventListener('offline', visibility);
    window.addEventListener('focus', resume);
    let account: string | undefined;
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id;
      if (!next || (account && account !== next)) {
        loop.stop();
        onAccountChange();
      }
      account = next;
    });
    return () => {
      loop.stop();
      current.current = null;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('online', resume);
      window.removeEventListener('offline', visibility);
      window.removeEventListener('focus', resume);
    };
  }, [load, onSuccess, onError, onAccountChange]);
  return useCallback(() => current.current?.refresh(), []);
}
