import { staffHomeForRole } from "./staff-routing";
import type { WorkforceContext } from "./workforce";
import { getSupabase } from "./supabase";
import type { EvidenceItem } from "@/shared/evidence";
export type StaffRole = "admin" | "volunteer" | "case_worker" | "none";
export type CaseSummary = {
  id: string;
  scope_id?: string | null;
  description: string;
  status: string;
  harassment_type: string;
  severity_level: string;
  created_at: string;
  allow_volunteer_support: boolean;
  message_count?: number;
  evidence_count?: number;
  team?: StaffMember[];
};
export type StaffMember = {
  user_id: string;
  display_name: string;
  enabled?: boolean;
  role?: string;
  organisation?: string;
  languages?: string;
  skills?: string;
  available_until?: string;
};
export type CaseActivity = {
  id: string;
  actor_name?: string;
  author_name?: string;
  content?: string;
  action?: string;
  created_at: string;
};
export function supportError(error: unknown) {
  const value = error as { message?: string; code?: string };
  if (
    /PGRST202|42883|42P01/.test(value.code || "") ||
    /schema cache|does not exist|Could not find the function/i.test(
      value.message || "",
    )
  )
    return "Support is unavailable right now. Your messages are still saved.";
  return (
    value.message || "The action could not be completed. Please try again."
  );
}
export async function supportRpc<T>(
  name: string,
  args: Record<string, unknown> = {},
) {
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) throw error;
  return data as T;
}
export async function staffRole(): Promise<StaffRole> {
  const { data, error } = await getSupabase().rpc("vv_staff_role");
  if (!error) return data as StaffRole;
  // Supervisors can reach the setup notice before the new SQL has been applied.
  if (error.code === "PGRST202" || error.code === "42883") {
    const existing = await getSupabase().rpc("is_admin");
    if (!existing.error && existing.data === true) return "admin";
  }
  throw error;
}
export const listCases = (page: number, status: string, search: string) =>
  supportRpc<CaseSummary[]>("vv_list_cases", {
    p_page: page,
    p_status: status,
    p_search: search,
  });
export const getCase = (id: string) =>
  supportRpc<CaseSummary>("vv_open_case", { p_request_id: id });
export const getStaff = () => supportRpc<StaffMember[]>("vv_list_staff");
export const getActivity = (
  id: string,
  kind: "events" | "notes",
  page: number,
) =>
  supportRpc<CaseActivity[]>("vv_case_activity", {
    p_request_id: id,
    p_kind: kind,
    p_page: page,
  });
export const reviewEvidence = (
  id: string,
  status: EvidenceItem["review_status"],
) => supportRpc("vv_review_evidence", { p_evidence_id: id, p_status: status });

export async function staffLanding(): Promise<string | null> {
  const context = await supportRpc<WorkforceContext>("vv2_context");
  let responderRole: string | null = null;
  if (context.role === "volunteer")
    responderRole = await supportRpc<string | null>("vv_sos_role");
  return staffHomeForRole(context.role, responderRole);
}
