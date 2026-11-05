"use client";
import { useEffect, useState } from "react";
import { getCase, supportError, supportRpc } from "@/lib/support";
export function SupportConsent({ requestId }: { requestId: string }) {
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getCase(requestId)
      .then((row) => {
        if (active) {
          setAllowed(row.allow_volunteer_support);
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(supportError(e));
      });
    return () => {
      active = false;
    };
  }, [requestId]);
  return (
    <section className="evidence-upload">
      <h4>Your support team</h4>
      <p className="support-helper">
        Supervisors can read requests you submit. You decide whether approved
        volunteers assigned to this case can help. Withdrawing consent
        immediately removes their server access and cancels assignments. Private
        notes and your circle are never included.
      </p>
      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="checkbox"
          style={{ width: 18, minHeight: 18, margin: 0 }}
          checked={allowed}
          disabled={!ready || busy}
          onChange={async (e) => {
            const next = e.target.checked;
            setBusy(true);
            setError("");
            try {
              await supportRpc("vv_set_support_consent", {
                p_request_id: requestId,
                p_allowed: next,
              });
              setAllowed(next);
            } catch (err) {
              setError(supportError(err));
            } finally {
              setBusy(false);
            }
          }}
        />
        Allow assigned volunteers to support this case
      </label>
      {error && (
        <p role="alert" className="support-error">
          {error}
        </p>
      )}
    </section>
  );
}
