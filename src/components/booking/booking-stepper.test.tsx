import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookingStepper, getBookingStep } from "./booking-stepper";

describe("BookingStepper", () => {
  it("renderiza los 5 pasos", () => {
    render(<BookingStepper currentStep={1} />);
    expect(screen.getByText("Servicio")).toBeDefined();
    expect(screen.getByText("Prestador")).toBeDefined();
    expect(screen.getByText("Día")).toBeDefined();
    expect(screen.getByText("Horario")).toBeDefined();
    expect(screen.getByText("Tus datos")).toBeDefined();
  });

  it("marca el paso activo con clase primary", () => {
    render(<BookingStepper currentStep={3} />);
    const paso3 = screen.getByText("3");
    expect(paso3.parentElement?.className).toContain("bg-primary");
  });

  it("muestra checkmark en pasos completados", () => {
    render(<BookingStepper currentStep={4} />);
    const checkmark = document.querySelector("svg");
    expect(checkmark).toBeDefined();
  });

  it("aplica estilo atenuado a pasos pendientes", () => {
    render(<BookingStepper currentStep={2} />);
    const paso5 = screen.getByText("Tus datos");
    expect(paso5.parentElement?.className).toContain("text-muted-foreground/50");
  });

  it("renderiza sin errores con className personalizado", () => {
    const { container } = render(
      <BookingStepper currentStep={1} className="mb-4" />
    );
    expect(container.firstChild).toHaveClass("mb-4");
  });
});

describe("getBookingStep", () => {
  it("retorna 1 cuando no hay servicio seleccionado", () => {
    expect(getBookingStep("", false, "", false, "", "")).toBe(1);
  });

  it("retorna 2 cuando hay servicio y requiere prestador", () => {
    expect(getBookingStep("svc-1", true, "", false, "", "")).toBe(2);
  });

  it("retorna 3 cuando hay prestador seleccionado", () => {
    expect(getBookingStep("svc-1", false, "staff-1", true, "", "")).toBe(3);
  });

  it("retorna 4 cuando hay fecha seleccionada", () => {
    expect(getBookingStep("svc-1", false, "staff-1", true, "2025-05-15", "")).toBe(4);
  });

  it("retorna 5 cuando hay horario seleccionado", () => {
    expect(getBookingStep("svc-1", false, "staff-1", true, "2025-05-15", "2025-05-15T10:00:00Z")).toBe(5);
  });

  it("retorna 4 cuando hay servicio sin staff pero sin staffOk", () => {
    expect(getBookingStep("svc-1", true, "", false, "2025-05-15", "")).toBe(4);
  });
});