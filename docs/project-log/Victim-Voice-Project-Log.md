# Victim Voice Project Log

Feature status questions answers and decisions

Started 16 November 2026 | Latest recorded Android APK 1.2.3

This living log records the feature-status discussion below and subsequent questions and answers in this project chat. Each exchange keeps its date and the distinction between implemented software, verified behavior and a service that is actually operating. Later corrections are added as new entries rather than silently rewriting earlier answers.

## Entry 1 Feature status

16 November 2026

### User question

what features work and what do not right now?

### Assistant answer

**Victim Voice currently works as a safety toolkit and support platform. It is still a pilot, with several emergency features awaiting real-device testing or operational setup.** The latest APK is **1.2.3**.

| Feature | Current status |
| --- | --- |
| Google and phone login | Working; you confirmed login, persistent sessions and account switching. OTP availability depends on the provider. |
| Trusted contacts | Add, edit, delete and choose a primary contact. Optional cloud backup/restore is implemented; device testing remains. |
| Emergency/contact calling | Opens the phone’s calling flow. It does not automatically connect to an emergency dispatch system. |
| Safety guides | Bundled English guides, search, categories and bookmarks work offline. |
| Private notes and safety plan | Implemented with encrypted on-device storage and optional device authentication. They are not automatically backed up. |
| Support conversations | Requests, replies, drafts and status tracking are implemented. Open conversations refresh automatically. |
| Evidence sharing | Photos, audio, video, PDF, DOCX, text and HTTPS links are supported within conversations. Real-device upload/viewing and hosted permission checks need further validation. |
| Journey timer | Start, extend, finish and show an overdue check-in. It does not automatically alert someone when arrival is missed. |
| Live journey location | Implemented through a temporary, revocable link. Updates require the app to remain open and online. Physical GPS testing remains. |
| Attention sound | Implemented as a separate start/stop action. Actual loudness and behavior depend on the phone. |

<!-- page -->
### Implemented but not yet reliable enough to call verified

Entry 1 continued

| Feature | What remains |
| --- | --- |
| Shake/drop detection | You reported missed shakes. APK 1.2.3 includes faster sampling, adjusted recognition and visible listening/pause reasons. We still need confirmation on your phone. |
| Direct SIM SMS | Native sending and status handling are implemented. Single/dual-SIM, permission, carrier and network-failure tests remain. |
| Twilio fallback SMS | I checked the backend today: relay is enabled. Actual safety-message delivery has not been verified with consenting recipients. |
| Screenshot protection | Native protection is implemented, but physical-device checks remain. Browsers and external cameras cannot be reliably blocked. |
| Account deletion | File cleanup and deletion handling exist; the complete hosted flow needs controlled testing. |
| OTA updates | Server delivery was verified, but your phone reported no update. APK 1.2.3 includes the fixes directly and clearer update diagnostics. |

### Admin and Team and access

The software includes staff invitations, authenticator MFA, regional roles, employee availability, case assignment and acknowledgment, support replies, internal notes, evidence permissions, volunteer applications, employee review, independent admin approval, blocking/reporting and audit records.

These workflows passed local authorization and fictional-account tests. **Full hosted testing with separate real test accounts is still pending.** They also require actual identity checks, training and supervision—the software does not perform background checks or guarantee a volunteer’s conduct.

<!-- page -->
### Unavailable or not operating yet

Entry 1 continued

- **Nearby volunteer push alerts:** disabled. Firebase/FCM setup and receiving-device tests remain.
- **Automatic police routing:** unavailable. No verified police receiving service or reviewed jurisdiction coverage has been established.
- **A staffed emergency response network:** not established merely by configuring Bhopal, Tripura and Bhubaneswar.
- **Shake/drop detection with the phone locked or app closed:** not implemented.
- **Background live-location tracking:** not implemented.
- **Support reply notifications while the app is closed:** not implemented.
- **In-app voice/video calls, read receipts, reviewed multilingual support and a validated iPhone release:** pending.
- **Guaranteed rescue, response times or end-to-end encrypted support chat:** not provided.

**The priority now is to verify APK 1.2.3 on physical phones, test SMS delivery with consenting contacts, and complete hosted staff/evidence workflows before expanding emergency coverage.**

### Evidence and status boundary

This answer describes the project state recorded on 16 November 2026, not a claim that every implemented feature was tested end to end. The read-only public SOS capabilities endpoint returned relay enabled and push disabled. The website /admin and /join routes returned HTTP 200. These checks did not send an SMS, create an incident, grant a role or prove that staff were on duty. The code head at this checkpoint was 9998f3a.

The prior product and architecture guide remains the longer explanation of the system. This log records the discussion and decisions as they happen, starting with the feature-status exchange above.

<!-- page -->
## Entry 2 Keep a living discussion record

16 November 2026

### User request

okay lets start adding all this in a doc. this and whatever I ask you further and your answers.

### Assistant answer

Created a living project log with the current feature status and this exchange. From now on, I’ll append your questions and my answers from this chat, including decisions and changes in status. Dated entries will preserve earlier answers, with corrections recorded separately.

### Agreed working record

The Word document is the shareable reading copy. The Markdown document is its editable source. New exchanges in this chat are appended to the same log. A status change should state what changed, how it was verified and what remains unresolved. A request or recommendation is not recorded as completed work until the result has been checked.

<!-- page -->
## Entry 3 How the backend works

16 November 2026

### User question

how does our backend work, how does our app and website communicate with the backend, how is the database configured and updated?

