export type CheckState =
  "idle" | "armed" | "countdown" | "completed" | "cancelled";
export interface CheckIn {
  state: CheckState;
  deadline: number | null;
}
export function remainingSeconds(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
export function magnitude(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
}
export function normalizePhone(value: string) {
  const phone = value.replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phone))
    throw new Error("Include the country code, for example +91 98765 43210.");
  return phone;
}
export function advanceCheckIn(
  check: CheckIn,
  action: "arm" | "trigger" | "cancel" | "expire" | "stop",
  now: number,
): CheckIn {
  if (action === "stop") return { state: "idle", deadline: null };
  if (action === "arm") return { state: "armed", deadline: null };
  if (action === "trigger" && check.state === "armed")
    return { state: "countdown", deadline: now + 20_000 };
  if (action === "cancel" && check.state === "countdown")
    return { state: "cancelled", deadline: null };
  if (
    action === "expire" &&
    check.state === "countdown" &&
    check.deadline !== null &&
    now >= check.deadline
  )
    return { state: "completed", deadline: null };
  return check;
}
export function isFreshLocation(timestamp: number, now: number) {
  return now >= timestamp && now - timestamp <= 60_000;
}
