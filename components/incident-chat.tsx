"use client";
import { useCallback, useState, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import { supportRpc } from "@/lib/support";
import { useConversationSync } from "@/hooks/useConversationSync";
import { EvidencePanel } from "./evidence-panel";
type Message = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
};
type Participant = {
  user_id: string;
  display_name: string;
  role: string;
  organisation: string;
};
export function IncidentChat({
  eventId,
  owner = false,
}: {
  eventId: string;
  owner?: boolean;
}) {
  const [rows, setRows] = useState<Message[]>([]),
    [people, setPeople] = useState<Participant[]>([]),
    [body, setBody] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [authorized, setAuthorized] = useState(false),
    [older, setOlder] = useState(false);
  const pendingMessage = useRef<{ body: string; id: string } | null>(null);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [a, b] = await Promise.all([
        getSupabase()
          .rpc("vv2_incident_messages", { p_event: eventId })
          .abortSignal(signal),
        getSupabase()
          .rpc("vv2_incident_participants", { p_event: eventId })
          .abortSignal(signal),
      ]);
      if (a.error || b.error) throw a.error || b.error;
      return {
        messages: a.data as Message[],
        participants: b.data as Participant[],
      };
    },
    [eventId],
  );
  const receive = useCallback(
    (r: { messages: Message[]; participants: Participant[] }) => {
      setRows((v) =>
        older
          ? [
              ...v.filter((m) => !r.messages.some((n) => n.id === m.id)),
              ...r.messages,
            ]
          : r.messages,
      );
      setPeople(r.participants);
      setAuthorized(true);
      setError("");
    },
    [older],
  );
  const failed = useCallback((e: unknown) => {
    setRows([]);
    setPeople([]);
    setAuthorized(false);
    setError((e as Error).message);
  }, []);
  const changed = useCallback(() => {
    setRows([]);
    setPeople([]);
    setBody("");
    pendingMessage.current = null;
    setAuthorized(false);
  }, []);
  const refresh = useConversationSync(load, receive, failed, changed);
  return (
    <section
      className="tm-panel"
      style={{ padding: 20, marginTop: 20 }}
      aria-label="Incident conversation"
    >
      <h3>Incident chat</h3>
      <p>
        Stay in the app. Don’t share personal phone numbers or agree to move to
        another messaging service. This chat closes when the incident or your
        access ends.
      </p>
      <p>
        {people.map((p) => `${p.display_name} · ${p.role}`).join(" / ") ||
          "No assigned responder or coordinator yet."}
      </p>
      {authorized && (
        <>
          {rows.length >= 50 && !older && (
            <button
              className="tm-text-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const previous = await supportRpc<Message[]>(
                    "vv2_incident_messages",
                    { p_event: eventId, p_before: rows[0].created_at },
                  );
                  setRows((v) => [...previous, ...v]);
                  setOlder(true);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Load earlier messages
            </button>
          )}
          <div
            role="log"
            aria-label="Messages"
            style={{
              maxHeight: 400,
              overflow: "auto",
              display: "grid",
              gap: 12,
              padding: "16px 0",
            }}
          >
            {rows.length ? (
              rows.map((m) => (
                <article
                  key={m.id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background:
                      m.author_role === "owner" ? "#f6e7df" : "#efebf3",
                  }}
                >
                  <strong>{m.author_name}</strong>
                  <small style={{ display: "block" }}>
                    {m.author_role} ·{" "}
                    {new Date(m.created_at).toLocaleTimeString()}
                  </small>
                  <p
                    style={{
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      marginBottom: 0,
                    }}
                  >
                    {m.content}
                  </p>
                </article>
              ))
            ) : (
              <p>
                No messages yet. Introduce yourself and ask what help is wanted.
              </p>
            )}
          </div>
          <form
            className="tm-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || !body.trim()) return;
              setBusy(true);
              try {
                await supportRpc("vv2_send_incident_message", {
                  p_event: eventId,
                  p_id:
                    pendingMessage.current?.body === body
                      ? pendingMessage.current.id
                      : (pendingMessage.current = {
                          body,
                          id: crypto.randomUUID(),
                        }).id,
                  p_content: body,
                });
                pendingMessage.current = null;
                setBody("");
                refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Message
              <textarea
                required
                maxLength={2000}
                value={body}
                disabled={busy}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <button className="tm-button" disabled={busy || !body.trim()}>
              Send message
            </button>
          </form>
          <p>
            Attachments are shared with the current participants named above,
            including the person requesting help. New participants won’t inherit
            these files. Up to 5 MiB per file; removed after seven days.
          </p>
          <EvidencePanel
            key={eventId}
            requestId={eventId}
            context="incident"
            participantIds={people.map((p) => p.user_id)}
            owner
            watermark="Private incident"
          />
          {owner &&
            people.map((p) => (
              <button
                key={p.user_id}
                className="tm-text-button"
                onClick={() => {
                  const why = window.prompt(
                    "Describe your concern. Reporting immediately blocks this person from your requests.",
                  );
                  if (why)
                    void supportRpc("vv_report_worker", {
                      p_worker: p.user_id,
                      p_reason: why,
                      p_event: eventId,
                    })
                      .then(refresh)
                      .catch((e) => setError(e.message));
                }}
              >
                Report / block {p.display_name}
              </button>
            ))}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
