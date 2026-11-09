# Android pilot verification

## Passed during implementation

- TypeScript and the mobile flat ESLint configuration (run directly; the parent Next.js ESLint configuration excludes mobile).
- Eighteen pure tests (including two media/link validation regressions): multilingual AES-GCM round trip, account-namespace binding, ciphertext/wrong-key rejection, timer deadlines and duplicate triggers, terminal cancellation, delayed ticks, phone normalization and location age; eight conversation-refresh regressions added on 30 October cover reply arrival, duplicate-free replacement, pause/resume, aborts, stop/account changes, superseded fetches, slow requests, retry backoff and timeouts.
- Isolated PostgreSQL tests: original and mobile schema, repeatable setup, owner CRUD, admin isolation for private mobile tables, phone/primary-contact constraints, optional report fields, and own-account deletion without affecting another user.
- Hosted REST checks deny anonymous reads of the private mobile tables. The user confirmed applying mobile-schema.sql and allowing victimvoice://auth/callback.
- Browser UI: fictional contact creation, private note save including Hindi text, guide search, 20-second rehearsal start/cancel, and local journey timer start/finish. These checks sent no SMS, calls, emergency alerts or support reports.
- Native Android debug compilation completed successfully. The internal standalone build uses the release variant with optimization disabled and debug signing; the build script records these settings explicitly.

## Requires real-device / operational verification

Phone OTP with the user's account; device authentication; sensor behavior and false positives on physical phones; location accuracy/age with denied and offline permissions; optional sound volume and interruptions; message-composer behavior across SMS apps and actual delivery; Android versions/OEM battery behavior; TalkBack and larger font scales beyond the captured test; cloud contact sync and support conversations as an authenticated user. Native Google sign-in, session persistence and account switching were confirmed by the user on 29 October 2026; this does not independently verify private-data isolation across accounts.

No automated dispatch, live journey tracking, background monitoring or nearby-volunteer service is enabled. Assigned support-volunteer access is implemented separately and requires the new hosted SQL setup. A passing build or UI review does not verify emergency response reliability. Use fictional records and never call emergency numbers or send alerts as a test.

## Native preview result — 24 October 2026

The 45.4 MiB ARM64 release-variant preview built successfully with optimization disabled, passes APK signature verification, includes its JavaScript/fonts/resources and launcher shortcut, and was installed and launched on an Android 11 Pixel 2 ARM64 emulator. Screenshots cover all four main tabs, Help, Safety setup, Journey setup, Settings and Sign-in. Home and Help were also captured at font scale 1.3 with system night mode enabled. Emulator font/theme settings were restored afterward. This verifies the captured screen renders and deep-link routing; it does not replace the real-device tests listed above.

The release manifest excludes microphone, background location, overlay, activity recognition and foreground-playback-service permissions. A fresh design reviewer scored the five requested corrections resolved: first-view check-in visibility, secondary text contrast, placeholder contrast, error contrast and direct-board provenance. Its ship verdict covers this fix list, not emergency reliability or a full accessibility certification. Screenshots are in `.impeccable/review/`.

## Hosted Google return URL — 29 October 2026

Reproduced Supabase returning the requested mobile callback to `http://localhost:3000/`. A website callback control was accepted, confirming a hosted redirect-allowlist issue. After the user saved the exact `victimvoice://auth/callback` entry under Auth URL Configuration, the same cancelled-before-authentication probe returned HTTP 302 to the exact mobile URI. No Google account authentication, token exchange or SMS was performed by this check.

The installed APK already includes the victimvoice scheme with no development host URI, so this configuration fix does not require an APK rebuild. The user subsequently confirmed Google sign-in works, the session persists, and account switching works on 29 October 2026. These are user-reported functional checks; the automated redirect probe did not perform sign-in.

## Web admin callback routing — 29 October 2026

A subsequent cancelled-before-authentication probe found the requested `http://localhost:3000/auth/callback?admin=true` returning to `victimvoice://auth/callback`. The equivalent `http://127.0.0.1:3000/auth/callback?admin=true` was accepted exactly, and the local admin login page returned HTTP 200. The mobile URI was also still accepted exactly. The web client already requests its own current-origin callback; the hosted localhost allowlist needs correction. Use the accepted 127.0.0.1 admin login for now. This probe verifies redirect routing only, not a completed Google login or admin membership.

## Automatic support replies — 30 October 2026

Both web conversation views (support admin and user) and the Android conversation now automatically fetch updates every five seconds after a completed check. They retain displayed messages and draft text during background refreshes, replace pages rather than appending duplicates, cancel superseded reads, stop while hidden/backgrounded or unfocused, and fetch immediately on return. Failures retry with exponential backoff capped at one minute; a hung read times out after 20 seconds. Mobile request content is keyed by account and request, and the web subscription stops and clears the conversation on sign-out/account change. No push notification, delivery/read receipt, new SQL or Realtime publication is involved.

