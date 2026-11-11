"use client";
import { CaseTeam } from "./case-team";
export function SupportConsent({ requestId }: { requestId: string }) {
  return (
    <section aria-label="Who can see this conversation">
      <h2>Your support team</h2>
      <p>
        Assigned employees provide support here. Volunteers only use a separate
        emergency incident chat. Choose each person’s evidence access below; you
        can remove or report anyone on your team.
      </p>
      <CaseTeam requestId={requestId} />
    </section>
  );
}
