import { normalizePhone, isFreshLocation } from "./safety.ts";
export type MessageLocation = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number | null;
};
export function helpMessage(
  location: MessageLocation | undefined,
  test = false,
  now = Date.now(),
) {
  const text = test
    ? "Victim Voice test message. No help is needed."
    : "I need support. Please call me.";
  if (!location) return text;
  if (!isFreshLocation(location.timestamp, now))
    throw new Error(
      "Your location snapshot expired. Capture a fresh location, or send without it.",
    );
  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    Math.abs(location.latitude) > 90 ||
    Math.abs(location.longitude) > 180
  )
    throw new Error(
      "Location is invalid. Capture a new snapshot, or send without it.",
    );
  return (
    text +
    ` My location: https://maps.google.com/?q=${location.latitude},${location.longitude}`
  );
}
export function smsComposerUrl(
  phones: string[],
  text: string,
  platform: string,
) {
  const recipients = [...new Set(phones.map(normalizePhone))];
  if (!recipients.length)
    throw new Error("Choose at least one contact to message.");
  return `sms:${recipients.join(",")}${platform === "ios" ? "&" : "?"}body=${encodeURIComponent(text)}`;
}
