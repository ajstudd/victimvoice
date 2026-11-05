import { test } from "node:test";
import assert from "node:assert/strict";
import { createVaultWriter } from "../src/lib/vault-writer.ts";
import { mergeContacts } from "../src/lib/contacts.ts";

test("queued private edits preserve unrelated fields and recover from failed writes", async () => {
  let value = { notes: 0, contacts: 0 };
  let fail = false;
  const save = createVaultWriter({
    read: () => value,
    write: async () => {
      if (fail) {
        fail = false;
        throw Error("disk unavailable");
      }
    },
    commit: (v) => {
      value = v;
    },
    isCurrent: () => true,
  });
  await Promise.all([
    save((v) => ({ ...v, notes: 1 })),
    save((v) => ({ ...v, contacts: 1 })),
  ]);
  assert.deepEqual(value, { notes: 1, contacts: 1 });
  fail = true;
  await assert.rejects(save((v) => ({ ...v, notes: 2 })));
  await save((v) => ({ ...v, contacts: 2 }));
  assert.deepEqual(value, { notes: 1, contacts: 2 });
});
test("account changes cancel queued edits and prevent stale UI commits", async () => {
  let current = true,
    commits = 0,
    writes = 0;
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const save = createVaultWriter({
    read: () => 0,
    write: async () => {
      writes++;
      await gate;
    },
    commit: () => {
      commits++;
    },
    isCurrent: () => current,
  });
  const first = save(() => 1);
  await Promise.resolve();
  const second = save(() => 2);
  current = false;
  release();
  await assert.rejects(first, /space changed/);
  await assert.rejects(second, /space changed/);
  assert.equal(writes, 1);
  assert.equal(commits, 0);
});
const contact = (id: string, phone: string, primary = false) => ({
  id,
  phone,
  primary,
  name: id,
  relationship: "",
});
test("contact restore deduplicates phone numbers without mutating saved contacts", () => {
  const local = [
    contact("a", "+919999999991", true),
    contact("b", "+919999999992", true),
  ];
  const merged = mergeContacts(local, [
    contact("cloud", "+919999999991", true),
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, "cloud");
  assert.equal(merged.filter((c) => c.primary).length, 1);
  assert.equal(local[1].primary, true);
  assert.equal(local[0].id, "a");
  assert.throws(
    () =>
      mergeContacts(
        Array.from({ length: 20 }, (_, i) => contact(String(i), "+" + i)),
        [contact("extra", "+12345")],
      ),
    /20 contacts/,
  );
});
test("restoring cloud contacts never resurrects a queued local removal", () => {
  const cloud = [
    contact("removed", "+919999999991"),
    contact("kept", "+919999999992"),
  ];
  assert.deepEqual(
    mergeContacts([], cloud, ["removed"]).map((c) => c.id),
    ["kept"],
  );
});
test("restoring a changed phone removes both ID and phone collisions", () => {
  const local = [contact("a", "+919999999991"), contact("b", "+919999999992")];
  const merged = mergeContacts(local, [contact("a", "+919999999992")]);
  assert.deepEqual(
    merged.map((c) => [c.id, c.phone]),
    [["a", "+919999999992"]],
  );
});
