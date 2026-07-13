import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import IntroProvider from "@/components/Intro";
import AudioAmbience from "@/components/AudioAmbience";

// corpo e UI: grotesca editorial, contraste limpo com a blackletter da marca
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-archivo",
  display: "swap",
});

const fraktur = localFont({
  src: "../fonts/ZentenarFraktur.ttf",
  variable: "--font-fraktur",
  display: "swap",
});

// decorativa — reservada a poucos momentos (frases-poema em itálico)
const lunaquete = localFont({
  src: [
    { path: "../fonts/Lunaquete-Light.ttf", weight: "300", style: "normal" },
    { path: "../fonts/Lunaquete-LightItalic.ttf", weight: "300", style: "italic" },
    { path: "../fonts/Lunaquete-Medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-lunaquete",
  display: "swap",
});

const miltorn = localFont({
  src: "../fonts/Miltorn.otf",
  variable: "--font-miltorn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jardim Depressa",
  description:
    "Jardim Depressa — rock alternativo de São Paulo. EP «JD.» (2024) e os singles «Em Seu Lugar» e «Diabo» (2026). Ouça no Spotify e vista a estampa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${fraktur.variable} ${lunaquete.variable} ${miltorn.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-jd-black text-jd-cream">
        <SmoothScroll>
          <IntroProvider>{children}</IntroProvider>
        </SmoothScroll>
        {/* irmão direto do <body>: sem ancestral transformado, position:fixed é
            fixo na viewport de verdade (o .grain já prova isso) */}
        <AudioAmbience />
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
