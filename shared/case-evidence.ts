import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEvidenceLink, validateEvidenceFile } from "./evidence";
export type EvidenceContext = "case" | "incident";
export const evidenceRpc = (
  action: string,
  context: EvidenceContext = "case",
) => `${context === "incident" ? "vv2" : "vv"}_${action}_evidence`;
export const evidenceBucket = (context: EvidenceContext = "case") =>
  context === "incident" ? "incident-evidence" : "case-evidence";
// Shared Supabase contract. The app supplies native ArrayBuffers; the web supplies
// File bytes. Neither client needs a service-role key or public/signed evidence URL.
export async function listEvidence(
  client: SupabaseClient,
  requestId: string,
  signal?: AbortSignal,
  context: EvidenceContext = "case",
) {
  let query = client.rpc(evidenceRpc("list", context), {
    p_request_id: requestId,
  });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return data as import("./evidence").EvidenceItem[];
}
export async function addEvidenceLink(
  client: SupabaseClient,
  requestId: string,
  label: string,
  value: string,
  context: EvidenceContext = "case",
  participantIds?: string[],
) {
  const url = publicEvidenceLink(value);
  if (!label.trim() || label.trim().length > 160)
    throw new Error("Add an evidence label (up to 160 characters).");
  const { error } = await client.rpc(
    context === "incident" ? "vv2_add_evidence_link" : "vv_add_evidence_link",
    {
      p_request_id: requestId,
      p_label: label.trim(),
      p_url: url,
      ...(context === "incident"
        ? { p_participants: participantIds || [] }
        : {}),
    },
  );
  if (error) throw error;
}
export async function uploadEvidence(
  client: SupabaseClient,
  requestId: string,
  label: string,
  mime: string,
  bytes: ArrayBuffer,
  sha256: string,
  context: EvidenceContext = "case",
  participantIds?: string[],
) {
  validateEvidenceFile(bytes.byteLength, mime, label);
  if (context === "incident" && bytes.byteLength > 5 * 1024 * 1024)
    throw new Error("Incident attachments can be up to 5 MiB.");
  const { data, error } = await client.rpc(evidenceRpc("reserve", context), {
    p_request_id: requestId,
    p_label: label.trim(),
    p_mime: mime,
    p_bytes: bytes.byteLength,
    p_sha256: sha256,
    ...(context === "incident" ? { p_participants: participantIds || [] } : {}),
  });
  if (error) throw error;
  try {
    const upload = await client.storage
      .from(evidenceBucket(context))
      .upload(data.storage_path, bytes, {
        contentType: mime,
        upsert: false,
        cacheControl: "0",
      });
    if (upload.error) throw upload.error;
    const finished = await client.rpc(evidenceRpc("finish", context), {
      p_evidence_id: data.id,
    });
    if (finished.error) throw finished.error;
  } catch (cause) {
    // Keep failed reservations visible to the operator if cleanup cannot complete.
    const cleanup = await client.storage
      .from(evidenceBucket(context))
      .remove([data.storage_path]);
    if (!cleanup.error)
      await client.rpc(evidenceRpc("cancel", context), {
        p_evidence_id: data.id,
      });
    throw cause;
  }
}
export async function openEvidence(
  client: SupabaseClient,
  id: string,
  context: EvidenceContext = "case",
) {
  const { data, error } = await client.rpc(evidenceRpc("open", context), {
    p_evidence_id: id,
  });
  if (error) throw error;
  if (data.kind === "link")
    return { ...data, url: publicEvidenceLink(data.url) };
  const response = await client.storage
    .from(evidenceBucket(context))
    .download(data.storage_path);
  if (response.error) throw response.error;
  return { ...data, blob: response.data as Blob };
}

export async function deleteAccountWithEvidence(client: SupabaseClient) {
  const incident = await client.rpc("vv2_prepare_incident_deletion");
  if (incident.error) throw incident.error;
  const incidentPaths = incident.data as string[];
  for (let i = 0; i < incidentPaths.length; i += 100) {
    const r = await client.storage
      .from("incident-evidence")
      .remove(incidentPaths.slice(i, i + 100));
    if (r.error) throw r.error;
  }
  const { data, error } = await client.rpc("vv_prepare_account_deletion");
  if (error) throw error;
  const paths = data as string[];
  for (let i = 0; i < paths.length; i += 100) {
    const removed = await client.storage
      .from("case-evidence")
      .remove(paths.slice(i, i + 100));
    if (removed.error) throw removed.error;
  }
  const result = await client.rpc("vv_delete_my_account");
  if (result.error) throw result.error;
}
