"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Detail = {
  appointmentId: string;
  status: string;
  start: string;
  end: string;
  timezone: string;
  commerceName: string;
  commerceSlug: string;
  serviceName: string;
  staffName: string;
  customerName: string;
};

type Props = { token: string };

export function ManageBookingClient({ token }: Props) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/public/booking-token/${encodeURIComponent(token)}`
        );
        const json = (await res.json()) as Detail & { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(json.error || "No se pudo cargar.");
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Error de red.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  const startLabel = DateTime.fromISO(data.start, { zone: "utc" })
    .setZone(data.timezone)
    .toFormat("cccc d MMM, HH:mm");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tu turno</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.commerceName}</p>
      </div>
      <ul className="space-y-2 text-sm">
        <li>
          <span className="text-muted-foreground">Servicio:</span>{" "}
          {data.serviceName}
        </li>
        <li>
          <span className="text-muted-foreground">Prestador:</span>{" "}
          {data.staffName}
        </li>
        <li>
          <span className="text-muted-foreground">Cuándo:</span> {startLabel}
        </li>
        <li>
          <span className="text-muted-foreground">Estado:</span>{" "}
          <span className="capitalize">{data.status}</span>
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">
        Para cancelar o reprogramar, contactá al comercio por WhatsApp. La
        reprogramación online llegará en una próxima versión.
      </p>
      <Link
        href={`/book/${data.commerceSlug}`}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
      >
        Nueva reserva
      </Link>
    </div>
  );
}
