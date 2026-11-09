export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export type EvidenceItem = {
  id: string;
  label: string;
  kind: "file" | "link";
  mime_type: string | null;
  byte_size: number;
  sha256: string | null;
  review_status: "new" | "under_review" | "reviewed";
  created_at: string;
};
export function publicEvidenceLink(value: string) {
  const url = new URL(value.trim());
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    value.length > 2048 ||
    !host.includes(".") ||
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
      host,
    ) ||
    host.startsWith("[") ||
    host.endsWith(".local") ||
    host.endsWith(".localhost") ||
    /^\d+(\.\d+)*$/.test(host)
  ) {
    throw new Error(
      "Use a public HTTPS link without a password or local address.",
    );
  }
  return url.href;
}
export function validateEvidenceFile(
  size: number,
  mime: string,
  label: string,
) {
  if (!Number.isInteger(size) || size <= 0 || size > MAX_EVIDENCE_BYTES)
    throw new Error("Choose a file up to 10 MiB.");
  if (!EVIDENCE_TYPES.includes(mime))
    throw new Error(
      "Supported: JPEG, PNG, WebP, GIF, MP4, WebM, MP3, M4A, WAV, OGG, PDF, DOCX and plain text.",
    );
  if (!label.trim() || label.trim().length > 160)
    throw new Error("Give the evidence a label of 1–160 characters.");
}
export function evidenceSize(bytes: number) {
  return bytes < 1048576
    ? `${Math.ceil(bytes / 1024)} KiB`
    : `${(bytes / 1048576).toFixed(1)} MiB`;
}
