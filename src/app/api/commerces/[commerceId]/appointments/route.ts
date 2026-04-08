import { getFirestore, Timestamp, type Query } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import { getAdminApp } from "@/lib/firebase/admin";
import { requireAgendaAccess } from "@/lib/server/agenda-access";
import { agendaDayUtcBounds, isValidAgendaDateParam } from "@/lib/server/agenda-day";
import { jsonError } from "@/lib/server/catalog-auth";
import {
  adminGetCommerceById,
  adminGetService,
  adminGetStaff,
} from "@/lib/server/public-booking-data";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ commerceId: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const { commerceId } = await context.params;

  const auth = await requireAgendaAccess(request, commerceId);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const dateStr = url.searchParams.get("date") ?? "";
  if (!isValidAgendaDateParam(dateStr)) {
    return jsonError("Parámetro date obligatorio (YYYY-MM-DD).", 400);
  }

  const commerce = await adminGetCommerceById(commerceId);
  if (!commerce) {
    return jsonError("Comercio no encontrado", 404);
  }

  const bounds = agendaDayUtcBounds(dateStr, commerce.timezone);
  if (!bounds) {
    return jsonError("Fecha inválida para la zona del comercio.", 400);
  }

  let filterStaffId: string | undefined;
  if (auth.scopeStaffId) {
    filterStaffId = auth.scopeStaffId;
  } else {
    const q = url.searchParams.get("staffId")?.trim();
    if (q) {
      const st = await adminGetStaff(q);
      if (!st || st.commerceId !== commerceId) {
        return jsonError("Profesional inválido.", 400);
      }
      filterStaffId = q;
    }
  }

  const db = getFirestore(getAdminApp());
  let qRef: Query = db
    .collection("appointments")
    .where("commerceId", "==", commerceId)
    .where("start", ">=", Timestamp.fromDate(bounds.fromUtc))
    .where("start", "<", Timestamp.fromDate(bounds.toExclusiveUtc));

  if (filterStaffId) {
    qRef = qRef.where("staffId", "==", filterStaffId);
  }

  const snap = await qRef.orderBy("start", "asc").get();

  const serviceIds = new Set<string>();
  const staffIds = new Set<string>();
  for (const doc of snap.docs) {
    const d = doc.data();
    if (typeof d.serviceId === "string") serviceIds.add(d.serviceId);
    if (typeof d.staffId === "string") staffIds.add(d.staffId);
  }

  const [serviceEntries, staffEntries] = await Promise.all([
    Promise.all(
      [...serviceIds].map(async (id) => {
        const s = await adminGetService(id);
        return [id, s?.name ?? "Servicio"] as const;
      })
    ),
    Promise.all(
      [...staffIds].map(async (id) => {
        const s = await adminGetStaff(id);
        return [id, s?.name ?? "Profesional"] as const;
      })
    ),
  ]);

  const serviceNameById = new Map(serviceEntries);
  const staffNameById = new Map(staffEntries);

  const appointments = snap.docs.map((doc) => {
    const d = doc.data();
    const startTs = d.start as Timestamp | undefined;
    const endTs = d.end as Timestamp | undefined;
    const serviceId = typeof d.serviceId === "string" ? d.serviceId : "";
    const staffId = typeof d.staffId === "string" ? d.staffId : "";
    return {
      id: doc.id,
      start: startTs?.toDate().toISOString() ?? "",
      end: endTs?.toDate().toISOString() ?? "",
      status: d.status as string,
      customerName: typeof d.customerName === "string" ? d.customerName : "",
      contact: typeof d.contact === "string" ? d.contact : "",
      customerEmail:
        typeof d.customerEmail === "string" ? d.customerEmail : "",
      serviceId,
      serviceName: serviceNameById.get(serviceId) ?? "Servicio",
      staffId,
      staffName: staffNameById.get(staffId) ?? "Profesional",
    };
  });

  return NextResponse.json({
    date: dateStr,
    timezone: commerce.timezone,
    role: auth.membership.role,
    appointments,
  });
}
