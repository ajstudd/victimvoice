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
  s,
  colors,
} from "./ui";
import { useApp } from "../state/AppState";
import { supabase, cloudError, accountClient } from "../lib/supabase";
import { PrivateGate } from "./PrivateGate";
import { useConversationSync } from "../hooks/useConversationSync";
import { insertSupportRequest } from "../lib/cloud-writes";
import { CaseEvidence } from "./CaseEvidence";
import {
  TOPICS,
  URGENCY,
  statusCopy,
  timeAgo,
} from "../../../shared/support-copy";

function SignedIn({ children }: { children: React.ReactNode }) {
  const { session } = useApp();
  return session ? (
    <>{children}</>
  ) : (
    <Page back title="Talk to support">
      <T kind="title">Sign in to talk{"\n"}with support.</T>
      <T>
        Signing in lets you send a message and come back for replies. Your
        private notes stay on this device.
      </T>
      <Button title="Sign in" onPress={() => router.push("/login")} />
      <Button
        title="I need help right now"
        tone="coral"
        icon="phone"
        onPress={() => router.push("/help")}
      />
    </Page>
  );
}

const pillTones = {
  waiting: { bg: colors.peach, fg: colors.ink, dot: colors.coral },
  active: { bg: colors.sage, fg: colors.jade, dot: colors.jade },
  done: { bg: colors.lilac, fg: colors.muted, dot: colors.muted },
};
export function StatusPill({ status }: { status: string }) {
  const copy = statusCopy(status);
  const tone = pillTones[copy.tone];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: tone.bg,
      }}
    >
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: tone.dot,
        }}
      />
      <T
        kind="caption"
        color={tone.fg}
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {copy.label}
      </T>
    </View>
  );
}

