"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import { getCommerceMember } from "@/lib/firebase/services";

type Props = { commerceId: string };

/**
 * Los prestadores (`role === provider`) solo deben usar la agenda de su comercio.
 */
export function ProviderRouteGuard({ commerceId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    (async () => {
      const member = await getCommerceMember(user.uid, commerceId);
      if (cancelled || !member || member.role !== "provider") return;

      const agendaPath = `/dashboard/${commerceId}/agenda`;
      if (pathname === agendaPath || pathname.startsWith(`${agendaPath}/`)) {
        return;
      }

      const base = `/dashboard/${commerceId}`;
      const blocked =
        pathname === base ||
        pathname.startsWith(`${base}/services`) ||
        pathname.startsWith(`${base}/staff`);

      if (blocked) {
        router.replace(agendaPath);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, commerceId, pathname, router]);

  return null;
}
