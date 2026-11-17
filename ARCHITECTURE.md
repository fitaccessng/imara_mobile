# IMARA Mobile — System Architecture Report

**Audit date:** 2026-11-17
**Scope:** Existing repository at its current `main` revision. This is a
read-only audit; it made no web, API, database, or deployment changes.

## 1. Repository and application boundaries

The repository is one npm workspace containing:

| Area | Current implementation | Authority |
| --- | --- | --- |
| `apps/web` | React 18, TypeScript, Vite 5 single-page application | Existing browser UX |
| `apps/api` | NestJS 12, TypeScript, Prisma 7, PostgreSQL | Authentication, business rules, API and persisted data |
| `mobile` | Standalone Expo Router / React Native / TypeScript app | New native client; depends on the existing API |

The root `package.json` currently declares only `apps/web` and `apps/api` as
workspaces. `mobile/` has its own package manifest and lockfile, so native
dependencies do not affect the existing web/API workspace. The website is
bootstrapped with React Router and TanStack Query.
Its protected routes are in `apps/web/src/App.tsx`; its API client is
`apps/web/src/lib/api.ts`. The API modules are registered in
`apps/api/src/app.module.ts`, with a global `/api/v1` prefix and controller /
service / DTO boundaries.

Declared web versions are React `^18.3.1`, Vite `^5.4.11`, React Router
`^6.28.1`, TanStack Query `^5.62.7`, TypeScript `~5.6.2`. The API declares
NestJS `^12.3.3`, Prisma and Prisma Client `^7.10.1`, and Node.js
`^22.22.3 || ^24.15.0 || >=26.0.0`. See the app package manifests for exact
dependencies.

## 2. Backend architecture and data

- NestJS modules cover authentication/profile, subscriptions/billing, personal
  storage, file sharing/requests, workspaces, workspace storage/calendar/chat,
  approvals, signatures, reminders, notifications, announcements, events,
  documents, notes, referrals, insights, support and platform administration.
- PostgreSQL is the persisted source of truth via Prisma. Core user records
  relate to server sessions, one subscription, personal folders/files,
  workspaces/memberships, notifications, events and workflow data.
- Folders are hierarchical and can be personal or workspace-owned.
  `StoredFile` may relate to a folder, workspace, event, file request,
  approval/signature, chat/delivery, and public share.
- Workspace membership and folder permission rules are enforced server-side.
  Owner/admin roles bypass folder rules; manager/staff access is evaluated
  against grant/restrict rules, including inheritance. Client-side checks are
  only for UX and must never be treated as authorization.
- Validation uses Nest global DTO validation; unknown properties are rejected.
  Helmet, an exact-origin credentialed CORS allowlist, and a global
  100-requests/minute throttler are configured.
- Reminder delivery workers poll persisted records on timers. There is no
  implemented Expo device-token registration or push-notification endpoint.
  Workspace chat is REST-only; there is no WebSocket/SSE endpoint.

