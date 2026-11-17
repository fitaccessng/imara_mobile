# IMARA Mobile — Implemented API Inventory

**Audited:** 2026-11-17
All paths below are under `/api/v1`. The list is based on current NestJS
controller decorators; API documentation files can include planned or stale
routes. Most user operations require the existing server session cookie;
explicit public/token flows are identified where known. Confirm guards and
route-specific authorization in the controller before integration.
Authorization and workspace permissions remain server-side.

## Authentication and account

| Methods | Path | Access / use |
| --- | --- | --- |
| POST | `/auth/register` | Public; registration and optional business workspace setup |
| POST | `/auth/login` | Public; sets the HttpOnly session cookie |
| POST | `/auth/logout` | Authenticated; revokes current session and clears cookie |
| POST | `/auth/verify-email` | Public token verification; sets session cookie |
| POST | `/auth/verify-email-code` | Public OTP verification; sets session cookie |
| POST | `/auth/resend-verification` | Public controller route |
| POST | `/auth/forgot-password` | Public; generic response |
| POST | `/auth/reset-password` | Public token reset; source/docs contract mismatch noted in architecture report |
| POST | `/auth/reset-password-code` | Public OTP reset; preferred native flow |
| GET | `/auth/me` | Authenticated current account |
| POST | `/auth/change-password` | Authenticated; revokes sessions/clears cookie |
| GET | `/auth/sessions` | Authenticated session listing |
| DELETE | `/auth/sessions/:id` | Authenticated session revocation |
| GET, PATCH | `/users/me`, `/profile` | Authenticated profile aliases |
| GET | `/subscription` | Authenticated plan and storage entitlements |
| GET | `/dashboard/summary`, `/dashboard` | Authenticated dashboard summary aliases |

## Personal files and folders

| Methods | Path | Notes |
| --- | --- | --- |
| GET | `/files` | Optional `folderId`; returns folders and files in that folder |
| POST | `/files` | Multipart upload (`file`, optional folder ID) |
| GET | `/files/:id/download` | Authenticated streamed download |
| PATCH | `/files/:id/content` | Multipart content replacement |
| DELETE | `/files/:id` | Soft delete |
| POST | `/files/:id/restore` | Restore from trash |
| DELETE | `/files/:id/permanent` | Permanent delete |
| GET | `/files/trash` | Trash listing |
| GET | `/files/unindexed` | Files needing indexing |
| GET | `/files/favorites` | Favorited files |
| PATCH | `/files/:id/favorite` | Toggle file favorite |
| PATCH | `/files/:id/organization` | Update category/tags |
| PATCH | `/files/:id/expiry` | Update expiry |
| PUT | `/files/:id/ocr-text` | Save OCR text |
| POST | `/files/scan` | Multipart scan upload |
| GET | `/files/smart-library` | Smart-library file listing |
| GET | `/files/duplicates` | Duplicate groups |
| GET | `/search` | Search files/folders |
| GET | `/folders` | Optional parent folder |
| GET | `/folders/tree` | Personal folder tree |
| GET | `/folders/:id` | Folder details |
| POST | `/folders` | Create folder |
| PATCH | `/folders/:id` | Rename folder |
| POST | `/folders/:id/move` | Move folder |
| DELETE | `/folders/:id` | Delete folder |
| GET | `/folders/favorites` | Favorited folders |
| PATCH | `/folders/:id/favorite` | Toggle folder favorite |

## Shares and file requests

| Methods | Path | Access / use |
| --- | --- | --- |
| POST, GET | `/files/:fileId/shares` | Authenticated personal-file share links |
| DELETE | `/files/:fileId/shares/:shareId` | Revoke personal share |
| POST, GET | `/workspaces/:workspaceId/files/:fileId/shares` | Workspace file sharing |
| DELETE | `/workspaces/:workspaceId/files/:fileId/shares/:shareId` | Revoke workspace share |
| GET | `/public-shares/:token` | Public share metadata |
| GET | `/public-shares/:token/download` | Public share download, subject to share token |
| POST, GET | `/file-requests` | Authenticated create/list |
| DELETE | `/file-requests/:id` | Revoke request |
| GET | `/file-requests/public/:token` | Public request details |
| POST | `/file-requests/public/:fileRequestToken/uploads` | Public upload to a request |

## Workspace, staff and permissions

