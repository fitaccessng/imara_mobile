# IMARA Web-to-Mobile Page Parity Checklist

**Audit date:** 2026-11-17
**Scope:** Active routes and primary user-facing workflows declared by the
existing web router. This document is the implementation checklist for the
mobile application. Aliases are retained so route coverage can be checked
without treating each alias as a separate feature.

The route-level traceability matrix with API dependencies and test status is
maintained in [IMARA_MOBILE_PARITY.md](./IMARA_MOBILE_PARITY.md).

## Change-control boundary

- The existing website was inspected read-only. No files under `apps/web` were
  modified for this audit.
- No backend or database files were modified.
- Mobile must continue to use the existing API, account system, storage,
  permissions, and server-side business rules.
- Any later backend change requires a named service/route, a justification,
  affected existing behavior, and a backward-compatibility plan before editing.
- The mobile app is an independent Expo package and nested Git repository under
  `mobile/`, pushed to `https://github.com/fitaccessng/imara_mobile`.

## Status definitions

- **Integrated:** a dedicated mobile screen performs the actual existing API
  operation and has loading/error/empty or action-result handling.
- **Partial:** a screen or native capability exists, but some website
  interactions, data, or end-to-end behavior are missing.
- **Shell only:** a page exists but shows sample/static content or does not yet
  perform the website-equivalent operation.
- **Missing:** no dedicated mobile implementation is present.
- **N/A:** website alias or redirect is represented by another canonical
  mobile screen.

Do not promote a page to Integrated until its server operation, permission
behavior, and failure states have been verified.

## Public website and authentication

Website source: `apps/web/src/App.tsx`; public page list:
`apps/web/src/pages/public/routes.ts`.

| Web route | Website page/workflow | Mobile route | Status |
| --- | --- | --- | --- |
| `/` | Landing page | `/marketing?page=home` | Implemented native information page; web-specific copy can open the full website |
| `/home` | Public home | `/marketing?page=home` | Implemented native content page |
| `/about` | About IMARA | `/marketing?page=about` | Implemented native content page |
| `/features` | Public feature overview | `/marketing?page=features` | Implemented native content page |
| `/docs` | Public documentation | `/marketing?page=docs` | Implemented native navigation guide |
| `/how-it-works` | Product explainer | `/marketing?page=how-it-works` | Implemented native content page |
| `/pricing` | Public pricing | `/marketing?page=pricing` | Implemented native plan overview and full billing page |
| `/contact` | Contact | `/marketing?page=contact` | Implemented native support entry |
| `/help` | Help centre | `/marketing?page=help` | Implemented native help page |
| `/faq` | FAQ | `/marketing?page=faq` | Implemented native FAQ page |
| `/terms` | Terms | `/marketing?page=terms` | Implemented native terms summary |
| `/privacy` | Privacy | `/marketing?page=privacy` | Implemented native privacy summary |
| `/security` | Security information | `/marketing?page=security` | Implemented native security summary |
| `/accessibility` | Accessibility information | `/marketing?page=accessibility` | Implemented native accessibility summary |
| `/login` | Sign in | `/(auth)/login` | Partial; native session requires device validation |
| `/register` | Account registration | `/(auth)/register` | Partial; native session requires device validation |
| `/forgot-password` | Start password recovery | `/(auth)/forgot-password` | Partial |
| `/reset-password` | Complete password recovery | `/(auth)/reset-password` | Partial |
| `/verify-email` | Email verification | `/(auth)/verify-email` | Partial |
| `/workspace/invitations/accept` | Accept a workspace invitation | `/invite?token=...` | Implemented; signed-in invitation acceptance, invalid/expired server errors and workspace navigation; live account verification pending |

## Protected personal workspace

Protected routes are declared in `apps/web/src/App.tsx` and rendered inside
`AppShell`. File, folder, and modal workflows are also implemented in
`apps/web/src/pages/FilesPage.tsx` and `apps/web/src/components/**`.

