import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tmpDir = join(process.cwd(), "node_modules", ".tmp-sa-test");

describe("loadServiceAccountJson", () => {
  const prevPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const prevKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  beforeEach(() => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    mkdirSync(tmpDir, { recursive: true });
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    if (prevPath !== undefined) process.env.FIREBASE_SERVICE_ACCOUNT_PATH = prevPath;
    else delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (prevKey !== undefined) process.env.FIREBASE_SERVICE_ACCOUNT_KEY = prevKey;
    else delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  });

  it("lee JSON válido desde FIREBASE_SERVICE_ACCOUNT_PATH", async () => {
    const p = join(tmpDir, "sa.json");
    writeFileSync(
      p,
      JSON.stringify({
        type: "service_account",
        project_id: "p1",
        private_key:
          "-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n",
        client_email: "x@p1.iam.gserviceaccount.com",
      }),
      "utf8"
    );
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH = p;
    const { loadServiceAccountJson } = await import("./load-service-account");
    const sa = loadServiceAccountJson();
    expect(sa.projectId ?? (sa as { project_id?: string }).project_id).toBe("p1");
  });

  it("parsea FIREBASE_SERVICE_ACCOUNT_KEY en una línea", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      type: "service_account",
      project_id: "p2",
      private_key:
        "-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n",
      client_email: "x@p2.iam.gserviceaccount.com",
    });
    const { loadServiceAccountJson } = await import("./load-service-account");
    const sa = loadServiceAccountJson();
    expect(
      (sa as { project_id?: string }).project_id ?? sa.projectId
    ).toBe("p2");
  });

  it("falla con mensaje claro si la KEY es solo '{' (típico .env multilínea)", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = "{";
    const { loadServiceAccountJson } = await import("./load-service-account");
    expect(() => loadServiceAccountJson()).toThrow(/una sola línea|SERVICE_ACCOUNT_PATH/i);
  });
});
