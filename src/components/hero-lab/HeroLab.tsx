"use client";

// TEMP: laboratório de variantes do hero — remover após a escolha
// (junto com os HeroPasteUp/HeroSessao/HeroColagem perdedores; o vencedor
// vira o novo Hero.tsx e o page.tsx volta a renderizar <Hero /> + <Marquee />)

import { useEffect, useState } from "react";
import Marquee from "@/components/Marquee";
import HeroPasteUp, { SEAM_CLASS as SEAM_PASTEUP } from "./HeroPasteUp";
import HeroSessao, { SEAM_CLASS as SEAM_SESSAO } from "./HeroSessao";

const VARIANTS = [
  { key: "paste-up", label: "paste-up", Hero: HeroPasteUp, seam: SEAM_PASTEUP },
  { key: "sessão", label: "sessão", Hero: HeroSessao, seam: SEAM_SESSAO },
] as const;

type VariantKey = (typeof VARIANTS)[number]["key"];

const STORAGE_KEY = "jd-hero-lab-variant";

export default function HeroLab() {
  const [active, setActive] = useState<VariantKey>("paste-up");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && VARIANTS.some((v) => v.key === saved)) {
      setActive(saved as VariantKey);
    }
  }, []);

  const pick = (key: VariantKey) => {
    if (key === active) return;
    window.localStorage.setItem(STORAGE_KEY, key);
    setActive(key);
  };

  // trocar de variante muda a altura da página em runtime: o Lenis
  // (wrapper=window) só re-mede no resize da janela — força a re-medição
  // e volta ao topo pra ver o hero desde o início
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const lenis = (window as unknown as { lenis?: unknown }).lenis as
        | {
            resize?: () => void;
            scrollTo?: (target: number, opts?: { immediate?: boolean }) => void;
          }
        | undefined;
      lenis?.resize?.();
      if (typeof lenis?.scrollTo === "function") lenis.scrollTo(0, { immediate: true });
      else window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const variant = VARIANTS.find((v) => v.key === active) ?? VARIANTS[0];
  const { Hero, seam } = variant;

  return (
    <>
      {/* key remonta hero + marquee juntos: o ScrollTrigger do Marquee
          re-mede no mount, já com o runway da variante nova no lugar */}
      <div key={variant.key}>
        <Hero />
        <div className={seam || undefined}>
          <Marquee />
        </div>
      </div>

      {/* TEMP: seletor fixo de variante — remover após a escolha */}
      <div className="fixed bottom-4 left-4 z-[80] flex items-center gap-2 font-miltorn text-[9px] uppercase tracking-[0.2em]">
        <span className="text-jd-cream/40">hero:</span>
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => pick(v.key)}
            className={`rounded-full border px-3 py-1.5 transition-colors ${
              active === v.key
                ? "border-jd-cream bg-jd-cream text-jd-black"
                : "border-jd-cream/30 bg-jd-black/60 text-jd-cream/60 hover:border-jd-cream"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </>
  );
}