| Web route(s) | Website page/workflow | Mobile route | Status |
| --- | --- | --- | --- |
| `/dashboard`, `/dashboard/storage` | Overview and storage summary | `/(app)` | Shell only; dashboard metrics/recent items are sample data |
| `/files`, `/my-files`, `/all-files`, `/folders` | Personal file/folder browser | `/(app)/files` | Partial; live list, folder navigation/creation, upload, favorite, soft delete, native download/preview, public-share links, and folder favorite/rename/move/delete controls are wired; personal file rename/move APIs are absent |
| `/folders/:folderId` | Open folder; redirects to file browser with folder selection | `/(app)/files?folderId=...` | Partial; favorite/search folder results open by ID and name |
| `/search` | Search results | `/(app)/file-search` | Partial; live file/folder search, folder navigation, file preview and export |
| `/smart-files` | Smart file library | `/(app)/smart-files` | Partial; live categorization, tags, duplicate detection, preview and download; no server action deletes duplicates |
| `/favorites`, `/starred` | Favorite files/folders | `/(app)/file-favorites` | Partial; live file and folder favorites/removal |
| `/trash` | Trash, restore and permanent delete | `/(app)/file-trash` | Partial; live restore/permanent-delete actions; folder trash is not shown |
| `/notifications` | Personal notifications and mark-read | `/(app)/notifications` | Integrated; requires device and API verification |
| `/calendar` | Personal events and event management | `/(app)/calendar` | Live event list, month/day navigation, create/edit/delete, reminders and details; tests and Expo exports pass, device verification pending |

### Personal file interaction checklist

- [x] Browse files and folders from the authenticated API.
- [x] Navigate into/out of folders using the folder stack.
- [x] Search files/folders and show server results.
- [ ] Upload one or multiple files with progress, cancellation/error states, and
  destination selection.
- [x] Create, rename, move, favorite, and delete folders through existing API
  routes. The server rejects deletion of non-empty folders.
- [x] Download files to app-private device storage and hand supported types to
  the native preview; export through the platform share sheet.
- [ ] Rename, move, favorite, share, download, replace, and soft-delete files
  where supported by existing APIs. File favorite/share/download/soft-delete
  work; replace works through scan/API surfaces only. The personal-storage API
  has no file rename or file move endpoint. Do not invent these routes in mobile.
- [x] Restore trash items and gate permanent deletion behind native confirmation.
- [x] Show file metadata and provide accessible file actions.
- [x] Create, list, share, and revoke public file links.
- [ ] Use server permission/quota responses as authority; never infer access
  locally.

## Business workspace

Website routes and page components are in `apps/web/src/App.tsx`,
`apps/web/src/workspaces/WorkspaceAdminPages.tsx`,
`apps/web/src/workspaces/WorkspaceStoragePage.tsx`, and the workspace feature
modules.

| Web route | Website page/workflow | Mobile route | Status |
| --- | --- | --- | --- |
| `/workspace`, `/workspace/shared-folders` | Workspace storage/shared folders | `/(app)/workspace`, `/(app)/workspace-files` | Partial; live workspace selection, authorized folders/files, upload, download/preview, rename/move/share/delete, and folder create/rename/delete use existing APIs; device and role-permission verification remain |
| `/workspace/calendar` | Shared workspace calendar | `/(app)/workspace-calendar` | Live workspace event list, member tagging for owners/admins, and own-event management; tests/exports pass, role verification on device pending |
| `/workspace/file-deliveries` | File deliveries | `/(app)/workspace-file-deliveries` | Received/sent views and authenticated download/share; tests/exports pass, device verification pending |
| `/workspace/signatures` | Signature requests, signing/declining | `/(app)/signatures` | API-backed request creation, typed/drawn signing with consent, decline/cancel, signer history, embedded PDF preview and authenticated sharing; tests/exports pass; native touch/PDF rendering needs device validation |
| `/workspace/approvals` | Approval queue and decisions | `/(app)/workspace-approvals`, `/(app)/approval-workflow` | API-backed queues, reusable templates, request/attachment creation, comments, decisions, resubmission/cancellation and history; tests/exports pass, role verification on device pending |
| `/workspace/reminders` | Reminder lifecycle | `/(app)/reminders` | Live workspace-scoped reminder list and create/edit/complete/cancel flows, recurrence, assignment and email options; verify on device |
| `/workspace/chat` | Workspace chat | `/(app)/chat`, `/(app)/conversation/[conversationId]` | Integrated REST list/history/send with polling; verify end-to-end |
| `/workspace/team`, `/workspace/members` | Workspace members | `/(app)/workspace-team` | Partial; live member/invitation lists, filters, lifecycle actions and recent audit records are wired; live role-specific verification remains |
| `/workspace/team/invite`, `/workspace/invite` | Invite member | `/(app)/workspace-invite` | Partial; role-aware invite with initial folder grants wired; email delivery/account acceptance not end-to-end tested |
| `/workspace/team/:memberId` | Member details and activity | `/(app)/workspace-member/[memberId]` | Partial; detail, role/name updates, access lifecycle and activity wired; live role verification pending |
| `/workspace/team/:memberId/permissions` | Member folder permissions | `/(app)/workspace-member/[memberId]/permissions` | Partial; grant/restrict/inheritance rules wired through existing APIs; live effect verification pending |
| `/workspace/invitations` | Invitation management | `/(app)/workspace-invitations` | Partial; list/status filters/resend/revoke wired; accept deep link remains missing |
| `/workspace/activity` | Workspace activity/audit log | `/(app)/workspace-activity` | Partial; dedicated audit history wired, live account verification pending |
| `/workspace/roles` | Workspace role management | — | Missing |

