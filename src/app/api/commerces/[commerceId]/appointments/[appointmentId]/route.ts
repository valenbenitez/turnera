import { getFirestore } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import { getAdminApp } from "@/lib/firebase/admin";
import { requireAgendaAccess } from "@/lib/server/agenda-access";
import { jsonError } from "@/lib/server/catalog-auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ commerceId: string; appointmentId: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const { commerceId, appointmentId } = await context.params;

  const auth = await requireAgendaAccess(request, commerceId);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Cuerpo inválido", 400);
  }

  if (!body || typeof body !== "object") {
    return jsonError("Cuerpo inválido", 400);
  }

  const status = (body as Record<string, unknown>).status;
  if (status !== "cancelled") {
    return jsonError('Solo se admite status: "cancelled".', 400);
  }

  const db = getFirestore(getAdminApp());
  const ref = db.collection("appointments").doc(appointmentId);
  const snap = await ref.get();
  if (!snap.exists) {
    return jsonError("Turno no encontrado", 404);
  }

  const d = snap.data()!;
  if (d.commerceId !== commerceId) {
    return jsonError("Turno no encontrado", 404);
  }

  if (auth.scopeStaffId && d.staffId !== auth.scopeStaffId) {
    return jsonError("No autorizado", 403);
  }

  if (d.status !== "confirmed") {
    return jsonError("Este turno ya no se puede cancelar.", 409);
  }

  await ref.update({ status: "cancelled" });

  return NextResponse.json({ ok: true });
}
