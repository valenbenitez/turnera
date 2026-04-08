"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import { getCommerceMember } from "@/lib/firebase/services";

type Props = {
  commerceId: string;
  children: React.ReactNode;
};

export function CommerceAccessGate({ commerceId, children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    (async () => {
      const member = await getCommerceMember(user.uid, commerceId);
      if (cancelled) return;
      if (!member) {
        if (!cancelled) setAllowed(false);
        router.replace("/dashboard");
        return;
      }
      if (!cancelled) setAllowed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, commerceId, router]);

  if (authLoading || allowed === null) {
    return (
      <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Comprobando acceso…</p>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
