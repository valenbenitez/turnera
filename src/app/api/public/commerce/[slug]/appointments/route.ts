import { createHash, randomBytes } from "node:crypto";

import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";

import { intervalsOverlap } from "@/lib/booking/intervals";
import {
  assertSlotAllowedForStaffService,
  buildAvailableSlotStartsUtc,
} from "@/lib/booking/slots";
import { getAdminApp } from "@/lib/firebase/admin";
import {
  adminGetCommerceBySlug,
  adminGetService,
  adminGetStaff,
  adminListAppointmentsForStaffDayUtc,
} from "@/lib/server/public-booking-data";
import {
  assertCustomerEmail,
  assertCustomerName,
  assertCustomerPhone,
  normalizeCustomerEmail,
} from "@/lib/validation/public-booking";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

function customerDocId(commerceId: string, emailLower: string): string {
  const h = createHash("sha256")
    .update(`${commerceId}|${emailLower}`)
    .digest("hex")
    .slice(0, 32);
  return `cust_${h}`;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, context: Ctx) {
  const { slug } = await context.params;
  const commerce = await adminGetCommerceBySlug(slug);
  if (!commerce || !commerce.active) {
    return jsonError("Comercio no disponible.", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Cuerpo inválido.", 400);
  }

  if (!body || typeof body !== "object") {
    return jsonError("Cuerpo inválido.", 400);
  }

  const b = body as Record<string, unknown>;
  const staffId = typeof b.staffId === "string" ? b.staffId : "";
  const serviceId = typeof b.serviceId === "string" ? b.serviceId : "";
  const startRaw = typeof b.start === "string" ? b.start : "";
  const cust = b.customer;

  if (!staffId || !serviceId || !startRaw) {
    return jsonError("staffId, serviceId y start (ISO) son obligatorios.", 400);
  }

  if (!cust || typeof cust !== "object") {
    return jsonError("Datos del cliente obligatorios.", 400);
  }

  const c = cust as Record<string, unknown>;
  const name = typeof c.name === "string" ? c.name : "";
  const phone = typeof c.phone === "string" ? c.phone : "";
  const email = typeof c.email === "string" ? c.email : "";

  const en = assertCustomerName(name);
  if (en) return jsonError(en, 400);
  const ep = assertCustomerPhone(phone);
  if (ep) return jsonError(ep, 400);
  const ee = assertCustomerEmail(email);
  if (ee) return jsonError(ee, 400);

  const emailLower = normalizeCustomerEmail(email);

  const [staff, service] = await Promise.all([
    adminGetStaff(staffId),
    adminGetService(serviceId),
  ]);

  if (
    !staff ||
    !service ||
    staff.commerceId !== commerce.id ||
    service.commerceId !== commerce.id
  ) {
    return jsonError("Datos inválidos.", 400);
  }

  if (!assertSlotAllowedForStaffService(staff, service)) {
    return jsonError("Este prestador no ofrece ese servicio.", 400);
  }

  const startMs = Date.parse(startRaw);
  if (Number.isNaN(startMs)) {
    return jsonError("Fecha/hora de inicio inválida.", 400);
  }

  const endMs = startMs + service.durationMinutes * 60_000;

  const dayStartZ = DateTime.fromMillis(startMs, { zone: "utc" })
    .setZone(commerce.timezone)
    .startOf("day");
  const dateStr = dayStartZ.toISODate();
  if (!dateStr) {
    return jsonError("No se pudo calcular el día del turno.", 400);
  }
  const dayEndExclusiveZ = dayStartZ.plus({ days: 1 });

  const existing = await adminListAppointmentsForStaffDayUtc(
    staffId,
    dayStartZ.toUTC().toJSDate(),
    dayEndExclusiveZ.toUTC().toJSDate()
  );

  const allowed = buildAvailableSlotStartsUtc({
    timezone: commerce.timezone,
    commerceWorkingHours: commerce.workingHours,
    staffWorkingHours: staff.workingHours,
    slotDurationMinutes: commerce.slotDurationMinutes,
    serviceDurationMinutes: service.durationMinutes,
    dateStr,
    minHoursBeforeBooking: commerce.minHoursBeforeBooking,
    maxDaysInAdvance: commerce.maxDaysInAdvance,
    nowUtc: new Date(),
    existing,
  });

  if (!allowed.includes(startMs)) {
    return jsonError("Ese horario ya no está disponible.", 409);
  }

  const db = getFirestore(getAdminApp());
  const custRef = db.collection("customers").doc(customerDocId(commerce.id, emailLower));
  const apptRef = db.collection("appointments").doc();
  const token = randomBytes(24).toString("base64url");
  const tokenRef = db.collection("booking_tokens").doc(token);

  try {
    await db.runTransaction(async (t) => {
      const overlapSnap = await t.get(
        db
          .collection("appointments")
          .where("staffId", "==", staffId)
          .where("status", "==", "confirmed")
          .where("start", ">=", Timestamp.fromDate(dayStartZ.toUTC().toJSDate()))
          .where(
            "start",
            "<",
            Timestamp.fromDate(dayEndExclusiveZ.toUTC().toJSDate())
          )
      );

      for (const doc of overlapSnap.docs) {
        const d = doc.data();
        const st = (d.start as Timestamp).toMillis();
        const en0 = (d.end as Timestamp).toMillis();
        if (intervalsOverlap(startMs, endMs, st, en0)) {
          throw new Error("CONFLICT");
        }
      }

      const custSnap = await t.get(custRef);
      const now = FieldValue.serverTimestamp();
      if (!custSnap.exists) {
        t.set(custRef, {
          commerceId: commerce.id,
          name: name.trim(),
          phone: phone.trim().replace(/\s+/g, ""),
          email: email.trim(),
          emailLowercase: emailLower,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        t.update(custRef, {
          name: name.trim(),
          phone: phone.trim().replace(/\s+/g, ""),
          email: email.trim(),
          emailLowercase: emailLower,
          updatedAt: now,
        });
      }

      t.set(apptRef, {
        commerceId: commerce.id,
        serviceId,
        staffId,
        customerId: custRef.id,
        start: Timestamp.fromMillis(startMs),
        end: Timestamp.fromMillis(endMs),
        customerName: name.trim(),
        contact: phone.trim().replace(/\s+/g, ""),
        customerEmail: emailLower,
        status: "confirmed",
        createdAt: now,
      });

      t.set(tokenRef, {
        appointmentId: apptRef.id,
        commerceId: commerce.id,
        createdAt: now,
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "CONFLICT") {
      return jsonError("Ese horario ya fue reservado.", 409);
    }
    throw e;
  }

  return NextResponse.json({
    appointmentId: apptRef.id,
    manageToken: token,
    managePath: `/book/manage/${token}`,
  });
}
