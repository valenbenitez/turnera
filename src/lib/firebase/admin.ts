import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { loadServiceAccountJson } from "@/lib/firebase/load-service-account";

let adminApp: App | undefined;

/**
 * Firebase Admin (solo entorno Node, p. ej. Route Handlers / Server Actions).
 * Ver `loadServiceAccountJson` (archivo vs variable de entorno).
 */
export function getAdminApp(): App {
  if (adminApp) return adminApp;
  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return adminApp;
  }

  const serviceAccount = loadServiceAccountJson();
  const parsed = serviceAccount as Record<string, unknown>;
  const adminPidRaw =
    (typeof parsed.project_id === "string" ? parsed.project_id : null) ??
    (typeof parsed.projectId === "string" ? parsed.projectId : null);
  const publicPid = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const adminPid = adminPidRaw ?? undefined;
  if (publicPid && adminPid && publicPid !== adminPid) {
    throw new Error(
      `Firebase Admin: el service account es del proyecto "${adminPid}" pero NEXT_PUBLIC_FIREBASE_PROJECT_ID es "${publicPid}". Deben coincidir o verifyIdToken fallará al crear comercios y demás APIs.`
    );
  }
  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });
  return adminApp;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
