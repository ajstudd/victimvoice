# Victim Voice — SOS delivery, nearby responders and police routing

Approved pilot plan · 4 November 2026 · Android first, India first

The user approved this plan and selected Bhopal city/commissionerate, the entire state of Tripura, and Bhubaneswar Urban Police District. The 1.2.0 Android preview implements SIM-first SMS, optional Twilio fallback and scoped responder workflows. The additive SOS schema, Edge Functions and background worker are deployed to the existing Supabase project. Twilio/push provider setup, reviewed geographic boundaries, verified receiving teams and physical-device delivery checks remain required. This does not establish operational police coverage or background sensing. Existing support-case volunteers are not automatically approved as emergency responders. See [deployment status and setup](supabase/SOS_SETUP.md).

## Confirmed user direction

- Implement both SMS transports: use the phone SIM when it can send; otherwise use Twilio through the backend.
- Notify eligible nearby volunteers using push notifications.
- Map police stations and their zones so an SOS can reach an appropriate police recipient automatically where an operational receiving channel exists.
- Keep the Supabase backend within Free limits for a bounded pilot; account separately for SMS/carrier and operating costs.
- Review this plan before implementation.

## 1. The SOS experience

During setup, the user selects trusted contacts, grants supported permissions, selects a default sending SIM on dual-SIM phones, and enables optional Twilio fallback, nearby responders and police sharing separately. Set up notification/privacy preferences and quiet/attention sound behavior before an incident. Explain that SIM and Twilio have different sender numbers. Adding a contact alone continues to send no invitation or alert.

A deliberate SOS starts immediately, without the sensor-rehearsal countdown or a share sheet. Create one incident ID, record the selected sharing scope, and attempt trusted-contact SMS while the network-dependent volunteer/police routes start independently. No SMS route should wait for a volunteer to accept, a map to load or a precise GPS fix. Use a fresh snapshot if available; otherwise explicitly label a last-known location or send without location. Do not silently share location when permission/consent is absent.

The active screen shows each contact and route separately: sending, accepted/sent, delivery confirmed where observable, delivery unknown, failed, or unavailable. Response states are separate: notification offered, responder acknowledged, assigned, responding, arrived, resolved. Never infer that a responder is coming from a push receipt or an SMS-provider response. Offer Call 112, call a trusted person, make/stop sound, and cancel/resolve as separate actions.

An automatic sensor alert remains a later, independently validated trigger. Its message must say a check-in expired without a response, not that an assault or fall was proved. No background capability is added merely by wiring a dispatcher.

## 2. SIM-first SMS with Twilio fallback

| Situation, per recipient | Proposed behavior |
| --- | --- |
| Supported Android device, permission granted, chosen SIM available | Attempt native SMS from that SIM; record native sent and delivery callbacks |
| No usable SIM, unsupported platform, permission denied, or a confirmed pre-submission/native send failure | Attempt Twilio when an authenticated account, configured relay and internet are available |
| SIM/carrier accepted the message but no delivery report arrives | Keep delivery unknown; do not treat this as proof of failure and blindly resend |
| Submission result is ambiguous, or a multipart message partially sent | Record uncertainty and reconcile callbacks. Do not automatically create duplicate whole-message sends |
| Confirmed terminal delivery failure | Evaluate an eligible alternate route once, excluding permanent failures such as invalid destination or recipient opt-out |
| Cellular SMS works but internet is absent | Send trusted-contact SMS locally. Volunteer/police network dispatch remains unavailable until connectivity returns |
| Neither channel works | Show the actual failure and available calling/local-sound actions; do not show a success state |

Use one stable incident ID with separate recipient/attempt IDs. Persist native attempts before invoking the radio and store backend jobs transactionally before calling Twilio. A server lease/claim controls transport ownership while online. When a device has taken ownership of SIM sending, the server must not independently send Twilio merely because the device goes offline. Reconcile offline results on reconnect, expire stale jobs and avoid overlapping attempts after process restarts. External SMS networks cannot promise exactly-once delivery; test ambiguity and late results explicitly. A deliberate resend can remain available with a warning that an earlier attempt may still arrive.

Keep SMS short, with a user-chosen identifying name, callback number if configured, incident reference, timestamp and the chosen location information. Twilio messages must identify whose alert it is; replying/calling the provider's sender number must not be mistaken for reaching the woman. If a contact-view link is used, issue a short-lived, recipient-scoped token, store its hash and support expiry/revocation. Explain that forwarded SMS or a location already disclosed cannot be remotely erased. No journal, case evidence, account email or movement history is automatically included.

Twilio credentials stay in backend secrets. Use authenticated, owner-scoped saved recipients, recipient consent/opt-out handling, per-account/destination rate limits, a capped relay budget and signed/validated provider callbacks. Relay setup explicitly enables cloud processing of chosen contact numbers. Google-authenticated accounts can use the relay without requiring phone login. Guests keep native SIM/calling access; unauthenticated public requests cannot trigger paid SMS.

