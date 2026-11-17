from pathlib import Path
import subprocess,re,json,runpy
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/codebase-map'
D={}
def add(parent,rows):
 for line in rows.strip().splitlines():
  name,desc=line.split(' | ',1);D[(parent+'/' if parent else '')+name]=desc
add('', '''.env.example | Template for public website connection settings. Contains placeholders, not production secrets.
.eslintrc.json | Web lint rules that check JavaScript and TypeScript coding issues.
.gitignore | Excludes local secrets, caches, dependencies and selected generated output from Git.
.vercelignore | Keeps mobile builds, backend tooling and design/document material out of website uploads.
components.json | Configuration for the shadcn-style UI component generator, aliases and styling.
next.config.js | Next.js build settings, standalone output, image handling and restricted-route security headers.
package.json | Website dependencies, Node version requirement and development/build/check commands.
package-lock.json | Locks resolved website dependency versions for repeatable npm installs.
postcss.config.js | Connects CSS processing to Tailwind and Autoprefixer.
tailwind.config.ts | Website design tokens, theme extensions, animation definitions and scanned source paths.
tsconfig.json | Website TypeScript settings and import aliases.
README.md | Website setup and backend overview. Older passages must be read with later workforce documents.
PRODUCT.md | Founder-approved vision, product principles, primary audiences and intended outcomes.
APP_PLAN.md | Android-first capability plan and staged release boundaries; not a list of completed features.
ACTIVE_SAFETY.md | Proposed motion prompts, SOS and attention-sound behavior with reliability and privacy considerations.
EMERGENCY_RESPONSE_PLAN.md | SIM-first messaging, provider fallback, nearby response and police-routing pilot design.
SUPPORT_PRIVACY.md | Evidence architecture, consent, access leases, capture limits and earlier support setup. Later scoped rules supersede older volunteer access.''')
add('.bolt','''config.json | Records the original Next.js/shadcn generation template.
ignore | Tells the original Bolt tooling which scaffold files to ignore.
prompt | Original project-generation design guidance. This is tooling history, not a runtime application module.''')
add('app','''page.tsx | Public website home page introducing the product and help entry points.
layout.tsx | Root HTML layout, fonts, global CSS, theme provider, notifications and website metadata.
globals.css | Global website styles, theme variables and shared animation/utilities.
icon.png | Browser favicon generated from the approved helping-hands logo.
apple-icon.png | Apple touch icon for saved website shortcuts.''')
route={'about':'Public explanation of Victim Voice.','login':'User Google and phone sign-in.','auth/callback':'Completes browser authentication and chooses an allowed return route.','admin':'Role-appropriate staff entry and redirect.','admin/login':'Staff Google or email/password sign-in.','admin/dashboard':'Opens the support inbox workspace.','admin/requests':'Compatibility route rendering the shared support workspace.','admin/team':'Personnel/access management and employee assignment/volunteer review workspace.','admin/emergency':'Emergency coordination workspace.','dashboard':'Signed-in user dashboard.','dashboard/new-request':'Creates a support request after reviewing chosen information.','dashboard/requests':'Lists the user\'s requests and opens their conversation details.','join':'Accepts account-bound staff invitations and handles MFA/account reference.','team':'Compatibility entry for old staff/invitation links.','journey':'Public temporary journey-link viewer with freshness and expiry handling.'}
for r,desc in route.items():D['app/'+r+'/page.tsx']=desc
D['app/dashboard/requests/request-detail-client.tsx']='Interactive user case detail: conversation, shared evidence and team/privacy controls.'
D['app/dashboard/dashboard.css']='Styles for the user dashboard, request forms, statuses and shared header.'
for f in ['app/admin/layout.tsx','app/admin/team/layout.tsx','app/admin/emergency/layout.tsx','app/join/layout.tsx','app/team/layout.tsx','app/dashboard/layout.tsx']:
 D[f]='Route-group layout and/or metadata for '+str(Path(f).parent).replace('app/','')+'. Does not independently grant backend permissions.'
