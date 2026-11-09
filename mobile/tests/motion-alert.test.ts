import { test } from "node:test";
import assert from "node:assert/strict";
import {
  motionDecision,
  DropDetector,
  ShakeDetector,
  advanceCheckIn,
} from "../src/lib/safety.ts";
import { createSos, hasActiveSos } from "../src/lib/create-sos.ts";
test("drop detection requires sustained low acceleration followed by an impact", () => {
  const d = new DropDetector();
  assert.equal(d.sample(0.2, 0), false);
  assert.equal(d.sample(3, 30), false);
  d.sample(0.2, 2000);
  d.sample(0.2, 2100);
  assert.equal(d.sample(3, 2200), true);
  d.sample(0.2, 2300);
  d.sample(0.2, 2400);
  assert.equal(d.sample(3, 2500), false);
  const stale = new DropDetector();
  stale.sample(0.2, 0);
  stale.sample(0.2, 100);
  assert.equal(stale.sample(3, 2000), false);
});
test("a motion check-in waits twenty seconds, cancels, and does not extend on repeated triggers", () => {
  const c = advanceCheckIn({ state: "armed", deadline: null }, "trigger", 1000);
  assert.equal(advanceCheckIn(c, "trigger", 2000).deadline, 21000);
  assert.equal(advanceCheckIn(c, "expire", 20999).state, "countdown");
  assert.equal(advanceCheckIn(c, "cancel", 20000).state, "cancelled");
  assert.equal(advanceCheckIn(c, "expire", 21000).state, "completed");
  const detector = new ShakeDetector();
  assert.equal(detector.sample(Number.NaN, 1000), false);
});
test("automatic requests persist separate contact attempts and require completed identity setup", () => {
  let n = 0;
  const uuid = () => `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`;
  const prefs = {
    alias: "Chosen name",
    callback: "",
    region: "bhopal",
    relay: false,
    volunteers: false,
    police: false,
  };
  const event = createSos(
    prefs,
    [{ id: uuid(), name: "Contact", phone: "+919999999991" }],
    null,
    uuid,
    1000,
  );
  assert.equal(event.contacts[0].state, "ready");
  assert.notEqual(event.id, event.contacts[0].attemptId);
  assert.equal(event.location, null);
  assert.equal(hasActiveSos(event, 2000), true);
  assert.throws(() => createSos({ ...prefs, alias: "" }, [], null, uuid, 1000));
  assert.equal(hasActiveSos({ ...event, status: "cancelled" }, 2000), false);
});

test("automatic dispatch cancels on disable, background, duplicate request or a stalled timer", () => {
  const ready = { enabled: true, active: true, existingRequest: false };
  assert.equal(motionDecision(21000, 20000, ready), "wait");
  assert.equal(motionDecision(21000, 21000, ready), "send");
  assert.equal(motionDecision(21000, 27000, ready), "cancel");
  assert.equal(
    motionDecision(21000, 21000, { ...ready, active: false }),
    "cancel",
  );
  assert.equal(
    motionDecision(21000, 21000, { ...ready, enabled: false }),
    "cancel",
  );
  assert.equal(
    motionDecision(21000, 21000, { ...ready, existingRequest: true }),
    "cancel",
  );
  assert.equal(motionDecision(null, 21000, ready), "cancel");
});
