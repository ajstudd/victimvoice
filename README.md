# VictimVoice

Support workspace and evidence: [Setup, access controls, privacy boundaries and QA](SUPPORT_PRIVACY.md). Run `supabase/support-workspace.sql` on the existing project to enable the new case/evidence backend.

Product direction: [Vision, user needs, and feature areas](PRODUCT.md). The mobile app is the primary product; this website provides visibility and quick access. See the [Android-first app plan](APP_PLAN.md).

Next.js web app with Supabase Auth and PostgreSQL. Google sign-in needs no phone number. Phone OTP uses the SMS provider configured in Supabase. Admins use Google or Supabase email/password authentication.

## Local setup

Use Node.js 22 or newer (the Supabase SDK requires it).

```sh
cd victimvoice
npm ci
cp .env.example .env.local
# Fill in the project URL and public publishable key (legacy anon keys also work).
npm run dev
```

Open http://localhost:3000. Sign-in stays disabled until the project URL and public key are present. Never put a service-role key, database password, Google secret, or SMS credentials in `NEXT_PUBLIC_*` variables.

### Supabase project setup

1. Start with an empty, dedicated project in a **Free** organization. Run `supabase/schema.sql` in its SQL Editor. This creates reports, comments, admin membership, indexes, and row-level security in a transaction. No elevated key is needed by the web app.
2. Set Authentication → URL Configuration → Site URL to the deployed app origin (or `http://localhost:3000` during development). Add these Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback?admin=true`
   - `http://127.0.0.1:3000/auth/callback`
   - `http://127.0.0.1:3000/auth/callback?admin=true`
   - The same two URLs on your production origin when deployed. Use explicit origins, not unrestricted wildcards.
   - Keep `victimvoice://auth/callback` for the Android app alongside these web callbacks. The web client uses its current browser origin: `localhost` and `127.0.0.1` therefore need their own entries. A missing entry can fall back to the Site URL, including a mobile deep link if that is configured as the default.
