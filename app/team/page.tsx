"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Shield,
  Users,
  Inbox,
  Radio,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Copy,
  Check,
  ChevronDown,
  Search,
  RefreshCw,
  UserCheck,
  MailPlus,
  Clock3,
  Flag,
  LogOut,
  LockKeyhole,
  Loader2,
  CheckCircle2,
  MapPin,
  Languages,
  X,
  FileCheck2,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { supportRpc } from "@/lib/support";
import { StaffMfa } from "@/components/staff-mfa";
import { PILOT_REGIONS } from "@/shared/sos";
type Worker = {
  user_id: string;
  display_name: string;
  organisation: string;
  requested_role: string;
  region: string;
  languages: string;
  skills: string;
  status: string;
  review_due: string;
  available_until: string;
};
type Report = {
  id: string;
  worker_id: string;
  reason: string;
  request_id: string | null;
  event_id: string | null;
  state: string;
};
type Console = {
  invites?: {
    id: string;
    account_id: string;
    role: string;
    region: string;
    expires_at: string;
  }[];
  profile?: Worker | null;
  workers?: Worker[];
  reports?: Report[];
  overdue_cases?: { request_id: string; user_id: string }[];
  overdue_sos?: { id: string; region_id: string }[];
  reassignment_requests?: { request_id: string; created_at: string }[];
  access_review?: { actor_id: string; evidence_opens: number }[];
};
const roleName = (s: string) =>
  ({
    case_worker: "Case worker",
    support_volunteer: "Support volunteer",
    emergency_responder: "Emergency responder",
  })[s] || s.replaceAll("_", " ");
const areaName = (s: string) =>
  PILOT_REGIONS.find((r) => r.id === s)?.name || s;
