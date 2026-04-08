import { NextResponse, type NextRequest } from "next/server";

import { getCommerceMemberRole } from "@/lib/server/commerce-access";
import { parseBearerUid } from "@/lib/server/verify-bearer";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Dueño o recepción: pueden CRUD servicios y staff. */
export async function requireCatalogManager(
  request: NextRequest,
  commerceId: string
): Promise<{ uid: string } | NextResponse> {
  const uid = await parseBearerUid(request);
  if (!uid) {
    return jsonError("No autorizado", 401);
  }
  const role = await getCommerceMemberRole(uid, commerceId);
  if (!role) {
    return jsonError("No encontrado", 404);
  }
  if (role !== "owner" && role !== "reception") {
    return jsonError("Solo dueño o recepción pueden gestionar servicios y equipo.", 403);
  }
  return { uid };
}
