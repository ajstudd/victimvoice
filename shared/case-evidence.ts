import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEvidenceLink, validateEvidenceFile } from "./evidence";
// Shared Supabase contract. The app supplies native ArrayBuffers; the web supplies
// File bytes. Neither client needs a service-role key or public/signed evidence URL.
export async function listEvidence(
  client: SupabaseClient,
  requestId: string,
  signal?: AbortSignal,
) {
  let query = client.rpc("vv_list_evidence", { p_request_id: requestId });
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
) {
  const url = publicEvidenceLink(value);
  if (!label.trim() || label.trim().length > 160)
    throw new Error("Add an evidence label (up to 160 characters).");
  const { error } = await client.rpc("vv_add_evidence_link", {
    p_request_id: requestId,
    p_label: label.trim(),
    p_url: url,
  });
  if (error) throw error;
}
export async function uploadEvidence(
  client: SupabaseClient,
  requestId: string,
  label: string,
  mime: string,
  bytes: ArrayBuffer,
  sha256: string,
) {
  validateEvidenceFile(bytes.byteLength, mime, label);
  const { data, error } = await client.rpc("vv_reserve_evidence", {
    p_request_id: requestId,
    p_label: label.trim(),
    p_mime: mime,
    p_bytes: bytes.byteLength,
    p_sha256: sha256,
  });
  if (error) throw error;
  try {
    const upload = await client.storage
      .from("case-evidence")
      .upload(data.storage_path, bytes, {
        contentType: mime,
        upsert: false,
        cacheControl: "0",
      });
    if (upload.error) throw upload.error;
    const finished = await client.rpc("vv_finish_evidence", {
      p_evidence_id: data.id,
    });
    if (finished.error) throw finished.error;
  } catch (cause) {
    // Keep failed reservations visible to the operator if cleanup cannot complete.
    const cleanup = await client.storage
      .from("case-evidence")
      .remove([data.storage_path]);
    if (!cleanup.error)
      await client.rpc("vv_cancel_evidence", { p_evidence_id: data.id });
    throw cause;
  }
}
export async function openEvidence(client: SupabaseClient, id: string) {
  const { data, error } = await client.rpc("vv_open_evidence", {
    p_evidence_id: id,
  });
  if (error) throw error;
  if (data.kind === "link")
    return { ...data, url: publicEvidenceLink(data.url) };
  const response = await client.storage
    .from("case-evidence")
    .download(data.storage_path);
  if (response.error) throw response.error;
  return { ...data, blob: response.data as Blob };
}

export async function deleteAccountWithEvidence(client: SupabaseClient) {
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