const date = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const initials = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("");
function Empty({
  title,
  children,
  icon: Icon = Users,
}: {
  title: string;
  children: ReactNode;
  icon?: typeof Users;
}) {
  return (
    <div className="tm-empty">
      <span>
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function AccountReference({ id }: { id: string }) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  return (
    <details className="tm-account">
      <summary>
        Account reference <ChevronDown size={14} />
      </summary>
      <div>
        <p>Share this with the supervisor inviting you.</p>
        <code>{id}</code>
        <button
          className="tm-text-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(id);
              setCopied(true);
            } catch {
              setError("Select the reference to copy it manually.");
            }
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
          {copied ? "Copied" : "Copy reference"}
        </button>
        {error && <p role="status">{error}</p>}
        <button
          className="tm-text-button tm-account-signout"
          onClick={() => void getSupabase().auth.signOut()}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </details>
  );
}
export default function Team() {
  const [user, setUser] = useState<string | null>(null),
    [admin, setAdmin] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      revision = 0;
    const load = async () => {
      const id = ++revision;
      try {
        const { data, error } = await getSupabase().auth.getUser();
        if (error && data.user) throw error;
        const role = data.user ? await getSupabase().rpc("is_admin") : null;
        if (role?.error) throw role.error;
        if (active && revision === id) {
          setUser(data.user?.id || null);
          setAdmin(role?.data === true);
          setLoading(false);
          setError("");
        }
      } catch (e) {
        if (active && revision === id) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    };
    void load();
    const { data } = getSupabase().auth.onAuthStateChange(() => {
      setLoading(true);
      setTimeout(() => void load(), 0);
    });
    return () => {
      active = false;
      revision++;
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
            <span className="tm-nav-dot" />
          </Link>
        </nav>
        <div className="tm-sidebar-bottom">
          <div className="tm-sidebar-note">
            <LockKeyhole size={18} />
            <p>Access follows each person’s role and assignments.</p>
          </div>
          <button onClick={() => void getSupabase().auth.signOut()}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="tm-workspace">
        <header className="tm-topbar">
          <span>
            Workspace <span className="tm-slash">/</span> Team & access
          </span>
          <div>
            {user && <AccountReference key={user} id={user} />}
            <span className="tm-role">
              <Shield size={13} />
              {loading ? "Connecting" : admin ? "Supervisor" : "Team member"}
            </span>
          </div>
        </header>
        <main className="tm-content">
          {error && (
            <p className="tm-alert" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <div className="tm-loading tm-page-loading" role="status">
              <Loader2 className="tm-spin" size={22} />
              Opening your workspace…
            </div>
          ) : !user ? (
            <section className="tm-welcome">
              <span className="tm-eyebrow">JOIN THE TEAM</span>
              <h1>Support starts with the right people.</h1>
              <p>
                Use the account your invitation was issued for. Your supervisor
                will guide you through enrollment, checks and training.
              </p>
              <Link
                className="tm-button"
                href="/login"
                onClick={() =>
                  sessionStorage.setItem("vv-login-destination", "/team")
                }
              >
                Sign in to continue <ArrowRight size={17} />
              </Link>
              <div className="tm-welcome-foot">
                <Shield size={16} />
                An invitation alone doesn’t grant access to cases or locations.
              </div>
            </section>
          ) : (
            <StaffMfa key={user}>
              <TeamConsole admin={admin} />
            </StaffMfa>
          )}
        </main>
      </div>
    </div>
  );
}
function TeamConsole({ admin }: { admin: boolean }) {
  const [data, setData] = useState<Console>({}),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("team"),
    [query, setQuery] = useState(""),
    [invite, setInvite] = useState(""),
    [copied, setCopied] = useState(false),
    [account, setAccount] = useState(""),
    [role, setRole] = useState("support_volunteer"),
    [region, setRegion] = useState("bhopal");
  const [token, setToken] = useState(""),
    [name, setName] = useState(""),
    [org, setOrg] = useState(""),
    [languages, setLanguages] = useState(""),
    [skills, setSkills] = useState("");
  const load = useCallback(async () => {
    try {
      if (document.hidden) {
        setData({});
        setLoaded(false);
        return;
      }
      const next = await supportRpc<Console>("vv_worker_console");
      if (!document.hidden) {
        setData(next);
        setLoaded(true);
      }
      setError("");
    } catch (e) {
      setData({});
      setLoaded(false);
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    const onVisibility = () => {
      setInvite("");
      setCopied(false);
      if (document.hidden) {
        setData({});
        setLoaded(false);
      } else void load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);
  async function run(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const workers = data.workers || [];
  const pending = workers.filter((w) => w.status === "pending").length;
  const approved = workers.filter((w) =>
    ["approved", "probation"].includes(w.status),
  ).length;
  const attention =
    (data.overdue_cases?.length || 0) +
    (data.overdue_sos?.length || 0) +
    (data.reassignment_requests?.length || 0) +
    (data.access_review?.length || 0);
  const filtered = workers.filter((w) =>
    `${w.display_name} ${w.organisation} ${w.requested_role} ${w.region}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="tm-page-heading">
        <div>
          <span className="tm-eyebrow">PEOPLE & PERMISSIONS</span>
          <h1>{admin ? "Team management" : "Your place on the team"}</h1>
          <p>
            {admin
              ? "Invite, review and support the people helping survivors."
              : "Complete enrollment, manage availability and acknowledge your assignments."}
          </p>
        </div>
        {admin && (
          <button className="tm-button" onClick={() => setTab("invites")}>
            <Plus size={17} />
            Invite a team member
          </button>
        )}
      </div>
      {error && (
        <p className="tm-alert" role="alert">
          {error}
        </p>
      )}
      {admin ? (
        <>
          <div className="tm-stats">
            <div>
              <span className="tm-stat-icon green">
                <UserCheck size={20} />
              </span>
              <div>
                <strong>{loaded ? approved : "—"}</strong>
                <span>Approved & on probation</span>
              </div>
            </div>
            <div>
              <span className="tm-stat-icon amber">
                <Clock3 size={20} />
              </span>
              <div>
                <strong>{loaded ? pending : "—"}</strong>
                <span>Applications to review</span>
              </div>
            </div>
            <div>
              <span className="tm-stat-icon purple">
                <Flag size={20} />
              </span>
              <div>
                <strong>{loaded ? data.reports?.length || 0 : "—"}</strong>
                <span>Open safety reports</span>
              </div>
            </div>
          </div>
          <div
            className="tm-tabs"
            role="tablist"
            aria-label="Team management views"
          >
            {[
              ["team", "Team", workers.length],
              ["invites", "Invitations", data.invites?.length || 0],
              ["attention", "Needs attention", attention],
              ["reports", "Safety reports", data.reports?.length || 0],
            ].map(([id, label, count]) => (
              <button
                key={id}
                id={`tab-${id}`}
                role="tab"
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                onKeyDown={(e) => {
                  const ids = ["team", "invites", "attention", "reports"];
                  let next = -1;
                  if (e.key === "ArrowRight")
                    next = (ids.indexOf(String(id)) + 1) % ids.length;
                  else if (e.key === "ArrowLeft")
                    next =
                      (ids.indexOf(String(id)) + ids.length - 1) % ids.length;
                  else if (e.key === "Home") next = 0;
                  else if (e.key === "End") next = ids.length - 1;
                  if (next >= 0) {
                    e.preventDefault();
                    setTab(ids[next]);
                    document.getElementById(`tab-${ids[next]}`)?.focus();
                  }
                }}
                onClick={() => setTab(String(id))}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
          {!loaded && !error ? (
            <div className="tm-loading">
              <Loader2 className="tm-spin" size={18} />
              Loading team records…
            </div>
          ) : (
            <section
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
              role="tabpanel"
            >
              {tab === "team" && (
                <section className="tm-panel">
                  <div className="tm-panel-heading">
                    <div>
                      <h2>
                        People on your team{" "}
                        <span className="tm-count">{workers.length}</span>
                      </h2>
                      <p>
                        Review an application or manage an existing team
                        member’s access.
                      </p>
                    </div>
                    <button
                      className="tm-icon-button"
                      aria-label="Refresh team"
                      onClick={() => void load()}
                    >
                      <RefreshCw size={17} />
                    </button>
                  </div>
                  <div className="tm-directory-tools">
                    <label className="tm-search">
                      <Search size={17} />
                      <input
                        aria-label="Search team"
                        placeholder="Search name, organisation or role"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <span className="tm-muted">
                      {filtered.length}{" "}
                      {filtered.length === 1 ? "person" : "people"}
                    </span>
                  </div>
                  {filtered.length ? (
                    <div className="tm-directory">
                      <div className="tm-directory-labels">
                        <span>TEAM MEMBER</span>
                        <span>STATUS</span>
                        <span>REVIEW</span>
                      </div>
                      {filtered.map((w) => (
                        <WorkerReview
                          key={w.user_id}
                          worker={w}
                          busy={busy}
                          run={run}
                        />
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title={
                        query
                          ? "No matching team members"
                          : "Your team starts here"
                      }
                    >
                      {query
                        ? "Try a different name, organisation or role."
                        : "Invite a colleague or partner volunteer. Their application will appear here for review."}
                    </Empty>
                  )}
                  <div className="tm-panel-foot">
                    <Shield size={15} />
                    <p>
                      Approval and case assignment are separate. Only assign
                      work after completing the required checks.
                    </p>
                  </div>
                </section>
              )}
              {tab === "invites" && (
                <div className="tm-two-column">
                  <section className="tm-panel">
                    <div className="tm-panel-heading">
                      <div>
                        <span className="tm-eyebrow">GROW YOUR TEAM</span>
                        <h2>Create an invitation</h2>
                        <p>
                          Invite someone recruited through your team or a known
                          partner.
                        </p>
                      </div>
                      <span className="tm-section-icon">
                        <MailPlus size={22} />
                      </span>
                    </div>
                    <form
                      className="tm-form tm-padded"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run(async () => {
                          setInvite(
                            await supportRpc<string>(
                              "vv_create_worker_invite",
                              {
                                p_account: account,
                                p_role: role,
                                p_region: region,
                              },
                            ),
                          );
                          setCopied(false);
                        });
                      }}
                    >
                      <label htmlFor="invite-account">
                        Account reference
                        <input
                          id="invite-account"
                          required
                          pattern="[0-9a-fA-F-]{36}"
                          placeholder="Paste the person’s account reference"
                          value={account}
                          onChange={(e) => setAccount(e.target.value)}
                        />
                        <small>
                          Ask them to sign in here and copy their account
                          reference from the top bar.
                        </small>
                      </label>
                      <label htmlFor="invite-role">
                        Role
                        <select
                          id="invite-role"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                        >
                          <option value="support_volunteer">
                            Support volunteer
                          </option>
                          <option value="case_worker">
                            Employed case worker
                          </option>
                          <option value="emergency_responder">
                            Emergency responder
                          </option>
                        </select>
                      </label>
                      <label htmlFor="invite-region">
                        Service area
                        <select
                          id="invite-region"
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                        >
                          {PILOT_REGIONS.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="tm-button" disabled={busy}>
                        {busy ? (
                          <Loader2 size={17} className="tm-spin" />
                        ) : (
                          <Plus size={17} />
                        )}
                        Create invitation
                      </button>
                      <p className="tm-form-note">
                        <Clock3 size={14} />
                        Valid for seven days. One use, by this account only.
                      </p>
                    </form>
                    {invite && (
                      <div className="tm-invite-result" role="status">
                        <CheckCircle2 size={20} />
                        <div>
                          <strong>Invitation ready</strong>
                          <p>
                            Share this code privately with the person you
                            invited.
                          </p>
                          <code>{invite}</code>
                          <div className="tm-actions">
                            <button
                              className="tm-text-button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(invite);
                                  setCopied(true);
                                } catch {
                                  setError(
                                    "Select the invitation code to copy it manually.",
                                  );
                                }
                              }}
                            >
                              {copied ? (
                                <Check size={15} />
                              ) : (
                                <Copy size={15} />
                              )}{" "}
                              {copied ? "Copied" : "Copy code"}
                            </button>
                            <button
                              className="tm-text-button"
                              onClick={() => setInvite("")}
                            >
                              <X size={14} />
                              Hide code
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                  <section className="tm-panel">
                    <div className="tm-panel-heading">
                      <div>
                        <h2>Pending invitations</h2>
                        <p>Unused invitations that haven’t expired.</p>
                      </div>
                      <span className="tm-count">
                        {data.invites?.length || 0}
                      </span>
                    </div>
                    {data.invites?.length ? (
                      data.invites.map((i) => (
                        <article className="tm-list-item" key={i.id}>
                          <span className="tm-avatar muted">
                            <MailPlus size={19} />
                          </span>
                          <div>
                            <strong>{roleName(i.role)}</strong>
                            <p>
                              {areaName(i.region)} · Expires{" "}
                              {date(i.expires_at)}
                            </p>
                            <details className="tm-small-details">
                              <summary>Account reference</summary>
                              <code>{i.account_id}</code>
                            </details>
                          </div>
                          <button
                            className="tm-text-button danger"
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                supportRpc("vv_revoke_worker_invite", {
                                  p_id: i.id,
                                }),
                              )
                            }
                          >
                            Revoke
                          </button>
                        </article>
                      ))
                    ) : (
                      <Empty icon={MailPlus} title="No outstanding invitations">
                        New invitations will appear here until they’re used or
                        expire.
                      </Empty>
                    )}
                  </section>
                </div>
              )}
              {tab === "attention" && (
                <div className="tm-attention-grid">
                  <Attention
                    title="Reassignment requested"
                    count={data.reassignment_requests?.length || 0}
                    empty="No reassignment requests."
                  >
                    {data.reassignment_requests?.map((r) => (
                      <Link
                        key={r.request_id}
                        className="tm-task"
                        href={`/admin/dashboard?id=${r.request_id}`}
                      >
                        <span>
                          Case {r.request_id.slice(0, 8)}
                          <small>Choose a new support worker</small>
                        </span>
                        <ArrowUpRight size={17} />
                      </Link>
                    ))}
                  </Attention>
                  <Attention
                    title="Assignments overdue"
                    count={data.overdue_cases?.length || 0}
                    empty="All assignments are within their acknowledgment window."
                  >
                    {data.overdue_cases?.map((a) => (
                      <Link
                        className="tm-task"
                        key={`${a.request_id}${a.user_id}`}
                        href={`/admin/dashboard?id=${a.request_id}`}
                      >
                        <span>
                          Case {a.request_id.slice(0, 8)}
                          <small>
                            Worker {a.user_id.slice(0, 8)} · Review or reassign
                          </small>
                        </span>
                        <ArrowUpRight size={17} />
                      </Link>
                    ))}
                  </Attention>
                  <Attention
                    title="Emergency requests"
                    count={data.overdue_sos?.length || 0}
                    empty="No overdue emergency requests in this queue."
                  >
                    {data.overdue_sos?.map((e) => (
                      <Link
                        className="tm-task"
                        key={e.id}
                        href="/admin/emergency"
                      >
                        <span>
                          {areaName(e.region_id)}
                          <small>
                            Request {e.id.slice(0, 8)} · No assigned help
                          </small>
                        </span>
                        <ArrowUpRight size={17} />
                      </Link>
                    ))}
                    <p className="tm-note">
                      A notification or acknowledgement does not confirm
                      arrival.
                    </p>
                  </Attention>
                  <Attention
                    title="Access review"
                    count={data.access_review?.length || 0}
                    empty="No unusual evidence-read counts to review."
                  >
                    {data.access_review?.map((a) => (
                      <p className="tm-task" key={a.actor_id}>
                        <span>
                          Account {a.actor_id.slice(0, 8)}
                          <small>
                            {a.evidence_opens} evidence opens in the last hour.
                            Check the audit before deciding on action.
                          </small>
                        </span>
                      </p>
                    ))}
                  </Attention>
                </div>
              )}
              {tab === "reports" && (
                <section className="tm-panel">
                  <div className="tm-panel-heading">
                    <div>
                      <h2>Private safety reports</h2>
                      <p>
                        Review concerns, record your action and follow up with
                        the survivor.
                      </p>
                    </div>
                    <span className="tm-section-icon">
                      <Flag size={22} />
                    </span>
                  </div>
                  {data.reports?.length ? (
                    data.reports.map((r) => (
                      <ReportReview
                        key={r.id}
                        report={r}
                        busy={busy}
                        run={run}
                      />
                    ))
                  ) : (
                    <Empty icon={Shield} title="No open safety reports">
                      Reports are visible to supervisors only. New reports will
                      appear here.
                    </Empty>
                  )}
                </section>
              )}
            </section>
          )}
        </>
      ) : !loaded ? (
        <div className="tm-loading">
          <Loader2 className="tm-spin" size={18} />
          Loading your enrollment…
        </div>
      ) : (
        <div className="tm-member-layout">
          {!data.profile ? (
            <section className="tm-panel">
              <div className="tm-panel-heading">
                <div>
                  <span className="tm-eyebrow">YOUR FIRST STEP</span>
                  <h2>Use your invitation</h2>
                  <p>
                    Your supervisor will review your application and arrange
                    checks and training.
                  </p>
                </div>
                <span className="tm-section-icon">
                  <MailPlus size={23} />
                </span>
              </div>
              <form
                className="tm-form tm-padded"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await supportRpc("vv_apply_worker", {
                      p_token: token,
                      p_name: name,
                      p_organisation: org,
                      p_languages: languages,
                      p_skills: skills,
                    });
                    setToken("");
                  });
                }}
              >
                {[
                  {
                    label: "Invitation code",
                    value: token,
                    set: setToken,
                    max: 100,
                    placeholder: "Code from your supervisor",
                  },
                  {
                    label: "Display name",
                    value: name,
                    set: setName,
                    max: 80,
                    placeholder: "Your name, shown to the people you help",
                  },
                  {
                    label: "Organisation",
                    value: org,
                    set: setOrg,
                    max: 120,
                    placeholder: "Your team or partner organisation",
                  },
                  {
                    label: "Languages",
                    value: languages,
                    set: setLanguages,
                    max: 250,
                    placeholder: "For example: Hindi, English",
                  },
                  {
                    label: "Relevant skills",
                    value: skills,
                    set: setSkills,
                    max: 500,
                    placeholder: "Tell us how you can help",
                  },
                ].map((f) => (
                  <label key={f.label}>
                    {f.label}
                    <input
                      required
                      minLength={2}
                      maxLength={f.max}
                      value={f.value}
                      placeholder={f.placeholder}
                      onChange={(e) => f.set(e.target.value)}
                    />
                  </label>
                ))}
                <button className="tm-button" disabled={busy}>
                  Submit application <ArrowRight size={16} />
                </button>
              </form>
            </section>
          ) : (
            <section className="tm-panel">
              <div className="tm-panel-heading">
                <span className="tm-avatar">
                  {initials(data.profile.display_name)}
                </span>
                <div>
                  <h2>{data.profile.display_name}</h2>
                  <p>{data.profile.organisation}</p>
                </div>
                <span className={`tm-status ${data.profile.status}`}>
                  {data.profile.status}
                </span>
              </div>
              <div className="tm-padded">
                <p className="tm-role-line">
                  {roleName(data.profile.requested_role)} ·{" "}
                  {areaName(data.profile.region)}
                </p>
                <dl className="tm-profile-details">
                  <div>
                    <dt>Review due</dt>
                    <dd>
                      {data.profile.review_due
                        ? date(data.profile.review_due)
                        : "Awaiting review"}
                    </dd>
                  </div>
                  <div>
                    <dt>Case availability ends</dt>
                    <dd>
                      {data.profile.available_until
                        ? new Date(
                            data.profile.available_until,
                          ).toLocaleTimeString()
                        : "Not available for new cases"}
                    </dd>
                  </div>
                </dl>
                <div className="tm-actions">
                  <button
                    className="tm-button"
                    disabled={
                      busy ||
                      !["approved", "probation"].includes(data.profile.status)
                    }
                    onClick={() =>
                      void run(() =>
                        supportRpc("vv_worker_availability", { p_on: true }),
                      )
                    }
                  >
                    Available for cases · 4 hours
                  </button>
                  <button
                    className="tm-button secondary"
                    disabled={
                      busy ||
                      !["approved", "probation"].includes(data.profile.status)
                    }
                    onClick={() =>
                      void run(() =>
                        supportRpc("vv_worker_availability", { p_on: false }),
                      )
                    }
                  >
                    Stop new assignments
                  </button>
                </div>
                <p className="tm-note">
                  Emergency availability is separate. Use Emergency responder in
                  the phone app.
                </p>
              </div>
            </section>
          )}
          <AssignmentAcknowledgments />
        </div>
      )}
    </>
  );
}
function Attention({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section className="tm-panel">
      <div className="tm-panel-heading">
        <h2>{title}</h2>
        <span className="tm-count">{count}</span>
      </div>
      <div className="tm-padded">
        {count ? (
          children
        ) : (
          <p className="tm-inline-empty">
            <CheckCircle2 size={17} />
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}
function WorkerReview({
  worker: w,
  busy,
  run,
}: {
  worker: Worker;
  busy: boolean;
  run: (f: () => Promise<unknown>) => Promise<void>;
}) {
  const [checks, setChecks] = useState(false),
    [reference, setReference] = useState("");
  return (
    <details className="tm-person">
      <summary>
        <span className="tm-person-identity">
          <span className="tm-avatar">{initials(w.display_name)}</span>
          <span>
            <strong>{w.display_name}</strong>
            <small>
              {roleName(w.requested_role)} · {w.organisation}
            </small>
          </span>
        </span>
        <span className={`tm-status ${w.status}`}>
          {w.status === "pending" ? "Awaiting review" : w.status}
        </span>
        <span className="tm-review-trigger">
          Review <ChevronDown size={15} />
        </span>
      </summary>
      <div className="tm-review-body">
        <div className="tm-review-info">
          <h3>Application details</h3>
          <p>
            <MapPin size={16} />
            {areaName(w.region)}
          </p>
          <p>
            <Languages size={16} />
            {w.languages}
          </p>
          <p>
            <FileCheck2 size={16} />
            {w.skills}
          </p>
          <p className="tm-note">
            {w.review_due
              ? `Review due ${date(w.review_due)}`
              : "First review pending"}
          </p>
          <details className="tm-small-details">
            <summary>Account reference</summary>
            <code>{w.user_id}</code>
          </details>
        </div>
        <div className="tm-form">
          <h3>Review & access</h3>
          <label className="tm-check">
            <input
              type="checkbox"
              checked={checks}
              onChange={(e) => setChecks(e.target.checked)}
            />
            <span>
              I completed identity, reference, interview, training and
              confidentiality checks.
            </span>
          </label>
          <label>
            Review record reference
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={300}
              placeholder="Reference to your restricted review record"
            />
          </label>
          <p className="tm-note">
            Keep identity documents in your restricted review records, outside
            survivor cases.
          </p>
          <div className="tm-actions">
            {["probation", "approved"].map((status) => (
              <button
                className={`tm-button ${status === "approved" ? "secondary" : ""}`}
                key={status}
                disabled={busy || !checks || reference.trim().length < 5}
                onClick={() =>
                  void run(() =>
                    supportRpc("vv_review_worker", {
                      p_user: w.user_id,
                      p_status: status,
                      p_checks: checks,
                      p_reference: reference,
                    }),
                  )
                }
              >
                {status === "probation"
                  ? "Start 30-day probation"
                  : "Approve · 90-day review"}
              </button>
            ))}
          </div>
          <div className="tm-actions tm-restrict-actions">
            {["suspended", "rejected"].map((status) => (
              <button
                className="tm-text-button danger"
                key={status}
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    supportRpc("vv_review_worker", {
                      p_user: w.user_id,
                      p_status: status,
                      p_checks: checks,
                      p_reference: reference,
                    }),
                  )
                }
              >
                {status === "suspended"
                  ? "Suspend worker access"
                  : "Reject application"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
function ReportReview({
  report: r,
  busy,
  run,
}: {
  report: Report;
  busy: boolean;
  run: (f: () => Promise<unknown>) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  return (
    <article className="tm-report">
      <div className="tm-report-top">
        <span className="tm-status pending">
          {r.state === "new" ? "New report" : "Under review"}
        </span>
        <span className="tm-muted">Worker {r.worker_id.slice(0, 8)}</span>
      </div>
      <blockquote>{r.reason}</blockquote>
      <p className="tm-note">
        <LockKeyhole size={14} />
        Access to this survivor has been blocked.
      </p>
      <form className="tm-form" onSubmit={(e) => e.preventDefault()}>
        <label>
          Action taken
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            placeholder="Record your investigation and next steps"
            rows={3}
          />
        </label>
        <div className="tm-actions">
          {["reviewing", "closed"].map((state) => (
            <button
              className={`tm-button ${state === "reviewing" ? "secondary" : ""}`}
              key={state}
              disabled={busy || note.trim().length < 5}
              onClick={() =>
                void run(() =>
                  supportRpc("vv_review_report", {
                    p_id: r.id,
                    p_state: state,
                    p_resolution: note,
                  }),
                )
              }
            >
              {state === "reviewing"
                ? "Mark under review"
                : "Close with recorded action"}
            </button>
          ))}
        </div>
      </form>
    </article>
  );
}
function AssignmentAcknowledgments() {
  const [rows, setRows] = useState<
      {
        request_id: string;
        accepted_at: string | null;
        severity: string;
        acknowledge_by: string;
      }[]
    >([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    try {
      setRows(await supportRpc("vv_my_assignments"));
      setLoaded(true);
    } catch (e) {
      setRows([]);
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const pending = rows.filter((r) => !r.accepted_at);
  return (
    <section className="tm-panel">
      <div className="tm-panel-heading">
        <div>
          <h2>Your case assignments</h2>
          <p>
            Confirm you’re available and have no personal connection to anyone
            involved.
          </p>
        </div>
        <span className="tm-section-icon">
          <Inbox size={22} />
        </span>
      </div>
      {!loaded && !error ? (
        <p className="tm-padded tm-loading">
          <Loader2 size={17} className="tm-spin" />
          Checking assignments…
        </p>
      ) : pending.length ? (
        pending.map((r) => (
          <article className="tm-assignment" key={r.request_id}>
            <div>
              <strong>Case {r.request_id.slice(0, 8)}</strong>
              <span
                className={`tm-status ${r.severity === "critical" ? "suspended" : "pending"}`}
              >
                {r.severity}
              </span>
            </div>
            <p>
              Acknowledge by {new Date(r.acknowledge_by).toLocaleTimeString()}
            </p>
            <button
              className="tm-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await supportRpc("vv_accept_case", {
                    p_request_id: r.request_id,
                    p_no_conflict: true,
                  });
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              No conflict · Accept assignment <ArrowRight size={16} />
            </button>
          </article>
        ))
      ) : (
        <Empty icon={Inbox} title="No new assignments">
          Your supervisor will assign cases here when you’re approved and
          available.
        </Empty>
      )}
      {error && (
        <p className="tm-alert" role="alert">
          {error}
        </p>
      )}
      <div className="tm-panel-foot">
        <Link href="/admin/dashboard">
          Open assigned conversations <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}
