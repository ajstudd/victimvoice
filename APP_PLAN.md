# Victim Voice — Mobile App Plan

Draft for product review · 23 October 2026

Read alongside [the product vision](PRODUCT.md). This is a capability and release plan, not a statement that these features already exist.

## Decisions and open choices

- **Confirmed:** Android first, iPhone later. The mobile app is the primary product; the website provides visibility and quick access.
- **Confirmed:** women in India first, with country-specific expansion later.
- **Confirmed:** keep Supabase within its Free plan; account separately for SMS and other operating costs.
- **Confirmed 4 November 2026:** plan Android SIM-first SMS with Twilio fallback, nearby emergency-volunteer push and verified police-jurisdiction routing. Approved for Bhopal, Tripura (entire state) and Bhubaneswar. Software implemented in the 1.2.0 internal preview; delivery credentials and operational onboarding remain. See [Emergency response plan](EMERGENCY_RESPONSE_PLAN.md).
- **Open:** whether Victim Voice will run its own support team. Plan both trusted-contact/external-service help and a staffed service; do not imply a team is available before it exists.
- **Proposed:** pilot with adults first. A service for minors needs its own safeguarding, consent, and escalation design before inclusion.
- **Confirmed:** initial SOS pilot regions are Bhopal, Tripura (entire state) and Bhubaneswar. Expo/React Native is the Android app stack.
- **Open:** reviewed languages, support/police partners and physical Android device coverage.

## 1. The promise

Help a woman prepare, reach someone when she feels unsafe, understand her options, record what happened, and continue getting support afterward.

The home screen should answer three questions immediately: **How do I get help now? Who can I reach? What can I do next?** Urgent actions must remain accessible without completing a profile, writing a report, or signing in.

“One tap away” means a prepared entry point to a clear action. Define the exact action: opening emergency calling, opening a prefilled message, or activating a configured feature. System confirmation steps and required permissions must be visible during setup; a button press must never be presented as proof that somebody is responding.

## 2. App structure

Proposed primary navigation: **Home · My Circle · Guide · My Space**. Keep **Get help** persistently accessible and give active sharing/check-ins a clear place on Home. Settings and account controls live under the profile menu.

| Area | What is there | What the user can do |
| --- | --- | --- |
| Home | Immediate help, selected trusted contact, active safety session, saved next action | Reach help quickly, see what is active, stop sharing |
| Get help | Emergency call action, contact call/message, location snapshot, connection status | Choose a recipient and action, understand whether anything was actually sent |
| My Circle | User-chosen contacts, contact preferences, sharing permissions | Add people manually, test a message, choose who receives what, remove access |
| Guide | Short, reviewed guides and a searchable service directory | Find situation-specific options, save guidance offline, reach a relevant service |
| My Space | Private incident notes, support requests, follow-up messages, personal plan | Document privately, decide what to share, follow progress and next steps |
| Profile and privacy | Language, account, app lock, notifications, permissions, exports/deletion | Control identity, disclosures, storage, and device visibility |

No feed or dashboard of frightening incidents on the landing screen. Default to calm, useful actions. Select a visual direction separately when designing the screens.

## 3. Capability plan

**First release** means part of the initial Android pilot. **Next** means after pilot reliability is established. **Conditional** means a named operational or technical dependency must be met.

