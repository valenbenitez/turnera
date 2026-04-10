/**
 * Destino post-login/registro: solo rutas internas permitidas (anti open-redirect).
 */
export function safeAuthRedirectPath(raw: string | null): string {
  if (!raw || typeof raw !== "string") return "/dashboard";
  const p = raw.trim();
  if (!p.startsWith("/") || p.startsWith("//")) return "/dashboard";
  if (p === "/dashboard" || p.startsWith("/dashboard/")) return p;
  if (/^\/join\/[a-f0-9]{64}$/.test(p)) return p;
  return "/dashboard";
}
