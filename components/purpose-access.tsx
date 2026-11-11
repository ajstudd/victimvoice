"use client";
import { useEffect, useState, type ReactNode } from "react";
import { supportRpc } from "@/lib/support";
import type { OperatingScope, WorkforceContext } from "@/lib/workforce";
export function PurposeAccess({
  id,
  kind,
  children,
  onChanged,
  scopeId,
}: {
  id: string;
  kind: "case" | "incident";
  children: ReactNode;
  onChanged?: () => void;
  scopeId?: string | null;
}) {
  const [granted, setGranted] = useState(false),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [root, setRoot] = useState(false),
    [scopes, setScopes] = useState<OperatingScope[]>([]),
    [area, setArea] = useState("");
  useEffect(() => {
    let live = true;
    void supportRpc<WorkforceContext>("vv2_context")
      .then(async (c) => {
        if (!live) return;
        setRoot(c.role === "superadmin");
        if (kind === "case" && c.role === "superadmin") {
          const s = await supportRpc<OperatingScope[]>("vv2_scopes", {
            p_management: true,
          });
          if (live) setScopes(s);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id, kind]);
  useEffect(() => {
    if (!granted) return;
    const timer = setTimeout(() => setGranted(false), 9 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [granted]);
  if (granted) return <>{children}</>;
  return (
    <section
      className="support-welcome"
      style={{ padding: 28, maxWidth: 650, margin: "auto" }}
    >
      <p className="support-eyebrow">ACCOUNTABLE ACCESS</p>
      <h2>Open with a purpose.</h2>
      <p>
        Record why you need this {kind === "case" ? "conversation" : "incident"}
        . Access lasts up to ten minutes and appears in the audit log. Evidence
        still needs the owner’s permission.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await supportRpc("vv2_purpose_access", {
              p_id: id,
              p_kind: kind,
              p_reason: reason,
            });
            setGranted(true);
            onChanged?.();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        style={{ display: "grid", gap: 12, textAlign: "left", width: "100%" }}
      >
        <label>
          Reason for access
          <textarea
            required
            minLength={15}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: 12,
              border: "1px solid #ccc",
              borderRadius: 12,
              color: "#30253D",
            }}
          />
        </label>
        <button className="tm-button" disabled={busy}>
          {busy ? "Opening…" : "Open private workspace"}
        </button>
      </form>
      {root && kind === "case" && (
        <details
          style={{ textAlign: "left", marginTop: 24, width: "100%" }}
          open={!scopeId}
        >
          <summary>Assign / hand over service area</summary>
          <p>
            {scopeId
              ? "Changing area revokes previous assignments and evidence grants."
              : "This request needs an area before a local admin can assign an employee."}
          </p>
          <label>
            Service area
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              style={{ padding: 12, width: "100%" }}
            >
              <option value="">Choose area</option>
              {scopes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="tm-button"
            disabled={!area || busy || reason.trim().length < 15}
            onClick={async () => {
              setBusy(true);
              try {
                await supportRpc("vv2_set_case_scope", {
                  p_request: id,
                  p_scope: area,
                  p_reason: reason,
                });
                onChanged?.();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save area with reason above
          </button>
        </details>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
