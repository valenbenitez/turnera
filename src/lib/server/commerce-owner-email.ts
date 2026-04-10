import { getFirestore } from "firebase-admin/firestore";

import { getAdminApp } from "@/lib/firebase/admin";

/**
 * Email del primer miembro con rol `owner` (perfil `users/{uid}`), si existe.
 */
export async function adminGetCommerceOwnerEmail(
  commerceId: string
): Promise<string | null> {
  const db = getFirestore(getAdminApp());
  const snap = await db
    .collection("commerce_members")
    .where("commerceId", "==", commerceId)
    .where("role", "==", "owner")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const userId = snap.docs[0].data().userId;
  if (typeof userId !== "string" || !userId) return null;
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return null;
  const email = userDoc.data()?.email;
  if (typeof email !== "string" || !email.includes("@")) return null;
  return email.trim();
}
