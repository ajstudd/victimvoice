import React, { useCallback, useState, useEffect } from "react";
import { View, Linking } from "react-native";
import { router } from "expo-router";
import { Page, T, Button, Row, Notice, Badge, s } from "./ui";
import { StaffMfa } from "./StaffMfa";
import { PrivateGate } from "./PrivateGate";
import { useApp } from "../state/AppState";
import { accountClient } from "../lib/supabase";
import { currentLocation } from "../lib/actions";
import { registerResponderPush } from "../lib/push";
import { useConversationSync } from "../hooks/useConversationSync";
import { isUuid } from "../../../shared/sos";
import type { SosRecord } from "../lib/sos-client";
export function Responder() {
  return (
    <PrivateGate>
      <StaffMfa>
        <ResponderContent />
      </StaffMfa>
    </PrivateGate>
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
            <>
              <T>
                Emergency responders join by invitation from a partner
                supervisor. Complete your application and training before
                responding to requests.
              </T>
              <Button
                title="Open team enrollment"
                onPress={() =>
                  void Linking.openURL(
                    "https://victimvoice.vercel.app/team",
                  ).catch(() => setMessage("Could not open team enrollment."))
                }
              />
            </>
          ) : (
            <>
              <T kind="heading">{profile.display_name}</T>
              <Notice
                text={
                  profile.approved
                    ? `Approved ${profile.kind}. Duty and receiving-device registration are separate steps.`
                    : "Application pending. A supervisor must verify and approve you before any incident is offered."
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
                Your acknowledgement tells the supervisor you are available.
                Precise location stays private until a supervisor assigns you.
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
            </>
          ) : (
            <View style={s.panel}>
              <T kind="heading">{record.alias}</T>
              <T>
                {record.latitude != null
                  ? `Location: ${record.latitude.toFixed(5)}, ${record.longitude?.toFixed(5)} · accuracy ${record.accuracy ?? "unknown"} m`
                  : "No usable location was shared."}
              </T>
              <T>
                {record.callback
                  ? `Chosen callback: ${record.callback}`
                  : "No callback number was shared."}
              </T>
              <T kind="caption">
                Follow your organization’s response protocol. Acceptance is not
                arrival. No journal or case evidence is attached.
              </T>
              {record.callback && (
                <Button
                  title="Call chosen callback number"
                  tone="outline"
                  onPress={() => {
                    void Linking.openURL("tel:" + record.callback).catch(() =>
                      setError("Could not open the dialer."),
                    );
                  }}
                />
              )}
            </View>
          )}
        </>
      ) : (
        <T>Request details are unavailable or loading.</T>
      )}
      {Boolean(error) && <Notice text={error} tone="error" />}
    </Page>
  );
}
