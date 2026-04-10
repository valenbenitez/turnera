import { getFirestore } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAdminApp } from "@/lib/firebase/admin";
import { redeemCommerceInvite } from "@/lib/server/commerce-invite";
import { requireBearerUid } from "@/lib/server/firebase-bearer-auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const { token: rawToken } = await context.params;
  const token = rawToken.trim().toLowerCase();
  const uidOrRes = await requireBearerUid(request);
  if (uidOrRes instanceof NextResponse) return uidOrRes;

  const db = getFirestore(getAdminApp());
  const result = await redeemCommerceInvite(db, token, uidOrRes);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.message,
        ...(result.code ? { code: result.code } : {}),
        ...(result.commerceId ? { commerceId: result.commerceId } : {}),
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    commerceId: result.commerceId,
    role: result.role,
  });
}
