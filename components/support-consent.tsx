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
    <section aria-label="Who can see this conversation">
      <h2>Who can see this</h2>
      <label className="vv-toggle" style={{ borderTop: 0, paddingTop: 0 }}>
        <span>
          <strong>Let trained volunteers help</strong>
          {allowed
            ? "On. Supervisors and a volunteer they assign can read this conversation and its files."
            : "Off. Only supervisors can read this conversation and its files."}
        </span>
        <input
          type="checkbox"
          role="switch"
          className="vv-switch"
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
      </label>
      <p className="vv-note" style={{ marginTop: 12 }}>
        Volunteers never see your email or phone. Turning this off removes their
        access straight away.
      </p>
      {error && (
        <p role="alert" className="vv-error">
          {error}
        </p>
      )}
    </section>
  );
}
