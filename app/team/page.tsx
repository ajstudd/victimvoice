"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  reassignment_requests?:{request_id:string;created_at:string}[];
  access_review?: { actor_id: string; evidence_opens: number }[];
};
export default function Team() {
  const [user, setUser] = useState<string | null>(null),
    [admin, setAdmin] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await getSupabase().auth.getUser();
      const role = await getSupabase().rpc("is_admin");
      if (active) {
        setUser(data.user?.id || null);
        setAdmin(role.data === true);
        setLoading(false);
      }
    };
    void load();
    const { data: subscription } = getSupabase().auth.onAuthStateChange(() => {
      setLoading(true);
      setTimeout(() => void load(), 0);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);
  return (
    <main className="team-page">
      <header>
        <h1>Team enrollment & supervision</h1>
        <nav>
          <Link href="/admin/dashboard">Support inbox</Link> ·{" "}
          <Link href="/admin/emergency">Emergency desk</Link>
        </nav>
      </header>
      {loading ? (
        <p>Opening your account…</p>
      ) : !user ? (
        <section className="team-card">
          <p>Sign in with the account your invitation was issued for.</p>
          <Link
            href="/login"
            onClick={() =>
              sessionStorage.setItem("vv-login-destination", "/team")
            }
          >
            Sign in
          </Link>
          <p>After signing in, return to this page.</p>
        </section>
      ) : (
        <>
          <p>
            Your account reference: <code>{user}</code>
          </p>
          <p>
            Share this reference with your recruiting supervisor. An invitation
            does not grant access to cases or locations.
          </p>
          <StaffMfa key={user}>
            <TeamConsole admin={admin} />
          </StaffMfa>
        </>
      )}
    </main>
  );
}
function TeamConsole({ admin }: { admin: boolean }) {
  const [data, setData] = useState<Console>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [invite, setInvite] = useState(""),
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
      if(document.hidden){setData({});return;}
      const next=await supportRpc<Console>("vv_worker_console");if(!document.hidden)setData(next);
      setError("");
    } catch (e) {
      setData({});
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30000);
    const clear = () => {
      if (document.hidden) setData({});
      else void load();
    };
    document.addEventListener("visibilitychange", clear);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", clear);
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
  return (
    <div className="team-grid">
      {error && <p role="alert">{error}</p>}
      {admin ? (
        <>
          <section className="team-card">
            <h2>Invite an existing account</h2>
            <p>
              Invite people recruited through your own team or a known partner.
              The code is account-bound, expires in seven days and can be used
              once.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () =>
                  setInvite(
                    await supportRpc<string>("vv_create_worker_invite", {
                      p_account: account,
                      p_role: role,
                      p_region: region,
                    }),
                  ),
                );
              }}
            >
              <label>
                Account reference
                <input
                  required
                  pattern="[0-9a-fA-F-]{36}"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                />
              </label>
              <label>
                Role
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="support_volunteer">Support volunteer</option>
                  <option value="case_worker">Employed case worker</option>
                  <option value="emergency_responder">
                    Emergency responder
                  </option>
                </select>
              </label>
              <label>
                Service area
                <select
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
              <button disabled={busy}>Create invitation</button>
            </form>
            {invite && (
              <>
                <p>
                  Give this code privately to the invited person. It is only
                  shown now; nothing has been sent.
                </p>
                <code style={{ overflowWrap: "anywhere" }}>{invite}</code>
                <button onClick={() => setInvite("")}>Hide code</button>
              </>
            )}
          </section>
          <section className="team-card">
            <h2>Outstanding invitations</h2>
            {data.invites?.map((i) => (
              <article key={i.id}>
                <p>
                  {i.account_id} · {i.role.replaceAll("_", " ")} · {i.region}
                </p>
                <p>Expires {new Date(i.expires_at).toLocaleString()}</p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      supportRpc("vv_revoke_worker_invite", { p_id: i.id }),
                    )
                  }
                >
                  Revoke invitation
                </button>
              </article>
            ))}
            <h2>Review and supervise</h2>
            <p>
              Review checks must be performed outside the app. Do not upload
              identity documents into survivor evidence.
            </p>
            {data.workers?.length ? (
              data.workers.map((w) => (
                <WorkerReview
                  key={w.user_id}
                  worker={w}
                  busy={busy}
                  run={run}
                />
              ))
            ) : (
              <p>No invited applications yet.</p>
            )}
          </section>
          <section className="team-card">
            <h2>Needs a supervisor</h2>
            <h3>Reassignment requested</h3>{data.reassignment_requests?.map(r=><p key={r.request_id}><Link href={`/admin/dashboard?id=${r.request_id}`}>Case {r.request_id.slice(0,8)}</Link></p>)}
            <h3>Unacknowledged or expired assignments</h3>
            {data.overdue_cases?.map((a) => (
              <p key={`${a.request_id}${a.user_id}`}>
                <Link href={`/admin/dashboard?id=${a.request_id}`}>
                  Case {a.request_id.slice(0, 8)}
                </Link>{" "}
                · worker {a.user_id.slice(0, 8)}
              </p>
            ))}
            <h3>Emergency requests without assigned help</h3>
            <p>
              Offers and notification tickets do not confirm that someone is
              coming.
            </p>
            {data.overdue_sos?.map((e) => (
              <p key={e.id}>
                <Link href="/admin/emergency">
                  {e.region_id} · {e.id.slice(0, 8)}
                </Link>
              </p>
            ))}
            <h3>Access patterns to review</h3>
            {data.access_review?.map((a) => (
              <p key={a.actor_id}>
                {a.actor_id} · {a.evidence_opens} evidence opens in the last
                hour. Check the case audit before deciding on action.
              </p>
            ))}
          </section>
          <section className="team-card">
            <h2>Private safety reports</h2>
            {data.reports?.length ? (
              data.reports.map((r) => (
                <ReportReview key={r.id} report={r} busy={busy} run={run} />
              ))
            ) : (
              <p>No open reports.</p>
            )}
          </section>
        </>
      ) : !data.profile ? (
        <section className="team-card">
          <h2>Use your invitation</h2>
          <p>
            Your supervisor will review your application and arrange checks and
            training before granting access.
          </p>
          <form
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
              ["Invitation code", token, setToken, 100],
              ["Display name", name, setName, 80],
              ["Organisation", org, setOrg, 120],
              ["Languages", languages, setLanguages, 250],
              ["Relevant skills", skills, setSkills, 500],
            ].map(([label, value, set, max]) => (
              <label key={String(label)}>
                {String(label)}
                <input
                  required
                  minLength={2}
                  maxLength={Number(max)}
                  value={String(value)}
                  onChange={(e) => (set as (s: string) => void)(e.target.value)}
                />
              </label>
            ))}
            <button disabled={busy}>Submit for review</button>
          </form>
        </section>
      ) : (
        <section className="team-card">
          <h2>{data.profile.display_name}</h2>
          <p>
            {data.profile.organisation} ·{" "}
            {data.profile.requested_role.replaceAll("_", " ")} ·{" "}
            {data.profile.status}
          </p>
          <p>
            Review due:{" "}
            {data.profile.review_due
              ? new Date(data.profile.review_due).toLocaleDateString()
              : "Awaiting review"}
          </p>
          <p>
            Available until:{" "}
            {data.profile.available_until
              ? new Date(data.profile.available_until).toLocaleTimeString()
              : "Off duty for new case assignments"}
          </p>
          <button
            disabled={busy}
            onClick={() =>
              void run(() =>
                supportRpc("vv_worker_availability", { p_on: true }),
              )
            }
          >
            Available for cases · 4 hours
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void run(() =>
                supportRpc("vv_worker_availability", { p_on: false }),
              )
            }
          >
            Stop new case assignments
          </button>
          <p>
            Emergency availability is separate. Use Emergency responder in the
            phone app.
          </p>
        </section>
      )}
      <AssignmentAcknowledgments />
    </div>
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
    <article className="team-entry">
      <h3>{w.display_name}</h3>
      <p>
        {w.organisation} · {w.region} · {w.requested_role.replaceAll("_", " ")}{" "}
        · {w.status}
      </p>
      <p>
        Languages: {w.languages}. Skills: {w.skills}
      </p>
      <p>
        Account: <code>{w.user_id}</code>
      </p>
      <label>
        <input
          type="checkbox"
          checked={checks}
          onChange={(e) => setChecks(e.target.checked)}
        />
        I completed identity, reference, interview, training and confidentiality
        checks.
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
      {["probation", "approved", "suspended", "rejected"].map((status) => (
        <button
          key={status}
          disabled={
            busy ||
            (["probation", "approved"].includes(status) &&
              (!checks || reference.trim().length < 5))
          }
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
            : status === "approved"
              ? "Approve · review in 90 days"
              : status === "suspended"
                ? "Suspend all worker access"
                : "Reject application"}
        </button>
      ))}
    </article>
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
    <article className="team-entry">
      <p>{r.reason}</p>
      <p>
        Worker: {r.worker_id} · {r.state}. Access to this survivor has been
        blocked.
      </p>
      <label>
        Action taken
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
        />
      </label>
      {["reviewing", "closed"].map((state) => (
        <button
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
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setRows(await supportRpc("vv_my_assignments"));
    } catch (e) {
      setRows([]);
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="team-card">
      <h2>Your case assignments</h2>
      <p>
        Acknowledge only if you have no personal connection or conflict with
        anyone involved. If unsure, ask your supervisor before accepting.
      </p>
      {rows
        .filter((r) => !r.accepted_at)
        .map((r) => (
          <article key={r.request_id}>
            <p>
              {r.request_id.slice(0, 8)} · {r.severity} · acknowledge by{" "}
              {new Date(r.acknowledge_by).toLocaleTimeString()}
            </p>
            <button
              onClick={async () => {
                try {
                  await supportRpc("vv_accept_case", {
                    p_request_id: r.request_id,
                    p_no_conflict: true,
                  });
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              No conflict · Accept assignment
            </button>
          </article>
        ))}
      {error && <p role="alert">{error}</p>}
      <Link href="/admin/dashboard">Open assigned conversations</Link>
    </section>
  );
}