### Assistant answer

**Our backend runs on Supabase. Both the Android app and website connect to the same backend over HTTPS. The app does not need the website server to reach its data.** Vercel hosts the website; Supabase handles shared identity, records, private files and server-side delivery work.

### The main backend parts

| Part | What it does |
| --- | --- |
| Supabase Auth | Handles Google/phone sign-in, session tokens and staff authenticator checks. |
| PostgreSQL | Stores support requests, messages, cloud contacts, workforce records, assignments, journeys and SOS records. |
| SQL functions and access policies | Check who can perform an action and which records they may see or change. |
| Supabase Storage | Stores deliberately shared evidence files in private buckets. The database holds their metadata and permissions. |
| PostGIS | Supplies geographic checks for response regions and jurisdictions. Configured geography does not establish operating coverage. |
| Edge Functions | Run server-side code for SOS processing, Twilio calls and provider callbacks. |
| Scheduled jobs | Recover pending delivery work and perform retention/cleanup tasks. |

**Private notes and the current app safety plan stay in the phone's encrypted vault.** They are not automatically copied to the shared support database. Cloud contacts are a separate, deliberately chosen backup/restore capability.

The cloud project is pkjnhdrookwdbaavsjks.supabase.co. Clients use its HTTPS APIs. They do not open a direct PostgreSQL connection or contain the database password.

<!-- page -->
### How the app and website communicate with it

Entry 3 continued

1. Each client is built with the Supabase project URL and a public publishable key. The website uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; the mobile app uses the corresponding EXPO_PUBLIC variables. These public values identify the backend, but do not grant unrestricted private-data access.
2. When someone signs in, Supabase Auth returns a session with an access token. The Supabase client library attaches the token to authenticated requests and manages session refresh. Native session data is stored through the encrypted phone storage layer; the website maintains its own browser session.
3. The client either requests an allowed table operation, such as inserting a support request, or calls a named SQL function. A remote call to a SQL function is called an RPC. Staff case access, invitations, assignments and evidence opening use checked functions for their rules.
4. The backend checks identity, database grants and policies. Sensitive functions also check role, region, assignment, consent, MFA and expiry as appropriate. Hiding a button or protecting a website route is not the security boundary.
5. The backend saves the authorized change and returns a result or error. The app shows that outcome. Open conversations check roughly every five seconds after completed requests, so new replies appear without a page reload. This is foreground polling, not closed-app push.

### Example of a support conversation

A woman submits a request from the app. It becomes a support_requests record whose owner comes from the authenticated account. An authorized employee opens that case through a scoped backend function. Replies are stored in comments, the existing table name for conversation messages. The woman's open conversation fetches permitted new messages and displays them.

The same request can be followed on the website because both clients read the same shared records. They do not need to copy a separate app database into a website database. Separate logins still need to belong to the same Auth account to access the same owner's records.

### Files and provider operations

An evidence upload saves selected bytes in private Storage and metadata in the database. Viewing requires the relevant current permissions and a short viewing lease. A file path is not permission to download it.

Twilio operations take a different route: the client sends a signed-in request to the SOS Edge Function, which validates it, records authorized work and calls Twilio using server-only credentials. Provider callbacks are signature-checked before updating delivery results. Accepted delivery work is not a human acknowledgment. Provider credentials and the service-role key never belong in the APK or browser bundle.

<!-- page -->
### How the database is configured

Entry 3 continued

Our schema is defined in version-controlled SQL files in supabase/. A schema is the database structure: tables, columns, relationships, checks, indexes, functions and access rules. Supabase Auth and Storage supply their own managed structures alongside our application tables.

The initial schema.sql was a one-time setup for the empty project. Later additive scripts introduced mobile data, private support evidence, SOS, journey sharing, safety governance and the scoped workforce. The later scripts can replace earlier function/policy definitions; looking only at the first schema gives an outdated picture of current access.

The setup includes primary and foreign keys to connect records, constraints to reject invalid values, indexes to make common reads efficient, row-level security to restrict records, and SQL functions to enforce multi-step rules. Triggers perform selected automatic work, such as deriving verified identity details and recording actions. Server-side authorization still matters when a function uses elevated database permissions.

Google/phone providers and allowed web/mobile callback URLs are configured in Supabase Auth. Twilio and worker secrets belong in server-side secret settings; worker scheduling also uses Supabase Vault. These settings are separate from SQL and are not copied into public environment variables.

### Updating data versus changing the schema

**Everyday data updates:** normal actions such as sending a message, assigning a case or stopping a journey call an allowed API or function. The database applies the change after its checks. Scheduled workers also update job results and remove expired information. No schema deployment is needed for each message or user.

**Structure and rule updates:** adding a table, changing a function or tightening permissions requires new SQL. Our current process uses reviewed SQL scripts applied explicitly to the hosted project, historically through its SQL Editor. We do not currently have an automatic, ordered migration deployment pipeline. Calling a script additive or repeatable does not remove the need to review its effects and dependencies.

**Deployments are separate:** a GitHub push saves source, a Vercel deployment updates the website, an APK/OTA updates mobile code, a SQL deployment changes database structure/rules, and an Edge Function deployment updates server handlers. None of these should be assumed to perform all the others. The initial schema must not be rerun as a reset of the existing project.

For future backend changes, the controlled sequence should be: prepare additive SQL, test access rules in an isolated database, check rollback/recovery needs, apply it explicitly, deploy dependent handlers and clients, then verify the hosted behavior. Automated migration tracking and a confirmed backup/recovery process are improvements to establish before wider operation, not capabilities we should assume already exist.

