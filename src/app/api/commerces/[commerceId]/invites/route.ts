import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAdminApp } from "@/lib/firebase/admin";
import {
  COMMERCE_INVITES_COLLECTION,
  generateInviteToken,
  inviteExpiresAt,
  INVITE_DEFAULT_TTL_DAYS,
} from "@/lib/server/commerce-invite";
import { jsonError, requireCatalogManager } from "@/lib/server/catalog-auth";
import { absoluteJoinUrl } from "@/lib/server/join-url";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ commerceId: string }> };

export async function POST(request: NextRequest, context: Ctx) {
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
  const role = b.role;
  if (role !== "provider" && role !== "reception") {
    return jsonError('role debe ser "provider" o "reception".', 400);
  }

  const db = getFirestore(getAdminApp());

  if (role === "reception") {
    const token = generateInviteToken();
    const expiresAt = inviteExpiresAt(INVITE_DEFAULT_TTL_DAYS);
    await db.collection(COMMERCE_INVITES_COLLECTION).doc(token).set({
      commerceId,
      role: "reception",
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });

    return NextResponse.json({
      joinUrl: absoluteJoinUrl(request, token),
      expiresAt: expiresAt.toDate().toISOString(),
    });
  }

  const staffId = typeof b.staffId === "string" ? b.staffId.trim() : "";
  if (!staffId) {
    return jsonError("staffId obligatorio para invitar prestador.", 400);
  }

  const stRef = db.collection("staff").doc(staffId);
  const stSnap = await stRef.get();
  if (!stSnap.exists || stSnap.data()?.commerceId !== commerceId) {
    return jsonError("Prestador no encontrado.", 404);
  }

  const existingUid = stSnap.data()?.userId;
  if (typeof existingUid === "string" && existingUid.length > 0) {
    return jsonError(
      "Este prestador ya tiene cuenta vinculada. Quitá el vínculo antes de generar un enlace.",
      409
    );
  }

  const token = generateInviteToken();
  const expiresAt = inviteExpiresAt(INVITE_DEFAULT_TTL_DAYS);
  await db.collection(COMMERCE_INVITES_COLLECTION).doc(token).set({
    commerceId,
    role: "provider",
    staffId,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  return NextResponse.json({
    joinUrl: absoluteJoinUrl(request, token),
    expiresAt: expiresAt.toDate().toISOString(),
  });
}
