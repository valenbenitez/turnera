import { Suspense } from "react";
import Link from "next/link";

import { RegisterForm } from "./register-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function RegisterFallback() {
  return (
    <p className="text-center text-sm text-muted-foreground">Cargando…</p>
  );
}

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<RegisterFallback />}>
        <RegisterForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className={cn(buttonVariants({ variant: "link" }), "p-0")}>
          Volver al inicio
        </Link>
      </p>
    </div>
  );
}
