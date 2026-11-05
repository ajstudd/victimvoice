"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { staffLanding } from "@/lib/support";

export default function AuthCallback() {
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const finish = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const admin = params.get("admin") === "true";
        // Remove the one-use credential from browser history immediately.
        window.history.replaceState({}, "", "/auth/callback");
        if (params.has("error") || !code)
          throw new Error(
            "Sign-in was cancelled or the link has expired. Please try again.",
          );
        const { error } = await getSupabase().auth.exchangeCodeForSession(code);
        if (error)
          throw new Error(
            "We could not finish sign-in. Please try again in the browser where you started.",
          );
        const destination = admin ? await staffLanding() : "/dashboard";
        if (!destination)
          throw new Error(
            "This account has not been approved for staff access. You can still sign in to request support.",
          );
        window.location.replace(destination);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Sign-in failed. Please try again.",
        );
      }
    };
    void finish();
  }, []);
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">
          {error ? "Unable to sign in" : "Finishing sign-in…"}
        </h1>
        {error ? (
          <>
            <p role="alert" className="text-muted-foreground">
              {error}
            </p>
            <Link
              className="inline-block text-primary underline underline-offset-4"
              href="/login"
            >
              Return to sign-in
            </Link>
            <br />
            <Link
              className="text-sm text-primary underline underline-offset-4"
              href="/admin/login"
            >
              Return to admin sign-in
            </Link>
          </>
        ) : (
          <p role="status">Please wait while we connect your account.</p>
        )}
      </div>
    </main>
  );
}
