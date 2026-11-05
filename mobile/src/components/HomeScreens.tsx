import React, { useEffect, useState } from "react";
import { View, Pressable, Switch, Platform } from "react-native";
import { router } from "expo-router";
import {
  Page,
  T,
  Button,
  Avatar,
  Row,
  Field,
  Notice,
  Empty,
  Icon,
  Badge,
  SectionHeading,
  s,
  colors,
} from "./ui";
import { useApp, Contact, uuid } from "../state/AppState";
import { openCall, composeHelp } from "../lib/actions";
import { normalizePhone } from "../lib/safety";
import { confirmAction } from "../lib/confirm";
import { PrivateGate } from "./PrivateGate";

export function Home() {
  const { vault, ready, notice, session } = useApp();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!vault.journey) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [vault.journey]);
  const contacts = [...vault.contacts].sort(
    (a, b) => Number(b.primary) - Number(a.primary),
  );
  const setup = [
    Boolean(contacts.length),
    Boolean(vault.plan.safePlace.trim() || vault.plan.steps.trim()),
    vault.locked,
  ];
  const completed = setup.filter(Boolean).length;
  return (
    <Page tab={0}>
      <View style={{ gap: 8 }}>
        <T
          kind="caption"
          style={{
            letterSpacing: 1.5,
            color: colors.jade,
            fontFamily: "Inter_600SemiBold",
          }}
        >
          HERE FOR YOUR NEXT STEP
        </T>
        <T kind="title">Here for you.{"\n"}At your pace.</T>
        <T>A familiar place to turn, whenever you need it.</T>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Get help now. Call 112 or message your people"
        onPress={() => router.push("/help")}
        style={({ pressed }) => ({
          backgroundColor: colors.coral,
          borderRadius: 26,
          padding: 22,
          gap: 18,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={s.between}>
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: "#FFFFFF26",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="phone" color={colors.white} size={25} />
          </View>
          <Icon name="arrow-up-right" color={colors.white} size={27} />
        </View>
        <View style={{ gap: 5 }}>
          <T
            kind="heading"
            color={colors.white}
            style={{ fontSize: 29, lineHeight: 36 }}
          >
            Get help now
          </T>
          <T color={colors.white}>Call 112 or reach your trusted people.</T>
        </View>
        <T kind="caption" color={colors.white}>
          You choose the action. Nothing is sent on tap.
        </T>
      </Pressable>
      {vault.sos?.status === "active" && (
        <Button
          title="View active safety request"
          icon="activity"
          onPress={() => router.push("/sos")}
        />
      )}
      {vault.journey && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/journey")}
          style={[s.panel, { backgroundColor: colors.sage }]}
        >
          <View style={s.between}>
            <Icon name="navigation" color={colors.jade} />
            <Badge
              label={
                vault.journey.deadline > now
                  ? "Journey in progress"
                  : "Check-in due"
              }
              tone="success"
            />
          </View>
          <T kind="heading">{vault.journey.destination || "Your journey"}</T>
          <T>
            {vault.journey.deadline > now
              ? `${Math.ceil((vault.journey.deadline - now) / 60000)} min until your local check-in`
              : "Ready to check in with yourself?"}
          </T>
          <T kind="caption">Open check-in → · No automatic contact alerts</T>
        </Pressable>
      )}
      <View style={[s.row, { alignItems: "stretch" }]}>
        <QuickAction
          title="Journey"
          detail="Set a check-in"
          icon="navigation"
          tone={colors.sage}
          onPress={() => router.push("/journey")}
        />
        <QuickAction
          title="Motion check-in"
          detail="Try a rehearsal"
          icon="shield"
          tone={colors.lilac}
          onPress={() => router.push("/safety")}
        />
      </View>
      <View style={[s.panel, { backgroundColor: colors.peach, gap: 14 }]}>
        <View style={s.between}>
          <View style={s.row}>
            <Icon name="message-circle" size={25} />
            <T kind="heading">Talk to support</T>
          </View>
          <Icon name="heart" size={20} />
        </View>
        <T color={colors.ink}>
          You don’t have to find the words all at once. Share a concern, media,
          or a link.
        </T>
        <Button
          title="Ask for support"
          icon="arrow-up-right"
          onPress={() => router.push("/request-new")}
        />
        <Pressable
          accessibilityRole="button"
          style={{ minHeight: 48, justifyContent: "center" }}
          onPress={() => router.push("/requests")}
        >
          <View style={s.between}>
            <T kind="label">My conversations</T>
            <Icon name="arrow-right" size={18} />
          </View>
        </Pressable>
        <T kind="caption">
          Private support inbox · No guaranteed response time
        </T>
      </View>
      <View style={{ gap: 12 }}>
        <SectionHeading
          title="Your people"
          action="My circle"
          onPress={() => router.push("/circle")}
        />
        {contacts.length ? (
          contacts.slice(0, 3).map((c, i) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={"Open contact " + c.name}
              onPress={() =>
                router.push({ pathname: "/contact", params: { id: c.id } })
              }
              style={[
                s.row,
                {
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderRadius: 18,
                  backgroundColor: colors.field,
                },
              ]}
            >
              <Avatar name={c.name} index={i} />
              <View style={{ flex: 1, gap: 3 }}>
                <T kind="label">{c.name}</T>
                <T kind="caption">
                  {c.primary
                    ? "Primary contact"
                    : c.relationship || "Trusted contact"}
                </T>
              </View>
              <Icon name="chevron-right" size={18} />
            </Pressable>
          ))
        ) : (
          <View style={[s.panel, { backgroundColor: colors.lilac }]}>
            <Icon name="users" size={29} />
            <T kind="heading">Start with one person.</T>
            <T>
              Choose someone you trust. Saving a contact sends no invitation or
              alert.
            </T>
            <Button
              title="Add my first contact"
              icon="user-plus"
              onPress={() => router.push("/contact")}
            />
          </View>
        )}
      </View>
      {completed < 3 && (
        <View
          style={[
            s.panel,
            {
              backgroundColor: colors.field,
              borderWidth: 1,
              borderColor: colors.line,
            },
          ]}
        >
          <View style={s.between}>
            <T kind="label">Make this space yours</T>
            <T kind="caption">{completed} of 3</T>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {setup.map((done, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: done ? colors.jade : colors.line,
                }}
              />
            ))}
          </View>
          <Row
            title={
              !setup[0]
                ? "Choose your first contact"
                : !setup[1]
                  ? "Create your safety plan"
                  : "Protect your private space"
            }
            subtitle={
              !setup[0]
                ? "Keep a trusted person within reach"
                : !setup[1]
                  ? "A place to go and steps you choose"
                  : "Use your device screen lock"
            }
            icon={!setup[0] ? "user-plus" : !setup[1] ? "list" : "lock"}
            onPress={() =>
              router.push(
                !setup[0] ? "/contact" : !setup[1] ? "/plan" : "/settings",
              )
            }
          />
        </View>
      )}
      <View style={{ gap: 4 }}>
        <SectionHeading
          title="A little guidance"
          action="Explore"
          onPress={() => router.push("/guide")}
        />
        <Row
          title="When something feels wrong"
          subtitle="People, options, and your next step"
          icon="book-open"
          onPress={() =>
            router.push({
              pathname: "/guide-detail",
              params: { id: "followed" },
            })
          }
        />
        <Row
          title="My safety plan"
          subtitle="Keep your chosen next steps close"
          icon="list"
          onPress={() => router.push("/plan")}
        />
      </View>
      {!session && (
        <Button
          title="Connect my account"
          tone="outline"
          icon="log-in"
          onPress={() => router.push("/login")}
        />
      )}
      {Platform.OS === "web" && (
        <T kind="caption">
          Browser preview · Private changes last for this session. The Android
          app stores them encrypted on your device.
        </T>
      )}
      {!ready && <T>Opening your on-device space…</T>}
      {Boolean(notice) && <Notice text={notice} tone="error" />}
    </Page>
  );
}
function QuickAction({
  title,
  detail,
  icon,
  tone,
  onPress,
}: {
  title: string;
  detail: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  tone: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        padding: 16,
        borderRadius: 20,
        gap: 12,
        backgroundColor: tone,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Icon name={icon} size={23} />
      <View style={{ gap: 4 }}>
        <T kind="label">{title}</T>
        <T kind="caption">{detail}</T>
      </View>
    </Pressable>
  );
}
export function Circle() {
  return (
    <PrivateGate>
      <CircleContent />
    </PrivateGate>
  );
}
function CircleContent() {
  const { vault, syncContacts, restoreContacts, session } = useApp();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function run(fn: () => Promise<void>, message: string) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await fn();
      setNotice(message);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="My Circle" tab={1}>
      <T kind="title">Your people.</T>
      <T>Support starts with someone you choose.</T>
      {vault.contacts.length > 0 && (
        <View style={{ alignItems: "center", paddingVertical: 12, gap: 6 }}>
          <Avatar name="You" size={66} />
          <T kind="caption">You choose the connection</T>
          <View style={{ height: 24, width: 1, backgroundColor: "#BAA8BF" }} />
          <View
            style={{ height: 1, width: "65%", backgroundColor: "#BAA8BF" }}
          />
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              justifyContent: "space-around",
            }}
          >
            {vault.contacts.slice(0, 3).map((c, i) => (
              <View
                key={c.id}
                style={{
                  alignItems: "center",
                  gap: 6,
                  paddingTop: 12,
                  flex: 1,
                }}
              >
                <Avatar name={c.name} index={i} size={62} />
                <T kind="label" numberOfLines={1}>
                  {c.name}
                </T>
              </View>
            ))}
          </View>
        </View>
      )}
      {!vault.contacts.length && (
        <Empty
          title="Make your circle yours"
          body="Add a person you would choose to contact. Nobody is notified when you save a contact."
          icon="users"
        />
      )}
      <View>
        {[...vault.contacts]
          .sort((a, b) => Number(b.primary) - Number(a.primary))
          .map((c, i) => (
            <View
              accessibilityRole="none"
              key={c.id}
              style={[
                s.between,
                {
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderColor: colors.line,
                },
              ]}
            >
              <Avatar name={c.name} index={i} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={"Edit " + c.name}
                onPress={() =>
                  router.push({ pathname: "/contact", params: { id: c.id } })
                }
                style={{ flex: 1, minHeight: 48, justifyContent: "center" }}
              >
                <T kind="label">{c.name}</T>
                <T kind="caption">
                  {c.primary
                    ? "Primary contact"
                    : c.relationship || "Trusted contact"}
                </T>
              </Pressable>
              <Pressable
                accessibilityLabel={"Call " + c.name}
                accessibilityRole="button"
                onPress={() =>
                  run(() => openCall(c.phone), "Calling app opened.")
                }
                style={{
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="phone" />
              </Pressable>
              <Icon name="chevron-right" size={16} />
            </View>
          ))}
      </View>
      <Button
        title="Add a trusted contact"
        icon="user-plus"
        onPress={() => router.push("/contact")}
        disabled={vault.contacts.length >= 20}
      />
      <Button
        title="Try a test message"
        tone="outline"
        disabled={!vault.contacts.length}
        busy={busy}
        onPress={() =>
          run(
            () =>
              composeHelp(
                vault.contacts.map((c) => c.phone),
                undefined,
                true,
              ),
            "SMS app opened with your saved contact numbers. Review and send it there.",
          )
        }
      />
      <T kind="caption">
        You decide what each person receives. Contacts are saved on this device;
        saving does not send invitations or alerts.
      </T>
      {session && (
        <>
          {Boolean(vault.removedContactIds?.length) && (
            <Notice
              text={`${vault.removedContactIds!.length} cloud contact removal(s) pending. Use Sync my circle when connected. They cannot reappear through Restore while removal is pending.`}
            />
          )}
          <Row
            title="Sync my circle"
            subtitle="Copy these contact details to your private account"
            icon="upload-cloud"
            onPress={() =>
              run(syncContacts, "Your circle was copied to your account.")
            }
          />
          <Row
            title="Restore cloud contacts"
            subtitle="Merge your saved contacts onto this device"
            icon="download-cloud"
            onPress={() => run(restoreContacts, "Cloud contacts restored.")}
          />
        </>
      )}
      {Boolean(notice) && <Notice text={notice} />}
    </Page>
  );
}
export function ContactForm({ id }: { id?: string }) {
  return (
    <PrivateGate>
      <ContactContent id={id} />
    </PrivateGate>
  );
}
function ContactContent({ id }: { id?: string }) {
  const { vault, save, session } = useApp();
  const current = vault.contacts.find((c) => c.id === id);
  const [name, setName] = useState(current?.name || "");
  const [phone, setPhone] = useState(current?.phone || "+91");
  const [relationship, setRelation] = useState(current?.relationship || "");
  const [primary, setPrimary] = useState(
    current?.primary || !vault.contacts.length,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (!name.trim()) throw new Error("Enter a name.");
      if (!current && vault.contacts.length >= 20)
        throw new Error("Your circle can hold up to 20 contacts.");
      const normalized = normalizePhone(phone);
      if (vault.contacts.some((c) => c.phone === normalized && c.id !== id))
        throw new Error("That phone number is already in your circle.");
      const contact: Contact = {
        id: current?.id || uuid(),
        name: name.trim(),
        phone: normalized,
        relationship: relationship.trim(),
        primary,
      };
      await save((v) => {
        if (
          v.contacts.some((c) => c.phone === normalized && c.id !== contact.id)
        )
          throw new Error("That phone number is already in your circle.");
        const contacts = v.contacts
          .filter((c) => c.id !== contact.id)
          .map((c) => (primary ? { ...c, primary: false } : c));
        contacts.push(contact);
        return { ...v, contacts };
      });
      router.replace("/circle");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await save((v) => ({
        ...v,
        contacts: v.contacts.filter((c) => c.id !== id),
        removedContactIds:
          session && id
            ? [...new Set([...(v.removedContactIds || []), id])]
            : v.removedContactIds,
      }));
      router.replace("/circle");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page back title={current ? "Edit contact" : "My Circle"}>
      <T kind="title">Someone you trust.</T>
      <T>Choose a person you feel comfortable reaching out to.</T>
      <Field label="Name" value={name} onChangeText={setName} maxLength={100} />
      <Field
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      <Field
        label="Relationship (optional)"
        value={relationship}
        onChangeText={setRelation}
        maxLength={100}
      />
      <Row
        title="Primary contact"
        subtitle="Show this person first"
        end={
          <Switch
            accessibilityLabel="Primary contact"
            value={primary}
            onValueChange={setPrimary}
            trackColor={{ true: colors.jade }}
          />
        }
      />
      <Notice text="Saving a contact doesn't share your location or send a message. You'll choose that when asking for help." />
      {Boolean(error) && <Notice tone="error" text={error} />}
      <Button title="Save contact" onPress={submit} busy={busy} />
      {current && (
        <Button
          title="Remove contact"
          tone="outline"
          onPress={() =>
            confirmAction(
              "Remove this contact?",
              session
                ? "This removes the contact from this device now. Any cloud copy is removed the next time you use Sync my circle. Messages already sent are not removed."
                : "This removes the contact from this device. Messages already sent are not removed.",
              remove,
            )
          }
        />
      )}
    </Page>
  );
}
export function Plan() {
  return (
    <PrivateGate>
      <PlanContent />
    </PrivateGate>
  );
}
function PlanContent() {
  const { vault, save } = useApp();
  const [place, setPlace] = useState(vault.plan.safePlace);
  const [steps, setSteps] = useState(vault.plan.steps);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Page back title="My safety plan">
      <T kind="title">A plan on your terms.</T>
      <T>Keep the details you choose close at hand.</T>
      <Row
        title="People I can call"
        subtitle={
          vault.contacts.map((c) => c.name).join(", ") ||
          "Choose your trusted contacts"
        }
        icon="users"
        onPress={() => router.push("/circle")}
      />
      <Field
        label="A place I can go (optional)"
        value={place}
        onChangeText={setPlace}
        maxLength={1000}
      />
      <Field
        label="Steps that help me (optional)"
        value={steps}
        onChangeText={setSteps}
        multiline
        maxLength={4000}
      />
      <Notice text="Your plan stays on this device. Saving it does not share it with contacts or support services." />
      <Button
        title="Save my plan"
        busy={busy}
        onPress={async () => {
          if (busy) return;
          setBusy(true);
          try {
            await save((v) => ({ ...v, plan: { safePlace: place, steps } }));
            setMessage("Your plan is saved on this device.");
          } catch {
            setMessage("The plan could not be saved. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      />
      {Boolean(message) && <Notice text={message} />}
    </Page>
  );
}
