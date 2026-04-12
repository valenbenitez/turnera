# Architecture

**Analysis Date:** 2026-04-12

## Pattern Overview

**Overall:** Next.js App Router full-stack app with Firebase (Auth + Firestore). UI is mostly client components that call REST Route Handlers; those handlers use the Firebase Admin SDK to read and write data that client security rules forbid or that must be trusted-server-only.

**Key Characteristics:**
- File-system routing under `src/app/` with **route groups** for marketing, auth, dashboard, and public booking without changing URLs.
- **No Next.js middleware** (`middleware.ts` not present); protection is client-side (`RequireAuth`, `CommerceAccessGate`) plus API-side Bearer verification and role checks.
- **No Server Actions** (`"use server"` not used); mutations and sensitive reads go through `src/app/api/**/route.ts` handlers.
- **Dual Firestore access:** browser SDK in `src/lib/firebase/services.ts` for member-scoped reads aligned with `firestore.rules`; Admin SDK in `src/lib/firebase/admin.ts` for server routes and bypassing rules where needed.

## Layers

**Presentation (App Router pages & layouts):**
- Purpose: Compose UI, segment traffic by area, wire providers.
- Location: `src/app/`
- Contains: `layout.tsx`, `page.tsx`, route segments, API `route.ts` files co-located under `src/app/api/`.
- Depends on: `@/components/*`, `@/contexts/*`, `@/lib/*` (client-safe modules only in Client Components).
- Used by: HTTP requests (browser navigation and `fetch` to same-origin APIs).

**UI components:**
- Purpose: Reusable and feature-specific React UI (dashboard shell, booking flows, auth gates, shadcn-style primitives).
- Location: `src/components/` (`ui/`, `auth/`, `booking/`, `dashboard/`, `join/`)
- Contains: Client Components (`"use client"`) for interactive surfaces; server-capable pieces only where not marked client (e.g. marketing page default server component).
- Depends on: `@/lib/utils`, `@/lib/firebase/auth-client`, `@/lib/firebase/services`, `@/contexts/auth-context`, navigation hooks.
- Used by: App layouts and pages.

**Client state & session (browser):**
- Purpose: Firebase Auth session observation and profile bootstrap.
- Location: `src/contexts/auth-context.tsx`, `src/lib/firebase/auth-client.ts`, `src/lib/firebase/user-profile.ts`
- Contains: `AuthProvider`, `useAuth`, `onAuthStateChanged`, `ensureUserProfile`.
- Depends on: Firebase client Auth/Firestore as configured in `src/lib/firebase/config.ts`.
- Used by: `(dashboard)` layout tree and any descendant that needs `user`/`loading`.

**API / application services (server, Node runtime):**
- Purpose: Authorize requests, enforce commerce membership and roles, perform Firestore writes and cross-collection operations, send email.
- Location: `src/app/api/**/route.ts`, `src/lib/server/*`, `src/lib/email/*`, `src/lib/booking/*` (pure logic usable from server), `src/lib/validation/*`
- Contains: Bearer JWT verification (`requireBearerUid`, `parseBearerUid`), role gates (`requireCatalogManager`, `requireAgendaAccess`), public booking data helpers (`public-booking-data.ts`), agenda date math (`agenda-day.ts`), Resend notifications (`booking-notifications.ts`).
- Depends on: `firebase-admin` via `getAdminApp()` / `getAdminDb()`, `next/server` (`NextRequest`, `NextResponse`).
- Used by: Dashboard and booking clients via `fetch` with `Authorization: Bearer <idToken>`; public endpoints without auth where implemented.

**Domain types & shared helpers:**
- Purpose: TypeScript models for Firestore documents and small shared utilities (slug rules, commerce defaults, member doc IDs).
- Location: `src/lib/types.ts`, `src/lib/commerce-defaults.ts`, `src/lib/commerce-member-id.ts`, `src/lib/utils.ts`, `src/lib/whatsapp-contact.ts`, `src/lib/safe-auth-redirect.ts`
- Contains: Interfaces such as `Commerce`, `Service`, `Staff`, `Appointment`; role union `CommerceMemberRole`.
- Depends on: Minimal; types are imported widely.
- Used by: Client services, server modules, and components.

**Infrastructure & security rules:**
- Purpose: Deployed Firestore rules; Firebase project wiring.
- Location: `firestore.rules`, `firebase.json`, `firestore.indexes.json` (referenced by `firebase.json`)
- Contains: Client read rules for `users`, `commerce_members`, `commerces`, `services`, `staff`; **deny** client access to `appointments`, `customers`, `booking_tokens`, `commerce_invites`.
- Depends on: Firebase Auth UID for `hasCommerceAccess`.
- Used by: Client SDK reads; server still uses Admin for writes and sensitive reads.

## Data Flow

**Dashboard user session:**

1. User hits `(dashboard)` route group → `src/app/(dashboard)/layout.tsx` wraps children in `AuthProvider` and `RequireAuth`.
2. `AuthProvider` subscribes to Firebase Auth; on sign-in, `ensureUserProfile` runs (`src/lib/firebase/user-profile.ts`).
3. For a commerce-scoped URL, `src/app/(dashboard)/dashboard/[commerceId]/layout.tsx` wraps with `CommerceAccessGate`, which calls `getCommerceMember` from `src/lib/firebase/services.ts` (client Firestore, rules-aligned).
4. Data mutations from the UI: client obtains ID token (`user.getIdToken()` pattern in feature code) and `fetch`es `src/app/api/commerces/...` with Bearer header; handler verifies token and uses Admin Firestore.