### Verification for this explanation

The explanation was checked against the website and mobile Supabase clients, direct request-write helpers, staff RPC wrappers, the SQL setup and workforce scripts, SOS handler/callback code and worker scheduling. No credentials were exposed and no production record or database setting was changed to answer the question.

<!-- page -->
## Entry 4 Project folders and files

16 November 2026

### User question

now explain each folder and file and their use in the project.

### Assistant answer

Created a complete file-by-file codebase map. It covers all 368 files tracked before the map was added, plus the six files used to maintain and deliver the map itself. Each entry names the file and explains its role. Parent folders organize the entries, and an ancestry index also includes folders that only group subfolders.

The main runtime folders are app and components for website/staff screens, mobile for the Expo application and native SMS module, shared for cross-client logic, and supabase for database SQL, authorization and server-side delivery handlers. hooks and lib contain reusable website behavior. scripts and tests verify the system. public serves website assets. design contains references/QA evidence, and docs contains manuals and decisions. Configuration files at the root control dependencies, builds, styling and tooling.

The reference explains local-only folders separately: installed dependencies, Next/Expo caches, generated Android/iOS projects, environment settings and APK artifacts are not all tracked product source. Third-party package internals and individual cache files are not catalogued as our own code. No secret values are included.

For a feature change, start with the route file, follow its screen component, then its helper and backend operation. For example, a support screen can call a client helper which calls a SQL function; the database policies/functions determine actual permission. A design screenshot is not executable code. A UI primitive may be unused, and an older planning document may describe a superseded approach.

### Reference location and use

The separate Word reference is docs/codebase-map/Victim-Voice-Codebase-Map.docx. Its Markdown copy is the editable explanation; file-inventory.json is the machine-readable mapping. The builders are included so the inventory can be checked and updated as the repository changes. The full inventory is kept separate from this chronological log so the discussion stays readable.

<!-- page -->
## Entry 5 How the mobile features work

16 November 2026

### User question

now tell me the technical details of how each feature of our app is working.

### Home, permissions and quick access

Expo Router maps the mobile routes to React Native screens. The root layout mounts shared account state and the coordinators for motion, SOS, journey sharing and responder notifications. Home reads the saved vault and live status to show the current journey and motion readiness and open Help, Support or My Circle. The Android launcher shortcut opens Help. Device & permissions reads location permission and service status, sensor availability, device lock and SIM capabilities. An action requests permission when it needs it. See mobile/src/app/_layout.tsx, HomeScreens.tsx and AccountScreens.tsx.

### Google, phone OTP and account switching

For Google, Supabase Auth starts OAuth in a browser session. The flow returns to victimvoice://auth/callback with an authorization code. The Supabase client exchanges that code using PKCE, which binds the exchange to the sign-in the app started. For phone login, the app normalizes the number, calls signInWithOtp, then calls verifyOtp with the code. Supabase manages provider delivery, issues the session and refreshes its access token. Supabase uses the mobile encrypted storage adapter to persist the session. See mobile/src/lib/supabase.ts and mobile/src/app/auth/callback.tsx.

AppState selects a vault by account ID or guest mode and clears the in-memory view during a change. A serialized writer applies edits to the current vault. Many authenticated writes use a client fixed to the initiating access token, and database rules derive record ownership from the session. See mobile/src/state/AppState.tsx and mobile/src/lib/account-client.ts.

### Trusted contacts, safety plan, notes and guides

My Circle saves names, normalized numbers and the primary contact locally. Sync my circle explicitly writes to owner-restricted vv_contacts records. Restore merges saved cloud contacts with local contacts. Local removals take effect immediately and queue cloud deletions for the next sync. The personal safety plan and private notes use the local vault. The note editor shares the chosen note's title and body through the phone's share sheet. Safety guides and the resource directory use bundled English content with local search, filters and bookmarks. External resources open separately and depend on connectivity. See HomeScreens.tsx, SpaceScreens.tsx, GuideScreens.tsx and mobile/src/lib/guides.ts.

<!-- page -->
### Emergency calls, location and attention sound

Call 112 opens the system dialer via a tel: link. The location action requests foreground permission and tries for a current position with a ten-second timeout. A valid snapshot carries coordinates, accuracy and timestamp. The safety message can include a map link when a snapshot was requested and passes a 60-second freshness check. Help also offers a separate manual SMS composer. The attention button loops a bundled audio file through Expo Audio and stops it when the user leaves Help or backgrounds the app. The call, sound and message each have their own controls. See HelpScreens.tsx and mobile/src/lib/actions.ts.

### Direct SMS, server fallback and delivery state

Message my contact validates one to five selected recipients and saves an incident with a stable ID and one attempt ID per recipient. The foreground SosCoordinator looks up each attempt before asking the Android Kotlin module to send. Android SmsManager uses the configured SIM and exposes sent and delivery callbacks. The native module persists results so a reopened screen can recover them. WorkManager can report eligible pending results to the backend. See SosCoordinator.tsx, mobile/src/lib/create-sos.ts and VictimSmsModule.kt.

