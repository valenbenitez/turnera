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

type RouteContext = { params: Promise<{ commerceId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { commerceId } = await context.params;

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

  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string") {
    return jsonError("Nombre obligatorio", 400);
  }
  const nameErr = assertValidStaffName(b.name);
  if (nameErr) return jsonError(nameErr, 400);

  if (typeof b.slug !== "string") {
    return jsonError("Slug obligatorio", 400);
  }
  const slugErr = assertValidStaffSlug(b.slug);
  if (slugErr) return jsonError(slugErr, 400);
  const slug = normalizeStaffSlug(b.slug);

  const serviceIds = assertValidServiceIds(b.servicesIds);
  if (serviceIds === null) {
    return jsonError("servicesIds debe ser un array de IDs", 400);
  }

  const userResult = assertValidOptionalUserId(b.userId);
  if (!userResult.ok) return jsonError(userResult.error, 400);

  const active = typeof b.active === "boolean" ? b.active : true;

  const db = getFirestore(getAdminApp());

  const dup = await db
    .collection("staff")
    .where("commerceId", "==", commerceId)
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (!dup.empty) {
    return jsonError("Ese slug de prestador ya existe en este comercio", 409);
  }

  const okServices = await verifyServiceIdsBelongToCommerce(
    db,
    commerceId,
    serviceIds
  );
  if (!okServices) {
    return jsonError("Uno o más servicios no existen en este comercio", 400);
  }

  const ref = db.collection("staff").doc();
  const payload: Record<string, unknown> = {
    commerceId,
    slug,
    name: b.name.trim(),
    servicesIds: serviceIds,
    active,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (userResult.value) {
    payload.userId = userResult.value;
  }

  await ref.set(payload);

  return NextResponse.json({ staffId: ref.id });
}