### Workspace storage interaction checklist

- [x] Switch between workspaces and load each workspace's server-authorized folder/file listing.
- [x] Create folders and upload a selected file into the current folder.
- [x] Preview or export workspace files through native device storage and sharing.
- [x] Rename, move, share, and permanently delete files through existing workspace endpoints.
- [x] Rename or delete empty folders through existing workspace endpoints.
- [x] Gate actions using the permissions returned for the current folder; the API remains authoritative for every operation.
- [ ] Verify each action end to end using representative owner, administrator, and restricted staff accounts on iOS and Android.
- [ ] Implement missing folder move, multi-file upload/progress, and file replacement workflows where supported by existing APIs.

### Business workflow checklist

- [ ] List and switch among workspaces using `/workspaces`; retain selected
  workspace safely across navigation.
- [ ] Show authorized shared/private folders and files from workspace APIs.
- [ ] Add file deliveries, upload/download, sharing, and folder actions.
- [x] Implement personal and shared calendar event list, month/day navigation,
  create/edit/delete, reminders, details, and workspace-member tagging for
  authorized owners/admins; verify role behavior on device.
- [x] Implement workspace-scoped reminder list/create/edit/complete/cancel,
  recurrence, administrator assignment and email notification options; verify
  server-authorized roles on device.
- [ ] Complete signature native drawn-signature capture and embedded document
  preview; the current flow supports typed signing, consent, decline/cancel,
  signer history and authenticated PDF sharing.
- [x] Implement approval templates, request creation with attachments, details,
  comments, decisions, resubmission/cancellation, archive/activate, and workflow
  history; verify owner/admin/approver roles on device.
- [x] Implement live member listing, invitation creation/management, member
  detail/activity, and folder permission grant/restrict controls using existing
  APIs (device/live role verification remains outstanding).
- [ ] Implement invitation acceptance, workspace role management, and persist
  selected workspace across app navigation.
- [ ] Preserve inherited folder access and server-side role/entitlement checks.
- [ ] Verify owner/admin, manager, and staff behavior with authorized test
  accounts; do not treat hidden controls as access enforcement.

## Documents, collaboration and service workflows

| Web route | Website page/workflow | Mobile route | Status |
| --- | --- | --- | --- |
| `/documents` | Document Studio, forms/responses | `/(app)/documents` | Implemented create/list/share/revoke/delete and response retrieval; document editing/schema parity needs live verification |
| `/notes` | Personal notes | `/(app)/notes` | Implemented search/create/edit/delete |
| `/document-tools` | Document conversion/processing tools | `/(app)/document-tools` | Implemented local Images-to-PDF; PDF/image and Word/layout conversions remain explicitly unsupported pending a verified engine; no files upload |
| `/file-requests` | Create/manage file requests | `/(app)/file-requests` | Implemented create/list/revoke and public links |
| `/scanner` | Scanner landing/scan workflow | `/(app)/scan` | Partial; native capture queues/uploads a single personal image only |
| `/offline-files` | Offline access management | `/(app)/offline-support` | Partial; scan queue only; offline file downloads are not implemented |
| `/events` | Event management | `/(app)/events` | Implemented list/create/delete, token details and link rotation |
| `/events/new` | Create event | `/(app)/events` | Implemented native create form with gallery settings and passcodes |
| `/events/:eventId` | Event detail and media management | `/(app)/events` | Implemented owner media list/authenticated download and token details; live role/device media verification and event update UI remain |
| `/support` | Support tickets and replies | `/(app)/support` | Implemented list/detail/create/reply |
| `/respond/:token` | Public document response/signing | `/respond?token=...` | Implemented form/consent submission; server-confirmed public token behavior pending |
| `/request/:token` | Public file-request upload | `/request?token=...` | Implemented metadata and native multipart upload with quota checks; live upload verification pending |
| `/capture/:token` | Public event media capture | `/capture?token=...` | Implemented metadata and native multipart media upload; live capture device verification pending |
| `/gallery/:token` | Public event gallery | `/gallery?token=...` | Implemented metadata, passcode unlock and media list; live authorization/download verification pending |
| `/share/:token` | Public shared-file preview/download | `/share?token=...` | Implemented metadata and public download link; invalid/revoked behavior verification pending |
| `/workspace/invitations/accept` | Token-based invitation acceptance | — | Missing |

