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
  const nameErr = assertValidServiceName(b.name);
  if (nameErr) return jsonError(nameErr, 400);

  if (typeof b.durationMinutes !== "number") {
    return jsonError("durationMinutes obligatorio", 400);
  }
  const durErr = assertValidDurationMinutes(b.durationMinutes);
  if (durErr) return jsonError(durErr, 400);

  const priceResult = assertValidOptionalPrice(b.price);
  if (!priceResult.ok) return jsonError(priceResult.error, 400);

  const active =
    typeof b.active === "boolean" ? b.active : true;

  const db = getFirestore(getAdminApp());
  const ref = db.collection("services").doc();
  const payload: Record<string, unknown> = {
    commerceId,
    name: b.name.trim(),
    durationMinutes: b.durationMinutes,
    active,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (priceResult.value !== undefined) {
    payload.price = priceResult.value;
  }

  await ref.set(payload);

  return NextResponse.json({ serviceId: ref.id });
}
