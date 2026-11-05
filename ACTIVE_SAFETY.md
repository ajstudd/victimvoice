# Active Safety — Detection, SOS, and Nearby Help

Product proposal · 23 October 2026

Update 4 November 2026: manual SIM-first SMS and the scoped SOS backend/responder workflows are implemented for the Bhopal, Tripura and Bhubaneswar pilot in Android 1.2.0. Hosted schema/functions and scheduled worker are installed; delivery credentials, reviewed boundaries, receiving teams and physical-device checks remain. Motion detection/countdown remains a foreground rehearsal and does not trigger this dispatcher. See [SOS setup/status](supabase/SOS_SETUP.md).

Extends [the app plan](APP_PLAN.md). These are planned capabilities, not existing functionality.

## User direction

Use the phone's technology proactively. An unusual event such as the phone falling can trigger a check-in: “Are you okay? We’ll alert your chosen contacts in 20 seconds.” An explicit SOS can alert loved ones and nearby volunteers, with a noticeable sound to draw bystanders' attention.

## 1. Active safety mode

The user deliberately arms a session, for example while travelling or feeling uneasy. Setup selects contacts, eligible alert channels, whether nearby responders may be contacted, session duration, and sound preferences. Provide an end-session action and a rehearsal mode that never sends real alerts.

Show whether monitoring is active, degraded, or stopped. Distinguish local sensing from network-dependent alert delivery. A setting toggled on is not evidence that the OS is still allowing the monitoring process to run.

Use accelerometer/gyroscope signals to investigate a possible phone drop or unusual impact. A phone falling does not prove that its owner fell, was attacked, or needs help. Treat the signal as a reason to check in, not a diagnosis. Process sensor samples locally and avoid uploading continuous raw motion history.

Before enabling automatic escalation, evaluate false triggers from setting down the phone, a bag dropping, stairs, running, a vehicle bump, and ordinary handling. Measure missed events too. Do not infer a medically validated fall-detection capability from a prototype.

## 2. Sensor-triggered check-in

Proposed sequence:

1. An armed session detects a candidate event.
2. Prompt: **“Are you okay? We’ll alert your chosen contacts in 20 seconds.”** Use a visible countdown, accessible controls, and the user's configured vibration/sound settings.
3. Offer **I’m okay**, **Send help request now**, and an accessible way to extend the check-in if appropriate.
4. “I’m okay” cancels this escalation and confirms the result. Repeated sensor samples from the same event must not create repeated alerts.
5. If the user does not respond, attempt the alert only when automatic escalation was explicitly configured and tested. Twenty seconds is the proposed default; make it configurable during setup rather than asking the user to configure it during an incident.
6. Show actual outcomes for each channel/recipient: pending, accepted by provider, delivered where observable, acknowledged, failed, or unknown. Failure to obtain fresh location must not block sending the help request.

The automatic message should describe uncertainty accurately: **“An automatic safety check-in expired without a response. Please try to contact me.”** Include only the configured identity/contact information, event time, and optional location with its timestamp/accuracy. Do not say an assault or injury has been detected.

No response may mean the user did not see the prompt. Account for lock state, notifications being disabled, sound settings, and accessibility. If we cannot reliably surface the prompt/countdown in a supported state, do not silently arm automatic escalation in that state.

## 3. Manual SOS

A deliberate SOS follows a separate urgent path. It must not force the user to wait through the sensor-check-in countdown.

With prior setup, it attempts alerts to chosen contacts and, if separately enabled, eligible nearby responders. It can start a time-limited location session when permitted, while clearly distinguishing fresh location, old location, and unavailable location. Emergency calling remains directly accessible.

An alert must not depend on a responder being nearby or accepting it. If nobody accepts, say so; do not display “help is coming” based on a successful network request. Prevent duplicate alerts from repeated taps and make canceled/resolved status visible to people already notified where the channel supports it.

Automatic sending needs a supported, funded delivery channel. Opening the phone's SMS/WhatsApp composer requires the user's completion and cannot implement unattended countdown escalation. The technical prototype must settle this distinction before presenting automation as available.

## 4. Audible alarm and bystander attention

Provide an independently usable **Make sound** action, including when offline. Offer a loud preview during setup with an explicit warning before playback. Sound can draw attention; it can also expose the user, so she chooses how it participates in SOS.

Proposed preferences:

- **Quiet:** contact alerts without deliberately starting an audible alarm. Do not promise the whole phone or network activity is undetectable.
- **Attention:** alert contacts and then start a noticeable alarm after a short configured delay, or immediately if the user chooses.

