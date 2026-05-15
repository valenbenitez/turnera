"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";

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
import {
  formatInviteCopiedMessage,
  OWNER_PROVIDER_FLOW,
  OWNER_RECEPTION_FLOW,
  providerInviteDisabledReason,
  type StaffFlowSection,
} from "@/lib/dashboard/staff-invite-flow";
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
  const [inviteHint, setInviteHint] = useState<string | null>(null);
  const [receptionInviting, setReceptionInviting] = useState(false);

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

  async function copyReceptionInviteLink() {
    if (!user || !canManage) return;
    setInviteHint(null);
    setReceptionInviting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/commerces/${commerceId}/invites`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reception" }),
      });
      const data = (await res.json()) as {
        error?: string;
        joinUrl?: string;
        expiresAt?: string;
      };
      if (!res.ok) {
        setInviteHint(data.error || "No se pudo generar el enlace.");
        return;
      }
      if (data.joinUrl) {
        await navigator.clipboard.writeText(data.joinUrl);
        setInviteHint(
          formatInviteCopiedMessage({
            role: "reception",
            expiresAt: data.expiresAt,
          })
        );
      }
    } catch {
      setInviteHint("Error de red.");
    } finally {
      setReceptionInviting(false);
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
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8" aria-busy="true">
        <div className="space-y-2">
          <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-muted" />
        </div>
        <Card>
          <CardHeader className="space-y-2">
            <div className="h-5 w-56 animate-pulse rounded-md bg-muted" />
            <div className="h-16 animate-pulse rounded-md bg-muted" />
          </CardHeader>
        </Card>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Cargando equipo…
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
        <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Cada prestador tiene su link de reserva pública. Para que accedan al panel,
          compartí un enlace de invitación. La recepción ve la agenda de todo el equipo.
        </p>
      </div>

      {canManage ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Cómo agregar al equipo</CardTitle>
            <CardDescription>
              Dos roles distintos: prestador (su agenda) y recepción (agenda completa).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <StaffFlowSteps section={OWNER_PROVIDER_FLOW} />
            <StaffFlowSteps section={OWNER_RECEPTION_FLOW} />
          </CardContent>
        </Card>
      ) : null}

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Invitar recepción</CardTitle>
            <CardDescription>
              Enlace de un solo uso para quien coordina turnos en el mostrador. Si vence o
              se usa, generá otro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              type="button"
              variant="secondary"
              disabled={receptionInviting}
              onClick={() => void copyReceptionInviteLink()}
            >
              {receptionInviting ? "Generando…" : "Copiar enlace para recepción"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {inviteHint ? (
        <p className="text-sm text-muted-foreground" role="status">
          {inviteHint}
        </p>
      ) : null}

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo prestador</CardTitle>
            <CardDescription>
              Paso 1 del flujo de prestador: creá el perfil. Después copiá su enlace de
              invitación en la lista. Reserva pública:{" "}
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
                <details className="rounded-lg border border-border/80 p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-foreground">
                    Opciones avanzadas (vincular UID manual)
                  </summary>
                  <Field className="mt-3">
                    <FieldLabel htmlFor="st-new-uid">UID de Firebase</FieldLabel>
                    <Input
                      id="st-new-uid"
                      value={nUserId}
                      onChange={(e) => setNUserId(e.target.value)}
                      placeholder="Solo si no usás invitación por enlace"
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                    <FieldDescription>
                      Recomendado: usar el enlace de invitación en la tarjeta del
                      prestador. El UID manual es para casos excepcionales.
                    </FieldDescription>
                  </Field>
                </details>
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
              onInviteMessage={setInviteHint}
            />
          </li>
        ))}
      </ul>
      {staff.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center sm:flex-row sm:text-left">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="size-6" aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="font-medium">Todavía no hay prestadores cargados</p>
              <p className="text-sm text-muted-foreground">
                {canManage
                  ? "Creá el primero con el formulario de arriba y compartí su enlace de invitación, o sumá recepción con el botón correspondiente."
                  : "Cuando el equipo esté dado de alta, vas a ver acá a cada prestador y su link de reserva."}
              </p>
            </div>
          </CardContent>
        </Card>
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
  onInviteMessage,
}: {
  staff: Staff;
  commerceId: string;
  commerceSlug: string;
  services: Service[];
  canManage: boolean;
  onSaved: () => void;
  onInviteMessage: (msg: string | null) => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(staff.name);
  const [slug, setSlug] = useState(staff.slug);
  const [ids, setIds] = useState<Set<string>>(() => new Set(staff.servicesIds));
  const [userId, setUserId] = useState(staff.userId ?? "");
  const [active, setActive] = useState(staff.active);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

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

  async function copyProviderInviteLink() {
    if (!user || !canManage) return;
    onInviteMessage(null);
    setInviting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/commerces/${commerceId}/invites`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "provider", staffId: staff.id }),
      });
      const data = (await res.json()) as {
        error?: string;
        joinUrl?: string;
        expiresAt?: string;
      };
      if (!res.ok) {
        onInviteMessage(data.error || "No se pudo generar el enlace.");
        return;
      }
      if (data.joinUrl) {
        await navigator.clipboard.writeText(data.joinUrl);
        onInviteMessage(
          formatInviteCopiedMessage({
            role: "provider",
            staffName: staff.name,
            expiresAt: data.expiresAt,
          })
        );
      }
    } catch {
      onInviteMessage("Error de red.");
    } finally {
      setInviting(false);
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
            <div className="space-y-2 rounded-lg border border-dashed border-border/80 bg-muted/30 p-3">
              <p className="text-sm font-medium">Acceso al panel</p>
              <p className="text-xs text-muted-foreground">
                Compartí este enlace para que {name.trim() || "el prestador"} entre al
                dashboard con su cuenta.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={inviting || providerInviteDisabledReason(staff) !== null}
                title={providerInviteDisabledReason(staff) ?? undefined}
                onClick={() => void copyProviderInviteLink()}
              >
                {inviting ? "Generando…" : "Copiar enlace de invitación"}
              </Button>
            </div>
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
            <details className="rounded-lg border border-border/80 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-foreground">
                Opciones avanzadas (UID manual)
              </summary>
              <Field className="mt-3">
                <FieldLabel htmlFor={`st-uid-${staff.id}`}>UID de Firebase</FieldLabel>
                <Input
                  id={`st-uid-${staff.id}`}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  spellCheck={false}
                  autoCapitalize="none"
                  placeholder="Vacío = usar invitación por enlace"
                />
                <FieldDescription>
                  Preferí el enlace de invitación de arriba. El UID es para casos
                  excepcionales.
                </FieldDescription>
              </Field>
            </details>
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

function StaffFlowSteps({ section }: { section: StaffFlowSection }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{section.title}</h3>
      <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
        {section.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
