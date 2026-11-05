import { PrivateGate } from "./PrivateGate";
import React, { useCallback, useEffect, useState } from "react";
import { View, Switch, Platform, Linking } from "react-native";
import { router } from "expo-router";
import { Page, T, Button, Row, Field, Notice, Badge, colors, s } from "./ui";
import { useApp } from "../state/AppState";
import { nativeSms, allowSms } from "../lib/native-sms";
import {
  defaultSosPreferences,
  sosCapabilities,
  type SosRecord,
} from "../lib/sos-client";
import { accountClient } from "../lib/supabase";
import { useConversationSync } from "../hooks/useConversationSync";
import { PILOT_REGIONS } from "../../../shared/sos";
import { confirmAction } from "../lib/confirm";
export function SosSetup() {
  return (
    <PrivateGate>
      <SosSetupContent />
    </PrivateGate>
  );
}
function SosSetupContent() {
  const { vault, save, session } = useApp();
  const initial = vault.sosPreferences || defaultSosPreferences;
  const [preferences, setPreferences] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [cap, setCap] = useState(() => nativeSms?.capabilities());
  const [cloud, setCloud] = useState<{ relay: boolean; push: boolean } | null>(
    null,
  );
  async function check() {
    setBusy(true);
    try {
      setCloud(await sosCapabilities());
      setCap(nativeSms?.capabilities());
      setMessage("Configuration checked. This did not send any messages.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page back title="Safety message setup">
      <Badge label="SIM first · Twilio fallback" />
      <T kind="title">Your people,{"\n"}your choices.</T>
      <T>
        After setup, the send action messages your selected contacts directly.
        No share sheet opens.
      </T>
      <T>Changes apply to the next alert. Close an active alert before changing who receives it.</T>
      <Field
        label="Name shown in your alert"
        value={preferences.alias}
        maxLength={60}
        onChangeText={(alias) => setPreferences((p) => ({ ...p, alias }))}
      />
      <Field
        label="Your callback number (optional)"
        hint="Twilio sends from its own number. Include yours only if you want contacts to call it."
        value={preferences.callback}
        keyboardType="phone-pad"
        maxLength={18}
        onChangeText={(callback) => setPreferences((p) => ({ ...p, callback }))}
      />
      <Row
        title="Phone SIM sending"
        subtitle={
          !nativeSms
            ? "Install the new Android APK to enable direct SIM SMS."
            : cap?.permission
              ? cap.defaultSim
                ? "Permission allowed · Default SIM available"
                : "Permission allowed · Set a default SMS SIM in device settings"
              : "SMS permission is required. Your carrier plan applies."
        }
        icon="smartphone"
      />
      {Platform.OS === "android" && (
        <Button
          title="Allow SIM SMS"
          tone="outline"
          onPress={async () => {
            try {
              await allowSms();
              setCap(nativeSms?.capabilities());
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        />
      )}
      <Row
        title="Twilio fallback"
        subtitle="Use the configured server relay only if SIM sending is unavailable or clearly fails. Requires sign-in and internet; provider charges apply."
        end={
          <Switch
            accessibilityLabel="Enable Twilio fallback"
            value={preferences.relay}
            onValueChange={(relay) => setPreferences((p) => ({ ...p, relay }))}
            trackColor={{ true: colors.jade }}
          />
        }
      />
      <T kind="label">Pilot area</T>
      {PILOT_REGIONS.map((r) => (
        <Row
          key={r.id}
          title={r.name}
          subtitle={r.scope}
          icon={preferences.region === r.id ? "check-circle" : "circle"}
          onPress={() => setPreferences((p) => ({ ...p, region: r.id }))}
        />
      ))}
      <Row
        title="Nearby emergency volunteers"
        subtitle="Only verified, on-duty responders in enabled service areas can receive an offer. Precise location is released after authorized acceptance."
        end={
          <Switch
            accessibilityLabel="Allow nearby responder offers"
            value={preferences.volunteers}
            onValueChange={(volunteers) =>
              setPreferences((p) => ({ ...p, volunteers }))
            }
            trackColor={{ true: colors.jade }}
          />
        }
      />
      <Row
        title="Police routing"
        subtitle="Only an onboarded police recipient with a verified jurisdiction can receive an alert. Directory listing alone does not enable dispatch."
        end={
          <Switch
            accessibilityLabel="Allow verified police routing"
            value={preferences.police}
            onValueChange={(police) =>
              setPreferences((p) => ({ ...p, police }))
            }
            trackColor={{ true: colors.jade }}
          />
        }
      />
      <Notice text="Enabling cloud channels shares the selected contact numbers, your chosen alert name and optional location with the SOS backend. Twilio receives a number/message only for relay attempts. Notes and case evidence are not included. Saving contacts alone sends nothing." />
      {!session && (
        <Button
          title="Sign in for cloud channels"
          tone="outline"
          onPress={() => router.push("/login")}
        />
      )}
      <Button
        title="Save safety preferences"
        disabled={!preferences.alias.trim() || busy}
        busy={busy}
        onPress={async () => {
          setBusy(true);
          try {
            if (
              preferences.callback &&
              !/^\+[1-9]\d{7,14}$/.test(preferences.callback)
            )
              throw Error(
                "Use an international callback number, for example +91…",
              );
            await save((v) => ({
              ...v,
              sosPreferences: {
                ...preferences,
                alias: preferences.alias.trim(),
              },
            }));
            setMessage("Preferences saved. No contacts were notified.");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button
        title="Check backend configuration"
        icon="refresh-cw"
        tone="outline"
        busy={busy}
        onPress={check}
      />
      {cloud && (
        <Notice
          text={`Twilio relay: ${cloud.relay ? "configured" : "not configured"}. Responder push: ${cloud.push ? "configured" : "not configured"}. Geographic service areas and receiving teams must also be verified by a supervisor.`}
        />
      )}
      <Button
        title="Back to help"
        tone="coral"
        onPress={() => router.replace("/help")}
      />
      {Boolean(message) && <Notice text={message} />}
    </Page>
  );
}
export function ActiveSos() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);
  const { vault, save, session } = useApp();
  const event = vault.sos;
  const [message, setMessage] = useState("");
  const [cloud, setCloud] = useState<SosRecord | null>(null);
  const id = event?.id;
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!id || !session || !event?.cloudCreated) return null;
      const r = await accountClient(session)
        .rpc("vv_sos_read", { p_id: id })
        .abortSignal(signal);
      if (r.error) throw r.error;
      return r.data as SosRecord;
    },
    [id, session, event?.cloudCreated],
  );
  const receive = useCallback((value: SosRecord | null) => setCloud(value), []);
  const failed = useCallback(
    (e: unknown) => setMessage((e as Error).message),
    [],
  );
  const refresh = useConversationSync(load, receive, failed);
  async function close(status: "cancelled" | "resolved") {
    if (!event) return;
    try {
      await save((v) => ({
        ...v,
        sos:
          v.sos?.id === event.id
            ? { ...v.sos, status, closePending: Boolean(session && (v.sos.cloudCreated || v.sos.preferences.relay || v.sos.preferences.volunteers || v.sos.preferences.police)) }
            : v.sos,
      }));
      if (session && event.cloudCreated) {
        const r = await accountClient(session).rpc("vv_sos_close", {
          p_id: event.id,
          p_status: status,
        });
        if (r.error) throw r.error;
        await save((v) => ({
          ...v,
          sos:
            v.sos?.id === event.id ? { ...v.sos, closePending: false } : v.sos,
        }));
      }
      setMessage(
        "Closed locally and, where connected, on the server. Messages already sent cannot be recalled.",
      );
    } catch (e) {
      setMessage(
        "Closed on this device. Server cancellation could not be confirmed: " +
          (e as Error).message,
      );
    }
  }
  return (
    <Page back title="Safety request" onRefresh={refresh}>
      <Badge
        label={
          event?.status === "active"
            ? "Safety request active"
            : "Safety request"
        }
      />
      <T kind="title">See what{"\n"}has happened.</T>
      {!event ? (
        <>
          <T>No safety request is active.</T>
          <Button title="Open help" onPress={() => router.replace("/help")} />
        </>
      ) : (
        <>
          <T kind="caption">
            Reference {event.id.slice(0, 8)} ·{" "}
            {new Date(event.createdAt).toLocaleString()}
          </T>
          {event.contacts.map((c) => {
            const remote = cloud?.recipients?.find((r) => r.id === c.id);
            return (
              <View key={c.id} style={s.panel}>
                <T kind="label">{c.name}</T>
                <T>SIM: {c.state === "ready" ? "preparing" : c.state}</T>
                {remote && remote.state.startsWith("relay_") && (
                  <T>Twilio: {remote.state.slice(6).replaceAll("_", " ")}</T>
                )}
              </View>
            );
          })}
          <Notice text="Sent/accepted is not the same as delivery or a person responding. Missing delivery reports stay unknown; they do not trigger repeated automatic sends." />
          {(event.preferences.volunteers || event.preferences.police) && (
            <View style={s.panel}>
              <T kind="heading">Nearby response</T>
              <T>
                {cloud
                  ? `${cloud.offers} offers · ${cloud.accepted} accepted`
                  : "Cloud dispatch has not been confirmed."}
              </T>
              <T>
                Police:{" "}
                {cloud?.routing?.replaceAll("_", " ") || "not confirmed"}
              </T>
              <T kind="caption">
                A map listing or successful push handoff does not confirm police
                response or arrival.
              </T>
            </View>
          )}
          {event.closePending && (
            <Notice text="Closed on this device. Server cancellation is queued and has not yet been confirmed." />
          )}
          {event.cloudError && <Notice text={event.cloudError} tone="error" />}
          {now - event.createdAt > 300000 && (
            <Notice text="The five-minute dispatch window has expired. No new automatic messages will be started for this request." />
          )}
          <Button
            title="Call 112"
            tone="coral"
            icon="phone"
            onPress={() => {
              void Linking.openURL("tel:112").catch(() =>
                setMessage("Could not open the dialer."),
              );
            }}
          />
          {event.status === "active" && (
            <>
              <Button
                title="I'm safe · Resolve request"
                icon="check-circle"
                onPress={() => close("resolved")}
              />
              <Button
                title="Cancel this request"
                tone="outline"
                onPress={() =>
                  confirmAction(
                    "Cancel this request?",
                    "Future pending dispatch is stopped where cancellation reaches the server. Messages already sent remain with their recipients.",
                    () => {
                      void close("cancelled");
                    },
                  )
                }
              />
            </>
          )}
          <Button
            title="Back to help actions"
            tone="outline"
            onPress={() => router.replace("/help")}
          />
        </>
      )}
      {Boolean(message) && <Notice text={message} tone="error" />}
    </Page>
  );
}