3. In Google Cloud, create a Web application OAuth client. Add the app origin to Authorized JavaScript origins and the callback URL shown by Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`) to Authorized redirect URIs. Configure the consent screen/test users as needed. Put the client ID and client secret into Supabase Authentication → Sign In / Providers → Google and enable it. Keep the Google secret out of the app repository. See [Google setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).
4. Enable the Phone provider and configure your existing SMS provider **in Supabase**, including sender/messaging-service details. Set `NEXT_PUBLIC_ENABLE_PHONE_LOGIN=true` in `.env.local`; use `false` to hide SMS login. Configure rate limits, CAPTCHA protection if needed, and your provider's budget/spending controls before public access. Supabase has built-in Auth rate limits; delivery is still billed by your provider. See [phone setup](https://supabase.com/docs/guides/auth/phone-login).
5. Restart the dev server after editing environment variables. Production builds must receive these public environment variables at build time.

### Grant admin access

Have the admin sign in with Google first, or create their Auth account through the Supabase dashboard for email/password access. Then, as a database operator, add their **verified Auth user UUID**:

```sql
insert into public.admin_users(user_id) values ('AUTH-USER-UUID');
```

Users cannot edit this table or promote themselves. Remove that row to revoke access immediately. Supervisors can read all reports, reply, and update status; they cannot rewrite report descriptions or contact identities from the app. Do not give volunteers `admin_users` membership. The new workspace’s Team controls approve a restricted volunteer role, with separate case assignment and survivor consent.

## Free-tier choices and limits

As checked on 2026-10-23, the [Free plan](https://supabase.com/pricing) includes 50,000 monthly active users, a 500 MB database, 5 GB egress, 5 GB cached egress, and 1 GB file storage. Projects may pause after one week of inactivity. Remain on Free; no paid add-ons, compute upgrades, custom domains, paid backups, or additional services are needed by this implementation. This is a usage budget, not an uptime guarantee; a paused project needs to be resumed from the dashboard.

- Evidence supports private media uploads and HTTPS links. Media consume Storage and egress. The app limits files to 10 MiB, cases to 50 MiB/20 items, and reserves at most 800 MiB in its dedicated private bucket. Monitor usage; no paid storage add-on is enabled.
- Case lists fetch 25 reports at a time with comment counts. Web conversations fetch at most 50 messages per page. Open, visible conversations automatically check every five seconds after a completed fetch; hidden/offline tabs stop checking and refresh on return. Failed checks back off to at most one retry per minute, and stale requests are aborted. There is no Realtime publication, Edge Function, background keep-alive job or paid add-on to configure. Each active conversation consumes database requests and egress; monitor usage as the pilot grows.
- Excel exports contain the current page, explicitly labeled in the app.
- Database constraints bound descriptions, comments, addresses, and evidence URLs. Ownership and admin permissions are enforced by the database, independently of the UI.
- Check database size, monthly active users, and egress in the Supabase Usage dashboard. Free-plan exhaustion can restrict service; these app choices cannot guarantee that arbitrary traffic will fit the quotas.
- **SMS is separate from Supabase's free quota.** Keeping phone OTP means delivery can cost money with your existing provider. Google sign-in avoids SMS delivery charges. There is no new Twilio dependency in this web app.

## Verification

```sh
npm run lint
npm run typecheck
npm run build
# Requires PostgreSQL 17+ command-line tools; starts and cleans up an isolated local DB.
npm run test:db
# Homebrew example:
PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH" npm run test:db
```

The database test bootstraps a minimal local Auth schema, applies the fresh-project schema, and checks anonymous denial, report ownership, cross-user comment denial, sender/owner spoofing denial, immutable report fields, admin-only status changes, contact details for Google accounts, invalid evidence/status rejection, and immediate admin revocation. It does not test live Google OAuth or SMS delivery. Those require the configured Supabase project and provider credentials.

## Fresh start

This app starts with an empty Supabase database. Run `supabase/schema.sql` once to create its tables, indexes, and access rules. There is no migration history, data import, MongoDB connection, or old-account mapping in this setup. Sign in to create a new Supabase account and submit a new report.

The sibling `victim-voice-api` folder is historical source; it is not used by this app. Existing data and deployments are left untouched.

## Android app

The primary mobile product is in [mobile/](mobile/README.md). It shares this Supabase project and support inbox. The browser preview runs separately on port 8091. The Android pilot keeps notes encrypted on the device and clearly labels safety rehearsals and capabilities that are not operating yet.


## Public release — 5 November 2026

The existing web project is `ajstudds-projects/victimvoice` on Vercel, public origin `https://victimvoice.vercel.app`. Staff use `/admin/login`; support and emergency workspaces use `/admin/dashboard` and `/admin/emergency`. Deployment uses Node 22 and `npm ci`. Vercel production/preview hold only the public Supabase URL/key and phone-login visibility flag; provider/service credentials stay in hosted Supabase. Production auth has exact web callbacks plus the existing native callback; local callbacks remain available. Do not replace the default Site URL with the mobile deep link.

The release upgrades the web framework to Next.js 15.5.29, removes unused spreadsheet/PDF/validation packages, refreshes safe transitive dependencies and adds required Suspense boundaries. The production dependency audit reports no vulnerabilities; the development lint toolchain still has moderate transitive advisories. Runtime authorization continues to be enforced by Supabase roles/policies.

Android 1.2.1/code 5 is the publishable internal preview, with regenerated native runtime metadata and the same signing certificate. Native SMS requires installing the release APK over the current app without uninstalling. The Expo preview OTA must match that APK's packaged fingerprint; older runtimes retain their compatible updates. No Play Store release is configured. Push still requires Firebase client configuration, matching Expo FCM credentials, another native build, and approved receiving teams. Police regions are configured pilot scopes, not live agency coverage.
