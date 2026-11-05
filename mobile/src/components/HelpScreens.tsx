import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Pressable, Switch, AppState, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAudioPlayer } from "expo-audio";
import { Accelerometer } from "expo-sensors";
import { useApp, uuid } from "../state/AppState";
import {
  Page,
  T,
  Button,
  Notice,
  Avatar,
  Row,
  Icon,
  Badge,
  s,
  colors,
} from "./ui";
import { defaultSosPreferences } from "../lib/sos-client";
import { freshSosLocation, validateSosContacts } from "../../../shared/sos";
import { composeHelp, currentLocation, openCall } from "../lib/actions";
import {
  advanceCheckIn,
  CheckIn,
  magnitude,
  remainingSeconds,
  isFreshLocation,
} from "../lib/safety";
export function Help() {
  const { vault, save, ready } = useApp();
  const [selected, setSelected] = useState<string[] | null>(null);
  const contacts = [...vault.contacts].sort(
    (a, b) => Number(b.primary) - Number(a.primary),
  );
  const recipients =
    selected === null ? contacts.slice(0, 5).map((c) => c.id) : selected;
  const [location, setLocation] =
    useState<Awaited<ReturnType<typeof currentLocation>>>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const player = useAudioPlayer(require("../../assets/attention.wav"));
  useFocusEffect(
    useCallback(
      () => () => {
        player.pause();
        setPlaying(false);
      },
      [player],
    ),
  );
  useEffect(() => {
    // Expo exposes loop as a mutable native audio property.
    // eslint-disable-next-line react-hooks/immutability
    player.loop = true;
  }, [player]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (v) => {
      if (v !== "active") {
        player.pause();
        setPlaying(false);
      }
    });
    return () => sub.remove();
  }, [player]);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message || "This action could not be completed.");
    } finally {
      setBusy(false);
    }
  }
  async function sound() {
    if (playing) {
      player.pause();
      setPlaying(false);
      return;
    }
    try {
      await player.seekTo(0);
      player.play();
      setPlaying(true);
    } catch (e) {
      setPlaying(false);
      throw e;
    }
  }
  const starting = useRef(false);
  async function sendDirect() {
    if (starting.current) return;
    starting.current = true;
    try {
      if (
        vault.sos?.status === "active" &&
        Date.now() - vault.sos.createdAt < 30 * 60000
      ) {
        router.push("/sos");
        return;
      }
      const preferences = vault.sosPreferences || defaultSosPreferences;
      if (!preferences.alias.trim()) {
        router.push("/sos-setup");
        return;
      }
      const chosen = validateSosContacts(
        contacts.filter((c) => recipients.includes(c.id)),
      );
      const id = uuid();
      await save((v) => ({
        ...v,
        sos: {
          id,
          createdAt: Date.now(),
          status: "active",
          preferences,
          location: freshSosLocation(location),
          contacts: chosen.map((c) => ({
            ...c,
            attemptId: uuid(),
            state: "ready",
            fallbackAllowed: false,
          })),
        },
      }));
      router.push("/sos");
    } finally {
      starting.current = false;
    }
  }
  async function compose() {
    if (!contacts.length)
      throw new Error("Add a trusted contact first, or use emergency calling.");
    const chosen = contacts.filter((c) => recipients.includes(c.id));
    if (!chosen.length)
      throw new Error("Choose at least one person to message.");
    const fresh =
      location && isFreshLocation(location.timestamp, Date.now())
        ? location
        : undefined;
    await composeHelp(
      chosen.map((c) => c.phone),
      fresh,
    );
    setMessage(
      "SMS app opened with your selected contact numbers. Review and send the message there." +
        (location && !fresh
          ? " Your location expired and was left out; capture a new snapshot to include it."
          : " Delivery has not been confirmed."),
    );
  }
  return (
    <Page back title="Get help" dark>
      <T
        kind="title"
        color={colors.paper}
        style={{ fontSize: 43, lineHeight: 50 }}
      >
        Let&apos;s reach{"\n"}someone.
      </T>
      <T color="#D6CBDF">Choose the action that feels right for you.</T>
      <Button
        title="Call 112"
        tone="cream"
        icon="phone"
        onPress={() => run(() => openCall("112"))}
      />
      <Button
        title={
          recipients.length
            ? `Message ${recipients.length === 1 ? "my contact" : `${recipients.length} contacts`}`
            : "Choose contacts below"
        }
        tone="coral"
        icon="users"
        busy={busy}
        disabled={!recipients.length || !ready}
        onPress={() => run(sendDirect)}
      />
      <Row
        title="Safety message setup"
        subtitle="SIM permission, Twilio fallback and responder choices"
        icon="settings"
        onPress={() => router.push("/sos-setup")}
      />
      <Button
        title="Open SMS app instead"
        tone="cream"
        icon="message-square"
        disabled={!recipients.length}
        onPress={() => run(compose)}
      />
      <T kind="caption" color="#D6CBDF">
        Direct sending uses your saved setup. Cloud channels require sign-in,
        internet and backend configuration. SIM sending requires the new Android
        build and permission.
      </T>
      <View style={{ gap: 14 }}>
        <T kind="caption" color="#D6CBDF">
          Choose up to five people to receive your message
        </T>
        <View style={{ gap: 8 }}>
          {contacts.length ? (
            contacts.map((c, i) => (
              <Pressable
                key={c.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: recipients.includes(c.id) }}
                accessibilityLabel={"Include " + c.name}
                disabled={!recipients.includes(c.id) && recipients.length >= 5}
                onPress={() =>
                  setSelected(
                    recipients.includes(c.id)
                      ? recipients.filter((id) => id !== c.id)
                      : [...recipients, c.id],
                  )
                }
                style={[
                  s.row,
                  {
                    padding: 12,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: recipients.includes(c.id)
                      ? "#BFAACB"
                      : "#61526D",
                  },
                ]}
              >
                <Avatar name={c.name} index={i} />
                <View style={{ flex: 1, gap: 3 }}>
                  <T kind="label" color={colors.paper}>
                    {c.name}
                  </T>
                  <T kind="caption" color="#D6CBDF">
                    {c.primary
                      ? "Primary contact"
                      : c.relationship || "Trusted contact"}
                  </T>
                </View>
                <Icon
                  name={recipients.includes(c.id) ? "check-square" : "square"}
                  color={colors.paper}
                />
              </Pressable>
            ))
          ) : (
            <Button
              title="Add someone I trust"
              tone="cream"
              icon="user-plus"
              onPress={() => router.push("/contact")}
            />
          )}
        </View>
      </View>
      <View
        style={{
          borderTopWidth: 1,
          borderColor: "#61526D",
          paddingTop: 18,
          gap: 16,
        }}
      >
        <View style={s.between}>
          <View style={{ flex: 1 }}>
            <T kind="label" color={colors.paper}>
              Include my location
            </T>
            <T kind="caption" color="#D6CBDF">
              Only in the message you choose to send
            </T>
          </View>
          <Switch
            accessibilityLabel="Include my location in the message"
            value={!!location}
            onValueChange={(value) =>
              value
                ? run(async () => {
                    setLocation(await currentLocation());
                    setMessage(
                      "Location captured. It will be included only when you send a message.",
                    );
                  })
                : setLocation(undefined)
            }
            trackColor={{ true: colors.jade }}
            disabled={busy}
          />
        </View>
        {location && (
          <T kind="caption" color="#D6CBDF">
            Captured {new Date(location.timestamp).toLocaleTimeString()} ·
            {location.accuracy == null
              ? "accuracy unavailable"
              : `accuracy approximately ${Math.round(location.accuracy)} m`}
          </T>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <T kind="heading" color={colors.paper}>
          Draw attention
        </T>
        <T color="#D6CBDF">
          This plays an audible sound. Check your surroundings and audio volume
          before starting it.
        </T>
        <Button
          title={playing ? "Stop sound" : "Start attention sound"}
          icon={playing ? "volume-x" : "volume-2"}
          tone={playing ? "coral" : "cream"}
          onPress={() => run(sound)}
        />
        <T kind="caption" color="#D6CBDF">
          Sound stops when this screen closes or the app backgrounds. It does
          not send messages. Device audio settings still apply.
        </T>
      </View>
      {Boolean(message) && <Notice text={message} />}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/nearby")}
        style={{ minHeight: 48, justifyContent: "center" }}
      >
        <T color={colors.paper} style={{ textDecorationLine: "underline" }}>
          Find other support options →
        </T>
      </Pressable>
    </Page>
  );
}
export function Safety() {
  const { vault } = useApp();
  const [check, setCheck] = useState<CheckIn>({
    state: "idle",
    deadline: null,
  });
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState("");
  const subscription = useRef<{ remove: () => void } | null>(null);
  const freeFall = useRef(0);
  useFocusEffect(
    useCallback(
      () => () => {
        subscription.current?.remove();
        subscription.current = null;
        setCheck({ state: "idle", deadline: null });
      },
      [],
    ),
  );
  function stop() {
    subscription.current?.remove();
    subscription.current = null;
    setCheck((c) => advanceCheckIn(c, "stop", Date.now()));
  }
  useEffect(() => {
    const sub = AppState.addEventListener("change", (v) => {
      if (v !== "active") {
        subscription.current?.remove();
        subscription.current = null;
        setCheck({ state: "idle", deadline: null });
        setMessage(
          "Rehearsal paused when the app left the foreground. No messages were sent.",
        );
      }
    });
    return () => {
      sub.remove();
      subscription.current?.remove();
    };
  }, []);
  useEffect(() => {
    if (check.state !== "countdown") return;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      setCheck((c) => advanceCheckIn(c, "expire", n));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [check.state]);
  async function arm() {
    try {
      if (Platform.OS === "web") {
        setMessage(
          "Sensors are not enabled in the browser preview. You can rehearse the countdown.",
        );
        setCheck({ state: "armed", deadline: null });
        return;
      }
      if (!(await Accelerometer.isAvailableAsync()))
        throw new Error(
          "This device has no available motion sensor. Use the simulated check-in.",
        );
      const permission = await Accelerometer.requestPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Motion access was not granted. You can still rehearse manually.",
        );
      subscription.current?.remove();
      Accelerometer.setUpdateInterval(100);
      subscription.current = Accelerometer.addListener(({ x, y, z }) => {
        const n = Date.now(),
          g = magnitude(x, y, z);
        if (g < 0.35) freeFall.current = n;
        if (g > 2.7 && freeFall.current && n - freeFall.current < 1000) {
          freeFall.current = 0;
          setNow(n);
          setCheck((c) => advanceCheckIn(c, "trigger", n));
        }
      });
      setCheck({ state: "armed", deadline: null });
      setMessage(
        "Foreground rehearsal running. Do not drop your phone; use the simulation button to test.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function simulate() {
    setNow(Date.now());
    setCheck(
      advanceCheckIn({ state: "armed", deadline: null }, "trigger", Date.now()),
    );
  }
  if (check.state === "countdown")
    return (
      <Page back title="Active safety · Rehearsal" dark>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            gap: 24,
            paddingVertical: 20,
          }}
        >
          <T
            kind="title"
            color={colors.paper}
            style={{ fontSize: 44, lineHeight: 52 }}
          >
            Are you okay?
          </T>
          <T color="#D6CBDF">A motion check-in has started.</T>
          <T
            color={colors.paper}
            style={{
              fontFamily: "Lora_600SemiBold",
              fontSize: 132,
              lineHeight: 150,
              textAlign: "center",
            }}
          >
            {remainingSeconds(check.deadline!, now)}
          </T>
          <T color="#D6CBDF" style={{ textAlign: "center" }}>
            seconds until rehearsal completes
          </T>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: "#5D4B69",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 6,
                width: `${remainingSeconds(check.deadline!, now) * 5}%`,
                backgroundColor: "#EBA28D",
              }}
            />
          </View>
          <T color="#D6CBDF">No real alerts will be sent.</T>
          <Button
            title="I'm okay"
            tone="cream"
            onPress={() => {
              subscription.current?.remove();
              setCheck((c) => advanceCheckIn(c, "cancel", Date.now()));
            }}
          />
          <Button
            title="Open real help actions"
            tone="coral"
            onPress={() => {
              stop();
              router.replace("/help");
            }}
          />
        </View>
      </Page>
    );
  return (
    <Page back title="Active safety">
      <T kind="title">A check-in,{"\n"}when you need it.</T>
      <Notice text="Foreground prototype · Rehearsal only. Automatic alerts and background monitoring are not enabled." />
      <T>
        Explore the 20-second check-in safely. A dropped phone can trigger a
        check-in; it does not establish that someone is in danger.
      </T>
      <Row
        title="Check-in countdown"
        subtitle="20 seconds · Cancel at any time"
        icon="clock"
      />
      <Row
        title="Your circle"
        subtitle={
          vault.contacts.map((c) => c.name).join(", ") ||
          "No contacts added yet"
        }
        icon="users"
        onPress={() => router.push("/circle")}
      />
      <Row
        title="Automatic contact alerts"
        subtitle="Not enabled in this build"
        icon="send"
      />
      {(check.state === "completed" || check.state === "cancelled") && (
        <Notice
          text={
            check.state === "completed"
              ? "Rehearsal finished. No contacts were notified."
              : "Check-in canceled. No contacts were notified."
          }
          tone="success"
        />
      )}
      <Button
        title={
          check.state === "armed"
            ? "Stop rehearsal"
            : "Start on-screen rehearsal"
        }
        icon="shield"
        onPress={check.state === "armed" ? stop : arm}
      />
      <Button
        title="Simulate the 20-second check-in"
        tone="outline"
        icon="play"
        onPress={simulate}
      />
      {Boolean(message) && <Notice text={message} />}
      <T kind="caption">
        Motion detection is experimental and works only while this screen is
        open. It stops when you leave. Manual help remains available.
      </T>
      <Button
        title="Get help now"
        tone="coral"
        onPress={() => router.push("/help")}
      />
    </Page>
  );
}
export function Nearby() {
  return (
    <Page back title="Other support options">
      <Badge label="You choose who to reach" />
      <T kind="title">Find a human{"\n"}connection.</T>
      <T>
        Reach someone you trust, continue a case, or explore official services.
      </T>
      <Row
        title="My trusted people"
        subtitle="Call or prepare a message"
        icon="users"
        onPress={() => router.replace("/help")}
      />
      <Row
        title="Talk to support"
        subtitle="Share a concern or evidence in a private case"
        icon="message-circle"
        onPress={() => router.push("/request-new")}
      />
      <Row
        title="Official services"
        subtitle="Emergency, cybercrime and workplace resources"
        icon="external-link"
        onPress={() => router.push("/directory")}
      />
      <Notice text="Nearby volunteer dispatch is not operating. Your location is never broadcast to strangers. Support conversations have no guaranteed response time." />
      <Button
        title="Back to help actions"
        tone="coral"
        onPress={() => router.replace("/help")}
      />
    </Page>
  );
}