Web and mobile TypeScript and ESLint checks passed, all 16 pure tests passed, and the isolated PostgreSQL owner/admin/comment access tests passed. Both local web conversation routes returned HTTP 200. The standalone ARM64 preview APK rebuilt successfully with the existing internal debug-signing settings. The regression tests exercise the shared scheduler against fictional in-memory replies, not the hosted service or a physical-device conversation. Install the updated APK and confirm a real support reply appears without refresh while the conversation is open; background notifications remain pending.

## Support workspace, evidence and capture protection

Implemented app Home support entry points, Conversation/Evidence/Team & privacy sections, private bounded media uploads, deliberate external links, client copy fingerprints, native capture prevention and cache cleanup. The app requests capture blocking through Expo ScreenCapture across native screens; iOS also enables its app-switcher blur. The standalone ARM64 internal APK has versionName 1.1.0/versionCode 2, existing internal signing, and no background media-playback/PiP capabilities.

The website now has an inbox/conversation/reference workspace, separate evidence and internal-note sections, status/assignment controls, supervisor-managed volunteer approval/suspension, scope-based role checks, actor/case watermarks, session-change clearing, hidden-window privacy cover and view closure on blur. No staff bulk export or report print tools remain. Browser capture is not preventable and delivered bytes cannot be remotely erased.

Checks passed: web production build; mobile native build; web/mobile TypeScript and ESLint; 18 pure tests; repeated isolated SQL setup plus assignment, consent, redaction, sender derivation, private notes, lease, signed-link/list denial, revocation and account/media-deletion boundaries. The SQL tests use a minimal Storage schema contract, not a running Storage HTTP service.

Isolated browser QA with fictional local data verified case navigation, chronological reply bubbles, automatic arrival while preserving a draft, evidence metadata and authenticated preview/fingerprint check, separate internal notes, case controls at a 412 px viewport, and closing an open case after the authorization-check fixture returned false. Home was also checked at 412 px, and its Ask for support button opened the signed-out support gate. Screenshots are in `../design/support-workspace/`. No real support message or case was changed. The fixture runs on port 3002 and is separate from the real project on 3000.

On 3 November 2026 the user confirmed the hosted support-workspace SQL completed successfully. Read-only probes confirmed all five checked RPCs exist and reject anonymous execution (HTTP 401 / PostgreSQL 42501); evidence, assignments, internal notes and event tables also reject anonymous reads. A fabricated public object URL was rejected, but that probe alone cannot establish bucket privacy. Still verify live upload/finalization, assignment and revocation across separate authenticated test accounts, account-deletion Storage cleanup, physical-phone media picking/playback, screenshot/recording blocking and cache cleanup. The app must be updated to the new APK. This is not a full security or accessibility certification.

## OTA bootstrap — 3 November 2026

Original APKs had OTA disabled. Configured Expo Update on the Free account for Android preview with fingerprint compatibility, public Supabase values in the EAS preview environment, and no paid plan/cloud build. Android 1.1.1/code 3 was built locally with the same prior signing certificate, embedded fallback bundle, preview channel and zero network launch wait. The first update was published; its manifest/runtime and launch-bundle integrity checks passed, while an incompatible runtime received HTTP 204. TypeScript, lint and 18 tests passed.

Settings can check/download updates without forcing a reload. Install the OTA bootstrap APK over the old app once, then confirm a downloaded update launches and the existing session/private data remain. Do not uninstall. Publication and artifact/protocol details are in UPDATES.md and ignored artifacts/ota-*.json. This does not mean the old installed APK was remotely updated.


## UI and feature flow refresh — 3 November 2026

Home, guide cards, navigation, input focus, selected recipients, journey status and support chat were refined without changing native dependencies. TypeScript, ESLint and all 23 pure tests passed. New regressions cover serialized private writes, failures and account changes, duplicate contacts/phone changes, and queued offline removal. Contact removal works locally offline, queues cloud deletion until Sync my circle, and restoration filters pending removals. The cloud sync identity is explicit and scoped to the initiating account.

Browser checks with fictional records covered contact creation, help recipient exclusion, journey start and Home status, draft save/restore with Hindi text, support submission, automatic reply arrival while preserving a reply draft, sending, evidence links, public app-image upload/finalization/preview with hash comparison, and enabling/withdrawing consent. The support checks use a loopback-only HTTP fixture, not hosted Storage or live role enforcement.

