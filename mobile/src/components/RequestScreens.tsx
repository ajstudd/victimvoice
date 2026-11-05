import React, { useCallback, useRef, useState } from "react";
import { View, Pressable, Switch, ScrollView, TextInput } from "react-native";
import { router } from "expo-router";
import {
  Page,
  T,
  Button,
  Field,
  Notice,
  Row,
  Empty,
  Icon,
  Badge,
  s,
  colors,
} from "./ui";
import { useApp } from "../state/AppState";
import { supabase, cloudError, accountClient } from "../lib/supabase";
import { PrivateGate } from "./PrivateGate";
import { useConversationSync } from "../hooks/useConversationSync";
import { insertSupportRequest } from "../lib/cloud-writes";
import { CaseEvidence } from "./CaseEvidence";
function SignedIn({ children }: { children: React.ReactNode }) {
  const { session } = useApp();
  return session ? (
    <>{children}</>
  ) : (
    <Page back title="Support requests">
      <T kind="title">Your support inbox.</T>
      <T>
        Sign in to submit and follow a support request. Your private notes stay
        separate.
      </T>
      <Button title="Sign in" onPress={() => router.push("/login")} />
      <Button
        title="Get help without signing in"
        tone="outline"
        onPress={() => router.push("/help")}
      />
    </Page>
  );
}
export function Requests() {
  return (
    <PrivateGate>
      <SignedIn>
        <RequestList />
      </SignedIn>
    </PrivateGate>
  );
}
function RequestList() {
  const { session } = useApp();
  const userId = session!.user.id;
  type CaseRow = {
    id: string;
    description: string;
    status: string;
    created_at: string;
  };
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [loadedPage, setLoadedPage] = useState(-1);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const result = await supabase
        .from("support_requests")
        .select("id,description,status,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(page * 20, page * 20 + 20)
        .abortSignal(signal);
      if (result.error) throw result.error;
      return {
        rows: (result.data || []).slice(0, 20),
        more: (result.data || []).length > 20,
        page,
      };
    },
    [page, userId],
  );
  const receive = useCallback(
    (value: { rows: CaseRow[]; more: boolean; page: number }) => {
      setRows(value.rows);
      setMore(value.more);
      setLoadedPage(value.page);
      setError("");
    },
    [],
  );
  const failed = useCallback((e: unknown) => setError(cloudError(e)), []);
  const refresh = useConversationSync(load, receive, failed);
  const busy = loadedPage !== page && !error;
  return (
    <Page back title="My conversations" onRefresh={refresh} refreshing={busy}>
      <T kind="title">Your support inbox.</T>
      <Notice text="Your cases are private to you and the authorized support team. For immediate danger, use Get help; this inbox has no guaranteed response time." />
      {busy ? (
        <T>Loading requests…</T>
      ) : error ? (
        <>
          <Notice tone="error" text={error} />
          <Button title="Try again" tone="outline" onPress={refresh} />
        </>
      ) : rows.length ? (
        <View>
          {rows.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: "/request", params: { id: row.id } })
              }
              style={[
                s.panel,
                {
                  backgroundColor: colors.field,
                  borderWidth: 1,
                  borderColor: colors.line,
                  marginBottom: 12,
                  gap: 12,
                },
              ]}
            >
              <View style={s.between}>
                <Badge
                  label={row.status.replaceAll("_", " ")}
                  tone={row.status === "resolved" ? "success" : "neutral"}
                />
                <T kind="caption">
                  {new Date(row.created_at).toLocaleDateString()}
                </T>
              </View>
              <T kind="label" numberOfLines={3}>
                {row.description}
              </T>
              <View style={s.between}>
                <T kind="caption">Case #{row.id.slice(0, 8)}</T>
                <Icon name="arrow-right" size={18} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <Empty
          title="No requests shared yet"
          body="You can keep notes privately before choosing whether to ask for support."
        />
      )}
      <Button
        title="Ask for support"
        onPress={() => router.push("/request-new")}
      />
      <View style={s.between}>
        <Button
          title="Previous"
          tone="outline"
          disabled={!page || busy}
          onPress={() => setPage(page - 1)}
        />
        <T kind="caption">Page {page + 1}</T>
        <Button
          title="Next"
          tone="outline"
          disabled={!more || busy}
          onPress={() => setPage(page + 1)}
        />
      </View>
    </Page>
  );
}
export function NewRequest() {
  return (
    <PrivateGate>
      <SignedIn>
        <NewRequestForm />
      </SignedIn>
    </PrivateGate>
  );
}
function NewRequestForm() {
  const { vault, save, session } = useApp();
  const [body, setBody] = useState(vault.supportDraft?.body || "");
  const [priority, setPriority] = useState(
    vault.supportDraft?.priority || "medium",
  );
  const [category, setCategory] = useState(
    vault.supportDraft?.category || "other",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const [volunteers, setVolunteers] = useState(
    vault.supportDraft?.volunteers || false,
  );
  const [saved, setSaved] = useState("");
  const draftMatches =
    vault.supportDraft?.body === body &&
    vault.supportDraft.category === category &&
    vault.supportDraft.priority === priority &&
    vault.supportDraft.volunteers === volunteers;
  async function saveDraft() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await save((v) => ({
        ...v,
        supportDraft: { body, category, priority, volunteers },
      }));
      setSaved("Draft saved on this device. It has not been shared.");
    } catch (e) {
      setError(cloudError(e));
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (busy || !body.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await insertSupportRequest(
        accountClient(session!),
        {
          description: body.trim(),
          severity_level: priority,
          harassment_type: category,
          allow_volunteer_support: volunteers,
        },
      );
      if (error) throw error;
      // Submission succeeded even if local cleanup fails; never invite a duplicate submission.
      try {
        await save((v) => ({ ...v, supportDraft: undefined }));
      } catch {}
      const current = await supabase.auth.getSession();
      if (current.data.session?.user.id === session!.user.id)
        router.replace({ pathname: "/request", params: { id: data.id } });
    } catch (e) {
      setError(cloudError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page back title="Ask for support">
      <Badge
        label={review ? "2 of 2 · Review & share" : "1 of 2 · Your concern"}
      />
      <T kind="title">Share only{"\n"}what you choose.</T>
      <Notice text="Recipient: project supervisors and, only if you allow it, approved volunteers assigned to this case. This inbox has no promised response time. For immediate help, use emergency calling or your circle." />
      {review ? (
        <>
          <T kind="heading">Review before sending</T>
          <T>{body}</T>
          <T kind="caption">
            Category: {category.replace(/_/g, " ")} · Priority: {priority}
          </T>
          <T kind="caption">
            Assigned volunteer access: {volunteers ? "Allowed" : "Off"}. You can
            change this later.
          </T>
          <Notice
            text={`Your message and account contact (${session?.user.email || session?.user.phone || "your account"}) will be shared. Your private notes, circle and location are not included.`}
          />
          <Button title="Submit this request" busy={busy} onPress={send} />
          <Button
            title="Keep editing"
            tone="outline"
            onPress={() => setReview(false)}
          />
        </>
      ) : (
        <>
          <Field
            label="What would you like help with?"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={20000}
            placeholder="Write what you feel comfortable sharing…"
          />
          <T kind="label">Category</T>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {[
              ["other", "Other"],
              ["cyber_harassment", "Online"],
              ["workplace_harassment", "Workplace"],
              ["stalking", "Stalking"],
              ["verbal_abuse", "Verbal abuse"],
              ["physical_threat", "Physical threat"],
            ].map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: category === value }}
                onPress={() => setCategory(value)}
                style={{
                  padding: 14,
                  minHeight: 48,
                  backgroundColor:
                    category === value ? colors.ink : colors.lilac,
                  borderRadius: 20,
                }}
              >
                <T
                  kind="caption"
                  color={category === value ? colors.paper : colors.ink}
                >
                  {label}
                </T>
              </Pressable>
            ))}
          </View>
          <T kind="label">Requested priority</T>
          <View style={s.row}>
            {["low", "medium", "high"].map((level) => (
              <Pressable
                key={level}
                accessibilityRole="button"
                accessibilityState={{ selected: priority === level }}
                onPress={() => setPriority(level)}
                style={{
                  padding: 14,
                  minHeight: 48,
                  borderRadius: 20,
                  backgroundColor:
                    priority === level ? colors.ink : colors.lilac,
                }}
              >
                <T
                  kind="caption"
                  color={priority === level ? colors.paper : colors.ink}
                >
                  {level}
                </T>
              </Pressable>
            ))}
          </View>
          <Button
            title="Review request"
            disabled={!body.trim()}
            onPress={() => setReview(true)}
          />
          <Row
            title="Allow assigned volunteers"
            subtitle="Approved volunteers can support this case and review what you share. You can withdraw access later."
            end={
              <Switch
                accessibilityLabel="Allow assigned volunteers to support this case"
                value={volunteers}
                onValueChange={setVolunteers}
                trackColor={{ true: colors.jade }}
              />
            }
          />
        </>
      )}
      <Button
        title="Save draft on this device"
        icon="save"
        tone="outline"
        disabled={!body.trim()}
        busy={busy}
        onPress={saveDraft}
      />
      {Boolean(saved) && draftMatches && <Notice text={saved} tone="success" />}
      {Boolean(error) && <Notice text={error} tone="error" />}
      <Button
        title="Open immediate help"
        tone="outline"
        onPress={() => router.push("/help")}
      />
    </Page>
  );
}
export function RequestDetail({ id }: { id?: string }) {
  const { session } = useApp();
  return (
    <PrivateGate>
      <SignedIn>
        <RequestContent key={`${session?.user.id}:${id}`} id={id} />
      </SignedIn>
    </PrivateGate>
  );
}
function RequestContent({ id }: { id?: string }) {
  const { session } = useApp();
  const [section, setSection] = useState<
    "conversation" | "evidence" | "privacy"
  >("conversation");
  const [expanded, setExpanded] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const nearBottom = useRef(true);
  const forceBottom = useRef(false);
  const [newReply, setNewReply] = useState(false);
  type Conversation = {
    record: {
      id: string;
      description: string;
      status: string;
      created_at: string;
      allow_volunteer_support: boolean;
    };
    rows: { id: string; sender: string; content: string; created_at: string }[];
    more: boolean;
    page: number;
  };
  const [data, setData] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const load = useCallback(
    async (signal: AbortSignal): Promise<Conversation> => {
      if (!id) throw new Error("No request was selected.");
      const [request, comments] = await Promise.all([
        supabase
          .from("support_requests")
          .select("id,description,status,created_at,allow_volunteer_support")
          .eq("id", id)
          .abortSignal(signal)
          .single(),
        supabase
          .from("comments")
          .select("id,sender,content,created_at")
          .eq("request_id", id)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(page * 30, page * 30 + 30)
          .abortSignal(signal),
      ]);
      if (request.error) throw request.error;
      if (comments.error) throw comments.error;
      return {
        record: request.data,
        rows: (comments.data || []).slice(0, 30),
        more: (comments.data || []).length > 30,
        page,
      };
    },
    [id, page],
  );
  const latestReply = useRef<string | undefined>(undefined);
  const receive = useCallback((value: Conversation) => {
    if (
      value.page === 0 &&
      latestReply.current &&
      latestReply.current !== value.rows[0]?.id &&
      !nearBottom.current
    )
      setNewReply(true);
    latestReply.current = value.rows[0]?.id;
    setData(value);
    setSyncError("");
  }, []);
  const failed = useCallback(() => {
    setSyncError(
      "Could not check for replies. We will retry automatically when connected.",
    );
  }, []);
  const refresh = useConversationSync(load, receive, failed);
  const record = data?.record;
  const rows = data?.page === page ? data.rows : [];
  const more = data?.page === page && data.more;
  const loading = data?.page !== page && !syncError;
  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await accountClient(session!)
        .from("comments")
        .insert({ request_id: id, content: text.trim() });
      if (error) throw error;
      setText("");
      forceBottom.current = true;
      if (page === 0) refresh();
      else setPage(0);
    } catch (e) {
      setError(cloudError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      back
      title="Support conversation"
      scrollRef={scroll}
      onRefresh={refresh}
      refreshing={loading}
      onScroll={(e) => {
        const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
        nearBottom.current =
          contentSize.height - layoutMeasurement.height - contentOffset.y < 120;
        if (nearBottom.current) setNewReply(false);
      }}
      onContentSizeChange={() => {
        if (
          section === "conversation" &&
          page === 0 &&
          (nearBottom.current || forceBottom.current)
        ) {
          scroll.current?.scrollToEnd({ animated: false });
          forceBottom.current = false;
        }
      }}
      footer={
        section === "conversation" && record ? (
          <View style={{ gap: 8 }}>
            {newReply && (
              <Button
                title="New reply · Jump to latest"
                tone="outline"
                onPress={() => {
                  scroll.current?.scrollToEnd({ animated: true });
                  setNewReply(false);
                }}
              />
            )}
            <View style={[s.row, { alignItems: "flex-end" }]}>
              <TextInput
                accessibilityLabel="Your message to support"
                placeholder="Write a message…"
                placeholderTextColor={colors.muted}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={5000}
                style={[s.input, { flex: 1, minHeight: 54, maxHeight: 140 }]}
                editable={!busy}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send message"
                accessibilityState={{ disabled: busy || !text.trim(), busy }}
                disabled={busy || !text.trim()}
                onPress={send}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  backgroundColor: colors.ink,
                  opacity: busy || !text.trim() ? 0.45 : 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={busy ? "clock" : "send"} color={colors.paper} />
              </Pressable>
            </View>
            <T kind="caption">
              Only this case’s support team can read your message.
            </T>
            {Boolean(error) && <Notice text={error} tone="error" />}
          </View>
        ) : undefined
      }
    >
      {loading ? (
        <T>Loading request…</T>
      ) : record && data?.page === page ? (
        <>
          <View style={s.panel}>
            <View style={s.between}>
              <Badge
                label={record.status.replace(/_/g, " ")}
                tone={record.status === "resolved" ? "success" : "neutral"}
              />
              <Icon name="message-circle" size={21} />
            </View>
            <T kind="caption">Case #{record.id.slice(0, 8)}</T>
            <T numberOfLines={expanded ? undefined : 3}>{record.description}</T>
            {record.description.length > 140 && (
              <Pressable
                accessibilityRole="button"
                style={{ minHeight: 48, justifyContent: "center" }}
                onPress={() => setExpanded((v) => !v)}
              >
                <T style={s.link}>
                  {expanded ? "Show less" : "Read original request"}
                </T>
              </Pressable>
            )}
          </View>
          <View style={[s.row, { gap: 8 }]}>
            {(
              [
                ["conversation", "Conversation"],
                ["evidence", "Evidence"],
                ["privacy", "Team & privacy"],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: section === key }}
                onPress={() => setSection(key)}
                style={{
                  flex: 1,
                  minHeight: 52,
                  padding: 9,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: section === key ? colors.ink : colors.lilac,
                }}
              >
                <T
                  kind="caption"
                  color={section === key ? colors.paper : colors.ink}
                  style={{ textAlign: "center" }}
                >
                  {label}
                </T>
              </Pressable>
            ))}
          </View>
          {section === "privacy" && (
            <>
              <Notice text="A received request does not mean someone is monitoring an emergency. This inbox has no guaranteed response time." />
              <Row
                title="Assigned volunteer support"
                subtitle={
                  record.allow_volunteer_support
                    ? "Approved, assigned volunteers can view this case. Turn off to revoke their access."
                    : "Only supervisors can support this case. Your contact details stay outside the volunteer workspace."
                }
                end={
                  <Switch
                    accessibilityLabel="Allow assigned volunteers"
                    value={record.allow_volunteer_support}
                    disabled={busy}
                    trackColor={{ true: colors.jade }}
                    onValueChange={async (value) => {
                      setBusy(true);
                      try {
                        const result = await supabase.rpc(
                          "vv_set_support_consent",
                          { p_request_id: id, p_allowed: value },
                        );
                        if (result.error) throw result.error;
                        refresh();
                      } catch (e) {
                        setError(cloudError(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                }
              />
              <T kind="caption">
                Turning off volunteer access cancels assignments. Your private
                notes and circle are never included in this case. Supervisors
                can review support activity.
              </T>
            </>
          )}
          {section === "conversation" && (
            <>
              <View style={s.row}>
                <T kind="caption" style={{ flex: 1 }}>
                  Replies update automatically here. Closed-app notifications
                  are not enabled.
                </T>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Check for replies now"
                  onPress={refresh}
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="refresh-cw" size={19} />
                </Pressable>
              </View>
              {rows.length ? (
                <View style={{ gap: 14 }}>
                  {[...rows].reverse().map((row) => (
                    <View
                      key={row.id}
                      style={[
                        s.panel,
                        {
                          backgroundColor:
                            row.sender === "user" ? colors.lilac : colors.sage,
                          alignSelf:
                            row.sender === "user" ? "flex-end" : "flex-start",
                          maxWidth: "94%",
                          padding: 16,
                          borderRadius: 18,
                        },
                      ]}
                    >
                      <T kind="caption">
                        {row.sender === "user" ? "You" : "Support team"} ·
                        {new Date(row.created_at).toLocaleString()}
                      </T>
                      <T color={colors.ink}>{row.content}</T>
                    </View>
                  ))}
                </View>
              ) : (
                <Empty
                  title="Your message is received"
                  body="Replies will appear here. You can add more details below or share media in Evidence."
                  icon="message-circle"
                />
              )}
              {(page > 0 || more) && (
                <View style={s.between}>
                  <Button
                    title="Newer"
                    tone="outline"
                    disabled={!page}
                    onPress={() => setPage(page - 1)}
                  />
                  <Button
                    title="Older"
                    tone="outline"
                    disabled={!more}
                    onPress={() => setPage(page + 1)}
                  />
                </View>
              )}
            </>
          )}
          {section === "evidence" && (
            <CaseEvidence key={record.id} requestId={record.id} />
          )}
        </>
      ) : null}
      {Boolean(syncError) && (
        <>
          <Notice text={syncError} tone="error" />
          <Button
            title="Try checking again"
            tone="outline"
            icon="refresh-cw"
            onPress={refresh}
          />
        </>
      )}
      {Boolean(error) && section !== "conversation" && (
        <Notice text={error} tone="error" />
      )}
    </Page>
  );
}
