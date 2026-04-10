import type { NextRequest } from "next/server";

import { getBearerToken, verifyFirebaseIdToken } from "@/lib/server/firebase-bearer-auth";

/** Devuelve el `uid` o `null` si falta token o es inválido. */
export async function parseBearerUid(request: NextRequest): Promise<string | null> {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) return null;
  const r = await verifyFirebaseIdToken(token);
  return r.ok ? r.uid : null;
}
