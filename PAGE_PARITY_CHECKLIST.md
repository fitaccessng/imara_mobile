# IMARA Web-to-Mobile Page Parity Checklist

**Audit date:** 2026-11-17
**Scope:** Active routes and primary user-facing workflows declared by the
existing web router. This document is the implementation checklist for the
mobile application. Aliases are retained so route coverage can be checked
without treating each alias as a separate feature.

## Change-control boundary

- The existing website was inspected read-only. No files under `apps/web` were
  modified for this audit.
- No backend or database files were modified.
- Mobile must continue to use the existing API, account system, storage,
  permissions, and server-side business rules.
- Any later backend change requires a named service/route, a justification,
  affected existing behavior, and a backward-compatibility plan before editing.
- The mobile app is currently a separate Expo package under `mobile/`, but its
  directory is still inside the existing Git repository. This is not yet a
  separately hosted Git repository.

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
| `/` | Landing page | — | Missing |
| `/home` | Public home | — | Missing |
| `/about` | About IMARA | — | Missing |
| `/features` | Public feature overview | — | Missing |
| `/docs` | Public documentation | — | Missing |
| `/how-it-works` | Product explainer | — | Missing |
| `/pricing` | Public pricing | — | Missing |
| `/contact` | Contact | — | Missing |
| `/help` | Help centre | — | Missing |
| `/faq` | FAQ | — | Missing |
| `/terms` | Terms | — | Missing |
| `/privacy` | Privacy | — | Missing |
| `/security` | Security information | — | Missing |
| `/accessibility` | Accessibility information | — | Missing |
| `/login` | Sign in | `/(auth)/login` | Partial; native session requires device validation |
| `/register` | Account registration | `/(auth)/register` | Partial; native session requires device validation |
| `/forgot-password` | Start password recovery | `/(auth)/forgot-password` | Partial |
| `/reset-password` | Complete password recovery | `/(auth)/reset-password` | Partial |
| `/verify-email` | Email verification | `/(auth)/verify-email` | Partial |
| `/workspace/invitations/accept` | Accept a workspace invitation | — | Missing |

## Protected personal workspace

Protected routes are declared in `apps/web/src/App.tsx` and rendered inside
`AppShell`. File, folder, and modal workflows are also implemented in
`apps/web/src/pages/FilesPage.tsx` and `apps/web/src/components/**`.

| Web route(s) | Website page/workflow | Mobile route | Status |
| --- | --- | --- | --- |
| `/dashboard`, `/dashboard/storage` | Overview and storage summary | `/(app)` | Shell only; dashboard metrics/recent items are sample data |
| `/files`, `/my-files`, `/all-files`, `/folders` | Personal file/folder browser | `/(app)/files` | Shell only; list, filtering, upload, open and mutations are not integrated |
| `/folders/:folderId` | Open folder; redirects to file browser with folder selection | — | Missing |
| `/search` | Search results | — | Missing |
| `/smart-files` | Smart file library | — | Missing |
| `/favorites`, `/starred` | Favorite files/folders | — | Missing |
| `/trash` | Trash, restore and permanent delete | — | Missing |
| `/notifications` | Personal notifications and mark-read | `/(app)/notifications` | Integrated; requires device and API verification |
| `/calendar` | Personal events and event management | `/(app)/calendar` | Shell only; current events are sample data |

### Personal file interaction checklist

- [ ] Browse files and folders from the authenticated API.
- [ ] Navigate into/out of folders and preserve the selected folder route.
- [ ] Search files/folders and show server results.
- [ ] Upload one or multiple files with progress, cancellation/error states, and
  destination selection.
- [ ] Create, rename, move, favorite, and delete folders where supported.
- [ ] Download and preview supported files in a full-screen native preview.
- [ ] Rename, move, favorite, share, download, replace, and soft-delete files
  where supported by existing APIs.
- [ ] Restore trash items and gate permanent deletion behind native confirmation.
- [ ] Show file details, metadata, sharing state, and accessible actions.
- [ ] Use server permission/quota responses as authority; never infer access
  locally.

## Business workspace

Website routes and page components are in `apps/web/src/App.tsx`,
`apps/web/src/workspaces/WorkspaceAdminPages.tsx`,
`apps/web/src/workspaces/WorkspaceStoragePage.tsx`, and the workspace feature
modules.

