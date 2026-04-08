import type { Commerce, DaySchedule, WorkingHours } from "@/lib/types";

function day(enabled: boolean, start: string, end: string): DaySchedule {
  return { enabled, start, end, breaks: [] };
}

export function createDefaultWorkingHours(): WorkingHours {
  return {
    monday: day(true, "09:00", "18:00"),
    tuesday: day(true, "09:00", "18:00"),
    wednesday: day(true, "09:00", "18:00"),
    thursday: day(true, "09:00", "18:00"),
    friday: day(true, "09:00", "18:00"),
    saturday: day(false, "09:00", "13:00"),
    sunday: day(false, "09:00", "13:00"),
  };
}

/** Payload inicial al crear un comercio (sin `id`). */
export function createNewCommerceFields(input: {
  name: string;
  slug: string;
}): Omit<Commerce, "id" | "createdAt"> {
  return {
    name: input.name.trim(),
    slug: input.slug.trim().toLowerCase(),
    active: true,
    timezone: "America/Argentina/Buenos_Aires",
    workingHours: createDefaultWorkingHours(),
    slotDurationMinutes: 30,
    maxDaysInAdvance: 30,
    minHoursBeforeBooking: 2,
    whatsappNumber: undefined,
  };
}
