import { Resend } from "resend";

let client: Resend | null | undefined;

/**
 * Cliente Resend (solo servidor). Sin API key no instancia; los envíos se omiten sin romper el flujo.
 */
export function getResendClient(): Resend | null {
  if (client !== undefined) return client;
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    client = null;
    return null;
  }
  client = new Resend(key);
  return client;
}

export function getResendFromAddress(): string | null {
  const from = process.env.RESEND_FROM?.trim();
  return from && from.length > 0 ? from : null;
}

let warnedDevConfig = false;

/** En desarrollo, avisa una vez si faltan variables (sin exponer secretos). */
export function warnResendConfigOnceInDev(): void {
  if (process.env.NODE_ENV !== "development" || warnedDevConfig) return;
  warnedDevConfig = true;
  const hasKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasFrom = Boolean(process.env.RESEND_FROM?.trim());
  if (!hasKey || !hasFrom) {
    console.warn(
      "[turnera/email] Resend no configurado:",
      [!hasKey && "RESEND_API_KEY", !hasFrom && "RESEND_FROM"]
        .filter(Boolean)
        .join(", ") || "(revisá .env)"
    );
  }
}

export async function sendTransactionalHtmlEmail(params: {
  to: string;
  subject: string;
  html: string;
  /** Etiqueta para logs (ej. booking-customer) */
  logContext: string;
}): Promise<void> {
  warnResendConfigOnceInDev();
  const resend = getResendClient();
  const from = getResendFromAddress();
  if (!resend || !from) {
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error("[turnera/email]", params.logContext, error);
    }
  } catch (e) {
    console.error("[turnera/email]", params.logContext, e);
  }
}
