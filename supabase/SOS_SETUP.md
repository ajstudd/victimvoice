# SOS pilot setup — Bhopal, Tripura and Bhubaneswar

**10 November 2026 update:** after the base schemas and `journey-sharing.sql`, apply `safety-governance.sql`. Use `/team` for account-bound invitations, recorded reviews and MFA. Support and emergency approvals are distinct. An emergency acknowledgement does not release location: an MFA supervisor must issue a short-lived dispatch assignment. These requirements supersede the acceptance-only flow below. Firebase is not yet set up, and responder push remains disabled. See `docs/RESPONDER_OPERATIONS.md` for launch gates.

Software setup does not establish police or volunteer operational coverage. No real alert was sent during development.

Status on 4 November 2026: additive schema applied and verified in `pkjnhdrookwdbaavsjks`; both Edge Functions deployed; worker secret stored in Edge Secrets/Vault; minute outbox and hourly retention jobs active. Hosted anonymous/private and worker grants verified. The user added the three Twilio secrets; their presence was checked and `VV_ENABLE_SMS_RELAY=true` was set. Hosted capabilities now report `relay:true, push:false`. Configuration formats passed the endpoint checks; Twilio authentication, sender routing and real delivery are not yet tested. No queued SMS existed when enabling. Responder push remains disabled pending Firebase/Expo setup. All three region boundaries remain unreviewed; no agency or approved emergency responder is onboarded.

## 1. Add the backend tables and policies

Open the existing Supabase project `pkjnhdrookwdbaavsjks` → SQL Editor. Paste and run the **contents** of `sos.sql`, not its filename. This is additive/repeatable and preserves existing support records. It respects an existing PostGIS extension schema and does not move that extension.

It creates the three requested pilot regions with geographic matching and police dispatch disabled until reviewed boundaries and receiving teams exist. Tripura means the whole state; individual district/station onboarding remains visible as pending.

## 2. Deploy the two Edge Functions

The CLI is now authenticated to the correct owner account and both functions have been deployed. For later redeployment, use that account. Never paste account tokens into this chat.

```sh
supabase login
supabase functions deploy sos --project-ref pkjnhdrookwdbaavsjks
supabase functions deploy sos-callback --project-ref pkjnhdrookwdbaavsjks
```

The config disables the legacy JWT gateway for these endpoints because the main endpoint explicitly authenticates every write through Supabase Auth, and the callback endpoint requires a validated Twilio signature. This does not disable authentication in the handler. The public GET returns non-sensitive feature availability only.

## 3. Configure provider secrets server-side

Use Supabase → Edge Functions → Secrets, or an ignored `supabase/functions/.env.local` with `supabase secrets set --env-file … --project-ref …`. Do not place any of these values in Expo/Next public variables or the APK.

- `TWILIO_ACCOUNT_SID`: AC… account SID.
- `TWILIO_AUTH_TOKEN`: matching account auth token.
- `TWILIO_MESSAGING_SERVICE_SID`: MG… Messaging Service, **or** `TWILIO_FROM_NUMBER`: an owned SMS-capable E.164 number. A VA… Verify service is not a Messaging Service. Supabase Auth's phone-provider configuration does not automatically configure this function.
- `VV_ENABLE_SMS_RELAY`: initially `false`; set `true` only for an agreed delivery test and operational pilot.
- `VV_ENABLE_RESPONDER_PUSH`: initially `false`; set `true` only after FCM/device credentials and approved recipients are ready.
- `VV_SOS_WORKER_SECRET`: at least 32 random characters for the durable outbox worker.
- `EXPO_ACCESS_TOKEN`: optional when Expo push access-token protection is enabled.
- `VV_WEB_ORIGINS`: comma-separated approved website origins. Local defaults support the existing localhost admin and mobile preview.

The service-role key is automatically provided to hosted functions by Supabase and remains server-only. Do not copy it into app configuration.

