"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Shield,
  Users,
  Inbox,
  Radio,
  Copy,
  Check,
  LogOut,
  LockKeyhole,
  RefreshCw,
  Plus,
  ArrowRight,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { supportRpc } from "@/lib/support";
import { StaffMfa } from "@/components/staff-mfa";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  workforceLabel,
  type WorkforceContext,
  type OperatingScope,
} from "@/lib/workforce";
type Staff = {
  user_id: string;
  display_name: string;
  organisation: string;
  role: string;
  scope_id: string;
  scope_name: string;
  enabled: boolean;
  expires_at: string;
  sponsor_id: string;
};
type Application = {
  user_id: string;
  display_name: string;
  organisation: string;
  scope_id: string;
  scope_name: string;
  status: string;
  field_status: string;
  reviewed_by: string | null;
  review_due: string | null;
  field_review_due: string | null;
};
type Review = Application & {
  languages: string;
  skills: string;
  availability: string;
  checks: Record<string, boolean>;
  decision_reason: string | null;
  review_reference: string | null;
  applicant_note?: string | null;
};
type Audit = {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  reason: string;
  created_at: string;
  subject_id: string | null;
};
type Report = {
  id: string;
  reason: string;
  state: string;
  event_id: string | null;
  request_id: string | null;
};
type Data = {
  staff: Staff[];
  invites: {
    id: string;
    account_id: string;
    scope_id: string;
    role: string;
    display_name: string;
    expires_at: string;
  }[];
  applications: Application[];
  audit: Audit[];
  reports: Report[];
};
const empty: Data = {
  staff: [],
  invites: [],
  applications: [],
  audit: [],
  reports: [],
};
const date = (v: string | null) =>
  v ? new Date(v).toLocaleDateString() : "Not yet reviewed";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="tm-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export default function Team() {
  const [user, setUser] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [role, setRole] = useState("member");
  useEffect(() => {
    let live = true;
    const load = async () => {
      const { data } = await getSupabase().auth.getSession();
      if (live) {
        setUser(data.session?.user.id || null);
        setReady(true);
      }
    };
    void load();
    const { data } = getSupabase().auth.onAuthStateChange(() => {
      setTimeout(() => void load(), 0);
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return (
    <div className="tm-shell">
      <aside className="tm-sidebar">
        <Link className="tm-brand" href="/">
          <span>
            <Shield size={23} />
          </span>
          <div>
            Victim Voice<small>SUPPORT WORKSPACE</small>
          </div>
        </Link>
        <p className="tm-nav-caption">WORKSPACE</p>
        <nav aria-label="Workspace">
          <Link href="/admin/dashboard">
            <Inbox size={18} />
            Support inbox
          </Link>
          <Link href="/admin/emergency">
            <Radio size={18} />
            Emergency desk
          </Link>
          <Link href="/team" aria-current="page">
            <Users size={18} />
            Team & access
          </Link>
        </nav>
        <div className="tm-sidebar-bottom">
          <div className="tm-sidebar-note">
            <LockKeyhole size={18} />
            <p>
              Each person’s access follows their role, area and assignments.
            </p>
          </div>
          <button onClick={() => void getSupabase().auth.signOut()}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="tm-workspace">
        <header className="tm-topbar">
          <span>Workspace / Team & access</span>
          <span className="tm-role">{workforceLabel(role)}</span>
        </header>
        <main className="tm-content tm-scoped-content">
          {!ready ? (
            <p>Opening your workspace…</p>
          ) : !user ? (
            <section className="tm-welcome">
              <span className="tm-eyebrow">PEOPLE WHO HELP</span>
              <h1>
                A local team.
                <br />
                Clear responsibility.
              </h1>
              <p>
                Staff accept a personal invitation here. Volunteers apply in the
                Victim Voice app.
              </p>
              <Link
                className="tm-button"
                href="/login"
                onClick={() =>
                  sessionStorage.setItem("vv-login-destination", "/team")
                }
              >
                Sign in to continue <ArrowRight size={16} />
              </Link>
            </section>
          ) : (
            <StaffMfa key={user}>
              <Console user={user} onRole={setRole} />
            </StaffMfa>
          )}
        </main>
      </div>
    </div>
  );
}
function Console({
  user,
  onRole,
}: {
  user: string;
  onRole: (r: string) => void;
}) {
  const [context, setContext] = useState<WorkforceContext | null>(null),
    [data, setData] = useState<Data>(empty),
    [scopes, setScopes] = useState<OperatingScope[]>([]),
    [tab, setTab] = useState("people"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [token, setToken] = useState(""),
    [copied, setCopied] = useState(false),
    [review, setReview] = useState<Review | null>(null),
    [checks, setChecks] = useState<Record<string, boolean>>({}),
    [reference, setReference] = useState(""),
    [reason, setReason] = useState("");
  const [account, setAccount] = useState(""),
    [scope, setScope] = useState(""),
    [name, setName] = useState(""),
    [org, setOrg] = useState(""),
    [inviteRef, setInviteRef] = useState(""),
    [attested, setAttested] = useState(false),
    [join, setJoin] = useState(""),
    [scopeName, setScopeName] = useState(""),
    [scopeKind, setScopeKind] = useState("city");
  const [assignments, setAssignments] = useState<
    { request_id: string; accepted_at: string | null; acknowledge_by: string }[]
  >([]);
  const load = useCallback(async () => {
    const c = await supportRpc<WorkforceContext>("vv2_context");
    onRole(c.role);
    setContext(c);
    if (["superadmin", "admin", "employee"].includes(c.role)) {
      const [d, s, a] = await Promise.all([
        supportRpc<Data>("vv2_console"),
        supportRpc<OperatingScope[]>("vv2_scopes", { p_management: true }),
        supportRpc<typeof assignments>("vv_my_assignments"),
      ]);
      setData(d);
      setScopes(s);
      setAssignments(a);
    } else {
      setData(empty);
      setScopes([]);
    }
  }, [onRole]);
  useEffect(() => {
    let live = true;
    const refresh = () => {
      if (live && !document.hidden)
        void load().catch((e) => setError(e.message));
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    const hide = () => {
      setReview(null);
      setToken("");
      if (document.hidden) {
        setData(empty);
        setContext(null);
      } else refresh();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [load]);
  async function run(task: () => Promise<unknown>, success = "Saved.") {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      setNotice(success);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const role = context?.role,
    manager = role === "superadmin" || role === "admin";
  return (
    <>
      <Dialog
        open={!!token}
        onOpenChange={(o) => {
          if (!o) setToken("");
        }}
      >
        <DialogContent className="tm-invite-dialog">
          <DialogHeader>
            <DialogTitle>Invitation code ready</DialogTitle>
            <DialogDescription>
              Send this privately to the invited person. It works once, with
              their account, within seven days.
            </DialogDescription>
          </DialogHeader>
          <code className="tm-invite-code">{token}</code>
          <button
            className="tm-button tm-full"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(token);
                setCopied(true);
              } catch {
                setError("Select the code and copy it manually.");
              }
            }}
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}{" "}
            {copied ? "Copied" : "Copy invitation code"}
          </button>
          <p>No email or SMS has been sent. Copy the code before closing.</p>
        </DialogContent>
      </Dialog>
      <div className="tm-page-heading">
        <div>
          <span className="tm-eyebrow">PEOPLE & RESPONSIBILITY</span>
          <h1>
            {role === "employee"
              ? "Your support desk"
              : manager
                ? "Team & access"
                : "Join your team"}
          </h1>
          <p>
            {role === "superadmin"
              ? "Appoint accountable area admins and review access."
              : role === "admin"
                ? "Build your local employee team and oversee safe response."
                : role === "employee"
                  ? "Support assigned conversations and review local volunteer applications."
                  : "Accept a staff invitation here. Volunteer applications are available in the app."}
          </p>
        </div>
        <button
          className="tm-button tm-button-secondary"
          onClick={() => void run(load, "Workspace refreshed.")}
          disabled={busy}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      {error && (
        <p className="tm-alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="tm-banner" role="status">
          {notice}
        </p>
      )}
      <section className="tm-panel" style={{ padding: 20, marginBottom: 20 }}>
        <p className="tm-eyebrow">YOUR ACCOUNT REFERENCE</p>
        <code style={{ overflowWrap: "anywhere" }}>{user}</code>
        <button
          className="tm-text-button"
          onClick={() =>
            void navigator.clipboard
              .writeText(user)
              .catch(() =>
                setError("Select the reference and copy it manually."),
              )
          }
        >
          Copy reference
        </button>
        {context?.memberships.map((m) => (
          <p key={m.scope_id}>
            {workforceLabel(m.role)} · {m.scope_name} · review due{" "}
            {date(m.expires_at)}
          </p>
        ))}
        {role === "employee" && (
          <button
            className="tm-button"
            disabled={busy}
            onClick={() =>
              void run(
                () =>
                  supportRpc("vv2_staff_availability", {
                    p_on: !context?.memberships.some(
                      (m) =>
                        m.available_until &&
                        Date.parse(m.available_until) > Date.now(),
                    ),
                  }),
                "Availability updated for up to four hours.",
              )
            }
          >
            Toggle availability for assignments
          </button>
        )}
      </section>
      {["superadmin", "admin", "employee"].includes(role || "") && (
        <nav className="tm-tabs" aria-label="Team sections">
          {[
            ["people", "People"],
            ["applications", "Volunteer applications"],
            ...(manager
              ? [
                  ["invites", "Invitations"],
                  ["audit", "Audit & reports"],
                ]
              : []),
            ...(role === "employee" ? [["assignments", "My assignments"]] : []),
          ].map(([id, label]) => (
            <button
              key={id}
              aria-current={tab === id ? "page" : undefined}
              className={tab === id ? "is-active" : ""}
              onClick={() => {
                setTab(id);
                setReview(null);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      {tab === "people" && manager && (
        <section className="tm-panel">
          <div className="tm-panel-heading">
            <div>
              <h2>
                {role === "superadmin"
                  ? "Area admins & employees"
                  : "Employees in your areas"}
              </h2>
              <p>
                Permissions expire after 90 days. Suspending an admin also
                removes access from employees they sponsor.
              </p>
            </div>
            <button className="tm-button" onClick={() => setTab("invites")}>
              <Plus size={16} />
              Invite {role === "superadmin" ? "admin" : "employee"}
            </button>
          </div>
          {data.staff.length ? (
            data.staff.map((m) => (
              <article
                className="tm-person"
                key={m.user_id + m.scope_id}
                style={{
                  padding: 20,
                  borderTop: "1px solid var(--tm-line,#e5e7eb)",
                }}
              >
                <h3>{m.display_name}</h3>
                <p>
                  {workforceLabel(m.role)} · {m.scope_name} · {m.organisation}
                </p>
                <p>
                  {m.enabled ? "Enabled" : "Suspended"} · review due{" "}
                  {date(m.expires_at)}
                </p>
                <button
                  className="tm-text-button"
                  disabled={busy || m.user_id === user}
                  onClick={() => {
                    const why = window.prompt(
                      "Record the reason for this access change (at least 10 characters).",
                    );
                    if (why)
                      void run(() =>
                        supportRpc("vv2_set_staff_access", {
                          p_user: m.user_id,
                          p_scope: m.scope_id,
                          p_enabled: !m.enabled,
                          p_reason: why,
                        }),
                      );
                  }}
                >
                  {m.enabled ? "Suspend access" : "Restore current access"}
                </button>
              </article>
            ))
          ) : (
            <p style={{ padding: 24 }}>
              No staff in this view yet. Invite an existing verified account to
              get started.
            </p>
          )}
        </section>
      )}
      {tab === "people" && !manager && (
        <section className="tm-panel" style={{ padding: 24 }}>
          <h2>Your next step</h2>
          <p>
            {role === "employee"
              ? "Mark yourself available, then acknowledge an assignment or review a volunteer application."
              : "Volunteer enrollment is in the app under Offer support. It grants no access until review, training and independent field approval."}
          </p>
        </section>
      )}
      {tab === "invites" && manager && (
        <div className="tm-enroll-grid">
          <section className="tm-panel" style={{ padding: 24 }}>
            <h2>
              Invite {role === "superadmin" ? "an area admin" : "an employee"}
            </h2>
            <p>
              The person first signs in and shares their account reference.
              Complete checks outside this form and record the reference below.
            </p>
            <form
              className="tm-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const code = await supportRpc<string>("vv2_invite_staff", {
                    p_account: account.trim(),
                    p_role: role === "superadmin" ? "admin" : "employee",
                    p_scope: scope,
                    p_name: name,
                    p_organisation: org,
                    p_reference: inviteRef,
                    p_checks: attested,
                  });
                  setToken(code);
                  setCopied(false);
                }, "Invitation created. Copy the code in the popup.");
              }}
            >
              <Field label="Verified account reference">
                <input
                  required
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                />
              </Field>
              <Field label="Service area">
                <select
                  required
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  <option value="">Choose an area</option>
                  {scopes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.kind}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Work display name">
                <input
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Organisation">
                <input
                  required
                  maxLength={120}
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                />
              </Field>
              <Field label="Review record reference">
                <input
                  required
                  minLength={5}
                  maxLength={300}
                  value={inviteRef}
                  onChange={(e) => setInviteRef(e.target.value)}
                />
              </Field>
              <label className="tm-check">
                <input
                  type="checkbox"
                  required
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                />
                I completed identity, reference, interview, training and
                confidentiality checks and can provide the review record.
              </label>
              <button className="tm-button" disabled={busy}>
                Create personal invitation
              </button>
            </form>
          </section>
          <section className="tm-panel" style={{ padding: 24 }}>
            <h2>Outstanding invitations</h2>
            {data.invites.length ? (
              data.invites.map((i) => (
                <article key={i.id} style={{ padding: "16px 0" }}>
                  <strong>{i.display_name}</strong>
                  <p>
                    {workforceLabel(i.role)} ·{" "}
                    {scopes.find((s) => s.id === i.scope_id)?.name ||
                      i.scope_id}{" "}
                    · expires {date(i.expires_at)}
                  </p>
                  <button
                    className="tm-text-button"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        supportRpc("vv2_revoke_invite", {
                          p_id: i.id,
                          p_reason:
                            "Inviter cancelled the outstanding invitation",
                        }),
                      )
                    }
                  >
                    Revoke invitation
                  </button>
                </article>
              ))
            ) : (
              <p>No outstanding invitations.</p>
            )}
          </section>
        </div>
      )}
      {role === "superadmin" && tab === "invites" && (
        <section className="tm-panel" style={{ padding: 24, marginTop: 20 }}>
          <h2>Add an administrative area</h2>
          <p>
            This defines who can manage a team. It does not enable emergency
            response or establish police coverage.
          </p>
          <form
            className="tm-form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  supportRpc("vv2_create_scope", {
                    p_name: scopeName,
                    p_kind: scopeKind,
                    p_parent: scope,
                  }),
                "Area created. Intake and response remain off.",
              );
            }}
          >
            <Field label="Parent area">
              <select
                required
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                <option value="">Choose parent</option>
                {scopes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Area name">
              <input
                required
                value={scopeName}
                onChange={(e) => setScopeName(e.target.value)}
              />
            </Field>
            <Field label="Area type">
              <select
                value={scopeKind}
                onChange={(e) => setScopeKind(e.target.value)}
              >
                {["state", "city", "district", "service_area", "region"].map(
                  (k) => (
                    <option key={k}>{k}</option>
                  ),
                )}
              </select>
            </Field>
            <button className="tm-button" disabled={busy}>
              Create area
            </button>
          </form>
        </section>
      )}
      {tab === "applications" && (
        <section className="tm-panel" style={{ padding: 24 }}>
          <h2>Volunteer applications</h2>
          <p>
            Employee review and independent admin field approval are separate.
            Neither a form nor an identity check can guarantee future conduct.
          </p>
          {!data.applications.length && (
            <p>No applications in your area yet.</p>
          )}
          {data.applications.map((a) => (
            <article
              key={a.user_id}
              style={{ padding: "20px 0", borderBottom: "1px solid #e5e7eb" }}
            >
              <h3>{a.display_name}</h3>
              <p>
                {a.scope_name} · {a.organisation || "Independent applicant"}
              </p>
              <p>
                Review: {a.status.replaceAll("_", " ")} · due{" "}
                {date(a.review_due)}
                <br />
                Field response: {a.field_status} · due{" "}
                {date(a.field_review_due)}
              </p>
              {role === "employee" ? (
                <button
                  className="tm-button tm-button-secondary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Confirm that you have no personal or professional conflict with this applicant.",
                      )
                    )
                      void run(async () => {
                        const r = await supportRpc<Review>(
                          "vv2_claim_volunteer_review",
                          { p_user: a.user_id, p_no_conflict: true },
                        );
                        setReview(r);
                        setChecks({});
                        setReference("");
                        setReason("");
                      }, "Review opened.");
                  }}
                >
                  Take / open review
                </button>
              ) : (
                <button
                  className="tm-button tm-button-secondary"
                  disabled={
                    busy || a.status !== "approved" || a.reviewed_by === user
                  }
                  onClick={() =>
                    void run(async () => {
                      const record = await supportRpc<Review>(
                        "vv2_field_review",
                        { p_user: a.user_id },
                      );
                      setReview(record);
                      setReason("");
                    }, "Current employee review opened.")
                  }
                >
                  Open employee review
                </button>
              )}
            </article>
          ))}
        </section>
      )}
      {review && tab === "applications" && manager && (
        <section className="tm-panel" style={{ padding: 24, marginTop: 20 }}>
          <h2>Independent field review · {review.display_name}</h2>
          <p>
            Employee reviewer: <code>{review.reviewed_by}</code>
          </p>
          <p>
            Checks completed:{" "}
            {Object.entries(review.checks)
              .filter(([, done]) => done)
              .map(([key]) => key.replaceAll("_", " "))
              .join(", ")}
          </p>
          <p>Review reference: {review.review_reference}</p>
          <p>Employee decision: {review.decision_reason}</p>
          <p>
            Languages: {review.languages} · Skills: {review.skills}
          </p>
          <p>Availability: {review.availability}</p>
          <p>
            Review due: {date(review.review_due)}. Field approval is limited to
            30 days and one active response assignment.
          </p>
          <Field label="Independent decision and supervision / buddy plan">
            <textarea
              value={reason}
              maxLength={2000}
              onChange={(e) => setReason(e.target.value)}
              style={{ display: "block", width: "100%", padding: 12 }}
            />
          </Field>
          <div className="tm-actions" style={{ marginTop: 16 }}>
            {[
              [true, "Authorize supervised field response"],
              [false, "Suspend field response"],
            ].map(([allow, label]) => (
              <button
                className="tm-button"
                key={String(allow)}
                disabled={busy || reason.trim().length < 10}
                onClick={() =>
                  void run(async () => {
                    await supportRpc("vv2_approve_field_response", {
                      p_user: review.user_id,
                      p_allow: allow,
                      p_reason: reason,
                    });
                    setReview(null);
                  }, "Independent field decision recorded.")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}
      {review && tab === "applications" && role === "employee" && (
        <section className="tm-panel" style={{ padding: 24, marginTop: 20 }}>
          <h2>Review · {review.display_name}</h2>
          <p>Languages: {review.languages}</p>
          <p>Skills: {review.skills}</p>
          <p>Availability: {review.availability}</p>
          <p>Previous decision: {review.decision_reason || "First review"}</p>
          {review.applicant_note && (
            <p>Applicant correction / appeal: {review.applicant_note}</p>
          )}
          <div className="tm-form">
            {[
              "identity",
              "contact",
              "references",
              "interview",
              "training",
              "confidentiality",
              "local_area",
            ].map((k) => (
              <label key={k} className="tm-check">
                <input
                  type="checkbox"
                  checked={!!checks[k]}
                  onChange={(e) =>
                    setChecks((v) => ({ ...v, [k]: e.target.checked }))
                  }
                />
                {k.replaceAll("_", " ")} check completed
              </label>
            ))}
            <Field label="Restricted review record reference (do not paste ID documents)">
              <input
                maxLength={300}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
            <Field label="Decision reason (shown to the applicant)">
              <textarea
                minLength={10}
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <div className="tm-actions">
              {[
                ["approved", "Approve review"],
                ["changes_requested", "Request changes"],
                ["rejected", "Deny application"],
                ["suspended", "Suspend eligibility"],
              ].map(([decision, label]) => (
                <button
                  className="tm-button tm-button-secondary"
                  key={decision}
                  disabled={
                    busy ||
                    reason.trim().length < 10 ||
                    (decision === "approved" &&
                      (reference.trim().length < 5 ||
                        ![
                          "identity",
                          "contact",
                          "references",
                          "interview",
                          "training",
                          "confidentiality",
                          "local_area",
                        ].every((k) => checks[k])))
                  }
                  onClick={() =>
                    void run(async () => {
                      await supportRpc("vv2_review_volunteer", {
                        p_user: review.user_id,
                        p_decision: decision,
                        p_checks: checks,
                        p_reference: reference,
                        p_reason: reason,
                      });
                      setReview(null);
                    }, "Decision recorded. Field response needs independent admin approval.")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
      {tab === "assignments" && role === "employee" && (
        <section className="tm-panel" style={{ padding: 24 }}>
          <h2>Your assignments</h2>
          {!assignments.length && <p>No current assignments.</p>}
          {assignments.map((a) => (
            <article key={a.request_id} style={{ padding: 16 }}>
              <code>#{a.request_id.slice(0, 8)}</code>
              {a.accepted_at ? (
                <Link
                  className="tm-text-button"
                  href={"/admin/dashboard?id=" + a.request_id}
                >
                  Open conversation
                </Link>
              ) : (
                <button
                  className="tm-button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Can you take this case without a conflict of interest?",
                      )
                    )
                      void run(() =>
                        supportRpc("vv_accept_case", {
                          p_request_id: a.request_id,
                          p_no_conflict: true,
                        }),
                      );
                  }}
                >
                  Acknowledge · due{" "}
                  {new Date(a.acknowledge_by).toLocaleTimeString()}
                </button>
              )}
            </article>
          ))}
        </section>
      )}
      {tab === "audit" && manager && (
        <>
          <section className="tm-panel" style={{ padding: 24 }}>
            <h2>Safety reports</h2>
            {!data.reports.length && <p>No open reports.</p>}
            {data.reports.map((r) => (
              <article key={r.id} style={{ padding: "16px 0" }}>
                <strong>{r.state}</strong>
                <p>{r.reason}</p>
                <button
                  className="tm-text-button"
                  disabled={busy}
                  onClick={() => {
                    const result = window.prompt(
                      "Record the investigation and action taken. Closing a report does not automatically restore or ban anyone.",
                    );
                    if (result)
                      void run(() =>
                        supportRpc("vv_review_report", {
                          p_id: r.id,
                          p_state: "closed",
                          p_resolution: result,
                        }),
                      );
                  }}
                >
                  Record resolution
                </button>
              </article>
            ))}
          </section>
          <section className="tm-panel" style={{ padding: 24, marginTop: 20 }}>
            <h2>Recent accountability records</h2>
            <p>
              Latest 100 actions in your authorized areas. Review references
              belong in your restricted verification records.
            </p>
            {data.audit.map((a) => (
              <article
                key={a.id}
                style={{ padding: "12px 0", borderBottom: "1px solid #e5e7eb" }}
              >
                <strong>{a.action.replaceAll("_", " ")}</strong>
                <p>{a.reason}</p>
                <small>
                  {workforceLabel(a.actor_role)} ·{" "}
                  {a.actor_id?.slice(0, 8) || "Deleted account"} ·{" "}
                  {new Date(a.created_at).toLocaleString()}
                </small>
              </article>
            ))}
          </section>
        </>
      )}
      <details
        className="tm-panel"
        style={{ padding: 24, marginTop: 24 }}
        open={!["superadmin", "admin", "employee"].includes(role || "")}
      >
        <summary>Accept a staff invitation</summary>
        <p>
          Use the account the invitation was issued for. The code is shared
          privately by the inviting admin.
        </p>
        <form
          className="tm-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await supportRpc("vv2_accept_staff", { p_token: join.trim() });
              setJoin("");
            }, "Invitation accepted. Your role and service area are shown above.");
          }}
        >
          <Field label="Personal invitation code">
            <input
              required
              autoComplete="off"
              value={join}
              onChange={(e) => setJoin(e.target.value)}
            />
          </Field>
          <button className="tm-button" disabled={busy}>
            Accept invitation
          </button>
        </form>
      </details>
    </>
  );
}
