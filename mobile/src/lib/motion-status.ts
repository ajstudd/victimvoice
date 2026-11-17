import { useSyncExternalStore } from "react";

// Local runtime state only; no sensor samples or motion telemetry are uploaded.
let status = "Checking shake & drop detection…";
const listeners = new Set<() => void>();
export function setMotionStatus(next: string) {
  if (status === next) return;
  status = next;
  listeners.forEach((listener) => listener());
}
export function useMotionStatus() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    () => status,
    () => "Use the installed phone app for motion detection",
  );
}
