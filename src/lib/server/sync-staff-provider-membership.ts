import { FieldValue, type Firestore, type WriteBatch } from "firebase-admin/firestore";

import { commerceMemberDocId } from "@/lib/commerce-member-id";

/**
 * Valida que el UID pueda recibir rol `provider` para este `staffId`.
 * Rechaza si ya es owner/reception, o si otro staff del comercio ya usa ese UID.
 */
export async function validateTargetUserCanBeProvider(
  db: Firestore,
  commerceId: string,
  staffId: string,
  targetUserId: string
): Promise<string | null> {
  const memberId = commerceMemberDocId(targetUserId, commerceId);
  const memberSnap = await db.collection("commerce_members").doc(memberId).get();
  if (memberSnap.exists) {
    const role = memberSnap.data()?.role;
    if (role === "owner" || role === "reception") {
      return "Este usuario ya es dueño o recepción del comercio.";
    }
    if (role === "provider") {
      const linkedStaffId = memberSnap.data()?.staffId;
      if (
        typeof linkedStaffId === "string" &&
        linkedStaffId.length > 0 &&
        linkedStaffId !== staffId
      ) {
        return "Este usuario ya está vinculado a otro profesional del equipo.";
      }
    }
  }

  const dup = await db
    .collection("staff")
    .where("commerceId", "==", commerceId)
    .where("userId", "==", targetUserId)
    .limit(25)
    .get();

  for (const d of dup.docs) {
    if (d.id !== staffId) {
      return "Este usuario ya está vinculado a otro profesional del equipo.";
    }
  }

  return null;
}

/** Elimina `commerce_members` solo si era provider vinculado a este staff. */
export async function enqueueRemoveProviderMembershipIfLinked(
  batch: WriteBatch,
  db: Firestore,
  targetUserId: string,
  commerceId: string,
  staffId: string
): Promise<void> {
  const ref = db
    .collection("commerce_members")
    .doc(commerceMemberDocId(targetUserId, commerceId));
  const snap = await ref.get();
  if (!snap.exists) return;
  const d = snap.data()!;
  if (d.role === "provider" && d.staffId === staffId) {
    batch.delete(ref);
  }
}

/** Crea o actualiza membresía provider; preserva `createdAt` si ya existía. */
export async function enqueueUpsertProviderMembership(
  batch: WriteBatch,
  db: Firestore,
  targetUserId: string,
  commerceId: string,
  staffId: string
): Promise<void> {
  const ref = db
    .collection("commerce_members")
    .doc(commerceMemberDocId(targetUserId, commerceId));
  const snap = await ref.get();
  const createdAt =
    snap.exists && snap.data()?.createdAt != null
      ? snap.data()!.createdAt
      : FieldValue.serverTimestamp();

  batch.set(
    ref,
    {
      userId: targetUserId,
      commerceId,
      role: "provider",
      staffId,
      createdAt,
    },
    { merge: true }
  );
}
