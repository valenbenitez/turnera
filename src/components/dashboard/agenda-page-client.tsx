"use client";

import { DateTime } from "luxon";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { whatsappWebUrlFromContact } from "@/lib/whatsapp-contact";
import { cn } from "@/lib/utils";
import {
  getCommerceById,
  getCommerceMember,
  listAllStaffByCommerce,
} from "@/lib/firebase/services";
import type { Commerce, CommerceMemberRole, Staff } from "@/lib/types";

type AgendaRow = {
  id: string;
  start: string;
  end: string;
  status: string;
  customerName: string;
  contact: string;
  customerEmail: string;
  serviceName: string;
  staffName: string;
};

type Props = { commerceId: string };

export function AgendaPageClient({ commerceId }: Props) {
  const { user } = useAuth();
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [role, setRole] = useState<CommerceMemberRole | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [rows, setRows] = useState<AgendaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const canFilterStaff = role === "owner" || role === "reception";
  const isProvider = role === "provider";

  const timezone = commerce?.timezone ?? "utc";

  const initDateForCommerce = useCallback((c: Commerce) => {
    const iso = DateTime.now().setZone(c.timezone).toISODate();
    if (iso) setSelectedDate(iso);
  }, []);

  const loadMeta = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setListError(null);
    try {
      const [m, c, staff] = await Promise.all([
        getCommerceMember(user.uid, commerceId),
        getCommerceById(commerceId),
        listAllStaffByCommerce(commerceId),
      ]);
      setRole(m?.role ?? null);
      setCommerce(c);
      setStaffList(staff.filter((s) => s.active));
      if (c) initDateForCommerce(c);
    } catch {
      setListError("No se pudo cargar el comercio.");
    } finally {
      setLoading(false);
    }
  }, [user, commerceId, initDateForCommerce]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const fetchAppointments = useCallback(async () => {
    if (!user || !selectedDate) return;
    setListError(null);
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams({ date: selectedDate });
      if (canFilterStaff && staffFilter !== "all") {
        params.set("staffId", staffFilter);
      }
      const res = await fetch(
        `/api/commerces/${commerceId}/appointments?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = (await res.json()) as {
        error?: string;
        appointments?: AgendaRow[];
      };
      if (!res.ok) {
        setListError(data.error ?? "No se pudieron cargar los turnos.");
        setRows([]);
        return;
      }
      setRows(data.appointments ?? []);
    } catch {
      setListError("Error de red.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user, commerceId, selectedDate, staffFilter, canFilterStaff]);

  useEffect(() => {
    if (!selectedDate) return;
    void fetchAppointments();
  }, [selectedDate, fetchAppointments]);

  const formatRange = useMemo(
    () => (startIso: string, endIso: string) => {
      const a = DateTime.fromISO(startIso, { zone: "utc" }).setZone(timezone);
      const b = DateTime.fromISO(endIso, { zone: "utc" }).setZone(timezone);
      if (!a.isValid || !b.isValid) return startIso;
      return `${a.toFormat("HH:mm")} – ${b.toFormat("HH:mm")}`;
    },
    [timezone]
  );

  const nextDayInfo = useMemo(() => {
    if (!commerce || !selectedDate) return { can: false as const, iso: null as string | null };
    const z = commerce.timezone;
    const cur = DateTime.fromFormat(selectedDate, "yyyy-MM-dd", { zone: z });
    if (!cur.isValid) return { can: false as const, iso: null as string | null };
    const next = cur.plus({ days: 1 });
    const today = DateTime.now().setZone(z).startOf("day");
    const maxDay = today.plus({ days: commerce.maxDaysInAdvance });
    const iso = next.toISODate();
    const can = Boolean(iso && next.startOf("day") <= maxDay);
    return { can, iso: can && iso ? iso : null };
  }, [commerce, selectedDate]);

  function goToNextDay() {
    if (nextDayInfo.can && nextDayInfo.iso) {
      setSelectedDate(nextDayInfo.iso);
    }
  }

  async function cancelAppointment(id: string) {
    if (!user) return;
    if (!window.confirm("¿Cancelar este turno? El cliente puede seguir gestionando por el enlace que recibió.")) {
      return;
    }
    setActionId(id);
    setListError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/commerces/${commerceId}/appointments/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "cancelled" }),
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setListError(data.error ?? "No se pudo cancelar.");
        return;
      }
      await fetchAppointments();
    } catch {
      setListError("Error de red al cancelar.");
    } finally {
      setActionId(null);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isProvider ? "Mi agenda" : "Agenda"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {isProvider
            ? `Tus turnos del día (${timezone}).`
            : `Turnos del día en la zona horaria del comercio (${timezone}).`}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {canFilterStaff ? "Día y filtros" : "Día"}
          </CardTitle>
          <CardDescription>
            {canFilterStaff
              ? "Vista pensada para móvil: elegí la fecha y, si aplica, el profesional."
              : "Elegí la fecha para ver tus turnos."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
            <Field className="min-w-0">
              <FieldLabel htmlFor="agenda-date">Fecha</FieldLabel>
              <Input
                id="agenda-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 w-full min-w-0"
              />
            </Field>
            {canFilterStaff ? (
              <Field className="min-w-0">
                <FieldLabel htmlFor="agenda-staff">Profesional</FieldLabel>
                <select
                  id="agenda-staff"
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                >
                  <option value="all">Todo el equipo</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
          </div>
          <FieldDescription>
            Calendario del comercio según su zona horaria.
          </FieldDescription>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!selectedDate || loading}
              onClick={() => void fetchAppointments()}
            >
              Actualizar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!nextDayInfo.can || loading}
              title={
                !commerce
                  ? undefined
                  : !nextDayInfo.can
                    ? `No podés avanzar más allá del ${DateTime.now().setZone(commerce.timezone).plus({ days: commerce.maxDaysInAdvance }).setLocale("es").toFormat("d MMM yyyy")} (límite de reservas del comercio).`
                    : "Ver la agenda del día siguiente"
              }
              onClick={goToNextDay}
            >
              Día siguiente
            </Button>
          </div>
        </CardContent>
      </Card>

      {listError ? (
        <p className="text-destructive text-sm" role="alert">
          {listError}
        </p>
      ) : null}

      <ul className="space-y-3">
        {loading && rows.length === 0 ? (
          <li className="text-muted-foreground text-sm">Cargando…</li>
        ) : null}
        {!loading && rows.length === 0 ? (
          <li className="text-muted-foreground text-sm">
            No hay turnos para este día.
          </li>
        ) : null}
        {rows.map((r) => {
          const waUrl =
            r.status === "confirmed" && r.contact
              ? whatsappWebUrlFromContact(r.contact)
              : null;
          return (
            <li key={r.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">
                      {formatRange(r.start, r.end)}{" "}
                      <span
                        className={
                          r.status === "confirmed"
                            ? "text-muted-foreground font-normal"
                            : "text-destructive font-normal"
                        }
                      >
                        ·{" "}
                        {r.status === "confirmed"
                          ? "Confirmado"
                          : r.status === "cancelled"
                            ? "Cancelado"
                            : r.status}
                      </span>
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {r.serviceName} · {r.staffName}
                    </p>
                    <p className="text-sm">
                      {r.customerName}
                      {r.contact ? ` · ${r.contact}` : ""}
                      {r.customerEmail ? ` · ${r.customerEmail}` : ""}
                    </p>
                  </div>
                  {r.status === "confirmed" ? (
                    <div className="flex shrink-0 flex-col gap-2 self-start sm:flex-row sm:items-center">
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "secondary", size: "sm" }),
                            "inline-flex w-full justify-center no-underline sm:w-auto"
                          )}
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={actionId === r.id}
                        onClick={() => void cancelAppointment(r.id)}
                      >
                        {actionId === r.id ? "Cancelando…" : "Cancelar"}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