If cloud features are selected, the signed-in app registers the incident with the SOS Edge Function and reports native results. The fallback rule requires opt-in, an enabled relay and a definite SIM failure or unavailability marked safe to retry. An ambiguous or partly successful send is held in its recorded state to avoid a second text. The database queues a unique delivery job for each eligible recipient. The Edge Function claims jobs, uses server-only credentials to submit SMS to Twilio, and records the provider handoff. A signed Twilio callback updates delivery status. A scheduled worker drains pending jobs and marks interrupted claims with uncertain outcomes. A handoff, carrier delivery and human acknowledgment are distinct events. See shared/sos.ts, supabase/sos.sql, supabase/sos-worker.sql and the sos and sos-callback Edge Functions.

### Shake and drop check-ins

The setting defaults on. The app requests a 20 ms accelerometer interval in the foreground after checking setup, sensor access, a possible SMS path and active-request status. Shake detection looks for three peaks at or above 1.9 g within three seconds, with the signal dropping below 1.4 g between peaks. Drop detection looks for at least 80 ms below 0.35 g followed by impact above 2.7 g within 250 ms of the last low sample. A match opens a 20-second prompt. Send now or a valid expiry starts the same SMS flow, prioritizing the primary contact and using an empty location field. Backgrounding, disabling, an account change or a stalled countdown clears the prompt. Physical detection depends on the phone and movement. See MotionSafety.tsx and mobile/src/lib/safety.ts.

<!-- page -->
### Journey timer and live location

The arrival timer saves a deadline and optional destination in the local vault. The screen compares the deadline with device time to show remaining or overdue time. Extending changes the saved deadline. Arrived or End finishes the timer. A late timer changes the display. See JourneyScreen.tsx.

Live sharing starts a separate, optional cloud session after sign-in and location permission. The app generates a random token and shares it in the web link fragment. Supabase stores its SHA-256 hash in vv_journey_live, with one active session per owner and an expiry of at most 60 minutes. The app overwrites the latest coordinates and accuracy at roughly 15-second intervals after each completed cycle while active and connected. The browser viewer passes the token to vv_journey_view and displays the latest point while it is under 45 seconds old. Anyone holding an active link can view it. Locking the phone or backgrounding pauses updates. Stop sharing or ending the journey queues revocation, and confirmed revocation clears the coordinates. Offline revocation waits for connectivity, with link expiry still enforced by the server. See JourneyLive.tsx, app/journey/page.tsx and supabase/journey-sharing.sql.

### Starting support and receiving replies

The mobile support form keeps explicitly saved drafts in the vault. Submitting sends the description, category, urgency and optional operating area to support_requests under the signed-in user. The database validates the area. The request ID opens the conversation and appears in the inbox. Staff use the web support workspace to open an authorized case and save replies to comments, the same table the mobile conversation reads. See RequestScreens.tsx, mobile/src/lib/cloud-writes.ts and components/support-workspace.tsx.

The mobile chat reads the case and pages messages in batches of 30. The shared refresh loop schedules the next read five seconds after the previous one completes and backs off on failures. It cancels an obsolete request on screen, account or app activity changes. The composer clears a reply after successful submission and retains it on failure. The loop fetches while the conversation is open and available. Support replies still need separate infrastructure for closed-app push. See mobile/src/hooks/useConversationSync.ts, shared/refresh-loop.ts and lib/support.ts.

<!-- page -->
### Attachments, viewing and case access

The conversation paperclip opens the picker without leaving Messages. It accepts supported images, audio, video, PDF, DOCX, plain text and HTTPS links. For files, the client checks type and size, computes a SHA-256 fingerprint, reserves a database row and uploads bytes to a random path in private Storage. A finalize call marks the upload ready. Failure initiates cleanup. Links store a validated URL. A completed attachment appears in the conversation and its Files view. The fingerprint compares bytes with the recorded upload. See CaseEvidence.tsx and shared/case-evidence.ts.

For support cases, assignment lets an eligible employee handle the conversation after acknowledgment. Opening an evidence item additionally requires the owner's grant. The open function checks access, records an audit event and issues a 30-second lease for that viewer. The download uses the authenticated Storage client and policy. The preview rechecks access while open. Support evidence allows up to 10 MiB per file, 20 items and 50 MiB per case, with an 800 MiB application budget. An external reader can retain a copy after the user opens a document there. See supabase/support-workspace.sql, safety-governance.sql and scoped-workforce.sql.

### Staff work, privacy controls and accountability

Invitations bind a staff role and area to a specific Auth account. A database-controlled superadmin can appoint area admins, and an area admin can appoint employees in scope. The backend validates MFA and current membership. The employee marks availability, acknowledges the assignment and clears conflicts before opening a case. Admin oversight requires a recorded purpose and an expiring lease. Staff replies go to the user's conversation. Internal notes use a separate table. CaseTeam exposes grants and reports. Reporting a helper blocks that helper for the user and revokes relevant assignments, grants and dispatch access. Independent staff review handles wider action. See app/join/page.tsx, CaseTeam.tsx and supabase/scoped-workforce.sql.

### Private areas and account deletion

The native vault stores AES-GCM ciphertext in AsyncStorage with a random nonce per write and the storage slot bound to authentication. A 256-bit key lives in SecureStore. PrivateGate can require device authentication and locks again when the screen loses focus or the app backgrounds. Native screen capture protection is requested app-wide. For account deletion, the app requests the user's incident and case attachment paths, removes those Storage objects, then calls vv_delete_my_account and clears the local account vault and session. See mobile/src/lib/storage.ts, PrivateGate.tsx, ScreenPrivacy.tsx and shared/case-evidence.ts.

<!-- page -->
### Volunteer enrollment and nearby offers

