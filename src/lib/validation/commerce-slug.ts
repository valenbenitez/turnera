const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidCommerceSlug(slug: string): boolean {
  const s = slug.trim().toLowerCase();
  if (s.length < 3 || s.length > 80) return false;
  return SLUG_RE.test(s);
}

export function normalizeCommerceSlug(slug: string): string {
  return slug.trim().toLowerCase();
}
