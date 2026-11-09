import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Pressable, Switch, AppState } from "react-native";
import { router, useFocusEffect, Redirect } from "expo-router";
import { useAudioPlayer } from "expo-audio";

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
import { createSos, hasActiveSos } from "../lib/create-sos";
import { defaultSosPreferences } from "../lib/sos-client";
import { freshSosLocation, validateSosContacts } from "../../../shared/sos";
import { composeHelp, currentLocation, openCall } from "../lib/actions";
import { isFreshLocation } from "../lib/safety";
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
      await save((v) =>
        hasActiveSos(v.sos, Date.now())
          ? v
          : {
              ...v,
              sos: createSos(
                preferences,
                chosen,
                freshSosLocation(location),
                uuid,
                Date.now(),
              ),
            },
      );
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
        subtitle="SIM permission, Backup SMS and responder choices"
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
        Texts use your saved contacts and message choices. Allow SMS on your
        phone to send directly. Backup messages need sign-in and an internet
        connection.
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
  return <Redirect href="/settings" />;
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
