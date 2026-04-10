import { NextResponse, type NextRequest } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { createNewCommerceFields } from "@/lib/commerce-defaults";
import { commerceMemberDocId } from "@/lib/commerce-member-id";
import { getAdminApp } from "@/lib/firebase/admin";
import { requireBearerUid } from "@/lib/server/firebase-bearer-auth";
import {
  isValidCommerceSlug,
  normalizeCommerceSlug,
} from "@/lib/validation/commerce-slug";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const uidOrRes = await requireBearerUid(request);
  if (uidOrRes instanceof NextResponse) return uidOrRes;
  const uid = uidOrRes;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Cuerpo inválido", 400);
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { name?: unknown }).name !== "string" ||
    typeof (body as { slug?: unknown }).slug !== "string"
  ) {
    return jsonError("Nombre y slug son obligatorios", 400);
  }

  const name = (body as { name: string }).name.trim();
  const slugRaw = (body as { slug: string }).slug;
  const slug = normalizeCommerceSlug(slugRaw);

  if (name.length < 1 || name.length > 120) {
    return jsonError("El nombre debe tener entre 1 y 120 caracteres", 400);
  }

  if (!isValidCommerceSlug(slug)) {
    return jsonError(
      "El slug solo puede tener letras minúsculas, números y guiones (3–80 caracteres)",
      400
    );
  }

  const db = getFirestore(getAdminApp());
  const dup = await db
    .collection("commerces")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (!dup.empty) {
    return jsonError("Ese slug ya está en uso", 409);
  }

  const commerceRef = db.collection("commerces").doc();
  const memberId = commerceMemberDocId(uid, commerceRef.id);
  const memberRef = db.collection("commerce_members").doc(memberId);

  const fields = createNewCommerceFields({ name, slug });

  const batch = db.batch();
  batch.set(commerceRef, {
    ...fields,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(memberRef, {
    userId: uid,
    commerceId: commerceRef.id,
    role: "owner",
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return NextResponse.json({
    commerceId: commerceRef.id,
    memberId,
  });
}
