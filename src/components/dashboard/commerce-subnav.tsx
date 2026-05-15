"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, Package, Settings, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getCommerceMember } from "@/lib/firebase/services";
import type { CommerceMemberRole } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { commerceId: string };

const allTabs = [
  {
    href: (id: string) => `/dashboard/${id}/agenda`,
    label: "Agenda",
    Icon: CalendarDays,
    match: "prefix" as const,
    tour: "tour-nav-agenda",
  },
  {
    href: (id: string) => `/dashboard/${id}`,
    label: "Ajustes",
    Icon: Settings,
    match: "exact" as const,
    tour: "tour-nav-settings",
  },
  {
    href: (id: string) => `/dashboard/${id}/services`,
    label: "Servicios",
    Icon: Package,
    match: "prefix" as const,
    tour: "tour-nav-services",
  },
  {
    href: (id: string) => `/dashboard/${id}/staff`,
    label: "Equipo",
    Icon: Users,
    match: "prefix" as const,
    tour: "tour-nav-staff",
  },
] as const;

export function CommerceSubnav({ commerceId }: Props) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<CommerceMemberRole | null | "pending">(
    "pending"
  );

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      const m = await getCommerceMember(user.uid, commerceId);
      if (!cancelled) setRole(m?.role ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, commerceId]);

  const tabs =
    role === "provider"
      ? allTabs.filter((t) => t.label === "Agenda")
      : [...allTabs];

  return (
    <nav
      className="border-b bg-muted/30"
      aria-label="Secciones del comercio"
    >
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {role === "pending" ? (
          <div
            className="h-9 flex-1 max-w-[6rem] animate-pulse rounded-md bg-muted"
            aria-hidden
          />
        ) : null}
        {role !== "pending"
          ? tabs.map((tab) => {
              const href = tab.href(commerceId);
              const active =
                tab.match === "exact"
                  ? pathname === href
                  : pathname === href || pathname.startsWith(`${href}/`);
              const label =
                tab.label === "Agenda" && role === "provider"
                  ? "Mi agenda"
                  : tab.label;
              const Icon = tab.Icon;
              return (
                <Link
                  key={tab.label}
                  href={href}
                  data-tour={tab.tour}
                  className={cn(
                    buttonVariants({
                      variant: active ? "secondary" : "ghost",
                      size: "sm",
                    }),
                    "shrink-0 gap-2 rounded-md",
                    active && "ring-1 ring-border"
                  )}
                >
                  <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                  <span>{label}</span>
                </Link>
              );
            })
          : null}
      </div>
    </nav>
  );
}
