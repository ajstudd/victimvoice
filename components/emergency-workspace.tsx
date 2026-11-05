"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { useConversationSync } from "@/hooks/useConversationSync";
import { PILOT_REGIONS } from "@/shared/sos";
type Incident = {
  id: string;
  created_at: string;
  status: string;
  region_id: string;
  routing: string;
};
type Team = {
  user_id: string;
  display_name: string;
  region_id: string;
  approved: boolean;
  kind: string;
  agency_id: string | null;
};
type Area = {
  id: string;
  name: string;
  region_id?: string;
  scope?: string;
  source_url?: string;
  enabled?: boolean;
  volunteer_enabled?: boolean;
  geometry?: { type: string; coordinates: number[][][][] };
};
type RecordView = Incident & {
  alias: string | null;
  callback: string | null;
  latitude: number | null;
  longitude: number | null;
  recipients: { id: string; name: string; state: string }[];
  accepted: number;
  offers: number;
};
export function EmergencyWorkspace() {
  const [scope, setScope] = useState("opening");
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void getSupabase()
      .auth.getSession()
      .then((r) => setScope(r.data.session?.user.id || "signed-out"));
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) =>
      setScope(session?.user.id || "signed-out"),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return <Session key={scope} />;
}
function Session() {
  const [role, setRole] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [team, setTeam] = useState<Team[]>([]);
  const [areas, setAreas] = useState<{ regions: Area[]; agencies: Area[] }>({
    regions: [],
    agencies: [],
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [record, setRecord] = useState<RecordView | null>(null);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [region, setRegion] = useState("bhopal");
  const [kind, setKind] = useState("region");
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [geometry, setGeometry] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [agency, setAgency] = useState("");
  const [editingAgency, setEditingAgency] = useState("");
  useEffect(() => {
    const conceal = () => {
      setHidden(true);
      setRecord(null);
    };
    const show = () => setHidden(document.hidden);
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
    async (signal: AbortSignal) => {
      if (!isSupabaseConfigured) throw Error("Supabase is not configured.");
      const client = getSupabase();
      const roleResult = await client.rpc("vv_sos_role").abortSignal(signal);
      if (roleResult.error) throw roleResult.error;
      const role = roleResult.data;
      if (!role)
        throw Error("Sign in with an approved emergency-response account.");
      const list = await client.rpc("vv_sos_list").abortSignal(signal);
      if (list.error) throw list.error;
      let members: Team[] = [],
        map = { regions: [] as Area[], agencies: [] as Area[] };
      if (role === "admin") {
        const [a, b] = await Promise.all([
          client.rpc("vv_sos_team").abortSignal(signal),
          client.rpc("vv_sos_areas").abortSignal(signal),
        ]);
        if (a.error) throw a.error;
        if (b.error) throw b.error;
        members = a.data;
        map = b.data;
      }
      let detail: RecordView | null = null;
      if (selected) {
        const r = await client
          .rpc("vv_sos_read", { p_id: selected })
          .abortSignal(signal);
        if (r.error) throw r.error;
        detail = r.data;
      }
      return { role, rows: list.data as Incident[], members, map, detail };
    },
    [selected],
  );
  const receive = useCallback(
    (r: {
      role: string;
      rows: Incident[];
      members: Team[];
      map: typeof areas;
      detail: RecordView | null;
    }) => {
      setRole(r.role);
      setIncidents(r.rows);
      setTeam(r.members);
      setAreas(r.map);
      setRecord(r.detail);
      setError("");
    },
    [],
  );
  const failed = useCallback((e: unknown) => {
    setRecord(null);
    setError((e as Error).message);
  }, []);
  const changed = useCallback(() => {
    setRecord(null);
    setIncidents([]);
    setTeam([]);
    setAreas({ regions: [], agencies: [] });
    setRole(null);
  }, []);
  const refresh = useConversationSync(load, receive, failed, changed);
  async function run(name: string, args: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await getSupabase().rpc(name, args);
      if (r.error) throw r.error;
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#FBF7F2",
        color: "#30253D",
        fontFamily: "system-ui",
        padding: 24,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <p>Victim Voice · Emergency response</p>
          <h1 style={{ fontSize: 30, fontFamily: "Georgia" }}>
            Live incidents & pilot coverage
          </h1>
        </div>
        <nav>
          <Link href="/admin/dashboard">Support inbox</Link>
          {" · "}
          <Link href="/admin/login">Sign in</Link>
          {" · "}
          <button onClick={refresh}>Refresh</button>
        </nav>
      </header>
      <p>
        Manual contact alerts are independent of responder matching. No station
        is enabled by a public directory listing alone.
      </p>
      {error && (
        <p
          role="alert"
          style={{ background: "#F9E5E2", padding: 16, borderRadius: 12 }}
        >
          {error}
        </p>
      )}
      {hidden ? (
        <section style={{ padding: 80, textAlign: "center" }}>
          Private workspace hidden while unfocused.
        </section>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 20,
            }}
          >
            <section style={panel}>
              <h2>Requests</h2>
              {incidents.length ? (
                incidents.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => setSelected(i.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: 16,
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    {i.region_id} · {i.status}
                    <br />
                    <small>
                      {i.id.slice(0, 8)} ·{" "}
                      {new Date(i.created_at).toLocaleString()}
                      <br />
                      Police: {i.routing.replaceAll("_", " ")}
                    </small>
                  </button>
                ))
              ) : (
                <p>No authorized requests to show.</p>
              )}
            </section>
            <section style={panel}>
              <h2>Request context</h2>
              {record ? (
                <>
                  <p>
                    {record.alias || "Approximate area only until acceptance"}
                  </p>
                  <p>
                    {record.status} · {record.region_id}
                  </p>
                  {record.latitude != null && (
                    <p>
                      Location {record.latitude.toFixed(5)},{" "}
                      {record.longitude?.toFixed(5)}
                    </p>
                  )}
                  <p>
                    {record.offers} offers · {record.accepted} accepted
                  </p>
                  {record.recipients?.map((r) => (
                    <p key={r.id}>
                      {r.name}: {r.state}
                    </p>
                  ))}
                  {role === "admin" ? (
                    <button
                      disabled={busy}
                      onClick={() =>
                        run("vv_sos_close", {
                          p_id: record.id,
                          p_status: "resolved",
                        })
                      }
                    >
                      Resolve incident
                    </button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => run("vv_sos_accept", { p_id: record.id })}
                    >
                      Accept current offer
                    </button>
                  )}
                  <p>
                    <small>
                      Acceptance does not confirm arrival. Already sent SMS
                      cannot be recalled.
                    </small>
                  </p>
                </>
              ) : (
                <p>
                  Select a request. Sensitive details reauthorize on each check.
                </p>
              )}
            </section>
          </div>
          {role === "admin" && (
            <>
              <section style={{ ...panel, marginTop: 24 }}>
                <h2>Pilot service areas</h2>
                <AreaMap areas={[...areas.regions, ...areas.agencies]} />
                {areas.regions.map((r) => (
                  <p key={r.id}>
                    <strong>{r.name}</strong> · {r.scope} ·{" "}
                    {r.geometry ? "Boundary imported" : "Boundary not verified"}{" "}
                    ·{" "}
                    {r.volunteer_enabled
                      ? "Volunteer matching enabled"
                      : "Matching disabled"}{" "}
                    ·{" "}
                    <a href={r.source_url} target="_blank" rel="noreferrer">
                      Official directory
                    </a>
                  </p>
                ))}
                {areas.agencies.map((a) => (
                  <p key={a.id}>
                    {a.name} · {a.region_id} ·{" "}
                    {a.enabled ? "Receiving enabled" : "Disabled"}
                  </p>
                ))}
                <h3>Import a reviewed boundary</h3>
                <p>
                  Only publish authoritative geometry after review. A police
                  receiving area also requires an onboarded, monitored police
                  account. This does not send an alert.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    try {
                      const g = JSON.parse(geometry);
                      if (g.type !== "Polygon" && g.type !== "MultiPolygon")
                        throw Error(
                          "Paste a GeoJSON Polygon/MultiPolygon geometry, not a FeatureCollection.",
                        );
                      void run("vv_sos_set_area", {
                        p_region: region,
                        p_geojson: g,
                        p_source: source,
                        p_enabled: enabled,
                        p_name: kind === "agency" ? name : null,
                        p_agency: kind === "agency" ? editingAgency || null : null,
                      });
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                  style={{ display: "grid", gap: 12, maxWidth: 760 }}
                >
                  <label>
                    Pilot region
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
                  <label>
                    Boundary type
                    <select
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                    >
                      <option value="region">Pilot region</option>
                      <option value="agency">
                        Police receiving jurisdiction
                      </option>
                    </select>
                  </label>
                  {kind === "agency" && (
                    <label>
                      Receiving area
                      <select value={editingAgency} onChange={(e) => {
                        const id = e.target.value;
                        setEditingAgency(id);
                        const a = areas.agencies.find((a) => a.id === id);
                        setName(a?.name || "");
                        setSource(a?.source_url || "");
                        setGeometry(a?.geometry ? JSON.stringify(a.geometry) : "");
                        setEnabled(Boolean(a?.enabled));
                        if (a?.region_id) setRegion(a.region_id);
                      }}>
                        <option value="">Create receiving area</option>
                        {areas.agencies.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.region_id}</option>)}
                      </select>
                    </label>
                  )}
                  {kind === "agency" && (
                    <label>
                      Agency name
                      <input
                        required
                        maxLength={120}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                  )}
                  <label>
                    Official source URL
                    <input
                      required
                      type="url"
                      placeholder="https://…"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                    />
                  </label>
                  <label>
                    Reviewed GeoJSON geometry
                    <textarea
                      required
                      rows={6}
                      value={geometry}
                      onChange={(e) => setGeometry(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                    />{" "}
                    Enable this reviewed service area
                  </label>
                  <button disabled={busy} type="submit">
                    Save reviewed boundary
                  </button>
                </form>
              </section>
              <section style={{ ...panel, marginTop: 24 }}>
                <h2>Responder approval</h2>
                <p>
                  Verify identity, training and operational responsibility
                  before approving. Existing case volunteers have no automatic
                  emergency access.
                </p>
                <label>
                  Agency for police approval
                  <select
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                  >
                    <option value="">Select enabled police agency</option>
                    {areas.agencies
                      .filter((a) => a.enabled)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </label>
                {team.map((t) => (
                  <article
                    key={t.user_id}
                    style={{ padding: 16, borderBottom: "1px solid #ddd" }}
                  >
                    <strong>{t.display_name}</strong> · {t.region_id} · {t.kind}{" "}
                    · {t.approved ? "Approved" : "Pending/suspended"}
                    <p>
                      <small>{t.user_id}</small>
                    </p>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run("vv_sos_approve", {
                          p_user: t.user_id,
                          p_approved: true,
                          p_kind: "volunteer",
                          p_agency: null,
                        })
                      }
                    >
                      Approve volunteer
                    </button>{" "}
                    <button
                      disabled={busy || !agency}
                      onClick={() =>
                        run("vv_sos_approve", {
                          p_user: t.user_id,
                          p_approved: true,
                          p_kind: "police",
                          p_agency: agency,
                        })
                      }
                    >
                      Approve verified police recipient
                    </button>{" "}
                    <button
                      disabled={busy}
                      onClick={() =>
                        run("vv_sos_approve", {
                          p_user: t.user_id,
                          p_approved: false,
                          p_kind: t.kind,
                          p_agency: t.agency_id,
                        })
                      }
                    >
                      Suspend
                    </button>
                  </article>
                ))}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
const panel = {
  background: "#FFFDFC",
  padding: 20,
  borderRadius: 20,
  border: "1px solid #E5DCE2",
};
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
      <p>
        No authoritative geometry has been imported. No guessed zones are drawn.
      </p>
    );
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const minX = Math.min(...xs),
    minY = Math.min(...ys),
    dx = Math.max(0.001, Math.max(...xs) - minX),
    dy = Math.max(0.001, Math.max(...ys) - minY);
  const scale = Math.min(700 / dx, 300 / dy);
  const map = (p: number[]) =>
    `${370 + (p[0] - minX - dx / 2) * scale},${175 - (p[1] - minY - dy / 2) * scale}`;
  return (
    <figure>
      <svg
        viewBox="0 0 740 350"
        role="img"
        aria-label="Imported verified service boundaries, longitude and latitude projection"
        style={{
          width: "100%",
          maxHeight: 350,
          background: "#ECE5F0",
          borderRadius: 16,
        }}
      >
        {polygons.map((polygon, i) => (
          <path
            key={i}
            d={polygon.map((ring) => "M" + ring.map(map).join("L") + "Z").join(" ")}
            fillRule="evenodd"
            fill="#2C6D5D33"
            stroke="#2C6D5D"
            strokeWidth={1}
          />
        ))}
      </svg>
      <figcaption>
        Reviewed geographic boundaries · No external map provider receives
        incident coordinates. Separate city/state extents may differ
        substantially in scale.
      </figcaption>
    </figure>
  );
}
