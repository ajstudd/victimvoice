import type { Session } from "@supabase/supabase-js";
import type { SmsState, SosContact, SosLocation } from "../../../shared/sos";
export type SosPreferences = {
  alias: string;
  callback: string;
  region: string;
  relay: boolean;
  volunteers: boolean;
  police: boolean;
};
export type LocalSos = {
  id: string;
  createdAt: number;
  status: "active" | "resolved" | "cancelled";
  preferences: SosPreferences;
  location: SosLocation | null;
  contacts: (SosContact & {
    attemptId: string;
    state: SmsState;
    fallbackAllowed: boolean;
  })[];
  cloudCreated?: boolean;
  closePending?: boolean;
  cloudError?: string;
};
export const defaultSosPreferences: SosPreferences = {
  alias: "",
  callback: "",
  region: "bhopal",
  relay: false,
  volunteers: false,
  police: false,
};
export type SosRecord = {
  id: string;
  created_at: string;
  expires_at: string;
  status: string;
  region_id: string;
  routing: string;
  alias: string | null;
  callback: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  recipients: { id: string; name: string; state: string }[] | null;
  accepted: number;
  offers: number;
  details_allowed: boolean;
  chat_allowed?: boolean;
};
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export async function sosRequest(
  session: Session,
  body: Record<string, unknown>,
) {
  if (!url || !key) throw Error("Cloud sending is not configured.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url + "/functions/v1/sos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + session.access_token,
        apikey: key,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok)
      throw Error(
        result.error ||
          "Could not reach the messaging service. You can still call your contacts or try texting from your phone.",
      );
    return result;
  } catch (e) {
    if ((e as Error).name === "AbortError")
      throw Error(
        "Cloud result is uncertain. Checking the same incident again will not create a new SMS request.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
export async function sosCapabilities() {
  if (!url || !key) return { relay: false, push: false };
  const result = await fetch(url + "/functions/v1/sos", {
    headers: { apikey: key },
  });
  if (!result.ok)
    throw Error(
      "Message availability could not be checked. You can still call your contacts or try texting from your phone.",
    );
  return result.json() as Promise<{ relay: boolean; push: boolean }>;
}