add('components','''brand-mark.tsx | Shared approved helping-hands image used for website and staff branding.
case-team.tsx | User controls for a case's current team, evidence grants and reporting/blocking.
comments.tsx | User conversation display/composer with incremental message refresh and retries.
dashboard-shell.tsx | Shared user-dashboard header, navigation, sign-out handling and status pills.
emergency-workspace.tsx | Emergency desk UI for active incidents, response regions, receiving agencies and authorized coordination.
evidence-panel.tsx | Web evidence library, upload/link actions, access-checked viewing and privacy controls.
incident-chat.tsx | Authorized incident-specific messages and attachment communication, separate from ongoing support cases.
purpose-access.tsx | Requests a recorded reason and temporary permission before sensitive staff oversight.
staff-entry.tsx | Chooses staff landing routes and handles role loading, errors and personnel access boundaries.
staff-mfa.tsx | Staff authenticator enrollment including QR/manual setup, challenge and verification UI.
staff-workspace-shell.tsx | Shared staff sidebar, role display, navigation and sign-out layout.
support-consent.tsx | User-facing support consent/privacy controls; interpreted alongside current scoped backend rules.
support-workspace.tsx | Support inbox, case conversation, assignments, evidence, internal notes and activity views.
team-management.tsx | Scoped personnel management, invitations, employee availability/acknowledgment, volunteer review and audits.
theme-provider.tsx | Supplies website light/dark theme context.
emergency-workspace.css | Emergency desk layout and component styling.
support-workspace.css | Staff case inbox, conversation, evidence and detail layout styling.
team-workspace.css | Personnel, invitation, authenticator and shared staff-layout styling.''')
ui={'accordion':'Expandable stacked sections.','alert-dialog':'Confirmation dialog for consequential choices.','alert':'Inline notices and warnings.','aspect-ratio':'Keeps media at a chosen width-to-height ratio.','avatar':'Profile image or initials fallback.','badge':'Compact labels such as state or category.','breadcrumb':'Navigation trail.','button':'Consistent action-button styles and variants.','calendar':'Date selection.','card':'Grouped content container.','carousel':'Scrollable slide/item presentation.','chart':'Chart styling and helpers.','checkbox':'Checked/unchecked choice.','collapsible':'Expandable content area.','command':'Searchable command/list selection.','context-menu':'Menu opened from a context action.','dialog':'Modal dialog.','drawer':'Sliding panel.','dropdown-menu':'Action menu.','form':'Form field context and validation helpers.','hover-card':'Context shown on hover/focus.','input-otp':'Segmented one-time code input.','input':'Single-line text input.','label':'Accessible field label.','menubar':'Grouped menus.','navigation-menu':'Structured navigation menus.','pagination':'Page-selection controls.','popover':'Anchored floating content.','progress':'Progress indicator.','radio-group':'One choice from several options.','resizable':'Resizable content panels.','scroll-area':'Styled scrollable region.','select':'Dropdown selection.','separator':'Visual separation.','sheet':'Side-sheet dialog.','skeleton':'Loading placeholder.','slider':'Numeric range selection.','sonner':'Sonner toast-notification wrapper.','switch':'On/off control.','table':'Styled table building blocks.','tabs':'Switches between related views.','textarea':'Multiline text input.','toast':'Toast primitives.','toaster':'Renders queued toast messages.','toggle-group':'Related pressed/unpressed choices.','toggle':'Pressed/unpressed button.','tooltip':'Short contextual explanation.','use-toast':'Toast queue/state hook.'}
for name,desc in ui.items():D['components/ui/'+name+('.ts' if name=='use-toast' else '.tsx')]='Reusable web UI building block: '+desc+' Presence in this library does not mean every page uses it.'
add('hooks','''use-toast.ts | Web notification state/reducer and toast hook. Similar UI helper also exists under components/ui.
useAuth.ts | Observes user session changes and user-route authentication state.
useAdminAuth.ts | Staff authentication/role gate helper; backend rules remain authoritative.
useConversationSync.ts | Runs visible/online conversation polling and stops it on account or visibility changes.
useWorkforceSession.ts | Loads Auth session, MFA level and current workforce/responder role for staff routing.''')
add('lib','''data.ts | Legacy near-empty data module retaining a RequestType import; not an active database or data seed.
requests.ts | Website request/message CRUD, pagination and mapping between database rows and UI types.
staff-routing.ts | Role-to-home mapping and strict internal allowlist for login return destinations.
supabase.ts | Configures the web Supabase client, Google callback, sessions and sign-out.
support.ts | Typed wrappers around checked support RPCs, cases, staff and activity.
types.ts | Website request and message-related TypeScript shapes.
utils.ts | Combines conditional CSS classes and resolves Tailwind class conflicts.
workforce.ts | Types and labels for operating scopes, workforce roles and session context.''')
add('shared','''case-evidence.ts | Cross-client evidence operations: listing, links, uploads, checked opens and account file cleanup.
evidence.ts | Allowed evidence MIME types, size limits, link validation, fingerprints and metadata shapes.
refresh-loop.ts | One-request-at-a-time conversation polling, cancellation and retry backoff.
sos.ts | Shared SOS types, pilot regions, validation, safe-fallback decisions and alert text.
support-copy.ts | Consistent case-status, topic, urgency, reference and time labels.
twilio.ts | Provider message submission, Twilio callback signature verification and opaque push payload creation.''')
add('mobile','''.env.example | Template for public mobile Supabase settings; never put provider secrets here.
.gitignore | Excludes native generated projects, APKs, dependencies, local environment files and caches.
AGENTS.md | Contributor/agent instructions for Expo APIs, navigation, native configuration and required checks.
DESIGN.md | Mobile design system and screen-design notes.
DESIGN_BRIEF.md | Mobile audience, design direction and interaction constraints.
FEATURES.md | Feature history and verification boundaries. Later dated updates supersede early rows.
LICENSE | License terms included with the mobile project.
QA.md | Mobile test evidence and remaining physical-device verification work.
README.md | Mobile setup, build and backend instructions; read alongside current updates.
UPDATES.md | Native/OTA release notes, compatibility and recent motion changes.
app.json | App identity, version, package IDs, icons, permissions/plugins, callbacks and OTA settings.
eas.json | Expo build profile, preview distribution, channel and environment selection.
eslint.config.js | Mobile lint rules.
metro.config.js | Mobile bundler configuration that permits shared logic outside mobile/.
package.json | Mobile packages, entry point and start/build/test/update commands.
package-lock.json | Locks resolved mobile dependency versions.
tsconfig.json | Mobile TypeScript compiler settings.''')
for path in (ROOT/'mobile/src/app').rglob('*.tsx'):
 f=path.relative_to(ROOT).as_posix();s=path.read_text()
 desc={'_layout':'App-wide providers, screen protection, SOS/motion/journey coordinators, fonts and router stack.','auth/callback':'Completes native OAuth callback and session exchange.','contact':'Opens the contact form with route-selected contact information.','guide-detail':'Loads a selected guide by route parameter.','note':'Opens the note editor with the selected note identity.','request':'Opens the selected support case conversation.','sos-case':'Opens a selected authorized emergency incident.','safety':'Compatibility route: the former safety rehearsal now redirects to Settings.'}.get(path.relative_to(ROOT/'mobile/src/app').with_suffix('').as_posix())
 if not desc:
  m=re.search(r'export\s*\{\s*(\w+)\s+as default\s*\}\s*from\s*[\'"]([^\'"]+)',s)
  assert m,f
  desc='Expo Router entry that opens '+m.group(1)+' from '+Path(m.group(2)).name+'. The main screen implementation is in that component file.'
 D[f]=desc
