# Technology Stack

**Analysis Date:** 2026-04-12

## Languages

**Primary:**
- TypeScript (strict) — aplicación en `src/**/*.ts`, `src/**/*.tsx`; compilación vía `typescript` y plugin Next en `tsconfig.json`

**Secondary:**
- CSS — estilos globales y tokens en `src/app/globals.css` (Tailwind v4 + shadcn)

## Runtime

**Environment:**
- Node.js **>= 20.9.0** — requerido por `next@16.2.2` (declarado en `package-lock.json` bajo `node_modules/next`)

**Package Manager:**
- npm — lockfile presente: `package-lock.json`
- No hay `pnpm-lock.yaml` ni `yarn.lock` en el repo

## Frameworks

**Core:**
- Next.js `16.2.2` — App Router, scripts `dev` / `build` / `start` en `package.json`; entrada de app en `src/app/`
- React `19.2.4` / `react-dom` `19.2.4` — UI y RSC (shadcn con `"rsc": true` en `components.json`)

**Testing:**
- Vitest `^4.1.3` — configuración en `vitest.config.ts` (`environment: "node"`, `include: ["src/**/*.test.ts"]`, alias `@` → `./src`)

**Build/Dev:**
- ESLint `^9` con `eslint-config-next` `16.2.2` — `eslint.config.mjs` (core-web-vitals + typescript)
- Tailwind CSS `^4` + `@tailwindcss/postcss` — `postcss.config.mjs`, imports en `src/app/globals.css`
- Next config mínima: `next.config.ts`

## Key Dependencies

**Critical:**
- `firebase` `^12.11.0` — cliente (Auth + Firestore) en `src/lib/firebase/config.ts`, `src/lib/firebase/auth-client.ts`, `src/lib/firebase/services.ts`
- `firebase-admin` `^13.7.0` — servidor: Firestore + verificación de ID tokens en route handlers y `src/lib/firebase/admin.ts`, `src/lib/server/firebase-bearer-auth.ts`
- `next` / `react` / `react-dom` — stack principal de la app

**UI & presentación:**
- `@base-ui/react` `^1.3.0` — primitivos de UI
- `shadcn` (CLI `^4.2.0`) + esquema en `components.json` (estilo `base-nova`, alias `@/components`, etc.)
- `lucide-react` — iconos
- `class-variance-authority`, `clsx`, `tailwind-merge` — variantes y clases
- `tw-animate-css` — animaciones referenciadas en `src/app/globals.css`

**Dominio / utilidades:**
- `luxon` `^3.7.2` — fechas/horas (tipos en `@types/luxon`)

**Correo (servidor):**
- `resend` `^6.10.0` — cliente en `src/lib/email/resend.ts`, uso desde `src/lib/email/booking-notifications.ts`

## Configuration

**Environment:**
- Plantilla documentada en `.env.example` (no leer `.env` en commits): Firebase público (`NEXT_PUBLIC_FIREBASE_*`), Admin (`FIREBASE_SERVICE_ACCOUNT_PATH` o `FIREBASE_SERVICE_ACCOUNT_KEY`), Resend (`RESEND_API_KEY`, `RESEND_FROM`), opcional `NEXT_PUBLIC_APP_URL`
- Carga de service account: `src/lib/firebase/load-service-account.ts`

**Build:**
- `tsconfig.json` — `paths`: `@/*` → `./src/*`, `jsx: react-jsx`, `strict: true`
- `next.config.ts` — export default sin opciones extra
- Firebase proyecto: `firebase.json` (Firestore rules + índices), `firestore.rules`, `firestore.indexes.json`

**Path aliases:**
- `@/*` → `src/*` (`tsconfig.json` y `vitest.config.ts`)

## Platform Requirements

**Development:**
- Node >= 20.9.0, npm
- Variables según `.env.example` para Firebase client, Admin y (opcional) Resend

**Production:**
- Despliegue típico: host Node compatible con Next.js 16 (p. ej. Vercel u otro con runtime Node 20+); sin `engines` propios en `package.json` del proyecto

---

*Stack analysis: 2026-04-12*
