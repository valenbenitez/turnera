"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type Props = { commerceId: string };

const tabs = [
  {
    href: (id: string) => `/dashboard/${id}/agenda`,
    label: "Agenda",
    match: "prefix" as const,
    tour: "tour-nav-agenda",
  },
  {
    href: (id: string) => `/dashboard/${id}`,
    label: "Ajustes",
    match: "exact" as const,
    tour: "tour-nav-settings",
  },
  {
    href: (id: string) => `/dashboard/${id}/services`,
    label: "Servicios",
    match: "prefix" as const,
    tour: "tour-nav-services",
  },
  {
    href: (id: string) => `/dashboard/${id}/staff`,
    label: "Equipo",
    match: "prefix" as const,
    tour: "tour-nav-staff",
  },
] as const;

export function CommerceSubnav({ commerceId }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="border-b bg-muted/30"
      aria-label="Secciones del comercio"
    >
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {tabs.map((tab) => {
          const href = tab.href(commerceId);
          const active =
            tab.match === "exact"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
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
                "shrink-0 rounded-md"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
