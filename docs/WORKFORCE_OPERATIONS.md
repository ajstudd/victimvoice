# Team enrollment and safe-response operations

Implemented scoped model, November 2026. The database-only `admin_users` table is the superadmin bootstrap. No public form, invitation or editable Auth metadata creates a superadmin. Existing global supervisors retain this bootstrap role; legacy invited workers are not silently promoted.

## Appoint an area admin

1. The person signs in on the website, opens `/team`, and sets up their authenticator. They copy their own account reference.
2. The superadmin completes the organisation’s identity, reference, interview, training and confidentiality checks outside the invitation form. Store verification records in a restricted system; enter only a reference here.
3. In Team & access → Invitations, choose an existing state/city/service area and invite that verified account as an admin. A superadmin can add administrative child areas; doing so does not enable response or define a police jurisdiction.
4. The code appears in a popup immediately. Copy and share it privately with the named person. The product does not email or text the code. It expires in seven days, works once, and only the invited account can accept it after MFA.
5. Admin membership needs a new reviewed invitation after 90 days. Suspending an admin also invalidates employees sponsored by that admin and volunteer eligibility dependent on that approval chain.

## Add employees and assign support

1. The area admin repeats the verified-account invitation flow for an employee within their own delegated area. An admin cannot appoint another admin or widen their area. Superadmins first appoint an accountable admin; that admin sponsors employees.
2. Employees mark themselves available in `/team` for up to four hours. Admins assign available local employees from the support inbox. Each employee can hold at most five current cases.
3. Employees acknowledge each assignment and confirm no conflict in Team & access → My assignments. Until acknowledgment, they receive only assignment metadata. Acknowledgment is due in 15 minutes; case access lasts up to seven days and stops on closure, expiry, blocking, review expiry or role revocation.
4. New support requests may choose a pilot service area without location permission. Existing requests have no area and require superadmin triage. Before opening a case, a superadmin can assign its area with a recorded reason. Reassigning the area removes old assignments, oversight leases and evidence grants.
5. An admin opens sensitive case/incident content only after recording a purpose, for up to ten minutes. This access is audited. Ordinary employees see only acknowledged assigned support cases. Volunteers cannot access ordinary support cases, even if an old consent flag is set.
6. Evidence access is separate: the owner chooses which current employee/coordinator may open each file under Your support team. Revocation is checked again at each open and Storage download. Raw account email/phone and private journals are not exposed through staff case RPCs.

## Review a public volunteer application

1. In the app, Settings → Offer support lets any verified normal account choose Bhopal, Tripura or Bhubaneswar and apply. Applying does not require staff MFA, grant a staff role, reveal a victim, or put the applicant on duty. Do not use a staff account as a volunteer account.
2. A local employee opens Team & access → Volunteer applications, confirms no conflict and takes the review. The form records identity, verified contact, references, interview, training, confidentiality and local-area checks plus a restricted review reference and reason. A checkmark records the reviewer’s attestation; it is not an automated identity/background check.
3. Request changes or deny with an understandable reason. The app shows that decision. The applicant can correct their information and submit a note for reconsideration; the reviewer can read that note. Historical decisions remain in the audit log.
4. An independent local admin opens the current employee review and records a supervision/buddy plan before authorizing field response. The employee cannot authorize their own review. Initial eligibility lasts at most 30 days, depends on current reviewers/approvers, and allows only one active physical-response acknowledgment at a time.
5. No software enrollment process guarantees future conduct. Establish a real verification process, trained staff, response hours, incident investigation, appeals and supervision before admitting real responders. The app does not provide an identity-verification vendor integration.

## Respond through the app

- Eligible volunteers set up MFA, register a receiving phone and go on duty deliberately. Duty lasts 15 minutes; matching requires fresh location and an enabled reviewed geographic area. Do not infer response coverage from administrative scopes.
- Push contains only an opaque incident reference. Offers are bounded. Acknowledgment signals availability and reveals no precise location. A local coordinator records a purpose and dispatches an eligible acknowledged responder, granting at most 15 minutes of precise context and incident chat access.
- Responders never receive the survivor’s callback number, support histories or unrelated evidence. Coordinators also use the in-app incident channel. Trusted-contact SMS and explicit emergency calls remain separate tools chosen by the survivor.
- Text chat is separate from support. Personal-number/email patterns are rejected as an accidental-disclosure guard; it cannot prevent people from disguising details or photographing information. Messages are immutable, retried with a stable ID, and limited to 20/minute/account, 2,000/incident and 25,000 stored messages across the pilot.
- Incident files/links are explicitly shared with the current named participants and the person requesting help. The backend snapshots only the participant IDs the uploader saw; later team members do not inherit files. Files are at most 5 MiB, with 20 items / 20 MiB per incident and a 100 MiB global incident-media cap. Existing case evidence has a separate 800 MiB cap.
- Access ends on closure, expiry, blocking, loss of duty/eligibility or assignment revocation. Incident attachments are temporary; they are not automatically copied into a support case. A survivor can separately share evidence for ongoing support.
- Helpers may decline, withdraw, report being unsafe or report a concern without an automatic penalty. Arrival is labelled as reported by the responder, not independently verified. Survivors can immediately block/report responders/coordinators. A report removes access to that survivor; a platform-wide suspension needs an accountable human decision.
- Team & access shows scoped open safety reports and recent immutable governance actions. Emergency desk shows active requests without a dispatched eligible responder, plus offered/acknowledged/assigned/check-in information. A screen is not a staffed monitoring service.

## Retention, costs and operational dependencies

The existing minute worker removes expired incident Storage files through the Storage API before SQL removes metadata. Seven-day retention also scrubs old locations, callbacks, contact snapshots and chat even if Storage is temporarily unavailable; retry cleanup remains bounded by the global media cap. Failed unfinished uploads are eligible for cleanup after a day. Account deletion removes both evidence buckets before deleting rows, so it does not leave uploaded originals orphaned. Verification/audit retention policy and exceptional investigations still need an operating organisation’s privacy review.

These caps support a small pilot; they do not guarantee every Supabase/Expo/Twilio free quota under arbitrary traffic. Monitor database size, egress, Auth, Edge and messaging usage. SMS provider fees remain separate.

**Not live yet:** Firebase Android configuration / Expo FCM credentials, a matching push-capable APK, physical-device delivery and network-loss tests, reviewed response geography, staffed teams and formal agency onboarding. Push/coverage must remain off until these are ready. No real police agency is auto-enrolled by this change. In-app voice, guaranteed response, background locked-phone motion detection, end-to-end encryption and prevention of external-camera copying are not claimed.

## Safe verification

Run `bash scripts/test-scoped-workforce-db.sh` for an isolated PostGIS authorization test. It installs the additive setup twice and exercises fictional root/admin/employee/owner/volunteer/outsider accounts, cross-area denials, stolen/reused codes, review independence, sponsor suspension, assignment acknowledgment, purpose leases, owner-selected case evidence, incident chat/Storage, callback redaction, blocking and expiry. It sends no SMS or push.

Local browser fixtures are loopback-only in `scripts/support-fixture.mjs` and `scripts/mobile-fixture.mjs`; never point production builds at them. Real account enrollment and physical SOS testing must be performed with consenting people through the ordinary UI. Do not create real staff grants or emergency reports as an automated deployment check.
