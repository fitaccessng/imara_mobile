# IMARA Mobile — Website Parity Tracker

**Audit date:** 2026-11-17
**Source of truth:** `apps/web/src/App.tsx`, `apps/web/src/pages/admin/AdminDashboard.tsx`,
`apps/web/src/pages/public/routes.ts`, `apps/web/src/components/AppShell.tsx`,
and the linked route components.
**Scope:** 104 React Router declarations across the main router and nested admin
portal, including aliases, redirects, wrappers, and catch-all routes. This is
not a count of unique screens: several routes intentionally share one page.

## Protected change boundary

- All implementation work stays in `mobile/`.
- Do not modify `apps/web`, `apps/api`, database schema, deployment settings, or
  production data.
- Reuse existing API contracts and server-side permission checks. If an API
  contract is missing, record the limitation; do not invent a route or change
  the backend.
- Preserve the existing personal and workspace file workflows.
- No commit or push without an explicit request.

## Status key

**Implementation:** `Integrated` means a mobile workflow calls the existing
API; `Partial` means some interactions or verification are missing; `Shell`
means a screen exists without the equivalent live workflow; `Missing` means no
mobile screen exists; `N/A` means an alias, redirect, or web-only admin area.

**Test:** `API tests` refers to contract/unit tests only, not a live-account
workflow. `Build` means the TypeScript checks and/or platform JavaScript export
ran; it does not mean a native device test. `Not tested` means no focused
automated or end-to-end coverage has verified the feature.

## Public pages, authentication, and token routes

| Website page / feature | Website route | Mobile screen | API dependency | Implementation status | Test status | Outstanding issues |
| --- | --- | --- | --- | --- | --- | --- |
| Landing page | `/` | `/marketing?page=home` | None | Implemented | Expo build passed; native content pending live device check | Native marketing screen and full-web link |
| Public home | `/home` | `/marketing?page=home` | None | Implemented | Expo build passed; device pending | Native content page |
| About | `/about` | `/marketing?page=about` | None | Implemented | Expo build passed; device pending | Native content page |
| Features | `/features` | `/marketing?page=features` | None | Implemented | Expo build passed; device pending | Native content page |
| Documentation | `/docs` | `/marketing?page=docs` | None | Implemented | Expo build passed; device pending | Native navigation guide |
| How it works | `/how-it-works` | `/marketing?page=how-it-works` | None | Implemented | Expo build passed; device pending | Native content page |
| Public pricing | `/pricing` | `/marketing?page=pricing` | `GET /plans` | Implemented | Expo build and account API test | Native plan overview and billing entry |
| Contact | `/contact` | `/marketing?page=contact` | Support ticket API | Implemented | Expo build and support API test | Native support entry |
| Help centre | `/help` | `/marketing?page=help` | None | Implemented | Expo build passed; device pending | Native help page |
| FAQ | `/faq` | `/marketing?page=faq` | None | Implemented | Expo build passed; device pending | Native FAQ page |
| Terms | `/terms` | `/marketing?page=terms` | None | Implemented | Expo build passed; device pending | Native terms summary |
| Privacy | `/privacy` | `/marketing?page=privacy` | None | Implemented | Expo build passed; device pending | Native privacy summary |
| Security information | `/security` | `/marketing?page=security` | None | Implemented | Expo build passed; device pending | Native security summary |
| Accessibility information | `/accessibility` | `/marketing?page=accessibility` | None | Implemented | Expo build passed; device pending | Native accessibility summary |
| Sign in | `/login` | `/(auth)/login` | `POST /auth/login`, `GET /auth/me` | Partial | Auth tests; native cookie/device flow pending | Verify cookie capture, restart persistence, session expiry on iOS/Android |
| Registration | `/register` | `/(auth)/register` | `POST /auth/register` | Partial | Auth tests; native device flow pending | Device validation and all website registration options |
| Forgot password | `/forgot-password` | `/(auth)/forgot-password` | `POST /auth/forgot-password` | Partial | Auth tests | End-to-end email/OTP verification |
| Reset password | `/reset-password` | `/(auth)/reset-password` | `POST /auth/reset-password-code` | Partial | Auth tests | End-to-end reset and source contract confirmation |
| Verify email | `/verify-email` | `/(auth)/verify-email` | `POST /auth/verify-email-code` | Partial | Auth tests; native cookie flow pending | Device session verification |
| Platform admin sign-in | `/admin/login` | — | Admin/session auth | N/A | Not tested | Privileged admin experience not in customer app |
| Admin portal wrapper | `/admin/*` | — | `/admin/me` and privileged routes | N/A | Not tested | Keep out of customer navigation; any admin app requires separate scope |
| Workspace invitation acceptance | `/workspace/invitations/accept` | `/invite?token=…` | `POST /invitations/:token/accept` | Implemented | Public contract test; live account pending | Signed-in acceptance and server-confirmed role/workspace result; deep-link host mapping still needs device verification |
| Public event capture | `/capture/:token` | `/capture?token=…` | `GET/POST /events/capture/:token` | Implemented | API contract test; live upload pending | Native file selection and multipart media upload; camera/device capture validation pending |
| Public event gallery | `/gallery/:token` | `/gallery?token=…` | `GET /events/gallery/:token` and media routes | Implemented | API contract test; live unlock pending | Metadata, passcode unlock and media list; authorized media download remains |
| Public shared-file view | `/share/:token` | `/share?token=…` | `/public-shares/:token` | Implemented | API contract test; live download pending | Metadata and public download URL; invalid/revoked behavior verification pending |
| Public document response | `/respond/:token` | `/respond?token=…` | `/public-documents/:token` | Implemented | API contract test; live submission pending | Form submission and agreement consent/signing |
| Public file request | `/request/:token` | `/request?token=…` | `/file-requests/public/:token` | Implemented | API contract test; live upload pending | Metadata and native multipart upload with client and server quota checks |
| Public offline-files page | `/offline-files` | `/(app)/offline-support` | No native offline-sync API | Partial | Not tested | Web offline behavior is not a native sync contract |
| Public catch-all | `/*` | Expo unmatched route | None | Partial | Not tested | Mobile not-found experience |

