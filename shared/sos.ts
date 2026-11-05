// Transport-independent SOS contract. Pure functions are also exercised offline.
export type SmsState =
  | "ready"
  | "submitted"
  | "sent"
  | "delivered"
  | "failed"
  | "unknown"
  | "unavailable";
export type NativeResult = { status: SmsState; fallbackAllowed: boolean };
export type SosLocation = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number | null;
};
export type SosContact = { id: string; name: string; phone: string };
export const PILOT_REGIONS = [
  {
    id: "bhopal",
    name: "Bhopal",
    scope: "City / commissionerate",
    source: "https://bhopal.mppolice.gov.in/contact/",
  },
  {
    id: "tripura",
    name: "Tripura",
    scope: "Entire state · district-by-district onboarding",
    source: "https://tripura.gov.in/",
  },
  {
    id: "bhubaneswar",
    name: "Bhubaneswar",
    scope: "Bhubaneswar Urban Police District",
    source: "https://bhubaneswarcuttackpolice.gov.in/know-your-police-station/",
  },
] as const;
export function canFallback(result: NativeResult) {
  return (
    result.fallbackAllowed &&
    (result.status === "failed" || result.status === "unavailable")
  );
}
export function validateSosContacts(value: unknown): SosContact[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5)
    throw new Error("Choose between one and five contacts.");
  const ids = new Set<string>(),
    phones = new Set<string>();
  return value.map((c) => {
    if (
      !c ||
      typeof c.id !== "string" ||
      !isUuid(c.id) ||
      typeof c.name !== "string" ||
      c.name.trim().length < 1 ||
      c.name.length > 100 ||
      typeof c.phone !== "string" ||
      !/^\+[1-9]\d{7,14}$/.test(c.phone)
    )
      throw new Error("Invalid trusted contact.");
    if (ids.has(c.id) || phones.has(c.phone))
      throw new Error("Choose each contact only once.");
    ids.add(c.id);
    phones.add(c.phone);
    return { id: c.id, name: c.name.trim(), phone: c.phone };
  });
}
export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      value,
    )
  );
}
export function freshSosLocation(
  value: unknown,
  now = Date.now(),
): SosLocation | null {
  if (!value) return null;
  const x = value as SosLocation;
  if (
    !Number.isFinite(x.latitude) ||
    Math.abs(x.latitude) > 90 ||
    !Number.isFinite(x.longitude) ||
    Math.abs(x.longitude) > 180 ||
    !Number.isFinite(x.timestamp) ||
    x.timestamp > now ||
    now - x.timestamp > 60000
  )
    return null;
  return {
    ...x,
    accuracy:
      typeof x.accuracy === "number" &&
      Number.isFinite(x.accuracy) &&
      x.accuracy >= 0
        ? x.accuracy
        : null,
  };
}
export function sosText(
  id: string,
  alias: string,
  location: SosLocation | null,
  test = false,
  callback?: string,
) {
  if (!isUuid(id)) throw new Error("Invalid incident reference.");
  const label =
    alias
      .trim()
      .replace(/[\r\n]/g, " ")
      .slice(0, 60) || "Someone in your trusted circle";
  return `${test ? "Victim Voice TEST. No help is needed." : "Victim Voice: " + label + " is asking for help."}${callback && /^\+[1-9]\d{7,14}$/.test(callback) ? " Call " + callback + "." : " Please contact them through your usual number."}${location ? " Location: https://maps.google.com/?q=" + location.latitude + "," + location.longitude : ""} Ref ${id.slice(0, 8)}.`;
}
