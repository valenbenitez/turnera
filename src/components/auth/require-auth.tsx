"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (user) return;
    const from = pathname || "/dashboard";
    router.replace(`/login?from=${encodeURIComponent(from)}`);
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Cargando sesión…</p>
      </div>
    );
  }

  return <>{children}</>;
}
