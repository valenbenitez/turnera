import { DateTime } from "luxon";

import { sendTransactionalHtmlEmail } from "@/lib/email/resend";
import { adminResolveCommerceBookingNotifyEmail } from "@/lib/server/commerce-owner-email";
import type { Commerce, Service, Staff } from "@/lib/types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolvePublicOrigin(request: Request): string {
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (envBase) return envBase;
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

function absoluteUrl(request: Request, path: string): string {
  const origin = resolvePublicOrigin(request);
  const p = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${p}` : p;
}

function formatRangeEs(
  startMs: number,
  endMs: number,
  timezone: string
): string {
  const start = DateTime.fromMillis(startMs, { zone: "utc" }).setZone(timezone);
  const end = DateTime.fromMillis(endMs, { zone: "utc" }).setZone(timezone);
  const datePart = start.setLocale("es").toFormat("cccc d 'de' LLLL yyyy");
  const t0 = start.toFormat("HH:mm");
  const t1 = end.toFormat("HH:mm");
  return `${datePart}, de ${t0} a ${t1}`;
}

function commerceNewBookingHtml(params: {
  commerceName: string;
  serviceName: string;
  staffName: string;
  whenLabel: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  manageUrl: string;
  agendaUrl: string;
}): string {
  const {
    commerceName,
    serviceName,
    staffName,
    whenLabel,
    customerName,
    customerEmail,
    customerPhone,
    manageUrl,
    agendaUrl,
  } = params;
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>Nueva reserva en <strong>${escapeHtml(commerceName)}</strong>.</p>
  <table style="border-collapse: collapse; margin: 1rem 0;">
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Servicio</td><td>${escapeHtml(serviceName)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Prestador</td><td>${escapeHtml(staffName)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Fecha y hora</td><td>${escapeHtml(whenLabel)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Cliente</td><td>${escapeHtml(customerName)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Email</td><td>${escapeHtml(customerEmail)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Teléfono</td><td>${escapeHtml(customerPhone)}</td></tr>
  </table>
  <p><a href="${escapeHtml(manageUrl)}" style="color: #2563eb;">Enlace de gestión del cliente (cancelar / ver)</a></p>
  <p><a href="${escapeHtml(agendaUrl)}" style="color: #2563eb;">Abrir agenda en el panel</a></p>
  <p style="font-size: 0.9rem; color: #666;">Si los enlaces no funcionan, copiá y pegá en el navegador:<br />
  <span style="word-break: break-all;">${escapeHtml(manageUrl)}</span></p>
</body>
</html>`.trim();
}

export type PublicBookingEmailPayload = {
  request: Request;
  commerce: Commerce;
  service: Service;
  staff: Staff;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startMs: number;
  endMs: number;
  managePath: string;
};

/**
 * Aviso al comercio por nueva reserva pública (Resend). No lanza; errores solo en consola.
 */
export async function notifyAfterPublicBooking(
  payload: PublicBookingEmailPayload
): Promise<void> {
  const {
    request,
    commerce,
    service,
    staff,
    customerName,
    customerEmail,
    customerPhone,
    startMs,
    endMs,
    managePath,
  } = payload;

  const whenLabel = formatRangeEs(startMs, endMs, commerce.timezone);
  const manageUrl = absoluteUrl(request, managePath);
  const agendaUrl = absoluteUrl(request, `/dashboard/${commerce.id}/agenda`);

  try {
    const notifyTo = await adminResolveCommerceBookingNotifyEmail(commerce);
    if (!notifyTo) {
      console.warn(
        "[turnera/email] Sin email para avisar nueva reserva: definí `bookingNotifyEmail` en el comercio o asegurate de tener un owner con email en su perfil.",
        { commerceId: commerce.id }
      );
      return;
    }

    await sendTransactionalHtmlEmail({
      to: notifyTo,
      subject: `Nueva reserva — ${commerce.name}`,
      html: commerceNewBookingHtml({
        commerceName: commerce.name,
        serviceName: service.name,
        staffName: staff.name,
        whenLabel,
        customerName,
        customerEmail,
        customerPhone,
        manageUrl,
        agendaUrl,
      }),
      logContext: "booking-commerce",
    });
  } catch (e) {
    console.error("[turnera/email] booking-commerce", e);
  }
}
