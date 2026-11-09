import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  canFallback,
  validateSosContacts,
  freshSosLocation,
  sosText,
  PILOT_REGIONS,
} from "../../shared/sos.ts";
import {
  sendTwilio,
  validTwilioSignature,
  responderPushPayload,
} from "../../shared/twilio.ts";
const id = "10000000-0000-0000-0000-000000000041";
test("SMS fallback requires an explicitly eligible known failure; uncertainty and success never fall back", () => {
  for (const status of [
    "ready",
    "submitted",
    "sent",
    "delivered",
    "unknown",
  ] as const)
    assert.equal(canFallback({ status, fallbackAllowed: true }), false);
  for (const status of ["failed", "unavailable"] as const) {
    assert.equal(canFallback({ status, fallbackAllowed: true }), true);
    assert.equal(canFallback({ status, fallbackAllowed: false }), false);
  }
});
test("SOS validates bounded unique saved contacts and fresh finite location", () => {
  const contact = { id, name: "Fictional contact", phone: "+919999999991" };
  assert.equal(validateSosContacts([contact]).length, 1);
  for (const value of [
    [],
    [contact, contact],
    Array(6).fill(contact),
    [{ ...contact, phone: "9999999991" }],
  ])
    assert.throws(() => validateSosContacts(value));
  const loc = {
    latitude: 23.25,
    longitude: 77.4,
    timestamp: 1000,
    accuracy: 25,
  };
  assert.deepEqual(freshSosLocation(loc, 2000), loc);
  for (const value of [
    { ...loc, timestamp: 3000 },
    { ...loc, latitude: Infinity },
    { ...loc, longitude: 181 },
  ])
    assert.equal(freshSosLocation(value, 2000), null);
  assert.equal(freshSosLocation(loc, 62000), null);
});
test("relay message identifies the person and chosen callback rather than encouraging a call to the provider sender", () => {
  const text = sosText(id, "Fictional woman", null, false, "+919999999990");
  assert.match(text, /safety alert for Fictional woman/);
  assert.match(text, /Call \+919999999990/);
  assert.ok(!text.includes("example.test"));
  assert.match(
    sosText(id, "Fictional woman", null, true),
    /TEST. No help is needed/,
  );
  assert.deepEqual(
    PILOT_REGIONS.map((r) => r.id),
    ["bhopal", "tripura", "bhubaneswar"],
  );
});
test("Twilio adapter sends one bounded request and reports network/5xx ambiguity without retrying", async () => {
  const input = {
    accountSid: "AC" + "0".repeat(32),
    authToken: "fictional-token",
    from: "+15005550006",
    to: "+919999999991",
    body: "Fictional test. No help needed.",
    callback: "https://example.supabase.co/functions/v1/sos-callback?job=" + id,
  };
  let calls = 0;
  const ok: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(
      String(url),
      `https://api.twilio.com/2010-04-01/Accounts/${input.accountSid}/Messages.json`,
    );
    const form = init?.body as URLSearchParams;
    assert.equal(form.get("To"), input.to);
    assert.equal(form.get("StatusCallback"), input.callback);
    return new Response(JSON.stringify({ sid: "SM" + "0".repeat(32) }), {
      status: 201,
    });
  };
  assert.equal((await sendTwilio(input, ok)).state, "accepted");
  assert.equal(calls, 1);
  assert.equal(
    (
      await sendTwilio(
        input,
        async () => new Response("unavailable", { status: 503 }),
      )
    ).state,
    "unknown",
  );
  assert.equal(
    (
      await sendTwilio(input, async () => {
        throw Error("timeout");
      })
    ).state,
    "unknown",
  );
  assert.equal(
    (
      await sendTwilio(
        input,
        async () =>
          new Response(JSON.stringify({ code: 21610 }), { status: 400 }),
      )
    ).error,
    "21610",
  );
});
test("Twilio callbacks require a signature covering the exact URL and parameters", async () => {
  const url = "https://example.supabase.co/functions/v1/sos-callback?job=" + id;
  const form = new URLSearchParams({
    MessageSid: "SM" + "0".repeat(32),
    MessageStatus: "delivered",
  });
  const secret = "fictional-secret";
  const expected = createHmac("sha1", secret)
    .update(
      url + "MessageSid" + form.get("MessageSid") + "MessageStatusdelivered",
    )
    .digest("base64");
  assert.equal(await validTwilioSignature(url, form, secret, expected), true);
  assert.equal(
    await validTwilioSignature(url + "&other=1", form, secret, expected),
    false,
  );
  form.set("MessageStatus", "failed");
  assert.equal(await validTwilioSignature(url, form, secret, expected), false);
});
test("volunteer push contains only a generic notice and opaque incident reference", () => {
  const payload = responderPushPayload("ExpoPushToken[fictional]", id);
  assert.deepEqual(payload.data, { sosId: id });
  for (const key of [
    "latitude",
    "longitude",
    "phone",
    "alias",
    "evidence",
    "journal",
  ])
    assert.ok(!JSON.stringify(payload).includes(key));
});