| Capability | What the app will do | Stage and boundary |
| --- | --- | --- |
| Emergency access | Open the system emergency calling flow for India’s 112 service; keep the number and action available offline and without login | First release. Does not claim direct access to emergency dispatch systems |
| Contact someone I trust | Call a selected person or open a prefilled SMS/share message asking for help | First release. Sending through another app follows its confirmation flow; opening a composer is not delivery |
| Share where I am | Add a current location snapshot, timestamp, and accuracy to a user-chosen message; allow an address/landmark when location is unavailable | First release. No location permission required to open help |
| Quick entry | Android home-screen shortcut/widget to open the chosen help action; a rehearsal that does not send real emergency alerts | First release, after device testing. No promise of universal lock-screen or hardware-button control |
| Active safety check-in | During an explicitly armed session, investigate unusual phone motion/impact and ask whether the user is okay; proposed default is a 20-second cancelable countdown | Early Android prototype; automatic contact alerts require tested sensing/prompt behavior and a supported delivery channel. See [Active Safety](ACTIVE_SAFETY.md) |
| Audible attention alarm | Let the user make a noticeable sound locally, or opt into a delayed sound as part of SOS; quiet mode remains available | Prototype and first pilot where validated. Sound and sending are separate controls |
| Nearby responder SOS | Notify a bounded set of eligible nearby volunteers/partners, with controlled acceptance and location access | Conditional on opt-in, vetted responders, coverage, supervision, abuse controls, and reliable delivery. No public location broadcast |
| Trusted circle | Manually add contacts, choose primary/backup recipients, set sharing preferences, remove a contact | First release. No address-book upload by default; a family member is not automatically trusted |
| Personal safety plan | Save preferred contacts, places to go, important information, and chosen steps for situations the user anticipates | First release. Private and editable, with no automatic sharing |
| Situation guides | Short guides for feeling followed, harassment at home/work/in public, online abuse, and supporting a friend | First release. Reviewed, sourced information; medical/legal content needs qualified review |
| Help directory | Filter services by location, language, purpose, hours, eligibility, fees, and contact method; show source and last review date | First release with a small verified directory. Label unavailable/unconfirmed services clearly |
| Private incident journal | Save notes, dates, and a timeline; keep a note private until the user chooses to share it | First release, initially text. Separate private notes from submitted support requests |
| Support requests | Submit a chosen account of an incident, receive a reference, and track available responses | First release for real recipient services only. Avoid mandatory accused details, evidence, or exact home address when not needed |
| Recovery and follow-up | Save useful resources and next actions; set optional reminders; find counseling, legal, and other support resources | First release. No forced retelling, pressure to report, or automatic notification to relatives/police |
| English/Hindi access | Plain language, readable text, screen-reader support, large controls; reviewed translations | Proposed first release. Prioritize additional languages based on pilot users; do not auto-translate urgent guidance without review |
| Offline essentials | Keep emergency contact actions, selected guides, personal plan, and chosen drafts on device | First release. Show what is available; network requests remain visibly unsent until confirmed |
| Live location sharing | Share during a user-started, time-limited session; show freshness, who can access it, and a stop/revoke action | Next. Requires background-location validation, expiring private access, and battery/traffic budgets |
| Journey companion | Start an expected-arrival session, record destination optionally, check in, extend, or finish | Next. Initial reminders are local; no automatic rescue claim |
| Missed check-in escalation | Notify configured contacts when an agreed deadline passes and show outcomes | Conditional. Needs dependable scheduling, delivery/retry infrastructure, recipient onboarding, and a funded failure-handling model |
| Evidence attachments | Add selected photos/documents; preserve originals and metadata where possible; export only chosen items | Next. Requires secure storage, upload limits, retention/deletion design, and review of how records may be used. No claim of guaranteed legal admissibility |
| Staffed support | Private conversations, case assignment, human follow-up, appointment/referral tracking | Conditional on an actual staffed service; see the two operating models below |
| Community support | Moderated experience sharing, pseudonyms, reporting/blocking, peer support | Later, after moderation staffing and abuse controls exist. No public accusation map or exact-location feed |
| Optional guide assistant | Find reviewed guidance/resources, explain app actions, help organize a draft | Later. Source-linked, optional, and separate from urgent help; does not decide danger levels, diagnose, or replace qualified help |
| Wearables and additional entry points | Investigate watch actions, platform-supported lock-screen controls, and other accessible entry points | Later, individually tested. The iPhone release needs its own reliability and permission validation |

## 4. Two ways to receive help

### A. Trusted contacts and external services

