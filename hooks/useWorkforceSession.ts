"use client";
import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { WorkforceContext } from "@/lib/workforce";

export function useWorkforceSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [accountLabel, setAccountLabel] = useState("");
  const [context, setContext] = useState<WorkforceContext | null>(null);
  const [responderRole, setResponderRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true,
      generation = 0,
      account: string | null = null;
    let controller: AbortController | null = null;
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError("Sign-in is unavailable right now. Please try again later.");
      return;
    }
    const client = getSupabase();
    const load = async () => {
      const current = ++generation;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (!live || generation !== current) return;
        const session = data.session;
        account = session?.user.id || null;
        if (!session) {
          setUserId(null);
          setAccountLabel("");
          setContext(null);
          setResponderRole(null);
        } else {
          const c = await client.rpc("vv2_context").abortSignal(request.signal);
          if (c.error) throw c.error;
          let responder: string | null = null;
          if (c.data.role === "volunteer") {
            const r = await client
              .rpc("vv_sos_role")
              .abortSignal(request.signal);
            if (r.error) throw r.error;
            responder = r.data;
          }
          if (!live || generation !== current) return;
          setUserId(session.user.id);
          setAccountLabel(
            session.user.email || session.user.phone || "Signed-in account",
          );
          setContext(c.data as WorkforceContext);
          setResponderRole(responder);
        }
        setError("");
        setLoading(false);
      } catch (cause) {
        if (!live || generation !== current) return;
        setContext(null);
        setResponderRole(null);
        setLoading(false);
        setError(
          (cause as Error).message ||
            "Could not check your access. Please try again.",
        );
      }
    };
    setLoading(true);
    void load();
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id || null;
      generation++;
      controller?.abort();
      if (next !== account) {
        setContext(null);
        setUserId(null);
        setAccountLabel("");
        setResponderRole(null);
        setLoading(true);
      }
      account = next;
      // Supabase holds the auth lock during this callback.
      setTimeout(() => {
        if (live) void load();
      }, 0);
    });
    const resume = () => {
      if (!document.hidden) void load();
    };
    window.addEventListener("focus", resume);
    return () => {
      live = false;
      generation++;
      controller?.abort();
      data.subscription.unsubscribe();
      window.removeEventListener("focus", resume);
    };
  }, [revision]);
  return {
    userId,
    accountLabel,
    context,
    responderRole,
    loading,
    error,
    retry: () => setRevision((v) => v + 1),
  };
}
