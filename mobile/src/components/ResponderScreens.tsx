import React, { useCallback, useState, useEffect } from "react";
import { View, Switch } from "react-native";
import { router } from "expo-router";
import { Page, T, Field, Button, Row, Notice, Badge, s } from "./ui";
import { IncidentChat } from "./IncidentChat";
import { PILOT_REGIONS, isUuid } from "../../../shared/sos";
import { StaffMfa } from "./StaffMfa";
import { PrivateGate } from "./PrivateGate";
import { useApp } from "../state/AppState";
import { accountClient } from "../lib/supabase";
import { currentLocation } from "../lib/actions";
import { registerResponderPush } from "../lib/push";
import { useConversationSync } from "../hooks/useConversationSync";
import type { SosRecord } from "../lib/sos-client";
export function Responder() {
  return (
    <PrivateGate>
      <VolunteerEntry />
    </PrivateGate>
  );
}
type Application = {
  display_name: string;
  status: string;
  scope_id: string;
  field_status: string;
  decision_reason: string | null;
  review_due: string | null;
  field_review_due: string | null;
  languages: string;
  skills: string;
  availability: string;
};
function VolunteerEntry() {
  const { session } = useApp();
  const [application, setApplication] = useState<Application | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(""),
    [area, setArea] = useState("bhopal"),
    [org, setOrg] = useState(""),
    [languages, setLanguages] = useState(""),
    [skills, setSkills] = useState(""),
    [availability, setAvailability] = useState(""),
    [consent, setConsent] = useState(false),
    [note, setNote] = useState("");
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!session) return null;
      const r = await accountClient(session)
        .rpc("vv2_volunteer_profile")
        .abortSignal(signal);
      if (r.error) throw r.error;
      return r.data?.application as Application | null;
    },
    [session],
  );
  const receive = useCallback((a: Application | null) => {
    setApplication(a);
    setReady(true);
    setError("");
  }, []);
  const failed = useCallback((e: unknown) => {
    setReady(false);
    setError((e as Error).message);
  }, []);
  const refresh = useConversationSync(load, receive, failed);
  if (
    application?.status === "approved" &&
    application.field_status === "approved"
  )
    return (
      <StaffMfa>
        <ResponderContent />
      </StaffMfa>
    );
  return (
    <Page back title="Offer support" onRefresh={refresh}>
      <Badge label="LOCAL VOLUNTEERS" />
      <T kind="title">Help with care.</T>
      <T>
        Apply to support people in your area. An employee will review your
        application, checks and training. Field response needs separate approval
        from an area admin.
      </T>
      {!session ? (
        <Button
          title="Sign in to apply"
          onPress={() => router.push("/login")}
        />
      ) : !ready ? (
        <T>Checking your application…</T>
      ) : application ? (
        <>
          <View style={s.panel}>
            <T kind="heading">{application.display_name}</T>
            <T>Application: {application.status.replaceAll("_", " ")}</T>
            <T>Field response: {application.field_status}</T>
            <T>
              {application.decision_reason ||
                "Your application is waiting for a local employee to review it."}
            </T>
            {application.review_due && (
              <T kind="caption">
                Review due{" "}
                {new Date(application.review_due).toLocaleDateString()}
              </T>
            )}
          </View>
          {["changes_requested", "rejected"].includes(application.status) && (
            <>
              <T kind="heading">Correct or appeal</T>
              <Field
                label="Languages"
                value={languages}
                onChangeText={setLanguages}
              />
              <Field
                label="Relevant skills and training"
                multiline
                value={skills}
                onChangeText={setSkills}
              />
              <Field
                label="Availability and local area"
                multiline
                value={availability}
                onChangeText={setAvailability}
              />
              <Field
                label="What should the reviewer reconsider?"
                multiline
                value={note}
                onChangeText={setNote}
              />
              <Button
                title="Submit for another review"
                busy={busy}
                disabled={note.trim().length < 10}
                onPress={async () => {
                  setBusy(true);
                  try {
                    const r = await accountClient(session).rpc(
                      "vv2_correct_application",
                      {
                        p_languages: languages,
                        p_skills: skills,
                        p_availability: availability,
                        p_note: note,
                      },
                    );
                    if (r.error) throw r.error;
                    refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </>
          )}
          <T kind="caption">
            Applying gives no access to people’s cases or locations. You will be
            asked to set up an authenticator before receiving assignments.
          </T>
        </>
      ) : (
        <>
          <Field
            label="Your display name"
            value={name}
            onChangeText={setName}
            maxLength={80}
          />
          <T kind="label">Where can you help?</T>
          {PILOT_REGIONS.map((r) => (
            <Button
              key={r.id}
              title={(area === r.id ? "✓ " : "") + r.name}
              tone={area === r.id ? "plum" : "outline"}
              onPress={() => setArea(r.id)}
            />
          ))}
          <Field
            label="Organisation (optional)"
            value={org}
            onChangeText={setOrg}
            maxLength={120}
          />
          <Field
            label="Languages you can use"
            value={languages}
            onChangeText={setLanguages}
            maxLength={250}
          />
          <Field
            label="Relevant skills and training"
            value={skills}
            onChangeText={setSkills}
            multiline
            maxLength={500}
          />
          <Field
            label="Availability and local knowledge"
            value={availability}
            onChangeText={setAvailability}
            multiline
            maxLength={500}
          />
          <Notice text="Your application is shared with authorized local reviewers. They may request identity and reference checks through a restricted process. Do not upload ID documents into support conversations. Approval never gives access to private journals or ordinary support cases." />
          <Row
            title="I agree to review, training and confidentiality checks"
            subtitle="I understand that I must respect consent, stay in the app and may decline an unsafe task."
            end={
              <Switch
                value={consent}
                onValueChange={setConsent}
                accessibilityLabel="Agree to volunteer application notice"
              />
            }
          />
          <Button
            title="Apply as a volunteer"
            busy={busy}
            disabled={
              !consent ||
              name.trim().length < 2 ||
              languages.trim().length < 2 ||
              skills.trim().length < 2 ||
              availability.trim().length < 2
            }
            onPress={async () => {
              setBusy(true);
              try {
                const r = await accountClient(session).rpc(
                  "vv2_apply_volunteer",
                  {
                    p_scope: area,
                    p_name: name,
                    p_organisation: org,
                    p_languages: languages,
                    p_skills: skills,
                    p_availability: availability,
                    p_consent: consent,
                  },
                );
                if (r.error) throw r.error;
                refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
      {!!error && <Notice text={error} tone="error" />}
    </Page>
  );
}
function ResponderContent() {
  const { session, save } = useApp();
  const [profile, setProfile] = useState<{
    approved: boolean;
    display_name: string;
    kind: string;
    duty_until: string;
  } | null>(null);
  const [offers, setOffers] = useState<
    { id: string; status: string; region_id: string; created_at: string }[]
  >([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!session) return null;
      const client = accountClient(session);
      const [a, b] = await Promise.all([
        client.rpc("vv_sos_profile").abortSignal(signal),
        client.rpc("vv_sos_list").abortSignal(signal),
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      return { profile: a.data, offers: b.data };
    },
    [session],
  );
  const receive = useCallback((r: unknown) => {
    if (!r) return;
    const data = r as { profile: typeof profile; offers: typeof offers };
    setProfile(data.profile);
    setOffers(data.offers || []);
    setMessage("");
  }, []);
  const failed = useCallback(
    (e: unknown) => setMessage((e as Error).message),
    [],
  );
  const refresh = useConversationSync(load, receive, failed);
  async function run(fn: () => Promise<void>, text: string) {
    if (busy || !session) return;
    setBusy(true);
    try {
      await fn();
      setMessage(text);
      refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page back title="Emergency responder" onRefresh={refresh}>
      <Badge label="Bhopal · Tripura · Bhubaneswar" />
      <T kind="title">Offer support{"\n"}with care.</T>
      {!session ? (
        <>
          <T>
            Sign in to apply as an emergency responder. Case-support access is a
            separate role.
          </T>
          <Button title="Sign in" onPress={() => router.push("/login")} />
        </>
      ) : (
        <>
          {!profile ? (
            <T>
              Your review is being updated. Return to Offer support to check
              your application.
            </T>
          ) : (
            <>
              <T kind="heading">{profile.display_name}</T>
              <Notice
                text={
                  profile.approved
                    ? `Approved ${profile.kind}. Go on duty only while you can safely respond.`
                    : "Your field review has expired or been suspended. Ask your local team for a review before returning to duty."
                }
              />
              {profile.approved && (
                <>
                  <Button
                    title="Register this phone for push"
                    busy={busy}
                    onPress={() =>
                      run(async () => {
                        const pushToken = await registerResponderPush(session);
                        await save((v) => ({ ...v, pushToken }));
                      }, "This device is registered. Push delivery remains best effort.")
                    }
                  />
                  <Button
                    title="Go on duty / refresh availability"
                    busy={busy}
                    onPress={() =>
                      run(async () => {
                        const location = await currentLocation();
                        const r = await accountClient(session).rpc(
                          "vv_sos_duty",
                          {
                            p_on: true,
                            p_lat: location.latitude,
                            p_lon: location.longitude,
                          },
                        );
                        if (r.error) throw r.error;
                      }, "Availability recorded for 15 minutes. Refresh while available; matching requires a location no older than five minutes.")
                    }
                  />
                  <Button
                    title="Go off duty"
                    tone="outline"
                    busy={busy}
                    onPress={() =>
                      run(async () => {
                        const r = await accountClient(session).rpc(
                          "vv_sos_duty",
                          { p_on: false },
                        );
                        if (r.error) throw r.error;
                      }, "You are off duty.")
                    }
                  />
                  <T kind="caption">
                    {profile.duty_until
                      ? `Duty ends ${new Date(profile.duty_until).toLocaleTimeString()}`
                      : "Not currently on duty"}
                  </T>
                </>
              )}
            </>
          )}
          <T kind="heading">Your authorized requests</T>
          {offers.length ? (
            offers.map((o) => (
              <Row
                key={o.id}
                title={`Request ${o.id.slice(0, 8)}`}
                subtitle={`${o.region_id} · ${o.status}`}
                icon="activity"
                onPress={() =>
                  router.push({ pathname: "/sos-case", params: { id: o.id } })
                }
              />
            ))
          ) : (
            <T>
              No requests have been offered. This does not mean emergency
              coverage is available in the area.
            </T>
          )}
        </>
      )}
      {Boolean(message) && <Notice text={message} />}
    </Page>
  );
}
export function ResponderCase({ id }: { id?: string }) {
  return (
    <PrivateGate>
      <StaffMfa>
        <CaseContent id={id} />
      </StaffMfa>
    </PrivateGate>
  );
}
function CaseContent({ id }: { id?: string }) {
  const { session } = useApp();
  const [record, setRecord] = useState<SosRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!session || !isUuid(id)) throw Error("Sign in and select a request.");
      const r = await accountClient(session)
        .rpc("vv_sos_read", { p_id: id })
        .abortSignal(signal);
      if (r.error) throw r.error;
      return r.data as SosRecord;
    },
    [id, session],
  );
  const receive = useCallback((r: SosRecord) => {
    setRecord(r);
    setError("");
  }, []);
  const failed = useCallback((e: unknown) => {
    setRecord(null);
    setError((e as Error).message);
  }, []);
  const refresh = useConversationSync(load, receive, failed);
  // Access is cleared on background/unfocus by PrivateGate; accepted details reauthorize each poll.
  useEffect(() => () => setRecord(null), []);
  return (
    <Page back title="Authorized safety request" onRefresh={refresh}>
      <T kind="title">Respond with care.</T>
      {record ? (
        <>
          <Badge label={record.status} />
          <T kind="caption">
            {record.region_id} · Request {record.id.slice(0, 8)}
          </T>
          {!record.details_allowed ? (
            <>
              <T>
                Your acknowledgement tells the area coordinator you are
                available. Precise location stays private until a area
                coordinator assigns you.
              </T>
              <Button
                title="I’m available · Acknowledge"
                busy={busy}
                onPress={async () => {
                  if (!session || busy) return;
                  setBusy(true);
                  try {
                    const r = await accountClient(session).rpc(
                      "vv_sos_accept",
                      { p_id: id },
                    );
                    if (r.error) throw r.error;
                    refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              <Button
                title="Decline / withdraw from this request"
                tone="outline"
                busy={busy}
                onPress={async () => {
                  if (!session) return;
                  setBusy(true);
                  try {
                    const r = await accountClient(session).rpc(
                      "vv2_responder_checkin",
                      { p_event: id, p_state: "withdrawn" },
                    );
                    if (r.error) throw r.error;
                    router.back();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </>
          ) : (
            <View style={s.panel}>
              <T kind="heading">{record.alias}</T>
              <T>
                {record.latitude != null
                  ? `Location: ${record.latitude.toFixed(5)}, ${record.longitude?.toFixed(5)} · accuracy ${record.accuracy ?? "unknown"} m`
                  : "No usable location was shared."}
              </T>
              <T kind="caption">
                Communicate in this incident chat. Acknowledgement means
                availability; arrival is a separate check-in. No support history
                is included.
              </T>
              {["en_route", "arrived", "withdrawn", "unsafe"].map((state) => (
                <Button
                  key={state}
                  title={
                    {
                      en_route: "I am on my way",
                      arrived: "Report arrival",
                      withdrawn: "Withdraw from this assignment",
                      unsafe: "I feel unsafe · withdraw",
                    }[state]!
                  }
                  tone="outline"
                  busy={busy}
                  onPress={async () => {
                    if (!session) return;
                    setBusy(true);
                    try {
                      const r = await accountClient(session).rpc(
                        "vv2_responder_checkin",
                        { p_event: id, p_state: state },
                      );
                      if (r.error) throw r.error;
                      refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              ))}
            </View>
          )}
          {record.chat_allowed && (
            <IncidentChat key={record.id} eventId={record.id} />
          )}
        </>
      ) : (
        <T>Request details are unavailable or loading.</T>
      )}
      {Boolean(error) && <Notice text={error} tone="error" />}
    </Page>
  );
}
