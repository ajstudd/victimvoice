# Mobile feature status — 4 November 2026

This is an internal Android pilot. The website is a visibility/quick-access layer and a separate support-team workspace. There is no guaranteed emergency or staffed support response.

| Feature | Available behavior | Verification / remaining work |
| --- | --- | --- |
| Home | Help panel, journey/rehearsal actions, support access, contacts, setup checklist, current journey status | Selected phone-width browser states reviewed; latest native visual review pending |
| Google / phone sign-in | Supabase authentication, session persistence, separate account vaults | User confirmed native Google/session/account switching earlier; live OTP delivery still provider-dependent |
| Trusted people | Add/edit/primary selection, deliberate calling/messaging, optional cloud copy/restore | Fictional local UI and merge/save regressions passed; cloud workflow needs authenticated device check |
| Contact removal offline | Removes locally immediately; cloud deletion queues until Sync my circle; Restore excludes pending removals | Queued removal and duplicate/changed-phone regressions passed; cloud removal needs connection |
| Help / SOS | Open 112 dialer; selected contacts receive direct SIM SMS after setup/permission; optional Twilio fallback on eligible confirmed failure/unavailability; separate composer option; fresh optional GPS; attention sound | New 1.2.0 APK required. Native status callbacks tested; physical SIM/carrier delivery remains to verify. Home opens Help without sending |
| Motion check-in | Foreground sensor rehearsal or a simulated 20-second countdown; cancellation and manual help | Rehearsal only. No automatic SMS, background sensing or emergency dispatch |
| Journey | Persisted local timer, Home status, extend, arrived/end | Start/overdue/finish browser flows checked. No background notification, live route or missed-arrival escalation |
| Guides | Offline bundled English guides, full-content search, category filters and bookmarks | Browser library reviewed. More reviewed content, Hindi and verified regional resources remain |
| My Space | Encrypted native notes and safety plan, account scope, optional device lock, deliberate share/export | Existing cipher tests and new queued-save tests passed; physical lock and cross-account privacy checks remain |
| Support requests | Review before sharing, category/priority, explicit local draft save/restore, paged inbox | Multilingual fictional submission/draft flow checked. Drafts do not upload until submission |
| Conversations | Chronological bubbles, fixed composer, automatic updates while open, guarded scroll and retry | Fictional automatic reply preserved unsent text; sending cleared sent text. No closed-app push/read receipts |
| Evidence | Private bounded image/audio/video uploads, HTTPS links, preview, copy fingerprint check | Fictional image/link upload/preview checked. Hosted authenticated upload/finalization, physical picking/playback/capture behavior remain |
| Volunteer privacy | Opt-in and withdrawal; supervisors approve and assign scoped staff through the web workspace | Hosted SQL applied earlier; isolated database policy tests passed. Multi-account hosted role/revocation checks remain |
| Device & permissions | Reads actual location permission/service, sensor availability, device screen-lock level; settings links | Native device behavior remains to verify; checks do not request location or send alerts |
| OTA | Compatible JS/UI updates on preview; manual check/download without forced reload | Runtime and live manifest/asset verification required per release; native changes require another APK |
| Emergency responders | Apply by pilot region, supervisor approval, explicit 15-minute duty, private push, bounded offers/acceptance, precise context only after acceptance | Implemented backend/app/workspace; Firebase client configuration/new build, Expo FCM credentials, verified operating teams and physical push tests pending. Distinct from support-case roles |
| Police jurisdiction routing | Bhopal, entire Tripura and Bhubaneswar pilot scopes; reviewed GeoJSON management, conservative location-accuracy matching, verified receiving accounts | Hosted seeds configured; no authoritative boundaries or police accounts onboarded. Automatic police alerts remain unavailable |
| Delivery controls | Durable unique jobs, per-account/global caps, signed callbacks, no blind resend on unknown/partial result, closure/revocation, seven-day hosted SOS retention | Mocked transport + actual PostGIS role/routing tests pass. Hosted provider and multi-account drills remain |

## Verification boundary

Android 1.2.0/code 4 includes the native SIM SMS module, WorkManager reporting and expo-notifications. TypeScript, ESLint, 32 JS/HTTP-contract tests, three Android JVM tests, Deno checks, web production build and repeated actual-PostGIS access/routing fixtures passed. Phone-width browser QA used a fictional guest contact with cloud flags disabled: direct action opened SOS status without a share popup, correctly showed SIM unavailable in web, and resolved locally. No real alert was sent.

The hosted additive schema, functions, Vault-backed minute outbox worker and hourly retention job are installed. Three pilot scopes are seeded but unreviewed; no police agency or approved emergency responder is onboarded. Twilio relay is now enabled after the user added the three provider secrets; the hosted endpoint reports it configured. Actual provider authentication and delivery remain untested. Responder push remains disabled pending Firebase/Expo setup and receiving infrastructure. These are software capabilities, not established operational coverage. See [SOS setup](../supabase/SOS_SETUP.md).

Install the new APK over the existing app without uninstalling. Runtime `8fda9297b3b1b968636996fe7f25b2d8ef316712` is separate from the 1.1.1 OTA runtime. Physical SIM/network/background behavior, real push arrival, hosted multi-account authorization drills and native visual/accessibility review remain. Background fall detection, live journey sharing, support-message push, a staffed responder network and more reviewed languages remain pending. Native capture prevention cannot stop external cameras or information retained by a previously authorized person.