## Personal workspace

| Website page / feature | Website route | Mobile screen | API dependency | Implementation status | Test status | Outstanding issues |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard overview | `/dashboard`, `/dashboard/storage` | `/(app)` | `GET /dashboard/summary`, `/subscription` | Implemented | Contract test; live account pending | Live file/folder counts and recent items from server; remaining calendar/subscription edge verification |
| Personal file browser | `/files`, `/my-files`, `/all-files`, `/folders` | `/(app)/files` | `/files`, `/folders`, upload/download | Partial | File API tests; build passed | Personal file rename/move endpoints do not exist; upload progress/multi-select incomplete |
| Folder route/redirect | `/folders/:folderId` | `/(app)/files?folderId=…` | `GET /files?folderId=…` | Partial | Not tested | Verify deep-link state restoration |
| Search | `/search` | `/(app)/file-search` | `GET /search` | Partial | File API tests; build passed | Compare filters/sorting with website |
| Smart file library | `/smart-files` | `/(app)/smart-files` | `/files/smart-library`, `/files/duplicates`, organization | Partial | File API tests; build passed | Complete website actions; no duplicate-delete API |
| Favourites | `/favorites`, `/starred` | `/(app)/file-favorites` | `/files/favorites`, `/folders/favorites` | Partial | File API tests; build passed | Verify all item actions and sorting |
| Recycle bin | `/trash` | `/(app)/file-trash` | `/files/trash`, restore, permanent delete | Partial | File API tests; build passed | Folder trash is not exposed |
| Notifications | `/notifications` | `/(app)/notifications` | `/notifications`, mark-read | Integrated | Existing tests/build; live account pending | Device and server behavior verification |
| Personal calendar | `/calendar` | `/(app)/calendar` | `/calendar/events` | Implemented | 33 mobile tests passed; Android/iOS Expo exports passed | Live agenda, month navigation, create/edit/delete, reminders and event details; verify on device |
| Document Studio | `/documents` | `/(app)/documents` | `/documents`, responses, share | Implemented | API contract pending; live response pending | Create/list/share/revoke/delete and response retrieval; detailed form/editor parity remains |
| Notes | `/notes` | `/(app)/notes` | `/notes` | Implemented | API contract pending; live CRUD pending | Search/create/edit/delete |
| Document tools | `/document-tools` | `/(app)/document-tools` | Local Images-to-PDF; no server conversion API | Implemented/Partial | 37 tests; Android/iOS Expo exports | Images-to-PDF works locally; PDF/image and DOCX/PDF preserve-layout conversions remain unsupported pending a verified engine |
| File requests | `/file-requests` | `/(app)/file-requests` | `/file-requests` | Implemented | API contract pending; live upload pending | Create/list/revoke and public upload links |
| Scanner | `/scanner` | `/(app)/scan` | `/files/scan` | Partial | Not tested on device | Current native scan flow is limited; verify crop/OCR/multipage/save parity |
| Events | `/events` | `/(app)/events` | `/events` | Implemented | API contract pending; live CRUD pending | List/create/delete and token details |
| Create event | `/events/new` | `/(app)/events` | `POST /events` | Implemented | API contract pending; live create pending | Native form, gallery settings and passcodes |
| Event detail | `/events/:eventId` | `/(app)/events` | `/events/:id`, media routes | Partial | Not tested | Detail/token actions wired; owner media download/update UI remains |
| Support | `/support` | `/(app)/support` | `/support/tickets` | Implemented | API contract pending; live ticket pending | Ticket list/detail/create/reply |

