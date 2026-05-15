/** Días de validez del enlace (debe coincidir con INVITE_DEFAULT_TTL_DAYS en servidor). */
export const STAFF_INVITE_TTL_DAYS = 7;

export type StaffInviteRole = "provider" | "reception";

export type StaffFlowSection = {
  title: string;
  steps: readonly string[];
};

export const OWNER_PROVIDER_FLOW: StaffFlowSection = {
  title: "Agregar un prestador",
  steps: [
    "Creá el perfil abajo (nombre, slug y servicios que ofrece).",
    `En la tarjeta del prestador, tocá «Copiar enlace de invitación» (válido ${STAFF_INVITE_TTL_DAYS} días, un solo uso).`,
    "Compartilo por WhatsApp, email o el canal que prefieras.",
    "La persona crea cuenta o inicia sesión; al aceptar entra al panel con su agenda.",
  ],
};

export const OWNER_RECEPTION_FLOW: StaffFlowSection = {
  title: "Agregar recepción",
  steps: [
    `Generá el enlace de recepción (válido ${STAFF_INVITE_TTL_DAYS} días, un solo uso).`,
    "Compartilo con quien atiende el mostrador o coordina turnos.",
    "Al aceptar, verá la agenda de todo el equipo y podrá gestionar turnos.",
  ],
};

export const JOIN_INVITE_STEPS: readonly string[] = [
  "Este enlace es personal: no lo reenvíes a otras personas.",
  "Creá una cuenta nueva o iniciá sesión con tu email.",
  "Al entrar, te vinculamos automáticamente y abrís el panel del comercio.",
];

export function formatInviteCopiedMessage(params: {
  role: StaffInviteRole;
  staffName?: string;
  expiresAt?: string;
}): string {
  const base =
    params.role === "reception"
      ? "Enlace de recepción copiado"
      : `Enlace para ${params.staffName?.trim() || "el prestador"} copiado`;

  if (!params.expiresAt) {
    return `${base} al portapapeles.`;
  }

  const exp = new Date(params.expiresAt).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  return `${base}. Vence el ${exp}.`;
}

export function canGenerateProviderInvite(staff: {
  userId?: string | null;
}): boolean {
  return !(typeof staff.userId === "string" && staff.userId.length > 0);
}

export function providerInviteDisabledReason(staff: {
  userId?: string | null;
}): string | null {
  if (canGenerateProviderInvite(staff)) return null;
  return "Ya hay una cuenta vinculada. Vacía el UID manual para generar un enlace nuevo.";
}

export function joinInviteRoleSummary(preview: {
  role: StaffInviteRole;
  commerceName: string;
  staffName?: string;
}): string {
  if (preview.role === "reception") {
    return `Te invitan a ${preview.commerceName} como recepción: vas a ver la agenda de todo el equipo y gestionar turnos.`;
  }
  const name = preview.staffName?.trim() || "tu perfil";
  return `Te invitan a ${preview.commerceName} como prestador (${name}): vas a ver solo tu agenda en este comercio.`;
}

export function joinInvitePostAuthHint(role: StaffInviteRole): string {
  if (role === "reception") {
    return "Al confirmar, entrás al panel con la agenda completa del comercio.";
  }
  return "Al confirmar, entrás al panel con tu agenda de prestador.";
}
