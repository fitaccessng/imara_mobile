# IMARA Mobile

This directory is the separate React Native / Expo application workspace. It is
being developed as an extension of the existing IMARA web and API applications;
it must not replace either application or introduce a second production data
store.

## Development status

**Phase 0 — repository, infrastructure, route, and feature audit: documented in
[PAGE_PARITY_CHECKLIST.md](./PAGE_PARITY_CHECKLIST.md).**

**Phase 1 — mobile foundation and authentication: implemented; native cookie
validation still pending.**

**Phase 2 — personal workspace: screen shells exist; API-backed files, folders,
calendar, and real dashboard data remain incomplete.**

**Phase 3 — business workspace: screen shells exist; workspace selection,
storage, team administration, and activity still need end-to-end integration.**

**Phase 4 — productivity: signature, approval, and reminder screen shells exist;
their consequential workflows are not yet integrated.**

**Phase 5 — communications: live personal notifications, announcements, and
workspace REST chat are integrated. Chat refreshes by polling because the API
does not provide realtime transport.**

**Phase 6 — native/offline foundation: device notification permission and local
biometric checks, document capture, and a SQLite-backed local scan queue are
implemented. Native device validation remains pending.**

**Feature parity: incomplete.** The current screens do not yet provide full
website parity. Use [PAGE_PARITY_CHECKLIST.md](./PAGE_PARITY_CHECKLIST.md) as the
source of truth; sample-data screens are explicitly marked Shell only.

- [System architecture report](./ARCHITECTURE.md)
- [Implemented API inventory](./API_INVENTORY.md)
- [Web-to-mobile page parity checklist](./PAGE_PARITY_CHECKLIST.md)

The standalone Expo application now has Expo Router navigation, a typed API
client, TanStack Query, Zustand session state, and native sign-in, registration,
email verification, and password recovery screens. Registration preserves the
existing personal/business account choices and optional workspace/referral
fields. Authentication calls the existing `/api/v1` routes; no backend,
production database, web-app, or production configuration changes were made.

The existing backend issues an HttpOnly session cookie, not an access token.
The app captures that cookie through a native cookie manager and keeps the
opaque session value in OS-protected Expo SecureStore. Authenticated requests
send it only as a `Cookie` header to the environment-configured API origin.
Native cookie behavior must still be verified in development builds on iOS and
Android before Phase 1 can be considered complete.

The communications screens use the existing `/notifications`,
`/announcements`, and workspace chat REST endpoints. The offline scanner can
queue document captures in the app-private document directory and SQLite, then
upload them through the existing scan endpoint when online. Server permissions
remain authoritative for upload. Device notification permission does not imply
remote push support: the backend has no device-token registration endpoint.
Offline document downloads, background uploads, and automatic sync are not
implemented by the current API contract.

## Running the mobile app

1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the existing
   IMARA API base URL (including `/api/v1`). If the backend uses a non-default
   session cookie name, also set `EXPO_PUBLIC_SESSION_COOKIE_NAME`.
2. Run `cd mobile && npm install`.
3. Build a native development client with `npx expo run:ios` or
   `npx expo run:android`. Expo Go is not supported because the native cookie
   manager is not bundled with it.
4. Start Metro with `npm start`.

The API URL is runtime configuration, not a credential. Never put secrets in
`EXPO_PUBLIC_*` variables. EAS project linking/builds require an authorized
Expo account and are not configured yet.

## Current validation baseline

- `npm test --prefix mobile` — 16 auth/session and communications API tests pass.
- `npm run typecheck --prefix mobile` — passes.
- `npx expo install --check` — dependencies match SDK 58.
- `EXPO_PUBLIC_API_URL=... npm run export --prefix mobile` — iOS and Android
  JavaScript bundles pass. These are not signed native app builds.
- `npm run build --workspace @imara/web` — existing website build passes.

No Android device/emulator is attached, no iOS device/simulator validation was
performed, and no real account credentials were used. Therefore login cookie
capture, app-restart persistence, and logout/revocation remain unverified on
native platforms. Expo EAS project linking and signed builds are also pending.

`npm audit --omit=dev` reports three moderate findings in Expo's transitive
`@expo/fingerprint`/`minimatch` build tooling. npm's proposed fix downgrades the
app from Expo SDK 58 to SDK 52, so that incompatible downgrade was not applied.

## Phases

1. Mobile foundation and authentication
2. Personal workspace
3. Business workspace
4. Signatures, approvals and reminders
5. Chat and notifications
6. Native functionality and offline support
7. Testing, security and production deployment

Each phase must include its changed files, backend changes (if any), test/build
results, unresolved limitations, and a check that the existing website still
builds. Do not describe a screen as complete until its real API operation and
permission behavior have been verified.

## Guardrails

- Keep the existing web app in `apps/web` and API in `apps/api`.
- The existing API/database/storage remain authoritative.
- Do not add a mobile-only production database or duplicate accounts.
- Do not change production configuration or weaken authentication/permissions.
- All API base URLs and secrets are environment supplied; never embed secrets.
- Expo/EAS native builds and physical Android/iOS device testing are required
  before calling platform features production ready.
- Do not modify `apps/web`; it is outside the mobile change scope.