## Workspace and team

| Website page / feature | Website route | Mobile screen | API dependency | Implementation status | Test status | Outstanding issues |
| --- | --- | --- | --- | --- | --- | --- |
| Workspace files/shared folders | `/workspace`, `/workspace/shared-folders` | `/(app)/workspace`, `/(app)/workspace-files` | `/workspaces`, `/storage`, folder/file/share routes | Partial | Workspace API tests; build passed | Device and role-specific tests; folder move, batch upload, replacement |
| Shared workspace calendar | `/workspace/calendar` | `/(app)/workspace-calendar` | `/workspaces/:id/calendar/events` | Implemented | 33 mobile tests passed; Android/iOS Expo exports passed | Workspace selection, tagged members for owners/admins, own-event management; verify workspace role behavior on device |
| File deliveries | `/workspace/file-deliveries` | `/(app)/workspace-file-deliveries` | `/workspaces/:id/file-deliveries` | Implemented | 33 mobile tests passed; Android/iOS Expo exports passed | Received/sent views and authenticated download/share; verify on device |
| Signatures | `/workspace/signatures` | `/(app)/signatures` | Workspace signature routes | Implemented | 33 mobile tests passed; TypeScript and Android/iOS exports passed | Typed or drawn signing with consent, decline/cancel, signer history, embedded PDF preview and authenticated PDF sharing; native touch/PDF rendering requires device validation |
| Approvals | `/workspace/approvals` | `/(app)/workspace-approvals`, `/(app)/approval-workflow` | Workspace approval routes | Implemented | 33 mobile tests passed; Android/iOS Expo exports passed | Live queues, reusable templates, request creation with attachments, comments, decisions, resubmit/cancel and activity; verify owner/admin/approver roles on device |
| Reminders | `/workspace/reminders` | `/(app)/reminders` | Workspace reminder routes | Implemented | 33 mobile tests passed; Android/iOS Expo exports passed | Live list, workspace selection, create/edit/complete/cancel, recurrence, assignment, and email option; verify on device |
| Workspace chat | `/workspace/chat` | `/(app)/chat`, `/(app)/workspace-chat`, `/(app)/conversation/[conversationId]` | Workspace chat REST routes | Integrated | Existing API tests/build; live workflow pending | Verify send/history/polling with authorized users; no realtime API |
| Team members | `/workspace/team`, `/workspace/members` | `/(app)/workspace-team` | Workspace member routes | Partial | API contract tests; live account/role test pending | Live member listing, search/status filters, lifecycle actions, counts and recent activity; verify owner/admin/restricted roles |
| Invite member | `/workspace/team/invite`, `/workspace/invite` | `/(app)/workspace-invite` | Invitation create and `/my-folders` | Partial | API contract tests; live email delivery pending | Role-aware invite and initial folder grants wired; verify capacity/email delivery and actual account acceptance |
| Member detail/activity | `/workspace/team/:memberId` | `/(app)/workspace-member/[memberId]` | Member detail/activity and member lifecycle routes | Partial | API contract tests; live account/role test pending | Profile/role/access/activity actions wired; verify owner/admin restrictions and server errors |
| Member permissions | `/workspace/team/:memberId/permissions` | `/(app)/workspace-member/[memberId]/permissions` | Member folder permission routes | Partial | API contract tests; live role test pending | Grant/restrict permissions and inheritance wired; verify resulting access behavior |
| Invitations | `/workspace/invitations` | `/(app)/workspace-invitations` | List/create/resend/revoke invitations | Partial | API contract tests; live email delivery pending | Status filtering and lifecycle wired; invitation acceptance deep-link route remains missing |
| Workspace activity | `/workspace/activity` | `/(app)/workspace-activity` | `/workspaces/:id/activity` | Partial | API contract tests; live account test pending | Dedicated audit list wired; verify authorized data and representative actions |
| Workspace roles | `/workspace/roles` | — | Workspace role/member APIs | Missing | Not tested | Role management interface |

