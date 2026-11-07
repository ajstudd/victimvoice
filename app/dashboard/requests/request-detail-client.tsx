"use client";

import { Comments } from "@/components/comments";
import { EvidencePanel } from "@/components/evidence-panel";
import { SupportConsent } from "@/components/support-consent";
import { DashboardShell, StatusPill } from "@/components/dashboard-shell";
import { RequestType } from "@/lib/types";
import { statusCopy, timeAgo, topicLabel } from "@/shared/support-copy";

export function RequestDetailClient({ request }: { request: RequestType }) {
  const legacy = [
    ["Name of the person involved", request.accusedName],
    ["Their address", request.accusedAddress],
    ["Their phone", request.accusedPhone],
    ["Your address", request.userAddress],
  ].filter(([, value]) => value);
  return (
    <DashboardShell back={{ href: "/dashboard", label: "Your conversations" }}>
      <div className="vv-case">
        <section className="vv-card" aria-label="Conversation">
          <div className="vv-first-message">
            <p>{request.description}</p>
            <span>Your first message · {timeAgo(request.createdAt)}</span>
          </div>
          <Comments requestId={request._id} />
        </section>

        <aside className="vv-side">
          <div className="vv-card vv-status-card">
            <StatusPill status={request.status} />
            <p>{statusCopy(request.status).detail}</p>
            <p>Topic: {topicLabel(request.harassmentType)}</p>
          </div>
          <div className="vv-card">
            <EvidencePanel key={`evidence:${request._id}`} requestId={request._id} owner />
          </div>
          <div className="vv-card">
            <SupportConsent key={`consent:${request._id}`} requestId={request._id} />
          </div>
          {(legacy.length > 0 || request.evidence.length > 0) && (
            <details className="vv-card vv-legacy">
              <summary>Other details you shared</summary>
              <dl>
                {legacy.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {request.evidence.length > 0 && (
                <p className="vv-note" style={{ marginTop: 8 }}>
                  Earlier links you added are in Files above.
                </p>
              )}
            </details>
          )}
          <div className="vv-card vv-urgent">
            <strong>In danger right now?</strong>
            <p>This conversation isn’t monitored around the clock. Emergency services are faster.</p>
            <a className="vv-button vv-coral" href="tel:112">
              Call 112
            </a>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
