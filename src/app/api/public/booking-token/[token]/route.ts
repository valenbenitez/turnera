import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { getAdminApp } from "@/lib/firebase/admin";
import {
  adminGetService,
  adminGetStaff,
} from "@/lib/server/public-booking-data";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { token } = await context.params;
  if (!token || token.length > 200) {
    return Response.json({ error: "Token inválido." }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const tokSnap = await db.collection("booking_tokens").doc(token).get();
  if (!tokSnap.exists) {
    return Response.json({ error: "Enlace inválido o vencido." }, { status: 404 });
  }

  const { appointmentId, commerceId } = tokSnap.data() as {
    appointmentId: string;
    commerceId: string;
  };

  const apptSnap = await db.collection("appointments").doc(appointmentId).get();
  if (!apptSnap.exists) {
    return Response.json({ error: "Turno no encontrado." }, { status: 404 });
  }

  const a = apptSnap.data()!;
  if (a.commerceId !== commerceId) {
    return Response.json({ error: "Datos inconsistentes." }, { status: 404 });
  }

  const commSnap = await db.collection("commerces").doc(commerceId).get();
  const comm = commSnap.data();

  const [service, staff] = await Promise.all([
    adminGetService(a.serviceId as string),
    adminGetStaff(a.staffId as string),
  ]);

  const start = (a.start as Timestamp).toDate().toISOString();
  const end = (a.end as Timestamp).toDate().toISOString();

  return Response.json({
    appointmentId,
    status: a.status as string,
    start,
    end,
    timezone: (comm?.timezone as string) ?? "UTC",
    commerceName: (comm?.name as string) ?? "",
    commerceSlug: (comm?.slug as string) ?? "",
    serviceName: service?.name ?? "",
    staffName: staff?.name ?? "",
    customerName: a.customerName as string,
  });
}