| Methods | Path | Access / use |
| --- | --- | --- |
| GET, POST | `/workspaces` | List / create workspace |
| GET, PATCH | `/workspaces/:workspaceId` | Get / update workspace |
| GET | `/workspaces/:workspaceId/my-folders` | Current member's accessible folders |
| GET | `/workspaces/:workspaceId/members` | Member listing |
| GET | `/workspaces/:workspaceId/members/:memberId` | Staff detail |
| GET | `/workspaces/:workspaceId/members/:memberId/activity` | Admin-authorized member activity |
| PATCH, DELETE | `/workspaces/:workspaceId/members/:memberId` | Update role/profile / remove member |
| POST | `/workspaces/:workspaceId/members/:memberId/suspend` | Suspend member |
| POST | `/workspaces/:workspaceId/members/:memberId/restore` | Restore member |
| GET, PUT | `/workspaces/:workspaceId/members/:memberId/permissions` | Read / replace member folder rules |
| GET | `/workspaces/:workspaceId/folders/:folderId/permissions` | Folder rule listing |
| PUT | `/workspaces/:workspaceId/folders/:folderId/permissions` | Set folder rule |
| DELETE | `/workspaces/:workspaceId/folders/:folderId/permissions/:permissionId` | Remove rule |
| POST | `/workspaces/:workspaceId/folders/:folderId/permissions/preview` | Permission preview |
| POST, GET | `/workspaces/:workspaceId/invitations` | Invite / list invitations |
| POST | `/invitations/:token/accept` | Accept invitation |
| POST | `/workspaces/:workspaceId/invitations/:invitationId/resend` | Resend invitation |
| DELETE | `/workspaces/:workspaceId/invitations/:invitationId` | Revoke invitation |
| GET | `/workspaces/:workspaceId/activity` | Workspace audit history |
| GET | `/workspaces/:workspaceId/notifications` | Workspace notifications |
| POST | `/workspaces/:workspaceId/notifications/:notificationId/read` | Mark workspace notification read |

## Workspace storage and file delivery

All paths here are prefixed `/workspaces/:workspaceId`.

| Methods | Path | Notes |
| --- | --- | --- |
| GET | `/storage` | Folder/file contents |
| GET | `/files/unindexed`, `/search` | Workspace file listing/search |
| GET | `/folders`, `/folders/:folderId` | Folders/details |
| POST | `/folders` | Create folder |
| PATCH, DELETE | `/folders/:folderId` | Rename / delete |
| POST | `/files`, `/files/scan` | Multipart upload / scan upload |
| GET | `/files/:fileId/download` | Stream file download |
| PATCH | `/files/:fileId` | Update file metadata |
| PATCH | `/files/:fileId/content` | Replace file content |
| PUT | `/files/:fileId/ocr-text` | Save OCR text |
| POST | `/files/:fileId/move` | Move file |
| DELETE | `/files/:fileId` | Delete file |
| POST | `/files/:fileId/send` | Send workspace file |
| GET | `/file-deliveries`, `/file-deliveries/:deliveryId/download` | Delivery list/download |

## Calendar, reminders, approvals, signatures and chat

| Methods | Path | Notes |
| --- | --- | --- |
| GET, POST | `/calendar/events` | Personal calendar events |
| PATCH, DELETE | `/calendar/events/:eventId` | Update/delete personal event |
| GET, POST | `/workspaces/:workspaceId/calendar/events` | Workspace calendar events |
| PATCH, DELETE | `/workspaces/:workspaceId/calendar/events/:eventId` | Update/delete workspace event |
| GET, POST | `/workspaces/:workspaceId/reminders` | List/create reminders |
| PATCH | `/workspaces/:workspaceId/reminders/:reminderId` | Update reminder |
| POST | `/workspaces/:workspaceId/reminders/:reminderId/complete`, `/cancel` | Complete/cancel reminder |
| GET, POST | `/workspaces/:workspaceId/approvals/templates` | List/create templates |
| PATCH | `/workspaces/:workspaceId/approvals/templates/:templateId` | Update template |
| GET, POST | `/workspaces/:workspaceId/approvals` | List/create requests |
| GET | `/workspaces/:workspaceId/approvals/:requestId` | Request details/history |
| POST | `/workspaces/:workspaceId/approvals/:requestId/decision`, `/comments`, `/resubmit`, `/cancel` | Consequential approval actions; server-authoritative |
| GET | `/workspaces/:workspaceId/signatures/sources`, `/members`, `/` | Sources, eligible signers, requests |
| POST | `/workspaces/:workspaceId/signatures` | Create signature request |
| GET | `/workspaces/:workspaceId/signatures/:requestId`, `/document`, `/final` | Request and protected document downloads |
| POST | `/workspaces/:workspaceId/signatures/:requestId/sign`, `/decline`, `/cancel` | Consequential signature actions; server-authoritative |
| GET | `/workspaces/:workspaceId/chat/members`, `/files`, `/conversations` | Chat selection/listing |
| POST | `/workspaces/:workspaceId/chat/direct` | Create/open direct conversation |
| GET | `/workspaces/:workspaceId/chat/conversations/:conversationId/messages` | Cursor-paginated history |
| POST | `/workspaces/:workspaceId/chat/conversations/:conversationId/messages` | Send message |