| Web route | Website page/workflow | Mobile route | Status |
| --- | --- | --- | --- |
| `/workspace`, `/workspace/shared-folders` | Workspace storage/shared folders | `/(app)/workspace`, `/(app)/workspace-files` | Shell only; workspace selection and file content are sample data |
| `/workspace/calendar` | Shared workspace calendar | — | Missing |
| `/workspace/file-deliveries` | File deliveries | — | Missing |
| `/workspace/signatures` | Signature requests, signing/declining | `/(app)/signatures` | Shell only; not connected to signature APIs |
| `/workspace/approvals` | Approval queue and decisions | `/(app)/workspace-approvals`, `/(app)/approval-workflow` | Shell only; no live workflow operations |
| `/workspace/reminders` | Reminder lifecycle | `/(app)/reminders` | Shell only; not connected to reminder APIs |
| `/workspace/chat` | Workspace chat | `/(app)/chat`, `/(app)/conversation/[conversationId]` | Integrated REST list/history/send with polling; verify end-to-end |
| `/workspace/team`, `/workspace/members` | Workspace members | `/(app)/workspace-team` | Shell only; member data and actions are sample |
| `/workspace/team/invite`, `/workspace/invite` | Invite member | — | Missing |
| `/workspace/team/:memberId` | Member details and activity | — | Missing |
| `/workspace/team/:memberId/permissions` | Member folder permissions | — | Missing |
| `/workspace/invitations` | Invitation management | — | Missing |
| `/workspace/activity` | Workspace activity/audit log | `/(app)/workspace` | Partial; overview activity is sample, no activity API |
| `/workspace/roles` | Workspace role management | — | Missing |

### Business workflow checklist

- [ ] List and switch among workspaces using `/workspaces`; retain selected
  workspace safely across navigation.
- [ ] Show authorized shared/private folders and files from workspace APIs.
- [ ] Add file deliveries, upload/download, sharing, and folder actions.
- [ ] Implement shared calendar event list, create/edit/delete, and details.
- [ ] Implement reminder list, create/edit/complete/cancel.
- [ ] Implement signature source/member selection, request creation, detail,
  document preview, sign/decline/cancel, and history.
- [ ] Implement approval templates, request creation, details/comments,
  decisions, resubmission/cancellation, and workflow history.
- [ ] Implement member list, invitations, invitation acceptance, member detail,
  activity, role management, and folder permission grant/restrict controls.
- [ ] Preserve inherited folder access and server-side role/entitlement checks.
- [ ] Verify owner/admin, manager, and staff behavior with authorized test
  accounts; do not treat hidden controls as access enforcement.

## Documents, collaboration and service workflows

| Web route | Website page/workflow | Mobile route | Status |
| --- | --- | --- | --- |
| `/documents` | Document Studio, forms/responses | — | Missing |
| `/notes` | Personal notes | — | Missing |
| `/document-tools` | Document conversion/processing tools | — | Missing |
| `/file-requests` | Create/manage file requests | — | Missing |
| `/scanner` | Scanner landing/scan workflow | `/(app)/scan` | Partial; native capture queues/uploads a single personal image only |
| `/offline-files` | Offline access management | `/(app)/offline-support` | Partial; scan queue only; offline file downloads are not implemented |
| `/events` | Event management | — | Missing |
| `/events/new` | Create event | — | Missing |
| `/events/:eventId` | Event detail and media management | — | Missing |
| `/support` | Support tickets and replies | — | Missing |
| `/respond/:token` | Public document response/signing | — | Missing |
| `/request/:token` | Public file-request upload | — | Missing |
| `/capture/:token` | Public event media capture | — | Missing |
| `/gallery/:token` | Public event gallery | — | Missing |
| `/share/:token` | Public shared-file preview/download | — | Missing |
| `/workspace/invitations/accept` | Token-based invitation acceptance | — | Missing |

## Account, billing and subscription

| Web route | Website page/workflow | Mobile route | Status |
| --- | --- | --- | --- |
| `/settings/profile`, `/settings/account` | Profile/account settings | — | Missing |
| `/settings/security` | Password/security management | — | Missing |
| `/settings/sessions` | Active session list/revocation | — | Missing |
| `/settings/subscription`, `/billing/subscription` | Subscription and entitlements | — | Missing |
| `/billing/plans` | Select subscription plan | — | Missing |
| `/billing/checkout` | Start provider checkout | — | Missing |
| `/billing/payment-status` | Payment status/reconciliation | — | Missing |

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

This audit is **Phase 0 only**. Existing mobile screens establish a foundation
but do not satisfy complete functional parity. In particular, many current
workspace, productivity, overview, and file screens still display sample data;
the checklist marks those as Shell only rather than counting them as complete.

The next development work should use this checklist in route groups, starting
with real personal file and folder operations, then workspace/member workflows.
Do not modify `apps/web`.
