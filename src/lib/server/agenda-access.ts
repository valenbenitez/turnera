import { NextResponse, type NextRequest } from "next/server";

import { jsonError } from "@/lib/server/catalog-auth";
import {
  getCommerceMembership,
  type CommerceMembership,
} from "@/lib/server/commerce-access";
import { parseBearerUid } from "@/lib/server/verify-bearer";

export type AgendaAccessContext = {
  uid: string;
  membership: CommerceMembership;
  /** Si está definido, solo turnos de ese staff (rol `provider`). */
  scopeStaffId?: string;
};

/**
 * Dueño, recepción o proveedor con `staffId` pueden ver la agenda.
 * Proveedor sin `staffId` → 403.
 */
export async function requireAgendaAccess(
  request: NextRequest,
  commerceId: string
): Promise<AgendaAccessContext | NextResponse> {
  const uid = await parseBearerUid(request);
  if (!uid) {
    return jsonError("No autorizado", 401);
  }

  const membership = await getCommerceMembership(uid, commerceId);
  if (!membership) {
    return jsonError("No encontrado", 404);
  }

  const { role, staffId } = membership;
  if (role === "owner" || role === "reception") {
    return { uid, membership };
  }
  if (role === "provider") {
    if (!staffId) {
      return jsonError(
        "Tu cuenta no está vinculada a un profesional del equipo.",
        403
      );
    }
    return { uid, membership, scopeStaffId: staffId };
  }

  return jsonError("No permitido", 403);
}
