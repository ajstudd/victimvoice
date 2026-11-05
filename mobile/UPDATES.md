# Victim Voice pilot OTA updates

The original APKs (1.0.0 / 1.1.0) had OTA disabled. They cannot be upgraded into OTA support over the air. Install the OTA bootstrap APK **over** the existing app once; do not uninstall it, because private notes are device-bound. It keeps package `in.victimvoice.app` and the existing internal signing key. Production/store signing remains separate work.

## 1.2.0 native SOS preview — 4 November 2026

Install `artifacts/VictimVoice-SOS-pilot-1.2.0.apk` over the existing app without uninstalling. SIM SMS and notifications introduce native permissions/modules and cannot be added through an OTA to 1.1.1. The new preview keeps the internal signing certificate and has runtime `8fda9297b3b1b968636996fe7f25b2d8ef316712`. No OTA has been published for this runtime yet; the current UI is embedded in the APK. The existing 1.1.1 compatible update stays unchanged.

The local build script explicitly regenerates SDK 58 updates resources; its Gradle task otherwise reused a stale fingerprint/manifest during incremental builds. Verify the **packaged** `assets/fingerprint` and `assets/app.manifest` for every native release, rather than trusting a successful Gradle exit.

## 1.2.1 publishable preview — 5 November 2026

The release uses version 1.2.1/code 5 and a fresh fingerprint from the cleaned source tree (local module build outputs and agent state are excluded). It preserves the internal signing identity. Install the GitHub release APK over the existing app without uninstalling; OTA cannot add native SMS/notification code to older builds. The saved release metadata and packaged fingerprint must match the published Expo preview manifest. The original 1.1.1 compatible update is preserved.

## Project and channel

- Expo owner: `junaid-appointy`
- Project: `victim-voice`
- Project ID: `880369a4-3519-443f-a3bb-ff3d12a46b60`
- Update URL: `https://u.expo.dev/880369a4-3519-443f-a3bb-ff3d12a46b60`
- Android pilot channel and EAS environment: `preview`
- Compatibility policy: `fingerprint` (native changes create a different runtime)
- Embedded/current cached app starts immediately, with zero network launch wait.
- Updates check on launch, download asynchronously and apply on a later launch. The app never calls `reloadAsync()` to interrupt an ongoing session.

Settings → App updates can check/download explicitly. Once downloaded, fully close and reopen the app when convenient. The panel distinguishes the installed build from a downloaded update. If the update service or quota is unavailable, the installed/cached app still starts. Web updates use the website deployment, not EAS Update.

## What OTA can change

Compatible JavaScript, UI, guides, copy and bundled assets can update. Adding native libraries, changing native permissions, deep-link schemes, SDK versions, or native configuration requires a new APK. The native runtime fingerprint prevents those updates being delivered to an incompatible build.

Do not disable anti-bricking protections or override runtime checks. Do not change the channel at runtime. Test safety-critical flows before publishing; runtime compatibility does not prove application correctness. No update mechanism guarantees a phone is online or has received an update.

## Build and publish

Use Node.js 22 or newer and the existing Expo login. Local native builds avoid EAS Build quotas and keep this pilot's signing key:

```sh
npm run typecheck
npm run lint
npm test
npm run apk
npm run ota -- --message "Describe the compatible change" --non-interactive
```

`npm run ota` targets Android `preview` with the `preview` EAS environment. Never publish to a production channel without explicitly configuring and validating that release. The `eas.json` preview profile documents the intended channel; if using cloud builds later, preserve the current signing identity or plan a deliberate signing/store migration. Do not generate a different cloud signing key and then ask pilot users to uninstall to work around an upgrade failure.

The EAS preview environment contains only the same **public** Supabase URL and publishable key already compiled into the app. SDK 58 requires `--environment` on `eas update`; do not rely on an ignored local .env file being applied to a cloud update. Never upload database passwords, service-role keys, Twilio tokens or private signing credentials as `EXPO_PUBLIC_*` values.

## Free tier

