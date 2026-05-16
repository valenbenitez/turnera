import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookingSummaryBar } from "./booking-summary-bar";

describe("BookingSummaryBar", () => {
  it("retorna null cuando no hay selections", () => {
    const { container } = render(
      <BookingSummaryBar
        serviceName={null}
        staffName={null}
        dateStr={null}
        selectedSlotIso={null}
        timezone="America/Buenos_Aires"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("muestra solo servicio cuando esta seleccionado", () => {
    render(
      <BookingSummaryBar
        serviceName="Corte de pelo"
        staffName={null}
        dateStr={null}
        selectedSlotIso={null}
        timezone="America/Buenos_Aires"
      />
    );
    expect(screen.getByText("Corte de pelo")).toBeDefined();
  });

  it("muestra servicio y prestador cuando ambos seleccionados", () => {
    render(
      <BookingSummaryBar
        serviceName="Corte de pelo"
        staffName="Juan"
        dateStr={null}
        selectedSlotIso={null}
        timezone="America/Buenos_Aires"
      />
    );
    expect(screen.getByText("Corte de pelo")).toBeDefined();
    expect(screen.getByText("Juan")).toBeDefined();
  });

  it("muestra servicio, prestador y fecha cuando seleccionados", () => {
    render(
      <BookingSummaryBar
        serviceName="Corte de pelo"
        staffName="Juan"
        dateStr="2025-05-15"
        selectedSlotIso={null}
        timezone="America/Buenos_Aires"
      />
    );
    expect(screen.getByText("Corte de pelo")).toBeDefined();
    expect(screen.getByText("Juan")).toBeDefined();
    expect(screen.getByText("15 may")).toBeDefined();
  });

  it("muestra todos los items cuando todo seleccionado", () => {
    render(
      <BookingSummaryBar
        serviceName="Corte de pelo"
        staffName="Juan"
        dateStr="2025-05-15"
        selectedSlotIso="2025-05-15T10:00:00Z"
        timezone="America/Buenos_Aires"
      />
    );
    expect(screen.getByText("Corte de pelo")).toBeDefined();
    expect(screen.getByText("Juan")).toBeDefined();
    expect(screen.getByText("15 may")).toBeDefined();
    expect(screen.getByText("10:00")).toBeDefined();
  });

  it("formatea la fecha en locale es", () => {
    render(
      <BookingSummaryBar
        serviceName="Servicio"
        staffName={null}
        dateStr="2025-12-25"
        selectedSlotIso={null}
        timezone="America/Buenos_Aires"
      />
    );
    expect(screen.getByText("25 dic")).toBeDefined();
  });

  it("formatea el horario correctamente", () => {
    render(
      <BookingSummaryBar
        serviceName="Servicio"
        staffName={null}
        dateStr={null}
        selectedSlotIso="2025-05-15T14:30:00Z"
        timezone="America/Buenos_Aires"
      />
    );
    expect(screen.getByText("14:30")).toBeDefined();
  });

  it("usa separador visual entre items", () => {
    render(
      <BookingSummaryBar
        serviceName="A"
        staffName="B"
        dateStr="2025-05-15"
        selectedSlotIso="2025-05-15T10:00:00Z"
        timezone="America/Buenos_Aires"
      />
    );
    const separators = document.querySelectorAll("span.text-muted-foreground\\/50");
    expect(separators.length).toBe(3);
  });

  it("aplica className personalizado", () => {
    const { container } = render(
      <BookingSummaryBar
        serviceName="Servicio"
        staffName={null}
        dateStr={null}
        selectedSlotIso={null}
        timezone="America/Buenos_Aires"
        className="mb-4"
      />
    );
    expect(container.firstChild).toHaveClass("mb-4");
  });

  it("hace wrap en mobile", () => {
    const { container } = render(
      <BookingSummaryBar
        serviceName="Servicio"
        staffName="Juan"
        dateStr="2025-05-15"
        selectedSlotIso="2025-05-15T10:00:00Z"
        timezone="America/Buenos_Aires"
      />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("flex-wrap");
  });
});