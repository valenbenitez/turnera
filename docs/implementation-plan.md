# Plan de implementación — Turnera

Sistema de turnos/citas para comercios: **landing**, **dashboard autenticado** (Firebase Auth) y **reserva pública sin login**. Stack: **Next.js (App Router)**, **Firebase (Firestore + Auth)**, **shadcn/ui**, **Tailwind**, enfoque **mobile first**. Componentes React siguiendo la skill **vercel-react-best-practices**.

---

## 1. Decisiones de producto (cerradas)

| Tema | Decisión |
|------|----------|
| Multi-comercio | Un usuario **owner** puede administrar varios comercios. |
| Roles (inglés) | `owner`, `reception`, `provider`. |
| Reserva pública | Sin cuenta: **nombre**, **teléfono**, **email**. |
| Servicios | Los define el comercio (**duración** a nivel servicio). Cada **provider** tiene `serviceIds` asignados. |
| Concurrencia | Un cliente a la vez por prestador. |
| Cancelación | Comercio desde dashboard; cliente vía **WhatsApp** (CTA `wa.me`). |
| Reprogramación | Cliente puede reprogramar turno **no vencido**; **mínimo 2 h** de anticipación para **nueva reserva** y para **reprogramar** (misma regla). |
| Vista `provider` | Solo su agenda (turnos donde `staffId` / `providerId` = él). |
| Identificador comercio | **ID único** = documento Firestore del comercio (`commerces/{commerceId}`). **Slug** único para URLs públicas (índice/query). |
| URLs públicas | Una por **comercio** y una por **prestador** (ver §4). |
| Clientes | Datos en colección dedicada (ver §3.1), referenciados desde turnos. |
| Notificaciones | **WhatsApp** en roadmap; v1: abstracción + enlaces; integración API cuando se defina proveedor. |
| Pagos | **v2**: Mercado Pago. |
| Tests | Unitarios, integración y E2E para **cada funcionalidad** expuesta por la app. |

---

## 2. Zona horaria (enfoque recomendado)

**Eficiencia y consistencia:**

1. **Persistencia**: guardar `start` y `end` de cada turno como **`Timestamp` en UTC** (Firestore nativo). Nunca depender de strings locales como fuente de verdad para solapes.
2. **Configuración por comercio**: campo `timezone: string` con **IANA** (ej. `America/Argentina/Buenos_Aires`). Default sugerido para nuevos comercios: `America/Argentina/Buenos_Aires`.
3. **Cálculo de slots**: librería **`@date-fns/tz`** o **Luxon** en utilidades compartidas (server + tests) para:
   - convertir “día laboral en TZ del comercio” ↔ instantes UTC;
   - aplicar `minHoursBeforeBooking` (2) comparando **ahora UTC** vs **inicio del slot en UTC**.
4. **UI**: mostrar fechas/horas siempre en la **timezone del comercio** en flujos públicos y dashboard; opcional perfil usuario en fases posteriores.

**Tests**: casos fijos con instantes UTC + TZ conocida (no depender del reloj del runner sin mock).

---

## 3. Modelo de datos Firestore (borrador)

Nombres de colección en **inglés**; roles en inglés en documentos.

### 3.1 Colecciones principales

| Colección | Documento | Campos clave |
|-----------|-----------|----------------|
| `commerces` | `{commerceId}` | `slug` (único), `name`, `active`, `timezone`, `workingHours`, `whatsappNumber`, `minHoursBeforeBooking` (default 2), `maxDaysInAdvance`, `createdAt`, … |
| `services` | `{serviceId}` | `commerceId`, `name`, `durationMinutes`, `active`, `price?`, `createdAt` |
| `staff` (o `providers`) | `{staffId}` | `commerceId`, `slug` (único **por comercio**), `name`, `active`, `serviceIds[]`, `workingHours?` (override opcional), `userId?` (vinculación Auth), `createdAt` |
| `commerce_members` | `{uid_commerceId}` o subcolección `commerces/{id}/members/{uid}` | `role`: `owner` \| `reception` \| `provider`, `commerceId`, `userId`, `staffId?` (obligatorio si `role === provider`) |
| `customers` | `{customerId}` | `commerceId`, `name`, `phone`, `email`, `createdAt`, `updatedAt` (deduplicar por `commerceId` + `email` o `phone` según regla de negocio) |
| `appointments` | `{appointmentId}` | `commerceId`, `staffId`, `serviceId`, `customerId`, `start`, `end` (UTC), `status`: `confirmed` \| `cancelled` \| `no_show`, `manageTokenHash` o `manageToken` (solo hash en DB), `createdAt`, `updatedAt` |

