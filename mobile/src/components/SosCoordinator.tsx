import React, { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useApp } from "../state/AppState";
import { nativeSms } from "../lib/native-sms";
import { accountClient } from "../lib/supabase";
import { sosRequest } from "../lib/sos-client";
import { sosText, canFallback, type NativeResult } from "../../../shared/sos";
export function SosCoordinator() {
  const { vault } = useApp();
  return vault.sos?.status !== "active" && vault.sos?.closePending ? (
    <Closing key={vault.sos.id} />
  ) : vault.sos?.status === "active" ? (
    <Running key={vault.sos.id} />
  ) : null;
}
function Running() {
  const { vault, save, session } = useApp();
  const event = vault.sos!;
  const latest = useRef({ event, save, session });
  useEffect(() => {
    latest.current = { event, save, session };
  }, [event, save, session]);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let running = false;
    let failures = 0;
    const reported = new Map<string, string>();
    let cloudCreated = Boolean(event.cloudCreated);
    async function cycle() {
      if (stopped || running) return;
      running = true;
      try {
        if (AppState.currentState && AppState.currentState !== "active") return;
        const { event: e, save: write, session: actor } = latest.current;
        if (e.status !== "active" || Date.now() - e.createdAt > 5 * 60000)
          return;
        for (const c of e.contacts) {
          if (stopped) return;
          let result: NativeResult;
          if (!nativeSms)
            result = { status: "unavailable", fallbackAllowed: true };
          else {
            if (
              actor &&
              (e.preferences.relay ||
                e.preferences.volunteers ||
                e.preferences.police)
            ) {
              try {
                await nativeSms.attachRelayAsync(
                  c.attemptId,
                  process.env.EXPO_PUBLIC_SUPABASE_URL + "/functions/v1/sos",
                  actor.access_token,
                  e.id,
                  c.id,
                );
              } catch {}
            }
            const known = await nativeSms.getAttemptAsync(c.attemptId);
            result =
              known.status === "missing"
                ? await nativeSms.sendAsync(
                    c.attemptId,
                    c.phone,
                    sosText(
                      e.id,
                      e.preferences.alias,
                      e.location,
                      false,
                      e.preferences.callback,
                    ),
                  )
                : (known as NativeResult);
          }
          if (stopped) return;
          if (
            result.status !== c.state ||
            result.fallbackAllowed !== c.fallbackAllowed
          )
            await write((v) => ({
              ...v,
              sos:
                v.sos?.id === e.id
                  ? {
                      ...v.sos,
                      contacts: v.sos.contacts.map((x) =>
                        x.id === c.id
                          ? {
                              ...x,
                              state: result.status,
                              fallbackAllowed: result.fallbackAllowed,
                            }
                          : x,
                      ),
                    }
                  : v.sos,
            }));
        }
        const wantsCloud =
          e.preferences.relay ||
          e.preferences.volunteers ||
          e.preferences.police;
        if (wantsCloud && !actor) {
          if (!e.cloudError)
            await write((v) => ({
              ...v,
              sos:
                v.sos?.id === e.id
                  ? {
                      ...v.sos,
                      cloudError:
                        "Sign in to use backup messages or contact nearby responders. Your phone can still try to text your contacts.",
                    }
                  : v.sos,
            }));
          return;
        }
        if (wantsCloud && actor) {
          if (!cloudCreated) {
            const capability = await sosRequest(actor, {
              action: "start",
              id: e.id,
              alias: e.preferences.alias,
              callback: e.preferences.callback || null,
              region: e.preferences.region,
              contacts: e.contacts.map(({ id, name, phone }) => ({
                id,
                name,
                phone,
              })),
              location: e.location,
              relay: e.preferences.relay,
              volunteers: e.preferences.volunteers,
              police: e.preferences.police,
            });
            if (stopped) return;
            cloudCreated = true;
            await write((v) => ({
              ...v,
              sos:
                v.sos?.id === e.id
                  ? {
                      ...v.sos,
                      cloudCreated: true,
                      cloudError:
                        (e.preferences.relay && !capability.relay
                          ? "Backup messaging is unavailable. No backup message has been sent. "
                          : "") +
                          ((e.preferences.volunteers || e.preferences.police) &&
                          !capability.push
                            ? "Nearby responder notifications are unavailable."
                            : "") || undefined,
                    }
                  : v.sos,
            }));
          }
          for (const c of latest.current.event.contacts) {
            if (stopped || c.state === "ready") continue;
            const signature = c.state + ":" + c.fallbackAllowed;
            if (reported.get(c.id) === signature) continue;
            await sosRequest(actor, {
              action: "native",
              id: e.id,
              contactId: c.id,
              status: c.state,
              fallbackAllowed: canFallback({
                status: c.state,
                fallbackAllowed: c.fallbackAllowed,
              }),
            });
            reported.set(c.id, signature);
          }
        }
        failures = 0;
      } catch (error) {
        failures++;
        if (!stopped) {
          const { event: e, save: write } = latest.current;
          try {
            await write((v) => ({
              ...v,
              sos:
                v.sos?.id === e.id
                  ? {
                      ...v.sos,
                      cloudError:
                        (error as Error).message ||
                        "Cloud dispatch could not be checked.",
                    }
                  : v.sos,
            }));
          } catch {}
        }
      } finally {
        running = false;
        if (!stopped)
          timer = setTimeout(
            () => {
              void cycle();
            },
            failures
              ? Math.min(60000, 5000 * 2 ** Math.min(failures - 1, 4))
              : 2000,
          );
      }
    }
    const ids = event.contacts.map((c) => c.attemptId);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        clearTimeout(timer);
        void cycle();
      }
    });
    void cycle();
    return () => {
      stopped = true;
      clearTimeout(timer);
      sub.remove();
      if (nativeSms) void nativeSms.clearRelayAsync(ids);
    };
    // The incident/actor define the worker; a separate effect supplies current progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, session?.user.id]);
  return null;
}

function Closing() {
  const { vault, save, session } = useApp();
  const event = vault.sos!;
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const close = async () => {
      if (stopped || !session) return;
      try {
        const r = await accountClient(session).rpc("vv_sos_close", {
          p_id: event.id,
          p_status: event.status,
        });
        if (r.error) throw r.error;
        if (!stopped)
          await save((v) => ({
            ...v,
            sos:
              v.sos?.id === event.id
                ? { ...v.sos, closePending: false }
                : v.sos,
          }));
      } catch {
        if (!stopped)
          timer = setTimeout(() => {
            void close();
          }, 15000);
      }
    };
    void close();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
    // The closed incident and account own this retry; progress writes do not recreate it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, session?.user.id]);
  return null;
}
