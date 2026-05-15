"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Settings, Store } from "lucide-react";

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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import type { Commerce, CommerceMemberRole } from "@/lib/types";
import {
  getCommerceById,
  listCommerceMembersForUser,
} from "@/lib/firebase/services";
import { isValidCommerceSlug, normalizeCommerceSlug } from "@/lib/validation/commerce-slug";
import { cn } from "@/lib/utils";

type Row = { commerce: Commerce; role: CommerceMemberRole };

function roleLabelEs(role: CommerceMemberRole): string {
  switch (role) {
    case "owner":
      return "Dueño";
    case "reception":
      return "Recepción";
    case "provider":
      return "Prestador";
    default:
      return role;
  }
}

function CommerceListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-4 w-36 animate-pulse rounded-md bg-muted" />
      <ul className="grid gap-3 sm:grid-cols-2" aria-hidden>
        {[0, 1].map((i) => (
          <li key={i}>
            <Card className="h-full overflow-hidden">
              <CardHeader className="space-y-2">
                <div className="h-5 w-[70%] max-w-[12rem] animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-[45%] max-w-[8rem] animate-pulse rounded-md bg-muted" />
              </CardHeader>
              <CardFooter className="border-t-0 pt-0">
                <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DashboardHome() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setListError(null);
    setLoadingList(true);
    try {
      const members = await listCommerceMembersForUser(user.uid);
      const loaded: Row[] = [];
      for (const m of members) {
        const commerce = await getCommerceById(m.commerceId);
        if (commerce) {
          loaded.push({ commerce, role: m.role });
        }
      }
      loaded.sort((a, b) => a.commerce.name.localeCompare(b.commerce.name));
      setRows(loaded);
    } catch {
      setListError("No se pudieron cargar los comercios. Revisá la conexión y las reglas de Firestore.");
    } finally {
      setLoadingList(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setCreateError(null);
    const n = name.trim();
    const s = normalizeCommerceSlug(slug);
    if (n.length < 1 || n.length > 120) {
      setCreateError("El nombre debe tener entre 1 y 120 caracteres.");
      return;
    }
    if (!isValidCommerceSlug(s)) {
      setCreateError(
        "Slug inválido: solo minúsculas, números y guiones (3–80 caracteres)."
      );
      return;
    }

    setCreating(true);
    try {
      const token = await user.getIdToken(true);
      const res = await fetch("/api/commerces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: n, slug: s }),
      });
      const data = (await res.json()) as {
        error?: string;
        commerceId?: string;
      };
      if (!res.ok) {
        setCreateError(data.error || "No se pudo crear el comercio.");
        return;
      }
      setName("");
      setSlug("");
      await refresh();
      if (data.commerceId) {
        router.push(`/dashboard/${data.commerceId}?onboarding=1`);
      }
    } catch {
      setCreateError("Error de red. Intentá de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  const hasLocales = rows.length > 0;
  const newCommerceCard = (
    <Card>
      <CardHeader>
        <CardTitle>{hasLocales ? "Agregar otro local" : "Primer local"}</CardTitle>
        <CardDescription>
          El slug define la URL pública:{" "}
          <span className="font-mono text-xs">/book/tu-slug</span>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleCreate}>
        <CardContent>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="commerce-name">Nombre</FieldLabel>
              <Input
                id="commerce-name"
                name="name"
                autoComplete="organization"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                placeholder="Ej. Barbería Central"
                required
                maxLength={120}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="commerce-slug">Slug</FieldLabel>
              <Input
                id="commerce-slug"
                name="slug"
                value={slug}
                onChange={(ev) =>
                  setSlug(ev.target.value.toLowerCase().replace(/\s+/g, "-"))
                }
                placeholder="barberia-central"
                required
                autoCapitalize="none"
                spellCheck={false}
              />
              <FieldDescription>
                Solo letras minúsculas, números y guiones.
              </FieldDescription>
            </Field>
            {createError ? <FieldError>{createError}</FieldError> : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t-0 sm:flex-row sm:justify-end">
          <Button type="submit" disabled={creating} className="w-full sm:w-auto">
            {creating ? "Creando…" : "Crear comercio"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );

  return (
    <div className="mx-auto w-full max-w-lg space-y-10 px-4 py-8 sm:max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis locales</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Elegí un comercio para ver la agenda y los ajustes, o creá uno nuevo para
          compartir el enlace público de reservas.
        </p>
      </div>

      {listError ? (
        <p className="text-sm text-destructive" role="alert">
          {listError}
        </p>
      ) : null}

      <section aria-labelledby="commerce-list-heading">
        <h2 id="commerce-list-heading" className="sr-only">
          Lista de comercios
        </h2>
        {loadingList ? <CommerceListSkeleton /> : null}
        {!loadingList && hasLocales ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Tus comercios</p>
              <span className="text-xs text-muted-foreground">
                {rows.length === 1 ? "1 local" : `${rows.length} locales`}
              </span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {rows.map(({ commerce, role }) => (
                <li key={commerce.id}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Store className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base leading-snug">
                            {commerce.name}
                          </CardTitle>
                          <CardDescription className="mt-1 font-mono text-xs">
                            /book/{commerce.slug}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter className="mt-auto flex flex-col gap-3 border-t-0 pt-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <span className="text-xs text-muted-foreground">
                        Tu rol: <span className="text-foreground">{roleLabelEs(role)}</span>
                      </span>
                      <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto sm:justify-end">
                        <Link
                          href={`/dashboard/${commerce.id}/agenda`}
                          className={cn(
                            buttonVariants({ variant: "default", size: "sm" }),
                            "inline-flex flex-1 justify-center gap-1.5 sm:flex-initial"
                          )}
                        >
                          <CalendarDays className="size-4 shrink-0" aria-hidden />
                          {role === "provider" ? "Mi agenda" : "Agenda"}
                        </Link>
                        <Link
                          href={`/dashboard/${commerce.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "inline-flex flex-1 justify-center gap-1.5 sm:flex-initial"
                          )}
                        >
                          <Settings className="size-4 shrink-0" aria-hidden />
                          Ajustes
                        </Link>
                      </div>
                    </CardFooter>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {!loadingList && !hasLocales ? (
          <Card className="border-dashed bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="size-5 text-muted-foreground" aria-hidden />
                Todavía no tenés locales
              </CardTitle>
              <CardDescription>
                Creá tu primer comercio abajo: en segundos tenés el link para que
                reserven por la web.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </section>

      <div className="space-y-3">
        {hasLocales && !loadingList ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Agregar otro local
          </p>
        ) : null}
        {newCommerceCard}
      </div>
    </div>
  );
}
