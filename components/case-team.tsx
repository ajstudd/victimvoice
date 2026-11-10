"use client";
import { useCallback, useEffect, useState } from "react";
import { supportRpc } from "@/lib/support";
type Member = {
  user_id: string;
  display_name: string;
  organisation?: string;
  role?: string;
  accepted_at?: string;
};
export function CaseTeam({ requestId }: { requestId: string }) {
  const [team, setTeam] = useState<Member[]>([]),
    [files, setFiles] = useState<{ id: string; label: string }[]>([]),
    [grants, setGrants] = useState<
      { evidence_id: string; worker_id: string }[]
    >([]),
    [report, setReport] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.all([
        supportRpc<{ team: Member[] }>("vv_open_case", {
          p_request_id: requestId,
        }),
        supportRpc<{ id: string; label: string }[]>("vv_list_evidence", {
          p_request_id: requestId,
        }),
        supportRpc<{ evidence_id: string; worker_id: string }[]>(
          "vv_evidence_permissions",
          { p_request: requestId },
        ),
      ]);
      setTeam(a.team);
      setFiles(b);
      setGrants(c);
    } catch (e) {
      setTeam([]);
      setFiles([]);
      setGrants([]);
      setError((e as Error).message);
    }
  }, [requestId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function run(name: string, args: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await supportRpc(name, args);
      setReport("");
      setReason("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h3>People assigned to help</h3>
      <p>
        You can remove a worker or report a concern privately to supervisors.
        Evidence access is a separate choice for each item.
      </p>
      {team.length ? (
        team.map((p) => (
          <article
            key={p.user_id}
            style={{ borderTop: "1px solid #ddd", padding: "16px 0" }}
          >
            <strong>{p.display_name}</strong>
            <p>
              {p.organisation} · {p.role?.replaceAll("_", " ")} ·{" "}
              {p.accepted_at ? "Acknowledged" : "Awaiting acknowledgement"}
            </p>
            <button
              disabled={busy}
              onClick={() =>
                void run("vv_remove_worker", {
                  p_request: requestId,
                  p_worker: p.user_id,
                })
              }
            >
              Remove worker · Request reassignment
            </button>
            {" · "}
            <button disabled={busy} onClick={() => setReport(p.user_id)}>
              Report & block access
            </button>
            {report === p.user_id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run("vv_report_worker", {
                    p_request: requestId,
                    p_worker: p.user_id,
                    p_reason: reason,
                  });
                }}
              >
                <label>
                  What happened?
                  <textarea
                    required
                    minLength={5}
                    maxLength={2000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <button disabled={busy}>Send private report & block</button>
                <button type="button" onClick={() => setReport("")}>
                  Cancel report
                </button>
              </form>
            )}
            {p.accepted_at &&
              files.map((f) => (
                <label key={f.id} style={{ display: "block", padding: 8 }}>
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={grants.some(
                      (g) =>
                        g.worker_id === p.user_id && g.evidence_id === f.id,
                    )}
                    onChange={(e) =>
                      void run("vv_set_evidence_grant", {
                        p_evidence: f.id,
                        p_worker: p.user_id,
                        p_allowed: e.target.checked,
                      })
                    }
                  />
                  Allow {f.label} · up to 7 days
                </label>
              ))}
          </article>
        ))
      ) : (
        <p>No workers assigned. Supervisors can still review your request.</p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