Primary source: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`,
`apps/api/prisma/schema.prisma`.

## 3. Authentication and session integration

The production system has one account system and server-side revocable
sessions. Passwords are verified by the backend; the session table stores a
hash of a random opaque session token. Login and email-code verification set
that token only as an `HttpOnly` cookie. The response JSON contains user and
workspace information, not a bearer token. `SessionGuard` currently reads only
the configured cookie; it does not accept `Authorization: Bearer`.

Relevant source: `apps/api/src/auth/auth.controller.ts`,
`apps/api/src/auth/session.guard.ts`, `apps/api/src/auth/session-config.ts`,
`apps/api/src/auth/auth.service.ts`. The web API client sends
`credentials: "include"`; the app's auth provider checks `/auth/me`.

### Native-client consequence

Mobile uses the existing login, registration, verification and reset contracts
and preserves server-side expiry/revocation. Login and email-code verification
accept the API's native `Set-Cookie` response; the native cookie manager exposes
the cookie to the app, which stores only its opaque value in Expo SecureStore
with device-only Keychain accessibility on iOS. Authenticated calls attach that
value only as the `Cookie` header to the configured API origin. The token is not
an Authorization bearer token and is not placed in SQLite, AsyncStorage, logs,
or query-cache persistence. Public auth calls do not receive a saved session
cookie.

The cookie library requires React Native's New Architecture and an Expo
development/production build; Expo Go cannot load it. The app deliberately
keeps server expiry and revocation authoritative: startup calls `/auth/me`, a
401 clears local session state, and offline startup reports an error without
deleting the saved session. Native behavior still needs verification on both
platforms for cookie extraction after login/verification, secure storage
across process restarts, protected API requests, logout, and server revocation.
Biometrics may locally gate access to the already-established session, but
cannot replace server authentication or extend server expiry.

The API has no access-token or refresh-token flow. Do not silently add one or
return raw session credentials in API JSON: that changes the authentication
contract and threat surface and requires separate security review/approval if a
reliable native cookie solution proves infeasible. A documentation-only
`/auth/refresh` route is not implemented.

Registration verification should use the six-digit
`POST /auth/verify-email-code` flow; it creates the session cookie on success.
Password recovery should use `POST /auth/reset-password-code` (email, OTP and
new password). The API documentation and source disagree on resend
verification's auth requirement; controller behavior is authoritative.

## 4. File storage and offline boundaries

- Personal and workspace upload endpoints accept one `multipart/form-data`
  file per request, field name `file`, with optional folder identifiers.
  Uploads are not resumable/chunked and do not use presigned object URLs.
- Downloads stream through authenticated API endpoints. HivePod storage is
  private behind the API and an authenticated storage service; object-store
  credentials must never be shipped in the app.
- The API applies per-plan file caps (currently 100/250/500 MiB for
  Free/Pro/Business) and quota reservations. The app should surface API errors
  and avoid locally calculating authority for quota or file access.
- The website has a service worker for shell caching and IndexedDB-based
  offline-file access; it does not cache `/api/` responses. That web mechanism
  is not a native offline sync contract.
- Mobile can use SQLite for non-sensitive cached metadata and sync bookkeeping.
  Downloaded file bytes need a protected application sandbox. Before opening
  cached content, revalidate current server authorization when online. Offline
  content must not be made newly accessible based solely on a stale permission
  snapshot; document the explicit offline-access policy during Phase 6.
- Background uploads, network-resume semantics, copy semantics and file
  versioning are not provided as server contracts today.

## 5. Existing feature coverage and constraints

The backend has implemented routes for personal files/folders, public shares
and file requests; workspace membership and folder permissions; shared files
and deliveries; personal/workspace calendars; approvals; signatures; reminders;
REST chat; in-app notifications and announcements; subscription catalogue and
Bachs checkout/payment status; events/galleries; notes; personal documents;
support; and platform administration. Exact implemented paths and methods are
in [API_INVENTORY.md](./API_INVENTORY.md).

Important limitations found:

1. No bearer-token authentication, auth refresh endpoint, device push
   registration, native deep-link association, server-side chat push/realtime
   API, resumable upload endpoint, or mobile-specific offline sync API.
2. Most list endpoints are unpaginated. Chat has cursor pagination; some admin
   and other query endpoints have pagination.
3. Notifications expose list and mark-one-read, not read-all/delete.
4. Workspace chat is request/response REST, not realtime.
5. Scanning has an upload route, but device capture and document processing
   support must be verified separately; do not infer server OCR from a UI.
6. Some browser workflows rely on web-only UI, cookies or external browser
   navigation. Their server contracts are reusable, but native UX needs
   implementation and platform testing.
7. Older root/API status and integration documents say several now-present
   modules are not implemented. Some endpoint documentation also lists routes
   absent from current controllers. Source controllers/services and database
   schema are the authority; docs should be reconciled in a separate,
   non-destructive documentation update when convenient.
8. The `reset-password` token route has a likely contract mismatch; the OTP
   reset route is the supported mobile-compatible flow.

## 6. Environment, deployment and provider dependencies

- API prefix: `/api/v1`; local web Vite proxy targets `127.0.0.1:3001`.
- Production website is hosted separately from the API. API base URLs must be
  selected by app build environment, not hardcoded in application logic.
- Backend runtime configuration includes PostgreSQL `DATABASE_URL`, exact
  browser `CORS_ORIGINS`, secure cookie settings, SMTP, object-storage driver
  and HivePod storage URL/token or S3 credentials, plus optional Bachs
  configuration. Secret values remain server-side.
- API production startup runs `prisma migrate deploy` before the server. Mobile
  must not connect directly to PostgreSQL, HivePod object storage, SMTP or
  payment provider credentials.
- Mobile release deployment is a separate EAS / Apple / Google process; no
  existing EAS project, Expo app, app identifiers, signing credentials or store
  release configuration was found during this audit.

References: root `README.md`; `apps/api/README.md`; `apps/api/package.json`;
`apps/api/.env.example`; `apps/web/.env.example`; `apps/web/vite.config.ts`.

## 7. Mobile implementation decisions for Phase 1

- Scaffold a distinct Expo Router + TypeScript app under this `mobile/`
  directory; do not move or rewrite `apps/web`.
- Pin Expo-compatible stable package versions together as a tested set.
  Required project technologies from the product brief: Expo Router, TanStack
  Query, Zustand, SecureStore, FileSystem, SQLite, Notifications, Local
  Authentication, Camera and EAS Build. Phase 1 pins Expo SDK `58.0.26`, React
  Native `0.88.1`, React `19.3.0`, Expo Router `58.0.32`, and compatible native
  module versions in `mobile/package.json`. Later phases should add their native
  packages only when implementing those capabilities.
  - The Phase 1 API client handles `/api/v1` JSON requests, session cookies, 204
    responses and sanitized API errors. Add multipart and file-transfer support
    with the file-management phase.
  uploads, streamed downloads, 204 responses, API errors and session expiry.
- First prove cookie persistence and server revocation on physical/simulator
  iOS and Android without changing the backend auth contract. If that cannot
  meet security/reliability requirements, stop before altering auth and present
  the required backend auth proposal for approval.
- Use server responses for permissions, plans and workflow transitions.
  Consequential approvals/signatures must be confirmed by the API.
- Add features in the staged order in `README.md`; validate each phase with
  targeted automated tests and platform builds, and re-run the existing web
  production build after any shared-backend changes.
