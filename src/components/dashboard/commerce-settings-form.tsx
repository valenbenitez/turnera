"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import {
  getCommerceById,
  getCommerceMember,
} from "@/lib/firebase/services";
import type {
  Commerce,
  CommerceMemberRole,
  DayOfWeek,
  DaySchedule,
  WorkingHours,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

function cloneWorkingHours(wh: WorkingHours): WorkingHours {
  return JSON.parse(JSON.stringify(wh)) as WorkingHours;
}

type Props = { commerceId: string };

export function CommerceSettingsForm({ commerceId }: Props) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<CommerceMemberRole | null>(null);
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [active, setActive] = useState(true);
  const [timezone, setTimezone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [minHours, setMinHours] = useState(2);
  const [maxDays, setMaxDays] = useState(30);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setReady(false);
    setLoadError(null);
    try {
      const [m, c] = await Promise.all([
        getCommerceMember(user.uid, commerceId),
        getCommerceById(commerceId),
      ]);
      if (!m) {
        setCommerce(null);
        setLoadError("No tenés acceso a este comercio.");
        return;
      }
      setRole(m.role);
      if (!c) {
        setCommerce(null);
        setLoadError("No se encontró el comercio.");
        return;
      }
      setCommerce(c);
      setName(c.name);
      setSlug(c.slug);
      setActive(c.active);
      setTimezone(c.timezone);
      setWhatsapp(c.whatsappNumber ?? "");
      setMinHours(c.minHoursBeforeBooking);
      setMaxDays(c.maxDaysInAdvance);
      setSlotMinutes(c.slotDurationMinutes);
      setWorkingHours(cloneWorkingHours(c.workingHours));
    } catch {
      setLoadError("Error al cargar datos.");
    } finally {
      setReady(true);
    }
  }, [user, commerceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function updateDay(key: DayOfWeek, patch: Partial<DaySchedule>) {
    setWorkingHours((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: { ...prev[key], ...patch },
      };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || role !== "owner" || !workingHours) return;
    setSaveError(null);
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/commerces/${commerceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          active,
          timezone: timezone.trim(),
          whatsappNumber: whatsapp.trim() || null,
          minHoursBeforeBooking: minHours,
          maxDaysInAdvance: maxDays,
          slotDurationMinutes: slotMinutes,
          workingHours,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaveError(data.error || "No se pudo guardar.");
        return;
      }
      await refresh();
    } catch {
      setSaveError("Error de red. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (!user || (!ready && !loadError)) {
    return (
      <p className="text-sm text-muted-foreground">Cargando configuración…</p>
    );
  }

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    );
  }

  if (!commerce || workingHours === null || workingHours === undefined) {
    return (
      <p className="text-sm text-muted-foreground">Cargando configuración…</p>
    );
  }

  if (role !== "owner") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>
            Solo el rol <strong>owner</strong> puede modificar estos datos. Tu
            rol: <span className="capitalize">{role}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Nombre:</span>{" "}
            {commerce.name}
          </p>
          <p>
            <span className="text-muted-foreground">Slug público:</span>{" "}
            <span className="font-mono text-xs">/book/{commerce.slug}</span>
          </p>
          <Link
            href={`/book/${commerce.slug}`}
            className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}
          >
            Ver página de reserva
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {commerce.name}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            /book/{slug}
          </p>
        </div>
        <Link
          href={`/book/${slug}`}
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "w-full shrink-0 sm:w-auto"
          )}
        >
          Abrir reserva pública
        </Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Nombre, URL y visibilidad.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="settings-name">Nombre del comercio</FieldLabel>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  required
                  maxLength={120}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-slug">Slug (URL)</FieldLabel>
                <Input
                  id="settings-slug"
                  value={slug}
                  onChange={(ev) =>
                    setSlug(
                      ev.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  required
                  spellCheck={false}
                  autoCapitalize="none"
                />
                <FieldDescription>
                  Solo minúsculas, números y guiones. Cambiar el slug cambia el
                  enlace público.
                </FieldDescription>
              </Field>
              <Field orientation="horizontal">
                <Checkbox
                  checked={active}
                  onCheckedChange={(v) => setActive(v === true)}
                />
                <div className="space-y-1">
                  <FieldLabel className="cursor-pointer">Comercio activo</FieldLabel>
                  <FieldDescription>
                    Cuando exista el flujo público, un comercio inactivo puede
                    ocultar reservas.
                  </FieldDescription>
                </div>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto y agenda</CardTitle>
            <CardDescription>
              Zona horaria, WhatsApp y reglas de anticipación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="settings-tz">Zona horaria (IANA)</FieldLabel>
                <Input
                  id="settings-tz"
                  value={timezone}
                  onChange={(ev) => setTimezone(ev.target.value)}
                  required
                  spellCheck={false}
                  placeholder="America/Argentina/Buenos_Aires"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-wa">WhatsApp (opcional)</FieldLabel>
                <Input
                  id="settings-wa"
                  type="tel"
                  value={whatsapp}
                  onChange={(ev) => setWhatsapp(ev.target.value)}
                  placeholder="+54911..."
                />
                <FieldDescription>
                  Dejalo vacío para quitar. Formato con código de país.
                </FieldDescription>
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="settings-minh">
                    Anticipación mínima (h)
                  </FieldLabel>
                  <Input
                    id="settings-minh"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={168}
                    step={1}
                    value={minHours}
                    onChange={(ev) => setMinHours(Number(ev.target.value))}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="settings-maxd">
                    Días máx. adelante
                  </FieldLabel>
                  <Input
                    id="settings-maxd"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={365}
                    step={1}
                    value={maxDays}
                    onChange={(ev) => setMaxDays(Number(ev.target.value))}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="settings-slot">
                    Slot base (min)
                  </FieldLabel>
                  <Input
                    id="settings-slot"
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={480}
                    step={5}
                    value={slotMinutes}
                    onChange={(ev) => setSlotMinutes(Number(ev.target.value))}
                    required
                  />
                  <FieldDescription>Múltiplo de 5.</FieldDescription>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horario del comercio</CardTitle>
            <CardDescription>
              Horario base; luego cada prestador podrá ajustar el suyo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-4">
              {DAYS.map(({ key, label }) => {
                const d = workingHours[key];
                return (
                  <li
                    key={key}
                    className="rounded-lg border border-border/80 p-3 sm:p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <Field
                        orientation="horizontal"
                        className="sm:min-w-[140px]"
                      >
                        <Checkbox
                          checked={d.enabled}
                          onCheckedChange={(v) =>
                            updateDay(key, { enabled: v === true })
                          }
                        />
                        <FieldLabel className="cursor-pointer font-medium">
                          {label}
                        </FieldLabel>
                      </Field>
                      <div className="flex flex-1 flex-wrap items-end gap-3">
                        <Field className="min-w-[7rem] flex-1">
                          <FieldLabel className="text-xs">Desde</FieldLabel>
                          <Input
                            type="time"
                            value={d.start}
                            disabled={!d.enabled}
                            onChange={(ev) =>
                              updateDay(key, { start: ev.target.value })
                            }
                          />
                        </Field>
                        <Field className="min-w-[7rem] flex-1">
                          <FieldLabel className="text-xs">Hasta</FieldLabel>
                          <Input
                            type="time"
                            value={d.end}
                            disabled={!d.enabled}
                            onChange={(ev) =>
                              updateDay(key, { end: ev.target.value })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
          <CardFooter className="flex-col gap-3 border-t sm:flex-row sm:justify-between">
            {saveError ? (
              <FieldError className="sm:mr-auto">{saveError}</FieldError>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
