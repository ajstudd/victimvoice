# Support workspace: scope, setup and privacy

Implemented 2 November 2026. This is an internal pilot, not a staffed emergency service or a forensic evidence system.

## Setup

Hosted setup was confirmed by the user on 3 November 2026. Five checked RPCs and four private support tables reject anonymous access in read-only hosted probes. This does not verify authenticated uploads, staff workflows or device capture protection.

Run `supabase/support-workspace.sql` in the existing Supabase project's SQL Editor after the original and mobile schemas. It is additive and repeatable. Existing cases and conversations remain; existing cases default to **no volunteer consent**. No service-role key belongs in the website or app. The SQL needs Supabase Storage's operation-aware RLS helper `storage.allow_only_operation`; if the project does not support it, do not replace the download policy with a broad SELECT policy.

Supervisors remain members of `admin_users`. They sign in at `/admin/login`, then use **Team** to approve an existing Auth user with a support display name, after checking identity and training separately. An existing `admin_users` member must first be removed from that table to become a restricted volunteer; the approval RPC rejects supervisor accounts to prevent misleading suspension/assignment controls. Never automatically demote an unknown supervisor. Approval grants no case access. An owner must explicitly allow volunteer support, and a supervisor must assign that approved volunteer to the case. Only then can they read the scoped case view, conversation and evidence. Disabling a volunteer or removing an assignment takes effect on subsequent server requests without waiting for token expiry. Consent withdrawal cancels assignments; re-consenting does not silently restore them.

## Workspace

The inbox lists only accessible cases, 25 per page. Conversations update while open. The workspace separates the survivor conversation, shared evidence, internal investigation notes, and case activity. Notes are append-only and visible to the assigned team; they are not sent to survivors. Notes should distinguish observations from assumptions. Review status is workflow metadata, never a finding that a file is authentic or an allegation established.

There are no contact-directory, bulk-export, report-print or evidence-download buttons in the staff workspace. Volunteers cannot query raw `support_requests`, which contain legacy email/phone/address fields. Scoped RPCs omit those fields. Narrative text and media may still contain identifying information supplied by the owner. Supervisors and database operators are privileged and must be trusted; they retain their existing access under the original schema.

## Evidence

Survivors deliberately share JPEG, PNG, WebP, GIF, MP4, WebM, MP3/MPEG audio, M4A, WAV or OGG, or a public HTTPS link. Files are capped at 10 MiB each, with 20 evidence items and a conservative 50 MiB budget per case. Pending files reserve the full 10 MiB to prevent underdeclared or concurrent uploads bypassing the budget. The bucket has an 800 MiB application budget, leaving headroom in a dedicated Free project; other buckets, database size, downloads and general traffic still need monitoring. These controls cannot guarantee all traffic stays inside free quotas.

Uploads use a private bucket and random case/file paths. Submitted originals have no overwrite or deletion permission in the workspace. Client SHA-256 fingerprints are checked when displaying a copy; the database verifies stored size and MIME metadata before publication. This checks copy consistency, not origin, authenticity, or legal admissibility. Media are untrusted: there is no malware scanner or automatic factual analysis in this pilot. Active HTML/SVG/document uploads are not allowed.

Viewing requires an audited `vv_open_evidence` call and a 30-second actor-specific lease, followed by authenticated Storage download. Storage policies allow only authenticated object reads, and explicitly exclude bucket listing, signed URLs, copy/move, and overwrites. Case access is rechecked even if the lease has not expired. Open viewers re-authorize every 20 seconds and close when hidden/backgrounded or their access is denied. The open staff case also checks its scoped access every five seconds while visible and clears its contents on denial; that timer pauses with the hidden tab. Already received bytes cannot be remotely erased from a malicious device.

No evidence is sent to an image optimizer, AI service, link-preview provider, analytics service or external scanner. External links are not fetched automatically. The user sees a warning before choosing to leave; destinations can track visits and their contents can change. Browser links use `noopener noreferrer` and no referrer. Legacy HTTPS evidence links from the website are included in the private evidence library during setup.

The mobile viewer uses private app-cache files and deletes temporary copies when dismissed, navigated away from or backgrounded. Account deletion first makes shared files unavailable, removes their objects through the Storage API, then deletes Auth/database records. It refuses to delete the account while its uploaded objects remain, so a failed removal can be retried. Deleting `storage.objects` with SQL alone is not an acceptable substitute.

## Screenshots and misuse

The installed Android app enables Expo screen-capture prevention across the app, including the recent-app preview. iOS protection is requested too, but has not been device-validated. Web capture cannot be reliably blocked; neither platform can stop a separate camera, a compromised device, or a determined authorized reader copying information. Screen-capture controls are not an absolute confidentiality guarantee. The web viewer adds actor/case/date watermarks, hides previews on blur and uses no export controls; these are deterrents, not DRM.

Database-generated activity includes case opens, evidence opens, support replies, assignments, consent changes, review decisions, internal-note creation and status changes. Clients cannot edit or manufacture those logs. The activity feed exposes staff display names and actions, not their account IDs or internal-note contents, to case owners. A logged access means authorization to view was granted, not that the person read or understood the material. Repeated accesses within one evidence lease and existing privileged table reads are not individually logged. Logs are in the same database, so this is not an independently immutable audit archive.

Before a public pilot, establish staff vetting/training, confidentiality agreements, safeguarding and abuse escalation, supervision, log review/retention, incident response, and legal/privacy review. This implementation supplies access controls; software cannot promise volunteers will never misuse data. Do not promote every volunteer to `admin_users`.

## Verification

`bash scripts/test-db.sh` uses isolated PostgreSQL and a minimal Storage policy contract to check assignment, consent, hidden identities, cross-case denial, staff-only notes, sender derivation, private-bucket rules, evidence leases, signed-link/list denial, audit permissions and revocation. It applies the new setup twice. It does not replace a live Supabase Storage HTTP test.

For fictional visual QA only, run `node scripts/support-fixture.mjs`, then run the website on port 3002 with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54323`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=fixture-public-key`, and `VV_NEXT_DIST_DIR=.next-qa`. Sign in with `supervisor@example.test` and any nonempty test password. This local fixture cannot grant access to real data. Keep the real dev server on 3000 using its existing environment; never deploy the fixture or its environment values. Do not use real personal information in it.

Physical-device media selection/playback, screenshot/recording blocking, temporary-cache cleanup, live Storage uploads, end-to-end assignment/revocation, and live account-deletion cleanup still require verification with controlled accounts and disposable evidence after hosted setup. No real case was messaged or changed during local QA.

References: [Expo ScreenCapture](https://docs.expo.dev/versions/v58.0.0/sdk/screen-capture/), [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [operation-aware policies](https://supabase.com/docs/guides/storage/schema/helper-functions).
