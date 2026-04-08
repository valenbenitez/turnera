"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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

export function DashboardHome() {
  const { user } = useAuth();
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
      const token = await user.getIdToken();
      const res = await fetch("/api/commerces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: n, slug: s }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setCreateError(data.error || "No se pudo crear el comercio.");
        return;
      }
      setName("");
      setSlug("");
      await refresh();
    } catch {
      setCreateError("Error de red. Intentá de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-10 px-4 py-8 sm:max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tus comercios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Creá un comercio para obtener un enlace público de reservas y gestionar
          la agenda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo comercio</CardTitle>
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

      <section aria-labelledby="commerce-list-heading">
        <h2 id="commerce-list-heading" className="sr-only">
          Lista de comercios
        </h2>
        {listError ? (
          <p className="text-sm text-destructive" role="alert">
            {listError}
          </p>
        ) : null}
        {loadingList ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no tenés comercios. Creá uno arriba.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map(({ commerce, role }) => (
              <li key={commerce.id}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base">{commerce.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      /book/{commerce.slug}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="mt-auto flex flex-wrap gap-2 border-t-0 pt-0">
                    <span className="text-xs capitalize text-muted-foreground">
                      Rol: {role}
                    </span>
                    <Link
                      href={`/dashboard/${commerce.id}`}
                      className={cn(
                        buttonVariants({ variant: "secondary", size: "sm" }),
                        "ml-auto"
                      )}
                    >
                      Abrir
                    </Link>
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
