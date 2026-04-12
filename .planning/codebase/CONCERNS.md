# Codebase Concerns

**Analysis Date:** 2026-04-12

## Tech Debt

**Código cliente obsoleto en Firestore (`src/lib/firebase/services.ts`):**
- Issue: Siguen exportadas `getCommerceBySlug`, `getAppointmentsByStaffAndDate` y `createAppointmentWithValidation` sin usos en `src/` (la reserva pública y la agenda pasan por Route Handlers con Admin SDK). Además, las reglas de Firestore niegan lectura/escritura en `appointments` al cliente (`firestore.rules`), por lo que esas funciones de citas fallarían si alguien las reutilizara.
- Files: `src/lib/firebase/services.ts`, `firestore.rules`
- Impact: Confusión para quien implemente features, riesgo de “arreglar” volviendo a escribir desde el cliente y chocar con reglas.
- Fix approach: Eliminar o marcar explícitamente como no soportado; centralizar reservas solo en `src/app/api/public/commerce/[slug]/appointments/route.ts` y lecturas de agenda en `src/app/api/commerces/[commerceId]/appointments/route.ts`.

**Duplicidad de campo `servicesIds` / `serviceIds` en staff:**
- Issue: Compatibilidad mantenida en cliente (`staffServicesIds`) y en servidor (`mapStaffData` en `src/lib/server/public-booking-data.ts`).
- Files: `src/lib/firebase/services.ts`, `src/lib/server/public-booking-data.ts`
- Impact: Datos inconsistentes entre documentos; lógica duplicada.
- Fix approach: Migración one-shot en Firestore a un solo campo y retirar el alias.

**Componentes cliente muy grandes:**
- Issue: Varias pantallas concentran estado, fetch y UI en un solo archivo.
- Files: `src/components/booking/book-commerce-client.tsx` (~614 líneas), `src/components/dashboard/staff-page-client.tsx` (~616), `src/components/dashboard/commerce-settings-form.tsx` (~479), `src/components/dashboard/agenda-page-client.tsx` (~368), `src/components/dashboard/services-page-client.tsx` (~364)
- Impact: Difícil de testear y de cambiar sin regresiones.
- Fix approach: Extraer hooks (`useAgenda`, `useBookingFlow`), subcomponentes y capas de datos.

**Mapeo Firestore → dominio con aserciones de tipo:**
- Issue: Patrón general `as Commerce`, `as Service[]`, casts en respuestas Admin sin validación en runtime (p. ej. `src/lib/firebase/services.ts`, `src/lib/server/public-booking-data.ts`).
- Impact: Documentos mal formados en Firestore pueden provocar errores en runtime o datos incorrectos en UI.
- Fix approach: Funciones `parse*` con validación ligera (Zod o guards) en los bordes (API y Admin).

## Known Bugs

**No detectados en código con síntomas explícitos:** no hay comentarios `TODO`/`FIXME` en `src/`. Cualquier fallo actual sería de integración o de datos.

**Respuesta genérica ante errores en cliente:**
- Symptoms: Mensajes fijos como “No se pudo cargar el comercio.” sin detalle.
- Files: `src/components/dashboard/agenda-page-client.tsx`, `src/components/dashboard/staff-page-client.tsx`, y otros con `catch {` vacío o sin log.
- Trigger: Fallos de red, permisos Firestore, JSON inválido.
- Workaround: Reintentar o revisar consola del navegador / logs del servidor.

## Security Considerations

**Superficie pública sin rate limiting:**
- Risk: `GET/POST` bajo `src/app/api/public/**` (p. ej. `src/app/api/public/commerce/[slug]/slots/route.ts`, `src/app/api/public/commerce/[slug]/appointments/route.ts`) pueden abusarse para spam de reservas, enumeración de slugs o carga excesiva.
- Files: rutas bajo `src/app/api/public/`
- Current mitigation: Validación de cuerpo y comprobación de comercio activo; transacción en creación de turno para conflictos.
- Recommendations: Rate limiting (edge middleware, WAF, o proveedor), CAPTCHA opcional en POST de reserva, monitoreo de errores 409.

**Tokens de gestión de reserva:**
- Risk: El token en `booking_tokens` es aleatorio (`randomBytes` en `src/app/api/public/commerce/[slug]/appointments/route.ts`); la entropía es adecuada, pero el enlace compartido es bearer token.
- Files: `src/app/api/public/commerce/[slug]/appointments/route.ts`, `src/app/api/public/booking-token/[token]/route.ts`
- Current mitigation: Longitud acotada en ruta de token; documento en Firestore solo vía Admin.
- Recommendations: Política de expiración/revocación, registro de accesos si el negocio lo exige.

**Reglas Firestore vs. modelo “todo vía Admin”:**
- Risk: Bajo para datos sensibles: `appointments`, `customers`, `booking_tokens`, `commerce_invites` tienen `allow read, write: if false` en `firestore.rules`.
- Files: `firestore.rules`
- Current mitigation: Escrituras sensibles solo desde servidor con credencial de servicio.
- Recommendations: Mantener el invariante; no reintroducir escritura cliente en esas colecciones.

