# Testing Patterns

**Analysis Date:** 2026-04-12

## Test Framework

**Runner:**

- Vitest `^4.1.3`
- Config: `vitest.config.ts`

**Assertion Library:**

- API integrada de Vitest: `expect`, matchers estándar (`toBe`, `toEqual`, `toMatch`, `toBeNull`, `toBeGreaterThan`, `objectContaining`, etc.).

**Run Commands:**

```bash
npm run test              # vitest run — suite completa una vez
npm run test:watch        # vitest — modo watch interactivo
```

No hay script `test:coverage` ni configuración de cobertura en `vitest.config.ts`.

## Test File Organization

**Location:**

- Co-ubicados con el código bajo `src/`: el mismo directorio que el módulo probado.
- Ejemplos: `src/lib/booking/slots.test.ts`, `src/lib/server/firebase-bearer-auth.test.ts`, `src/lib/validation/catalog.test.ts`.

**Naming:**

- `*.test.ts` exclusivamente (la config no incluye `*.test.tsx` ni `*.spec.*`).

**Structure:**

```
src/lib/
├── booking/
│   ├── slots.ts
│   └── slots.test.ts
├── server/
│   ├── firebase-bearer-auth.ts
│   ├── firebase-bearer-auth.test.ts
│   └── agenda-day.test.ts
└── validation/
    ├── catalog.ts
    ├── catalog.test.ts
    └── ...
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, expect, it } from "vitest";

import { fnUnderTest } from "./module";

describe("nombre del comportamiento o módulo", () => {
  it("descripción en español del caso", () => {
    expect(fnUnderTest(input)).toBe(expected);
  });
});
```

**Patterns:**

- Agrupar con `describe` por función pública o flujo (`getBearerToken`, `verifyFirebaseIdToken`).
- Títulos de tests en español, alineados con mensajes de producto/UX.
- Para ramas condicionales en uniones, usar `if (!r.ok) { ... expect ... }` tras comprobar el discriminante (`src/lib/server/firebase-bearer-auth.test.ts`).

## Mocking

**Framework:** `vi` de Vitest (`vi.fn`, `vi.mock`, `vi.resetModules`).

**Patterns:**

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken }),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminApp: () => ({}),
}));

describe("verifyFirebaseIdToken", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it("resuelve uid cuando Admin valida el token", async () => {
    verifyIdToken.mockResolvedValue({ uid: "user-1" });
    const r = await verifyFirebaseIdToken("valid.jwt");
    expect(r).toEqual({ ok: true, uid: "user-1" });
  });
});
```

(Fuente: `src/lib/server/firebase-bearer-auth.test.ts`.)

**What to Mock:**

- Módulos externos no deterministas o con efectos secundarios: `firebase-admin/auth`, `@/lib/firebase/admin`.
- Dependencias de red o FS cuando el test valida lógica local.

**What NOT to Mock:**

- En tests puros de validación/fechas (`catalog.test.ts`, `agenda-day.test.ts`, `commerce-slug.test.ts`), no se usan mocks: se ejercita la función directamente.

**Módulos dinámicos y `process.env`:**

- Tras mutar variables de entorno, usar `vi.resetModules()` en `beforeEach` y `import()` dinámico del módulo bajo prueba para obtener una instancia fresca (`src/lib/firebase/load-service-account.test.ts`).
- Restaurar `process.env` en `afterEach` para no contaminar otros tests.

## Fixtures and Factories

**Test Data:**

- Objetos inline en cada `it` o reutilización de helpers de dominio (`createDefaultWorkingHours` desde `@/lib/commerce-defaults` en `slots.test.ts`).
- Archivos temporales: directorio bajo `node_modules/.tmp-sa-test` para JSON de service account en `load-service-account.test.ts` (crear con `mkdirSync`, limpiar con `rmSync` en `afterEach`).

**Location:**

- No hay carpeta global `__fixtures__` o factories compartidas; los datos viven en el propio archivo de test.

## Coverage

**Requirements:** Ningún umbral ni reporte configurado en el repositorio.

**View Coverage:**

- Añadir en el futuro p. ej. `vitest run --coverage` tras instalar proveedor (`@vitest/coverage-v8`) si se desea estandarizar.

## Test Types

**Unit Tests:**

- Alcance: funciones puras de booking, validación, parsing de agenda, auth helper (con mocks de Admin SDK).
- Entorno Node (`environment: "node"` en `vitest.config.ts`), adecuado para lógica server y libs sin DOM.

**Integration Tests:**

- No hay suite dedicada que levante Next.js ni Firestore emulado; `requireBearerUid` se prueba con `NextRequest` de `next/server` y mocks de Firebase (`firebase-bearer-auth.test.ts`).

**E2E Tests:**

- No usado: no hay Playwright, Cypress ni tests bajo `e2e/`.

## Common Patterns

**Async Testing:**

```typescript
it("resuelve uid cuando Admin valida el token", async () => {
  verifyIdToken.mockResolvedValue({ uid: "user-1" });
  const r = await verifyFirebaseIdToken("valid.jwt");
  expect(r).toEqual({ ok: true, uid: "user-1" });
});
```

**Error Testing:**

```typescript
it("falla con mensaje claro si la KEY es solo '{'", async () => {
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY = "{";
  const { loadServiceAccountJson } = await import("./load-service-account");
  expect(() => loadServiceAccountJson()).toThrow(/una sola línea|SERVICE_ACCOUNT_PATH/i);
});
```

**HTTP response testing:**

- Instanciar `new NextRequest(url, { method, headers })`, await del handler o helper, asertar `status` y `json()` del `Response` (`firebase-bearer-auth.test.ts`).

---

*Testing analysis: 2026-04-12*
