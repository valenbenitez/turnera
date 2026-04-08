"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";

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
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Reservar turno</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Este comercio aún no tiene servicios activos para reservar online.
        </p>
      </div>
    );
  }

  const staffLocked = Boolean(initialStaffSlug) && staffOk;

  return (
    <div className="mx-auto min-h-full max-w-lg space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Reservar turno</h1>
        <p className="mt-1 text-sm text-muted-foreground">{commerce.name}</p>
      </div>

      {done ? (
        <Card>
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
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Servicio</CardTitle>
            </CardHeader>
            <CardContent>
              <Field>
                <FieldLabel htmlFor="book-service">Elegí un servicio</FieldLabel>
                <select
                  id="book-service"
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Prestador</CardTitle>
              </CardHeader>
              <CardContent>
                <Field>
                  <FieldLabel htmlFor="book-staff">Quién te atiende</FieldLabel>
                  <select
                    id="book-staff"
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Día</CardTitle>
              </CardHeader>
              <CardContent>
                <Field>
                  <FieldLabel htmlFor="book-date">Fecha</FieldLabel>
                  <Input
                    id="book-date"
                    type="date"
                    min={dateBounds.min}
                    max={dateBounds.max}
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    required
                  />
                </Field>
              </CardContent>
            </Card>
          ) : null}

          {serviceId && staffOk && dateStr ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Horario</CardTitle>
                <CardDescription>
                  Horarios en zona {commerce.timezone}
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
                            "rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted"
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
          ) : null}

          {selectedSlotIso ? (
            <Card>
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
          ) : null}
        </form>
      )}
    </div>
  );
}
