import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ShakeDetector,
  advanceCheckIn,
  remainingSeconds,
  normalizePhone,
  isFreshLocation,
} from "../src/lib/safety.ts";
test("check-in cannot expire before deadline and duplicate triggers cannot extend it", () => {
  const armed = advanceCheckIn({ state: "idle", deadline: null }, "arm", 1000);
  const counting = advanceCheckIn(armed, "trigger", 2000);
  assert.equal(counting.deadline, 22000);
  assert.deepEqual(advanceCheckIn(counting, "trigger", 3000), counting);
  assert.deepEqual(advanceCheckIn(counting, "expire", 21999), counting);
  assert.equal(advanceCheckIn(counting, "expire", 22000).state, "completed");
});
test("cancellation is terminal until deliberately rearmed", () => {
  const c = advanceCheckIn({ state: "armed", deadline: null }, "trigger", 0);
  const cancelled = advanceCheckIn(c, "cancel", 5);
  assert.equal(advanceCheckIn(cancelled, "expire", 50000).state, "cancelled");
  assert.equal(advanceCheckIn(cancelled, "trigger", 50000).state, "cancelled");
});
test("countdown uses wall clock, clamps to zero and handles delayed ticks", () => {
  assert.equal(remainingSeconds(20000, 0), 20);
  assert.equal(remainingSeconds(20000, 19001), 1);
  assert.equal(remainingSeconds(20000, 30000), 0);
});
test("phone input normalizes punctuation without inventing country codes", () => {
  assert.equal(normalizePhone("+91 (98765) 43210"), "+919876543210");
  for (const p of ["9876543210", "+00012345", "+91<script>"])
    assert.throws(() => normalizePhone(p));
});
test("location freshness rejects stale and future values", () => {
  assert.equal(isFreshLocation(1000, 2000), true);
  assert.equal(isFreshLocation(1000, 70000), false);
  assert.equal(isFreshLocation(3000, 2000), false);
});

test("strong shakes need three distinct pulses and have a cooldown", () => {
  const d = new ShakeDetector();
  assert.equal(d.sample(3, 0), false);
  assert.equal(d.sample(3, 200), false);
  assert.equal(d.sample(3, 400), false);
  d.sample(1, 500);
  assert.equal(d.sample(3, 600), false);
  d.sample(1, 700);
  assert.equal(d.sample(3, 800), true);
  d.sample(1, 900);
  assert.equal(d.sample(3, 1000), false);
  assert.equal(d.sample(Number.NaN, 1100), false);
});