The user chooses a known contact or a listed service. The app helps initiate a call or message and prepares only the information she chooses. A contact can initially help without installing Victim Voice. Do not upload private notes merely because a contact was selected.

A future acknowledgment link needs short expiry, revocation, rate limiting, and access controls appropriate to the shared information. Possession of a forwarded link must not expose an incident history or precise movement history.

This is the default launch path if no Victim Voice team is operating. The interface must identify the recipient. An external referral is not a Victim Voice case being monitored.

### B. A Victim Voice support team

If we establish a team, show its actual hours, coverage, languages, role, and expected response time before submission. Separate a received request, an assigned case, and a human response. Display an out-of-hours route to external help.

The companion staff console needs case assignment, role-limited access, consent records, internal notes separated from user-visible messages, referrals, handovers, access logs, and supervision. Add training, safeguarding procedures, complaint handling, and operational ownership before launch. Existing broad admin access is a starting point, not the final staff permission model.

## 5. Key journeys

### First use

Open app → use urgent help immediately if needed → choose language → optional sign-in → optionally add contacts → rehearse help action → choose privacy settings.

Ask for location, notifications, microphone, or camera only when the selected capability needs them. Do not require all permissions to use the app. Explain the information Google/phone login identifies; a display nickname does not make an authenticated account anonymous.

### I feel unsafe now

Shortcut or Home → select/preconfigure call or contact action → optionally obtain location with a short timeout → proceed without it if unavailable → show actual handoff/send state → offer another route if it fails.

Prepared quick actions should minimize choices during stress. Cancellation or a short configurable countdown may help avoid accidental alerts, but must not delay opening emergency calling. Cancellation after sending cannot recall a delivered message.

### I want someone to accompany my journey

Select contacts → explain what they receive → start a time-limited session → show tracking/check-in state → check in or extend → stop and expire access. Test a trip ending offline or with a dead phone before offering automated escalation.

### Something happened and I want support

Write a private note → optionally attach selected records when supported → choose whether to share → select recipient/service → review the disclosure → submit → see the reference, response availability, and chosen next steps. Saving a journal note does not submit a complaint.

## 6. Privacy, reliability, and difficult states

- Local app lock and obscured recent-app previews for private areas; keep the emergency calling route reachable. Neutral notification previews by default. Explicit permission before detailed messages appear on a shared device.
- Protect local sensitive storage using maintained, platform-appropriate encryption/key storage. Private journals are not automatically sent to the existing reports table. Cloud sync and attachment storage require their own threat model and access tests.
- Show location timestamps and accuracy, session expiry, offline status, and permission denial. Never silently substitute an old location as current.
- Model actions as not started, pending, handed to another app, provider accepted, delivery confirmed where available, acknowledged, failed, or unknown. Display only states we can actually observe. A push notification or HTTP success is not proof that someone has read an alert.
- Design for no data connection, no cellular service, low battery, permissions revoked, notifications off, expired login, app termination, duplicate taps, and a recipient who does not respond. Provide clear alternatives without claiming they work in every condition.
- Device-local drafts should survive a temporary connection failure; use idempotent submission and bounded retries. Do not silently send an old location alert hours later after reconnecting.
- Stop/revoke sharing, remove contacts, export selected records, delete records/account, and explain any applicable retention. Do not collect continuous location by default.
- Support discreet use without promising that quick exit, app lock, or deletion erases every trace from a device, SMS, recipients, or backups.
- No ads or third-party behavioral tracking in sensitive flows. Aggregate reliability telemetry must exclude incident text, contact numbers, exact location, and evidence.

Android restricts background starts and access to location/microphone/camera. These capabilities must be tested in their actual device states, rather than inferred from a foreground demo. [Android guidance](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)

## 7. Delivery sequence

