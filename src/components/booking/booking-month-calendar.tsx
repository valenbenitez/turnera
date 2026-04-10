"use client";

import { DateTime } from "luxon";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const WEEK_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type Props = {
  timezone: string;
  minDate: string;
  maxDate: string;
  value: string;
  onChange: (dateStr: string) => void;
  className?: string;
};

function parseYmd(s: string, zone: string): DateTime | null {
  const d = DateTime.fromFormat(s, "yyyy-MM-dd", { zone });
  return d.isValid ? d : null;
}

export function BookingMonthCalendar({
  timezone,
  minDate,
  maxDate,
  value,
  onChange,
  className,
}: Props) {
  const min = parseYmd(minDate, timezone);
  const max = parseYmd(maxDate, timezone);
  const selected = value ? parseYmd(value, timezone) : null;

  const base =
    selected ??
    min ??
    DateTime.now().setZone(timezone).startOf("day");

  const [cursor, setCursor] = useState(() => base.startOf("month"));

  useEffect(() => {
    if (selected?.isValid) {
      setCursor(selected.startOf("month"));
    }
  }, [value, timezone]);

  const monthStart = cursor.startOf("month");
  const label = monthStart.setLocale("es").toFormat("LLLL yyyy");
  const capitalize = (s: string) =>
    s.length ? s[0].toUpperCase() + s.slice(1) : s;

  const padMonday = (monthStart.weekday + 6) % 7;
  const gridStart = monthStart.minus({ days: padMonday });
  const cells: DateTime[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(gridStart.plus({ days: i }));
  }

  function inRange(d: DateTime): boolean {
    if (!min || !max) return false;
    const ds = d.toISODate();
    if (!ds) return false;
    return ds >= minDate && ds <= maxDate;
  }

  function isSameMonth(d: DateTime): boolean {
    return d.month === monthStart.month && d.year === monthStart.year;
  }

  return (
    <div className={cn("select-none", className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCursor((c) => c.minus({ months: 1 }))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/30 bg-white/40 text-sm font-medium shadow-sm backdrop-blur-md transition hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold tracking-tight capitalize">
          {capitalize(label)}
        </p>
        <button
          type="button"
          onClick={() => setCursor((c) => c.plus({ months: 1 }))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/30 bg-white/40 text-sm font-medium shadow-sm backdrop-blur-md transition hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {WEEK_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const iso = d.toISODate();
          if (!iso) return null;
          const allowed = inRange(d);
          const inMonth = isSameMonth(d);
          const isSelected = value === iso;
          const isToday = d.hasSame(DateTime.now().setZone(timezone), "day");

          return (
            <button
              key={iso}
              type="button"
              disabled={!allowed}
              onClick={() => allowed && onChange(iso)}
              className={cn(
                "relative flex aspect-square max-h-11 items-center justify-center rounded-xl text-sm font-medium transition-all duration-200",
                !inMonth && "text-muted-foreground/40",
                inMonth && !allowed && "cursor-not-allowed opacity-35",
                allowed &&
                  !isSelected &&
                  "border border-transparent bg-white/30 hover:scale-105 hover:border-white/40 hover:bg-white/50 dark:bg-white/5 dark:hover:bg-white/10",
                isSelected &&
                  "scale-105 border border-primary/30 bg-primary text-primary-foreground shadow-md shadow-primary/25",
                isToday &&
                  !isSelected &&
                  allowed &&
                  "ring-1 ring-primary/40 ring-offset-1 ring-offset-transparent"
              )}
            >
              {d.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
