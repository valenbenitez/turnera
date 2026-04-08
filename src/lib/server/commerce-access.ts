import { getFirestore } from "firebase-admin/firestore";

import { commerceMemberDocId } from "@/lib/commerce-member-id";
import { getAdminApp } from "@/lib/firebase/admin";
import type { CommerceMemberRole } from "@/lib/types";

export type CommerceMembership = {
  role: CommerceMemberRole;
  staffId?: string;
};

export async function getCommerceMembership(
  uid: string,
  commerceId: string
): Promise<CommerceMembership | null> {
  const db = getFirestore(getAdminApp());
  const snap = await db
    .collection("commerce_members")
    .doc(commerceMemberDocId(uid, commerceId))
    .get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const role = data.role;
  if (role !== "owner" && role !== "reception" && role !== "provider") {
    return null;
  }
  const staffId =
    typeof data.staffId === "string" && data.staffId.length > 0
      ? data.staffId
      : undefined;
  return { role, staffId };
}

export async function getCommerceMemberRole(
  uid: string,
  commerceId: string
): Promise<CommerceMemberRole | null> {
  const m = await getCommerceMembership(uid, commerceId);
  return m?.role ?? null;
}
