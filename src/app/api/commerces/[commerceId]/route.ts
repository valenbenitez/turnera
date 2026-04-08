import { NextResponse, type NextRequest } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

import { getAdminApp } from "@/lib/firebase/admin";
import {
  isValidTimezoneIANA,
  parseWorkingHours,
  sanitizeWhatsappNumber,
} from "@/lib/validation/commerce-settings";
import {
  isValidCommerceSlug,
  normalizeCommerceSlug,
} from "@/lib/validation/commerce-slug";
import { getCommerceMemberRole } from "@/lib/server/commerce-access";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ commerceId: string }> };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function requireOwner(
  request: NextRequest,
  commerceId: string
): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonError("No autorizado", 401);
  }
  const token = authHeader.slice(7);
  let uid: string;
  try {
    const adminAuth = getAuth(getAdminApp());
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return jsonError("Token inválido", 401);
  }

  const role = await getCommerceMemberRole(uid, commerceId);
  if (!role) {
    return jsonError("No encontrado", 404);
  }
  if (role !== "owner") {
    return jsonError("Solo el dueño puede editar la configuración del comercio", 403);
  }

  return null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { commerceId } = await context.params;

  const authError = await requireOwner(request, commerceId);
  if (authError) return authError;

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
  const db = getFirestore(getAdminApp());
  const ref = db.collection("commerces").doc(commerceId);
  const snap = await ref.get();
  if (!snap.exists) {
    return jsonError("Comercio no encontrado", 404);
  }

  const current = snap.data()!;
  const updates: Record<string, unknown> = {};

  if (typeof b.name === "string") {
    const name = b.name.trim();
    if (name.length < 1 || name.length > 120) {
      return jsonError("El nombre debe tener entre 1 y 120 caracteres", 400);
    }
    updates.name = name;
  }

  if (typeof b.slug === "string") {
    const slug = normalizeCommerceSlug(b.slug);
    if (!isValidCommerceSlug(slug)) {
      return jsonError(
        "Slug inválido: solo minúsculas, números y guiones (3–80 caracteres)",
        400
      );
    }
    if (slug !== current.slug) {
      const dup = await db
        .collection("commerces")
        .where("slug", "==", slug)
        .limit(1)
        .get();
      if (!dup.empty && dup.docs[0].id !== commerceId) {
        return jsonError("Ese slug ya está en uso", 409);
      }
    }
    updates.slug = slug;
  }

  if (typeof b.timezone === "string") {
    const tz = b.timezone.trim();
    if (!isValidTimezoneIANA(tz)) {
      return jsonError("Zona horaria no válida", 400);
    }
    updates.timezone = tz;
  }

  if ("whatsappNumber" in b) {
    if (b.whatsappNumber === null || b.whatsappNumber === "") {
      updates.whatsappNumber = FieldValue.delete();
    } else if (typeof b.whatsappNumber === "string") {
      const w = sanitizeWhatsappNumber(b.whatsappNumber);
      if (b.whatsappNumber.trim() && w === null) {
        return jsonError("Número de WhatsApp no válido", 400);
      }
      if (w === null) {
        updates.whatsappNumber = FieldValue.delete();
      } else {
        updates.whatsappNumber = w;
      }
    } else {
      return jsonError("whatsappNumber inválido", 400);
    }
  }

  if (typeof b.active === "boolean") {
    updates.active = b.active;
  }

  if (typeof b.minHoursBeforeBooking === "number") {
    if (!Number.isInteger(b.minHoursBeforeBooking)) {
      return jsonError("minHoursBeforeBooking debe ser un entero entre 0 y 168", 400);
    }
    if (b.minHoursBeforeBooking < 0 || b.minHoursBeforeBooking > 168) {
      return jsonError("minHoursBeforeBooking debe ser un entero entre 0 y 168", 400);
    }
    updates.minHoursBeforeBooking = b.minHoursBeforeBooking;
  }

  if (typeof b.maxDaysInAdvance === "number") {
    if (!Number.isInteger(b.maxDaysInAdvance)) {
      return jsonError("maxDaysInAdvance debe ser un entero entre 1 y 365", 400);
    }
    if (b.maxDaysInAdvance < 1 || b.maxDaysInAdvance > 365) {
      return jsonError("maxDaysInAdvance debe ser un entero entre 1 y 365", 400);
    }
    updates.maxDaysInAdvance = b.maxDaysInAdvance;
  }

  if (typeof b.slotDurationMinutes === "number") {
    if (!Number.isInteger(b.slotDurationMinutes)) {
      return jsonError(
        "slotDurationMinutes debe ser un entero entre 5 y 480, múltiplo de 5",
        400
      );
    }
    if (
      b.slotDurationMinutes < 5 ||
      b.slotDurationMinutes > 480 ||
      b.slotDurationMinutes % 5 !== 0
    ) {
      return jsonError(
        "slotDurationMinutes debe ser un entero entre 5 y 480, múltiplo de 5",
        400
      );
    }
    updates.slotDurationMinutes = b.slotDurationMinutes;
  }

  if (b.workingHours !== undefined) {
    const wh = parseWorkingHours(b.workingHours);
    if (!wh) {
      return jsonError("workingHours inválido", 400);
    }
    updates.workingHours = wh;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No hay cambios para aplicar", 400);
  }

  await ref.update(updates);

  return NextResponse.json({ ok: true });
}
