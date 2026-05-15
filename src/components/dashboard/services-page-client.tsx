"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import {
  getCommerceMember,
  listAllServicesByCommerce,
} from "@/lib/firebase/services";
import type { CommerceMemberRole, Service } from "@/lib/types";

type Props = { commerceId: string };

export function ServicesPageClient({ commerceId }: Props) {
  const { user } = useAuth();
  const [role, setRole] = useState<CommerceMemberRole | null>(null);
  const [ready, setReady] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [nName, setNName] = useState("");
  const [nDur, setNDur] = useState(30);
  const [nPrice, setNPrice] = useState("");
  const [nActive, setNActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const canManage = role === "owner" || role === "reception";

  const load = useCallback(async () => {
    if (!user) return;
    setReady(false);
    setError(null);
    try {
      const m = await getCommerceMember(user.uid, commerceId);
      setRole(m?.role ?? null);
      const list = await listAllServicesByCommerce(commerceId);
      setServices(list);
    } catch {
      setError("No se pudieron cargar los servicios.");
    } finally {
      setReady(true);
    }
  }, [user, commerceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createService(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canManage) return;
    setCreateErr(null);
    setCreating(true);
    try {
      const token = await user.getIdToken();
      const body: Record<string, unknown> = {
        name: nName.trim(),
        durationMinutes: nDur,
        active: nActive,
      };
      const p = nPrice.trim();
      if (p !== "") body.price = Number(p);
      const res = await fetch(`/api/commerces/${commerceId}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setCreateErr(data.error || "Error al crear.");
        return;
      }
      setNName("");
      setNDur(30);
      setNPrice("");
      setNActive(true);
      await load();
    } catch {
      setCreateErr("Error de red.");
    } finally {
      setCreating(false);
    }
  }

  if (!user || !ready) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8" aria-busy="true">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-muted" />
        </div>
        <Card>
          <CardHeader className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          </CardHeader>
        </Card>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Cargando servicios…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="px-4 py-6 text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Servicios</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Definí qué ofrece tu local y cuánto dura cada prestación. El intervalo
          base de la grilla sigue en Ajustes.
        </p>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo servicio</CardTitle>
          </CardHeader>
          <form onSubmit={createService}>
            <CardContent>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="svc-new-name">Nombre</FieldLabel>
                  <Input
                    id="svc-new-name"
                    value={nName}
                    onChange={(e) => setNName(e.target.value)}
                    required
                    maxLength={120}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="svc-new-dur">Duración (min)</FieldLabel>
                    <Input
                      id="svc-new-dur"
                      type="number"
                      min={5}
                      max={480}
                      step={5}
                      value={nDur}
                      onChange={(e) => setNDur(Number(e.target.value))}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="svc-new-price">Precio (opcional)</FieldLabel>
                    <Input
                      id="svc-new-price"
                      type="number"
                      min={0}
                      step={1}
                      value={nPrice}
                      onChange={(e) => setNPrice(e.target.value)}
                      placeholder="Ej. 5000"
                    />
                  </Field>
                </div>
                <Field orientation="horizontal">
                  <Checkbox
                    checked={nActive}
                    onCheckedChange={(v) => setNActive(v === true)}
                  />
                  <FieldLabel className="cursor-pointer">Activo</FieldLabel>
                </Field>
                {createErr ? <FieldError>{createErr}</FieldError> : null}
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={creating}>
                {creating ? "Creando…" : "Crear servicio"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Solo dueño o recepción pueden crear o editar servicios.
        </p>
      )}

      <ul className="space-y-4">
        {services.map((s) => (
          <li key={s.id}>
            <ServiceRow
              service={s}
              commerceId={commerceId}
              canManage={canManage}
              onSaved={load}
            />
          </li>
        ))}
      </ul>
      {services.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center sm:flex-row sm:text-left">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Package className="size-6" aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="font-medium">Todavía no cargaste servicios</p>
              <p className="text-sm text-muted-foreground">
                {canManage
                  ? "Creá el primero con el formulario de arriba para que aparezcan en la agenda y en la reserva pública."
                  : "El dueño o recepción puede dar de alta servicios desde esta misma pantalla."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ServiceRow({
  service,
  commerceId,
  canManage,
  onSaved,
}: {
  service: Service;
  commerceId: string;
  canManage: boolean;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(service.name);
  const [dur, setDur] = useState(service.durationMinutes);
  const [price, setPrice] = useState(
    service.price != null ? String(service.price) : ""
  );
  const [active, setActive] = useState(service.active);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(service.name);
    setDur(service.durationMinutes);
    setPrice(service.price != null ? String(service.price) : "");
    setActive(service.active);
  }, [service]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canManage) return;
    setErr(null);
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const body: Record<string, unknown> = {
        name: name.trim(),
        durationMinutes: dur,
        active,
      };
      const pt = price.trim();
      if (pt === "") body.price = null;
      else body.price = Number(pt);
      const res = await fetch(
        `/api/commerces/${commerceId}/services/${service.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error || "Error al guardar.");
        return;
      }
      onSaved();
    } catch {
      setErr("Error de red.");
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{service.name}</CardTitle>
          <CardDescription>
            {service.durationMinutes} min
            {service.price != null ? ` · $${service.price}` : ""}
            {!service.active ? " · Inactivo" : ""}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={save}>
        <CardHeader>
          <CardTitle className="text-base">{service.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor={`svc-name-${service.id}`}>Nombre</FieldLabel>
              <Input
                id={`svc-name-${service.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`svc-dur-${service.id}`}>
                  Duración (min)
                </FieldLabel>
                <Input
                  id={`svc-dur-${service.id}`}
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={dur}
                  onChange={(e) => setDur(Number(e.target.value))}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`svc-price-${service.id}`}>
                  Precio (vacío = sin precio)
                </FieldLabel>
                <Input
                  id={`svc-price-${service.id}`}
                  type="number"
                  min={0}
                  step={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </Field>
            </div>
            <Field orientation="horizontal">
              <Checkbox
                checked={active}
                onCheckedChange={(v) => setActive(v === true)}
              />
              <FieldLabel className="cursor-pointer">Activo</FieldLabel>
            </Field>
            {err ? <FieldError>{err}</FieldError> : null}
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={saving} size="sm">
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
