# Staff workspace routing

The personnel workspace now lives at `/admin/team`. Invitation acceptance is isolated at `/join`, so an invitee can sign in and complete MFA before receiving a staff membership. The compatibility URL `/team` contains no management or acceptance form.

| Entry | Result |
| --- | --- |
| `/admin` as superadmin or area admin | `/admin/team` |
| `/admin` as employee | `/admin/dashboard` |
| `/admin` as approved responder | `/admin/emergency` |
| `/admin` signed out | Staff sign-in, preserving the staff-home destination |
| `/admin` as a normal member / pending applicant | `/join` |
| `/admin/team` without a personnel role | Own approved-responder home or `/join`; signed-out visitors sign in first |
| `/join` | Own account reference, MFA, code acceptance, granted role/areas and a staff-home link after success |
| `/team` | Personnel roles go to `/admin/team`; other visitors go to `/join` |

These are browser-session redirects: the existing Supabase web session is stored in the browser, rather than an SSR cookie. URLs do not grant roles. Existing backend scope, purpose, assignment, consent and MFA checks are unchanged. No SQL, Auth-provider redirect URI or native app change is needed.

Password, Google and phone sign-in use one exact allowlist for return destinations. External URLs, protocol-relative URLs, backslash/path tricks, arbitrary queries/fragments and double-encoded destinations are rejected. OAuth intent is consumed once, including legacy `/team` intent. Invitation acceptance is the only unaffiliated-account exception to staff-login routing, and still requires the existing account-bound, MFA-protected backend RPC. Login forms use POST as a fallback so an early native form submission does not put passwords/codes into a URL.

Navigation follows the role: personnel administrators have support, emergency and team entries; employees have support and team entries; responders have their emergency workspace. The old intermediate Team panel inside the inbox now links directly to personnel management. `/join` has no roster, case queue or volunteer-review controls. Its account-security view fits the narrow invitation card.

## Verification

- `npm run test:routing`: five tests covering staff and responder approval routing, old links, disallowed destinations, pending-invite sign-in and one-time/legacy OAuth intent.
- `npm run build`, `npm run typecheck`, `npm run lint`: pass, including production route generation for `/admin`, `/admin/team`, `/join` and `/team`.
- All entry pages return HTTP 200 and private-page headers, including noindex, no-referrer and frame denial.
- Loopback-only browser fixtures exercised root and area-admin homes, employee home after joining, approved-responder routing, ordinary-member denial from management, signed-out old links, invalid and accepted codes, account switching, password/phone/PKCE callback return to `/join`, and the MFA gate before code entry.
- The invitation/MFA layout has no horizontal overflow at 390px. Screenshots in `design/staff-routes/` use fictional accounts. No real invitation, staff grant, provider sign-in, SMS or authenticator was created by QA.
- Production bundle checks exclude QA API URLs, fixture keys and fake callback codes.

The backend authorization suite is unchanged by this route-only refactor. Physical app delivery and provider availability are not asserted by these checks.