Offer an immediate sound action and a clear stop-sound control. Stopping the sound must not silently cancel a help request or revoke sharing; each action needs a clear outcome. Do not wait for successful server delivery before allowing the user to make sound.

Test speaker output, headphones/Bluetooth routing, volume, Do Not Disturb, locked state, and accessibility. Show when sound cannot be assured. Do not force a loud alarm after every sensor event or silently override device preferences.

## 5. Nearby volunteer response

Plan this as an opt-in response network with operational ownership, not a broadcast to everyone close by.

- Recruit and verify responders, train them, define service areas, require availability opt-in, and provide supervision and complaint handling.
- Get the user's separate consent for nearby help and explain what volunteers can see. Loved-one alerts remain independent.
- Match a bounded number of eligible responders by current availability and approximate proximity; do not expose a public map of women requesting help.
- Initially reveal only the minimum event information and approximate area. Release necessary precise location only through a controlled acceptance/assignment flow to authorized responders, following the user's selected consent policy.
- Clearly show responder identity/role and acknowledgment. Acceptance does not prove arrival; proximity does not prove the responder is suitable or able to help.
- Expire access, prevent forwarding/scraping, rate-limit requests, and log sensitive access. Responders do not receive the woman's private journal, evidence, or historical movements by default.
- Design for malicious responders, fake alerts, harassment, stale volunteer locations, no available responders, and disputed or abandoned assignments.
- Set safe response protocols emphasizing contacting appropriate services and avoiding confrontation; develop these with qualified partners before operating the network.

A smaller pilot with verified partner organizations may be more workable than an open individual-volunteer marketplace. The specific verification process, coverage, staffing, response expectations, and operating budget remain decisions to make.

## 6. Android feasibility and delivery requirements

Accelerometer/gyroscope access is not simply one general “sensor permission.” Availability, sampling, background execution, foreground-service eligibility, notifications, and location permissions all matter. Android restricts continuous motion-sensor events for background apps, and newer versions restrict full-screen notifications. We must test supported behavior and comply with platform/store requirements rather than assuming an always-running listener or a guaranteed lock-screen takeover. [Android sensors](https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview), [Android 14 notification restrictions](https://developer.android.com/about/versions/14/behavior-changes-14)

The feasibility prototype must establish a compliant execution model and test representative Android devices with the app open, minimized, locked, killed, battery-restricted, offline, restarted, and denied permissions. Unsupported combinations must remain visible to users.

Separate the on-device countdown/alarm from alert transport, retry/expiry handling, responder matching, and acknowledgment. Persist event state where appropriate, suppress duplicate sends, and expire stale requests. A dead/offline phone cannot be assumed to notify anyone; a server-held check-in deadline is a different capability and has its own delivery requirements.

Supabase Free remains the cost constraint. Do not promise dependable automatic escalation or volunteer dispatch until availability, scheduling, delivery charges, monitoring, and response operations have an explicit sustainable solution. A prototype may simulate delivery but must label that simulation.

## 7. Build order and validation

1. **Early Android prototype:** manual SOS entry, local sound controls, sensor event detection, a simulated 20-second countdown, cancellation, and monitoring-state visibility. No real emergency calls or volunteer dispatch during rehearsals.
2. **First Android pilot:** ship the tested manual controls; test sensor prompts in a clearly labeled pilot mode. Measure false alerts, missed prompts, battery use, and whether the chosen controls work under stress.
3. **Automatic contact alerts:** enable only after opt-in, supported-state validation, real delivery tests to consenting recipients, clear failure/expiry behavior, and a delivery budget are in place.
4. **Nearby responder pilot:** limited geographic coverage with verified, trained partners/responders and a tested operating model. Expand based on actual capacity and outcomes.

Success measures include prompt visibility, countdown cancellation success, unwanted alert rate, missed-event rate in controlled tests, end-to-end delivery latency/failure rate, acknowledgment rate, battery impact, and privacy/abuse incidents. Set release thresholds after the feasibility study; do not invent safety-accuracy percentages before measuring them.


## 4 November 2026 — Delivery and police routing plan

The user chose both SMS routes: SIM first where supported, Twilio when unavailable or clearly failed. Nearby responder push and station/jurisdiction mapping are planned alongside this. The [review plan](EMERGENCY_RESPONSE_PLAN.md) defines ambiguous delivery handling, offline limits, verified emergency-responder roles, police receiving-channel dependencies, phased rollout and free-tier boundaries. This is documentation only; no direct-SMS or police dispatch service has been activated.
