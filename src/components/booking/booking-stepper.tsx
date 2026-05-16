"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Servicio" },
  { id: 2, label: "Prestador" },
  { id: 3, label: "Día" },
  { id: 4, label: "Horario" },
  { id: 5, label: "Tus datos" },
] as const;

export type BookingStep = 1 | 2 | 3 | 4 | 5;

interface BookingStepperProps {
  currentStep: BookingStep;
  className?: string;
}

export function BookingStepper({ currentStep, className }: BookingStepperProps) {
  return (
    <nav
      aria-label="Progreso de la reserva"
      className={cn(
        "flex items-center justify-between gap-1 sm:gap-2",
        className
      )}
    >
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isPending = currentStep < step.id;

        return (
          <div key={step.id} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 sm:h-8 sm:w-8 sm:text-sm",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent &&
                    "scale-110 bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isPending &&
                    "bg-muted text-muted-foreground/60"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 truncate text-[10px] font-medium uppercase tracking-wider sm:text-xs",
                  isCurrent && "text-primary",
                  isCompleted && "text-primary/80",
                  isPending && "text-muted-foreground/50"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-0.5 flex-1 transition-colors duration-300 sm:mx-2",
                  currentStep > step.id
                    ? "bg-primary"
                    : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function getBookingStep(
  serviceId: string,
  showStaffStep: boolean,
  staffId: string,
  staffOk: boolean,
  dateStr: string,
  selectedSlotIso: string
): BookingStep {
  if (selectedSlotIso) return 5;
  if (dateStr && staffOk) return 4;
  if (staffId && staffOk) return 3;
  if (showStaffStep && serviceId) return 2;
  return 1;
}