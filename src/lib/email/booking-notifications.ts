import { DateTime } from "luxon";

import { sendTransactionalHtmlEmail } from "@/lib/email/resend";
import { adminGetCommerceOwnerEmail } from "@/lib/server/commerce-owner-email";
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

function manageBookingAbsoluteUrl(request: Request, managePath: string): string {
  const origin = resolvePublicOrigin(request);
  const path = managePath.startsWith("/") ? managePath : `/${managePath}`;
  return origin ? `${origin}${path}` : path;
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

function customerConfirmationHtml(params: {
  commerceName: string;
  serviceName: string;
  staffName: string;
  whenLabel: string;
  manageUrl: string;
  customerName: string;
}): string {
  const {
    commerceName,
    serviceName,
    staffName,
    whenLabel,
    manageUrl,
    customerName,
  } = params;
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>Hola ${escapeHtml(customerName)},</p>
  <p>Tu reserva en <strong>${escapeHtml(commerceName)}</strong> quedó confirmada.</p>
  <table style="border-collapse: collapse; margin: 1rem 0;">
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Servicio</td><td>${escapeHtml(serviceName)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Prestador</td><td>${escapeHtml(staffName)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">Fecha y hora</td><td>${escapeHtml(whenLabel)}</td></tr>
  </table>
  <p><a href="${escapeHtml(manageUrl)}" style="color: #2563eb;">Gestionar o cancelar mi reserva</a></p>
  <p style="font-size: 0.9rem; color: #666;">Si el enlace no funciona, copiá y pegá esta dirección en el navegador:<br />
  <span style="word-break: break-all;">${escapeHtml(manageUrl)}</span></p>
</body>
</html>`.trim();
}

function ownerNewBookingHtml(params: {
  commerceName: string;
  serviceName: string;
  staffName: string;
  whenLabel: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}): string {
  const {
    commerceName,
    serviceName,
    staffName,
    whenLabel,
    customerName,
    customerEmail,
    customerPhone,
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
 * Correos tras una reserva pública exitosa. No lanza; errores solo en consola.
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
  const manageUrl = manageBookingAbsoluteUrl(request, managePath);

  await sendTransactionalHtmlEmail({
    to: customerEmail,
    subject: `Reserva confirmada — ${commerce.name}`,
    html: customerConfirmationHtml({
      commerceName: commerce.name,
      serviceName: service.name,
      staffName: staff.name,
      whenLabel,
      manageUrl,
      customerName,
    }),
    logContext: "booking-customer",
  });

  try {
    const ownerEmail = await adminGetCommerceOwnerEmail(commerce.id);
    if (!ownerEmail) {
      // TODO: notificar al comercio cuando haya email de contacto en el documento del comercio
      return;
    }
    if (ownerEmail.toLowerCase() === customerEmail.toLowerCase()) {
      return;
    }
    await sendTransactionalHtmlEmail({
      to: ownerEmail,
      subject: `Nueva reserva — ${commerce.name}`,
      html: ownerNewBookingHtml({
        commerceName: commerce.name,
        serviceName: service.name,
        staffName: staff.name,
        whenLabel,
        customerName,
        customerEmail,
        customerPhone,
      }),
      logContext: "booking-owner",
    });
  } catch (e) {
    console.error("[turnera/email] booking-owner", e);
  }
}
