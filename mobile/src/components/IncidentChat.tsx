import React, { useCallback, useState, useRef } from "react";
import { View } from "react-native";
import * as Crypto from "expo-crypto";
import { T, Field, Button, Notice, s } from "./ui";
import { CaseEvidence } from "./CaseEvidence";
import { useApp } from "../state/AppState";
import { accountClient } from "../lib/supabase";
import { useConversationSync } from "../hooks/useConversationSync";
type Message = {
  id: string;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
};
type Person = { user_id: string; display_name: string; role: string };
export function IncidentChat({
  eventId,
  owner = false,
}: {
  eventId: string;
  owner?: boolean;
}) {
  const { session } = useApp();
  const [rows, setRows] = useState<Message[]>([]),
    [people, setPeople] = useState<Person[]>([]),
    [body, setBody] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [allowed, setAllowed] = useState(false),
    [report, setReport] = useState(""),
    [target, setTarget] = useState<Person | null>(null);
  const pendingMessage = useRef<{ body: string; id: string } | null>(null);
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!session) throw Error("Sign in to continue.");
      const c = accountClient(session);
      const [a, b] = await Promise.all([
        c
          .rpc("vv2_incident_messages", { p_event: eventId })
          .abortSignal(signal),
        c
          .rpc("vv2_incident_participants", { p_event: eventId })
          .abortSignal(signal),
      ]);
      if (a.error || b.error) throw a.error || b.error;
      return { messages: a.data as Message[], people: b.data as Person[] };
    },
    [session, eventId],
  );
  const receive = useCallback(
    (v: { messages: Message[]; people: Person[] }) => {
      setRows(v.messages);
      setPeople(v.people);
      setAllowed(true);
      setError("");
    },
    [],
  );
  const failed = useCallback((e: unknown) => {
    setRows([]);
    setPeople([]);
    setAllowed(false);
    setError((e as Error).message);
  }, []);
  const refresh = useConversationSync(load, receive, failed);
  async function run(
    name: string,
    args: Record<string, unknown>,
    success: () => void,
  ) {
    if (busy || !session) return;
    setBusy(true);
    try {
      const r = await accountClient(session).rpc(name, args);
      if (r.error) throw r.error;
      success();
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <T kind="heading">Incident chat</T>
      <T kind="caption">
        Stay in the app. Keep personal numbers and email addresses private.
        Never confront someone or attend an unsafe situation.
      </T>
      {allowed && (
        <>
          <T kind="caption">
            Current team:{" "}
            {people.map((p) => `${p.display_name} · ${p.role}`).join(" / ") ||
              "No assigned responder or coordinator yet."}
          </T>
          {rows.map((m) => (
            <View
              key={m.id}
              style={[
                s.panel,
                {
                  backgroundColor:
                    m.author_role === "owner" ? "#F5DECC" : "#ECE5F0",
                  gap: 6,
                },
              ]}
            >
              <T kind="label">{m.author_name}</T>
              <T kind="caption">
                {m.author_role} · {new Date(m.created_at).toLocaleTimeString()}
              </T>
              <T>{m.content}</T>
            </View>
          ))}
          {rows.length === 50 && (
            <T kind="caption">Showing the latest 50 messages.</T>
          )}
          <Field
            label="Message"
            multiline
            maxLength={2000}
            value={body}
            editable={!busy}
            onChangeText={setBody}
          />
          <Button
            title="Send message"
            icon="send"
            busy={busy}
            disabled={!body.trim()}
            onPress={() =>
              void run(
                "vv2_send_incident_message",
                {
                  p_event: eventId,
                  p_id:
                    pendingMessage.current?.body === body
                      ? pendingMessage.current.id
                      : (pendingMessage.current = {
                          body,
                          id: Crypto.randomUUID(),
                        }).id,
                  p_content: body,
                },
                () => {
                  pendingMessage.current = null;
                  setBody("");
                },
              )
            }
          />
          <T kind="caption">
            Attachments go to the current team named above and the person
            requesting help. New team members won’t inherit them. Up to 5 MiB
            each; removed after seven days.
          </T>
          <CaseEvidence
            key={eventId}
            requestId={eventId}
            context="incident"
            participantIds={people.map((p) => p.user_id)}
            mode="chat"
          />
          {owner ? (
            people.map((p) => (
              <Button
                key={p.user_id}
                title={"Report / block " + p.display_name}
                tone="outline"
                onPress={() => setTarget(p)}
              />
            ))
          ) : (
            <Button
              title="I feel unsafe / report a concern"
              tone="outline"
              onPress={() =>
                setTarget({
                  user_id: "",
                  display_name: "Coordinator safety report",
                  role: "report",
                })
              }
            />
          )}
        </>
      )}
      {target && (
        <View style={s.panel}>
          <T kind="label">{target.display_name}</T>
          <Field
            label="Describe the concern"
            multiline
            value={report}
            onChangeText={setReport}
            maxLength={2000}
          />
          <Button
            title={
              owner
                ? "Submit report and block access"
                : "Report and withdraw from assignment"
            }
            busy={busy}
            disabled={report.trim().length < 10}
            onPress={() =>
              void run(
                owner ? "vv_report_worker" : "vv2_helper_report",
                owner
                  ? {
                      p_worker: target.user_id,
                      p_reason: report,
                      p_event: eventId,
                    }
                  : { p_event: eventId, p_reason: report },
                () => {
                  setTarget(null);
                  setReport("");
                },
              )
            }
          />
          <Button
            title="Cancel report"
            tone="outline"
            onPress={() => setTarget(null)}
          />
        </View>
      )}
      {!!error && <Notice text={error} tone="error" />}
    </View>
  );
}
