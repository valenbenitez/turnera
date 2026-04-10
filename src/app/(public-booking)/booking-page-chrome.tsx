"use client";

import { useEffect } from "react";

const HTML_CLASS = "public-booking-page";

/**
 * Aplica fondo en toda la vista: el body tiene bg-background (blanco) en globals;
 * sin tocar html el degradado fijo a veces no se ve en móvil.
 */
export function BookingPageChrome() {
  useEffect(() => {
    document.documentElement.classList.add(HTML_CLASS);
    return () => {
      document.documentElement.classList.remove(HTML_CLASS);
    };
  }, []);

  return null;
}
