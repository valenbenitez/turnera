"use client";

import { DateTime } from "luxon";
import { cn } from "@/lib/utils";

interface BookingSummaryBarProps {
  serviceName: string | null;
  staffName: string | null;
  dateStr: string | null;
  selectedSlotIso: string | null;
  timezone: string;
  className?: string;
}

export function BookingSummaryBar({
  serviceName,
  staffName,
  dateStr,
  selectedSlotIso,
  timezone,
  className,
}: BookingSummaryBarProps) {
  const items: string[] = [];

  if (serviceName) {
    items.push(serviceName);
  }

  if (staffName) {
    items.push(staffName);
  }

  if (dateStr) {
    const formattedDate = DateTime.fromFormat(dateStr, "yyyy-MM-dd", {
      zone: timezone,
    })
      .setLocale("es")
      .toFormat("d LLL");
    items.push(formattedDate);
  }

  if (selectedSlotIso) {
    const formattedTime = DateTime.fromISO(selectedSlotIso, { zone: "utc" })
      .setZone(timezone)
      .toFormat("HH:mm");
    items.push(formattedTime);
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "sticky top-4 z-50 !mt-4 !mx-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-medium !shadow-[0_8px_16px_rgba(0,0,0,0.2)] backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950",
        className
      )}
    >
      {items.map((item, index) => (
        <span key={index} className="flex items-center text-foreground">
          <span>{item}</span>
          {index < items.length - 1 && (
            <span className="mx-2 text-muted-foreground/50">·</span>
          )}
        </span>
      ))}
    </div>
  );
}