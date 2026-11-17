import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  Modal,
  Platform,
  View,
  Vibration,
  Switch,
} from "react-native";
import { Accelerometer } from "expo-sensors";
import { router } from "expo-router";
import { useApp, uuid } from "../state/AppState";
import { setMotionStatus, useMotionStatus } from "../lib/motion-status";
import { nativeSms } from "../lib/native-sms";
import {
  ShakeDetector,
  DropDetector,
  magnitude,
  advanceCheckIn,
  motionDecision,
} from "../lib/safety";
import { createSos, hasActiveSos } from "../lib/create-sos";
import { Button, T, Row, Notice, colors } from "./ui";
export function MotionSafety() {
  const { session } = useApp();
  return <Monitor key={session?.user.id || "guest"} />;
}
function Monitor() {
  const { vault, save, session, ready } = useApp();
  const latest = useRef({ vault, save, session });
  useEffect(() => {
    latest.current = { vault, save, session };
  }, [vault, save, session]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [sensorState, setSensorState] = useState("starting");
  const lastSample = useRef(0);
  const pending = useRef<number | null>(null),
    cooldown = useRef(0),
    sending = useRef(false);
  const enabled = vault.motionAlertsEnabled !== false;
  const cap = nativeSms?.capabilities();
  const deliverable = Boolean(
    (cap?.permission && cap.defaultSim) ||
    (session && vault.sosPreferences?.relay),
  );
  const setup = Boolean(
    vault.contacts.length && vault.sosPreferences?.alias.trim(),
  );
  const active = hasActiveSos(vault.sos, now);
  useEffect(() => {
    const tick = () => {
      if (AppState.currentState === "active") setNow(Date.now());
    };
    const timer = setInterval(tick, 1000);
    const sub = AppState.addEventListener("change", tick);
    return () => { clearInterval(timer); sub.remove(); };
  }, []);
  useEffect(() => {
    const text = Platform.OS === "web" ? "Use the installed phone app for motion detection"
      : !enabled ? "Off · Turn on in Settings"
      : !ready ? "Checking shake & drop detection…"
      : !setup ? "Paused · Add a contact and finish Safety message setup"
      : !deliverable ? "Paused · Enable SIM SMS or signed-in SMS fallback"
      : AppState.currentState !== "active" ? "Paused · Keep Victim Voice open"
      : active ? "Paused · Finish or cancel your active safety request"
      : deadline !== null ? "Check-in open · Cancel or send from the prompt"
      : now < cooldown.current ? `Paused · Ready again in ${Math.ceil((cooldown.current - now) / 1000)} seconds`
      : sensorState === "permission" ? "Paused · Allow motion access in Settings"
      : sensorState === "unavailable" ? "Motion sensor unavailable · Use Get help"
      : sensorState !== "listening" ? "Starting motion detection…"
      : !lastSample.current || now - lastSample.current > 2000 ? "Waiting for motion sensor readings · Reopen the app if this persists"
      : "Listening · Shake firmly 3 times within 3 seconds";
    setMotionStatus(text);
  }, [enabled, ready, setup, deliverable, active, deadline, now, sensorState]);
  function cancel() {
    pending.current = null;
    setDeadline(null);
    cooldown.current = Date.now() + 60000;
    Vibration.cancel();
  }
  useEffect(() => {
    let stopped = false;
    let generation = 0;
    let subscription: { remove: () => void } | undefined;
    const reset = () => {
      generation += 1;
      lastSample.current = 0;
      subscription?.remove();
      subscription = undefined;
      pending.current = null;
      setDeadline(null);
    };
    const start = async () => {
      const current = ++generation;
      if (
        stopped ||
        !ready ||
        !enabled ||
        !setup ||
        !deliverable ||
        active ||
        Platform.OS === "web" ||
        AppState.currentState !== "active"
      )
        return;
      try {
        setSensorState("starting");
        const available = await Accelerometer.isAvailableAsync();
        const permission = await Accelerometer.getPermissionsAsync();
        if (stopped || current !== generation || AppState.currentState !== "active") return;
        if (!available || !permission.granted) {
          setSensorState(available ? "permission" : "unavailable");
          return;
        }
        const shake = new ShakeDetector(),
          drop = new DropDetector();
        Accelerometer.setUpdateInterval(20);
        subscription?.remove();
        setSensorState("listening");
        subscription = Accelerometer.addListener(({ x, y, z, timestamp }) => {
          if (
            stopped ||
            current !== generation ||
            AppState.currentState !== "active" ||
            pending.current !== null ||
            Date.now() < cooldown.current
          )
            return;
          if (![x, y, z].every(Number.isFinite)) return;
          lastSample.current = Date.now();
          const time = Date.now(),
            g = magnitude(x, y, z);
          const sampledAt = Number.isFinite(timestamp) && timestamp >= 0
            ? timestamp * 1000 : performance.now();
          const shaken = shake.sample(g, sampledAt),
            dropped = drop.sample(g, sampledAt);
          if (shaken || dropped) {
            pending.current = advanceCheckIn(
              { state: "armed", deadline: null },
              "trigger",
              time,
            ).deadline;
            setNow(time);
            setDeadline(pending.current);
            setError("");
            Vibration.vibrate([0, 250, 200, 250]);
          }
        });
      } catch {
        if (!stopped && current === generation) setSensorState("unavailable");
      }
    };
    const listener = AppState.addEventListener("change", (state) => {
      reset();
      if (state === "active") void start();
    });
    void start();
    return () => {
      stopped = true;
      reset();
      listener.remove();
      Vibration.cancel();
    };
  }, [
    ready,
    enabled,
    setup,
    deliverable,
    active,
    vault.motionPermissionCheckedAt,
  ]);
  async function send() {
    if (
      sending.current ||
      pending.current === null ||
      AppState.currentState !== "active"
    )
      return;
    sending.current = true;
    pending.current = null;
    setDeadline(null);
    cooldown.current = Date.now() + 60000;
    Vibration.cancel();
    try {
      const { save: write } = latest.current;
      await write((v) => {
        if (v.motionAlertsEnabled === false || hasActiveSos(v.sos, Date.now()))
          return v;
        const contacts = [...v.contacts]
          .sort((a, b) => Number(b.primary) - Number(a.primary))
          .slice(0, 5);
        if (!v.sosPreferences)
          throw Error("Finish Safety message setup to send automatic alerts.");
        return {
          ...v,
          sos: createSos(v.sosPreferences, contacts, null, uuid, Date.now()),
        };
      });
      router.push("/sos");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      sending.current = false;
    }
  }
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      const current = latest.current.vault;
      const decision = motionDecision(pending.current, Date.now(), {
        enabled: current.motionAlertsEnabled !== false,
        active: AppState.currentState === "active",
        existingRequest: hasActiveSos(current.sos, Date.now()),
      });
      if (decision === "send") void sendRef.current();
      else if (decision === "cancel") {
        const delayed =
          pending.current !== null && Date.now() - pending.current > 5000;
        cancel();
        if (delayed)
          setError(
            "This check-in was interrupted. No alert was sent. Use Get help if you need someone.",
          );
      }
    }, 200);
    return () => clearInterval(timer);
  }, [deadline]);
  return (
    <Modal
      visible={deadline !== null || Boolean(error)}
      transparent
      animationType="fade"
      onRequestClose={() => {
        cancel();
        setError("");
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: "#20162EEE",
        }}
      >
        <View
          style={{
            gap: 20,
            padding: 24,
            borderRadius: 24,
            backgroundColor: colors.paper,
          }}
        >
          <T kind="title">Are you okay?</T>
          {error ? (
            <Notice text={error} tone="error" />
          ) : (
            <>
              <T>
                Your phone detected a strong shake or possible drop. Unless you
                cancel, we will try to send a safety request to your chosen
                contacts.
              </T>
              <T kind="title">
                {Math.max(0, Math.ceil(((deadline || now) - now) / 1000))}{" "}
                seconds
              </T>
            </>
          )}
          <Button
            title="I'm okay · Cancel alert"
            onPress={() => {
              cancel();
              setError("");
            }}
          />
          {!error && (
            <Button
              title="Send help request now"
              tone="coral"
              onPress={() => void send()}
            />
          )}
          <T kind="caption">
            This check-in stops if you close or lock the app. You can turn it
            off in Settings.
          </T>
        </View>
      </View>
    </Modal>
  );
}
export function MotionSettings() {
  const { vault, save, session } = useApp();
  const status = useMotionStatus();
  const [message, setMessage] = useState("");
  const enabled = vault.motionAlertsEnabled !== false;
  const cap = nativeSms?.capabilities();
  const ready = Boolean(
    vault.contacts.length &&
    vault.sosPreferences?.alias.trim() &&
    ((cap?.permission && cap.defaultSim) ||
      (session && vault.sosPreferences?.relay)),
  );
  return (
    <>
      <Row
        title="Shake & drop alerts"
        subtitle={status}
        icon="activity"
        end={
          <Switch
            accessibilityLabel="Shake and drop alerts"
            value={enabled}
            onValueChange={(v) =>
              void save((x) => ({ ...x, motionAlertsEnabled: v })).catch((e) =>
                setMessage(e.message),
              )
            }
            trackColor={{ true: colors.jade }}
          />
        }
      />
      <T kind="caption">
        When Listening is shown, three firm shakes within three seconds or a possible phone drop open a
        20-second check-in. Tap “I’m okay” to cancel. Otherwise, we will try to
        send a safety request to your first five contacts, with primary contacts
        first. Detection pauses when you close or lock the app, during an active safety request, and for one minute after cancellation. Do not drop your phone to test this.
      </T>
      <T kind="caption">
        {vault.contacts.length
          ? "Alert contacts: " +
            [...vault.contacts]
              .sort((a, b) => Number(b.primary) - Number(a.primary))
              .slice(0, 5)
              .map((c) => c.name)
              .join(", ")
          : "Add a trusted contact to receive your safety alerts."}
      </T>
      {!vault.contacts.length && (
        <Button
          title="Add a trusted contact"
          tone="outline"
          onPress={() => router.push("/contact")}
        />
      )}
      {enabled && !ready && (
        <Button
          title="Set up automatic safety alerts"
          tone="outline"
          onPress={() => router.push("/sos-setup")}
        />
      )}{" "}
      {enabled && Platform.OS !== "web" && (
        <Button
          title="Allow motion access"
          tone="outline"
          onPress={async () => {
            try {
              if (!(await Accelerometer.isAvailableAsync())) {
                setMessage(
                  "Your phone does not have an available motion sensor. You can still use Get help.",
                );
                return;
              }
              const p = await Accelerometer.requestPermissionsAsync();
              await save((v) => ({
                ...v,
                motionAlertsEnabled: true,
                motionPermissionCheckedAt: Date.now(),
              }));
              setMessage(
                p.granted
                  ? "Motion access allowed. Keep the app open for shake and drop alerts."
                  : "Allow motion access in your phone settings to use shake and drop alerts.",
              );
            } catch {
              setMessage("Motion detection is unavailable on this phone.");
            }
          }}
        />
      )}{" "}
      {Platform.OS === "web" && (
        <T kind="caption">Use the phone app for shake and drop detection.</T>
      )}
      {Boolean(message) && <Notice text={message} />}
    </>
  );
}
