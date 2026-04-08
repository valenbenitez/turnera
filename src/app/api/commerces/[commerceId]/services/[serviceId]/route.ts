import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  assertValidDurationMinutes,
  assertValidOptionalPrice,
  assertValidServiceName,
} from "@/lib/validation/catalog";
import {
  jsonError,
  requireCatalogManager,
} from "@/lib/server/catalog-auth";
import { getAdminApp } from "@/lib/firebase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ commerceId: string; serviceId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { commerceId, serviceId } = await context.params;

  const auth = await requireCatalogManager(request, commerceId);
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

  const db = getFirestore(getAdminApp());
  const ref = db.collection("services").doc(serviceId);
  const snap = await ref.get();
  if (!snap.exists) {
    return jsonError("Servicio no encontrado", 404);
  }
  if (snap.data()?.commerceId !== commerceId) {
    return jsonError("Servicio no encontrado", 404);
  }

  const b = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (typeof b.name === "string") {
    const err = assertValidServiceName(b.name);
    if (err) return jsonError(err, 400);
    updates.name = b.name.trim();
  }

  if (typeof b.durationMinutes === "number") {
    const err = assertValidDurationMinutes(b.durationMinutes);
    if (err) return jsonError(err, 400);
    updates.durationMinutes = b.durationMinutes;
  }

  if ("price" in b) {
    const pr = assertValidOptionalPrice(b.price);
    if (!pr.ok) return jsonError(pr.error, 400);
    if (pr.value === undefined) {
      updates.price = FieldValue.delete();
    } else {
      updates.price = pr.value;
    }
  }

  if (typeof b.active === "boolean") {
    updates.active = b.active;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No hay cambios", 400);
  }

  await ref.update(updates);
  return NextResponse.json({ ok: true });
}
