import { useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { startRefreshLoop } from '../../../shared/refresh-loop';

export function useConversationSync<T>(
  load: (signal: AbortSignal) => Promise<T>,
  onSuccess: (value: T) => void,
  onError: (error: unknown) => void,
) {
  const current = useRef<ReturnType<typeof startRefreshLoop<T>> | null>(null);
  useFocusEffect(useCallback(() => {
    const isActive = () =>
      (AppState.currentState === 'active' || AppState.currentState === null) &&
      (Platform.OS !== 'web' || (document.visibilityState === 'visible' && navigator.onLine !== false));
    const loop = startRefreshLoop({ load, onSuccess, onError, active: isActive() });
    current.current = loop;
    const syncActivity = () => { loop.setActive(isActive()); };
    const subscription = AppState.addEventListener('change', syncActivity);
    if (Platform.OS === 'web') {
      window.addEventListener('online', syncActivity);
      window.addEventListener('offline', syncActivity);
      document.addEventListener('visibilitychange', syncActivity);
    }
    return () => {
      loop.stop();
      current.current = null;
      subscription.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('online', syncActivity);
        window.removeEventListener('offline', syncActivity);
        document.removeEventListener('visibilitychange', syncActivity);
      }
    };
  }, [load, onSuccess, onError]));
  return useCallback(() => current.current?.refresh(), []);
}
