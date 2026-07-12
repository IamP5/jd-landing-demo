"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { links, upcomingShows } from "@/data/site";
import { useIntro } from "@/components/Intro";

const RISE = { duration: 0.9, ease: [0.33, 1, 0.68, 1] as const };

// TEMP: candidatas pra foto do hero — remover o seletor após a escolha
const HERO_PHOTOS = [
  { key: "cobogó", src: "/photos/promo-cobogo-1.jpg" },
  { key: "prece", src: "/photos/hero-test-wa0024.jpg" },
  { key: "roda", src: "/photos/hero-test-xcx.jpg" },
  { key: "canto", src: "/photos/hero-test-wa0012.jpg" },
];

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const nextShow = upcomingShows()[0];
  const introDone = useIntro();
  const [photo, setPhoto] = useState(HERO_PHOTOS[0]);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  // stops explícitos até 1: opacity vira animação nativa (ViewTimeline) e o
  // WAAPI preenche keyframes ausentes com o valor base — sem o stop final os
  // elementos voltavam a aparecer no fim do runway
  const uiOpacity = useTransform(scrollYProgress, [0, 0.35, 1], [1, 0, 0]);

  // foto da banda com contra-movimento (125% de altura, desloca contra o scroll)
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "-14%"]);
  const photoOpacity = useTransform(
    scrollYProgress,
    [0, 0.5, 0.8, 1],
    [1, 1, 0, 0],
  );
  const photoScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  return (
    <div ref={ref} className="relative h-[160vh]">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden">
        {/* foto da banda — fundo vivo com contra-movimento */}
        <motion.div
          style={{ opacity: photoOpacity }}
          className="absolute inset-0"
          aria-hidden
        >
          {/* camada de scroll (parallax) separada da camada de entrada (settle 1.3 → 1) */}
          <motion.div style={{ y: photoY, scale: photoScale }} className="h-full w-full">
            <motion.img
              src={photo.src}
              alt=""
              initial={{ scale: 1.3 }}
              animate={introDone ? { scale: 1 } : {}}
              transition={{ duration: 1.5, ease: [0.33, 1, 0.68, 1] }}
              className="h-[125%] w-full object-cover object-[50%_30%] opacity-40 grayscale"
            />
          </motion.div>
          {/* duotone + legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-b from-jd-black/70 via-jd-black/40 to-jd-black" />
          <div className="absolute inset-0 bg-jd-blue/10 mix-blend-color" />
        </motion.div>

        {/* logo Jardim Depressa discreto + CTAs, ancorados embaixo */}
        <motion.div
          style={{ opacity: uiOpacity }}
          className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-6 pb-10 md:gap-8 md:pb-14"
        >
          <motion.span
            initial={{ opacity: 0, y: 30 }}
            animate={introDone ? { opacity: 1, y: 0 } : {}}
            transition={{ ...RISE, delay: 0.1 }}
            className="mask-mark mask-logo block h-[22vw] max-h-40 w-[82vw] max-w-lg text-jd-cream drop-shadow-[0_0_40px_rgba(125,155,255,0.3)]"
            role="img"
            aria-label="Jardim Depressa"
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={introDone ? { opacity: 1, y: 0 } : {}}
            transition={{ ...RISE, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3 px-4 font-miltorn text-xs uppercase tracking-[0.25em] md:gap-4"
          >
            <a
              href={links.spotify}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-jd-blue px-7 py-3.5 text-jd-black transition-transform hover:scale-105"
            >
              Ouvir no Spotify
            </a>
            {nextShow && (
              <a
                href={nextShow.tickets ?? "#shows"}
                target={nextShow.tickets ? "_blank" : undefined}
                rel="noreferrer"
                className="rounded-full border border-jd-coral px-7 py-3.5 text-center text-jd-coral transition-colors hover:bg-jd-coral hover:text-jd-black"
              >
                {nextShow.city} · {new Date(nextShow.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — Ingressos
              </a>
            )}
          </motion.div>
          {/* TEMP: seletor de teste da foto de fundo — remover após a escolha */}
          <div className="flex items-center gap-2 font-miltorn text-[9px] uppercase tracking-[0.2em]">
            <span className="opacity-40">foto:</span>
            {HERO_PHOTOS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPhoto(p)}
                className={`rounded-full border px-3 py-1.5 transition-colors ${
                  photo.key === p.key
                    ? "border-jd-blue bg-jd-blue text-jd-black"
                    : "border-jd-cream/30 text-jd-cream/60 hover:border-jd-cream"
                }`}
              >
                {p.key}
              </button>
            ))}
          </div>

          <motion.span
            initial={{ opacity: 0 }}
            animate={introDone ? { opacity: 0.5, y: [0, 8, 0] } : { opacity: 0 }}
            transition={{
              opacity: { duration: 0.8, delay: 0.6 },
              y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
            }}
            className="font-lunaquete text-sm italic"
          >
            role para entrar no jardim
          </motion.span>
        </motion.div>
      </div>
    </div>
  );
}
