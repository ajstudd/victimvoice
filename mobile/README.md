# Victim Voice Android pilot

The mobile app is the primary product. This Expo 58 / React Native app shares Supabase Auth and support requests with the website. The approved visual direction is in `../design/app-concepts/05-redesigned-core-screens.png`.

## Run

Use Node.js 22 or newer. From this directory:

```sh
npm ci
cp .env.example .env.local
npm run web -- --port 8091
```

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the existing project URL and public key. Never put the database password, Twilio token, or Supabase service-role key in this app. Public values are included in the compiled app; row-level security protects database access.

For Android, install JDK 21 and the Android SDK, set `JAVA_HOME` and `ANDROID_HOME`, then run `npm run android`. Use an installed native build for native Google OAuth, device authentication, location, sensors, and audio. Web is a layout/interaction preview; private data is deliberately kept in memory and disappears on refresh. Browser Google login uses the existing website, rather than this preview.

`npm run apk` generates native code from app.json/plugins and builds an ARM64 internal preview at `artifacts/VictimVoice-preview.apk`. Its JavaScript, fonts, guides, and attention sound are bundled; Metro is not required. Optimization is disabled for this internal preview. It uses the generated debug signing key for internal testing, despite the release build variant. Configure production signing before store distribution. The initial native build requires substantial disk space for the SDK, NDK and Gradle caches.

## Over-the-air updates

OTA support is configured for the Android preview channel. The original 1.0/1.1 APKs cannot receive it; install the OTA-enabled 1.1.1 bootstrap APK over the existing app once. Compatible changes can then download on launch and apply on a later launch, without a forced restart. New native capabilities still require an APK. See [OTA setup, publishing and verification](UPDATES.md).

## Backend setup

For a fresh project, run `../supabase/schema.sql`, followed by `../supabase/mobile-schema.sql` and `../supabase/support-workspace.sql` in the Supabase SQL Editor. For the existing project, run only the new additive support-workspace script; it does not reset cases. These are repeatable setup scripts; there is no legacy data import. For the existing hosted project, the user confirmed the original/mobile setup and callback configuration on 23 October 2026, then the support-workspace setup on 3 November 2026.

Enable Google and the existing SMS provider in Supabase Auth. Allow `victimvoice://auth/callback` under Auth → URL Configuration → Redirect URLs. The native app uses PKCE and the browser authentication session. Leave Google client secrets and SMS credentials in Supabase. Native end-to-end authentication still requires a real account/device check.

The mobile tables use owner-only policies, including isolation from website admins. Support requests are deliberately separate: submitting a request allows authorized admins to read it. The user sees a review/disclosure screen first. A support inbox does not establish a staffed response service. The account-deletion RPC deletes only the authenticated user's account and cascaded records.

## Implemented

- Four main tabs: Home, My Circle, Guide, My Space; guest access to core help and guides. Home includes Ask for support and existing-conversation access, immediately below the active-safety entry.
- Trusted contact create/edit/delete, primary contact, deliberate cloud backup/restore when signed in. Saving never invites or messages a contact.
- Manual emergency calling and contact message composition. Optional fresh location snapshot, marked with its time, is added only after the user requests it. Opening a composer is never reported as delivery.
- Optional looping attention sound with a stop control; stops on leaving the screen or backgrounding.
- Twenty-second motion check-in rehearsal, cancel path, foreground accelerometer subscription and wall-clock deadline logic. No automatic dispatch.
- Local arrival timer, extend/finish, optional destination. No route tracking, background notification or missed-arrival alert.
- Bundled introductory safety guides, search, categories, saved guides and official resource links.
- Encrypted native private notes and safety plan; chosen text sharing/export, deletion, optional device authentication for private areas. Device loss/uninstall can make local notes unrecoverable. Exported/shared copies are outside the app's encryption.
- Google/phone authentication integration; private Supabase contacts; support request creation/list/detail, paginated conversation, account deletion and sign-out. Open conversations automatically check for replies and status changes every five seconds after each completed fetch. Checks stop when the screen loses focus, the app backgrounds, or private space locks, and catch up on return. Background checks keep existing messages and draft replies in place; failed sends retain the draft. No push notification is sent when the app is closed.
- Case sections for Conversation, Evidence, and Team & privacy; private image/audio/video sharing, deliberate HTTPS links, SHA-256 copy checks, in-app previews, and revocable consent for approved, assigned volunteers. See [support privacy and setup](../SUPPORT_PRIVACY.md).
- Native screen-capture prevention, plus app-switcher privacy protection. A browser and a separate camera cannot be reliably controlled.
- Android launcher long-press shortcut to Get help. This opens the app; it does not send an alert or bypass a device lock screen.

