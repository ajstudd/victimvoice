import { test } from "node:test";
import assert from "node:assert/strict";
import {
  publicEvidenceLink,
  validateEvidenceFile,
  MAX_EVIDENCE_BYTES,
} from "../../shared/evidence.ts";
test("public evidence links accept HTTPS and reject credentials, scripts and local targets", () => {
  assert.equal(
    publicEvidenceLink("https://example.org/path?q=1#part"),
    "https://example.org/path?q=1#part",
  );
  for (const value of [
    "javascript:alert(1)",
    "http://example.org",
    "file:///private",
    "https://user:pass@example.org",
    "https://localhost/test",
    "https://127.0.0.1",
    "https://2130706433",
    "https://[::1]/",
    "https://10.0.0.2",
    "https://172.16.0.2",
    "https://192.168.0.2",
    "https://home.local",
    "https://example.org:8443/test",
  ])
    assert.throws(() => publicEvidenceLink(value), value);
});
test("uploads accept bounded media and reject active HTML or SVG", () => {
  validateEvidenceFile(MAX_EVIDENCE_BYTES, "image/png", "Chosen evidence");
  validateEvidenceFile(10, "video/mp4", "Chosen clip");
  validateEvidenceFile(100, "application/pdf", "Document");
  validateEvidenceFile(100, "text/plain", "Statement");
  validateEvidenceFile(100, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Statement document");
  for (const [bytes, mime, label] of [
    [0, "image/png", "Empty"],
    [MAX_EVIDENCE_BYTES + 1, "image/png", "Too large"],
    [100, "image/svg+xml", "Active SVG"],
    [100, "text/html", "HTML"],
    [100, "image/png", ""],
  ])
    assert.throws(() =>
      validateEvidenceFile(bytes as number, mime as string, label as string),
    );
});
