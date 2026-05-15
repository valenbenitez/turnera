import { describe, expect, it } from "vitest";

import {
  canGenerateProviderInvite,
  formatInviteCopiedMessage,
  joinInvitePostAuthHint,
  joinInviteRoleSummary,
  OWNER_PROVIDER_FLOW,
  OWNER_RECEPTION_FLOW,
  providerInviteDisabledReason,
  STAFF_INVITE_TTL_DAYS,
} from "./staff-invite-flow";

describe("staff-invite-flow", () => {
  it("OWNER flows mention TTL days", () => {
    const joined = [
      ...OWNER_PROVIDER_FLOW.steps,
      ...OWNER_RECEPTION_FLOW.steps,
    ].join(" ");
    expect(joined).toContain(String(STAFF_INVITE_TTL_DAYS));
  });

  it("formatInviteCopiedMessage for reception with expiry", () => {
    const msg = formatInviteCopiedMessage({
      role: "reception",
      expiresAt: "2030-06-15T12:00:00.000Z",
    });
    expect(msg).toContain("Enlace de recepción copiado");
    expect(msg).toContain("Vence el");
  });

  it("formatInviteCopiedMessage for provider without expiry", () => {
    const msg = formatInviteCopiedMessage({
      role: "provider",
      staffName: "Ana",
    });
    expect(msg).toBe("Enlace para Ana copiado al portapapeles.");
  });

  it("canGenerateProviderInvite", () => {
    expect(canGenerateProviderInvite({})).toBe(true);
    expect(canGenerateProviderInvite({ userId: "" })).toBe(true);
    expect(canGenerateProviderInvite({ userId: "uid-abc" })).toBe(false);
  });

  it("providerInviteDisabledReason", () => {
    expect(providerInviteDisabledReason({})).toBeNull();
    expect(providerInviteDisabledReason({ userId: "x" })).toMatch(/vinculada/i);
  });

  it("joinInviteRoleSummary", () => {
    expect(
      joinInviteRoleSummary({
        role: "reception",
        commerceName: "Peluquería",
      })
    ).toContain("recepción");
    expect(
      joinInviteRoleSummary({
        role: "provider",
        commerceName: "Peluquería",
        staffName: "Juan",
      })
    ).toContain("Juan");
  });

  it("joinInvitePostAuthHint", () => {
    expect(joinInvitePostAuthHint("reception")).toMatch(/agenda completa/i);
    expect(joinInvitePostAuthHint("provider")).toMatch(/prestador/i);
  });
});
