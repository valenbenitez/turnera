import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Turnera",
    template: "%s · Turnera",
  },
  description:
    "Turnos y citas para comercios: reserva pública, panel para tu equipo y WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} min-h-dvh min-h-svh h-full antialiased`}
    >
      <body className="flex min-h-dvh min-h-svh min-h-[-webkit-fill-available] flex-col">
        {children}
      </body>
    </html>
  );
}
