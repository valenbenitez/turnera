const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertCustomerName(name: string): string | null {
  const n = name.trim();
  if (n.length < 1 || n.length > 120) {
    return "El nombre debe tener entre 1 y 120 caracteres.";
  }
  return null;
}

export function assertCustomerPhone(phone: string): string | null {
  const p = phone.trim().replace(/\s+/g, "");
  if (p.length < 8 || p.length > 24) {
    return "Ingresá un teléfono válido.";
  }
  if (!/^\+?[0-9][0-9-]{6,22}$/.test(p)) {
    return "Ingresá un teléfono válido.";
  }
  return null;
}

export function assertCustomerEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  if (e.length < 3 || e.length > 254) return "Email inválido.";
  if (!EMAIL_RE.test(e)) return "Email inválido.";
  return null;
}

export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}