On 3 November 2026, `eas account:usage junaid-appointy --json --non-interactive` confirmed the account is on **Free**, with 1/1,000 monthly updated users and about 4.6 MiB/100 GiB of update bandwidth used before this app's first publication. Those are account-wide quotas shared with other projects. No plan, paid add-on or billing preference was changed. Native compilation is local. Monitor quota with the same command; stop publishing/distributing rather than upgrading a plan automatically. End-to-end EAS update code signing is a paid-plan feature and is not configured here; transport and publication access use Expo's standard service controls. Restrict publisher access to trusted developers.

## Verification boundaries

Verify the bootstrap APK signature against `artifacts/ota-previous-signer.txt`, its OTA-enabled manifest/channel, its embedded fingerprint and the EAS manifest runtime. A successful publish/HTTP manifest check confirms an update is available; it does not prove the user's phone downloaded and launched it. After installing the bootstrap, open the app online, let the download finish, fully close and reopen, then check Settings → App updates for “Running a downloaded app update.” Confirm the existing Google session and private data remain intact; do not uninstall to test.

References: [Expo Update setup](https://docs.expo.dev/eas-update/getting-started/), [runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/), [standalone service](https://docs.expo.dev/eas-update/standalone-service/), [pricing](https://expo.dev/pricing).

## First preview update — 3 November 2026

Bootstrap: `artifacts/VictimVoice-OTA-bootstrap-1.1.1.apk`, version 1.1.1/code 3, same signing certificate as the previous internal APK.

Update group: `a8a8a3dd-9ac2-4770-8033-71ef96a2affc`. Android update: `01a1a004-51e6-7b56-a0a0-b227845da5eb`. Matching runtime: `29684cb3260bb6a1d3c62671edc73ae8dcfb95ce`.

The live Expo protocol returned HTTP 200 with a matching runtime. Its 3,304,012-byte launch asset downloaded using the protocol asset headers and passed its SHA-256 check. An incompatible runtime received HTTP 204. TypeScript, lint, 18 tests and the native build passed.

Re-run the read-only protocol check from the parent web project with `node scripts/verify-mobile-ota.mjs`. It uses saved bootstrap metadata and no account token. Physical-phone OTA launch, retained session and private data still need confirmation after installing the bootstrap over the current app.


## UI refresh OTA — 3 November 2026

Published Android preview update `01a1a035-f72e-726b-bd9f-c2dc3124c36f`, group `cf1da801-2abb-4dc4-a0bf-9f0a82380cb2`, at 07:00:53 UTC. Runtime `29684cb3260bb6a1d3c62671edc73ae8dcfb95ce` matches the installed 1.1.1/code 3 bootstrap. No new native module, permission or Supabase schema setup is required for this refresh.

The live protocol check passed at 07:02:09 UTC: HTTP 200, matching runtime, 3,324,220-byte launch bundle with matching hash, and HTTP 204 for an incompatible runtime. The downloaded launch bundle contains neither the fictional QA endpoint nor the fixture key. Metadata is saved in ignored `artifacts/ota-ui-refresh.json` and `artifacts/ota-verified.json`. Physical-phone download/application remains unconfirmed.

This release improves the current UI and existing flows; it does not enable background monitoring, automatic SOS dispatch, live route sharing, push notifications or nearby responder dispatch. See FEATURES.md and QA.md for the exact verification boundary.


## SMS handoff / cloud-write hotfix — 3 November 2026

Preview update `01a1a073-7ce6-71b7-bf02-aa595bc46e4f`, group `3dd1216f-aba4-4acf-95d3-4684c365d222`, published at 08:08:05 UTC. Native runtime remains `29684cb3260bb6a1d3c62671edc73ae8dcfb95ce`; no new APK or SQL setup is required for this correction. The browser no longer invokes Share.share for contact messaging; SMS handoff targets selected saved numbers. This still requires Send in the SMS app. Automatic sending is pending a choice of Twilio backend or Android SIM SMS. Also fixes the user_id column-grant regression affecting contact and support inserts. TypeScript, lint and 26 tests passed. Metadata: ignored artifacts/ota-sms-handoff.json. See QA.md for details.
