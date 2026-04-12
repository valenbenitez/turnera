# External Integrations

**Analysis Date:** 2026-04-12

## APIs & External Services

**Correo transaccional (Resend):**
- Resend — avisos al comercio por nuevas reservas públicas
  - SDK/Client: paquete `resend`; fábrica en `src/lib/email/resend.ts` (`getResendClient`, `getResendFromAddress`)
  - Auth: `RESEND_API_KEY` (servidor); remitente `RESEND_FROM` (dominio verificado en Resend)
  - Uso orquestado en `src/lib/email/booking-notifications.ts` (`sendTransactionalHtmlEmail`)

**Firebase (Google):**
- Firebase Authentication — email/contraseña en cliente: `src/app/(auth)/login/login-form.tsx`, `src/app/(auth)/register/register-form.tsx`; instancia en `src/lib/firebase/auth-client.ts`
- Firebase Admin Auth — verificación de ID token en APIs: `src/lib/server/firebase-bearer-auth.ts` (`verifyFirebaseIdToken`, `requireBearerUid`)
- Config cliente: `src/lib/firebase/config.ts` con `NEXT_PUBLIC_FIREBASE_*` (ver `.env.example`)
- Admin inicialización: `src/lib/firebase/admin.ts` con credencial desde `load-service-account.ts`

## Data Storage

**Databases:**
- Cloud Firestore (modo cliente y Admin)
  - Cliente: `firebase/firestore` en `src/lib/firebase/config.ts`, lecturas/escrituras de catálogo en `src/lib/firebase/services.ts`, perfiles en `src/lib/firebase/user-profile.ts`
  - Servidor: `firebase-admin/firestore` en route handlers bajo `src/app/api/**/route.ts` y helpers en `src/lib/server/` (p. ej. `public-booking-data.ts`, `commerce-access.ts`, `commerce-invite.ts`)
  - Reglas: `firestore.rules`
  - Índices compuestos: `firestore.indexes.json`; referencia en `firebase.json`

**File Storage:**
- No hay uso de `firebase/storage` en `src/`; `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` aparece en config de app Firebase (`.env.example` / `src/lib/firebase/config.ts`) para el SDK web estándar, sin integración de subida detectada en código

**Caching:**
- Ningún Redis u otro caché externo en dependencias o código fuente revisado

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication (Google)
  - Cliente: `firebase/auth` — sesión observada en `src/contexts/auth-context.tsx`, `src/components/join/join-invite-client.tsx`, cierre de sesión en `src/components/dashboard/dashboard-chrome.tsx`
  - APIs protegidas: header `Authorization: Bearer <Firebase ID token>` validado con Admin SDK (`src/lib/server/firebase-bearer-auth.ts`)

## Monitoring & Observability

**Error Tracking:**
- No integrado (sin Sentry ni similar en `package.json` o imports en `src/`)

**Logs:**
- `console.error` en desarrollo para fallos de token en `src/lib/server/firebase-bearer-auth.ts`; advertencias de configuración Resend en `src/lib/email/resend.ts`

## CI/CD & Deployment

**Hosting:**
- No detectado en repo — sin workflows en `.github/` en el análisis actual

**CI Pipeline:**
- Ninguno versionado en el workspace analizado

## Environment Configuration

**Required env vars:**
- Cliente Firebase: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` (documentadas en `.env.example`)
- Servidor Admin: `FIREBASE_SERVICE_ACCOUNT_PATH` **o** `FIREBASE_SERVICE_ACCOUNT_KEY` (una sola línea JSON); `project_id` debe alinearse con `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (`src/lib/firebase/admin.ts`)
- Resend (para correos de reserva): `RESEND_API_KEY`, `RESEND_FROM`
- Opcional: `NEXT_PUBLIC_APP_URL` — enlaces en correos y URLs públicas (`src/lib/email/booking-notifications.ts`, `src/lib/server/join-url.ts`)

**Secrets location:**
- Desarrollo/local: típicamente `.env` (no commitear); service account como archivo vía `FIREBASE_SERVICE_ACCOUNT_PATH` (ej. ruta sugerida en comentarios de `.env.example`)

## Webhooks & Callbacks

**Incoming:**
- No hay endpoints dedicados a webhooks de terceros (Stripe, etc.). El tráfico entrante es HTTP estándar a route handlers REST en `src/app/api/` (comercios, citas, invites, booking público)

**Outgoing:**
- Llamadas HTTP al API de Resend al enviar correo (`resend.emails.send` en `src/lib/email/resend.ts`)

---

*Integration audit: 2026-04-12*
