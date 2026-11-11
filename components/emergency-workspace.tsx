"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileJson,
  Flag,
  Inbox,
  Loader2,
  LockKeyhole,
  Map,
  MapPin,
  MessageSquare,
  Radio,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { StaffMfa } from "@/components/staff-mfa";
import { StaffWorkspaceShell } from "@/components/staff-workspace-shell";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { IncidentChat } from "./incident-chat";
import { PurposeAccess } from "./purpose-access";
import { workforceLabel, type WorkforceContext } from "@/lib/workforce";
import { useConversationSync } from "@/hooks/useConversationSync";
import { PILOT_REGIONS } from "@/shared/sos";
type Incident = {
  id: string;
  created_at: string;
  status: string;
  region_id: string | null;
  routing: string;
};
type Team = {
  user_id: string;
  display_name: string;
  region_id: string;
  approved: boolean;
  kind: string;
  agency_id: string | null;
  duty_until?: string | null;
};
type Area = {
  id: string;
  name: string;
  region_id?: string;
  scope?: string;
  source_url?: string;
  boundary_source?: string;
  verified_at?: string | null;
  enabled?: boolean;
  volunteer_enabled?: boolean;
  geometry?: { type: string; coordinates: number[][][][] } | null;
};
type DispatchMember = {
  user_id: string;
  display_name: string;
  organisation: string;
  accepted_at: string | null;
  access_until: string | null;
  response_state?: string;
  check_in_at?: string;
};
type Review = {
  user_id: string;
  organisation: string;
  requested_role: string;
  status: string;
  review_due: string | null;
  identity_checked: boolean;
  reference_checked: boolean;
  interview_checked: boolean;
  training_checked: boolean;
  confidentiality_checked: boolean;
};
type RecordView = Incident & {
  alias: string | null;
  callback: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  expires_at: string;
  details_allowed: boolean;
  chat_allowed?: boolean;
  recipients: { id: string; name: string; state: string }[] | null;
  accepted: number;
  offers: number;
};
type Coverage = { regions: Area[]; agencies: Area[] };
type Capabilities = { push: boolean; relay: boolean } | null;
type DeskAlert = { id: string; region_id: string };
type Payload = {
  alerts: DeskAlert[];
  helperAlerts: DeskAlert[];
  role: string;
  rows: Incident[];
  members: Team[];
  map: Coverage;
  reviews: Review[];
  detail: RecordView | null;
  dispatch: DispatchMember[];
  cap: Capabilities;
  checkedAt: number;
};
type Mutate = (name: string, args: Record<string, unknown>) => Promise<unknown>;
const areaName = (s: string | null) =>
  PILOT_REGIONS.find((r) => r.id === s)?.name || s || "Area unavailable";
const time = (s: string) =>
  new Date(s).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const routeCopy = (s: string) =>
  ({
    not_requested: "Not requested",
    location_unavailable: "Location unavailable",
    no_verified_route: "No verified route",
    offered: "Offered to receiving team",
    no_on_duty_recipient: "No on-duty recipient",
    ambiguous_jurisdiction: "Jurisdiction needs review",
  })[s] || s.replaceAll("_", " ");
const deliveryCopy = (s: string) =>
  ({
    ready: "Not attempted",
    pending: "Pending",
    submitted: "Submitted to phone",
    sent: "Sent from phone",
    delivered: "Delivery reported",
    failed: "Phone send failed",
    unknown: "Not confirmed",
    unavailable: "SIM unavailable",
    relay_claimed: "Backup sending",
    relay_accepted: "Accepted by messaging provider",
    relay_failed: "Backup failed",
    relay_unknown: "Backup not confirmed",
    relay_delivered: "Backup delivery reported",
  })[s] || s.replaceAll("_", " ");
