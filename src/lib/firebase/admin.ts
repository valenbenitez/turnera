import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | undefined;

/**
 * Firebase Admin (solo entorno Node, p. ej. Route Handlers / Server Actions).
 * Configurá `FIREBASE_SERVICE_ACCOUNT_KEY` con el JSON del service account en una línea.
 */
export function getAdminApp(): App {
  if (adminApp) return adminApp;
  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return adminApp;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY no está definida. Requerida para operaciones de servidor en Firestore."
    );
  }

  const serviceAccount = JSON.parse(raw) as ServiceAccount;
  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });
  return adminApp;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
