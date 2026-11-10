"use client";
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  ScanLine,
  KeyRound,
  ArrowRight,
  Loader2,
  LogOut,
  Copy,
  Check,
  LockKeyhole,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export function StaffMfa({ children }: { children: ReactNode }) {
  const [state, setState] = useState("checking"),
    [factor, setFactor] = useState(""),
    [secret, setSecret] = useState(""),
    [qr, setQr] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true,
      revision = 0;
    const check = async () => {
      const id = ++revision;
      try {
        const c = getSupabase();
        const session = await c.auth.getSession();
        if (!active || id !== revision) return;
        if (!session.data.session) {
          setState("signed-out");
          return;
        }
        const level = await c.auth.mfa.getAuthenticatorAssuranceLevel();
        if (level.error) throw level.error;
        if (!active || id !== revision) return;
        if (level.data.currentLevel === "aal2") {
          setState("ready");
          return;
        }
        const f = await c.auth.mfa.listFactors();
        if (f.error) throw f.error;
        if (!active || id !== revision) return;
        setFactor(f.data.totp[0]?.id || "");
        setState(f.data.totp.length ? "verify" : "enroll");
      } catch (e) {
        if (active && id === revision) {
          setError((e as Error).message);
          setState("error");
        }
      }
    };
    void check();
    const { data } = getSupabase().auth.onAuthStateChange(() => {
      setState("checking");
      setSecret("");
      setQr("");
      setCode("");
      setCopied(false);
      setTimeout(() => void check(), 0);
    });
    return () => {
      active = false;
      revision++;
      data.subscription.unsubscribe();
    };
  }, []);
  if (state === "ready") return <>{children}</>;
  async function enroll() {
    setBusy(true);
    setError("");
    try {
      const c = getSupabase();
      const f = await c.auth.mfa.listFactors();
      if (f.error) throw f.error;
      for (const stale of f.data.all.filter(
        (x) => x.factor_type === "totp" && x.status === "unverified",
      )) {
        const r = await c.auth.mfa.unenroll({ factorId: stale.id });
        if (r.error) throw r.error;
      }
      const r = await c.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Victim Voice staff",
      });
      if (r.error) throw r.error;
      // Use the trusted Auth response directly; never send the setup secret to a QR service.
      const raw = r.data.totp.qr_code;
      const prefix = "data:image/svg+xml;utf-8,";
      if (!raw.startsWith(prefix))
        throw Error(
          "The setup code could not be displayed. Please try setup again.",
        );
      const svg = raw.slice(prefix.length);
      setQr(
        prefix +
          (svg.trimStart().startsWith("<") ? encodeURIComponent(svg) : svg),
      );
      setFactor(r.data.id);
      setSecret(r.data.totp.secret);
      setCopied(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const enrollment = state === "enroll";
  return (
    <section className="staff-auth" aria-label="Staff account security">
      <div className="staff-auth-intro">
        <span className="tm-eyebrow">
          <ShieldCheck size={15} /> ACCOUNT SECURITY
        </span>
        <h1>
          {state === "verify" ? "Welcome back." : "A safer way to sign in."}
        </h1>
        <p>
          {state === "verify"
            ? "Enter the current code from your authenticator to open your workspace."
            : "Connect an authenticator to protect access to support conversations and sensitive records."}
        </p>
        <ol className="auth-steps">
          <li className={enrollment && !secret ? "current" : ""}>
            <span>1</span>
            <div>
              <strong>Connect your authenticator</strong>
              <p>Scan the QR code or enter the setup key.</p>
            </div>
          </li>
          <li className={secret || state === "verify" ? "current" : ""}>
            <span>2</span>
            <div>
              <strong>Confirm your code</strong>
              <p>Enter the six digits shown in your app.</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Open your workspace</strong>
              <p>Your permissions stay tied to your role.</p>
            </div>
          </li>
        </ol>
        <div className="auth-privacy">
          <LockKeyhole size={17} />
          <p>
            Your authenticator works without SMS. Keep its setup key private.
          </p>
        </div>
      </div>
      <div className="staff-auth-card">
        <span className="auth-icon">
          <KeyRound size={24} />
        </span>
        <h2>
          {secret
            ? "Scan to connect"
            : state === "verify"
              ? "Verify it’s you"
              : "Two-step verification"}
        </h2>
        {state === "checking" ? (
          <p className="tm-loading" role="status">
            <Loader2 className="tm-spin" size={18} />
            Checking your session…
          </p>
        ) : state === "signed-out" ? (
          <>
            <p>Sign in before setting up your authenticator.</p>
            <Link className="tm-button" href="/admin/login">
              Sign in <ArrowRight size={16} />
            </Link>
          </>
        ) : (
          <>
            {enrollment && !secret && (
              <>
                <p>
                  In your authenticator, choose “Add account”, then “Scan QR
                  code”.
                </p>
                <div className="auth-qr-placeholder" aria-hidden="true">
                  <ScanLine size={68} />
                </div>
                <button
                  className="tm-button tm-full"
                  disabled={busy}
                  onClick={() => void enroll()}
                >
                  {busy ? (
                    <Loader2 className="tm-spin" size={17} />
                  ) : (
                    <ScanLine size={17} />
                  )}
                  Show setup QR code
                </button>
              </>
            )}
            {secret && (
              <>
                <p>Scan this code with your authenticator app.</p>
                <div className="auth-qr">
                  <Image
                    src={qr}
                    width={224}
                    height={224}
                    unoptimized
                    alt="Authenticator setup QR code"
                    priority
                  />
                </div>
                <details className="auth-manual">
                  <summary>
                    Can’t scan? Use a setup key <KeyRound size={14} />
                  </summary>
                  <p>
                    Choose a time-based account in your authenticator and enter
                    this key.
                  </p>
                  <code>{secret}</code>
                  <button
                    className="tm-text-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(secret);
                        setCopied(true);
                      } catch {
                        setError(
                          "Could not copy. Select the setup key and copy it manually.",
                        );
                      }
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
                    {copied ? "Copied" : "Copy setup key"}
                  </button>
                </details>
              </>
            )}
            {(state === "verify" || secret) && (
              <form
                className="tm-form auth-code-form"
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
                    const level =
                      await getSupabase().auth.mfa.getAuthenticatorAssuranceLevel();
                    if (level.error) throw level.error;
                    if (level.data.currentLevel !== "aal2")
                      throw Error(
                        "Verification is not complete. Try the current code again.",
                      );
                    setSecret("");
                    setQr("");
                    setCode("");
                    setState("ready");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label htmlFor="staff-code">Six-digit authenticator code</label>
                <input
                  id="staff-code"
                  className="auth-code"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
                <button
                  className="tm-button tm-full"
                  disabled={busy || code.length !== 6}
                >
                  {busy ? (
                    <Loader2 className="tm-spin" size={17} />
                  ) : (
                    <ShieldCheck size={17} />
                  )}
                  Verify & continue <ArrowRight size={16} />
                </button>
              </form>
            )}
            {state === "error" && (
              <button
                className="tm-button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            )}
          </>
        )}
        {error && (
          <p className="tm-alert" role="alert">
            {error}
          </p>
        )}
        <footer className="auth-footer">
          <Link href="/">Return home</Link>
          <button
            className="tm-text-button"
            onClick={() => void getSupabase().auth.signOut()}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </footer>
      </div>
    </section>
  );
}