QA incident: the first test sign-in preview used SDK 58's development virtual .env module, which overrides shell EXPO_PUBLIC values with .env.local even when EXPO_NO_DOTENV is set. One test OTP request therefore reached the configured provider; no real support case or message was created. Testing stopped. The isolated preview was restarted with --no-dev and EXPO_NO_DOTENV=1, and the served bundle was checked to contain the loopback URL and no hosted project URL before further sign-in tests. Never rely on shell overrides alone to isolate a development preview.

To run the fictional support fixture, start ../scripts/mobile-fixture.mjs, then start Expo on localhost:8093 with --no-dev, EXPO_NO_DOTENV=1, EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54324 and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=fixture-public-not-a-key. Before entering any test phone, verify the served production-mode bundle excludes the hosted Supabase URL. Stop both fixture processes afterward. Fixture tokens/data are invented and must never be published.

The OTA bootstrap installed successfully on the local Android emulator. Native visual review was not completed because native computer control reported the Mac locked. Do not count installation, TypeScript or browser checks as physical-device verification. Calls, real SMS delivery, native sensor/audio behavior, physical capture blocking, hosted authenticated uploads and multi-account volunteer access remain to verify.


## Selected SMS recipients and cloud-write correction — 3 November 2026

Removed the browser Share API from help/test-contact messaging. SMS handoff now addresses the normalized, deduplicated selected contact numbers and encoded message body directly. Tests reject missing/invalid recipients and stale/invalid location snapshots. This is an SMS-composer handoff, not an automatic send or a delivery confirmation. No real SMS/call was used to test this correction. Direct sending awaits the user's choice of existing Twilio provider or Android SIM SMS.

Corrected a defect introduced in the UI refresh: contact and support-request inserts explicitly included user_id, but the actual hosted SQL grants exclude inserting that column. Ownership now uses the database default and the request client's captured initiating access token, so account switches cannot redirect a write into the next account. The default global auth client is retained for sign-in/session refresh. Added real Supabase-client request tests against the column grants extracted from the SQL source, including initiating-token isolation. These are HTTP mocks with real SDK query construction, not authenticated hosted database checks. TypeScript, lint and all 26 pure/contract tests passed.


## 4 November 2026 — SOS pilot, hosted backend and new APK

Scope: Bhopal city/commissionerate, Tripura entire state and Bhubaneswar UPD. Additive `sos.sql` applied/repeated in the existing hosted project; Edge Functions `sos` and `sos-callback` deployed. Hosted read-only checks confirmed ten SOS tables have RLS, neither anon nor authenticated can directly read incident tables, authenticated users cannot invoke the worker, and service_role can. Unauthenticated incident creation returns HTTP 401; malformed unsigned callback rejected. Vault/Edge worker secret was generated locally without printing it, temporary credential files removed, minute outbox schedule observed succeeding with HTTP 200. Hourly retention clears expired duty locations and SOS records older than seven days. No real incident, provider SMS, push or emergency call was created for QA.

Checks passed: mobile TypeScript/ESLint; 32 JS/HTTP-contract tests (injected actual Twilio request construction, uncertain outcomes, HMAC callback tampering and generic push payload); three Kotlin JVM tests (pending timeout, multipart failure vs partial acceptance, sent vs delivered); Deno checks; web production build; repeated isolated PostGIS install/access/routing fixtures, including expiry cleanup, role denial, no guessed dispatch, private-before-accept, revocation, ambiguous zones, duplicate fallback and caps. The disposable Docker fixture has no network/host ports/host volumes and rolls back fictional data.

Phone-width browser checks at 412×860 verified selected region and local preference save, actual hosted feature availability GET, fictional contact selection, direct message action without share UI, unsupported-web SIM state and local resolution. Browser private data is memory-only and was discarded with the preview tab. Captures: `../design/sos-pilot/`. The web emergency page returns 200 and an unauthenticated browser sees no authorized incidents. Authenticated multi-account hosted workflows remain unverified.

APK: `artifacts/VictimVoice-SOS-pilot-1.2.0.apk`, ARM64, version 1.2.0/code 4, existing internal certificate SHA256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Verified signature, SMS/notification permissions, native module DEX presence, embedded bundle/manifest and correct hosted URL; loopback fixture values absent. Fixed SDK 58's incremental updates-resource task reusing the old manifest/fingerprint by deleting only its generated output on each local build. Final embedded runtime `8fda9297b3b1b968636996fe7f25b2d8ef316712`, update ID `a273073c-a63f-4ba8-813b-a1fe2dfc8f28`; distinct from 1.1.1. SHA256 `785099d6abf05afe00f25415dbf2eed4ba8bd32675dafe9a97c9c7acd42a841a`. Install over the existing app; never uninstall to update.

