# Supervised support and emergency response

**Revised owner direction, 10 November 2026:** `SCOPED_WORKFORCE_MODEL.md` now defines the target hierarchy: database-controlled superadmin → scoped admins → employees → public app volunteer applications. It supersedes invitation-only volunteer enrollment as the target product direction. The current deployed role model remains the earlier implementation until that scoped architecture is built and verified.

Accepted product direction: 10 November 2026. Begin with known staff and invited partner organisations in Bhopal, Tripura and Bhubaneswar. An app account or application is never a responder credential.

## Access and enrollment

Use separate supervisor (trusted database membership), employed case worker, support volunteer and emergency responder permissions. Emergency approval does not grant case/evidence access; support approval does not grant location access. Require an authenticator second factor for staff data and actions, including direct API access. No role is controlled by editable account metadata.

Invitation → application → independent identity/reference/interview checks → confidentiality/crisis/consent training → supervisor review → time-limited probation → periodic review. Store review outcomes and references, not raw identity documents in case evidence. Human reviewers must perform these checks; marking a checkbox is not an identity-verification service. Invite links/codes are account-bound, single use and expire. Never send invitations without an explicit instruction.

## Support work

Cases enter a priority queue. A supervisor chooses a responsible worker using language, skills, availability, workload and declared conflicts. Assigned workers must acknowledge in time. Unacknowledged/expired assignments lose access and appear in the supervisor's escalation queue. Volunteers require survivor consent. Employees have scoped assignments too; they do not become administrators. A survivor can remove/report an assigned worker. Sensitive files and link destinations require an additional explicit owner grant for each worker; conversation access alone is insufficient.

## Emergency dispatch

No public map or searchable incident feed. Only current, eligible responders in reviewed areas receive opaque offers. Accepting an offer records availability; it does not release identity or precise coordinates. A supervisor assigns location access separately for a short window. A responder must be approved, on duty, use MFA, acknowledge and still hold the unexpired assignment. Closing, expiry, blocking, suspension or withdrawal removes access. A notification ticket is not confirmation of delivery, acceptance or arrival. No automatic widening to unvetted recipients. Supervisor escalation must show overdue unacknowledged requests; no response-time guarantee without a staffed operation.

## Misuse and incident response

Survivors can see the assigned team's display names, roles and organisation, remove/report access, and request reassignment. Reports are private to supervisors and do not go to the reported worker. Supervisors investigate, revoke assignments and suspend access. Audited sensitive reads, grants and changes support investigation; repeated evidence reads should surface for review, never establish guilt automatically. Suspension cannot recall information already copied. Native capture protection cannot stop another camera, and browser capture cannot be reliably blocked.

## Operational launch gates

- Name actual supervisors, coverage hours, escalation owners and response protocols.
- Recruit and independently verify partner teams; record appropriate role-specific screening with informed consent and professional advice where required.
- Import reviewed boundaries and onboard genuine receiving agencies; directory entries do not establish police integration.
- Configure matching Firebase client/FCM credentials and install a new Android build; verify push on consenting devices, including failure and background states.
- Conduct multi-account authorization drills, abuse/report/reassignment exercises and agreed real-device dispatch/SMS tests. No unsolicited police/emergency test messages.
- Budget provider costs and service availability; free-tier caps are not emergency-service guarantees.
- Establish access-review, report-investigation, retention and staff-offboarding practices. Do not market round-the-clock coverage before staffing it.

## Implementation record

Track shipped controls, hosted verification and remaining operational prerequisites in PROJECT_STATUS.md and mobile/QA.md. Keep responder push disabled until the gates above are met. No legal screening certification or official police relationship is implied by software approval.
