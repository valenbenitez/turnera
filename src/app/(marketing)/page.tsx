import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MarketingHomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <span className="text-lg font-semibold tracking-tight">Turnera</span>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Entrar
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-xl space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            Turnos para comercios
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Agenda pública, dashboard para tu equipo y recordatorios.
          </h1>
          <p className="text-pretty text-base text-muted-foreground sm:text-lg">
            Tus clientes reservan sin cuenta. Vos configurás servicios,
            prestadores y horarios, con zona horaria y reglas de anticipación.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full justify-center sm:w-auto"
            )}
          >
            Comenzar
          </Link>
          <Link
            href="/book/ejemplo"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "w-full justify-center sm:w-auto"
            )}
          >
            Ver demo de reserva
          </Link>
        </div>
      </main>
    </div>
  );
}