**Variables de entorno:**
- Risk: `RESEND_API_KEY`, `RESEND_FROM`, `FIREBASE_SERVICE_ACCOUNT_*` deben estar bien configuradas; `.env` no se documenta aquí.
- Files: `src/lib/email/resend.ts`, `src/lib/firebase/load-service-account.ts`
- Current mitigation: Advertencias en desarrollo en `resend.ts`; fallo explícito si proyecto Admin ≠ `NEXT_PUBLIC_FIREBASE_PROJECT_ID` en `src/lib/firebase/admin.ts`.
- Recommendations: Validación al arranque (schema de env) en despliegue.

## Performance Bottlenecks

**Consultas públicas de slots y reserva:**
- Problem: Cada request recalcula disponibilidad leyendo citas del día (`adminListAppointmentsForStaffDayUtc`) y ejecutando `buildAvailableSlotStartsUtc`.
- Files: `src/app/api/public/commerce/[slug]/slots/route.ts`, `src/app/api/public/commerce/[slug]/appointments/route.ts`, `src/lib/booking/slots.ts`
- Cause: Lógica correcta pero CPU + lecturas Firestore por request.
- Improvement path: Caché corta por `(slug, staffId, serviceId, date)` en edge o memoización en instancia si el tráfico crece.

**Listado de agenda (API autenticada):**
- Problem: Tras la query de turnos, se resuelven nombres de servicio y staff con lecturas adicionales por ID único (paralelizadas).
- Files: `src/app/api/commerces/[commerceId]/appointments/route.ts`
- Cause: Modelo normalizado en Firestore.
- Improvement path: Desnormalizar nombres en el documento de cita o batch get si el SDK lo permite de forma eficiente.

## Fragile Areas

**Flujo de notificaciones por email tras reserva pública:**
- Files: `src/app/api/public/commerce/[slug]/appointments/route.ts`, `src/lib/email/booking-notifications.ts`, `src/lib/email/resend.ts`
- Why fragile: Si `notifyAfterPublicBooking` falla, el error se registra con `console.error` y la API igual devuelve 200 con `managePath`; el turno existe pero el correo puede no haberse enviado.
- Safe modification: Tratar el envío como cola o reintento; o devolver estado parcial explícito al cliente.
- Test coverage: No hay tests de estos módulos en `src/**/*.test.ts`.

**Errores de verificación de ID token en producción:**
- Files: `src/lib/server/firebase-bearer-auth.ts`
- Why fragile: En producción no se hace `console.error` en fallos de `verifyIdToken` (solo en `development`), lo que dificulta el diagnóstico en incidentes.
- Safe modification: Integrar logger estructurado con nivel y contexto sin filtrar tokens.
- Test coverage: `src/lib/server/firebase-bearer-auth.test.ts` existe; no cubre logging.

## Scaling Limits

**Firestore:**
- Current capacity: Depende del plan y cuotas de proyecto; índices compuestos definidos en `firestore.indexes.json` para `appointments`, `staff`, `commerce_members`.
- Limit: Picos de escritura en la misma partición (p. ej. muchas reservas concurrentes para el mismo `staffId`/día) pueden aumentar contención en transacciones.
- Scaling path: Shard por rango temporal, o límites de concurrencia en API; revisar patrones de retry del cliente.

**Sin pipeline CI en el repositorio:**
- Current capacity: No hay workflows bajo `.github/` en el árbol analizado.
- Limit: Regresiones y roturas de build pueden llegar al remoto sin bloqueo automático.
- Scaling path: Añadir job que ejecute `npm run lint`, `npm run test`, `npm run build`.

## Dependencies at Risk

**Stack muy reciente (Next / React):**
- Risk: `next@16.2.2`, `react@19.2.4` en `package.json` pueden exponer cambios de comportamiento o bugs de plataforma antes que el ecosistema estabilice guías.
- Impact: Actualizaciones o parches pueden requerir ajustes en App Router y tipos.
- Migration plan: Fijar versiones en lockfile, revisar notas de versión antes de bump mayor.

## Missing Critical Features

**Observabilidad centralizada:**
- Problem: Uso disperso de `console.error` / `console.warn` en servidor y cliente; no hay servicio de errores unificado.
- Blocks: Triage en producción y alertas proactivas.

**Protección anti-abuso en API pública:**
- Problem: No hay throttling ni verificación humana en flujo de reserva.
- Blocks: Mitigación de bots sin capa externa.

## Test Coverage Gaps

**API Route Handlers:**
- What's not tested: Casi todas las rutas bajo `src/app/api/**` (comercios, staff, servicios, invites, reserva pública).
- Files: `src/app/api/**/*.ts` (sin pares `.test.ts` colocados)
- Risk: Regresiones en autorización (`requireCatalogManager`, `requireAgendaAccess`) y en transacciones de reserva.
- Priority: High

**Componentes de dashboard y booking:**
- What's not tested: Componentes cliente grandes listados arriba.
- Files: `src/components/**/*.tsx` (sin tests)
- Risk: Cambios de UI rompen flujos de fetch y estados sin detección automática.
- Priority: Medium

**Cobertura existente:**
- Tests localizados en: `src/lib/booking/slots.test.ts`, `src/lib/server/agenda-day.test.ts`, `src/lib/server/firebase-bearer-auth.test.ts`, `src/lib/firebase/load-service-account.test.ts`, validaciones en `src/lib/validation/*.test.ts`.
- Risk: La mayoría del comportamiento de negocio en producción no tiene tests automatizados.
- Priority: High

---

*Concerns audit: 2026-04-12*