## Events, personal documents, notes, notifications and supporting modules

| Methods | Path | Access / use |
| --- | --- | --- |
| POST, GET | `/events` | Authenticated event creation/list |
| GET, PATCH, DELETE | `/events/:id` | Event management |
| POST | `/events/:id/rotate-tokens` | Rotate event tokens |
| GET, POST | `/events/capture/:token`, `/events/capture/:token/uploads` | Public capture flow |
| GET, POST | `/events/gallery/:token`, `/events/gallery/:token/unlock` | Public gallery/unlock |
| GET | `/events/gallery/:token/media/:mediaId/download`, `/events/:id/media`, `/events/:id/media/:mediaId/download` | Gallery/media access |
| GET, POST | `/documents` | Personal document list/create |
| GET, PATCH, DELETE | `/documents/:id` | Manage personal document |
| GET | `/documents/:id/responses` | Document responses |
| POST, DELETE | `/documents/:id/share` | Create/revoke document share |
| GET | `/public-documents/:token` | Public document |
| POST | `/public-documents/:token/responses`, `/sign` | Public response/sign action |
| GET, POST | `/notes` | List/create notes |
| GET, PATCH, DELETE | `/notes/:id` | Manage note |
| GET | `/notifications` | Personal notifications (maximum 100) |
| POST | `/notifications/:notificationId/read` | Mark one notification read |
| GET | `/announcements` | User announcement list |
| POST | `/announcements/:id/read` | Mark one announcement read |
| GET | `/insights/weekly` | Weekly insights |
| GET | `/referrals/me`, `/referrals/promotion` | Referral status/promotion |
| POST, GET | `/support/tickets` | Create/list tickets |
| GET | `/support/tickets/:id` | Ticket details |
| POST | `/support/tickets/:id/messages` | Add ticket message |
| GET | `/plans` | Public plan catalogue |
| POST | `/billing/checkout` | Authenticated provider checkout |
| GET | `/billing/payments`, `/billing/payments/:checkoutId` | Payment history/status |
| POST | `/billing/webhook` | Public provider webhook; provider verification applies |
| GET | `/health`, `/health/ready` | Service health/readiness |

## Platform administration (privileged; generally not part of customer mobile app)

All routes below are under `/admin` and require platform-admin session plus
specific server-side permission. They are listed for completeness; do not expose
admin functions in customer navigation.

- GET: `/me`, `/overview`, `/storage-inventory`, `/upload-monitoring`,
  `/system-health`, `/analytics`, `/plans`, `/referral-program`,
  `/subscriptions`, `/payments`, `/platform-admins/permissions`,
  `/platform-admins`, `/announcements`, `/announcements/recipients`,
  `/email-composer/recipients`, `/email-composer/campaigns/:id`, `/users`,
  `/users/:id`, `/businesses` (alias `/workspaces`),
  `/businesses/:id` (alias `/workspaces/:id`), `/events`,
  `/support-tickets`, `/support-agents`, `/support-tickets/:id`,
  `/audit-logs`.
- PATCH: `/plans/:plan`, `/referral-program`, `/platform-admins/:userId`,
  `/announcements/:id/archive`, `/announcements/:id/restore`,
  `/users/:id/status`, `/support-tickets/:id`.
- POST: `/payments/:checkoutId/verify`, `/announcements`,
  `/email-composer/campaigns/:id/resend`, `/email/send` (alias
  `/email-composer/send`), `/announcements/:id/retry-email`,
  `/users/:id/password-reset`, `/users/:id/verification-email`,
  `/support-tickets/:id/messages`.
- DELETE: `/users/:userId/sessions/:sessionId`.

## Client integration caveats

- Cookie-only auth is the current supported contract; see
  [ARCHITECTURE.md](./ARCHITECTURE.md#3-authentication-and-session-integration).
- List payloads are not uniformly paginated. Do not invent cursor or page
  parameters unless a controller supports them.
- File bytes use authenticated multipart and streaming routes; no resumable
  upload endpoint exists.
- REST chat must poll for updates; no realtime transport is present.
- Native push registration, read-all notification action, server-side app
  deep-link association and a mobile offline-sync endpoint are absent. Mobile
  uses the existing notification and announcement read actions, REST chat with
  polling, and app-scheme deep links; no remote push token is registered.
- Validate all DTO payloads against the matching `apps/api/src` DTO/service and
  verify server permissions before wiring consequential UI actions.
