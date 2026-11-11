"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Copy, Check, ArrowRight, LockKeyhole } from "lucide-react";
import { staffHomeForRole } from "@/lib/staff-routing";
import { useWorkforceSession } from "@/hooks/useWorkforceSession";
import { getSupabase, signOut } from "@/lib/supabase";
import { supportRpc } from "@/lib/support";
import { workforceLabel, type WorkforceContext } from "@/lib/workforce";
import { StaffMfa } from "@/components/staff-mfa";
import { StaffRouteStatus } from "@/components/staff-entry";

export default function JoinStaff() {
  const state = useWorkforceSession();
  const [copied, setCopied] = useState(false);
  if (state.loading || state.error)
    return <StaffRouteStatus error={state.error} retry={state.retry} />;
  return (
    <main className="join-page">
      <Link className="tm-brand join-brand" href="/">
        <span>
          <Shield size={24} />
        </span>
        <div>
          Victim Voice<small>STAFF INVITATIONS</small>
        </div>
      </Link>
      <section className="join-card">
        <span className="tm-eyebrow">YOUR INVITATION</span>
        <h1>Join your local team.</h1>
        <p>
          Use the account your admin invited. A personal code gives you the
          reviewed role and service area assigned to that account.
        </p>
        {!state.userId ? (
          <>
            <div className="join-steps">
              <span>1. Sign in to your account</span>
              <span>2. Verify your authenticator</span>
              <span>3. Enter your invitation code</span>
            </div>
            <Link className="tm-button tm-full" href="/login?next=%2Fjoin">
              Sign in with Google or phone <ArrowRight size={16} />
            </Link>
            <Link
              className="tm-button secondary tm-full"
              href="/admin/login?next=%2Fjoin"
            >
              Use staff email and password
            </Link>
          </>
        ) : (
          <>
            <div className="join-account">
              <strong>{state.accountLabel}</strong>
              <small>Your account reference</small>
              <code>{state.userId}</code>
              <button
                className="tm-text-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(state.userId!);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
                {copied ? "Reference copied" : "Copy reference"}
              </button>
              <button
                className="tm-text-button"
                onClick={() => void signOut().catch(() => state.retry())}
              >
                Use another account
              </button>
            </div>
            <StaffMfa key={state.userId}>
              <AcceptInvitation userId={state.userId} />
            </StaffMfa>
          </>
        )}
        <p className="join-note">
          <LockKeyhole size={16} />
          Codes are shared privately by the inviting admin. Ask them for your
          code if you haven’t received it. No role is granted just by opening
          this page.
        </p>
      </section>
      <p className="join-footer">
        Want to volunteer? Apply in the Victim Voice app under Offer support.
      </p>
      {state.userId &&
        staffHomeForRole(state.context?.role || "", state.responderRole) && (
          <Link className="tm-text-button" href="/admin">
            Open your staff workspace <ArrowRight size={14} />
          </Link>
        )}
    </main>
  );
}

function AcceptInvitation({ userId }: { userId: string }) {
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [accepted, setAccepted] = useState<WorkforceContext | null>(null);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setCode("");
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  if (accepted)
    return (
      <section className="join-success" role="status">
        <span className="tm-section-icon">
          <Check size={24} />
        </span>
        <h2>Invitation accepted</h2>
        <p>
          Your current role is <strong>{workforceLabel(accepted.role)}</strong>.
        </p>
        {accepted.memberships.map((m) => (
          <p key={m.scope_id}>
            <strong>{m.scope_name}</strong> · {workforceLabel(m.role)}
            <br />
            <small>
              Access review due {new Date(m.expires_at).toLocaleDateString()}
            </small>
          </p>
        ))}
        <Link className="tm-button tm-full" href="/admin">
          Open staff workspace <ArrowRight size={16} />
        </Link>
        <button
          className="tm-text-button"
          onClick={() => {
            setAccepted(null);
            setError("");
          }}
        >
          Accept another invitation
        </button>
      </section>
    );
  return (
    <form
      method="post"
      className="tm-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          const r = await getSupabase().auth.getSession();
          if (r.data.session?.user.id !== userId)
            throw Error(
              "Your account changed. Sign in with the account that was invited.",
            );
          await supportRpc("vv2_accept_staff", { p_token: code.trim() });
          setCode("");
          const context = await supportRpc<WorkforceContext>("vv2_context");
          const current = await getSupabase().auth.getSession();
          if (current.data.session?.user.id === userId) setAccepted(context);
        } catch (cause) {
          setError((cause as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Personal invitation code
        <input
          required
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={100}
          value={code}
          disabled={busy}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste the code your admin shared"
        />
      </label>
      <p className="tm-form-note">
        The code works once, for the invited account, within seven days. An
        expired code needs a new invitation from your admin.
      </p>
      <button className="tm-button tm-full" disabled={busy || !code.trim()}>
        {busy ? "Accepting invitation…" : "Accept invitation"}
      </button>
      {error && (
        <p className="tm-alert" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
