import type { NextRequest } from "next/server";

/** URL pública absoluta para `/join/{token}`. */
export function absoluteJoinUrl(request: NextRequest, token: string): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const path = `/join/${token}`;
  if (env) return `${env}${path}`;
  return new URL(path, request.url).toString();
}
