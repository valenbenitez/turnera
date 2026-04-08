import { Suspense, type ReactNode } from "react";

import { RequireAuth } from "@/components/auth/require-auth";
import { AuthProvider } from "@/contexts/auth-context";

function AuthFallback() {
  return (
    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Cargando sesión…</p>
    </div>
  );
}

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Suspense fallback={<AuthFallback />}>
        <RequireAuth>{children}</RequireAuth>
      </Suspense>
    </AuthProvider>
  );
}
