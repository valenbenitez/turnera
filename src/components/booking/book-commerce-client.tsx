"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";

import { BookingMonthCalendar } from "@/components/booking/booking-month-calendar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CommerceDto = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  minHoursBeforeBooking: number;
  maxDaysInAdvance: number;
  whatsappNumber: string | null;
};

type ServiceDto = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
};

type StaffDto = {
  id: string;
  name: string;
  slug: string;
  servicesIds: string[];
};

type ContextResponse = {
  commerce: CommerceDto;
  services: ServiceDto[];
  staff: StaffDto[];
};

type Props = {
  commerceSlug: string;
  initialStaffSlug?: string;
};

export function BookCommerceClient({
  commerceSlug,
  initialStaffSlug,
}: Props) {
  const [ctx, setCtx] = useState<ContextResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string>("");

  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    managePath: string;
    absoluteUrl: string;
  } | null>(null);

  const staffStepRef = useRef<HTMLDivElement>(null);
  const dayStepRef = useRef<HTMLDivElement>(null);
  const slotsStepRef = useRef<HTMLDivElement>(null);
  const customerStepRef = useRef<HTMLDivElement>(null);
  const prevBookingScroll = useRef({
    serviceId: "",
    staffId: "",
    dateStr: "",
    selectedSlotIso: "",
  });
  const prevSlotsLoading = useRef(false);

  function scrollToRef(el: HTMLElement | null) {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const res = await fetch(`/api/public/commerce/${encodeURIComponent(commerceSlug)}`);
        const data = (await res.json()) as ContextResponse & { error?: string };
        if (!res.ok) {
          if (!cancelled) setLoadError(data.error || "No se pudo cargar.");
          return;
        }
        if (!cancelled) setCtx(data);
      } catch {
        if (!cancelled) setLoadError("Error de red.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [commerceSlug]);

  useEffect(() => {
    if (!ctx || !initialStaffSlug) return;
    const st = ctx.staff.find(
      (s) => s.slug.toLowerCase() === initialStaffSlug.toLowerCase()
    );
    if (st) setStaffId(st.id);
  }, [ctx, initialStaffSlug]);

  const staffForService = useMemo(() => {
    if (!ctx || !serviceId) return [];
    return ctx.staff.filter((s) => s.servicesIds.includes(serviceId));
  }, [ctx, serviceId]);

  const staffOk = Boolean(
    staffId && staffForService.some((s) => s.id === staffId)
  );

  useEffect(() => {
    if (!ctx || !serviceId || !staffId) return;
    if (!staffForService.some((s) => s.id === staffId)) {
      setStaffId("");
    }
  }, [ctx, serviceId, staffId, staffForService]);

  const showStaffStep = Boolean(
    serviceId && staffForService.length > 0 && !staffOk
  );

  useEffect(() => {
    if (!ctx) return;
    const p = prevBookingScroll.current;
    if (serviceId === p.serviceId) return;
    const prevSvc = p.serviceId;
    if (prevSvc !== "" && serviceId !== "" && prevSvc !== serviceId) {
      p.staffId = "";
      p.dateStr = "";
      p.selectedSlotIso = "";
    }
    p.serviceId = serviceId;
    if (!serviceId) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (showStaffStep) scrollToRef(staffStepRef.current);
        else if (staffOk) scrollToRef(dayStepRef.current);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [ctx, serviceId, showStaffStep, staffOk]);

  useEffect(() => {
    if (!ctx || !serviceId || !staffId || !staffOk) return;
    const p = prevBookingScroll.current;
    if (staffId === p.staffId) return;
    p.staffId = staffId;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToRef(dayStepRef.current));
    });
    return () => cancelAnimationFrame(id);
  }, [ctx, serviceId, staffId, staffOk]);

  useEffect(() => {
    if (!ctx || !dateStr || !staffOk) return;
    const p = prevBookingScroll.current;
    if (dateStr === p.dateStr) return;
    p.dateStr = dateStr;
    const t = window.setTimeout(() => scrollToRef(slotsStepRef.current), 120);
    return () => clearTimeout(t);
  }, [ctx, dateStr, staffOk]);

  useEffect(() => {
    if (!dateStr) {
      prevSlotsLoading.current = slotsLoading;
      return;
    }
    if (slotsLoading) {
      prevSlotsLoading.current = true;
      return;
    }
    const wasLoading = prevSlotsLoading.current;
    prevSlotsLoading.current = false;
    if (wasLoading) {
      const t = window.setTimeout(() => scrollToRef(slotsStepRef.current), 80);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [dateStr, slotsLoading, slots.length]);

  useEffect(() => {
    if (!selectedSlotIso) return;
    const p = prevBookingScroll.current;
    if (selectedSlotIso === p.selectedSlotIso) return;
    p.selectedSlotIso = selectedSlotIso;
    requestAnimationFrame(() => {
      scrollToRef(customerStepRef.current);
      window.setTimeout(() => {
        document.getElementById("cust-name")?.focus();
      }, 350);
    });
  }, [selectedSlotIso]);

  const dateBounds = useMemo(() => {
    if (!ctx) return { min: "", max: "" };
    const tz = ctx.commerce.timezone;
    const today = DateTime.now().setZone(tz).toISODate();
    const max = DateTime.now()
      .setZone(tz)
      .plus({ days: ctx.commerce.maxDaysInAdvance })
      .toISODate();
    return { min: today ?? "", max: max ?? "" };
  }, [ctx]);

  useEffect(() => {
    if (!staffOk || !dateBounds.min || dateStr) return;
    setDateStr(dateBounds.min);
  }, [staffOk, dateBounds.min, dateStr]);

  useEffect(() => {
    if (!ctx || !staffOk || !dateStr) {
      setSlots([]);
      setSelectedSlotIso("");
      return;
    }
    let cancelled = false;
    (async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      setSlots([]);
      setSelectedSlotIso("");
      try {
        const q = new URLSearchParams({
          staffId,
          serviceId,
          date: dateStr,
        });
        const res = await fetch(
          `/api/public/commerce/${encodeURIComponent(commerceSlug)}/slots?${q}`
        );
        const data = (await res.json()) as { slots?: string[]; error?: string };
        if (!res.ok) {
          if (!cancelled) setSlotsError(data.error || "No se pudieron cargar horarios.");
          return;
        }
        if (!cancelled) setSlots(data.slots ?? []);
      } catch {
        if (!cancelled) setSlotsError("Error de red.");
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx, commerceSlug, staffOk, staffId, serviceId, dateStr]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ctx || !selectedSlotIso || !staffOk) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/public/commerce/${encodeURIComponent(commerceSlug)}/appointments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId,
            serviceId,
            start: selectedSlotIso,
            customer: {
              name: custName,
              phone: custPhone,
              email: custEmail,
            },
          }),
        }
      );
      const data = (await res.json()) as {
        error?: string;
        managePath?: string;
      };
      if (!res.ok) {
        setSubmitError(data.error || "No se pudo confirmar el turno.");
        return;
      }
      if (typeof window !== "undefined" && data.managePath) {
        setDone({
          managePath: data.managePath,
          absoluteUrl: `${window.location.origin}${data.managePath}`,
        });
      }
    } catch {
      setSubmitError("Error de red.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    );
  }

  if (!ctx) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  const { commerce, services } = ctx;

  if (services.length === 0) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-3xl px-2 py-10 sm:px-5 md:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">Reservar turno</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Este comercio aún no tiene servicios activos para reservar online.
        </p>
      </div>
    );
  }

  const staffLocked = Boolean(initialStaffSlug) && staffOk;

  const glassCard =
    "w-full rounded-2xl border border-slate-200/80 bg-white/92 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-zinc-800/90 dark:bg-zinc-950/82 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]";

  return (
    <div className="mx-auto min-h-full w-full min-w-0 max-w-3xl space-y-6 px-2 py-10 pb-16 sm:px-5 md:px-8">
      <header className="booking-fade-in space-y-1 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Reservá online
        </p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Reservar turno
        </h1>
        <p className="text-sm text-muted-foreground">{commerce.name}</p>
      </header>

      {done ? (
        <Card className={cn(glassCard, "booking-fade-in")}>
          <CardHeader>
            <CardTitle>Turno confirmado</CardTitle>
            <CardDescription>
              Guardá este enlace para ver o reprogramar tu turno cuando esté
              disponible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="break-all font-mono text-xs">{done.absoluteUrl}</p>
            {commerce.whatsappNumber ? (
              <a
                href={`https://wa.me/${commerce.whatsappNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "default" }),
                  "inline-flex w-full justify-center"
                )}
              >
                Contactar por WhatsApp
              </a>
            ) : null}
          </CardContent>
          <CardFooter>
            <Link href="/" className={cn(buttonVariants({ variant: "link" }), "px-0")}>
              Volver al inicio
            </Link>
          </CardFooter>
        </Card>
      ) : (
        <form onSubmit={onSubmit} className="booking-stack space-y-5">
          <Card className={glassCard}>
            <CardHeader>
              <CardTitle className="text-base">1. Servicio</CardTitle>
            </CardHeader>
            <CardContent>
              <Field>
                <FieldLabel htmlFor="book-service">Elegí un servicio</FieldLabel>
                <select
                  id="book-service"
                  className="flex h-10 w-full rounded-xl border border-slate-200/90 bg-white/95 px-3 text-sm outline-none shadow-sm transition focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-900/70"
                  value={serviceId}
                  onChange={(e) => {
                    setServiceId(e.target.value);
                    setStaffId("");
                  }}
                  required
                >
                  <option value="">—</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} min
                      {s.price != null ? ` · $${s.price}` : ""})
                    </option>
                  ))}
                </select>
              </Field>
            </CardContent>
          </Card>

          {showStaffStep ? (
            <div ref={staffStepRef} className="scroll-mt-8">
            <Card className={glassCard}>
              <CardHeader>
                <CardTitle className="text-base">2. Prestador</CardTitle>
              </CardHeader>
              <CardContent>
                <Field>
                  <FieldLabel htmlFor="book-staff">Quién te atiende</FieldLabel>
                  <select
                    id="book-staff"
                    className="flex h-10 w-full rounded-xl border border-slate-200/90 bg-white/95 px-3 text-sm outline-none shadow-sm transition focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-900/70"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    required
                  >
                    <option value="">—</option>
                    {staffForService.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </CardContent>
            </Card>
            </div>
          ) : null}

          {staffLocked && serviceId && staffOk ? (
            <p className="text-sm text-muted-foreground">
              Prestador:{" "}
              <span className="font-medium text-foreground">
                {ctx.staff.find((s) => s.id === staffId)?.name}
              </span>
            </p>
          ) : null}

          {serviceId && staffForService.length === 0 ? (
            <p className="text-sm text-destructive">
              No hay prestadores para este servicio.
            </p>
          ) : null}

          {serviceId && staffOk ? (
            <div ref={dayStepRef} className="scroll-mt-8">
            <Card className={glassCard}>
              <CardHeader>
                <CardTitle className="text-base">Día</CardTitle>
                <CardDescription>
                  Elegí una fecha disponible en el calendario.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dateBounds.min && dateBounds.max ? (
                  <BookingMonthCalendar
                    timezone={commerce.timezone}
                    minDate={dateBounds.min}
                    maxDate={dateBounds.max}
                    value={dateStr}
                    onChange={setDateStr}
                  />
                ) : null}
                {dateStr ? (
                  <p className="text-center text-xs text-muted-foreground sm:text-left">
                    Seleccionado:{" "}
                    <span className="font-medium text-foreground">
                      {DateTime.fromFormat(dateStr, "yyyy-MM-dd", {
                        zone: commerce.timezone,
                      })
                        .setLocale("es")
                        .toFormat("EEEE d 'de' LLLL")}
                    </span>
                  </p>
                ) : null}
              </CardContent>
            </Card>
            </div>
          ) : null}

          {serviceId && staffOk && dateStr ? (
            <div ref={slotsStepRef} className="scroll-mt-8">
            <Card className={glassCard}>
              <CardHeader>
                <CardTitle className="text-base">Horario</CardTitle>
                <CardDescription>
                  Zona horaria: {commerce.timezone}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {slotsLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando…</p>
                ) : slotsError ? (
                  <FieldError>{slotsError}</FieldError>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay horarios libres ese día.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((iso) => {
                      const label = DateTime.fromISO(iso, { zone: "utc" })
                        .setZone(commerce.timezone)
                        .toFormat("HH:mm");
                      const active = selectedSlotIso === iso;
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => setSelectedSlotIso(iso)}
                          className={cn(
                            "rounded-xl border px-2 py-2.5 text-sm font-medium transition-all duration-200",
                            active
                              ? "scale-[1.02] border-primary/40 bg-primary text-primary-foreground shadow-md shadow-primary/20"
                              : "border-slate-200/80 bg-white/90 shadow-sm hover:scale-[1.02] hover:border-primary/35 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/65 dark:hover:bg-zinc-800/75"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          ) : null}

          {selectedSlotIso ? (
            <div ref={customerStepRef} className="scroll-mt-8">
            <Card className={glassCard}>
              <CardHeader>
                <CardTitle className="text-base">Tus datos</CardTitle>
                <CardDescription>
                  Sin cuenta: solo usamos estos datos para el turno.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel htmlFor="cust-name">Nombre</FieldLabel>
                    <Input
                      id="cust-name"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      required
                      maxLength={120}
                      autoComplete="name"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cust-phone">Teléfono</FieldLabel>
                    <Input
                      id="cust-phone"
                      type="tel"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      required
                      autoComplete="tel"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="cust-email">Email</FieldLabel>
                    <Input
                      id="cust-email"
                      type="email"
                      inputMode="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </Field>
                  {submitError ? <FieldError>{submitError}</FieldError> : null}
                </FieldGroup>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Reservando…" : "Confirmar turno"}
                </Button>
              </CardFooter>
            </Card>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
