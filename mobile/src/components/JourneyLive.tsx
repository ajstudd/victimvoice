import React, { useEffect, useState } from "react";
import { AppState, Share } from "react-native";
import { router } from "expo-router";
import { useApp, uuid } from "../state/AppState";
import { accountClient } from "../lib/supabase";
import { currentLocation } from "../lib/actions";
import { Button, Notice, T } from "./ui";
export function JourneyLiveCoordinator() {
  const { vault, session, save } = useApp();
  const live = vault.liveJourney;
  useEffect(() => {
    if (!live || !session) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let busy = false;
    const cycle = async () => {
      if (stopped || busy) return;
      busy = true;
      try {
        if (live.stopping || Date.now() >= live.expiresAt) {
          const r = await accountClient(session).rpc("vv_journey_stop", {
            p_id: live.id,
          });
          if (r.error) throw r.error;
          if (!stopped)
            await save((v) => ({
              ...v,
              liveJourney:
                v.liveJourney?.id === live.id ? undefined : v.liveJourney,
            }));
          return;
        }
        if (AppState.currentState && AppState.currentState !== "active") return;
        const p = await currentLocation();
        if (
          stopped ||
          (AppState.currentState && AppState.currentState !== "active") ||
          Date.now() - p.timestamp > 30000
        )
          return;
        const r = await accountClient(session).rpc("vv_journey_update", {
          p_id: live.id,
          p_lat: p.latitude,
          p_lon: p.longitude,
          p_accuracy: p.accuracy,
        });
        if (r.error) throw r.error;
        if (!stopped)
          await save((v) => ({
            ...v,
            liveJourney:
              v.liveJourney?.id === live.id
                ? {
                    ...v.liveJourney,
                    lastPublishedAt: Date.now(),
                    error: undefined,
                  }
                : v.liveJourney,
          }));
      } catch {
        if (!stopped)
          try {
            await save((v) => ({
              ...v,
              liveJourney:
                v.liveJourney?.id === live.id
                  ? {
                      ...v.liveJourney,
                      error:
                        "Location updates could not be confirmed. Check location access and internet.",
                    }
                  : v.liveJourney,
            }));
          } catch {}
      } finally {
        busy = false;
        if (!stopped) timer = setTimeout(() => void cycle(), 15000);
      }
    };
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        clearTimeout(timer);
        void cycle();
      }
    });
    void cycle();
    return () => {
      stopped = true;
      clearTimeout(timer);
      sub.remove();
    };
    // The captured incident/account own the worker; vault progress does not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.id, live?.stopping, session?.user.id, session?.access_token]);
  return null;
}
export function JourneyLiveControls() {
  const { vault, session, save } = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const live = vault.liveJourney;
  const link = live
    ? `https://victimvoice.vercel.app/journey#${live.token}`
    : "";
  async function start() {
    setBusy(true);
    setError("");
    try {
      if (!session) {
        router.push("/login");
        return;
      }
      const point = await currentLocation();
      const id = uuid(),
        token = uuid();
      const minutes = Math.max(
        1,
        Math.min(
          60,
          Math.ceil(
            ((vault.journey?.deadline || Date.now() + 1800000) - Date.now()) /
              60000,
          ),
        ),
      );
      const r = await accountClient(session).rpc("vv_journey_start", {
        p_id: id,
        p_token: token,
        p_minutes: minutes,
      });
      if (r.error) throw r.error;
      await save((v) => ({
        ...v,
        liveJourney: { id, token, expiresAt: Date.now() + minutes * 60000 },
      }));
      const u = await accountClient(session).rpc("vv_journey_update", {
        p_id: id,
        p_lat: point.latitude,
        p_lon: point.longitude,
        p_accuracy: point.accuracy,
      });
      if (u.error) throw u.error;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <T kind="heading">Share live location</T>
      <Notice text="Updates while this app is open and online. Backgrounding or locking the phone pauses updates; your viewer sees when updates stop. Anyone you give the link to can view it until stopped or expired. Only the latest point is stored, not a route history." />
      {live ? (
        <>
          <T>
            {live.stopping
              ? "Stopping · waiting for server confirmation"
              : `Link expires ${new Date(live.expiresAt).toLocaleTimeString()}`}
          </T>
          {live.lastPublishedAt && (
            <T>
              Last sent {new Date(live.lastPublishedAt).toLocaleTimeString()}
            </T>
          )}
          {live.error && <Notice text={live.error} tone="error" />}
          <Button
            title="Share journey link"
            disabled={Boolean(live.stopping)}
            onPress={() =>
              void Share.share({
                message: `Follow my journey while I share my location: ${link}`,
              }).catch((e) => setError(e.message))
            }
          />
          <Button
            title="Stop sharing location"
            tone="outline"
            onPress={() =>
              void save((v) => ({
                ...v,
                liveJourney: v.liveJourney
                  ? { ...v.liveJourney, stopping: true }
                  : undefined,
              }))
            }
          />
        </>
      ) : (
        <Button
          title={
            session ? "Start live sharing" : "Sign in to share live location"
          }
          busy={busy}
          onPress={start}
        />
      )}{" "}
      {Boolean(error) && <Notice text={error} tone="error" />}
    </>
  );
}
