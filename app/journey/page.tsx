"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
type Point = {
  expires_at: string;
  updated_at: string | null;
  fresh: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
};
export default function JourneyViewer() {
  const [point, setPoint] = useState<Point | null>(null);
  const [message, setMessage] = useState("Opening shared journey…");
  useEffect(() => {
    const token = window.location.hash.slice(1);
    if (!/^[0-9a-f-]{36}$/i.test(token)) {
      setMessage("This sharing link is invalid.");
      return;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      try {
        if (document.hidden) return;
        const r = await getSupabase()
          .rpc("vv_journey_view", { p_token: token })
          .abortSignal(controller.signal);
        if (r.error) throw r.error;
        if (active) {
          setPoint(r.data);
          setMessage(
            r.data ? "" : "Sharing has ended, expired, or is unavailable.",
          );
        }
      } catch {
        if (active) {
          setPoint(null);
          setMessage("Cannot check location. Check your connection.");
        }
      } finally {
        if (active) timer = setTimeout(() => void poll(), 15000);
      }
    };
    const resume = () => {
      clearTimeout(timer);
      void poll();
    };
    document.addEventListener("visibilitychange", resume);
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  return (
    <main className="mx-auto max-w-lg p-8 space-y-5">
      <h1 className="text-3xl font-bold">Shared journey</h1>
      <p>{message}</p>
      {point && (
        <>
          <p>Expires {new Date(point.expires_at).toLocaleString()}</p>
          <p>
            Last update:{" "}
            {point.updated_at
              ? new Date(point.updated_at).toLocaleTimeString()
              : "not received"}
          </p>
          {point.fresh &&
          point.latitude !== null &&
          point.longitude !== null ? (
            <>
              <p>
                Accuracy: approximately {Math.round(point.accuracy || 0)} metres
              </p>
              <a
                className="underline"
                rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`}
                target="_blank"
              >
                Open latest location on map
              </a>
              <p>Opening the map shares these coordinates with Google.</p>
            </>
          ) : (
            <p>
              Updates paused or location unavailable. This is not a current
              location.
            </p>
          )}
        </>
      )}
      <p>
        Only the latest shared point is shown. A lack of updates does not
        indicate that someone is safe or unsafe.
      </p>
    </main>
  );
}
