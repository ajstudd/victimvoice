import { test } from "node:test";
import assert from "node:assert/strict";
import {
  requestSmsAccess,
  smsAccess,
  type SmsCapabilities,
} from "../src/lib/sms-permission.ts";
const base: SmsCapabilities = {
  supported: true,
  defaultSim: true,
  permission: false,
};
test("Android denial and never-ask-again produce actionable distinct results", async () => {
  for (const result of ["denied", "never_ask_again"] as const) {
    let requested = 0;
    const r = await requestSmsAccess({
      capabilities: () => base,
      request: async () => {
        requested++;
        return result;
      },
    });
    assert.equal(requested, 1);
    assert.equal(r.state, result === "denied" ? "denied" : "blocked");
    assert.equal(r.openSettings, true);
    assert.match(r.message, /SMS/);
    assert.equal(r.capabilities?.permission, false);
  }
});
test("a successful permission request rechecks the actual native grant and default SIM", async () => {
  let cap = { ...base };
  const ready = await requestSmsAccess({
    capabilities: () => cap,
    request: async () => {
      cap = { ...cap, permission: true };
      return "granted";
    },
  });
  assert.equal(ready.state, "ready");
  assert.match(ready.message, /No message was sent/);
  const noSim = await requestSmsAccess({
    capabilities: () => ({ ...cap, defaultSim: false }),
    request: async () => {
      assert.fail("Already granted must not request again");
    },
  });
  assert.equal(noSim.state, "choose_sim");
  assert.equal(noSim.capabilities?.permission, true);
  const inconsistent = await requestSmsAccess({
    capabilities: () => base,
    request: async () => "granted",
  });
  assert.equal(inconsistent.state, "blocked");
  assert.notEqual(inconsistent.state, "ready");
});
test("missing native code or unsupported hardware never triggers a permission request", async () => {
  for (const cap of [null, { ...base, supported: false }]) {
    const r = await requestSmsAccess({
      capabilities: () => cap,
      request: async () => {
        assert.fail("Must not ask on unsupported installs");
      },
    });
    assert.equal(r.state, cap ? "unsupported" : "missing_app");
    assert.equal(r.openSettings, false);
  }
});
test("permission recheck failures are surfaced instead of claiming access", async () => {
  await assert.rejects(
    requestSmsAccess({
      capabilities: () => base,
      request: async () => {
        throw Error("Android permission request failed");
      },
    }),
    /request failed/,
  );
  assert.equal(
    smsAccess({ ...base, permission: false }, "never_ask_again").state,
    "blocked",
  );
  assert.equal(smsAccess({ ...base, permission: true }).state, "ready");
});
