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

// Three separated peaks in a bounded gesture window. Hysteresis prevents
// sustained acceleration from being counted as multiple shakes.
export class ShakeDetector {
  private peaks: number[] = [];
  private above = false;
  private lastPeak = -Infinity;
  private lastSample = -Infinity;
  private lastTrigger = -Infinity;
  sample(g: number, at: number) {
    if (!Number.isFinite(g) || !Number.isFinite(at) || g < 0) return false;
    if (at <= this.lastSample) return false;
    // Never combine pulses across an interrupted sensor stream.
    if (at - this.lastSample > 500) {
      this.peaks = [];
      this.above = false;
    }
    this.lastSample = at;
    this.peaks = this.peaks.filter((t) => at - t <= 3000);
    if (g < 1.4) this.above = false;
    if (g < 1.9 || this.above) return false;
    this.above = true;
    if (at - this.lastPeak < 160) return false;
    this.lastPeak = at;
    this.peaks.push(at);
    if (this.peaks.length < 3 || at - this.peaks[0] < 450 ||
        at - this.lastTrigger < 10000) return false;
    this.peaks = [];
    this.lastTrigger = at;
    return true;
  }
}

export class DropDetector {
  private lowAt: number | null = null;
  private lastLow: number | null = null;
  private sustained = false;
  private lastSample = -Infinity;
  private lastTrigger = -Infinity;
  sample(g: number, at: number) {
    if (!Number.isFinite(g) || !Number.isFinite(at) || g < 0) return false;
    if (at <= this.lastSample) return false;
    if (at - this.lastSample > 150 ||
        (this.lastLow !== null && at - this.lastLow > 250)) {
      this.lowAt = null;
      this.lastLow = null;
      this.sustained = false;
    }
    this.lastSample = at;
    if (g < 0.35) {
      if (this.lowAt === null) this.lowAt = at;
      this.lastLow = at;
      this.sustained = at - this.lowAt >= 80;
    }
    if (g >= 0.35 && !this.sustained) {
      this.lowAt = null;
      this.lastLow = null;
    }
    if (g > 2.7 && this.sustained && this.lastLow !== null &&
        at - this.lastLow <= 250 && at - this.lastTrigger >= 10000) {
      this.lowAt = null;
      this.lastLow = null;
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
