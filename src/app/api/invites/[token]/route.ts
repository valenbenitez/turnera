import { getFirestore } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAdminApp } from "@/lib/firebase/admin";
import {
  adminBuildInvitePreview,
  adminGetValidInvite,
} from "@/lib/server/commerce-invite";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

/** Vista pública del enlace (sin auth): nombre del comercio y tipo de invitación. */
export async function GET(_request: NextRequest, context: Ctx) {
  const { token: raw } = await context.params;
  const token = raw.trim().toLowerCase();
  const db = getFirestore(getAdminApp());
  const inv = await adminGetValidInvite(db, token);
  if (!inv) {
    return NextResponse.json(
      { error: "Enlace inválido o vencido." },
      { status: 404 }
    );
  }

  const preview = await adminBuildInvitePreview(db, inv.data);
  if (!preview) {
    return NextResponse.json(
      { error: "Enlace inválido o vencido." },
      { status: 404 }
    );
  }

  return NextResponse.json(preview);
}