| Milestone | Deliverable | Exit criteria |
| --- | --- | --- |
| 0. Validate the core | Android prototype of shortcut, emergency calling handoff, contact sharing, sensor-triggered check-in/countdown simulation, local alarm/quiet controls, permission denial, and encrypted local draft; settle pilot audience and human-response model | Tested on representative real devices; known limits documented; no real emergency calls during testing |
| 1. First useful Android pilot | Home/help, trusted contacts, location snapshot, tested local alarm controls, offline guides/directory, personal plan, private text notes, existing account support, privacy controls; requests only where a real recipient exists | End-to-end access tests; reviewed content; offline/low-connectivity tests; contact rehearsal; deletion/export checks; usability with intended users |
| 2. Active companionship | Bounded live location, journey sessions, check-ins, delivery feedback, secure small attachments; opt-in sensor-triggered contact alerts only after the Active Safety delivery gates pass | Permission/battery/expiry/abuse tests; monitored delivery and operating costs; missed-check-in escalation stays gated until dependable |
| 3. Ongoing human support | Staffed case management if the operating model is chosen; partner referrals and appointment/follow-up tools; geographically limited nearby-responder pilot if operational gates pass | Named service owners, verified capacity, training, hours/response expectations, and access auditing |
| 4. Expand carefully | iPhone version, more Indian languages/regions, moderated community where staffed; later country launches | iPhone-specific validation; reviewed local resources; country-specific operating/privacy requirements and support availability |

Do not schedule every capability into the first release. After the prototype and pilot scope are agreed, estimate each milestone from actual technical tests and operational capacity.

## 8. Architecture and cost direction

Keep the mobile stack decision separate from this product plan. Evaluate a native Android implementation against any cross-platform alternative using the milestone-0 device tests; share Supabase identity and permitted account data with the website where appropriate.

Keep guides and emergency entry usable locally. Store compact structured records, paginate queries, bound active sharing duration/frequency, expire temporary location records/access, limit evidence sizes, and avoid continuous polling or unlimited media upload. A contact message composed on the phone differs in cost and reliability from a server-sent SMS; label and budget both paths explicitly.

Supabase Free currently includes a 500 MB database, 50,000 monthly active users, 5 GB egress, and 1 GB file storage; free projects may pause after a week of inactivity. Consequently, urgent calling/offline guidance must not depend on this backend being awake, and dependable automatic escalation cannot be promised using this allowance alone. Do not upgrade automatically to meet a new feature's requirements. [Supabase pricing, checked 23 October 2026](https://supabase.com/pricing)

SMS, maps/geocoding, push delivery infrastructure, evidence storage, app distribution, moderation, human support, and professional content review need explicit cost/operating decisions. Free-tier backend use does not make the whole service free to operate.

## 9. India first, global later

Seed the directory from official resources and verify applicability and coverage before displaying a service. India's ERSS uses 112 for emergencies; the Women Helpline connects women to emergency and other support services. Victim Voice should facilitate access without implying a government integration or affiliation. [Ministry of Home Affairs](https://www.mha.gov.in/nirbhayaerss-section), [Ministry of Women and Child Development](https://wcd.gov.in/women/help)

Build resource records with country/region, supported languages, purpose, availability, eligibility, source, last-verified date, and a named reviewer. Keep country-specific numbers, guidance, reporting destinations, retention choices, and service availability out of hard-coded universal flows. Global expansion needs real local content and support capacity, not just translation.

## 10. Proposed immediate scope to review

Explore the [Active Safety specification](ACTIVE_SAFETY.md) early: sensor-triggered check-ins, a proposed 20-second automatic-alert countdown, an opt-in audible alarm, and a controlled nearby-responder network. Distinguish the prototype from deployable, reliable alerting.

Start with **Android help access + trusted contacts + current-location sharing + offline guidance + private notes + privacy controls**. Connect the existing support-request feature only to a real, clearly identified recipient. Validate quick entry and the failure states first, then expand into journey companionship and human support.

The next review should confirm this first-release scope, the pilot audience/location, and whether an initial support team exists. This plan does not authorize publishing, contacting services, inviting volunteers, or sending real emergency alerts.
