import React, { useEffect, useState } from "react";
import { T, Button, Field, Notice } from "./ui";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";
export function StaffMfa({ children }: { children: React.ReactNode }) {
  const { session } = useApp();
  return <MfaSession key={session?.user.id || "guest"}>{children}</MfaSession>;
}
function MfaSession({ children }: { children: React.ReactNode }) {
  const { session } = useApp();
  const accessToken = session?.access_token;
  const [allowed, setAllowed] = useState(""),
    [factor, setFactor] = useState(""),
    [secret, setSecret] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (r.error) throw r.error;
        const f = await supabase.auth.mfa.listFactors();
        if (f.error) throw f.error;
        if (active) {
          setAllowed(r.data.currentLevel === "aal2" ? accessToken || "" : "");
          setFactor(f.data.totp[0]?.id || "");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    if (accessToken) void load();
    return () => {
      active = false;
    };
  }, [accessToken]);
  if (!session || (allowed && allowed === accessToken)) return <>{children}</>;
  return (
    <>
      <T kind="heading">Protect your responder account</T>
      <T>
        Use an authenticator code before accessing emergency requests. This
        keeps staff access separate from your usual sign-in.
      </T>
      {!factor && (
        <Button
          title="Set up two-step verification"
          busy={busy}
          onPress={async () => {
            setBusy(true);
            try {
              const f = await supabase.auth.mfa.listFactors();
              if (f.error) throw f.error;
              for (const stale of f.data.all.filter(
                (x) => x.factor_type === "totp" && x.status === "unverified",
              )) {
                const r = await supabase.auth.mfa.unenroll({
                  factorId: stale.id,
                });
                if (r.error) throw r.error;
              }
              const r = await supabase.auth.mfa.enroll({
                factorType: "totp",
                friendlyName: "Victim Voice responder",
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
        />
      )}{" "}
      {secret && (
        <>
          <T>
            Add this time-based setup key to your authenticator. Keep it
            private.
          </T>
          <T selectable>{secret}</T>
        </>
      )}
      {factor && (
        <>
          <Field
            label="Authenticator code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button
            title="Unlock responder access"
            busy={busy}
            disabled={!/^\d{6}$/.test(code)}
            onPress={async () => {
              setBusy(true);
              try {
                const r = await supabase.auth.mfa.challengeAndVerify({
                  factorId: factor,
                  code,
                });
                if (r.error) throw r.error;
                setSecret("");
                setCode("");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
      {Boolean(error) && <Notice text={error} tone="error" />}
    </>
  );
}
