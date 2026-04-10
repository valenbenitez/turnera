"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "turnera_onboarding_done_v1:";

type Step = {
  title: string;
  body: string;
  /** `data-tour` del elemento a resaltar; null = solo modal centrado */
  target: string | null;
};

const STEPS: Step[] = [
  {
    title: "Configurá tu negocio",
    body: "Te mostramos en qué orden conviene completar datos: identidad, contacto, horarios, servicios, equipo y agenda.",
    target: null,
  },
  {
    title: "Identidad y visibilidad",
    body: "Nombre, URL pública (/book/…) y si el comercio está activo para que los clientes puedan reservar.",
    target: "tour-general",
  },
  {
    title: "Contacto y reglas",
    body: "Zona horaria, WhatsApp opcional y cuánta anticipación pedís para reservar.",
    target: "tour-contact",
  },
  {
    title: "Horarios base",
    body: "Definí el horario del local; cada profesional puede ajustar el suyo después.",
    target: "tour-hours",
  },
  {
    title: "Guardá los cambios",
    body: "Tocá Guardar para aplicar la configuración antes de seguir.",
    target: "tour-save",
  },
  {
    title: "Servicios",
    body: "En la pestaña Servicios cargá qué ofrecés, duración y precio.",
    target: "tour-nav-services",
  },
  {
    title: "Equipo",
    body: "Agregá prestadores y vinculá servicios para que aparezcan en la reserva pública.",
    target: "tour-nav-staff",
  },
  {
    title: "Agenda",
    body: "Acá ves los turnos del día. Es la vista principal para el día a día.",
    target: "tour-nav-agenda",
  },
  {
    title: "Reserva pública",
    body: "Compartí este enlace con tus clientes o probalo vos mismo.",
    target: "tour-public-book",
  },
];

type Props = {
  commerceId: string;
  /** Viene de ?onboarding=1 tras crear el comercio */
  startFromQuery: boolean;
};

export function CommerceOnboardingTour({
  commerceId,
  startFromQuery,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const storageKey = `${STORAGE_PREFIX}${commerceId}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(storageKey) === "1";
    if (startFromQuery && !done) {
      setOpen(true);
      setStep(0);
    }
  }, [startFromQuery, storageKey]);

  const clearHighlight = useCallback(() => {
    document
      .querySelectorAll("[data-tour-highlight]")
      .forEach((el) => {
        el.removeAttribute("data-tour-highlight");
      });
  }, []);

  useEffect(() => {
    if (!open) {
      clearHighlight();
      return;
    }
    const t = STEPS[step]?.target;
    clearHighlight();
    if (!t) return;
    const id = window.setTimeout(() => {
      const el = document.querySelector(`[data-tour="${t}"]`);
      if (el instanceof HTMLElement) {
        el.setAttribute("data-tour-highlight", "true");
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 120);
    return () => {
      clearTimeout(id);
      clearHighlight();
    };
  }, [open, step, clearHighlight]);

  const finish = useCallback(() => {
    localStorage.setItem(storageKey, "1");
    setOpen(false);
    clearHighlight();
    router.replace(`/dashboard/${commerceId}`, { scroll: false });
  }, [commerceId, router, storageKey, clearHighlight]);

  if (!open) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Cerrar tour"
        onClick={finish}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border border-white/25 bg-white/85 p-5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/90",
          "booking-fade-in"
        )}
      >
        <p className="text-xs font-medium text-muted-foreground">
          Paso {step + 1} de {STEPS.length}
        </p>
        <h2
          id="tour-title"
          className="mt-1 text-lg font-semibold tracking-tight"
        >
          {s.title}
        </h2>
        <p id="tour-desc" className="mt-2 text-sm text-muted-foreground">
          {s.body}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={finish}>
            Omitir
          </Button>
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep((x) => Math.max(0, x - 1))}
            >
              Atrás
            </Button>
          ) : null}
          {last ? (
            <Button type="button" size="sm" onClick={finish}>
              Listo
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setStep((x) => Math.min(STEPS.length - 1, x + 1))}
            >
              Siguiente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
