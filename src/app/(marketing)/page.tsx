import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Calendar,
  LayoutDashboard,
  Bell,
  MessageCircle,
  ArrowRight,
  Eye,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Reserva pública",
    desc: "Tus clientes reservan desde cualquier dispositivo, sin registrarse ni descargar apps. Compartí el link y ellos eligen servicio, prestador y horario.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard para tu equipo",
    desc: "Administrá servicios, prestadores y horarios desde un panel central. Cada miembro de tu equipo puede tener su propio acceso con roles.",
  },
  {
    icon: Bell,
    title: "Recordatorios automáticos",
    desc: "Olvidate de las cancelaciones de último momento. Enviamos recordatorios automáticos a tus clientes para que no se olviden de su turno.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp integrado",
    desc: "Tus clientes te contactan al instante desde la página de reserva con un solo clic. Sin perder tiempo buscando el número.",
  },
];

export default function MarketingHomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="relative border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute -top-24 right-0 size-[30rem] rounded-full bg-gradient-to-br from-muted-foreground/5 to-transparent blur-3xl" />
          <div className="absolute -bottom-32 -left-16 size-[25rem] rounded-full bg-gradient-to-tr from-muted-foreground/5 to-transparent blur-3xl" />
        </div>
        <div className="mx-auto flex w-full max-w-5xl flex-col justify-center gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
          <div className="booking-fade-in max-w-xl space-y-4">
            <p className="inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              Turnos para comercios
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Tu negocio siempre abierto para reservar
            </h1>
            <p className="text-pretty text-base text-muted-foreground sm:text-lg">
              Agenda pública online, dashboard para tu equipo y recordatorios
              automáticos. Tus clientes reservan sin cuenta y sin comisiones.
            </p>
          </div>
          <div
            className="booking-fade-in flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "0.1s" }}
          >
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full justify-center gap-2 sm:w-auto"
              )}
            >
              Comenzar gratis
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/book/ejemplo"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "w-full justify-center gap-2 sm:w-auto"
              )}
            >
              <Eye className="size-4" />
              Ver demo de reserva
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <div className="booking-fade-in mx-auto mb-12 max-w-2xl text-center sm:mb-16">
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Todo lo que necesitás para gestionar tus turnos
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Sin comisiones, sin porcentajes. Una herramienta simple para que
              tu negocio funcione mejor.
            </p>
          </div>
          <div className="booking-stack grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group rounded-2xl border bg-white/90 p-6 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_-16px_rgba(15,23,42,0.12)]"
              >
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="mb-2 font-medium tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Turnera
          </span>
          <nav className="flex gap-6 text-sm">
            <Link
              href="/"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Inicio
            </Link>
            <Link
              href="/login"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Registrarse
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