## Account, billing, and subscription

| Website page / feature | Website route | Mobile screen | API dependency | Implementation status | Test status | Outstanding issues |
| --- | --- | --- | --- | --- | --- | --- |
| Profile/account settings | `/settings/profile`, `/settings/account` | `/(app)/account-settings` | `/users/me`, `/profile` | Implemented | Account contract test; live update pending | Profile read/update |
| Security settings | `/settings/security` | `/(app)/account-settings` | Auth change-password/session APIs | Implemented | Account contract test; live password pending | Password change and session logout |
| Active sessions | `/settings/sessions` | `/(app)/account-settings` | `/auth/sessions` | Implemented | Account contract test; live revoke pending | View/revoke sessions; native cookie behavior pending |
| Subscription overview | `/settings/subscription`, `/billing/subscription` | `/(app)/account-settings`, `/(app)/billing` | `/subscription`, billing routes | Implemented | Account contract test; live status pending | Server-provided plan/status |
| Plans | `/billing/plans` | `/(app)/billing` | `GET /plans` | Implemented | Account contract test; live plan pending | Pro/Business checkout entry |
| Checkout | `/billing/checkout` | `/(app)/billing` | `POST /billing/checkout` | Implemented | Account contract test; live provider pending | Provider URL handoff and checkout ID |
| Payment status | `/billing/payment-status` | `/(app)/billing` | `/billing/payments/:checkoutId` | Implemented | Account contract test; live reconciliation pending | Server-confirmed payment status only |

## Platform administration

The website's admin portal is privileged and separate from customer workspace
access. It is inventoried for completeness but is not part of the customer mobile
navigation. Do not expose admin actions without a separately approved scope and
role-specific security review.