Twilio messages require an operational sender/destination route, sufficient provider balance and relevant sender setup. Trial restrictions and recipient verification still apply. The database caps relay attempts to 50 per day globally and incidents to 3 per account/day, with at most 5 selected recipients. These are attempt caps, not a currency guarantee: multipart/Unicode messages and destination prices vary. Keep provider spending controls in place and review a production budget before expansion.

## 4. Configure background dispatch recovery

The endpoint starts bounded background work after an incident/report. For process interruption recovery, create two secrets in Supabase Vault:

- `vv_sos_worker_url`: `https://pkjnhdrookwdbaavsjks.supabase.co/functions/v1/sos`
- `vv_sos_worker_secret`: the same value as `VV_SOS_WORKER_SECRET`.

This has now been configured on the hosted project. For a fresh deployment, review and run `sos-worker.sql`. It schedules a once-per-minute outbox drain plus hourly privacy cleanup. SOS events and their contact/location snapshots are removed after seven days; expired responder duty locations are cleared at the next hourly run. This is separate from support case/evidence retention. No credential is embedded in the SQL file. Claimed requests with ambiguous external results are marked unknown and never automatically resent. Jobs older than five minutes, or belonging to closed incidents, are not sent.

## 5. Configure Android push

The current APK contains expo-notifications but **does not yet contain Firebase client configuration**, so Android push registration is unavailable in this build. Register Android package `in.victimvoice.app` in Firebase, save its public client `google-services.json` under `mobile/`, set `expo.android.googleServicesFile` to `./google-services.json` in `mobile/app.json`, and rebuild/install the APK. This configuration changes the native runtime again. Separately configure the matching **private FCM v1 service-account key** on the existing Expo project `@junaid-appointy/victim-voice`; never ship that private key in the app. Only enable responder push after a real device registers and a consenting recipient receives a test.

Follow [Expo’s FCM setup instructions](https://docs.expo.dev/push-notifications/fcm-credentials/). Adding an Expo server credential alone does not initialize Firebase in an already-built APK.

In the app: Settings → Emergency responder → apply for a region. A supervisor approves the distinct emergency role in `/admin/emergency`. The approved responder registers their device for push and explicitly goes on duty. Availability lasts 15 minutes, and volunteer matching requires a location no older than five minutes, so refresh availability while on duty. No hidden continuous volunteer tracking is enabled.

## 6. Review regions, police jurisdictions and recipients

A supervisor opens `/admin/emergency`, imports a **GeoJSON Polygon/MultiPolygon geometry** with official HTTPS provenance, then deliberately enables a reviewed area. No guessed circles, ward/postcode assumptions or public directory numbers are used for automatic police dispatch.

Police receiving areas need a reviewed boundary and a verified, approved police account tied to that agency. That account must register a receiving device and go on duty. If no recipient is on duty, no monitored endpoint exists, the location is unusable, or jurisdiction is ambiguous, the user sees the actual unavailable state. Call 112 remains available.

Case-support volunteers do not automatically gain emergency roles. Responders see precise location only after accepting an authorized offer; suspension, off-duty status, closure and expiry revoke that access. Journals and support evidence are separate.

## 7. Install the new Android build

Direct SIM sending and notifications add native code. Install `mobile/artifacts/VictimVoice-SOS-pilot-1.2.0.apk`, the new signed 1.2.0 APK **over the existing app, without uninstalling**. Old OTA-only builds cannot gain these native capabilities. During setup, allow SMS and choose a default SMS SIM in the phone's settings. The app does not request SMS inbox-reading permission.

Settings → Safety message setup records the alert name, optional callback number, selected pilot area and individual cloud-channel consents. The Help send action directly attempts the selected contact SMS. A separate explicitly labeled SMS-composer option remains for denied/unsupported configurations. Offline SIM sending does not imply a backend alert was received.

## Verification remaining before an operational pilot

Use consenting test recipients and agreed agency test channels. Verify physical single/dual-SIM devices, denied permission, radio/network failure, no SIM/data, background/process restarts, carrier callbacks, Twilio accepted/delivered/unknown outcomes, signed callbacks, push arrival and role-revocation tests on the hosted project. Never test by sending unsolicited live police/emergency messages. No operational response time is promised by the software setup.
