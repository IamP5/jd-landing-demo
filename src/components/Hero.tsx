"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "motion/react";
import { links, upcomingShows } from "@/data/site";
import { useIntro } from "@/components/Intro";

const RISE = { duration: 0.9, ease: [0.33, 1, 0.68, 1] as const };

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const nextShow = upcomingShows()[0];
  const introDone = useIntro();

  // zoom "através" do monograma ao rolar, estilo Apple
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 6]);
  const markOpacity = useTransform(scrollYProgress, [0, 0.6, 0.85], [1, 1, 0]);
  const uiOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  // foto da banda com contra-movimento (125% de altura, desloca contra o scroll)
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "-14%"]);
  const photoOpacity = useTransform(scrollYProgress, [0, 0.5, 0.8], [1, 1, 0]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  // tilt 3D com o mouse
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), {
    stiffness: 120,
    damping: 18,
  });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), {
    stiffness: 120,
    damping: 18,
  });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <div ref={ref} className="relative h-[220vh]">
      <div
        onMouseMove={onMouseMove}
        className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden"
      >
        {/* foto da banda — fundo vivo com contra-movimento */}
        <motion.div
          style={{ opacity: photoOpacity }}
          className="absolute inset-0"
          aria-hidden
        >
          {/* camada de scroll (parallax) separada da camada de entrada (settle 1.3 → 1) */}
          <motion.div style={{ y: photoY, scale: photoScale }} className="h-full w-full">
            <motion.img
              src="/photos/promo-cobogo-1.jpg"
              alt=""
              initial={{ scale: 1.3 }}
              animate={introDone ? { scale: 1 } : {}}
              transition={{ duration: 1.5, ease: [0.33, 1, 0.68, 1] }}
              className="h-[125%] w-full object-cover object-[50%_30%] opacity-40 grayscale"
            />
          </motion.div>
          {/* duotone + legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-b from-jd-black/70 via-jd-black/40 to-jd-black" />
          <div className="absolute inset-0 bg-jd-teal/10 mix-blend-color" />
        </motion.div>

        {/* glow suave atrás do monograma */}
        <motion.div
          style={{ opacity: markOpacity }}
          className="absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div className="absolute h-[70vmin] w-[70vmin] rounded-full bg-jd-teal/10 blur-[100px]" />
        </motion.div>

        {/* monograma JD gigante */}
        <motion.div
          style={{ scale, opacity: markOpacity, perspective: 900 }}
          className="relative"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={introDone ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ ...RISE, delay: 0.05 }}
          >
            <motion.span
              style={{ rotateX, rotateY }}
              className="mask-mark mask-monograma block h-[48vmin] w-[46vmin] -translate-y-[3vh] text-jd-cream drop-shadow-[0_0_60px_rgba(0,161,161,0.35)]"
              role="img"
              aria-label="Monograma JD"
            />
          </motion.div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          style={{ opacity: uiOpacity }}
          className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-6 pb-10 md:gap-8 md:pb-14"
        >
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
              className="rounded-full bg-jd-teal px-7 py-3.5 text-jd-black transition-transform hover:scale-105"
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