add('mobile/src/components','''AccountScreens.tsx | Login, account/privacy settings, sign-out/deletion and device/permission status screens.
AppUpdates.tsx | Checks/downloads compatible OTA updates and displays pending state, app version and update reference.
CaseEvidence.tsx | Mobile case/incident attachments, picking, uploads, previews and temporary-file handling.
CaseTeam.tsx | User team visibility, evidence permission grants, withdrawal and safety reports.
GuideScreens.tsx | Guide browsing, search/filter/bookmarks, detail reading and resource directory UI.
HelpScreens.tsx | Help actions, contact/location messaging, attention sound and other support options; old safety route redirects.
HomeScreens.tsx | Home, contact circle, contact editing and personal safety-plan screens.
IncidentChat.tsx | In-app incident chat and participant-scoped attachments.
JourneyLive.tsx | Starts/stops expiring journey links and publishes latest location while foregrounded.
JourneyScreen.tsx | Local arrival timer, destination, extension, finish and live-sharing controls.
MotionSafety.tsx | Foreground sensor subscription, shake/drop prompt, countdown/cancel handling and motion settings.
PrivateGate.tsx | Optional device-authentication gate before private areas can be opened.
RequestScreens.tsx | Support request creation/drafts, inbox, detail conversation and polling UI.
ResponderScreens.tsx | Volunteer applications/corrections, responder duty, request acknowledgment and authorized incident context.
ScreenPrivacy.tsx | Native capture prevention and iOS app-switcher privacy request; no browser guarantee.
SosCoordinator.tsx | Coordinates persistent per-contact SIM attempts, backend progress, safe fallback and incident closure.
SosNotifications.tsx | Handles responder notification navigation and token/session integration; delivery requires configured push infrastructure.
SosScreens.tsx | Safety-message setup and current SOS per-contact status/actions.
SpaceScreens.tsx | My Space, private-note list and encrypted note editing/sharing/deletion.
StaffMfa.tsx | In-app staff authenticator setup and verification for restricted responder actions.
ui.tsx | Mobile colors, typography, page layout, buttons, fields, rows and common UI controls.''')
add('mobile/src/lib','''account-client.ts | Creates a client bound to the initiating access token so writes cannot silently switch accounts.
actions.ts | Opens calls/composers and obtains a fresh current-location snapshot.
cipher.ts | AES-GCM encryption/decryption with authenticated storage namespace binding.
cloud-writes.ts | Inserts contacts and support requests while leaving owner identity to backend defaults.
confirm.ts | Cross-platform deliberate confirmation helper.
contacts.ts | Merges/deduplicates restored contacts while respecting locally queued removals.
create-sos.ts | Constructs durable local incident/recipient attempt IDs and checks active-request duplication.
guides.ts | Bundled English guide content and resource information.
help-message.ts | Formats help text and SMS composer links with chosen location information.
motion-status.ts | In-memory external store for live listening/pause status; uploads no sensor telemetry.
native-sms.ts | Typed bridge to optional Android SMS module and SMS permission request.
push.ts | Registers an approved responder's device with Expo push when configuration permits.
safety.ts | Phone validation, location freshness, countdown rules and shake/drop recognition heuristics.
sms-permission.ts | Distinguishes granted, denied, blocked, missing-module and default-SIM states.
sos-client.ts | SOS preferences/types and calls to authenticated Edge handler/capability endpoints.
storage.ts | Encrypted native storage using a SecureStore key; in-memory web preview fallback.
supabase.ts | Mobile Auth client, encrypted session persistence, native Google flow and account-bound client helper.
vault-writer.ts | Serializes private-state writes and cancels stale account work without overwriting unrelated state.''')
D['mobile/src/state/AppState.tsx']='Central mobile React context for session, account-scoped local vault, saved preferences, contacts, notes, sync and lifecycle changes.'
D['mobile/src/hooks/useConversationSync.ts']='Mobile conversation polling tied to route focus, app activity, private lock and account changes.'
add('mobile/assets','''attention.wav | Bundled local attention sound; does not imply SMS or dispatch success.
brand-adaptive.png | Padded transparent Android launcher foreground.
brand-icon.png | Opaque launcher/app icon generated from the approved hands logo.
helping-hands.png | Transparent hands mark used inside app screens and launch-screen configuration.''')
D['mobile/plugins/with-help-shortcut.js']='Expo config plugin generating Android Get help shortcut resources during native prebuild.'
D['mobile/scripts/build-android.sh']='Prebuilds Android, refreshes embedded update output, runs Gradle and copies an ARM64 internal preview APK.'
add('mobile/modules/victim-sms','''expo-module.config.json | Registers the Kotlin module for Expo autolinking.
package.json | Local native-module package identity and integration metadata.
android/build.gradle | Android module dependencies/build settings including background work support.
android/src/main/AndroidManifest.xml | Native module permission and component declarations merged into the generated app manifest.
android/src/main/java/expo/modules/victimsms/VictimSmsModule.kt | Reads SIM/permission capability, sends selected SMS, persists attempt results and handles native callbacks.
android/src/main/java/expo/modules/victimsms/SmsRelayWorker.kt | WorkManager reporting of bounded SMS outcomes to the backend using protected short-lived credentials.
android/src/test/java/expo/modules/victimsms/SmsAttemptTest.kt | JVM regression tests for native SMS attempt/result decisions.''')
add('supabase','''config.toml | Local Supabase project/function configuration. SOS handlers enforce Auth/signature checks themselves.
SOS_SETUP.md | Hosted SOS setup, server secrets, workers, push/geography dependencies and test boundaries; later workforce docs supersede older route notes.
schema.sql | One-time empty-project foundation: support requests, comments, admin bootstrap and initial policies.
mobile-schema.sql | Adds owner-private contacts and safety-plan schema foundations and account operations.
support-workspace.sql | Adds private case evidence, assignments, notes, activity, viewing leases and controlled RPCs.
sos.sql | Adds geographic response scopes, agencies/responders, incidents, recipients, offers, outbox jobs and SOS access functions.
sos-worker.sql | Configures cron jobs and Vault-backed calls for delivery recovery and retention.
journey-sharing.sql | Temporary owner-controlled journey sessions, hashed tokens, freshness and revocation functions.
safety-governance.sql | Adds staff MFA requirements, assignment acknowledgment, reports/blocks, evidence grants and limited emergency dispatch access.
responder-contact-privacy.sql | Tightens responder incident views to withhold survivor callback contact details.
scoped-workforce.sql | Current area-based admin/employee hierarchy, invitations, independent volunteer review, purpose leases, incident chat/media and tightened access rules.''')
D['supabase/functions/.env.example']='Template for server-only provider credentials and feature flags; actual secrets must remain outside Git.'
D['supabase/functions/sos/index.ts']='Authenticated SOS start/native-result/worker handler; drains durable SMS/push jobs and expired incident media.'
D['supabase/functions/sos-callback/index.ts']='Validates signed Twilio status callbacks and updates only the relevant delivery job/result.'
for f in ['supabase/functions/sos/deno.json','supabase/functions/sos-callback/deno.json']:D[f]='Deno TypeScript/import settings for this Edge Function.'
D['supabase/functions/sos/deno.lock']='Pins resolved Edge Function dependency versions/integrity.'
add('supabase/tests','''access-control.sql | Base request/message ownership, anonymous denial and admin permission tests.
governance-access.sql | MFA, worker consent, acknowledgment, reporting and revocation access tests.
journey-sharing.sql | Journey token, ownership, expiry, freshness and stop-sharing tests.
mobile-access.sql | Owner isolation and write constraints for mobile cloud records.
scoped-workforce-access.sql | Cross-area denials, invitation rules, independent review, sponsor revocation and incident/chat/file access tests.
sos-access.sql | SOS recipient/job/routing permissions and geographic policy tests.
storage-bootstrap.sql | Minimal fake Storage schema and policy helper for isolated SQL tests; not a real file service.
support-access.sql | Case scope, evidence leases, private Storage rules, notes and audit access tests.''')
add('scripts','''mobile-fixture.mjs | Loopback-only fictional API for mobile browser QA. Never a production backend.
support-fixture.mjs | Loopback-only fictional Auth, case and workforce API for web visual/interaction checks.
test-db.sh | Creates an isolated PostgreSQL test environment and exercises base/mobile/support/journey policies.
test-governance-db.sh | Runs isolated governance SQL checks without sending real messages.
test-scoped-workforce-db.sh | Installs current SQL setup and runs PostGIS-backed workforce authorization fixtures.
test-sos-db.sh | Runs isolated SOS/geography access tests with fictional records.
verify-mobile-ota.mjs | Read-only verification of served runtime/update manifest, bundle hash and incompatible-runtime rejection.''')
D['tests/staff-routing.test.mjs']='Regression tests for role entry, invitation returns, old links and open-redirect prevention.'
add('mobile/tests','''cipher.test.ts | Encryption round-trip, tamper and storage-namespace tests.
conversation-sync.test.ts | Polling ordering, pause/resume, cancellation and retry behavior tests.
evidence.test.ts | Attachment/link types, limits and evidence validation tests.
message-and-cloud.test.ts | Help-message formatting and cloud-write ownership contract tests.
motion-alert.test.ts | Shake/drop sample traces, countdown safety and automatic-request preconditions tests.
package.json | Test-specific module configuration for running pure TypeScript tests.
safety.test.ts | Phone/location/countdown and shake heuristic regression tests.
sms-permission.test.ts | Permission/default-SIM decisions including denial and settings paths.
sos.test.ts | Contact/incident validation, safe fallback and mocked provider contract tests.
vault.test.ts | Queued writes, account isolation and contact merge/removal regressions.''')
add('docs','''EMERGENCY_DESK_QA.md | Emergency workspace visual/interaction checks and limitations.
RESPONDER_OPERATIONS.md | Governance, verification, duty and safety gates for real responder operation.
SCOPED_WORKFORCE_MODEL.md | Role/area hierarchy, delegated access and volunteer approval design.
STAFF_ROUTING_QA.md | Role-home, invitation, callback and legacy-route verification notes.
TEAM_PORTAL_QA.md | Personnel/invitation/MFA workspace visual and access verification.
WORKFORCE_OPERATIONS.md | Current human onboarding, invitations, employee assignments, volunteer reviews and incident work instructions.''')
# Each tracked reference and asset is catalogued individually, with its role explicit.
def describe(f):
 if f in D:return D[f]
 p=Path(f);name=p.name;stem=p.stem.replace('-',' ').replace('_',' ')
 if f=='public/brand/helping-hands.png':return 'Production website hands logo served at /brand/helping-hands.png.'
 if f.startswith('docs/product-guide/diagrams/'):
  if p.suffix=='.py':return 'Generates seven architecture/data-flow/selected ERD diagrams as editable SVG and embedded PNG.'
  return ('Embedded PNG of ' if p.suffix=='.png' else 'Editable SVG source for ')+stem+'. Documentation artwork, not runtime business logic.'
 if f.startswith('docs/product-guide/') or f.startswith('docs/project-log/'):
  if name=='README.md':return 'Explains this document set, its editable source, generation and verification workflow.'
  if p.suffix=='.py':return 'Builds the Word reading copy from this folder\'s Markdown source with consistent formatting.'
  if 'Project-Log' in name:return 'Living dated questions/answers and decisions '+('Word reading copy.' if p.suffix=='.docx' else 'editable Markdown source.')
  return 'Product purpose, architecture, feature explanations, diagrams and role-based usage manual '+('Word reading copy.' if p.suffix=='.docx' else 'editable Markdown source.')
 if f.startswith('design/'):
  if name=='README.md':return 'Explains the design references or fictional visual QA captures in this folder, including verification boundaries.'
  if name=='selection.json':return 'Records the approved helping-hands concept, source reference, extraction prompt and production asset decision.'
  if 'prompt' in name:return 'Saved image-generation prompt(s) for the design concepts in this directory; historical design input.'
  if name=='helping-hands-master.png':return 'Transparent production master extracted from the approved hands concept; source for sized exports.'
  if name=='selected-helping-hands-reference.png':return 'Owner-approved presentation board retained as brand reference; not the isolated runtime asset.'
  if 'logo-explorations' in f:return 'Historical logo candidate '+stem+'. Retained for selection history; not an active app logo.'
  if 'app-concepts' in f:return 'Mobile design concept '+stem+'. A visual proposal/reference, not a working screen.'
  if name=='fixture-authenticator.svg':return 'Fictional authenticator artwork for visual QA; not a real enrollment secret.'
  return 'Saved visual QA/design capture for '+stem+' in '+p.parent.name.replace('-',' ')+'. Reference evidence only; not served as a product screen.'
 raise ValueError('Unmapped file: '+f)