A signed-in applicant submits an area and profile through Offer support. vv2_apply_volunteer writes the application. A scoped employee claims the review, records conflict and vetting checks, and approves, denies or requests corrections. A separate area admin decides field eligibility and records supervision. Server checks require current approvals and an authenticator session for field work. Going on duty saves a location and a 15-minute availability window. See ResponderScreens.tsx, StaffMfa.tsx and supabase/scoped-workforce.sql.

With responder dispatch enabled, the SOS function submits opted-in requests to PostGIS. The selection looks for approved on-duty volunteers within 3 km, in enabled reviewed geography, with a position under five minutes old. It can offer the incident to up to three responders. A job sends an opaque incident reference to registered Expo push devices. Android delivery depends on Firebase and Expo FCM credentials. Acknowledgment expresses willingness. A coordinator's separate 15-minute dispatch grant unlocks precise location and incident chat for an authorized responder. Withdrawal or an unsafe check-in can remove access. The last recorded hosted setup had Twilio relay configured and responder push disabled. SMS relay configuration does not verify actual delivery. See supabase/safety-governance.sql, supabase/scoped-workforce.sql and mobile/src/lib/push.ts.

### Incident chat and police routing

Incident chat uses separate message functions that recheck active participant access. Shared attachments are visible to named participants under current permissions. Newly added participants need their own grant. Files are capped at 5 MiB each, 20 items and 20 MiB per incident. The cleanup worker applies a seven-day retention policy to SOS records and incident media. See IncidentChat.tsx and supabase/scoped-workforce.sql.

Police selection checks whether exactly one enabled, verified agency boundary fully covers the reported location's accuracy circle. An ambiguous match records an ambiguous jurisdiction status and suppresses automatic police offers. Bhopal, Tripura and Bhubaneswar are pilot scopes. The recorded setup had no verified agency receiving integration, so automatic police delivery remains unavailable. See supabase/safety-governance.sql and supabase/SOS_SETUP.md.

### App updates and verification

Expo Updates matches Android bundles to the preview channel and installed native runtime fingerprint. It can download compatible JavaScript and asset changes and apply them on a later launch. A native module or permission change needs a new APK. Settings shows the installed version, pending download and update reference. This walkthrough describes the Android 1.2.3 implementation and the last recorded hosted configuration. Physical SIM delivery, motion sensitivity and field dispatch require separate end-to-end verification. See AppUpdates.tsx and mobile/UPDATES.md.

<!-- page -->
## Entry 6 Staff setup and the new backend

17 November 2026

### User request and decisions

Set up a superadmin, two admins, an employee and a volunteer. Use fresh Supabase and Twilio accounts owned by Eusuf. Fix the support inbox reply field, show the signed-in staff member's name and area, and investigate an evidence download that returned Object not found.

Eusuf confirmed a fresh project. Existing cloud accounts, cases and private attachments stay on the old project. The same Google login creates a new Auth identity in the fresh project, so previously saved notes and other records associated with the old account's local vault may be inaccessible after the switch. Review anything that must be kept in the old app before changing environments.

| Person | Role | Area |
| --- | --- | --- |
| Eusuf | Superadmin | All regions |
| Sristy Banik | Admin | Bhubaneswar |
| Second designated admin | Admin | Bhubaneswar |
| Shounak | Employee | Bhubaneswar |
| Susmita Das | Volunteer applicant | Bhubaneswar |

### Create the fresh Supabase project

1. Under Eusuf's Supabase organization, turn Enable Data API on, Automatically expose new tables off, and Enable automatic RLS on. The application uses the Data API and its SQL grants required access explicitly. The project password stays with the project owner.
2. For a fresh installation, apply each SQL file in this order from the repository's supabase folder. Run schema.sql, mobile-schema.sql, support-workspace.sql, journey-sharing.sql, sos.sql, safety-governance.sql, responder-contact-privacy.sql, then scoped-workforce.sql. The latter seeds Bhubaneswar as an operating area. The tests folder contains fixtures for isolated verification.
3. Set the Supabase Auth Site URL to the website's origin and allow the web callbacks /auth/callback and /auth/callback?admin=true on that origin. Add victimvoice://auth/callback for the installed app. If testing locally, add the two web callback URLs on the actual localhost origin as well. In the existing Google OAuth client, add the new project's https://PROJECT_REF.supabase.co/auth/v1/callback to authorized redirect URIs and configure that client in Supabase Auth → Providers → Google.
4. Use the new project's URL and public publishable key in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the web. Use EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY for mobile. Test the new configuration before updating Vercel production and releasing the compatible Android update or APK.

Source for project options https://supabase.com/docs/guides/api/securing-your-api

<!-- page -->
### Bootstrap the staff accounts

Each person signs in to the new project with their own Google account. For Eusuf, use the exact confirmed login email. In the new project's SQL Editor, use the following after that first sign-in. Replace OWNER_LOGIN_EMAIL with the exact agreed address. The query grants access only to one existing confirmed Auth user and returns that user's UUID. If no row is returned, check the account and the project before going further.

```sql
with confirmed as (
  select id, count(*) over () as matches
  from auth.users
  where lower(email) = lower('OWNER_LOGIN_EMAIL')
    and email_confirmed_at is not null
)
insert into public.admin_users (user_id)
select id from confirmed where matches = 1
on conflict (user_id) do update set user_id = excluded.user_id
returning user_id;
```

