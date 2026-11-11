// These routes select a screen; server-side roles, scopes and MFA authorize data.
export function staffHomeForRole(role: string, responderRole?: string | null) {
  if (role === "superadmin" || role === "admin") return "/admin/team";
  if (role === "employee") return "/admin/dashboard";
  if (
    role === "volunteer" &&
    ["volunteer", "police"].includes(responderRole || "")
  )
    return "/admin/emergency";
  return null;
}

export function canManagePersonnel(role: string) {
  return ["superadmin", "admin", "employee"].includes(role);
}

export function legacyTeamDestination(role?: string | null) {
  return canManagePersonnel(role || "") ? "/admin/team" : "/join";
}

// Exact allowlist: login must never turn a query or storage value into an open redirect.
export function allowedLoginDestination(value: string | null) {
  return value && ["/join", "/admin", "/admin/team", "/team"].includes(value)
    ? value
    : null;
}

export function requestedLoginDestination(search: string) {
  return allowedLoginDestination(new URLSearchParams(search).get("next"));
}

export function authenticatedLoginDestination(
  requested: string | null,
  staffLogin: boolean,
  staffHome: string | null,
) {
  const destination = allowedLoginDestination(requested);
  if (destination === "/join") return "/join";
  if (staffLogin) return staffHome ? destination || staffHome : null;
  return destination || "/dashboard";
}

export function rememberLoginDestination() {
  const path = requestedLoginDestination(window.location.search);
  if (path) sessionStorage.setItem("vv-login-destination", path);
  else sessionStorage.removeItem("vv-login-destination");
}

export function consumeLoginDestination(search = "") {
  const stored = sessionStorage.getItem("vv-login-destination");
  sessionStorage.removeItem("vv-login-destination");
  return requestedLoginDestination(search) || allowedLoginDestination(stored);
}
