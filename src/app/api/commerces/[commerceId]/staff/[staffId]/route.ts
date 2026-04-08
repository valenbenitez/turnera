import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  assertValidServiceIds,
  assertValidStaffName,
  assertValidStaffSlug,
  assertValidOptionalUserId,
  normalizeStaffSlug,
} from "@/lib/validation/catalog";
import {
  jsonError,
  requireCatalogManager,
} from "@/lib/server/catalog-auth";
import { verifyServiceIdsBelongToCommerce } from "@/lib/server/verify-services-in-commerce";
import { getAdminApp } from "@/lib/firebase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ commerceId: string; staffId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { commerceId, staffId } = await context.params;

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
  const ref = db.collection("staff").doc(staffId);
  const snap = await ref.get();
  if (!snap.exists) {
    return jsonError("Prestador no encontrado", 404);
  }
  if (snap.data()?.commerceId !== commerceId) {
    return jsonError("Prestador no encontrado", 404);
  }

  const b = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (typeof b.name === "string") {
    const err = assertValidStaffName(b.name);
    if (err) return jsonError(err, 400);
    updates.name = b.name.trim();
  }

  if (typeof b.slug === "string") {
    const err = assertValidStaffSlug(b.slug);
    if (err) return jsonError(err, 400);
    const slug = normalizeStaffSlug(b.slug);
    if (slug !== snap.data()?.slug) {
      const dup = await db
        .collection("staff")
        .where("commerceId", "==", commerceId)
        .where("slug", "==", slug)
        .limit(1)
        .get();
      if (!dup.empty && dup.docs[0].id !== staffId) {
        return jsonError("Ese slug de prestador ya existe en este comercio", 409);
      }
    }
    updates.slug = slug;
  }

  if (b.servicesIds !== undefined) {
    const ids = assertValidServiceIds(b.servicesIds);
    if (ids === null) {
      return jsonError("servicesIds debe ser un array de IDs", 400);
    }
    const ok = await verifyServiceIdsBelongToCommerce(db, commerceId, ids);
    if (!ok) {
      return jsonError("Uno o más servicios no existen en este comercio", 400);
    }
    updates.servicesIds = ids;
  }

  if ("userId" in b) {
    const ur = assertValidOptionalUserId(b.userId);
    if (!ur.ok) return jsonError(ur.error, 400);
    if (ur.value === null) {
      updates.userId = FieldValue.delete();
    } else {
      updates.userId = ur.value;
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
