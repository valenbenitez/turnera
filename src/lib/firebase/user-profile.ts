import type { User } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase/config";
import type { UserPreferences, UserProfile } from "@/lib/types";

const USERS_COLLECTION = "users";

function mapUserProfile(id: string, data: Record<string, unknown>): UserProfile {
  const prefs = data.preferences;
  return {
    id,
    email: typeof data.email === "string" ? data.email : "",
    displayName:
      typeof data.displayName === "string" ? data.displayName : null,
    phone: typeof data.phone === "string" ? data.phone : null,
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    preferences:
      prefs && typeof prefs === "object" && !Array.isArray(prefs)
        ? (prefs as UserPreferences)
        : {},
    createdAt:
      (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt:
      (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
  };
}

/**
 * Crea el documento si no existe; si existe, sincroniza email/foto/nombre desde Auth cuando cambian.
 */
export async function ensureUserProfile(user: User): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, user.uid);
  const snap = await getDoc(ref);
  const now = Timestamp.now();

  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email ?? "",
      displayName: user.displayName ?? null,
      phone: null,
      photoURL: user.photoURL ?? null,
      preferences: {},
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  const data = snap.data();
  const patch: Record<string, unknown> = {};
  if (user.email && data.email !== user.email) patch.email = user.email;
  const authPhoto = user.photoURL ?? null;
  const dbPhoto =
    typeof data.photoURL === "string" ? data.photoURL : null;
  if (authPhoto !== dbPhoto) patch.photoURL = authPhoto;
  const authName = user.displayName ?? null;
  const dbName =
    typeof data.displayName === "string" ? data.displayName : null;
  if (authName !== dbName) patch.displayName = authName;
  if (Object.keys(patch).length > 0) {
    patch.updatedAt = now;
    await updateDoc(ref, patch);
  }
}

export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return mapUserProfile(snap.id, snap.data() as Record<string, unknown>);
}

export type UserProfilePatch = Partial<{
  displayName: string | null;
  phone: string | null;
  photoURL: string | null;
  preferences: UserPreferences;
}>;

/** Actualiza perfil (solo campos permitidos). El `uid` debe ser el usuario autenticado. */
export async function updateUserProfile(
  uid: string,
  patch: UserProfilePatch
): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid);
  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if ("displayName" in patch) updates.displayName = patch.displayName;
  if ("phone" in patch) updates.phone = patch.phone;
  if ("photoURL" in patch) updates.photoURL = patch.photoURL;
  if ("preferences" in patch) updates.preferences = patch.preferences ?? {};
  await updateDoc(ref, updates);
}