## Release boundaries

This is a pilot, not a completed emergency response system. Background/locked-phone motion detection, automatic contact alerts, live journey sharing, push delivery receipts, verified nearby responders, Hindi/localization and iPhone validation remain planned. Nearby help explicitly states that no nearby-response network is operating. Assigned support volunteers in the web workspace are a separate, consent-based role; staffing, vetting and training are operational requirements. There are no simulated delivery, responder, or verification claims.

The implementation uses no paid Supabase add-on. Private evidence uploads use a bounded Storage bucket (10 MiB/file, 50 MiB and 20 items/case, 800 MiB overall for this bucket); downloads still consume egress. Conversation polling runs only while that screen is visible and foregrounded. Mobile checks read the request plus at most 31 message rows (30 displayed plus a pagination lookahead); failed checks back off up to one minute and time out after 20 seconds. The existing Supabase row-level policies still enforce access. The conversation refresh itself needs no Realtime publication; new evidence and volunteer access require the support-workspace SQL setup. Active usage still consumes database requests and egress, so monitor free-tier capacity; existing SMS-provider charges are separate. Do not load-test SMS or dispatch emergency messages during QA.

## Checks

```sh
npm run typecheck
npm run lint
npm test
# From the parent web app, with PostgreSQL available:
bash scripts/test-db.sh
```

The pure tests cover encryption round trips, namespace isolation, tamper rejection, phone normalization, location age, countdown deadlines and cancellation. Database tests apply both setup scripts and check owner/admin isolation, constraints and account-deletion boundaries.

Current dependency audit reports two upstream advisory roots (`braces <=3.0.3` and `node-forge <=1.4.0`), propagating through Expo/Metro CLI dependencies. At the time of this build those are the registry's newest versions. Do not apply npm's suggested downgrade to Expo 44 / React Native 0.72. Track upstream fixes before public distribution; keep development servers local. This audit is not a security certification.

The internal APK was built, signature-checked, installed and rendered on the Android emulator on 24 October 2026. See [QA.md](QA.md) for the precise verification scope and outstanding physical-phone checks.

Design references: [surface brief](DESIGN_BRIEF.md), [design system](DESIGN.md), and [machine-readable tokens](.impeccable/design.json).


## SOS pilot update — 4 November 2026

Install `artifacts/VictimVoice-SOS-pilot-1.2.0.apk` over the existing preview. Settings → Safety message setup configures SMS permission/default SIM, alert identity and separate Twilio/volunteer/police consents. Help → Message my contact directly attempts selected-contact SMS and opens actual per-contact status. A separately labeled composer option remains. Emergency responders apply through Settings and need supervisor approval at `/admin/emergency`.

The Supabase schema, functions and scheduled outbox/retention jobs are deployed for Bhopal, Tripura (entire state) and Bhubaneswar. Twilio/push credentials, authoritative geography, verified receiving teams and physical-device checks are still required. These regions are configured scopes, not live police coverage. Existing motion/journey prototypes do not automatically trigger this dispatcher. See [SOS setup](../supabase/SOS_SETUP.md), [current features](FEATURES.md) and [QA](QA.md).
