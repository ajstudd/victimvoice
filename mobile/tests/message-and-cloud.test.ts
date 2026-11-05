import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { helpMessage, smsComposerUrl } from "../src/lib/help-message.ts";
import { createAccountClient } from "../src/lib/account-client.ts";
import {
  insertCircleContact,
  insertSupportRequest,
} from "../src/lib/cloud-writes.ts";

test("SMS composer addresses only normalized selected numbers and encodes the complete message", () => {
  const body = "I need support. Please call me. & a location?";
  const uri = smsComposerUrl(
    ["+91 99999 99991", "+919999999991", "+44 7700 900123"],
    body,
    "android",
  );
  assert.equal(
    uri,
    "sms:+919999999991,+447700900123?body=" + encodeURIComponent(body),
  );
  assert.match(
    smsComposerUrl(["+919999999991"], body, "ios"),
    /^sms:\+919999999991&body=/,
  );
  assert.throws(() => smsComposerUrl([], body, "web"), /Choose/);
  assert.throws(() =>
    smsComposerUrl(["+9199?other=recipient"], body, "android"),
  );
});
test("help messages include only fresh valid location snapshots", () => {
  assert.equal(helpMessage(undefined), "I need support. Please call me.");
  assert.match(helpMessage(undefined, true), /No help is needed/);
  const loc = {
    latitude: 28.6,
    longitude: 77.2,
    timestamp: 1000,
    accuracy: null,
  };
  assert.match(
    helpMessage(loc, false, 2000),
    /https:\/\/maps.google.com\/\?q=28.6,77.2/,
  );
  assert.throws(() => helpMessage(loc, false, 61001), /expired/);
  assert.throws(
    () => helpMessage({ ...loc, latitude: NaN }, false, 2000),
    /invalid/,
  );
});

const sql = ["schema.sql", "mobile-schema.sql", "support-workspace.sql"]
  .map((file) =>
    readFileSync(new URL("../../supabase/" + file, import.meta.url), "utf8"),
  )
  .join("\n");
function insertColumns(table: string) {
  return new Set(
    [
      ...sql.matchAll(
        new RegExp(
          `grant insert \\(([^)]+)\\) on public\\.${table} to authenticated`,
          "gi",
        ),
      ),
    ].flatMap((m) => m[1].split(",").map((c) => c.trim())),
  );
}
test("real Supabase client uses the initiating token and SQL-authorized columns for contact/request inserts", async () => {
  const seen: {
    table: string;
    token: string | null;
    body: Record<string, unknown>;
  }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const table = String(input).split("/rest/v1/")[1].split("?")[0];
    const body = JSON.parse(String(init?.body));
    const token = new Headers(init?.headers).get("Authorization");
    seen.push({ table, token, body });
    for (const key of Object.keys(body))
      assert.ok(
        insertColumns(table).has(key),
        `${table}.${key} is not insertable in the actual SQL schema`,
      );
    return new Response(
      JSON.stringify({ id: "00000000-0000-0000-0000-000000000041" }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  };
  const first = createAccountClient(
    "https://example.supabase.co",
    "public-test-key",
    "account-A-token",
    fetcher,
  );
  const second = createAccountClient(
    "https://example.supabase.co",
    "public-test-key",
    "account-B-token",
    fetcher,
  );
  const contact = await insertCircleContact(
    first,
    "00000000-0000-0000-0000-000000000041",
    {
      name: "Fictional contact",
      phone: "+919999999991",
      relationship: "friend",
      primary_contact: true,
    },
  );
  assert.equal(contact.error, null);
  const request = await insertSupportRequest(second, {
    description: "Fictional test",
    severity_level: "low",
    harassment_type: "other",
    allow_volunteer_support: false,
  });
  assert.equal(request.error, null);
  await insertSupportRequest(first, {
    description: "Fictional A test",
    severity_level: "low",
    harassment_type: "other",
    allow_volunteer_support: false,
  });
  assert.deepEqual(
    seen.map((r) => r.token),
    [
      "Bearer account-A-token",
      "Bearer account-B-token",
      "Bearer account-A-token",
    ],
  );
  for (const row of seen) assert.ok(!("user_id" in row.body));
});