**Nota**: el código actual usa `Staff` y `appointments` sin `customerId` ni email explícito; el plan extiende el modelo para alinear con “colección de clientes” y reprogramación segura.

### 3.2 Índices y transacciones

- Queries por `staffId` + rango en `start` + `status` → índice compuesto.
- Anti-solape: en **transacción**, leer candidatos que se cruzan con `[start, end)` y abortar si existe `confirmed`. Ajustar queries a límites de Firestore (documentar índices en `firestore.indexes.json`).
- **Slug**: `commerce.slug` global único; `staff.slug` único **dentro de** `commerceId` (validar en Cloud Function o en servidor antes de escribir).

### 3.3 Reglas de seguridad (Firestore)

- **Público (sin auth)**: lectura acotada de `commerces`/`services`/`staff` por `slug` vía **Cloud Functions** o **API Routes** que solo exponen datos necesarios (recomendado) *o* reglas muy restrictivas con validación de campos.
- **Escritura de `appointments`**: solo a través de **servidor** (Admin SDK) o Callable Functions que validen solape, 2 h mínimas, y servicio asignado al staff.
- **Dashboard**: lectura/escritura según `commerce_members` y rol.

Iteración v1: **Next.js Route Handlers / Server Actions + Firebase Admin** en entorno servidor para mutaciones sensibles; reglas Firestore denegando writes directos desde cliente donde corresponda.

---

## 4. Rutas y URLs

Convención sugerida (ajustable, pero una sola en todo el proyecto):

| Superficie | Ruta ejemplo |
|------------|----------------|
| Landing producto | `/` |
| Reserva por comercio | `/book/[commerceSlug]` |
| Reserva por prestador | `/book/[commerceSlug]/[staffSlug]` |
| Dashboard | `/app` o `/dashboard` (layout autenticado) |
| Subrutas dashboard | `/dashboard/[commerceId]/…` (overview, calendar, services, staff, settings, customers) |
| Reprogramación pública | `/book/manage/[token]` (token opaco, mapea a `appointmentId`; validar 2 h y estado) |

**IDs**: todas las relaciones internas usan `commerceId` (Firestore ID); los slugs solo para URLs y SEO.

---

## 5. Matriz de permisos (resumen)

| Acción | `owner` | `reception` | `provider` |
|--------|---------|-------------|------------|
| CRUD comercio (propios) | Sí | No | No |
| Invitar / asignar roles | Sí | No* | No |
| CRUD servicios | Sí | Sí | No |
| CRUD staff (providers) | Sí | Sí | No |
| Ver todos los turnos del comercio | Sí | Sí | No |
| Ver solo turnos propios | Sí | Sí | Sí |
| Cancelar / mover cualquier turno | Sí | Sí | Solo propios (opcional: solo lectura+mover propios; cerrar en spec si difiere) |

\*Si en v1 no hay invitaciones, `owner` único basta; dejar hook para `reception` sin gestión de billing.

---

## 6. Reglas de negocio críticas (implementar en una capa pura testeable)

Funciones en `src/lib/booking/` (o similar), **sin** UI:

1. **`buildAvailableSlots({ commerce, staff, service, dateLocal, existingAppointments })`** — respeta `workingHours`, breaks, `durationMinutes` del servicio, timezone del comercio.
2. **`assertMinLeadTime(startUtc, nowUtc, minHours)`** — ≥ 2 h para reserva y reprogramación.
3. **`assertNoOverlap(candidate, confirmedAppointments)`**.
4. **`canReschedule(appointment, nowUtc, minHours)`** — no cancelado, `start` futuro, cumple anticipación.
5. **Token de gestión**: generar token aleatorio; guardar **solo hash** (ej. SHA-256) en el documento; email/WhatsApp futuro con link `/book/manage/[token]`.

**Tests unitarios**: cubrir todas las funciones anteriores con tablas de casos (límite 2 h, cambio de día, DST edge cases si aplica).

---

## 7. Fases de implementación

### Fase 0 — Base del repo

- [ ] Instalar y configurar **shadcn/ui** (Tailwind ya presente).
- [ ] Variables de entorno: Firebase client + **Admin** (service account solo servidor).
- [ ] Estructura de carpetas: `src/app/(marketing)`, `src/app/(public-booking)`, `src/app/(dashboard)` con layouts.
- [ ] **ESLint / Prettier** alineados al proyecto; skill vercel-react-best-practices en revisiones de componentes.

### Fase 1 — Auth y membresías

- [ ] Login/registro Firebase Auth (email o proveedor acordado).
- [ ] Modelo `commerce_members`; al crear comercio, crear membresía `owner`.
- [ ] Middleware/guard de rutas dashboard: usuario autenticado + pertenencia al `commerceId`.
- [ ] Tests: integración de “usuario sin membresía no accede”.