The two admins and Shounak open /join and complete authenticator setup so they can share their account references. Eusuf invites the two admins via /admin/team for Bhubaneswar. One of those admins invites Shounak as an employee in Bhubaneswar. Each person enters their one-time code at /join. The inviter copies the displayed code and sends it privately to the intended person.

Susmita opens the app's Offer support screen, applies for Bhubaneswar and completes the recorded checks with the team. Shounak can claim and review the application as an employee. An independent area admin decides field-response eligibility. Enrollment and field approval are separate from access to support cases.

### Configure Eusuf's Twilio account

Configure Phone Auth under Supabase Authentication → Providers → Phone using Eusuf's selected Twilio provider. For Twilio Verify, use his Verify service. For Programmable Messaging, use his supported sender or Messaging Service as the provider requires.

Deploy sos and sos-callback to the new project using a Supabase CLI account with access. In its Edge Function secrets set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER. This is the separate Programmable Messaging setup for SOS fallback. Use Eusuf's approved SMS sender for the destination. Keep those values in the provider dashboard and server-side secrets. Trial sending has provider restrictions.

Set up outbox recovery using supabase/sos-worker.sql and the matching Vault and Edge worker secrets described in SOS_SETUP.md. Set the new project's endpoint in the Vault worker URL. Configure the web origin for SOS requests if needed. Start with relay and responder push disabled and verify a consenting recipient's OTP and, separately, one agreed test of the SMS fallback with the proper sender and relay settings.

Sources https://supabase.com/docs/guides/auth/phone-login and https://www.twilio.com/docs/messaging/services

<!-- page -->
### Fix the reply editor and check evidence

The support inbox explicitly styles the reply field and gives the Send reply button a visible background and a distinct disabled state. The header displays the signed-in member's staff profile name, role and assigned areas. The superadmin header uses the Google profile name when available, and shows All regions. The evidence watermark continues to use the role and short session identifier.

Opening a file first requests a viewing lease. The client then downloads through the signed-in Storage session with caching disabled and checks the file fingerprint. The viewer explains that a failed retrieval can be retried and may require a coordinator to check the file and its permissions. Supabase Storage can return the same 404 for a missing object or a read denied by policy. The hosted cause of the reported failure is unverified.

1. In the same Supabase project used by the app and website, check Storage for the private case-evidence bucket and the exact uploaded file. For an emergency incident use incident-evidence. In operational troubleshooting, use the matching evidence record's storage_path to check the exact path. A missing object needs the original file restored through the upload flow.
2. For an ordinary support case, confirm the employee has accepted the current case assignment, is signed in with MFA, and has an active grant for that specific item from the case owner. In the app, the owner uses the case's Privacy controls to grant it. Open the item again to request a fresh lease. For incident attachments, check the current dispatch access and that the person was selected as an attachment recipient.
3. If the file exists and the authorized user still sees the error, inspect the Storage request and RPC in Supabase logs at the time of the failure. Use the case reference and timestamp. Confirm the read policy matches the repository and that the RPC created a live lease for the signed-in user. Keep the bucket private and apply only the project's scoped Storage policies.
4. In the fresh backend, use a newly uploaded fictional file for verification. Open it as the owner and then as the assigned employee after the owner grants access. Confirm the employee loses access when the owner withdraws the grant.

Source https://supabase.com/docs/guides/storage/debugging/error-codes

The browser fixture verified employee name and region, the reply field and button under a dark system theme, successful reply submission, a simulated Storage 404 followed by a successful retry, and the layout at 390 px. The schema is installed in Eusuf's fresh project. A database check confirmed the Bhubaneswar scope, both private evidence buckets, row-level security on all application tables and no anonymous case reads. Auth was still empty. The next steps are Google and Twilio configuration, adding public client settings, staff sign-in and hosted evidence verification. The database password was entered in chat. Rotate it in Supabase before further operator use.

### Local connection verified on 17 November

The new project accepted its publishable key, and the local web and mobile environment files now point to it. A read-only Auth check showed Google and Phone disabled, and the SOS endpoint returned 404. Google setup and the first verified owner sign-in are the next steps for staff onboarding. Phone OTP and SOS fallback each need their own Twilio configuration. The live cutover is pending.

### Google Cloud ownership

Use a Web application OAuth client in the Google Cloud project Eusuf owns. The existing Android app uses the same Supabase browser OAuth flow as the website. Set the app name to Victim Voice and choose an External audience for personal Google accounts. Use the basic OpenID, email and profile scopes for sign-in. In Google, allow https://sjjlxuxqzcirvrquqbwa.supabase.co/auth/v1/callback. In Eusuf's Supabase project, enter the new Google Client ID and Client Secret and allow the website and mobile return URLs. This replaces Step 3's reference to the existing Google OAuth client.

Source https://supabase.com/docs/guides/auth/social-sign-in/auth-google

## Entry 7 Configure Twilio in the new project

17 November 2026

### User question

done all set, how about twilio

### Hosted status

The project sjjlxuxqzcirvrquqbwa returned Google disabled and Phone disabled from its public Auth settings. Both the local admin and Android Google authorize requests returned HTTP 400 before reaching Google. After adding the return URLs, confirm Enable Google is switched on and both new Google client credentials are saved in this project's Google provider. The SOS endpoint returned HTTP 404. The Supabase CLI needs a login with access to the new project to deploy the two functions. These checks did not send an SMS.

### Phone sign-in codes

