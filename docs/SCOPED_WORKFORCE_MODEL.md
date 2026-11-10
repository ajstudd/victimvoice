# Scoped workforce and safe response model

Product direction supplied by the owner on 10 November 2026. This supersedes the earlier invitation-only volunteer recruitment model. This is the revised target architecture, not a claim that the full hierarchy is already implemented.

## Hierarchy and authority

| Role | Provisioning | Authority | Data boundary |
| --- | --- | --- | --- |
| Superadmin | Explicit trusted database provisioning only | Create/suspend scoped admins, define reviewed jurisdiction scopes, review audits and severe incidents | No public registration/promotion route; exceptional case access must be purposeful and audited |
| Area admin | Superadmin dashboard assigns existing verified account, role and scope | Manage employees, oversee review and dispatch within assigned state, city or operational region | No authority to widen own scope, appoint a superadmin or browse unrelated victim records |
| Employee | Invited/provisioned by an authorized admin within the admin's scope | Assigned support conversations and volunteer-application review; record approval/denial with reasons | No broad contact export, incident browsing, field-response rights or arbitrary case/evidence access |
| Volunteer | Local person signs in through the app and applies | After review/training/probation, receive eligible job offers; communicate only in the assigned incident channel | No public victim map, case library, personal numbers, home addresses or permanent location access |
| Survivor | Low-friction normal account, with emergency calling and trusted contacts still available | Control requests, consent, evidence sharing, assigned-person visibility, blocking and reports | Do not require volunteer-grade identity proofing to seek urgent help |

“Create” a staff member means invite an existing or newly verified account into a role; do not give one staff member another person's password. Require staff MFA. Volunteer accounts start as applicants with no response privileges. Employee approval grants limited volunteer eligibility, not all data. Recommend independent area-admin sign-off before physical-response eligibility or other higher-risk privileges. The approving employee, responsible admin, evidence of review, approval time, review due date and later decisions must remain attributable.

## Geographic authorization

Represent reviewed jurisdictions as a parent/child scope hierarchy (state → city/district → local service area), with explicit assignments for operational regions spanning multiple children. Do not infer every police jurisdiction from administrative boundaries. Admins and employees cannot choose a scope outside their delegated authority. Every list, read, write, invitation, review, assignment and attachment access must enforce actor role + scope + purpose + assignment + consent + expiry on the server. Browser tabs and editable Auth metadata are not security boundaries. An escalation outside an area needs an explicit authorized handover, never a client-selected region bypass.

Management permission does not automatically grant unrestricted access to survivor content. Keep operational counts, personnel review records, support conversations, emergency coordinates and evidence as separate permissions. Superadmin accounts should not be used for ordinary support work. Exceptional access requires an accountable reason and audit trail; stronger dual approval is appropriate for role/scope expansion and highly sensitive access.

## Public volunteer application and review

1. Local person signs in through the app, chooses a service area, and supplies only necessary eligibility/contact/language/skill/availability information with clear notice and consent.
2. Application enters the area's employee review queue. Signup alone exposes no incident, victim or employee personal data.
3. An accountable trained reviewer performs appropriate identity, reference/organisation, interview, conflict and conduct checks. Complete training in crisis communication, consent, confidentiality and safe response boundaries. Use a suitable identity-verification provider/process after privacy/security review; do not claim that a checked box or uploaded ID proves good character.
4. Record an approval/denial reason, reviewer, responsible admin and review reference. Keep historical decisions immutable rather than overwriting the prior reason. Provide a route to correct mistakes or appeal; do not make the applicant's eligibility depend solely on an opaque automated score.
5. Start probation with restricted workload, periodic review and supervised participation. Independent admin sign-off unlocks physical-response eligibility. Expired review, suspension or leaving the organisation removes access promptly.

Do not collect extensive identity documents into general case evidence. Prefer a verification outcome/reference over retained raw documents where possible. Define restricted review access, retention and deletion with appropriate professional advice. Survivors must not complete intrusive identity checks before they can ask for help. Identity proofing reduces impersonation risk; no registration process can guarantee a person's future conduct.

## Conversations and dispatch

