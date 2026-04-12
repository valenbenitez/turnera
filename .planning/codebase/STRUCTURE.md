# Codebase Structure

**Analysis Date:** 2026-04-12

## Directory Layout

```
turnera/
├── public/                 # Static assets served as-is by Next.js
├── src/
│   ├── app/                # App Router: layouts, pages, API routes, global CSS
│   │   ├── api/            # Route Handlers (REST), mirrors URL structure
│   │   ├── (auth)/         # Route group: login/register (URLs: /login, /register)
│   │   ├── (dashboard)/    # Route group: authenticated panel (/dashboard/...)
│   │   ├── (marketing)/    # Route group: landing (/)
│   │   ├── (public-booking)/ # Route group: public booking (/book/...)
│   │   ├── join/           # Invite join flow (/join/[token]) — outside groups
│   │   ├── globals.css
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React UI by feature + shared primitives
│   ├── contexts/           # React context providers (auth)
│   └── lib/                # Shared logic: firebase, server, validation, booking, email
├── firestore.rules         # Firestore security rules (deployed via firebase.json)
├── firestore.indexes.json  # Composite indexes (firebase.json reference)
├── firebase.json           # Firebase CLI project config (Firestore only in repo)
├── next.config.ts          # Next.js config
├── package.json
├── tsconfig.json           # Path alias @/* → src/*
└── eslint.config.mjs       # ESLint flat config
```

## Directory Purposes