function Empty({
  title,
  text,
  icon: Icon = Inbox,
}: {
  title: string;
  text: string;
  icon?: typeof Inbox;
}) {
  return (
    <div className="tm-empty">
      <span>
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function EmergencyWorkspace() {
  const [scope, setScope] = useState("opening"),
    [role, setRole] = useState<string | null>(null),
    [responder, setResponder] = useState(false);
  const identify = useCallback((name: string | null, isResponder = false) => {
    setRole(name);
    setResponder(isResponder);
  }, []);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void getSupabase()
      .auth.getSession()
      .then((r) => setScope(r.data.session?.user.id || "signed-out"));
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setScope(session?.user.id || "signed-out");
      setRole(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <StaffWorkspaceShell
      active="emergency"
      role={role || "Connecting"}
      mode={responder ? "responder" : "staff"}
    >
      <StaffMfa key={scope}>
        <Session onRole={identify} />
      </StaffMfa>
    </StaffWorkspaceShell>
  );
}
function Session({
  onRole,
}: {
  onRole: (role: string | null, responder?: boolean) => void;
}) {
  const [role, setRole] = useState<string | null>(null),
    [root, setRoot] = useState(false),
    [alerts, setAlerts] = useState<DeskAlert[]>([]),
    [helperAlerts, setHelperAlerts] = useState<DeskAlert[]>([]),
    [incidents, setIncidents] = useState<Incident[]>([]),
    [team, setTeam] = useState<Team[]>([]),
    [areas, setAreas] = useState<Coverage>({ regions: [], agencies: [] }),
    [reviews, setReviews] = useState<Review[]>([]),
    [dispatch, setDispatch] = useState<DispatchMember[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [record, setRecord] = useState<RecordView | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [hidden, setHidden] = useState(false),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [tab, setTab] = useState("requests"),
    [query, setQuery] = useState(""),
    [regionFilter, setRegionFilter] = useState("all"),
    [statusFilter, setStatusFilter] = useState("active"),
    [cap, setCap] = useState<Capabilities>(null),
    [checkedAt, setCheckedAt] = useState(() => Date.now());
  const mutation = useRef(false);
  useEffect(() => {
    const conceal = () => {
      setHidden(true);
      setRecord(null);
      setDispatch([]);
    };
    const show = () => {
      if (document.hidden) conceal();
      else setHidden(false);
    };
    window.addEventListener("blur", conceal);
    window.addEventListener("focus", show);
    document.addEventListener("visibilitychange", show);
    return () => {
      window.removeEventListener("blur", conceal);
      window.removeEventListener("focus", show);
      document.removeEventListener("visibilitychange", show);
    };
  }, []);
  const load = useCallback(
    async (signal: AbortSignal): Promise<Payload> => {
      if (!isSupabaseConfigured)
        throw Error("Sign-in is unavailable. Please try again later.");
      const client = getSupabase();
      const rr = await client.rpc("vv_sos_role").abortSignal(signal);
      if (rr.error) throw rr.error;
      const role = rr.data || "none";
      const context = await client.rpc("vv2_context").abortSignal(signal);
      if (context.error) throw context.error;
      setRoot(context.data.role === "superadmin");
      onRole(
        context.data.role === "volunteer" &&
          ["volunteer", "police"].includes(role)
          ? "Approved responder"
          : workforceLabel(context.data.role),
        ["volunteer", "police"].includes(role),
      );
      let members: Team[] = [],
        map: Coverage = { regions: [], agencies: [] },
        reviews: Review[] = [],
        detail: RecordView | null = null,
        dispatch: DispatchMember[] = [],
        rows: Incident[] = [];
      let alerts: DeskAlert[] = [],
        helperAlerts: DeskAlert[] = [];
      let cap: Capabilities = null;
      if (["admin", "volunteer", "police"].includes(role)) {
        const list = await client.rpc("vv_sos_list").abortSignal(signal);
        if (list.error) throw list.error;
        rows = list.data || [];
        if (role === "admin") {
          const [a, b, c] = await Promise.all([
            client.rpc("vv_sos_team").abortSignal(signal),
            client.rpc("vv_sos_areas").abortSignal(signal),
            client.rpc("vv_worker_console").abortSignal(signal),
          ]);
          if (a.error || b.error || c.error)
            throw a.error || b.error || c.error;
          members = a.data || [];
          map = b.data || map;
          reviews = c.data?.workers || [];
          alerts = c.data?.overdue_sos || [];
          helperAlerts = c.data?.helper_alerts || [];
        }
        if (selected) {
          const a = await client
            .rpc("vv_sos_read", { p_id: selected })
            .abortSignal(signal);
          if (a.error) throw a.error;
          detail = a.data;
          if (role === "admin") {
            const b = await client
              .rpc("vv_dispatch_team", { p_event: selected })
              .abortSignal(signal);
            if (b.error) throw b.error;
            dispatch = b.data || [];
          }
        }
        try {
          const response = await fetch(
            process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/sos",
            { signal },
          );
          if (response.ok) {
            const value = await response.json();
            if (
              typeof value.push === "boolean" &&
              typeof value.relay === "boolean"
            )
              cap = { push: value.push, relay: value.relay };
          }
        } catch {
          if (signal.aborted) throw Error("Request cancelled");
        }
      }
      return {
        alerts,
        helperAlerts,
        role,
        rows,
        members,
        map,
        reviews,
        detail,
        dispatch,
        cap,
        checkedAt: Date.now(),
      };
    },
    [selected, onRole],
  );
  const receive = useCallback((r: Payload) => {
    setRole(r.role);
    setAlerts(r.alerts);
    setHelperAlerts(r.helperAlerts);

    setIncidents(r.rows);
    setTeam(r.members);
    setAreas(r.map);
    setReviews(r.reviews);
    setRecord(r.detail);
    setDispatch(r.dispatch);
    setCap(r.cap);
    setCheckedAt(r.checkedAt);
    setLoaded(true);
    setError("");
  }, []);
  const failed = useCallback((e: unknown) => {
    setRecord(null);
    setSelected(null);
    setDispatch([]);
    setIncidents([]);
    setTeam([]);
    setAreas({ regions: [], agencies: [] });
    setReviews([]);
    setLoaded(false);
    setCap(null);
    setError((e as Error).message);
  }, []);
  const changed = useCallback(() => {
    setRecord(null);
    setIncidents([]);
    setDispatch([]);
    setTeam([]);
    setAreas({ regions: [], agencies: [] });
    setReviews([]);
    setRole(null);
    setLoaded(false);
    setNotice("");
    onRole(null);
  }, [onRole]);
  const refresh = useConversationSync(load, receive, failed, changed);
  async function run(name: string, args: Record<string, unknown>) {
    if (mutation.current)
      throw Error("Please wait for the current change to finish.");
    mutation.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await getSupabase().rpc(name, args);
      if (r.error) throw r.error;
      setNotice(
        name === "vv_sos_close"
          ? "Request marked resolved."
          : name === "vv_dispatch_responder"
            ? args.p_allow
              ? "Location access assigned. This does not confirm arrival."
              : "Location access revoked."
            : name === "vv_sos_read"
              ? "Private incident access opened."
              : "Reviewed boundary saved.",
      );
      refresh();
      return r.data;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  function choose(id: string | null) {
    setRecord(null);
    setDispatch([]);
    setNotice("");
    setSelected(id);
  }
  const visible = incidents.filter(
    (i) =>
      (regionFilter === "all" || i.region_id === regionFilter) &&
      (statusFilter === "all" || i.status === statusFilter) &&
      `${i.id} ${areaName(i.region_id)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const active = incidents.filter((i) => i.status === "active").length;
  const reviewed = areas.regions.filter(
    (a) => a.volunteer_enabled && a.geometry,
  ).length;
  return (
    <>
      <div className="tm-page-heading">
        <div>
          <span className="tm-eyebrow">RESPONSE & COORDINATION</span>
          <h1>Emergency desk</h1>
          <p>
            {role === "admin"
              ? "Review safety requests, coordinate responders and manage service areas."
              : "View your authorized offers, acknowledge availability and follow your coordinator’s assignments."}
          </p>
        </div>
        <button
          className="tm-button secondary"
          onClick={refresh}
          disabled={busy}
        >
          <RefreshCw size={16} />
          Refresh desk
        </button>
      </div>
      {error && (
        <p className="tm-alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="ed-success" role="status">
          <CheckCircle2 size={17} />
          {notice}
          <button
            className="tm-icon-button"
            aria-label="Dismiss update"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </p>
      )}
      {!hidden &&
        role === "admin" &&
        (alerts.length > 0 || helperAlerts.length > 0) && (
          <section className="tm-alert" role="status">
            <strong>Needs coordinator attention</strong>
            {helperAlerts.map((a) => (
              <p key={"helper" + a.id}>
                <button className="tm-text-button" onClick={() => choose(a.id)}>
                  Helper reported an unsafe assignment · {areaName(a.region_id)}{" "}
                  · #{a.id.slice(0, 8)}
                </button>
              </p>
            ))}
            {alerts.map((a) => (
              <p key={a.id}>
                <button className="tm-text-button" onClick={() => choose(a.id)}>
                  No eligible responder currently dispatched ·{" "}
                  {areaName(a.region_id)} · #{a.id.slice(0, 8)}
                </button>
              </p>
            ))}
            <p>
              This desk must be staffed. No external escalation notification is
              guaranteed.
            </p>
          </section>
        )}
      {hidden ? (
        <section className="tm-panel">
          <Empty
            icon={LockKeyhole}
            title="Private workspace hidden"
            text="Return to this window to recheck access and continue."
          />
        </section>
      ) : !loaded ? (
        <section className="tm-panel">
          <p className="tm-loading tm-padded">
            <Loader2 size={20} className="tm-spin" />
            {error
              ? "Could not open the desk. Refresh to try again."
              : "Opening authorized requests…"}
          </p>
        </section>
      ) : !["admin", "volunteer", "police"].includes(role || "") ? (
        <section className="tm-panel">
          <Empty
            icon={Shield}
            title="Emergency access needs approval"
            text="An app account does not grant responder or supervisor access. Complete enrollment and review with your team."
          />
          <div className="tm-panel-foot">
            <Link href="/join">
              Accept a staff invitation <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className={`ed-availability ${cap?.push ? "enabled" : ""}`}>
            <span className="ed-availability-icon">
              <Radio size={19} />
            </span>
            <div>
              <strong>
                {cap?.push === false
                  ? "Nearby push is not enabled"
                  : cap?.push === true
                    ? "Responder push is enabled"
                    : "Notification status is unavailable"}
              </strong>
              <p>
                {cap?.push === false
                  ? "Offers do not reach phones by push yet. Coordinate through your agreed response channels."
                  : cap?.push === true
                    ? "Notifications are best effort. Confirm acknowledgement and responsibility before dispatch."
                    : "Confirm notification availability before relying on this desk. Refresh to check again."}
              </p>
            </div>
            <span className="ed-channel-state">
              <span />
              {cap?.push === true
                ? "Enabled"
                : cap?.push === false
                  ? "Not enabled"
                  : "Not confirmed"}
            </span>
          </div>
          {role === "admin" && (
            <div className="tm-stats ed-stats">
              <div>
                <span className="tm-stat-icon green">
                  <Activity size={20} />
                </span>
                <div>
                  <strong>{active}</strong>
                  <span>Active requests in view</span>
                </div>
              </div>
              <div>
                <span className="tm-stat-icon amber">
                  <Users size={20} />
                </span>
                <div>
                  <strong>{team.filter((t) => t.approved).length}</strong>
                  <span>
                    {role === "admin"
                      ? "Approved responder accounts"
                      : "Scoped responder access"}
                  </span>
                </div>
              </div>
              <div>
                <span className="tm-stat-icon purple">
                  <MapPin size={20} />
                </span>
                <div>
                  <strong>{role === "admin" ? reviewed : "—"}</strong>
                  <span>Areas with matching enabled</span>
                </div>
              </div>
            </div>
          )}
          {role === "admin" && (
            <div
              className="tm-tabs"
              role="tablist"
              aria-label="Emergency desk views"
            >
              {[
                ["requests", "Safety requests", incidents.length],
                ["responders", "Responders", team.length],
                ["coverage", "Service areas", areas.regions.length],
              ].map(([id, label, count]) => (
                <button
                  key={id}
                  id={`emergency-tab-${id}`}
                  role="tab"
                  tabIndex={tab === id ? 0 : -1}
                  aria-controls={`emergency-panel-${id}`}
                  aria-selected={tab === id}
                  onClick={() => setTab(String(id))}
                  onKeyDown={(e) => {
                    const ids = ["requests", "responders", "coverage"];
                    const current = ids.indexOf(String(id));
                    const next =
                      e.key === "ArrowRight"
                        ? (current + 1) % 3
                        : e.key === "ArrowLeft"
                          ? (current + 2) % 3
                          : e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? 2
                              : -1;
                    if (next >= 0) {
                      e.preventDefault();
                      setTab(ids[next]);
                      document
                        .getElementById(`emergency-tab-${ids[next]}`)
                        ?.focus();
                    }
                  }}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
          )}
          <section
            id={`emergency-panel-${tab}`}
            role={role === "admin" ? "tabpanel" : undefined}
            aria-labelledby={
              role === "admin" ? `emergency-tab-${tab}` : undefined
            }
          >
            {tab === "requests" && (
              <div className={`ed-desk ${selected ? "has-selection" : ""}`}>
                <section className="tm-panel ed-request-list">
                  <div className="tm-panel-heading">
                    <div>
                      <h2>Safety requests</h2>
                      <p>Recent requests you’re authorized to view.</p>
                    </div>
                    <span className="tm-count">{visible.length}</span>
                  </div>
                  <div className="ed-queue-controls">
                    <label className="tm-search">
                      <Search size={16} />
                      <input
                        aria-label="Search safety requests"
                        placeholder="Search area or request ID"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          if (selected) choose(null);
                        }}
                      />
                    </label>
                    <div>
                      <label>
                        Area
                        <select
                          aria-label="Filter request area"
                          value={regionFilter}
                          onChange={(e) => {
                            setRegionFilter(e.target.value);
                            choose(null);
                          }}
                        >
                          <option value="all">All areas</option>
                          {PILOT_REGIONS.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Status
                        <select
                          aria-label="Filter request status"
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.target.value);
                            choose(null);
                          }}
                        >
                          <option value="active">Active</option>
                          <option value="all">All statuses</option>
                          <option value="resolved">Resolved</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </label>
                    </div>
                  </div>
                  {visible.length ? (
                    <div className="ed-queue">
                      {visible.map((i) => (
                        <button
                          className={`ed-request ${selected === i.id ? "selected" : ""}`}
                          key={i.id}
                          onClick={() => choose(i.id)}
                        >
                          <span className="ed-request-top">
                            <strong>{areaName(i.region_id)}</strong>
                            <span
                              className={`tm-status ${i.status === "active" ? "pending" : "approved"}`}
                            >
                              {i.status}
                            </span>
                          </span>
                          <span className="ed-request-reference">
                            Request {i.id.slice(0, 8)}{" "}
                            <span>{time(i.created_at)}</span>
                          </span>
                          <span className="ed-routing">
                            <MapPin size={12} />
                            {routeCopy(i.routing)}
                          </span>
                          <ArrowRight className="ed-request-arrow" size={15} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="No matching requests"
                      text="New authorized requests appear here. Try another area or status."
                    />
                  )}
                  <div className="tm-panel-foot">
                    <LockKeyhole size={14} />
                    <p>
                      No public incident feed. Details are scoped to your
                      access.
                    </p>
                  </div>
                </section>
                <section className="tm-panel ed-request-detail">
                  <button
                    className="ed-back tm-text-button"
                    onClick={() => choose(null)}
                  >
                    <ArrowLeft size={15} />
                    Back to requests
                  </button>
                  {!selected ? (
                    <Empty
                      icon={Radio}
                      title="Select a safety request"
                      text="Review its status, message delivery and authorized responder team here."
                    />
                  ) : !record ? (
                    <div className="tm-loading ed-detail-loading">
                      <Loader2 size={20} className="tm-spin" />
                      Rechecking request access…
                    </div>
                  ) : (
                    <RequestDetails
                      key={record.id}
                      record={record}
                      role={role || ""}
                      responders={dispatch}
                      busy={busy}
                      checkedAt={checkedAt}
                      run={run}
                    />
                  )}
                </section>
              </div>
            )}
            {tab === "responders" && role === "admin" && (
              <>
                <div className="ed-role-note">
                  <Shield size={18} />
                  <div>
                    <strong>
                      Responder approval is separate from supervisor access.
                    </strong>
                    <p>
                      Superadmins are provisioned in the database. Area admins
                      are appointed in Team & access. Joining or being approved
                      here never promotes an account.
                    </p>
                  </div>
                  <Link href="/admin/team">
                    Review enrollment <ArrowUpRight size={15} />
                  </Link>
                </div>
                <section className="tm-panel">
                  <div className="tm-panel-heading">
                    <div>
                      <h2>Emergency responders</h2>
                      <p>
                        Complete identity checks and training in Team & access
                        before approving emergency duties.
                      </p>
                    </div>
                    <span className="tm-section-icon">
                      <UserCheck size={23} />
                    </span>
                  </div>
                  {team.length ? (
                    team.map((t) => (
                      <ResponderRow
                        key={t.user_id}
                        person={t}
                        review={reviews.find((w) => w.user_id === t.user_id)}
                        agencies={areas.agencies}
                        checkedAt={checkedAt}
                        busy={busy}
                        run={run}
                      />
                    ))
                  ) : (
                    <Empty
                      icon={Users}
                      title="No responder applications yet"
                      text="Volunteers apply in the app. An employee reviews each application, and an independent area admin approves field response."
                    />
                  )}
                </section>
              </>
            )}
            {tab === "coverage" && role === "admin" && !root && (
              <section className="tm-panel" style={{ padding: 24 }}>
                <h2>Your service areas</h2>
                <p>
                  Geographic boundaries are reviewed by the superadmin.
                  Administrative role scope does not establish police coverage.
                </p>
                {areas.regions.map((a) => (
                  <p key={a.id}>
                    {a.name} ·{" "}
                    {a.volunteer_enabled
                      ? "Response enabled"
                      : "Response not enabled"}
                  </p>
                ))}
              </section>
            )}
            {tab === "coverage" && role === "admin" && root && (
              <CoverageWorkspace areas={areas} busy={busy} run={run} />
            )}
          </section>
        </>
      )}
    </>
  );
}
function RequestDetails({
  record: r,
  role,
  responders,
  busy,
  checkedAt,
  run,
}: {
  record: RecordView;
  role: string;
  responders: DispatchMember[];
  busy: boolean;
  checkedAt: number;
  run: Mutate;
}) {
  const [confirmResolve, setConfirmResolve] = useState(false);
  const current = r.status === "active" && Date.parse(r.expires_at) > checkedAt;
  return (
    <>
      <div className="tm-panel-heading">
        <div>
          <span className="tm-eyebrow">REQUEST {r.id.slice(0, 8)}</span>
          <h2>{r.alias || "Safety request"}</h2>
          <p>
            {areaName(r.region_id)} ·{" "}
            {new Date(r.created_at).toLocaleDateString("en-IN")} at{" "}
            {time(r.created_at)}
          </p>
        </div>
        <span className={`tm-status ${current ? "pending" : "approved"}`}>
          {r.status}
        </span>
      </div>
      {role === "admin" && !r.details_allowed && current ? (
        <PurposeAccess
          key={r.id}
          id={r.id}
          kind="incident"
          onChanged={() =>
            void run("vv_sos_read", { p_id: r.id }).catch(() => {})
          }
        >
          <p>Access granted. Refreshing incident…</p>
        </PurposeAccess>
      ) : (
        <div className="ed-context">
          <div className="ed-request-summary">
            <div>
              <span>Offers sent</span>
              <strong>{r.offers}</strong>
            </div>
            <div>
              <span>Acknowledgements</span>
              <strong>{r.accepted}</strong>
            </div>
            <div>
              <span>Police routing</span>
              <strong className="ed-route-value">{routeCopy(r.routing)}</strong>
            </div>
          </div>
          <section className="ed-detail-section">
            <h3>
              <MapPin size={16} />
              Shared location
            </h3>
            {r.latitude != null && r.longitude != null ? (
              <div className="ed-location">
                <span className="ed-location-marker">
                  <MapPin size={22} />
                </span>
                <div>
                  <strong>
                    {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                  </strong>
                  <p>
                    Shared snapshot · accuracy{" "}
                    {r.accuracy == null
                      ? "not reported"
                      : `${Math.round(r.accuracy)} m`}
                  </p>
                </div>
                <LockKeyhole size={16} />
              </div>
            ) : (
              <p className="ed-muted-copy">
                {r.details_allowed
                  ? "No usable location was shared."
                  : "Precise location stays private until a supervisor assigns access."}
              </p>
            )}
            {r.callback && role === "admin" && (
              <p className="ed-callback">
                Chosen callback <a href={`tel:${r.callback}`}>{r.callback}</a>
              </p>
            )}
          </section>
          {role === "admin" && (
            <section className="ed-detail-section">
              <div className="ed-section-heading">
                <h3>
                  <Users size={16} />
                  Responder coordination
                </h3>
                <span className="tm-count">{responders.length}</span>
              </div>
              <p className="ed-muted-copy">
                Assign location access only after confirming availability and
                responsibility. Access lasts up to 15 minutes.
              </p>
              {responders.length ? (
                responders.map((p) => {
                  const assigned =
                    !!p.access_until && Date.parse(p.access_until) > checkedAt;
                  return (
                    <article className="ed-dispatch-row" key={p.user_id}>
                      <div>
                        <span className="tm-avatar">
                          {p.display_name
                            .trim()
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((s) => s[0])
                            .join("")}
                        </span>
                        <div>
                          <strong>{p.display_name}</strong>
                          <p>{p.organisation}</p>
                          <small>
                            {p.accepted_at
                              ? "Availability acknowledged"
                              : "Awaiting acknowledgement"}
                          </small>
                        </div>
                      </div>
                      <div className="ed-dispatch-actions">
                        <small>
                          {p.response_state?.replaceAll("_", " ") || "offered"}
                          {p.check_in_at
                            ? ` · last check-in ${time(p.check_in_at)}`
                            : ""}
                          {p.response_state === "arrived"
                            ? " · reported by responder"
                            : ""}
                        </small>
                        {assigned ? (
                          <span className="ed-access-until">
                            <CheckCircle2 size={13} />
                            Access until {time(p.access_until!)}
                          </span>
                        ) : (
                          <span className="ed-access-until muted">
                            No location assignment
                          </span>
                        )}
                        <div className="tm-actions">
                          <button
                            className="tm-button secondary"
                            disabled={busy || !p.accepted_at || !current}
                            onClick={() =>
                              void run("vv_dispatch_responder", {
                                p_event: r.id,
                                p_worker: p.user_id,
                                p_allow: true,
                              }).catch(() => {})
                            }
                          >
                            {assigned ? "Extend access" : "Assign access"}
                          </button>
                          <button
                            className="tm-text-button danger"
                            disabled={busy || !assigned}
                            onClick={() =>
                              void run("vv_dispatch_responder", {
                                p_event: r.id,
                                p_worker: p.user_id,
                                p_allow: false,
                              }).catch(() => {})
                            }
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="ed-inline-empty">
                  <Users size={18} />
                  <p>
                    No eligible responders are offered this request. Coordinate
                    through your agreed response channels.
                  </p>
                </div>
              )}
            </section>
          )}
          {r.recipients && (
            <section className="ed-detail-section">
              <h3>
                <MessageSquare size={16} />
                Contact messages
              </h3>
              {r.recipients.length ? (
                r.recipients.map((c) => (
                  <div className="ed-recipient" key={c.id}>
                    <span>{c.name}</span>
                    <span
                      className={`ed-delivery ${["delivered", "relay_delivered"].includes(c.state) ? "confirmed" : ""}`}
                    >
                      {deliveryCopy(c.state)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="ed-muted-copy">
                  Trusted-contact delivery details are private to the person
                  requesting help.
                </p>
              )}
              <p className="tm-note">
                Provider acceptance or “sent” does not confirm delivery or a
                person responding.
              </p>
            </section>
          )}
          <footer className="ed-resolution">
            {role === "admin" ? (
              current ? (
                confirmResolve ? (
                  <div className="ed-confirm">
                    <strong>Mark this request as resolved?</strong>
                    <p>
                      Pending dispatch stops. Confirm the situation has been
                      addressed before closing.
                    </p>
                    <div className="tm-actions">
                      <button
                        className="tm-button"
                        disabled={busy}
                        onClick={() =>
                          void run("vv_sos_close", {
                            p_id: r.id,
                            p_status: "resolved",
                          })
                            .then(() => setConfirmResolve(false))
                            .catch(() => {})
                        }
                      >
                        Confirm resolved
                      </button>
                      <button
                        className="tm-button secondary"
                        onClick={() => setConfirmResolve(false)}
                      >
                        Keep open
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="tm-button secondary"
                    disabled={busy}
                    onClick={() => setConfirmResolve(true)}
                  >
                    <CheckCircle2 size={16} />
                    Mark resolved
                  </button>
                )
              ) : (
                <p className="ed-muted-copy">
                  This request is closed or expired. New location assignments
                  are unavailable.
                </p>
              )
            ) : (
              <button
                className="tm-button"
                disabled={busy || !current}
                onClick={() =>
                  void run("vv_sos_accept", { p_id: r.id }).catch(() => {})
                }
              >
                <UserCheck size={17} />
                Acknowledge availability
              </button>
            )}
            <p className="tm-note">
              Acknowledgement is not confirmation of arrival. Sent messages
              cannot be recalled.
            </p>
          </footer>
          {r.chat_allowed && <IncidentChat key={r.id} eventId={r.id} />}
        </div>
      )}
    </>
  );
}
function ResponderRow({
  person: p,
  checkedAt,
}: {
  person: Team;
  review?: Review;
  agencies: Area[];
  checkedAt: number;
  busy: boolean;
  run: Mutate;
}) {
  const duty = !!p.duty_until && Date.parse(p.duty_until) > checkedAt;
  return (
    <article className="ed-dispatch-row">
      <div>
        <h3>{p.display_name}</h3>
        <p>
          {areaName(p.region_id)} · {p.kind}
        </p>
        <small>
          {p.approved ? "Field approval recorded" : "Not field approved"} ·{" "}
          {duty ? "On duty" : "Off duty"}
        </small>
      </div>
      <Link className="tm-button secondary" href="/admin/team">
        Review eligibility in Team & access
      </Link>
    </article>
  );
}

function CoverageWorkspace({
  areas,
  busy,
  run,
}: {
  areas: Coverage;
  busy: boolean;
  run: Mutate;
}) {
  const [region, setRegion] = useState("bhopal"),
    [edit, setEdit] = useState(false);
  const selected = areas.regions.find((a) => a.id === region),
    agencies = areas.agencies.filter((a) => a.region_id === region);
  return (
    <>
      <div className="ed-role-note">
        <MapPin size={18} />
        <div>
          <strong>A listed police station is not a receiving partner.</strong>
          <p>
            Automatic routing needs reviewed boundaries, verified receiving
            accounts and an operating team.
          </p>
        </div>
      </div>
      <div className="ed-coverage-grid">
        <div>
          <section className="tm-panel">
            <div className="tm-panel-heading">
              <div>
                <h2>Service areas</h2>
                <p>Review each area before enabling responder matching.</p>
              </div>
              <span className="tm-section-icon">
                <Map size={22} />
              </span>
            </div>
            {areas.regions.map((a) => (
              <button
                className={`ed-area ${region === a.id ? "selected" : ""}`}
                key={a.id}
                onClick={() => {
                  setRegion(a.id);
                  setEdit(false);
                }}
              >
                <MapPin size={19} />
                <span>
                  <strong>{a.name}</strong>
                  <small>{a.scope}</small>
                  <span
                    className={`ed-area-status ${a.volunteer_enabled && a.geometry ? "enabled" : ""}`}
                  >
                    {a.geometry ? "Boundary imported" : "Boundary not reviewed"}{" "}
                    ·{" "}
                    {a.volunteer_enabled
                      ? "Matching enabled"
                      : "Matching disabled"}
                  </span>
                </span>
                <ChevronDown size={15} />
              </button>
            ))}
          </section>
          <section className="tm-panel ed-coverage-note">
            <h3>
              <Shield size={16} />
              What enabling an area means
            </h3>
            <p>
              It allows matching to eligible, on-duty responders. It does not
              establish police coverage or guarantee a response.
            </p>
          </section>
        </div>
        <section className="tm-panel">
          <div className="tm-panel-heading">
            <div>
              <span className="tm-eyebrow">BOUNDARY REVIEW</span>
              <h2>{areaName(region)}</h2>
              <p>{selected?.scope}</p>
            </div>
            <button
              className="tm-button secondary"
              onClick={() => setEdit((v) => !v)}
            >
              <FileJson size={15} />
              {edit ? "Close editor" : "Review boundary"}
            </button>
          </div>
          <div className="tm-padded">
            <AreaMap areas={[...(selected ? [selected] : []), ...agencies]} />
            <div className="ed-boundary-meta">
              <span
                className={`tm-status ${selected?.volunteer_enabled ? "approved" : "pending"}`}
              >
                {selected?.volunteer_enabled
                  ? "Matching enabled"
                  : "Matching disabled"}
              </span>
              {selected?.source_url && (
                <a href={selected.source_url} target="_blank" rel="noreferrer">
                  Official directory <ArrowUpRight size={13} />
                </a>
              )}
            </div>
            <h3 className="ed-agency-heading">
              Police receiving areas{" "}
              <span className="tm-count">{agencies.length}</span>
            </h3>
            {agencies.length ? (
              agencies.map((a) => (
                <div className="ed-agency" key={a.id}>
                  <span>
                    <strong>{a.name}</strong>
                    <small>
                      {a.geometry ? "Boundary imported" : "Boundary missing"}
                    </small>
                  </span>
                  <span
                    className={`tm-status ${a.enabled ? "approved" : "pending"}`}
                  >
                    {a.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              ))
            ) : (
              <p className="ed-muted-copy">
                No police receiving areas have been configured for this region.
              </p>
            )}
            {edit && (
              <BoundaryEditor
                key={region}
                region={region}
                current={selected}
                agencies={agencies}
                busy={busy}
                run={run}
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
function BoundaryEditor({
  region,
  current,
  agencies,
  busy,
  run,
}: {
  region: string;
  current?: Area;
  agencies: Area[];
  busy: boolean;
  run: Mutate;
}) {
  const [kind, setKind] = useState("region"),
    [agency, setAgency] = useState(""),
    [name, setName] = useState(""),
    [source, setSource] = useState(current?.boundary_source || ""),
    [geometry, setGeometry] = useState(
      current?.geometry ? JSON.stringify(current.geometry, null, 2) : "",
    ),
    [enabled, setEnabled] = useState(!!current?.volunteer_enabled),
    [error, setError] = useState("");
  const newAgencyId = useRef<string | null>(null);
  function fill(a?: Area, isRegion = false) {
    setName(a?.name || "");
    setSource(isRegion ? a?.boundary_source || "" : a?.source_url || "");
    setGeometry(a?.geometry ? JSON.stringify(a.geometry, null, 2) : "");
    setEnabled(isRegion ? !!a?.volunteer_enabled : !!a?.enabled);
    setError("");
  }
  return (
    <form
      className="tm-form ed-boundary-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          if (geometry.length > 1000000)
            throw Error("Use a boundary file smaller than 1 MB.");
          let g;
          try {
            g = JSON.parse(geometry);
          } catch {
            throw Error("Enter valid GeoJSON for the boundary.");
          }
          if (g.type !== "Polygon" && g.type !== "MultiPolygon")
            throw Error(
              "Use a GeoJSON Polygon or MultiPolygon geometry, not a FeatureCollection.",
            );
          if (!source.startsWith("https://"))
            throw Error(
              "Use an HTTPS link to the authoritative boundary source.",
            );
          if (kind === "agency" && !agency && !newAgencyId.current)
            newAgencyId.current = crypto.randomUUID();
          const id = kind === "agency" ? agency || newAgencyId.current : null;
          const result = await run("vv_sos_set_area", {
            p_region: region,
            p_geojson: g,
            p_source: source,
            p_enabled: enabled,
            p_name: kind === "agency" ? name : null,
            p_agency: id,
          });
          if (kind === "agency" && typeof result === "string")
            setAgency(result);
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <div>
        <h3>Import a reviewed boundary</h3>
        <p className="ed-muted-copy">
          Use an authoritative source and verify the geometry before enabling
          matching. Saving this form does not send an alert.
        </p>
      </div>
      <label>
        Boundary type
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setAgency("");
            newAgencyId.current = null;
            fill(
              e.target.value === "region" ? current : undefined,
              e.target.value === "region",
            );
          }}
        >
          <option value="region">Responder service area</option>
          <option value="agency">Police receiving jurisdiction</option>
        </select>
      </label>
      {kind === "agency" && (
        <>
          <label>
            Receiving area
            <select
              value={agency}
              onChange={(e) => {
                setAgency(e.target.value);
                newAgencyId.current = null;
                fill(agencies.find((a) => a.id === e.target.value));
              }}
            >
              <option value="">Create receiving area</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Agency name
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Verified receiving organisation"
            />
          </label>
        </>
      )}
      <label>
        Authoritative source URL
        <input
          required
          type="url"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="https://…"
        />
        <small>
          Link to the boundary source you reviewed, rather than a general
          contact directory.
        </small>
      </label>
      <label>
        Reviewed GeoJSON geometry
        <textarea
          required
          rows={7}
          value={geometry}
          onChange={(e) => setGeometry(e.target.value)}
          placeholder={'{ "type": "Polygon", "coordinates": […] }'}
        />
      </label>
      <label className="tm-check">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span>
          Enable this reviewed{" "}
          {kind === "agency" ? "receiving area" : "responder service area"}
        </span>
      </label>
      {error && (
        <p className="tm-alert" role="alert">
          {error}
        </p>
      )}
      <button className="tm-button" disabled={busy}>
        <Check size={16} />
        Save reviewed boundary
      </button>
    </form>
  );
}
function AreaMap({ areas }: { areas: Area[] }) {
  const polygons = areas.flatMap((a) =>
    a.geometry
      ? a.geometry.type === "MultiPolygon"
        ? a.geometry.coordinates
        : [a.geometry.coordinates as unknown as number[][][]]
      : [],
  );
  const points = polygons.flat(2);
  if (!points.length)
    return (
      <div className="ed-map-empty">
        <Map size={38} />
        <strong>No reviewed boundary to display</strong>
        <p>
          Import authoritative geometry to preview this area. Unreviewed zones
          are not drawn.
        </p>
      </div>
    );
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p[0]);
    minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]);
    maxY = Math.max(maxY, p[1]);
  }
  const dx = Math.max(0.001, maxX - minX),
    dy = Math.max(0.001, maxY - minY),
    scale = Math.min(700 / dx, 300 / dy);
  const map = (p: number[]) =>
    `${370 + (p[0] - minX - dx / 2) * scale},${175 - (p[1] - minY - dy / 2) * scale}`;
  return (
    <figure className="ed-boundary-map">
      <svg
        viewBox="0 0 740 350"
        role="img"
        aria-label="Reviewed service boundary outlines"
      >
        <defs>
          <pattern
            id="emergency-grid"
            width="25"
            height="25"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 25 0 L 0 0 0 25"
              fill="none"
              stroke="#dfe7e3"
              strokeWidth=".8"
            />
          </pattern>
        </defs>
        <rect width="740" height="350" fill="url(#emergency-grid)" />
        {polygons.map((polygon, i) => (
          <path
            key={i}
            d={polygon
              .map((ring) => "M" + ring.map(map).join("L") + "Z")
              .join(" ")}
            fillRule="evenodd"
            fill="#2c6d5d25"
            stroke="#2c6d5d"
            strokeWidth={2}
          />
        ))}
      </svg>
      <figcaption>
        Imported boundary outline · This is not a street map or confirmation of
        response coverage.
      </figcaption>
    </figure>
  );
}