Employees provide support inside assigned in-app support conversations. Volunteers use a separate incident-specific in-app channel only after assignment; approval does not grant ordinary support-case access. Text and consented attachment sharing come first. In-app voice can follow once signaling, network traversal, abuse controls, permissions, reliability and costs are understood. Do not market end-to-end encryption or guaranteed delivery before those properties exist and are verified.

An SOS may notify bounded eligible, reviewed, on-duty responders in an enabled scope. Notification payloads contain no victim identity or coordinates. Acknowledgement means availability, not arrival. The responsible area admin dispatches an eligible responder and authorizes a short-lived, consented location grant. A volunteer cannot self-accept to reveal someone’s location. Accurate state distinguishes offered → acknowledged → assigned → checked in/arrived → closed; push handoff is not any of the human states. If nobody acknowledges, alert the staffed escalation desk and show the survivor the real state; do not widen sharing to unvetted strangers.

Do not reveal personal numbers to volunteers or expose their numbers to victims by default. Remove the existing responder callback-number disclosure when introducing the app-only channel; links/buttons and API responses must both respect this. This restriction concerns staff/volunteer communication: survivor-chosen SMS/calls to trusted contacts and explicit emergency calling remain separate safety tools. Prevent automatic off-platform contact sharing, warn about requests to move elsewhere and provide immediate reporting. Software cannot stop a human from repeating or photographing information already shown.

## Protect helpers as well as survivors

- No public volunteer roster with home address or live personal location. Share only role, organisation, relevant verification status and incident-specific identity needed for trust. Location is shared deliberately for a job, not through permanent tracking.
- Volunteers can decline or withdraw from an unsafe task without retaliation. Give them an SOS/check-in route to their coordinator. Recommend supervised or buddy response for physical attendance; do not send untrained individuals to confront alleged offenders.
- Keep support, emergency and volunteer vetting records separated. No private journals or unrelated case files are bundled with an emergency offer.
- Use rate limits, duplicate-request detection and staff triage to reduce malicious dispatch and stalking attempts. Do not silently discard a genuine emergency solely on an automated risk signal; preserve explicit emergency-call/trusted-contact options and transparent escalation.
- Reporting immediately removes the complained-about person's access to that survivor. Credible urgent risk may justify a reviewed temporary hold on wider assignments. A global ban needs accountable review, evidence and a correction/appeal path; one unreviewed accusation or rating must not automatically establish guilt.
- Record who invited, reviewed, approved, assigned, opened sensitive material, expanded scope and suspended access. Audit records must resist modification by the people they describe. Watch for bulk reading, unusual scope changes and repeated off-platform requests, with human investigation rather than automatic accusations.
- Re-check permissions on every request and expire access after duty, case closure, review expiry, role revocation or blocking. Access cannot recall information already copied, so minimize what is disclosed first.

## Delivery sequence and tests

1. Separate database-provisioned superadmin from scoped admin/employee/volunteer memberships; server-only role assignment and reviewed scope hierarchy. Add the superadmin/admin management UI and adversarial scope/role tests before granting new production roles. Existing global supervisor membership is legacy bootstrap authority, not a safe shortcut for every new admin.
2. Add public app volunteer applications and accountable employee review; invitation codes remain for employees/admins. Preserve existing cases and do not silently promote or convert accounts. Add independent higher-risk approval and historical review records.
3. Build separate incident chat, scoped participant grants, short-lived location access, delivery/acknowledgment states, safety reports, helper check-ins and coordinator escalation. Remove responder phone disclosure before claiming app-only communication.
4. Configure Firebase/Expo credentials, ship the necessary Android build and test physical notification, network-loss and multi-account flows with consenting testers. Onboard real teams and staffed coverage hours before enabling regions or promising response.

Required abuse tests include self-promotion, admin creating a higher role or broader scope, cross-region reviews and case access, forged region/identity claims, reviewer approving themselves, stolen/reused invitations, unapproved volunteer incident access, exact location before assignment, callback leakage, direct Storage/API bypass, expired/revoked membership, malicious reports, collusion scenarios and safe fallback when push/chat is unavailable.

## References

- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html — least privilege, deny by default, checks on every request.
- NIST SP 800-63A-4: https://pages.nist.gov/800-63-4/sp800-63a.html — risk-based identity proofing and privacy/data-minimization considerations; this is design guidance, not a claim of compliance or an Indian legal requirement.