| Website page / feature | Website route | Mobile screen | API dependency | Implementation status | Test status | Outstanding issues |
| --- | --- | --- | --- | --- | --- | --- |
| Admin overview | `/admin` | — | `/admin/me`, `/admin/overview` | N/A | Not tested | Separate privileged product scope |
| Users and user details | `/admin/users`, `/admin/users/:id` | — | Admin users routes | N/A | Not tested | Separate privileged product scope |
| Businesses and details | `/admin/businesses`, `/admin/businesses/:id` | — | Admin businesses routes | N/A | Not tested | Separate privileged product scope |
| Storage inventory | `/admin/storage` | — | `/admin/storage-inventory` | N/A | Not tested | Separate privileged product scope |
| Upload monitoring | `/admin/uploads` | — | `/admin/upload-monitoring` | N/A | Not tested | Separate privileged product scope |
| System health | `/admin/system-health` | — | `/admin/system-health` | N/A | Not tested | Separate privileged product scope |
| Event administration | `/admin/events` | — | `/admin/events` | N/A | Not tested | Separate privileged product scope |
| Announcement management | `/admin/announcements` | — | `/admin/announcements` | N/A | Not tested | Separate privileged product scope |
| Email campaigns | `/admin/email` | — | Admin email composer routes | N/A | Not tested | Separate privileged product scope |
| Referral programme | `/admin/referrals` | — | `/admin/referral-program` | N/A | Not tested | Separate privileged product scope |
| Support queue/detail | `/admin/support-tickets`, `/admin/support-tickets/:id` | — | Admin support routes | N/A | Not tested | Separate privileged product scope |
| Analytics | `/admin/analytics` | — | `/admin/analytics` | N/A | Not tested | Separate privileged product scope |
| Audit history | `/admin/audit-logs` | — | `/admin/audit-logs` | N/A | Not tested | Separate privileged product scope |
| Plan catalogue | `/admin/plans` | — | `/admin/plans` | N/A | Not tested | Separate privileged product scope |
| Subscription management | `/admin/subscriptions` | — | `/admin/subscriptions` | N/A | Not tested | Separate privileged product scope |
| Payment review | `/admin/payments` | — | `/admin/payments`, payment verification | N/A | Not tested | Separate privileged product scope |
| Platform settings/access | `/admin/settings` | — | Platform-admin routes | N/A | Not tested | Separate privileged product scope |
| Admin roles | `/admin/roles` | — | Platform-admin permission routes | N/A | Not tested | Separate privileged product scope |

## Cross-cutting website interactions

| Website page / feature | Website route | Mobile screen | API dependency | Implementation status | Test status | Outstanding issues |
| --- | --- | --- | --- | --- | --- | --- |
| Global personal/business navigation | `AppShell` navigation | `/(app)/all-pages`, tab routes | Workspace/profile APIs | Partial | Not tested | Verify every web navigation destination and active workspace context |
| File action menus and dialogs | File/folder pages and dialogs | Files/workspace file sheets | Existing file/folder/share routes | Partial | File API tests; build passed | Audit every website action, including versioning, replace, batch operations |
| File preview/editor | Document and file viewer routes/components | Native file preview | Authenticated download; conversion/preview APIs | Partial | Not tested on device | Compare formats, annotations, edit/save, and layout fidelity |
| Upload manager | Files/scanner | Native picker and scan queue | Multipart upload/scan | Partial | Not tested on device | Progress, retry, cancellation, multi-file and background limits |
| Biometric verification | Native device security | `/(app)/biometric` | LocalAuthentication; no server authorization | Partial | Not tested on device | Screen verifies locally but does not gate app-session access; verify behavior on enrolled/unenrolled devices |
| Session-expired and return path | Protected routes | Auth layouts | `/auth/me`, login/logout | Partial | Auth tests; device flow pending | Preserve intended route; verify revocation and expiry |
| Loading, empty, offline, denied, error states | All routes | Per-screen states | Existing API errors | Partial | Not tested comprehensively | Audit and exercise each state per workflow |
| Deep links | Token routes and auth redirects | `/(app)/deep-links` | Existing public token routes | Partial | Not tested on device | Universal/app-link association is not configured |
| Push notifications | Notifications | Notification settings | No device-token API | Blocked by API | Not tested | No backend device-token registration or remote push contract |
| Offline file access/synchronization | `/offline-files` | `/(app)/offline-support` | No mobile sync endpoint | Blocked by API | Not tested | Must not grant access using stale local permissions |

## Mobile route inventory and current validation

The mobile app currently has five authentication screens and 28 registered tab
screens (including hidden tab routes). The dedicated route checklist remains the
detailed interaction-level companion to this tracker:
[PAGE_PARITY_CHECKLIST.md](./PAGE_PARITY_CHECKLIST.md).

Latest recorded validation for the file-workflow slice:

- TypeScript checks: passed.
- Automated tests: 22 passed, including personal and workspace file API contract
  tests.
- Expo JavaScript exports: Android and iOS passed.
- Native Android/iOS device or simulator verification: not performed.
- Owner/admin/restricted-staff permission end-to-end verification: not performed.
- Website/API change check: no changes under `apps/web` or `apps/api`.

These results do not establish full website parity. Continue one route group at a
time, update this matrix and the interaction checklist after each verified
workflow, and do not mark a feature tested based only on a screen render or
bundle export.
