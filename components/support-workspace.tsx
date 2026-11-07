"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Shield,
  Inbox,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LogOut,
  MessageSquare,
  Paperclip,
  NotebookPen,
  History,
  UserRoundPlus,
  LockKeyhole,
  ArrowUpRight,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getSupabase, isSupabaseConfigured, signOut } from "@/lib/supabase";
import {
  CaseActivity,
  CaseSummary,
  StaffMember,
  StaffRole,
  getActivity,
  getCase,
  getStaff,
  listCases,
  staffRole,
  supportError,
  supportRpc,
} from "@/lib/support";
import { timeAgo } from "@/shared/support-copy";
import { Comments } from "@/components/comments";
import { EvidencePanel } from "@/components/evidence-panel";
import { useConversationSync } from "@/hooks/useConversationSync";

const statusName = (value: string) =>
  ({
    pending: "Needs response",
    in_progress: "In progress",
    resolved: "Resolved",
    closed: "Closed",
  })[value] || value;
export function SupportWorkspace() {
  const [scope, setScope] = useState("opening");
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setScope(session?.user.id || "signed-out");
    });
    return () => subscription.unsubscribe();
  }, []);
  return <Suspense fallback={<main className="support-app">Loading support workspace…</main>}><WorkspaceSession key={scope} /></Suspense>;
}
function WorkspaceSession() {
  const allowed = useAdminAuth();
  const params = useSearchParams();
  const router = useRouter();
  const selectedId = params.get("id");
  const [role, setRole] = useState<StaffRole>("none");
  const [identity, setIdentity] = useState("Support session");
  const [rows, setRows] = useState<CaseSummary[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [teamOpen, setTeamOpen] = useState(false);
  const [privateView, setPrivateView] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const hide = () => setPrivateView(true);
    const show = () => setPrivateView(document.hidden);
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    document.addEventListener("visibilitychange", show);
    return () => {
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      document.removeEventListener("visibilitychange", show);
    };
  }, []);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    Promise.all([staffRole(), getSupabase().auth.getUser()])
      .then(async ([value, user]) => {
        if (!active) return;
        setRole(value);
        setIdentity(
          `${value === "admin" ? "Supervisor" : "Volunteer"} · ${user.data.user?.id.slice(0, 8) || "session"}`,
        );
        if (value === "admin") {
          const people = await getStaff();
          if (active) setStaff(people);
        }
      })
      .catch((e) => {
        if (active) setError(supportError(e));
      });
    return () => {
      active = false;
    };
  }, [allowed, revision]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true);
    listCases(page, status, term)
      .then((data) => {
        if (active) {
          setRows(data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) {
          setRows([]);
          setError(supportError(e));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowed, page, status, term, revision]);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  const select = (id: string) => {
    setTeamOpen(false);
    router.replace(`/admin/dashboard?id=${encodeURIComponent(id)}`);
  };
  if (!allowed) return null;
  return (
    <main className="support-app">
      <header className="support-topbar">
        <Link className="support-brand" href="/">
          <span>
            <Shield size={20} />
          </span>
          <strong>
            Victim Voice<small>SUPPORT WORKSPACE</small>
          </strong>
        </Link>
        <div className="support-topbar-right">
          <span className="support-session">
            <i />
            {identity}
          </span>
          {role === "admin" && (
            <button
              className="support-secondary-button"
              onClick={() => setTeamOpen(!teamOpen)}
            >
              <UserRoundPlus size={16} /> Team
            </button>
          )}
          <button
            className="support-icon-button"
            aria-label="Sign out"
            onClick={async () => {
              await signOut();
              router.replace("/admin/login");
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <div className="support-private-notice">
        <LockKeyhole size={14} /> A private place to help. Open only the cases
        you need. Contact details stay outside this workspace.
        <span>Access is recorded</span>
      </div>
      <div
        className={`support-layout ${selectedId ? "has-selected-case" : ""}`}
        style={{ visibility: privateView ? "hidden" : "visible" }}
      >
        <aside className="support-inbox" aria-label="Support inbox">
          <div className="support-inbox-heading">
            <div>
              <p className="support-eyebrow">
                {role === "volunteer" ? "Assigned to you" : "Case queue"}
              </p>
              <h1>Support inbox</h1>
            </div>
            <button
              className="support-icon-button"
              onClick={refresh}
              aria-label="Refresh case queue"
            >
              <RefreshCw size={17} />
            </button>
          </div>
          <label className="support-search">
            <Search size={16} />
            <input
              aria-label="Search cases"
              placeholder="Search reference or summary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div
            className="support-filter-chips"
            role="radiogroup"
            aria-label="Show cases"
          >
            {(
              [
                ["", "All"],
                ["pending", "Needs response"],
                ["in_progress", "In progress"],
                ["resolved", "Resolved"],
                ["closed", "Closed"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                role="radio"
                aria-checked={status === value}
                onClick={() => {
                  setStatus(value);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="support-case-list">
            {loading ? (
              <p className="support-loading" role="status">
                Opening the queue…
              </p>
            ) : rows.length ? (
              rows.map((row) => (
                <button
                  className={`support-case-row ${selectedId === row.id ? "is-selected" : ""}`}
                  key={row.id}
                  onClick={() => select(row.id)}
                  aria-current={selectedId === row.id ? "true" : undefined}
                >
                  <span className="support-case-row-top">
                    <span
                      className={`support-priority priority-${row.severity_level}`}
                    >
                      {row.severity_level} priority
                    </span>
                    <time dateTime={row.created_at}>
                      {timeAgo(row.created_at)}
                    </time>
                  </span>
                  <p>{row.description}</p>
                  <span className="support-case-row-bottom">
                    <span className={`support-status status-${row.status}`}>
                      {statusName(row.status)}
                    </span>
                    <span>
                      #{row.id.slice(0, 8).toUpperCase()}
                      <MessageSquare size={12} />
                      {row.message_count || 0}
                      <Paperclip size={12} />
                      {row.evidence_count || 0}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className="support-empty-inline">
                <Inbox />
                <p>No cases here yet.</p>
                <span>
                  {role === "volunteer"
                    ? "A supervisor can assign a case after its owner consents."
                    : "New support requests will appear in this queue."}
                </span>
              </div>
            )}
          </div>
          <div className="support-queue-pagination">
            <button
              className="support-icon-button"
              aria-label="Previous queue page"
              disabled={!page || loading}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <span>Page {page + 1}</span>
            <button
              className="support-icon-button"
              aria-label="Next queue page"
              disabled={rows.length < 25 || loading}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <p className="support-inbox-footer">
            <Shield size={14} /> No bulk exports. Case access is scoped.
          </p>
        </aside>
        {teamOpen && role === "admin" ? (
          <TeamPanel staff={staff} onChanged={refresh} />
        ) : selectedId ? (
          <CaseWorkspace
            key={selectedId}
            id={selectedId}
            role={role}
            staff={staff}
            identity={identity}
            onChanged={refresh}
          />
        ) : (
          <section className="support-welcome">
            <div className="support-welcome-symbol">
              <MessageSquare size={34} />
            </div>
            <p className="support-eyebrow">Listen. Understand. Help.</p>
            <h2>
              One case.
              <br />
              Your full attention.
            </h2>
            <p>
              Choose a request from the inbox to continue a private
              conversation, review shared evidence, and plan the next step.
            </p>
            <div>
              <LockKeyhole size={16} /> Survivors choose what they share.
            </div>
          </section>
        )}
      </div>
      {error && (
        <div className="support-global-error" role="alert">
          {error}
        </div>
      )}
      {privateView && (
        <div className="support-privacy-cover">
          <LockKeyhole size={28} />
          <h2>Workspace hidden</h2>
          <p>Return to this window to continue.</p>
        </div>
      )}
    </main>
  );
}
function CaseWorkspace({
  id,
  role,
  staff,
  identity,
  onChanged,
}: {
  id: string;
  role: StaffRole;
  staff: StaffMember[];
  identity: string;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [row, setRow] = useState<CaseSummary | null>(null);
  const [tab, setTab] = useState<
    "conversation" | "evidence" | "notes" | "events"
  >("conversation");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [revision, setRevision] = useState(0);
  const denied = useRef(false);
  const [accessWarning, setAccessWarning] = useState("");
  const lockCase = useCallback(() => {
    if (denied.current) return;
    denied.current = true;
    setRow(null);
    setError(
      "Your access to this case has changed. Return to the inbox to continue.",
    );
    onChanged();
  }, [onChanged]);
  const checkAccess = useCallback(
    async (signal: AbortSignal) => {
      if (denied.current) return false;
      const result = await getSupabase()
        .rpc("vv_can_work_case", { p_request_id: id })
        .abortSignal(signal);
      if (result.error) throw result.error;
      return result.data === true;
    },
    [id],
  );
  const accessChecked = useCallback(
    (value: boolean) => {
      if (!value) lockCase();
      else setAccessWarning("");
    },
    [lockCase],
  );
  const accessFailed = useCallback(
    () =>
      setAccessWarning(
        "Connection interrupted. Case access will be checked again when connected.",
      ),
    [],
  );
  useConversationSync(checkAccess, accessChecked, accessFailed, lockCase);
  useEffect(() => {
    let active = true;
    getCase(id)
      .then((value) => {
        if (active && !denied.current) {
          setRow(value);
          setError("");
        }
      })
      .catch((e) => {
        if (active) {
          setRow(null);
          setError(supportError(e));
        }
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  async function mutate(name: string, args: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await supportRpc(name, { p_request_id: id, ...args });
      setRevision((v) => v + 1);
      onChanged();
    } catch (e) {
      setError(supportError(e));
    } finally {
      setBusy(false);
    }
  }
  if (!row)
    return (
      <section className="support-loading" role={error ? "alert" : "status"}>
        {error || "Opening case…"}
        {error && (
          <button
            className="support-secondary-button"
            onClick={() => router.replace("/admin/dashboard")}
          >
            Return to inbox
          </button>
        )}
      </section>
    );
  return (
    <>
      <section className="support-case-workspace">
        <header className="support-case-header">
          <button
            className="support-mobile-back support-icon-button"
            aria-label="Back to inbox"
            onClick={() => router.replace("/admin/dashboard")}
          >
            <ChevronLeft />
          </button>
          <div>
            <p className="support-eyebrow">Private support case</p>
            <h2>Case #{id.slice(0, 8).toUpperCase()}</h2>
            <span>
              {row.harassment_type.replaceAll("_", " ")} · Opened{" "}
              {new Date(row.created_at).toLocaleDateString()}
            </span>
          </div>
          <span className={`support-priority priority-${row.severity_level}`}>
            {row.severity_level} priority
          </span>
        </header>
        <nav className="support-case-tabs" aria-label="Case sections">
          {(
            [
              {
                key: "conversation",
                label: "Conversation",
                icon: MessageSquare,
              },
              { key: "evidence", label: "Evidence", icon: Paperclip },
              { key: "notes", label: "Case notes", icon: NotebookPen },
              { key: "events", label: "Activity", icon: History },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              aria-current={tab === item.key ? "page" : undefined}
              onClick={() => setTab(item.key)}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
        <div
          className={`support-case-body ${tab === "conversation" ? "is-conversation" : ""}`}
        >
          {accessWarning && (
            <p role="status" className="support-helper">
              {accessWarning}
            </p>
          )}
          {error && (
            <p role="alert" className="support-error">
              {error}
            </p>
          )}
          <details className="support-mobile-details">
            <summary>Case status & assigned team</summary>
            <label>
              Case status
              <select
                disabled={busy}
                value={row.status}
                onChange={(e) =>
                  mutate("vv_set_case_status", { p_status: e.target.value })
                }
              >
                <option value="pending">Needs response</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <p className="support-helper">
              {row.team?.map((p) => p.display_name).join(", ") ||
                "Supervisor support only."}
            </p>
            <p className="support-helper">
              {row.allow_volunteer_support
                ? "Volunteer support allowed by the owner."
                : "Volunteer access is off."}
            </p>
            {role === "admin" && (
              <>
                <label>
                  Approved volunteer
                  <select
                    value={assignee}
                    disabled={!row.allow_volunteer_support || busy}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">Choose a team member</option>
                    {staff
                      .filter((p) => p.enabled)
                      .map((p) => (
                        <option key={p.user_id} value={p.user_id}>
                          {p.display_name}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  className="support-secondary-button"
                  disabled={!assignee || !row.allow_volunteer_support || busy}
                  onClick={() =>
                    mutate("vv_assign_case", {
                      p_user_id: assignee,
                      p_active: true,
                    })
                  }
                >
                  Assign to case
                </button>
                {row.team?.map((p) => (
                  <button
                    className="support-text-button"
                    disabled={busy}
                    key={p.user_id}
                    onClick={() =>
                      mutate("vv_assign_case", {
                        p_user_id: p.user_id,
                        p_active: false,
                      })
                    }
                  >
                    Remove {p.display_name}
                  </button>
                ))}
              </>
            )}
          </details>
          {tab === "conversation" ? (
            <>
              <details className="support-original-account" open>
                <summary>Survivor’s first message</summary>
                <p className="support-account-text">{row.description}</p>
              </details>
              <Comments
                key={id}
                requestId={id}
                staff
                onSent={() => {
                  // A reply means the case is being worked; spare staff a manual status change.
                  if (row.status === "pending")
                    void mutate("vv_set_case_status", {
                      p_status: "in_progress",
                    });
                }}
              />
            </>
          ) : tab === "evidence" ? (
            <EvidencePanel
              key={id}
              requestId={id}
              reviewer
              watermark={identity}
            />
          ) : (
            <CaseActivityPanel key={`${id}:${tab}`} id={id} kind={tab} />
          )}
        </div>
        <footer className="support-case-footer">
          <Shield size={13} />
          {identity} · #{id.slice(0, 8)} · Keep case information in this
          workspace.
        </footer>
      </section>
      <aside className="support-context" aria-label="Case details">
        <p className="support-eyebrow">Case overview</p>
        <h3>Make the next step clear.</h3>
        <label>
          Case status
          <select
            disabled={busy}
            value={row.status}
            onChange={(e) =>
              mutate("vv_set_case_status", { p_status: e.target.value })
            }
          >
            <option value="pending">Needs response</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <div className="support-context-section">
          <h4>Assigned team</h4>
          {row.team?.length ? (
            row.team.map((person) => (
              <div className="support-team-person" key={person.user_id}>
                <span className="support-avatar">{person.display_name[0]}</span>
                <span>
                  {person.display_name}
                  <small>Approved volunteer</small>
                </span>
                {role === "admin" && (
                  <button
                    aria-label={`Remove ${person.display_name}`}
                    disabled={busy}
                    onClick={() =>
                      mutate("vv_assign_case", {
                        p_user_id: person.user_id,
                        p_active: false,
                      })
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="support-helper">Supervisor support only.</p>
          )}
          <p className="support-consent">
            <LockKeyhole size={14} />
            {row.allow_volunteer_support
              ? "Owner allows assigned volunteers."
              : "Owner has not enabled volunteer support."}
          </p>
          {role === "admin" && (
            <>
              <label>
                Assign an approved volunteer
                <select
                  value={assignee}
                  disabled={!row.allow_volunteer_support || busy}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  <option value="">Choose a team member</option>
                  {staff
                    .filter(
                      (p) =>
                        p.enabled &&
                        !row.team?.some((a) => a.user_id === p.user_id),
                    )
                    .map((p) => (
                      <option key={p.user_id} value={p.user_id}>
                        {p.display_name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="support-secondary-button"
                disabled={!assignee || !row.allow_volunteer_support || busy}
                onClick={() =>
                  mutate("vv_assign_case", {
                    p_user_id: assignee,
                    p_active: true,
                  })
                }
              >
                <UserRoundPlus size={15} /> Assign to case
              </button>
            </>
          )}
        </div>
        <div className="support-context-section">
          <h4>Working with care</h4>
          <ul>
            <li>Ask before suggesting a next step.</li>
            <li>Keep facts separate from assumptions.</li>
            <li>
              Use case notes for investigation; replies go to the survivor.
            </li>
            <li>
              Do not contact people outside this case or copy evidence
              elsewhere.
            </li>
          </ul>
        </div>
        <div className="support-context-bottom">
          <Shield size={22} />
          <strong>Minimum access. Human support.</strong>
          <p>
            Personal contact details are hidden. Evidence access and team
            actions are recorded. Browser screenshots cannot be blocked.
          </p>
        </div>
      </aside>
    </>
  );
}
function CaseActivityPanel({
  id,
  kind,
}: {
  id: string;
  kind: "notes" | "events";
}) {
  const [rows, setRows] = useState<CaseActivity[]>([]);
  const [page, setPage] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    getActivity(id, kind, page)
      .then((value) => {
        if (active) {
          setRows(value);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(supportError(e));
      });
    return () => {
      active = false;
    };
  }, [id, kind, page, revision]);
  return (
    <section>
      <div className="support-section-heading">
        <div>
          <p className="support-eyebrow">
            {kind === "notes"
              ? "For the assigned support team"
              : "Recorded case actions"}
          </p>
          <h3>{kind === "notes" ? "Investigation notes" : "Case activity"}</h3>
        </div>
        <button
          className="support-text-button"
          onClick={() => setRevision((v) => v + 1)}
        >
          Refresh
        </button>
      </div>
      {kind === "notes" && (
        <p className="support-helper">
          Internal notes are not sent to the survivor. Record observations, open
          questions and agreed follow-ups. Submitted notes are append-only.
        </p>
      )}
      {error && (
        <p role="alert" className="support-error">
          {error}
        </p>
      )}
      <div className="support-activity">
        {rows.map((row) => (
          <article key={row.id}>
            <span className="support-activity-dot" />
            <div>
              <strong>{row.author_name || row.actor_name}</strong>
              <time>{new Date(row.created_at).toLocaleString()}</time>
              {row.content ? (
                <p>{row.content}</p>
              ) : (
                <p>{row.action?.replaceAll("_", " ")}</p>
              )}
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <p className="support-helper">
          No {kind === "notes" ? "internal notes" : "recorded actions"} on this
          page.
        </p>
      )}
      <div className="support-history-pagination">
        <button disabled={!page} onClick={() => setPage(page - 1)}>
          Newer
        </button>
        <span>Page {page + 1}</span>
        <button disabled={rows.length < 30} onClick={() => setPage(page + 1)}>
          Older
        </button>
      </div>
      {kind === "notes" && (
        <form
          className="support-note-composer"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || !text.trim()) return;
            setBusy(true);
            try {
              await supportRpc("vv_add_case_note", {
                p_request_id: id,
                p_content: text.trim(),
              });
              setText("");
              setPage(0);
              setRevision((v) => v + 1);
            } catch (err) {
              setError(supportError(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="case-note">Add an internal note</label>
          <textarea
            id="case-note"
            value={text}
            maxLength={8000}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you observe? What needs follow-up?"
            required
          />
          <button
            className="support-primary-button"
            disabled={busy || !text.trim()}
          >
            {busy ? "Saving…" : "Save internal note"}
          </button>
        </form>
      )}
    </section>
  );
}
function TeamPanel({
  staff,
  onChanged,
}: {
  staff: StaffMember[];
  onChanged: () => void;
}) {
  const [uid, setUid] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(user: string, displayName: string, enabled: boolean) {
    setBusy(true);
    setError("");
    try {
      await supportRpc("vv_set_volunteer", {
        p_user_id: user,
        p_display_name: displayName,
        p_enabled: enabled,
      });
      setUid("");
      setName("");
      onChanged();
    } catch (e) {
      setError(supportError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="support-team-panel">
      <p className="support-eyebrow">Supervisor controls</p>
      <h2>A team you can account for.</h2>
      <p>
        Approve a volunteer only after identity checks and training outside this
        prototype. Approval alone grants no case access; assignment and survivor
        consent are also required.
      </p>
      {error && (
        <p className="support-error" role="alert">
          {error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(uid, name, true);
        }}
      >
        <label>
          Existing account’s Supabase User UID
          <input
            required
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="Their account must already exist"
            pattern="[0-9a-fA-F-]{36}"
          />
        </label>
        <label>
          Support display name
          <input
            value={name}
            required
            minLength={2}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name shown to survivors"
          />
        </label>
        <button className="support-primary-button" disabled={busy}>
          Approve support access <ArrowUpRight size={16} />
        </button>
      </form>
      <div className="support-team-directory">
        {staff.map((person) => (
          <article key={person.user_id}>
            <span className="support-avatar">{person.display_name[0]}</span>
            <div>
              <strong>{person.display_name}</strong>
              <small>
                {person.enabled
                  ? "Approved · case assignment required"
                  : "Access suspended"}
              </small>
            </div>
            <button
              className="support-secondary-button"
              disabled={busy}
              onClick={() =>
                save(person.user_id, person.display_name, !person.enabled)
              }
            >
              {person.enabled ? "Suspend access" : "Re-enable"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