**Public booking (unauthenticated end customer):**

1. Public pages under `src/app/(public-booking)/` load commerce/service/staff context via `src/app/api/public/commerce/[slug]/route.ts` and related public routes (`slots`, `appointments`) implemented in `src/app/api/public/...`.
2. Server uses `src/lib/server/public-booking-data.ts` and Admin SDK to assemble safe DTOs without exposing full Firestore to anonymous clients.

**Invite / join flow:**

1. Pages under `src/app/join/[token]/` and APIs under `src/app/api/invites/[token]/` and `redeem` coordinate token redemption server-side (Admin), since invite documents are rules-locked.

**State Management:**
- No global Redux/Zustand: React context for auth only; local `useState`/`useEffect` in feature components; server state via `fetch` responses.

## Key Abstractions

**Firebase Admin singleton:**
- Purpose: One initialized Admin app per Node process, credential loading from env/file via `loadServiceAccountJson`.
- Examples: `src/lib/firebase/admin.ts`, `src/lib/firebase/load-service-account.ts`
- Pattern: Lazy `getAdminApp()` / `getAdminDb()`; throws if public project id and service account project id mismatch (prevents silent token verify failures).

**Bearer authentication pipeline:**
- Purpose: Standardize API auth from `Authorization` header.
- Examples: `src/lib/server/firebase-bearer-auth.ts` (`getBearerToken`, `verifyFirebaseIdToken`, `requireBearerUid`), `src/lib/server/verify-bearer.ts` (`parseBearerUid`)
- Pattern: Strict handlers return `NextResponse` with JSON `{ error }`; softer helpers return `null` uid for composable guards.

**Commerce authorization:**
- Purpose: Map `uid + commerceId` to role and optional `staffId` for providers.
- Examples: `src/lib/server/commerce-access.ts` (`getCommerceMembership`, `getCommerceMemberRole`), `src/lib/server/agenda-access.ts` (`requireAgendaAccess`), `src/lib/server/catalog-auth.ts` (`requireCatalogManager`)
- Pattern: Admin Firestore read of `commerce_members/{uid_commerceId}` document id from `commerceMemberDocId` in `src/lib/commerce-member-id.ts`.

**Public vs authenticated data access:**
- Purpose: Separate read paths for anonymous booking vs signed-in dashboard.
- Examples: `src/lib/server/public-booking-data.ts` (Admin queries for public API), `src/lib/firebase/services.ts` (client queries where rules allow)
- Pattern: Prefer Admin on API routes for anything that must not depend on client rules or that touches denied collections.

## Entry Points

**Next.js application bootstrap:**
- Location: `src/app/layout.tsx`
- Triggers: All document requests for the app.
- Responsibilities: Root HTML shell, fonts (`next/font/google`), global styles import `src/app/globals.css`, default metadata.

**Marketing home:**
- Location: `src/app/(marketing)/page.tsx`
- Triggers: `GET /`
- Responsibilities: Static landing content and links to auth routes.

**Auth pages:**
- Location: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx` (+ form components in same folders)
- Triggers: `/login`, `/register`
- Responsibilities: Email/password or related flows via Firebase client (`login-form.tsx`, `register-form.tsx`).

**Dashboard shell:**
- Location: `src/app/(dashboard)/dashboard/layout.tsx`, `src/app/(dashboard)/dashboard/page.tsx`, nested `[commerceId]/*`
- Triggers: `/dashboard`, `/dashboard/[commerceId]`, subroutes `agenda`, `services`, `staff`
- Responsibilities: `DashboardChrome`, commerce list/home, per-commerce tools; client pages delegate heavy logic to `*-client.tsx` components.

**Public booking UI:**
- Location: `src/app/(public-booking)/book/[commerceSlug]/page.tsx`, `[staffSlug]/page.tsx`, `book/manage/[token]/page.tsx`
- Triggers: Public URLs under `/book/...` and manage token path.
- Responsibilities: Booking UX calling public APIs.

**HTTP API (Route Handlers):**
- Location: `src/app/api/commerces/**`, `src/app/api/public/**`, `src/app/api/invites/**`
- Triggers: Matching `fetch` or external HTTP clients.
- Responsibilities: JSON request/response, `export const runtime = "nodejs"` on handlers that use Admin SDK (see e.g. `src/app/api/commerces/route.ts`).

## Error Handling

**Strategy:** Fail fast with HTTP status codes and Spanish user-facing `error` strings in JSON for APIs; UI shows loading states and redirects for auth (`RequireAuth` → `/login?from=...`).

**Patterns:**
- API: local helpers `jsonError` in handlers or `src/lib/server/catalog-auth.ts`; `NextResponse.json({ error }, { status })`.
- Auth token verification: mapped Firebase error codes to messages in `mapVerifyIdTokenError` inside `src/lib/server/firebase-bearer-auth.ts`.
- Client: `console.error` for non-fatal profile errors in `AuthProvider`; gates return minimal placeholder UI while loading.

## Cross-Cutting Concerns

**Logging:** `console.error` in development paths (e.g. token verify); no structured logging service detected in repo.

**Validation:** Zod-free manual checks in routes plus dedicated modules under `src/lib/validation/` (e.g. `commerce-slug.ts`, `catalog.ts`, `public-booking.ts`, `commerce-settings.ts`); Vitest tests co-located as `*.test.ts`.

**Authentication:** Firebase Auth (client); Firestore security rules for data plane reads; Bearer ID tokens for API plane; role-based authorization in `src/lib/server/*`.

---

*Architecture analysis: 2026-04-12*