function HelpNowLink() {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push("/help")}
      style={{ minHeight: 48, justifyContent: "center" }}
    >
      <T kind="caption">
        Replies aren’t instant. In danger right now?{" "}
        <T kind="caption" style={[s.link, { fontSize: 12 }]}>
          Get help
        </T>
      </T>
    </Pressable>
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
    <Page back title="Talk to support" onRefresh={refresh} refreshing={busy}>
      <T kind="title">Your{"\n"}conversations.</T>
      <Button
        title="Start a new conversation"
        icon="plus"
        onPress={() => router.push("/request-new")}
      />
      {busy ? (
        <T>Loading…</T>
      ) : error ? (
        <>
          <Notice tone="error" text={error} />
          <Button title="Try again" tone="outline" onPress={refresh} />
        </>
      ) : rows.length ? (
        <View style={{ gap: 12 }}>
          {rows.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityLabel={`${statusCopy(row.status).label}. ${row.description}`}
              onPress={() =>
                router.push({ pathname: "/request", params: { id: row.id } })
              }
              style={({ pressed }) => [
                s.panel,
                {
                  backgroundColor: colors.field,
                  borderWidth: 1,
                  borderColor: colors.line,
                  gap: 10,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={s.between}>
                <StatusPill status={row.status} />
                <T kind="caption">{timeAgo(row.created_at)}</T>
              </View>
              <View style={[s.row, { alignItems: "flex-end" }]}>
                <T kind="label" numberOfLines={2} style={{ flex: 1 }}>
                  {row.description}
                </T>
                <Icon name="chevron-right" size={18} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <Empty
          icon="message-circle"
          title="No conversations yet"
          body="When you’re ready, write to the support team in your own words. Only you and the team can read it."
        />
      )}
      {(page > 0 || more) && (
        <View style={s.between}>
          <Button
            title="Newer"
            tone="outline"
            disabled={!page || busy}
            onPress={() => setPage(page - 1)}
          />
          <Button
            title="Older"
            tone="outline"
            disabled={!more || busy}
            onPress={() => setPage(page + 1)}
          />
        </View>
      )}
      <HelpNowLink />
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
function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 52,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: selected ? colors.ink : colors.line,
        backgroundColor: selected ? colors.white : colors.field,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected ? colors.ink : colors.muted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.ink,
            }}
          />
        )}
      </View>
      <T kind="label" style={{ flex: 1 }}>
        {label}
      </T>
    </Pressable>
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
  const [volunteers, setVolunteers] = useState(
    vault.supportDraft?.volunteers || false,
  );
  const [saved, setSaved] = useState("");
  const draftMatches =
    vault.supportDraft?.body === body &&
    vault.supportDraft.category === category &&
    vault.supportDraft.priority === priority &&
    vault.supportDraft.volunteers === volunteers;
  const contact =
    session?.user.email || session?.user.phone || "your account contact";
  async function saveDraft() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await save((v) => ({
        ...v,
        supportDraft: { body, category, priority, volunteers },
      }));
      setSaved("Draft saved on this device only. It hasn’t been sent.");
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
    <Page back title="Talk to support">
      <View style={{ gap: 8 }}>
        <T kind="title">What’s going on?</T>
        <T>
          Write it in your own words. A few lines is enough. You can add more,
          and share photos or files, once the conversation starts.
        </T>
      </View>
      <Field
        label="Your message"
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={20000}
        placeholder="For example: someone keeps messaging me after I asked them to stop…"
      />
      <View style={{ gap: 10 }}>
        <T kind="label">
          What is it about? <T kind="caption">Optional</T>
        </T>
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
        >
          {TOPICS.map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: category === value }}
              onPress={() => setCategory(value)}
              style={{
                paddingHorizontal: 16,
                minHeight: 44,
                justifyContent: "center",
                backgroundColor: category === value ? colors.ink : colors.lilac,
                borderRadius: 22,
              }}
            >
              <T
                kind="caption"
                color={category === value ? colors.paper : colors.ink}
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {label}
              </T>
            </Pressable>
          ))}
        </View>
      </View>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        <T kind="label">When would you like a reply?</T>
        {URGENCY.map(([value, label]) => (
          <Choice
            key={value}
            label={label}
            selected={priority === value}
            onPress={() => setPriority(value)}
          />
        ))}
        {priority === "high" && (
          <View
            style={[
              s.panel,
              { backgroundColor: "#F9E5E2", padding: 16, gap: 10 },
            ]}
          >
            <T kind="label" color={colors.error}>
              Are you in danger right now?
            </T>
            <T kind="caption" color={colors.ink}>
              The support team will see this first, but replies aren’t instant.
              Calling or alerting your people is faster.
            </T>
            <Button
              title="Get help now"
              tone="coral"
              icon="phone"
              onPress={() => router.push("/help")}
            />
          </View>
        )}
      </View>
      <View>
        <Row
          title="Let trained volunteers help too"
          subtitle={
            volunteers
              ? "Supervisors and a volunteer they assign can read this. You can turn it off anytime."
              : "Only supervisors will read this. You can change it anytime."
          }
          end={
            <Switch
              accessibilityLabel="Let trained volunteers help too"
              value={volunteers}
              onValueChange={setVolunteers}
              trackColor={{ true: colors.jade }}
            />
          }
        />
      </View>
      <View style={[s.row, { alignItems: "flex-start" }]}>
        <Icon name="lock" size={16} color={colors.muted} />
        <T kind="caption" style={{ flex: 1 }}>
          Sending shares this message and {contact} with the support team. Your
          notes, circle and location are not included.
        </T>
      </View>
      {Boolean(error) && <Notice text={error} tone="error" />}
      <Button
        title="Send to support"
        icon="send"
        disabled={!body.trim()}
        busy={busy}
        onPress={send}
      />
      {Boolean(saved) && draftMatches ? (
        <Notice text={saved} tone="success" />
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={!body.trim() || busy}
          onPress={saveDraft}
          style={{
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            opacity: !body.trim() ? 0.45 : 1,
          }}
        >
          <T style={s.link}>Not ready? Save as a draft on this device</T>
        </Pressable>
      )}
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
  const [section, setSection] = useState<"conversation" | "files" | "privacy">(
    "conversation",
  );
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
      if (!id) throw new Error("No conversation was selected.");
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
      "Couldn’t check for replies. We’ll try again automatically when you’re connected.",
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
  const status = record ? statusCopy(record.status) : null;
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
                icon="arrow-down"
                onPress={() => {
                  scroll.current?.scrollToEnd({ animated: true });
                  setNewReply(false);
                }}
              />
            )}
            {Boolean(error) && <Notice text={error} tone="error" />}
            <View style={[s.row, { alignItems: "flex-end", gap: 8 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share a photo, file or link"
                onPress={() => setSection("files")}
                style={{
                  width: 48,
                  height: 54,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="paperclip" />
              </Pressable>
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
          </View>
        ) : undefined
      }
    >
      {loading ? (
        <T>Loading conversation…</T>
      ) : record && status && data?.page === page ? (
        <>
          <View style={{ gap: 8 }}>
            <View style={s.between}>
              <StatusPill status={record.status} />
              <T kind="caption">Started {timeAgo(record.created_at)}</T>
            </View>
            {Boolean(status.detail) && <T>{status.detail}</T>}
          </View>
          <View
            accessibilityRole="tablist"
            style={{
              flexDirection: "row",
              padding: 4,
              borderRadius: 16,
              backgroundColor: colors.lilac,
            }}
          >
            {(
              [
                ["conversation", "Messages", "message-circle"],
                ["files", "Files", "paperclip"],
                ["privacy", "Who can see", "lock"],
              ] as const
            ).map(([key, label, icon]) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: section === key }}
                onPress={() => setSection(key)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  flexDirection: "row",
                  gap: 6,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    section === key ? colors.white : "transparent",
                }}
              >
                <Icon
                  name={icon}
                  size={15}
                  color={section === key ? colors.ink : colors.muted}
                />
                <T
                  kind="caption"
                  color={section === key ? colors.ink : colors.muted}
                  style={{
                    fontFamily:
                      section === key ? "Inter_600SemiBold" : "Inter_400Regular",
                  }}
                >
                  {label}
                </T>
              </Pressable>
            ))}
          </View>
          {section === "privacy" && (
            <>
              <Row
                title="Let trained volunteers help"
                subtitle={
                  record.allow_volunteer_support
                    ? "On. Supervisors and a volunteer they assign can read this conversation and its files."
                    : "Off. Only supervisors can read this conversation and its files."
                }
                end={
                  <Switch
                    accessibilityLabel="Let trained volunteers help"
                    value={record.allow_volunteer_support}
                    disabled={busy}
                    trackColor={{ true: colors.jade }}
                    onValueChange={async (value) => {
                      setBusy(true);
                      setError("");
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
              <View style={{ gap: 10 }}>
                {[
                  ["eye-off", "Volunteers never see your email or phone number."],
                  [
                    "user-x",
                    "Turning volunteers off removes their access straight away.",
                  ],
                  [
                    "lock",
                    "Your private notes and circle are never part of this conversation.",
                  ],
                  ["activity", "Supervisors can review who opened your files."],
                ].map(([icon, line]) => (
                  <View key={line} style={[s.row, { alignItems: "flex-start" }]}>
                    <Icon name={icon as "lock"} size={16} color={colors.muted} />
                    <T kind="caption" style={{ flex: 1 }}>
                      {line}
                    </T>
                  </View>
                ))}
              </View>
              <HelpNowLink />
            </>
          )}
          {section === "conversation" && (
            <>
              {!more && (
              <View
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "88%",
                  gap: 4,
                }}
              >
                <View
                  style={{
                    backgroundColor: colors.ink,
                    padding: 14,
                    borderRadius: 18,
                    borderBottomRightRadius: 6,
                  }}
                >
                  <T
                    color={colors.paper}
                    numberOfLines={expanded ? undefined : 6}
                  >
                    {record.description}
                  </T>
                  {record.description.length > 240 && (
                    <Pressable
                      accessibilityRole="button"
                      style={{ minHeight: 40, justifyContent: "center" }}
                      onPress={() => setExpanded((v) => !v)}
                    >
                      <T
                        kind="caption"
                        color={colors.paper}
                        style={{ textDecorationLine: "underline" }}
                      >
                        {expanded ? "Show less" : "Show full message"}
                      </T>
                    </Pressable>
                  )}
                </View>
                <T kind="caption" style={{ textAlign: "right" }}>
                  Your first message · {timeAgo(record.created_at)}
                </T>
              </View>
              )}
              {more && (
                <Button
                  title="Show earlier messages"
                  tone="outline"
                  icon="chevron-up"
                  onPress={() => setPage(page + 1)}
                />
              )}
              {rows.length ? (
                <View style={{ gap: 14 }}>
                  {[...rows].reverse().map((row) => {
                    const mine = row.sender === "user";
                    return (
                      <View
                        key={row.id}
                        style={{
                          alignSelf: mine ? "flex-end" : "flex-start",
                          maxWidth: "88%",
                          gap: 4,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: mine ? colors.ink : colors.white,
                            borderWidth: mine ? 0 : 1,
                            borderColor: colors.line,
                            padding: 14,
                            borderRadius: 18,
                            borderBottomRightRadius: mine ? 6 : 18,
                            borderBottomLeftRadius: mine ? 18 : 6,
                          }}
                        >
                          <T color={mine ? colors.paper : colors.ink} selectable>
                            {row.content}
                          </T>
                        </View>
                        <T
                          kind="caption"
                          style={{ textAlign: mine ? "right" : "left" }}
                        >
                          {mine ? "You" : "Support team"} ·{" "}
                          {timeAgo(row.created_at)}
                        </T>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={[s.panel, { backgroundColor: colors.sage }]}>
                  <View style={s.row}>
                    <Icon name="check-circle" color={colors.jade} />
                    <T kind="label">Sent to the support team</T>
                  </View>
                  <T color={colors.ink}>
                    Their reply will appear here. You can keep adding details
                    below, or tap the paperclip to share screenshots and files.
                  </T>
                </View>
              )}
              {page > 0 && (
                <Button
                  title="Back to latest"
                  tone="outline"
                  onPress={() => setPage(page - 1)}
                />
              )}
              <T kind="caption" style={{ textAlign: "center" }}>
                New replies appear while this screen is open · Pull down to
                check
              </T>
            </>
          )}
          {section === "files" && (
            <CaseEvidence key={record.id} requestId={record.id} />
          )}
        </>
      ) : null}
      {Boolean(syncError) && (
        <>
          <Notice text={syncError} tone="error" />
          <Button
            title="Try again"
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
