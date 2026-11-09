import type { LocalSos, SosPreferences } from "./sos-client";
import {
  validateSosContacts,
  freshSosLocation,
  type SosLocation,
} from "../../../shared/sos.ts";
export function createSos(
  preferences: SosPreferences,
  contacts: { id: string; name: string; phone: string }[],
  location: SosLocation | null,
  uuid: () => string,
  now: number,
): LocalSos {
  if (!preferences.alias.trim())
    throw Error("Add your alert name in Safety message setup.");
  const chosen = validateSosContacts(contacts);
  return {
    id: uuid(),
    createdAt: now,
    status: "active",
    preferences: { ...preferences },
    location: freshSosLocation(location),
    contacts: chosen.map((c) => ({
      ...c,
      attemptId: uuid(),
      state: "ready",
      fallbackAllowed: false,
    })),
  };
}
export function hasActiveSos(event: LocalSos | undefined, now: number) {
  return event?.status === "active" && now - event.createdAt < 30 * 60000;
}
