"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  listAllServicesByCommerce,
  listAllStaffByCommerce,
} from "@/lib/firebase/services";
import type { CommerceMemberRole, Service, Staff } from "@/lib/types";

type Props = { commerceId: string };

export function StaffPageClient({ commerceId }: Props) {
  const { user } = useAuth();
  const [role, setRole] = useState<CommerceMemberRole | null>(null);
  const [ready, setReady] = useState(false);
  const [commerceSlug, setCommerceSlug] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [nName, setNName] = useState("");
  const [nSlug, setNSlug] = useState("");
  const [nIds, setNIds] = useState<Set<string>>(() => new Set());
  const [nUserId, setNUserId] = useState("");
  const [nActive, setNActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const canManage = role === "owner" || role === "reception";

  const load = useCallback(async () => {
    if (!user) return;
    setReady(false);
    setError(null);
    try {
      const [m, c, svc, st] = await Promise.all([
        getCommerceMember(user.uid, commerceId),
        getCommerceById(commerceId),
        listAllServicesByCommerce(commerceId),
        listAllStaffByCommerce(commerceId),
      ]);
      setRole(m?.role ?? null);
      setCommerceSlug(c?.slug ?? "");
      setServices(svc);
      setStaff(st);
    } catch {
      setError("No se pudieron cargar los datos.");
    } finally {
      setReady(true);
    }
  }, [user, commerceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeServices = useMemo(
    () => services.filter((s) => s.active),
    [services]
  );

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canManage) return;
    setCreateErr(null);
    setCreating(true);
    try {
      const token = await user.getIdToken();
      const body: Record<string, unknown> = {
        name: nName.trim(),
        slug: nSlug.trim().toLowerCase(),
        servicesIds: [...nIds],
        active: nActive,
      };
      const u = nUserId.trim();
      if (u) body.userId = u;
      const res = await fetch(`/api/commerces/${commerceId}/staff`, {
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
      setNSlug("");
      setNIds(new Set());
      setNUserId("");
      setNActive(true);
      await load();
    } catch {
      setCreateErr("Error de red.");
    } finally {
      setCreating(false);
    }
  }

  function toggleNewService(id: string, on: boolean) {
    setNIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  if (!user || !ready) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
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
        <h1 className="text-xl font-semibold tracking-tight">Equipo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prestadores, slug para URL pública y servicios que ofrece cada uno.
        </p>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo prestador</CardTitle>
            <CardDescription>
              URL pública:{" "}
              <span className="font-mono text-xs">
                /book/{commerceSlug || "…"}/tu-slug
              </span>
            </CardDescription>
          </CardHeader>
          <form onSubmit={createStaff}>
            <CardContent>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="st-new-name">Nombre</FieldLabel>
                  <Input
                    id="st-new-name"
                    value={nName}
                    onChange={(e) => setNName(e.target.value)}
                    required
                    maxLength={120}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="st-new-slug">Slug</FieldLabel>
                  <Input
                    id="st-new-slug"
                    value={nSlug}
                    onChange={(e) =>
                      setNSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    required
                    spellCheck={false}
                  />
                </Field>
                <Field>
                  <FieldLabel>Servicios que ofrece</FieldLabel>
                  {activeServices.length === 0 ? (
                    <FieldDescription>
                      Creá al menos un servicio activo en la pestaña Servicios.
                    </FieldDescription>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-2 rounded-lg border border-border/80 p-3">
                      {activeServices.map((s) => (
                        <li key={s.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={nIds.has(s.id)}
                            onCheckedChange={(v) =>
                              toggleNewService(s.id, v === true)
                            }
                          />
                          <span className="text-sm">
                            {s.name}{" "}
                            <span className="text-muted-foreground">
                              ({s.durationMinutes} min)
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="st-new-uid">
                    UID de Firebase (opcional)
                  </FieldLabel>
                  <Input
                    id="st-new-uid"
                    value={nUserId}
                    onChange={(e) => setNUserId(e.target.value)}
                    placeholder="Para vincular cuenta del prestador"
                    spellCheck={false}
                    autoCapitalize="none"
                  />
                  <FieldDescription>
                    Lo encontrás en la consola de Firebase Authentication.
                  </FieldDescription>
                </Field>
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
                {creating ? "Creando…" : "Crear prestador"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Solo dueño o recepción pueden crear o editar prestadores.
        </p>
      )}

      <ul className="space-y-4">
        {staff.map((st) => (
          <li key={st.id}>
            <StaffRow
              staff={st}
              commerceId={commerceId}
              commerceSlug={commerceSlug}
              services={services}
              canManage={canManage}
              onSaved={load}
            />
          </li>
        ))}
      </ul>
      {staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay prestadores todavía.
        </p>
      ) : null}
    </div>
  );
}

function StaffRow({
  staff,
  commerceId,
  commerceSlug,
  services,
  canManage,
  onSaved,
}: {
  staff: Staff;
  commerceId: string;
  commerceSlug: string;
  services: Service[];
  canManage: boolean;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(staff.name);
  const [slug, setSlug] = useState(staff.slug);
  const [ids, setIds] = useState<Set<string>>(() => new Set(staff.servicesIds));
  const [userId, setUserId] = useState(staff.userId ?? "");
  const [active, setActive] = useState(staff.active);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(staff.name);
    setSlug(staff.slug);
    setIds(new Set(staff.servicesIds));
    setUserId(staff.userId ?? "");
    setActive(staff.active);
  }, [staff]);

  const activeServices = useMemo(
    () => services.filter((s) => s.active),
    [services]
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canManage) return;
    setErr(null);
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const body: Record<string, unknown> = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        servicesIds: [...ids],
        active,
      };
      const u = userId.trim();
      body.userId = u === "" ? null : u;
      const res = await fetch(
        `/api/commerces/${commerceId}/staff/${staff.id}`,
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

  function toggle(id: string, on: boolean) {
    setIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  if (!canManage) {
    const svcNames = staff.servicesIds
      .map((id) => services.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{staff.name}</CardTitle>
          <CardDescription className="font-mono text-xs">
            /book/{commerceSlug}/{staff.slug}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Servicios: {svcNames || "—"}</p>
          {!staff.active ? <p>Inactivo</p> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={save}>
        <CardHeader>
          <CardTitle className="text-base">{staff.name}</CardTitle>
          <CardDescription className="font-mono text-xs">
            /book/{commerceSlug}/{slug}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor={`st-name-${staff.id}`}>Nombre</FieldLabel>
              <Input
                id={`st-name-${staff.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`st-slug-${staff.id}`}>Slug</FieldLabel>
              <Input
                id={`st-slug-${staff.id}`}
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                  )
                }
                required
              />
            </Field>
            <Field>
              <FieldLabel>Servicios</FieldLabel>
              <ul className="mt-2 flex flex-col gap-2 rounded-lg border border-border/80 p-3">
                {activeServices.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={ids.has(s.id)}
                      onCheckedChange={(v) => toggle(s.id, v === true)}
                    />
                    <span className="text-sm">{s.name}</span>
                  </li>
                ))}
              </ul>
            </Field>
            <Field>
              <FieldLabel htmlFor={`st-uid-${staff.id}`}>
                UID Firebase (vacío = quitar vínculo)
              </FieldLabel>
              <Input
                id={`st-uid-${staff.id}`}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                spellCheck={false}
                autoCapitalize="none"
              />
            </Field>
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