### Fase 2 — CRUD comercio y configuración

- [ ] Crear/editar comercio (nombre, slug, timezone, horarios, WhatsApp, `minHoursBeforeBooking`, `maxDaysInAdvance`).
- [ ] Validación de slug único.
- [ ] Tests E2E: flujo owner crea comercio y ve settings.

### Fase 3 — Servicios y staff (providers)

- [ ] CRUD servicios (`durationMinutes` por servicio).
- [ ] CRUD staff con `serviceIds`, `slug` por comercio, vinculación opcional a `userId` para rol `provider`.
- [ ] Tests integración API + E2E felices.

### Fase 4 — Reserva pública

- [ ] Páginas `/book/[commerceSlug]` y `/book/[commerceSlug]/[staffSlug]`.
- [ ] Selector de servicio → prestador filtrado → calendario/slots mobile first.
- [ ] Crear `customer` (o upsert) + `appointment` + token de gestión; respuesta con link de reprogramación (mostrar en pantalla y preparar plantilla futura WhatsApp/email).
- [ ] Validación servidor: 2 h, solape, servicio permitido.
- [ ] Tests E2E: reserva completa; unitarios en reglas de slots.

### Fase 5 — Dashboard agenda

- [ ] Vista calendario/lista por día/semana (mobile first).
- [ ] `owner` / `reception`: todos los staff; `provider`: filtro fijo a su `staffId`.
- [ ] Cancelar turno desde dashboard; cliente sigue usando WhatsApp para cancelar según producto (CTA en página de confirmación).
- [ ] Tests E2E por rol.

### Fase 6 — Reprogramación pública

- [ ] `/book/manage/[token]`: cargar cita por token, mostrar slots alternativos, aplicar misma validación 2 h y solape.
- [ ] Tests unitarios + E2E reprogramación.

### Fase 7 — Landing marketing

- [ ] Página `/` con propuesta de valor, CTA a registro/demo, responsive.
- [ ] Tests E2E smoke (carga, navegación principal).

### Fase 8 — Notificaciones WhatsApp (cuando haya proveedor)

- [ ] Interfaz `NotificationService.sendBookingConfirmation(...)`.
- [ ] Implementación mock / manual en v1; swap por API (Twilio, Meta Cloud API, etc.) sin cambiar dominio.

### Fase 9 — v2 (fuera de este plan detallado)

- [ ] Mercado Pago: estados de pago en `appointments` o subcolección `payments`.

---

## 8. Estrategia de testing

| Capa | Herramientas sugeridas | Alcance |
|------|-------------------------|---------|
| Unitarios | **Vitest** o **Jest** | Reglas de booking, timezone, permisos puros |
| Integración | Vitest + **Firebase Emulator Suite** o mocks de Admin SDK | Handlers que crean citas, rechazan solape y 2 h |
| E2E | **Playwright** | Landing, reserva pública, login dashboard, CRUD mínimo, reprogramación, permisos por rol |

- Scripts npm: `test`, `test:integration`, `test:e2e` (CI: unit + integration en cada PR; E2E en rama principal o nocturno si es pesado).
- Cobertura mínima acordada por equipo para módulos `booking` y `authz`.

---

## 9. Alineación con código existente

En `src/lib/types.ts` y `src/lib/firebase/services.ts` ya existen `Commerce`, `Service`, `Staff`, `Appointment` y funciones de lectura/escritura. Próximos pasos concretos:

1. Renombrar o mapear **Staff → Provider** en UI copy; en código se puede mantener `Staff` como nombre técnico o migrar a `Provider` de forma consistente.
2. Añadir **`customers`**, **`commerce_members`**, **`manageTokenHash`**, **`customerId`**, **`email`** en turnos según §3.1.
3. Sustituir o complementar `createAppointmentWithValidation` por validación en **servidor** con reglas §6 y transacción con índices correctos.
4. Fijar `minHoursBeforeBooking: 2` como default en creación de comercio.

---

## 10. Checklist de salida MVP

- [ ] Landing publicada.
- [ ] Reserva por comercio y por prestador con límites 2 h.
- [ ] Dashboard con roles `owner`, `reception`, `provider` y aislamiento de agenda del provider.
- [ ] Clientes persistidos en colección; reprogramación por token.
- [ ] Firestore rules / patrón servidor seguro documentado.
- [ ] Suite: unit + integration + E2E para flujos anteriores.

---

*Documento vivo: actualizar al cerrar decisiones de permisos finos (ej. si `provider` puede cancelar solo sus turnos) y al elegir proveedor WhatsApp.*
