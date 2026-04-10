import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ServiceAccount } from "firebase-admin/app";

/**
 * Carga el JSON del service account.
 * - Preferí `FIREBASE_SERVICE_ACCOUNT_PATH` (archivo) para evitar JSON multilínea en `.env`
 *   (dotenv solo toma la primera línea si no va entre comillas).
 * - `FIREBASE_SERVICE_ACCOUNT_KEY`: una sola línea con JSON minificado.
 */
export function loadServiceAccountJson(): ServiceAccount {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (filePath) {
    const abs = resolve(process.cwd(), filePath);
    if (!existsSync(abs)) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_PATH="${filePath}" → no existe el archivo "${abs}". Creá el JSON que descargaste de Firebase en esa ruta.`
      );
    }
    const rawFile = readFileSync(abs, "utf8");
    try {
      return JSON.parse(rawFile) as ServiceAccount;
    } catch {
      throw new Error(
        `El archivo de service account no es JSON válido: ${abs}`
      );
    }
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) {
    throw new Error(
      "Definí FIREBASE_SERVICE_ACCOUNT_PATH (ruta a un .json) o FIREBASE_SERVICE_ACCOUNT_KEY (JSON en una sola línea). No partas el JSON en varias líneas en .env sin comillas: dotenv solo lee hasta el fin de línea."
    );
  }

  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY no es JSON válido. Probablemente el JSON está cortado: usá FIREBASE_SERVICE_ACCOUNT_PATH apuntando al .json descargado de Firebase, o una sola línea en .env."
    );
  }
}