Android direct SMS requires a native module, SEND_SMS runtime permission and a new signed APK. Google Play lists physical-safety/emergency SMS as an eligible exception subject to review; approval must not be presumed. Do not request SMS inbox-reading permissions. Choose the default SIM during setup. A later iPhone version can use the backend route; Android SIM capability is not a cross-platform assumption.

## 3. Nearby volunteer push alerts

Create an emergency-responder role distinct from the existing case-support volunteer role. A person applies, is verified/approved, receives role-appropriate training and supervision, chooses service areas and goes explicitly available. Approval to investigate a support case does not grant SOS location access, and vice versa.

Match a small bounded wave of approved, on-duty responders using a recent availability/location heartbeat, service area and configured distance. The pilot can propose three responders initially, then expand a second wave if nobody acknowledges; exact distance, freshness and escalation windows must be tested with the pilot partner rather than represented as response guarantees. Do not delay contact SMS while matching.

Use expo-notifications with Expo Push/FCM on Android and APNs later. Push carries a generic notice plus an opaque incident reference; fetch sensitive details only after server authorization. No woman’s name, precise coordinates, phone number, evidence or bearer access token in lock-screen payloads. Expo push receipts record handoff, not user attention or responder acceptance.

A verified responder can acknowledge availability. The server atomically assigns a bounded team and releases only the location/details permitted by the survivor's prior policy. Assignment/access expires and is revoked on cancellation or suspension. No public map of women, unbounded alert browsing, arbitrary nearby-user queries or blanket access to support cases. Supervisors can remove a responder, review access and handle abuse.

If nobody is available, say so and retain the other routes. Responders receive clear protocols for contacting appropriate services and avoiding confrontation; the product must have an operating owner for the pilot network.

## 4. Police station directory and jurisdiction zones

Model station locations and actual service-area boundaries separately. Proposed hierarchy: country → state/UT → district/commissionerate → station/service area. Support shared or overlapping areas and specialized agencies without assuming that a postcode, ward or closest building defines police responsibility.

For each station store its official identity, point location, verified public contact channels, operational receiving endpoint, responsible organization, source and last-verification date. For each jurisdiction store versioned polygons, official provenance, station/control-room associations and effective dates. A publicly listed number is not automatically a mobile SMS receiver or an actively monitored SOS endpoint. Approximate directory records are usable for discovery but not for claiming authoritative automated routing.

Use Supabase PostGIS for indexed point-in-polygon and proximity queries. Route a fresh incident location to the verified responsible jurisdiction and an enabled, monitored recipient. Near a boundary, or when GPS uncertainty crosses multiple areas, do not silently select a station with false precision. Show uncertain jurisdiction and use the configured control-room/supervisor review path. If boundaries are missing, show nearby verified stations as suggestions, not confirmed jurisdiction. Without location, request an optional landmark/area without blocking contact alerts; otherwise leave police auto-routing unavailable.

Police can receive alerts only after an authorized receiving route is configured: verified officer/responder app push, a staffed agency web inbox, an agreed SMS-capable duty number or an official integration. Approve police accounts separately through the organization, scope them to their jurisdiction and record acknowledgments/handoffs. Do not automatically notify every scraped number, send unmonitored emails, impersonate a police account, or claim an FIR/official dispatch was created.

India's ERSS is state-centric, with emergency signals handled through state/UT PSAP/control rooms and dispatchers. Investigate an authorized ERSS/state-control-room integration with the pilot's police partner; do not assume public third-party API access or access to the 112 India volunteer network. Keep user-initiated Call 112 available even when a station has joined the platform.

Recommended rollout: verified directory and jurisdiction suggestions first, then automatic routing to onboarded police recipients in the pilot area, followed by official control-room integration if an agreed operational pathway is available.

## 5. Backend and operational workspace

Stay on the existing Supabase project. Add separate SOS records instead of repurposing sensitive support-case evidence as an emergency feed.

| Component | Responsibility |
| --- | --- |
| SOS incident | Owner, selected disclosure scope, lifecycle, trigger type and location freshness/accuracy |
| Recipient attempts and event log | Per-channel state transitions, native/provider IDs, deduplication and audit |
| Durable dispatch outbox | Transactional enqueue, transport claims, limited retries, expiry and recovery |
| Device push registrations | Authenticated device tokens, invalid-token removal, sign-out/account-change handling |
| Emergency responder profiles/assignments | Approval, duty status, expiring eligibility, atomic acceptance and scoped access |
| Station directory and jurisdiction areas | Verified sources, map geometry, routing confidence and version history |
| Agency recipients/routing rules | Monitored endpoints, service areas and agreed escalation/handoff behavior |

