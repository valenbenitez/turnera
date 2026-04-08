import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "./login-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function LoginFallback() {
  return (
    <p className="text-center text-sm text-muted-foreground">Cargando…</p>
  );
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className={cn(buttonVariants({ variant: "link" }), "p-0")}>
          Volver al inicio
        </Link>
      </p>
    </div>
  );
}
