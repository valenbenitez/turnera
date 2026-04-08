import { NextResponse } from "next/server";

import {
  adminGetCommerceBySlug,
  adminListServicesForPublic,
  adminListStaffForPublic,
} from "@/lib/server/public-booking-data";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { slug } = await context.params;
  const commerce = await adminGetCommerceBySlug(slug);
  if (!commerce || !commerce.active) {
    return NextResponse.json({ error: "Comercio no disponible." }, { status: 404 });
  }

  const [services, staff] = await Promise.all([
    adminListServicesForPublic(commerce.id),
    adminListStaffForPublic(commerce.id),
  ]);

  return NextResponse.json({
    commerce: {
      id: commerce.id,
      name: commerce.name,
      slug: commerce.slug,
      timezone: commerce.timezone,
      minHoursBeforeBooking: commerce.minHoursBeforeBooking,
      maxDaysInAdvance: commerce.maxDaysInAdvance,
      whatsappNumber: commerce.whatsappNumber ?? null,
    },
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      durationMinutes: s.durationMinutes,
      price: s.price ?? null,
    })),
    staff: staff.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      servicesIds: s.servicesIds,
    })),
  });
}
