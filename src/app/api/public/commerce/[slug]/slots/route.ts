import { DateTime } from "luxon";
import { NextResponse } from "next/server";

import {
  assertSlotAllowedForStaffService,
  buildAvailableSlotStartsUtc,
} from "@/lib/booking/slots";
import {
  adminGetCommerceBySlug,
  adminGetService,
  adminGetStaff,
  adminListAppointmentsForStaffDayUtc,
} from "@/lib/server/public-booking-data";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request, context: Ctx) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const staffId = url.searchParams.get("staffId");
  const serviceId = url.searchParams.get("serviceId");
  const dateStr = url.searchParams.get("date");

  if (!staffId || !serviceId || !dateStr || !DATE_RE.test(dateStr)) {
    return NextResponse.json(
      { error: "Parámetros staffId, serviceId y date (YYYY-MM-DD) requeridos." },
      { status: 400 }
    );
  }

  const commerce = await adminGetCommerceBySlug(slug);
  if (!commerce || !commerce.active) {
    return NextResponse.json({ error: "Comercio no disponible." }, { status: 404 });
  }

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
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  if (!assertSlotAllowedForStaffService(staff, service)) {
    return NextResponse.json(
      { error: "Este prestador no ofrece ese servicio." },
      { status: 400 }
    );
  }

  const dayStartZ = DateTime.fromISO(dateStr, { zone: commerce.timezone }).startOf(
    "day"
  );
  if (!dayStartZ.isValid) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }
  const dayEndExclusiveZ = dayStartZ.plus({ days: 1 });

  const existing = await adminListAppointmentsForStaffDayUtc(
    staffId,
    dayStartZ.toUTC().toJSDate(),
    dayEndExclusiveZ.toUTC().toJSDate()
  );

  const slots = buildAvailableSlotStartsUtc({
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

  return NextResponse.json({
    slots: slots.map((ms) => new Date(ms).toISOString()),
  });
}