Still required: physical single/dual-SIM, permission denial, no service/data, background/process restart, carrier delivery callbacks, real Twilio route/signature status, real FCM/push arrival, hosted separate-account approval/revocation and device screenshot/lock/accessibility checks. Provider channels remain disabled; no verified police boundaries/agencies or approved responders are present. No emergency-service uptime/delivery/response promise follows from these tests.

Android push dependency correction: no `google-services.json` / `android.googleServicesFile` exists yet. The current APK cannot register an FCM push token. Both client Firebase registration (then another native build) and matching private FCM v1 credentials on Expo are required; see SOS_SETUP.md. Notification library inclusion alone does not establish push readiness.

## 5 November 2026 — Published release preparation

Android 1.2.1/code 5 rebuilt from cleaned source with the existing signing identity. Packaged runtime `ced7ba35c9ae89770698961534d8e97e523354df`, embedded ID `e062ff04-ef5e-4b71-8872-4a7b260e2223`; SHA256 `6a494b538a493a011b903bdc1d8cb6b1813f238a3bf8f02d45fd849cb0ec034b`. Native SMS module and correct hosted URL are present; QA endpoint/key absent. This supersedes the earlier APK runtime metadata for release distribution. Expo preview publication must match this exact runtime; earlier APKs require a new install. Physical delivery checks remain pending.

The web release upgrades Next.js to 15.5.29 and Node 22, removes unused export/validation dependencies, updates compatible transitive dependencies, and wraps client search-parameter views in Suspense. Web type/lint/production build and 32 app tests pass. The production dependency audit has zero critical/high findings, with three moderate CSS/build-tool findings remaining. Vercel production/preview public Supabase variables were configured; the hosted Site URL and exact web/native callbacks were verified. No provider message was sent.


## 9 November 2026 — Conversation attachments, journey links and strong shakes

The support paperclip opens an attachment composer without changing tabs; after sharing, the composer closes and the attachment appears in the conversation. Files/privacy tabs remain optional. Supported documents now include PDF, DOCX and plain text alongside media/HTTPS links, with existing private storage, consent, leases and size budgets. Documents open through a deliberate external-reader action; external copies/capture cannot be prevented.

Journey sharing uses an owner-controlled, revocable link expiring within 60 minutes, a hashed bearer token, latest-point storage only and foreground updates every 15 seconds. Viewers see last-update/expiry and no coordinates once a point is older than 45 seconds. Anyone given/forwarded the link can view while enabled. Background/locked-screen tracking is not implemented; backgrounding stops uploads. Stop and journey completion queue revocation; sign-out persists stop intent. Hosted schema is additive in `supabase/journey-sharing.sql`.

Strong-shake recognition requires three distinct high/low acceleration pulses within 1.5 seconds, with a cooldown. It starts the existing **foreground rehearsal** countdown, not automatic emergency dispatch. Physical sensor sensitivity still needs validation.

Checks: mobile type/lint, 33 JS tests including PDF/text validation and shake/debounce checks, web build, repeated isolated SQL setup and token/owner/revocation/staleness tests. Fictional browser chat confirmed attachment selection stays in the conversation, sharing returns to Messages and the link is visible there. Fixture bundle was verified to exclude the real backend before login. No real SMS, evidence, case or location was transmitted. Real GPS/background/physical document viewing checks remain.


## Automatic shake/drop check-ins — 9 November 2026

Shake & drop alerts now default on in Settings, with a persisted off switch. A global sensor listener runs while the app is active, once contacts, alert identity, a usable SMS route and motion access are ready. Three distinct strong shakes or sustained low acceleration followed by impact open a 20-second check-in. Cancellation, disabling, account changes or backgrounding disarm it; a delayed/stalled countdown is discarded. Expiry or Send now creates one durable safety request through the existing SMS coordinator, with separate contact attempts and an active-request duplicate guard. No location is uploaded by the motion check itself. Alert text asks contacts to check on the person without claiming an assault/injury was detected. The former rehearsal route redirects to Settings. Background/locked-phone sensing is not implemented.

App wording now describes user choices, message availability, costs/privacy and supported states; setup scripts, provider/backend jargon and prototype labels were removed from user flows. Physical sensitivity and end-to-end automatic delivery still need consenting-device validation; no real alert was sent during development.

Validation: 37 JavaScript tests pass, including motion pulse/impact thresholds, countdown expiry/cancellation, stale/background/disabled/existing-request decisions and durable SOS creation. Mobile typecheck/lint and website typecheck/lint/production build pass. Fictional browser review confirms the default-on setting, off-state persistence during navigation and removal of rehearsal navigation; screenshot: `design/motion-settings/settings.png`. Edge SOS Deno check passes. No real contact was alerted.