**`src/app/`:**
- Purpose: All routable UI and HTTP handlers for the Next.js app.
- Contains: Nested layouts, `page.tsx`, `route.ts` under `api/`, route groups with parentheses.
- Key files: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/(dashboard)/layout.tsx`, `src/app/api/commerces/route.ts`

**`src/app/api/`:**
- Purpose: Backend endpoints consumed by the browser (and potentially external clients).
- Contains: REST-style folders matching URL paths; dynamic segments `[commerceId]`, `[slug]`, `[token]`.
- Key files: `src/app/api/commerces/[commerceId]/appointments/route.ts`, `src/app/api/public/commerce/[slug]/route.ts`, `src/app/api/invites/[token]/redeem/route.ts`

**`src/components/`:**
- Purpose: Presentation and feature-specific composition.
- Contains: `ui/` (buttons, inputs, cards — design-system style), `auth/`, `booking/`, `dashboard/`, `join/`.
- Key files: `src/components/auth/require-auth.tsx`, `src/components/dashboard/commerce-access-gate.tsx`, `src/components/dashboard/dashboard-chrome.tsx`

**`src/contexts/`:**
- Purpose: Cross-cutting React state not tied to a single page.
- Contains: `auth-context.tsx` (`AuthProvider`, `useAuth`).

**`src/lib/firebase/`:**
- Purpose: Firebase client config and Admin initialization; client Firestore service functions.
- Contains: `config.ts`, `auth-client.ts`, `admin.ts`, `services.ts`, `user-profile.ts`, `load-service-account.ts`.
- Key files: `src/lib/firebase/admin.ts`, `src/lib/firebase/services.ts`

**`src/lib/server/`:**
- Purpose: **Node-only** helpers for Route Handlers (authz, Firestore via Admin, invite URLs, agenda math).
- Contains: `firebase-bearer-auth.ts`, `verify-bearer.ts`, `commerce-access.ts`, `agenda-access.ts`, `catalog-auth.ts`, `public-booking-data.ts`, `agenda-day.ts`, etc.

**`src/lib/validation/`:**
- Purpose: Pure validation and parsing shared by API and tests.
- Contains: `*.ts` plus co-located `*.test.ts` (Vitest).

**`src/lib/booking/`:**
- Purpose: Slot/interval logic usable from server or tests (`slots.ts`, `intervals.ts`).

**`src/lib/email/`:**
- Purpose: Resend integration and booking notification helpers (`resend.ts`, `booking-notifications.ts`).

**`public/`:**
- Purpose: Static files (favicons, images); referenced from UI with absolute paths `/...`.

**`.planning/codebase/`:**
- Purpose: GSD / planning artifacts (this document and sibling audits); not application runtime code.

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout for every page.
- `src/app/(marketing)/page.tsx`: Home `/`.
- `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`: Auth entry.
- `src/app/(dashboard)/dashboard/page.tsx`: Post-login hub.
- `src/app/(public-booking)/book/[commerceSlug]/page.tsx`: Public booking entry by commerce slug.

**Configuration:**
- `next.config.ts`: Next.js.
- `tsconfig.json`: TypeScript + `@/*` alias.
- `eslint.config.mjs`: Lint rules (extends Next).
- `firebase.json` + `firestore.rules` + `firestore.indexes.json`: Firebase/Firestore deployment metadata.

**Core Logic:**
- `src/lib/types.ts`: Domain TypeScript interfaces.
- `src/lib/commerce-member-id.ts`: Deterministic Firestore doc id for membership.
- `src/lib/commerce-defaults.ts`: Defaults when creating a commerce.
- `src/lib/server/public-booking-data.ts`: Server-side reads shaping public API responses.

**Testing:**
- Co-located `*.test.ts` next to modules under `src/lib/` (e.g. `src/lib/validation/catalog.test.ts`).
- Runner configured via Vitest in `package.json` (no separate `vitest.config.*` at repo root in current tree — defaults apply).

## Naming Conventions

**Files:**
- **kebab-case** for React modules and utilities: `commerce-access-gate.tsx`, `firebase-bearer-auth.ts`, `agenda-page-client.tsx`.
- **route.ts** for App Router API handlers (Next.js convention).
- **layout.tsx** / **page.tsx** for layouts and pages (Next.js convention).

**Directories:**
- **Route groups:** parentheses `(dashboard)`, `(auth)` — organize without URL segment.
- **Dynamic segments:** bracket folders `[commerceId]`, `[slug]`, `[token]`, `[staffSlug]`.
- **Feature folders** under `components/` and `lib/`: lowercase single words or hyphenated where multi-word (`public-booking` under `validation/`).

**Code identifiers:**
- **React components:** PascalCase (`RequireAuth`, `DashboardChrome`).
- **Functions:** camelCase (`requireBearerUid`, `getCommerceMembership`).
- **Types/interfaces:** PascalCase in `src/lib/types.ts` (`CommerceMember`, `WorkingHours`).

## Where to Add New Code

**New Feature (dashboard commerce capability):**
- Primary UI: `src/components/dashboard/` (client wrapper `*-client.tsx` if hooks needed).
- Page wiring: `src/app/(dashboard)/dashboard/[commerceId]/<segment>/page.tsx`.
- API: `src/app/api/commerces/[commerceId]/.../route.ts` with `runtime = "nodejs"` if using Admin.
- Server helpers: `src/lib/server/<topic>.ts`; reuse `parseBearerUid` / role guards from `src/lib/server/catalog-auth.ts` or `agenda-access.ts` as patterns.

**New Component/Module:**
- Implementation: `src/components/<feature>/` for UI; `src/lib/` for shared non-UI logic.
- Import path: use alias `@/...` (defined in `tsconfig.json`).

**New Public (unauthenticated) API:**
- Handlers: `src/app/api/public/.../route.ts`.
- Data access: extend `src/lib/server/public-booking-data.ts` or add `src/lib/server/<name>.ts` called only from public routes; avoid exposing Admin helpers to client bundles.

**Utilities:**
- Shared helpers: `src/lib/utils.ts` (e.g. `cn` for class names).
- Firebase-specific: `src/lib/firebase/` (client) vs `src/lib/server/` (Admin, request-scoped).

**Types:**
- Add or extend interfaces in `src/lib/types.ts` when modeling Firestore documents or API DTOs shared across layers.

## Special Directories

**`src/app/(auth)`, `(dashboard)`, `(marketing)`, `(public-booking)`:**
- Purpose: Logical grouping of layouts and pages; parentheses omit segment from URL.
- Generated: No.
- Committed: Yes.

**`node_modules/`, `.next/`:**
- Purpose: Dependencies and build output.
- Generated: Yes.
- Committed: No (standard gitignore).

---

*Structure analysis: 2026-04-12*