Backend functions authorize users, derive recipient numbers server-side for relay sends, match responders, send Twilio/push, validate callbacks, handle acknowledgments/cancellation and expire access. Persist work so a function restart does not lose an incident. Worker scheduling, callback deadlines and retry ownership need tests under the actual pilot deployment; browser timers are not the dispatcher.

Extend the admin support workspace with a separate Live incidents queue, map/list view, attempt status, assignment, acknowledgment and escalation controls. Include volunteer approval/duty controls and station/zone management with a review step before publishing a route. Police/volunteer views expose only authorized emergency data, with audit and immediate suspension/revocation. Existing narrative/evidence access rules remain separate.

Encrypt local pending incident state; keep raw sensor samples on device. Store only incident-related location, apply short reviewed retention to transient location/availability data, index geographic queries and avoid continuous full-history GPS streaming. Public notifications contain no precise location. Cancellation revokes app access and notifies people already offered an alert where supported; SMS already sent cannot be recalled.

## 6. Free-tier and reliability boundary

A geographically bounded pilot can be designed around Supabase Free quotas with indexed geographic queries, bounded matching waves, active-session updates and retention/cleanup. Measure database size, storage, egress, function use and concurrent subscriptions before expansion. Free projects can pause after inactivity; the plan does not imply an emergency-service uptime commitment on a free project.

Expo Push has no sending fee but delivery is best effort. Twilio is billed separately, and phone-SIM SMS follows the user's carrier plan. Verification, responder staffing, police coordination and support operations are separate real costs. Do not silently disable an alert because a budget cap was reached: show that the relay is unavailable and retain available native/calling routes. Provider failures, rate limits and budget exhaustion must be visible to operations as well as the initiating user.

Twilio and push require internet connectivity. An offline phone cannot notify our volunteer/police backend merely because it has a saved incident. Sync pending incidents on reconnection only under explicit freshness/expiry rules; old canceled/resolved incidents must not trigger new emergency broadcasts.

## 7. Build order and acceptance gates

| Phase | Deliverable | What must pass before enabling |
| --- | --- | --- |
| 1. Delivery foundation | Native SIM sender, Twilio relay, per-recipient states, setup disclosures, updated APK | Consenting test contacts; single/dual SIM; denied permission; no SIM/data; terminal failure; multipart/late/unknown outcomes; duplicates; callback validation; quota exhaustion |
| 2. SOS coordinator | One incident across transports, durable jobs, optional location, cancel/resolve and sound controls | Restart/offline recovery, stale GPS, account switching, replay/repeated taps, no hidden duplicate fallback and honest failure states |
| 3. Volunteer pilot | Approved emergency responders, availability, push, bounded matching/acceptance and incident workspace | Real-device token/notification tests, stale duty/location, no responders, competing acceptance, cancellation/suspension, private-data isolation |
| 4. Police geography | One pilot area's verified station directory and jurisdiction polygons | Source/agency review; boundary ambiguity; low-accuracy/no-location cases; no guessed authoritative zones |
| 5. Police dispatch pilot | Verified monitored police recipients and agreed routing/escalation | Agency acknowledgment/handoff drills and access/coverage tests; automatic route only where operationally enabled |
| 6. Expansion | More regions, supported devices and later iPhone backend delivery | Operational capacity, delivery/acknowledgment evidence, free-tier usage and funded costs reviewed |

Keep mock-provider tests and rehearsals incapable of sending actual alerts. Real delivery drills use explicitly consenting contacts/responders and an agreed police test channel, never unsolicited alerts or live emergency-number tests. Measure accepted, delivered where observable, acknowledged and arrival separately. Do not set promises of response time or detection accuracy before evidence exists.

## 8. Remaining planning decisions

- Pilot city/district and an organization responsible for responder supervision.
- Participating police station/control-room contacts and official boundary sources.
- Twilio operational sender configuration, recipient setup and spending budget.
- Supported Android devices and the observed delivery/ambiguity policy, including whether a user explicitly chooses a secondary send when the first result is unknown.
- Approved responder wave sizes, location freshness, acknowledgment windows, incident expiry and retention.

## Primary references checked 4 November 2026

- [Android SmsManager: sent/delivery callbacks and permission](https://developer.android.com/reference/android/telephony/SmsManager)
- [Google Play: physical-safety SMS exception, subject to review](https://support.google.com/googleplay/android-developer/answer/10208820)
- [Twilio: outbound status tracking](https://www.twilio.com/docs/messaging/guides/track-outbound-message-status)
- [Expo Push: cost, receipts and delivery guarantees](https://docs.expo.dev/push-notifications/faq/)
- [Supabase PostGIS](https://supabase.com/docs/guides/database/extensions/postgis)
- [Supabase Free plan quotas and inactivity pause](https://supabase.com/pricing)
- [MHA: Emergency Response Support System](https://www.mha.gov.in/emergency-response-support-system-erss)
- [112 India: existing official service and SHOUT information](https://112.gov.in/)
