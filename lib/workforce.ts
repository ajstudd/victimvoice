export type WorkforceRole =
  "superadmin" | "admin" | "employee" | "volunteer" | "member" | "none";
export type OperatingScope = {
  id: string;
  name: string;
  kind: string;
  parent_id: string | null;
};
export type WorkforceContext = {
  role: WorkforceRole;
  display_name: string;
  memberships: {
    scope_id: string;
    scope_name: string;
    role: string;
    expires_at: string;
    available_until: string | null;
  }[];
};
export const workforceLabel = (role: string) =>
  ({
    superadmin: "Superadmin",
    admin: "Area admin",
    employee: "Employee",
    volunteer: "Volunteer applicant",
    member: "Member",
    none: "Signed out",
  })[role] || "Team member";
