import { getAuth } from "firebase-admin/auth";
import type { NextRequest } from "next/server";

import { getAdminApp } from "@/lib/firebase/admin";

/** Devuelve el `uid` o `null` si falta token o es inválido. */
export async function parseBearerUid(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
