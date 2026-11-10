"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
export function StaffMfa({ children }: { children: ReactNode }) {
  const [state, setState] = useState("checking"),
    [factor, setFactor] = useState(""),
    [secret, setSecret] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const c = getSupabase();
        const { data: s } = await c.auth.getSession();
        if (!active) return;
        if (!s.session) {
          setState("signed-out");
          return;
        }
        const { data, error } =
          await c.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw error;
        if (!active) return;
        if (data.currentLevel === "aal2") {
          setState("ready");
          return;
        }
        const f = await c.auth.mfa.listFactors();
        if (f.error) throw f.error;
        if (active) {
          setFactor(f.data.totp[0]?.id || "");
          setState(f.data.totp.length ? "verify" : "enroll");
        }
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setState("error");
        }
      }
    };
    void check();
    const { data } = getSupabase().auth.onAuthStateChange(() => {
      setState("checking");
      setSecret("");
      setCode("");
      setTimeout(() => void check(), 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  if (state === "ready") return <>{children}</>;
  return (
    <main className="team-page">
      <section className="team-card">
        <h1>Protect your staff account</h1>
        <p>
          Use an authenticator app to unlock support work. Your Google or
          password sign-in remains the first step.
        </p>
        {state === "checking" ? (
          <p role="status">Checking your session…</p>
        ) : state === "signed-out" ? (
          <Link href="/admin/login">Sign in first</Link>
        ) : (
          <>
            {state === "enroll" && !secret && (
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const c = getSupabase();
                    const f = await c.auth.mfa.listFactors();
                    if (f.error) throw f.error;
                    for (const stale of f.data.all.filter(
                      (x) =>
                        x.factor_type === "totp" && x.status === "unverified",
                    )) {
                      const r = await c.auth.mfa.unenroll({
                        factorId: stale.id,
                      });
                      if (r.error) throw r.error;
                    }
                    const r = await c.auth.mfa.enroll({
                      factorType: "totp",
                      friendlyName: "Victim Voice staff",
                    });
                    if (r.error) throw r.error;
                    setFactor(r.data.id);
                    setSecret(r.data.totp.secret);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Set up two-step verification
              </button>
            )}
            {secret && (
              <>
                <p>
                  Add this setup key to your authenticator as a time-based
                  account. Keep it private.
                </p>
                <code style={{ overflowWrap: "anywhere" }}>{secret}</code>
              </>
            )}
            {(state === "verify" || secret) && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    const r = await getSupabase().auth.mfa.challengeAndVerify({
                      factorId: factor,
                      code,
                    });
                    if (r.error) throw r.error;
                    setSecret("");
                    setCode("");
                    setState("ready");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Authenticator code
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
                <button disabled={busy}>Unlock workspace</button>
              </form>
            )}
          </>
        )}
        {error && <p role="alert">{error}</p>}
        <p>
          <Link href="/">Return home</Link> ·{" "}
          <button onClick={() => void getSupabase().auth.signOut()}>
            Sign out
          </button>
        </p>
      </section>
    </main>
  );
}
