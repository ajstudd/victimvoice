import type { SupabaseClient } from "@supabase/supabase-js";
export function insertCircleContact(
  client: SupabaseClient,
  id: string,
  values: {
    name: string;
    phone: string;
    relationship: string;
    primary_contact: boolean;
  },
) {
  return client.from("vv_contacts").insert({ id, ...values });
}
export function insertSupportRequest(
  client: SupabaseClient,
  values: {
    description: string;
    severity_level: string;
    harassment_type: string;
    allow_volunteer_support: boolean;
    scope_id?: string | null;
  },
) {
  return client.from("support_requests").insert(values).select("id").single();
}
