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
    if (vault.sos?.status !== "active") return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [vault.sos?.id, vault.sos?.status]);
  function cancel() {
    pending.current = null;
    setDeadline(null);
    cooldown.current = Date.now() + 60000;
    Vibration.cancel();
  }
  useEffect(() => {
    let stopped = false;
    let subscription: { remove: () => void } | undefined;
    const reset = () => {
      subscription?.remove();
      subscription = undefined;
      pending.current = null;
      setDeadline(null);
    };
    const start = async () => {
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
        if (
          !(await Accelerometer.isAvailableAsync()) ||
          !(await Accelerometer.getPermissionsAsync()).granted
        )
          return;
        if (stopped || AppState.currentState !== "active") return;
        const shake = new ShakeDetector(),
          drop = new DropDetector();
        Accelerometer.setUpdateInterval(100);
        subscription?.remove();
        subscription = Accelerometer.addListener(({ x, y, z }) => {
          if (
            stopped ||
            AppState.currentState !== "active" ||
            pending.current !== null ||
            Date.now() < cooldown.current
          )
            return;
          const time = Date.now(),
            g = magnitude(x, y, z);
          const shaken = shake.sample(g, time),
            dropped = drop.sample(g, time);
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
        /* Settings explains sensor and permission requirements. */
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
  const [message, setMessage] = useState("");
  const [sensor, setSensor] = useState("checking");
  useEffect(() => {
    let active = true;
    async function check() {
      if (Platform.OS === "web") {
        if (active) setSensor("phone");
        return;
      }
      try {
        const available = await Accelerometer.isAvailableAsync();
        const permission = await Accelerometer.getPermissionsAsync();
        if (active)
          setSensor(
            !available
              ? "unavailable"
              : permission.granted
                ? "ready"
                : "permission",
          );
      } catch {
        if (active) setSensor("unavailable");
      }
    }
    void check();
    return () => {
      active = false;
    };
  }, [vault.motionPermissionCheckedAt]);
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
        subtitle={
          enabled
            ? !ready
              ? "On · Finish your message setup"
              : sensor === "ready"
                ? "On · Works while the app is open"
                : sensor === "permission"
                  ? "On · Allow motion access to start"
                  : sensor === "checking"
                    ? "Checking motion access…"
                    : "Use a phone with motion access"
            : "Off · You can still send a help request yourself"
        }
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
        When this is on, three strong shakes or a possible phone drop open a
        20-second check-in. Tap “I’m okay” to cancel. Otherwise, we will try to
        send a safety request to your first five contacts, with primary contacts
        first. Detection pauses when you close or lock the app.
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
