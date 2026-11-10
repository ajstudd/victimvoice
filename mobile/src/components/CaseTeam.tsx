import React, { useCallback, useState } from "react";
import { View, Switch } from "react-native";
import { T, Button, Field, Notice, Row, s } from "./ui";
import { useApp } from "../state/AppState";
import { accountClient } from "../lib/supabase";
import { useConversationSync } from "../hooks/useConversationSync";
type Member = {
  user_id: string;
  display_name: string;
  role?: string;
  kind?: string;
  organisation: string;
  accepted_at?: string | null;
  access_until?: string | null;
};
type File = { id: string; label: string };
type Grant = { evidence_id: string; worker_id: string };
export function CaseTeam({
  requestId,
  eventId,
}: {
  requestId?: string;
  eventId?: string;
}) {
  const { session } = useApp();
  const [checkedAt, setCheckedAt] = useState(() => Date.now());
  const [team, setTeam] = useState<Member[]>([]),
    [files, setFiles] = useState<File[]>([]),
    [grants, setGrants] = useState<Grant[]>([]),
    [report, setReport] = useState(""),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!session) return null;
      const c = accountClient(session);
      if (eventId) {
        const r = await c
          .rpc("vv_dispatch_team", { p_event: eventId })
          .abortSignal(signal);
        if (r.error) throw r.error;
        return { team: r.data, files: [], grants: [] };
      }
      if (!requestId) return null;
      const [a, b, d] = await Promise.all([
        c.rpc("vv_open_case", { p_request_id: requestId }).abortSignal(signal),
        c
          .rpc("vv_list_evidence", { p_request_id: requestId })
          .abortSignal(signal),
        c
          .rpc("vv_evidence_permissions", { p_request: requestId })
          .abortSignal(signal),
      ]);
      if (a.error || b.error || d.error) throw a.error || b.error || d.error;
      return { team: a.data.team, files: b.data, grants: d.data };
    },
    [session, requestId, eventId],
  );
  const receive = useCallback(
    (data: { team: Member[]; files: File[]; grants: Grant[] } | null) => {
      setCheckedAt(Date.now());
      setTeam(data?.team || []);
      setFiles(data?.files || []);
      setGrants(data?.grants || []);
    },
    [],
  );
  const failed = useCallback((e: unknown) => {
    setTeam([]);
    setFiles([]);
    setGrants([]);
    setMessage((e as Error).message);
  }, []);
  const refresh = useConversationSync(load, receive, failed);
  async function run(name: string, args: Record<string, unknown>) {
    if (!session || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const r = await accountClient(session).rpc(name, args);
      if (r.error) throw r.error;
      setReport("");
      setReason("");
      setMessage("Your access choices have been saved.");
      refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <T kind="heading">People assigned to help</T>
      <T kind="caption">
        Supervisors oversee access. You can remove a worker or report a concern.
        Reports are private to supervisors. Copies already taken cannot be
        recalled.
      </T>
      {!team.length && (
        <T>
          No workers are currently assigned. This does not confirm that help is
          on the way.
        </T>
      )}
      {team.map((p) => (
        <View key={p.user_id} style={s.panel}>
          <T kind="heading">{p.display_name}</T>
          <T>
            {p.organisation} ·{" "}
            {(p.role || p.kind || "support worker").replaceAll("_", " ")}
          </T>
          <T kind="caption">
            {eventId
              ? p.access_until && Date.parse(p.access_until) > checkedAt
                ? "Supervisor assigned · location access expires soon"
                : "Awaiting supervisor assignment"
              : p.accepted_at
                ? "Assignment acknowledged"
                : "Awaiting acknowledgement"}
          </T>
          {requestId && (
            <Button
              title="Remove worker · Request reassignment"
              tone="outline"
              busy={busy}
              onPress={() =>
                void run("vv_remove_worker", {
                  p_request: requestId,
                  p_worker: p.user_id,
                })
              }
            />
          )}
          <Button
            title="Report & block access"
            tone="outline"
            onPress={() => setReport(p.user_id)}
          />
          {report === p.user_id && (
            <>
              <Field
                label="Tell the supervisor what happened"
                value={reason}
                onChangeText={setReason}
                maxLength={2000}
                multiline
              />
              <Button
                title="Send private report & block"
                busy={busy}
                disabled={reason.trim().length < 5}
                onPress={() =>
                  void run("vv_report_worker", {
                    p_worker: p.user_id,
                    p_reason: reason,
                    p_request: requestId || null,
                    p_event: eventId || null,
                  })
                }
              />
              <Button
                title="Cancel report"
                tone="outline"
                onPress={() => {
                  setReport("");
                  setReason("");
                }}
              />
            </>
          )}
          {requestId && p.accepted_at && files.length > 0 && (
            <>
              <T kind="label">Evidence access · Up to 7 days</T>
              <T kind="caption">
                Choose each item this worker can open. Turning an item off
                removes future access.
              </T>
              {files.map((f) => (
                <Row
                  key={f.id}
                  title={f.label}
                  end={
                    <Switch
                      accessibilityLabel={`Allow ${p.display_name} to open ${f.label}`}
                      value={grants.some(
                        (g) =>
                          g.worker_id === p.user_id && g.evidence_id === f.id,
                      )}
                      disabled={busy}
                      onValueChange={(allowed) =>
                        void run("vv_set_evidence_grant", {
                          p_evidence: f.id,
                          p_worker: p.user_id,
                          p_allowed: allowed,
                        })
                      }
                    />
                  }
                />
              ))}
            </>
          )}
        </View>
      ))}
      {Boolean(message) && <Notice text={message} />}
    </View>
  );
}
