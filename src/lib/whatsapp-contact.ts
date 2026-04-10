/**
 * Arma `https://wa.me/...` desde el teléfono guardado en el turno (formato libre).
 * Heurística AR: 10 dígitos que empiezan con 11 → prefijo 549 (móvil).
 */
export function whatsappWebUrlFromContact(contact: string): string | null {
  const raw = contact.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;

  let n = digits.replace(/^0+/, "");
  if (n.length < 8) return null;

  if (n.startsWith("54")) {
    return `https://wa.me/${n}`;
  }

  if (n.length === 10 && n.startsWith("11")) {
    return `https://wa.me/549${n}`;
  }

  if (n.length >= 8 && n.length <= 15) {
    return `https://wa.me/${n}`;
  }

  return null;
}
