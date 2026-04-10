import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getBearerToken,
  getFirebaseAuthErrorCode,
  requireBearerUid,
  verifyFirebaseIdToken,
} from "./firebase-bearer-auth";

const verifyIdToken = vi.fn();

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken }),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminApp: () => ({}),
}));

describe("getBearerToken", () => {
  it("devuelve null sin header", () => {
    expect(getBearerToken(null)).toBeNull();
  });

  it("devuelve null si no es Bearer", () => {
    expect(getBearerToken("Basic xxx")).toBeNull();
  });

  it("devuelve null si el token está vacío", () => {
    expect(getBearerToken("Bearer ")).toBeNull();
    expect(getBearerToken("Bearer    ")).toBeNull();
  });

  it("extrae el JWT", () => {
    expect(getBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });
});

describe("getFirebaseAuthErrorCode", () => {
  it("lee code de objetos estilo Firebase", () => {
    expect(getFirebaseAuthErrorCode({ code: "auth/id-token-expired" })).toBe(
      "auth/id-token-expired"
    );
  });

  it("lee code anidado en errorInfo (firebase-admin)", () => {
    expect(
      getFirebaseAuthErrorCode({
        errorInfo: { code: "auth/invalid-id-token", message: "x" },
      })
    ).toBe("auth/invalid-id-token");
  });

  it("devuelve undefined si no hay code", () => {
    expect(getFirebaseAuthErrorCode(new Error("x"))).toBeUndefined();
  });
});

describe("verifyFirebaseIdToken", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it("resuelve uid cuando Admin valida el token", async () => {
    verifyIdToken.mockResolvedValue({ uid: "user-1" });
    const r = await verifyFirebaseIdToken("valid.jwt");
    expect(r).toEqual({ ok: true, uid: "user-1" });
  });

  it("mapea token expirado", async () => {
    verifyIdToken.mockRejectedValue({ code: "auth/id-token-expired" });
    const r = await verifyFirebaseIdToken("expired");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/Sesión expirada/i);
      expect(r.code).toBe("auth/id-token-expired");
    }
  });

  it("mapea argument-error (típico con proyecto / token mal formado)", async () => {
    verifyIdToken.mockRejectedValue({ code: "auth/argument-error" });
    const r = await verifyFirebaseIdToken("bad");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/Volvé a iniciar sesión/i);
    }
  });

  it("usa mensaje genérico para códigos desconocidos", async () => {
    verifyIdToken.mockRejectedValue({ code: "auth/unknown" });
    const r = await verifyFirebaseIdToken("x");
    expect(r).toEqual(
      expect.objectContaining({ ok: false, message: "Token inválido" })
    );
  });
});

describe("requireBearerUid", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it("401 sin Authorization", async () => {
    const req = new NextRequest("http://localhost/api/commerces", {
      method: "POST",
    });
    const res = await requireBearerUid(req);
    expect(res).toBeInstanceOf(Response);
    const body = (await (res as Response).json()) as { error: string };
    expect((res as Response).status).toBe(401);
    expect(body.error).toMatch(/No autorizado/i);
  });

  it("401 con token inválido", async () => {
    verifyIdToken.mockRejectedValue({ code: "auth/invalid-id-token" });
    const req = new NextRequest("http://localhost/api/commerces", {
      method: "POST",
      headers: { Authorization: "Bearer bad" },
    });
    const res = await requireBearerUid(req);
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(401);
  });

  it("devuelve uid con Bearer válido", async () => {
    verifyIdToken.mockResolvedValue({ uid: "abc" });
    const req = new NextRequest("http://localhost/api/commerces", {
      method: "POST",
      headers: { Authorization: "Bearer good.token.here" },
    });
    const out = await requireBearerUid(req);
    expect(out).toBe("abc");
  });
});