1. In Eusuf's Twilio Console, create a service in Verify → Services. Use the Account SID starting with AC, its matching Auth Token and the Verify Service SID starting with VA.
2. In Eusuf's new Supabase project, open Authentication → Providers → Phone. Enable phone sign-in, choose Twilio Verify, enter those values and save.
3. Test with one consenting recipient and confirm the code completes sign-in. OTP delivery depends on Eusuf's account and destination availability.

Source https://supabase.com/docs/guides/auth/phone-login

### SOS backup SMS

1. In the same Twilio account, create a service in Messaging → Services and add an SMS sender that Twilio supports for the intended Indian recipients. Use its MG Messaging Service SID, or use an eligible account phone number in international format if sending directly from a number. Check Twilio's India sender guidance before selecting a sender.
2. In the new Supabase project's Edge Function secrets, enter TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and either TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER. Keep VV_ENABLE_SMS_RELAY and VV_ENABLE_RESPONDER_PUSH false during setup. The VA SID is used only for Verify. Keep credentials in the service dashboards.
3. Deploy sos and sos-callback. Use the new project reference when deploying the two repository functions. The app supplies its callback URL for each Twilio message. Set up the matching worker secret and Vault values in the new project, then apply sos-worker.sql for recovery and retention.
4. Enable relay for a controlled SMS test to a consenting recipient. Confirm the message arrives and the signed callback updates the delivery record. Twilio charges and trial restrictions apply independently of the Supabase plan.

Sources https://www.twilio.com/docs/messaging/services and https://www.twilio.com/en-us/guidelines/in/sms

### Google enabled after the provider was saved

The new project now reports Google enabled. OAuth requests for the local admin, hosted admin and Android flows redirect to Google with the new Supabase callback. The local staff sign-in page is running at http://localhost:3000/admin/login?next=/join. Eusuf's first interactive sign-in and subsequent superadmin grant are pending. Phone Auth is still disabled.

## Entry 8 First Google sign-in and staff bootstrap

17 November 2026

Eusuf completed Google sign-in. The database has one confirmed Google account. Its email matches the previously supplied Git identity and differs by one letter from the designated superadmin address. The database had zero superadmins when checked. The role was held pending confirmation of the exact account.

The direct IPv6 database connection was unavailable. The session pooler worked with Supabase's database CA and hostname verification. The grant checked for exactly one confirmed account with a Google identity.

### Where to enter the Twilio settings

In Eusuf's Supabase project, open Authentication → Providers → Phone to enable Twilio Verify. Enter the Account SID, Auth Token and Verify Service SID from Eusuf's Twilio account. This configures sign-in codes.

For SOS backup texts, open Edge Functions → Secrets and add each value in its own row. Use TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN from the same account, and TWILIO_MESSAGING_SERVICE_SID from the Messaging Service that has the SMS sender. Keep VV_ENABLE_SMS_RELAY false until the functions and worker are ready for an agreed delivery test. See Entry 7 for provider sources and verification steps.

### Confirmed account granted superadmin

The owner selected the signed-in account with two z's in the address. The database matched one verified Google account, added one superadmin membership and verified the role after the insert. Eusuf can open the local /admin/team screen, set up or verify an authenticator and start inviting the Bhubaneswar admins.

### Twilio trial and direct sender option

The sample request used an Account SID and a From phone number. It contained no Messaging Service SID. SOS supports a direct sender through TWILIO_FROM_NUMBER when TWILIO_MESSAGING_SERVICE_SID is absent. The sender must belong to the same account and support the intended destination. Phone OTP remains a separate Twilio Verify setup. The trial appointment template does not establish that our custom SOS messages can be delivered. Current Twilio trial restrictions include predefined SMS content and verified recipients. The legacy account remains an interim option only if its custom SMS route to the intended recipients is verified. No provider settings changed and no SMS was sent.

The sample included an Auth Token. Rotate that token in Twilio and update each integration configured with it. The sample, token and personal phone details were excluded from this log.

Sources https://www.twilio.com/docs/messaging/api/message-resource and https://www.twilio.com/docs/usage/trials

### Edge Function secrets entered

The owner reported entering the Edge Function secrets. The new project still returned HTTP 404 for sos and sos-callback. Both function entry points passed Deno type checking, and the six existing SOS tests passed. The authenticated Supabase CLI could not see Eusuf's project. Deployment needs a CLI login that can access it. The Auth settings check reported Google enabled and Phone disabled. No credentials were displayed and no SMS was sent.

<!-- page -->
## Entry 9 SOS deployment and the first SMS test

17 November 2026

### Functions and background work

The authenticated Supabase CLI could access Eusuf's new project. Both sos and sos-callback deployed successfully. A GET to sos returned HTTP 200 with relay and push off. A GET to sos-callback returned the expected HTTP 405 because Twilio callbacks use POST.

The project had no queued or claimed jobs before worker setup. The deployment added a private worker key shared by the Edge Function and Vault. The minute outbox schedule and the hourly SOS and journey retention schedules are active. The outbox job ran successfully and received HTTP 200 from the authenticated worker endpoint. The hourly retention schedules were active at verification and had yet to run.

### Requested test text

The owner asked to send one test SMS to an Indian number. The operator used a restricted temporary test function with the current provider settings and a clear test message. The first checks stopped before sending because the sender value had invalid formatting. The direct sender secret was corrected to the same phone number in international format.

Twilio rejected the single provider submission with HTTP 422 and error 572002. The sender was not the Messaging trial number assigned to the selected recipient. No SMS was sent. The temporary functions were removed. The app's SOS relay and responder push remain off.

