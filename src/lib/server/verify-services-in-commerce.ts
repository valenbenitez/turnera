import type { Firestore } from "firebase-admin/firestore";

export async function verifyServiceIdsBelongToCommerce(
  db: Firestore,
  commerceId: string,
  serviceIds: string[]
): Promise<boolean> {
  for (const id of serviceIds) {
    const snap = await db.collection("services").doc(id).get();
    if (!snap.exists) return false;
    if (snap.data()?.commerceId !== commerceId) return false;
  }
  return true;
}
