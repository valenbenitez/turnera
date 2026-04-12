# Coding Conventions

**Analysis Date:** 2026-04-12

## Naming Patterns

**Files:**

- Rutas App Router y handlers API: `route.ts` bajo `src/app/api/...` (segmentos dinámicos entre corchetes, p. ej. `[commerceId]`).
- Lógica de dominio y utilidades: `kebab-case.ts` en `src/lib/` (p. ej. `commerce-slug.ts`, `firebase-bearer-auth.ts`, `load-service-account.ts`).
- Componentes React: `kebab-case.tsx` o nombre descriptivo con sufijo (`login-form.tsx`, `agenda-page-client.tsx`) en `src/components/` o co-ubicados con páginas en `src/app/`.
- Tests unitarios: mismo nombre base que el módulo + `.test.ts` (p. ej. `slots.test.ts` junto a `slots.ts`).

**Functions:**

- Funciones exportadas y helpers: `camelCase` (`buildAvailableSlotStartsUtc`, `requireBearerUid`, `jsonError`).
- Prefijos habituales: `assert*` / `isValid*` / `parse*` / `normalize*` para validación y parsing en `src/lib/validation/` y `src/lib/`.

**Variables:**

- `camelCase` para locales y parámetros; nombres cortos aceptables en scopes acotados (`db`, `req`, `uid`).
- Constantes de módulo: `camelCase` o `UPPER_SNAKE` según contexto (p. ej. restauración de `process.env` en tests).

**Types:**

- Tipos y interfaces: `PascalCase` (`VerifyIdTokenResult`, `VariantProps` de CVA).
- Discriminated unions para resultados (`{ ok: true; ... } | { ok: false; ... }`).

## Code Style

**Formatting:**

- No hay Prettier ni Biome en `package.json`; el estilo efectivo viene de ESLint (Next) y del código existente.
- Hay mezcla menor: muchos archivos usan punto y coma al final de sentencias (`src/lib/server/firebase-bearer-auth.ts`, `src/app/api/commerces/route.ts`); algunos componentes UI omiten semicolons (`src/lib/utils.ts`, `src/components/ui/button.tsx`). Al añadir código, priorizar el estilo del archivo que se edita.

**Linting:**

- ESLint 9 con flat config en `eslint.config.mjs`.
- Extiende `eslint-config-next` (core-web-vitals + typescript): reglas de React/Next y TypeScript alineadas con Next.js 16.
- Ignorados explícitos: `.next/`, `out/`, `build/`, `next-env.d.ts`.

## Import Organization

**Order (patrón recurrente en tests y rutas):**

1. Imports de `vitest` o de paquetes externos (`next/server`, `firebase-admin/*`, `react`, etc.).
2. Línea en blanco.
3. Imports con alias `@/...` (`@/lib/...`, `@/components/...`).
4. Línea en blanco.
5. Imports relativos al archivo actual (`./slots`, `./firebase-bearer-auth`).

**Path Aliases:**

- `@/*` → `src/*` definido en `tsconfig.json` y replicado en `vitest.config.ts` (`resolve.alias`).
- `components.json` (shadcn) documenta alias adicionales lógicos: `@/components`, `@/components/ui`, `@/lib`, `@/hooks` (usar `@/` de forma consistente en imports).

## Error Handling

**Patterns:**

- **API Route Handlers:** respuestas JSON con cuerpo `{ error: string }` y código HTTP apropiado; helper local `jsonError(message, status)` en varios archivos (p. ej. `src/app/api/commerces/route.ts`, `src/lib/server/catalog-auth.ts`) o `NextResponse.json` inline.
- **Auth Bearer / Firebase Admin:** funciones que devuelven `string | NextResponse` o uniones explícitas (`VerifyIdTokenResult`) en lugar de lanzar al caller de la ruta; mensajes de error orientados al usuario en español.
- **Errores desconocidos:** `catch (e: unknown)` o `err: unknown` con narrowing manual (`typeof`, `'code' in err`) antes de usar propiedades (p. ej. `src/lib/server/firebase-bearer-auth.ts`, `src/app/(auth)/login/login-form.tsx`).
- **Validación de entrada:** funciones `assert*` que devuelven `string | null` (mensaje) o `{ ok: boolean; ... }` en `src/lib/validation/catalog.ts` y relacionados; rutas comprueban cuerpo con guards `typeof` sobre `unknown` tras `request.json()`.

## Logging

**Framework:** `console` estándar.

**Patterns:**

- Errores sensibles al depurar: `console.error` condicionado a `process.env.NODE_ENV === "development"` en p. ej. `src/lib/server/firebase-bearer-auth.ts` para no ruido en producción.
- No hay librería de logging estructurado centralizada detectada.

## Comments

**When to Comment:**

- Comentarios breves en español o inglés sobre contratos de API y supuestos (p. ej. extracción de Bearer, rol requerido para catálogo).
- JSDoc `/** ... */` en exports públicos cuando aclara el contrato (`@returns` para `uid` vs `NextResponse`).

**JSDoc/TSDoc:**

- Uso puntual en módulos server (`firebase-bearer-auth`, `catalog-auth`); no es obligatorio en cada función.

## Function Design

**Size:** Handlers de ruta pueden ser largos; la lógica reusable debe extraerse a `src/lib/` (booking, validation, server helpers).

**Parameters:** Objetos de opciones para funciones con muchos parámetros (p. ej. argumento único en `buildAvailableSlotStartsUtc` en `src/lib/booking/slots.ts`).

**Return Values:** Preferir tipos explícitos y uniones discriminadas para éxito/error en capa de auth/verificación.

## Module Design

**Exports:** `export function` / `export type` nombrados; no hay patrón dominante de default export salvo páginas/layouts Next y `next.config.ts`.

**Barrel Files:** No se detectan `export * from` agregadores; importar desde rutas de archivo concretas (`@/lib/validation/commerce-slug`).

---

*Convention analysis: 2026-04-12*
