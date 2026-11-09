import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import {
  Page,
  T,
  Field,
  Button,
  Notice,
  Row,
  Icon,
  Badge,
  s,
  colors,
} from "./ui";
import { useApp } from "../state/AppState";
import { confirmAction } from "../lib/confirm";
import { JourneyLiveControls } from "./JourneyLive";
export function Journey() {
  const { vault, save, ready } = useApp();
  const [destination, setDestination] = useState("");
  const [duration, setDuration] = useState(30);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const journey = vault.journey;
  const remaining = journey
    ? Math.max(0, Math.ceil((journey.deadline - now) / 1000))
    : 0;
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await fn();
      setNow(Date.now());
    } catch (e) {
      setMessage(
        (e as Error).message ||
          "Could not save this check-in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function finish() {
    await save((v) => ({
      ...v,
      journey: undefined,
      liveJourney: v.liveJourney
        ? { ...v.liveJourney, stopping: true }
        : undefined,
    }));
    setMessage("Your local check-in is finished. No contacts were notified.");
  }
  return (
    <Page back title="Journey companion">
      <View style={{ gap: 8 }}>
        <Badge label="On-device check-in" />
        <T kind="title">Plan your{"\n"}check in.</T>
        <T>Set a check-in time and choose whether to share your location.</T>
      </View>
      <JourneyLiveControls />
      {journey ? (
        <>
          <View
            style={[
              s.panel,
              {
                backgroundColor: colors.sage,
                alignItems: "center",
                paddingVertical: 30,
                gap: 18,
              },
            ]}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: colors.paper,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name={remaining ? "navigation" : "clock"}
                color={colors.jade}
                size={26}
              />
            </View>
            <T kind="label" color={colors.jade}>
              {remaining ? "Your next check-in" : "Your check-in is due"}
            </T>
            <T
              kind="title"
              style={{
                fontSize: 64,
                lineHeight: 76,
                fontVariant: ["tabular-nums"],
              }}
            >
              {Math.floor(remaining / 60)
                .toString()
                .padStart(2, "0")}
              :{(remaining % 60).toString().padStart(2, "0")}
            </T>
            <T kind="heading" style={{ textAlign: "center" }}>
              {journey.destination || "Your journey"}
            </T>
            <T kind="caption">
              Check-in at{" "}
              {new Date(journey.deadline).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </T>
          </View>
          <Button
            title="I've arrived · Finish check-in"
            icon="check-circle"
            busy={busy}
            onPress={() => run(finish)}
          />
          <Button
            title="Give me 15 more minutes"
            tone="outline"
            icon="clock"
            disabled={busy}
            onPress={() =>
              run(async () => {
                await save((v) => ({
                  ...v,
                  journey: v.journey
                    ? {
                        ...v.journey,
                        deadline:
                          Math.max(Date.now(), v.journey.deadline) +
                          15 * 60_000,
                      }
                    : undefined,
                }));
              })
            }
          />
          <Row
            title="End this check-in"
            icon="x-circle"
            onPress={() => {
              if (!busy)
                confirmAction(
                  "End this check-in?",
                  "This removes your local timer. No message is sent.",
                  () => run(finish),
                );
            }}
          />
        </>
      ) : (
        <>
          <View
            style={[
              s.panel,
              {
                backgroundColor: colors.field,
                borderWidth: 1,
                borderColor: colors.line,
                gap: 20,
              },
            ]}
          >
            <Field
              label="Where are you headed? (optional)"
              placeholder="A place, or just a name for this journey"
              value={destination}
              onChangeText={setDestination}
              maxLength={150}
            />
            <T kind="label">Check in after</T>
            <View style={s.row}>
              {[15, 30, 60].map((m) => (
                <Pressable
                  key={m}
                  accessibilityRole="button"
                  accessibilityState={{ selected: duration === m }}
                  onPress={() => setDuration(m)}
                  style={{
                    flex: 1,
                    minHeight: 56,
                    padding: 10,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: duration === m ? colors.ink : colors.lilac,
                  }}
                >
                  <T
                    kind="label"
                    color={duration === m ? colors.paper : colors.ink}
                  >
                    {m} min
                  </T>
                </Pressable>
              ))}
            </View>
            <Button
              title="Start my check-in"
              icon="navigation"
              busy={busy}
              disabled={!ready}
              onPress={() =>
                run(async () => {
                  await save((v) => ({
                    ...v,
                    journey: {
                      deadline: Date.now() + duration * 60_000,
                      destination: destination.trim(),
                    },
                  }));
                })
              }
            />
          </View>
        </>
      )}
      <Notice text="This timer stays on your device and is also visible on Home. It does not send background notifications, track your route, share location, or alert anyone if you miss it." />
      <Row
        title="Reach my people"
        subtitle="Open calling or prepare a message yourself"
        icon="users"
        onPress={() => router.push("/help")}
      />
      {Boolean(message) && <Notice text={message} />}
    </Page>
  );
}