files=subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines()
# Exclude this generator's newly tracked output on later rebuilds by cataloguing it explicitly.
for f in ['docs/codebase-map/README.md','docs/codebase-map/build-map.py','docs/codebase-map/build-word.py','docs/codebase-map/Victim-Voice-Codebase-Map.md','docs/codebase-map/Victim-Voice-Codebase-Map.docx','docs/codebase-map/file-inventory.json']:
 if f not in files:files.append(f)
D.update({'docs/codebase-map/README.md':'How to maintain and rebuild this file reference.','docs/codebase-map/build-map.py':'Builds the tracked-file inventory with individually assigned file purposes and coverage checks.','docs/codebase-map/build-word.py':'Formats the Markdown file reference as a readable Word document.','docs/codebase-map/Victim-Voice-Codebase-Map.md':'Editable complete folder/file reference with local-generated-file explanations.','docs/codebase-map/Victim-Voice-Codebase-Map.docx':'Shareable Word copy of the full file reference.','docs/codebase-map/file-inventory.json':'Machine-readable snapshot of every catalogued path and its explanation.'})
files=sorted(files);inventory={f:describe(f) for f in files}
(OUT/'file-inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
intro='''# Victim Voice Codebase Map

Folder and file reference for the app website and backend

Recorded 16 November 2026 | Based on code head 9998f3a and subsequent documentation commits

This reference explains every tracked file in the project, grouped by its exact parent folder. Paths are relative to the victimvoice repository. The workspace folder above it also contains PROJECT_STATUS.md and private local history-recovery material; those are not application modules.

The repository had 368 tracked files before this reference was added. This catalog also lists its six own maintenance/output files. Each file has an individual entry. A file being present does not mean its feature is live or fully tested: design captures, unused UI primitives, old planning notes and test fixtures are explicitly distinguished from runtime code.

### Main folder map

| Folder | Main responsibility |
| --- | --- |
| app | Website URL routes, layouts and page entry points. |
| components | Website support, personnel, evidence and UI components. |
| hooks | Website session, permissions, polling and notification hooks. |
| lib | Website backend clients, types, routing rules and reusable helpers. |
| mobile | Separate Expo Android project with its own packages and build configuration. |
| mobile/src/app | Mobile screen routes and global app initialization. |
| mobile/src/components | Mobile screens, native privacy and ongoing safety coordinators. |
| mobile/src/lib and state | Mobile logic, local encrypted vault, backend clients and central state. |
| mobile/modules and plugins | Android SIM SMS code and generated-native configuration. |
| shared | Cross-client validation, evidence, polling and provider rules. |
| supabase | Database SQL, access policies, server handlers and backend tests. |
| scripts and tests | Isolated tests, fictional APIs and update verification. |
| public | Static assets served by the website. |
| design | Design proposals, brand sources and fictional visual QA evidence. |
| docs | Operating guides, architecture reference and living project discussion. |
| .bolt | Original generation-tool settings; not the runtime backend. |

Read the code routes first to find a screen, then its component, helper and backend rule. A permission decision cannot safely be understood from the component alone.

<!-- page -->
## Local and generated folders

These are common local paths, not a claim that every one is tracked or required in a fresh clone. Individual dependency/cache files are generated by tools and are not product source files.

| Local path | Use and treatment |
| --- | --- |
| .git | Commit objects, refs and repository configuration. Git manages it; do not hand-edit history files. |
| node_modules and mobile/node_modules | Installed third-party packages. Recreated from the matching package lock with npm ci. |
| .next and .next scoped QA variants | Website generated builds and caches. Recreated by Next.js; never deploy fictional QA output. |
| .env.local and mobile/.env.local | Local environment values. Public client settings go here; secrets must not be committed or put in public-prefixed variables. |
| .vercel | Local link to the website deployment project. It is not the backend database. |
| mobile/.expo | Expo machine/session and development metadata. |
| mobile/android and mobile/ios | Generated native projects. Configure through app.json/plugins rather than hand-editing generated code. |
| mobile/dist | Exported bundles/assets used for OTA or web preview. Production and fictional QA exports must be kept separate. |
| mobile/artifacts | Ignored APKs, checksums, build logs, runtime metadata and OTA verification reports. The shareable 1.2.3 APK is here locally. |
| supabase/.temp | CLI project/cache state; not schema source. |
| supabase/functions/.env.local | Local server-only provider secrets if used for deployment. Never ship to the APK/browser or Git. |
| mobile/modules/*/android/build | Compiled output for local native modules, not hand-written module source. |

### File naming conventions

page.tsx defines a Next.js page; layout.tsx wraps its route group. Expo Router uses files in mobile/src/app to select screens; many simply re-export a component. A .tsx file can render UI; .ts usually holds logic/types. .css controls appearance. .sql defines database structures/rules or isolated test cases. .kt is Kotlin Android code. JSON/TOML/Gradle files configure tools. Lock files pin dependency versions. PNG/SVG/WAV files are assets, not executable feature implementations.

### SQL and release order

The initial schema was for an empty project. Later additive scripts depend on earlier setup and can replace its policies/functions. Current scoped workforce rules supersede old global-worker designs. Git pushes, Vercel deployments, APK/OTA updates, SQL application and Edge Function deployments are separate operations. This reference is an inventory, not a script to reset a live database.
'''
parts=[intro]
parents=sorted({str(Path(f).parent) for f in files},key=lambda x:(x!='.',x))
for parent in parents:
 subset=[f for f in files if str(Path(f).parent)==parent]
 # Exact folder headers also explain every intermediate ancestor through an index below.
 for start in range(0,len(subset),13):
  chunk=subset[start:start+13];title=('Repository root' if parent=='.' else (parent if len(parent)<65 else 'Native SMS '+Path(parent).name))+(' continued' if start else '')
  parts+=['\n## '+title+'\n\n','Full folder path: '+parent+'. Each row describes one file in this folder.\n\n','| File in '+parent+' | Purpose |\n| --- | --- |\n']
  for f in chunk:parts.append('| '+Path(f).name+' | '+inventory[f]+' |\n')
# Short ancestor index ensures every intermediate folder included even if it has no direct files.
ancestors=sorted({str(p) for f in files for p in Path(f).parents if str(p)!='.'})
parts+=['\n## Folder ancestry index\n\nEvery tracked parent directory appears here, including directories that only group subfolders. A parent groups the functionality of its descendants; the detailed file tables above identify their exact responsibilities.\n\n']
for a in ancestors:parts.append('- '+a+'\n')
(OUT/'Victim-Voice-Codebase-Map.md').write_text(''.join(parts))
print('Catalogued',len(files),'files in',len(parents),'direct parent folders;',len(ancestors),'ancestor folders')