## Account, billing and subscription

| Web route | Website page/workflow | Mobile route | Status |
| --- | --- | --- | --- |
| `/settings/profile`, `/settings/account` | Profile/account settings | `/(app)/account-settings` | Implemented profile update |
| `/settings/security` | Password/security management | `/(app)/account-settings` | Implemented change-password and native session logout |
| `/settings/sessions` | Active session list/revocation | `/(app)/account-settings` | Implemented list/revoke; live revocation pending |
| `/settings/subscription`, `/billing/subscription` | Subscription and entitlements | `/(app)/account-settings`, `/(app)/billing` | Implemented server subscription status |
| `/billing/plans` | Select subscription plan | `/(app)/billing` | Implemented Pro/Business checkout entry |
| `/billing/checkout` | Start provider checkout | `/(app)/billing` | Implemented server checkout and provider URL handoff; provider confirmation pending |
| `/billing/payment-status` | Payment status/reconciliation | `/(app)/billing` | Implemented payment list/detail lookup; reconciliation remains provider/server-confirmed only |

## Platform administration

Admin paths are nested beneath `/admin/*` in
`apps/web/src/pages/admin/AdminDashboard.tsx`. These pages are privileged and
must only be implemented after the admin identity/role contract is verified.

| Web route | Admin page/workflow | Mobile route | Status |
| --- | --- | --- | --- |
| `/admin/login` | Platform admin authentication | — | Missing |
| `/admin` | Admin overview | — | Missing |
| `/admin/users`, `/admin/users/:id` | Users and user details | — | Missing |
| `/admin/businesses`, `/admin/businesses/:id` | Businesses and details | — | Missing |
| `/admin/storage` | Storage inventory | — | Missing |
| `/admin/uploads` | Upload monitoring | — | Missing |
| `/admin/system-health` | System health | — | Missing |
| `/admin/events` | Platform event administration | — | Missing |
| `/admin/announcements` | Announcement management | — | Missing |
| `/admin/email` | Email composer/campaigns | — | Missing |
| `/admin/referrals` | Referral programme | — | Missing |
| `/admin/support-tickets`, `/admin/support-tickets/:id` | Support queue and ticket detail | — | Missing |
| `/admin/analytics` | Platform analytics | — | Missing |
| `/admin/audit-logs` | Platform audit history | — | Missing |
| `/admin/plans` | Plan catalogue management | — | Missing |
| `/admin/subscriptions` | Subscription management | — | Missing |
| `/admin/payments` | Payment review and finance verification | — | Missing |
| `/admin/settings` | Platform admin settings/access | — | Missing |
| `/admin/roles` | Platform admin role management | — | Missing |

## Global navigation, dialogs and interaction parity

Web source: `apps/web/src/components/AppShell.tsx`, `apps/web/src/App.tsx`,
and feature pages/components listed above.

- [ ] Workspace switcher and active personal/business context.
- [ ] Search entry point and search results.
- [ ] Notification entry point with unread state.
- [ ] Mobile equivalents for all AppShell personal and business navigation.
- [ ] Native action sheets/bottom sheets for file/folder context actions.
- [ ] Full-screen document preview with supported edit/replace/download actions.
- [ ] Upload progress, retry/failure, and duplicate-action prevention.
- [ ] Native confirmations for destructive and consequential actions.
- [ ] Session-expired handling and return-to-requested-route behavior.
- [ ] Empty, loading, offline, permission-denied, and error states for each
  workflow.

## API/backend gaps to preserve during parity work

The current API inventory is documented in `mobile/API_INVENTORY.md`.

- REST chat is available; there is no realtime transport. Polling is the
  compatible mobile behavior until an approved backend extension exists.
- There is no remote push device-token registration endpoint.
- There is no mobile offline sync endpoint, resumable upload endpoint, or
  background-upload contract.
- Device notification permission is not proof of remote push delivery.
- Native offline caching must not grant access using stale local permissions.
- Any backend extension must be isolated, additive/backward-compatible, and
  explicitly justified before changes.

## Current phase result

The app has a mobile foundation and several API-backed file, communication, and
native-support workflows, but complete feature parity is not achieved. The
route-level matrix in [IMARA_MOBILE_PARITY.md](./IMARA_MOBILE_PARITY.md) records
the broader router inventory, API dependencies, test status, and outstanding
work. Many workspace, productivity, overview, account, and service screens still
need live integration. Do not modify `apps/web` or `apps/api`.
