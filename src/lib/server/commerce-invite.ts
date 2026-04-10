import { randomBytes } from "node:crypto";

import {
  FieldValue,
  type Firestore,
  Timestamp,
} from "firebase-admin/firestore";

import { commerceMemberDocId } from "@/lib/commerce-member-id";
import type { CommerceMemberRole } from "@/lib/types";

export const COMMERCE_INVITES_COLLECTION = "commerce_invites";

/** Duración por defecto del enlace (días). */
export const INVITE_DEFAULT_TTL_DAYS = 7;

export type StoredCommerceInvite = {
  commerceId: string;
  role: Extract<CommerceMemberRole, "provider" | "reception">;
  staffId?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  usedAt?: Timestamp;
  usedByUid?: string;
};

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function inviteExpiresAt(days: number): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return Timestamp.fromDate(d);
}

export type InvitePreview = {
  commerceId: string;
  commerceName: string;
  role: "provider" | "reception";
  staffName?: string;
};

/**
 * Lee invitación válida (no usada, no vencida). Solo servidor Admin.
 */
export async function adminGetValidInvite(
  db: Firestore,
  token: string
): Promise<{ id: string; data: StoredCommerceInvite } | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }
  const ref = db.collection(COMMERCE_INVITES_COLLECTION).doc(token);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as StoredCommerceInvite;
  if (data.usedAt) return null;
  const exp = data.expiresAt?.toDate?.() ?? new Date(0);
  if (exp.getTime() <= Date.now()) return null;
  if (data.role !== "provider" && data.role !== "reception") return null;
  if (data.role === "provider" && typeof data.staffId !== "string") return null;
  return { id: snap.id, data };
}

export async function adminBuildInvitePreview(
  db: Firestore,
  inv: StoredCommerceInvite
): Promise<InvitePreview | null> {
  const cSnap = await db.collection("commerces").doc(inv.commerceId).get();
  if (!cSnap.exists) return null;
  const commerceName =
    typeof cSnap.data()?.name === "string" ? cSnap.data()!.name : "Comercio";

  if (inv.role === "reception") {
    return { commerceId: inv.commerceId, commerceName, role: "reception" };
  }

  const stSnap = await db.collection("staff").doc(inv.staffId!).get();
  if (!stSnap.exists) return null;
  const staffName =
    typeof stSnap.data()?.name === "string" ? stSnap.data()!.name : "Prestador";

  return {
    commerceId: inv.commerceId,
    commerceName,
    role: "provider",
    staffName,
  };
}

export type RedeemResult =
  | { ok: true; commerceId: string; role: CommerceMemberRole }
  | {
      ok: false;
      message: string;
      status: number;
      commerceId?: string;
      code?: string;
    };

/**
 * Canje atómico: membresía + vínculo staff (provider) + marca invitación usada.
 */
export async function redeemCommerceInvite(
  db: Firestore,
  token: string,
  uid: string
): Promise<RedeemResult> {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return { ok: false, message: "Enlace inválido.", status: 404 };
  }

  const inviteRef = db.collection(COMMERCE_INVITES_COLLECTION).doc(token);

  try {
    const out = await db.runTransaction(async (tx) => {
      const invSnap = await tx.get(inviteRef);
      if (!invSnap.exists) {
        throw Object.assign(new Error("INVITE_NOT_FOUND"), { status: 404 });
      }
      const inv = invSnap.data() as StoredCommerceInvite;
      const commerceIdEarly = inv.commerceId;
      if (inv.usedAt) {
        throw Object.assign(new Error("INVITE_USED"), {
          status: 410,
          commerceId: commerceIdEarly,
        });
      }
      const exp = inv.expiresAt?.toDate?.() ?? new Date(0);
      if (exp.getTime() <= Date.now()) {
        throw Object.assign(new Error("INVITE_EXPIRED"), {
          status: 410,
          commerceId: commerceIdEarly,
        });
      }
      if (inv.role !== "provider" && inv.role !== "reception") {
        throw Object.assign(new Error("INVITE_BAD"), {
          status: 404,
          commerceId: commerceIdEarly,
        });
      }

      const commerceId = inv.commerceId;
      const memberId = commerceMemberDocId(uid, commerceId);
      const memberRef = db.collection("commerce_members").doc(memberId);
      const memSnap = await tx.get(memberRef);
      if (memSnap.exists) {
        throw Object.assign(new Error("ALREADY_MEMBER"), {
          status: 409,
          commerceId,
        });
      }

      if (inv.role === "reception") {
        tx.set(memberRef, {
          userId: uid,
          commerceId,
          role: "reception",
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.update(inviteRef, {
          usedAt: FieldValue.serverTimestamp(),
          usedByUid: uid,
        });
        return { commerceId, role: "reception" as const };
      }

      const staffId = inv.staffId!;
      const staffRef = db.collection("staff").doc(staffId);
      const stSnap = await tx.get(staffRef);
      if (!stSnap.exists) {
        throw Object.assign(new Error("STAFF_MISSING"), {
          status: 404,
          commerceId,
        });
      }
      const st = stSnap.data()!;
      if (st.commerceId !== commerceId) {
        throw Object.assign(new Error("STAFF_MISMATCH"), {
          status: 404,
          commerceId,
        });
      }
      const existingUid = st.userId;
      if (typeof existingUid === "string" && existingUid.length > 0) {
        throw Object.assign(new Error("STAFF_TAKEN"), {
          status: 409,
          commerceId,
        });
      }

      tx.set(memberRef, {
        userId: uid,
        commerceId,
        role: "provider",
        staffId,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(staffRef, { userId: uid });
      tx.update(inviteRef, {
        usedAt: FieldValue.serverTimestamp(),
        usedByUid: uid,
      });
      return { commerceId, role: "provider" as const };
    });

    return { ok: true, commerceId: out.commerceId, role: out.role };
  } catch (e: unknown) {
    const code =
      typeof e === "object" &&
      e !== null &&
      "message" in e &&
      typeof (e as { message: unknown }).message === "string"
        ? (e as { message: string }).message
        : "";
    const status =
      typeof e === "object" &&
      e !== null &&
      "status" in e &&
      typeof (e as { status: unknown }).status === "number"
        ? (e as { status: number }).status
        : 500;

    const map: Record<string, string> = {
      INVITE_NOT_FOUND: "Este enlace no es válido.",
      INVITE_USED: "Este enlace ya fue usado.",
      INVITE_EXPIRED: "Este enlace venció. Pedí uno nuevo al comercio.",
      INVITE_BAD: "Este enlace no es válido.",
      ALREADY_MEMBER: "Tu cuenta ya pertenece a este comercio.",
      STAFF_MISSING: "El perfil de prestador ya no existe.",
      STAFF_MISMATCH: "El enlace no coincide con el comercio.",
      STAFF_TAKEN: "Este prestador ya tiene una cuenta vinculada.",
    };

    const commerceIdErr =
      typeof (e as { commerceId?: unknown }).commerceId === "string"
        ? (e as { commerceId: string }).commerceId
        : undefined;

    if (code in map) {
      return {
        ok: false,
        message: map[code]!,
        status,
        commerceId: commerceIdErr,
        code,
      };
    }
    if (status !== 500) {
      return {
        ok: false,
        message: "No se pudo completar la invitación.",
        status,
        commerceId: commerceIdErr,
      };
    }
    console.error("redeemCommerceInvite", e);
    return {
      ok: false,
      message: "Error interno. Intentá de nuevo más tarde.",
      status: 500,
    };
  }
}
