import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";

import { getAdminApp } from "@/lib/firebase/admin";

/** Extrae el JWT del header `Authorization: Bearer <token>`. */
export function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const t = authorizationHeader.slice(7).trim();
  return t.length > 0 ? t : null;
}

export function getFirebaseAuthErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const o = error as Record<string, unknown>;
  if (typeof o.code === "string") return o.code;
  const ei = o.errorInfo;
  if (ei && typeof ei === "object" && typeof (ei as { code?: unknown }).code === "string") {
    return (ei as { code: string }).code;
  }
  return undefined;
}

function mapVerifyIdTokenError(code: string | undefined): string {
  switch (code) {
    case "auth/id-token-expired":
      return "Sesión expirada. Volvé a iniciar sesión.";
    case "auth/argument-error":
      return "Token de sesión inválido. Volvé a iniciar sesión.";
    case "auth/invalid-id-token":
    case "auth/user-disabled":
      return "Token de sesión inválido.";
    default:
      return "Token inválido";
  }
}

export type VerifyIdTokenResult =
  | { ok: true; uid: string }
  | { ok: false; message: string; code?: string };

export async function verifyFirebaseIdToken(
  token: string
): Promise<VerifyIdTokenResult> {
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return { ok: true, uid: decoded.uid };
  } catch (e: unknown) {
    const code = getFirebaseAuthErrorCode(e);
    if (process.env.NODE_ENV === "development") {
      console.error("[verifyFirebaseIdToken]", code, e);
    }
    return { ok: false, message: mapVerifyIdTokenError(code), code };
  }
}

/**
 * API routes: exige Bearer + ID token verificable con Admin SDK.
 * @returns `uid` o `NextResponse` 401 con cuerpo `{ error }`.
 */
export async function requireBearerUid(
  request: NextRequest
): Promise<string | NextResponse> {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const r = await verifyFirebaseIdToken(token);
  if (!r.ok) {
    const body: Record<string, string> = { error: r.message };
    if (process.env.NODE_ENV === "development" && r.code) {
      body.authErrorCode = r.code;
    }
    return NextResponse.json(body, { status: 401 });
  }
  return r.uid;
}
