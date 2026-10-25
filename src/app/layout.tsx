import type { Metadata, Viewport } from "next";
import { Anton, Figtree } from "next/font/google";
import "./globals.css";

const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Fruti Delicias | Bowls y pinchos de fruta con chocolate en Caloto, Cauca",
  description:
    "Pide bowls y pinchos de fruta fresca con chocolate y toppings. Emprendimiento de la Institución Educativa Sagrada Familia, Caloto, Cauca.",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  openGraph: {
    title: "Fruti Delicias: fruta + chocolate = felicidad",
    description: "El antojo que combina fruta, chocolate y felicidad.",
    locale: "es_CO",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2E0F08",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