For a trial smoke test, choose the verified recipient in Twilio Console → Messaging → Try out SMS and use the displayed From number and a Twilio template. The trial does not establish custom SOS delivery. Use a sender and account that support custom messages to the intended destinations before enabling the live relay.

Sources https://www.twilio.com/docs/api/errors/572002 and https://www.twilio.com/docs/usage/trials

### Using the older Twilio account

The owner noted that the older Twilio account worked better. A read-only check showed the old backend's relay configured and the new backend's relay disabled. Configuration flags do not establish current delivery. The older account can be used with Eusuf's Supabase project during a pilot if its matching credentials and sender are entered and a custom SMS delivery test succeeds. OTP configuration is separate and can use the old account's working phone provider settings. No provider credentials or hosted settings were changed in this check.

Twilio documents the phase-out of never-upgraded Legacy Console trials by the end of February 2027. If the old account is on that trial, check the expiration in its console before relying on it.

Source https://www.twilio.com/docs/usage/trials/legacy-console-trial-transition

### Separate account with a Messaging Service

The owner created a separate Twilio account with an MG Messaging Service. In Eusuf's Edge Function Secrets, replace TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and set TWILIO_MESSAGING_SERVICE_SID. All three values must come from the same account. Add an eligible SMS sender to the service's Sender Pool and clear the previous direct sender secret if present. Keep VV_ENABLE_SMS_RELAY false pending a delivery test. The deployed functions already read these values. Phone OTP uses a separate Auth provider configuration.

<!-- page -->
## Entry 10 New Messaging Service delivery confirmed

17 November 2026

### User request and result

After replacing the Edge Function secrets, the owner requested another test text to the previously designated recipient. One provider submission used the new Messaging Service and a custom message identifying itself as a Victim Voice test. Twilio returned HTTP 201 and subsequently reported delivered. The owner confirmed receiving the text.

A temporary test endpoint initially failed to start before any provider request. The test helper was corrected and type checked before the successful submission. The temporary endpoint was removed afterward. No credentials or recipient numbers are included in this log.

This confirms the new account can deliver a custom test text to that recipient. The check used the configured provider credentials directly and polled Twilio for status. The app's SIM-to-backend fallback and signed delivery callback still need an end-to-end test. Live SOS relay remains disabled.

### App changes needed after the provider test

The owner asked whether the app needs changes. The existing app sends cloud SMS requests to the SOS Edge Function, where Twilio credentials and the Messaging Service are configured. The mobile app already supports this backend contract.

Installed phones still need a release containing Eusuf's Supabase URL and publishable key. The local environment has been updated, but those values are embedded in the distributed JavaScript bundle. Update the release environment as well, then publish a compatible OTA update or provide an APK if the runtime requires it. The website also needs its deployment configuration and release updated for the new backend.

The fresh Supabase project issues new user identities, so users need to sign in again. Saved local vaults are keyed by user ID. Review or deliberately export private notes under the old account before switching, and keep the app installed to preserve its device-bound encryption key. Old cloud cases and files stay in the original project under the chosen fresh-start approach. A controlled full app fallback and callback test is still pending, and live relay is off.

Sources https://docs.expo.dev/guides/environment-variables/ and https://docs.expo.dev/eas-update/runtime-versions/

<!-- page -->
## Entry 11 App and website published on the fresh backend

17 November 2026

### Requests and published releases

The owner requested the Android OTA and the website release, and asked whether Vercel needs changes. The Android preview update is published as 01a1e839-3171-7165-a1eb-11465691945c. Its native runtime matches builds 1.2.2 and 1.2.3. Expo’s preview environment now has Eusuf’s Supabase URL and public key. No new APK is needed for those builds; older runtimes were not updated.

The live Expo manifest returned the published update ID. Its launch bundle passed the integrity check and contains the new backend settings, with the old project absent. An incompatible runtime received HTTP 204. Mobile typecheck, lint and all 46 tests passed before publication. Actual phone download and launch still require user confirmation.

The website is live at https://victimvoice.vercel.app on Vercel deployment dpl_2BofvLoibLnbXihwCfB3wiYqY7Le. Production and preview variables were updated to Eusuf’s project. Browser checks passed for nine public and staff routes, the live JavaScript uses the new settings, and Google sign-in requests use the website callback for both users and staff. Completing Google sign-in still needs the user’s account. Web lint, typecheck and five staff-routing tests passed.

### Repository and author policy

Vercel could not connect to the private EusufZzaman repository. Its existing ajstudd Git connection was restored. The owner chose to synchronize the current source into ajstudd/victimvoice instead of granting a new integration access. That synchronization uses a normal commit that preserves the repository’s existing history.

The owner clarified that commits to ajstudd/victimvoice must use ajstudd as author and committer, using that account’s verified GitHub noreply identity. Commits to EusufZzaman/victimvoice continue to use Ezz and the requested two-z Gmail. The repositories retain their separate histories. Vercel’s existing connection and updated variables support the selected publishing route.

### Applying the releases and remaining setup

On the phone, open Settings → App updates, check and wait for the download, then fully close and reopen. Sign in again to the fresh backend. Keep the app installed to preserve its device-bound vault key; old local vaults and cloud cases do not automatically transfer to new account IDs.

Google Auth is enabled. The website phone option is hidden because Phone Auth is still disabled in the new project. Its provider setup is separate from the successful Twilio text test. Live cloud SOS relay and responder push remain off pending their end-to-end checks. No manual Vercel environment change is needed for this release.
