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

// Require distinct high/low pulses, not a sustained acceleration or orientation change.
export class ShakeDetector {
  private peaks: number[] = [];
  private above = false;
  private lastTrigger = -Infinity;
  sample(g: number, at: number) {
    if (!Number.isFinite(g) || !Number.isFinite(at)) return false;
    if (g < 1.5) this.above = false;
    if (g < 2.4 || this.above) return false;
    this.above = true;
    this.peaks = [...this.peaks.filter((t) => at - t < 1500), at];
    if (this.peaks.length < 3 || at - this.lastTrigger < 10000) return false;
    this.peaks = [];
    this.lastTrigger = at;
    return true;
  }
}

export class DropDetector {
  private lowAt: number | null = null;
  private sustained = false;
  private lastTrigger = -Infinity;
  sample(g: number, at: number) {
    if (!Number.isFinite(g) || !Number.isFinite(at)) return false;
    if (this.lowAt !== null && at - this.lowAt > 1000) {
      this.lowAt = null;
      this.sustained = false;
    }
    if (g < 0.35) {
      if (this.lowAt === null) this.lowAt = at;
      else if (at - this.lowAt >= 80) this.sustained = true;
    }
    if (
      g > 2.7 &&
      this.lowAt !== null &&
      this.sustained &&
      at - this.lastTrigger >= 10000
    ) {
      this.lowAt = null;
      this.sustained = false;
      this.lastTrigger = at;
      return true;
    }
    return false;
  }
}

export function motionDecision(
  deadline: number | null,
  now: number,
  allowed: { enabled: boolean; active: boolean; existingRequest: boolean },
): "wait" | "cancel" | "send" {
  if (
    deadline === null ||
    !allowed.enabled ||
    !allowed.active ||
    allowed.existingRequest
  )
    return "cancel";
  if (now < deadline) return "wait";
  return now - deadline <= 5000 ? "send" : "cancel";
}
