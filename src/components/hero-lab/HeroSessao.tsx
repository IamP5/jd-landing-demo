"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  transform,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { links, upcomingShows } from "@/data/site";
import { useIntro } from "@/components/Intro";
import { useMediaQuery } from "@/lib/media";
import HeroSessaoCarousel, { PUSH_MS, SLIDES } from "./HeroSessaoCarousel";

/**
 * "Sessão Contínua" — reel autoplay em push horizontal (a gramática da antiga
 * variante colagem: contra-movimento + linha de corte) com drift por hold; no
 * scroll a projeção full-bleed encolhe até virar uma cópia emoldurada em creme
 * com sombra dura azul, pregada no quadro preto, e o Marquee coral cruza sua
 * borda inferior.
 *
 * O harness deve envolver o <Marquee/> logo após este hero com SEAM_CLASS.
 */
export const SEAM_CLASS = "relative z-10 -mt-[18svh] md:-mt-[22svh]";

const RISE = { duration: 0.9, ease: [0.33, 1, 0.68, 1] as const };
const EASE_OUT = [0.33, 1, 0.68, 1] as const;

/** tempo de tela após o push — reel ágil, pedido do usuário */
const HOLD_MS = 3200;

export default function HeroSessao() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const nextShow = upcomingShows()[0];
  const introDone = useIntro();
  const reduced = !!useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 767px)");

  // ---- estado do reel -----------------------------------------------------
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [stamp, setStamp] = useState(0); // re-arma barra/drift/linha de corte
  const indexRef = useRef(0);
  const [docHidden, setDocHidden] = useState(false);

  const goTo = useCallback((next: number) => {
    if (next === indexRef.current) return;
    setPrev(indexRef.current);
    indexRef.current = next;
    setIndex(next);
    setStamp((s) => s + 1);
  }, []);

  const advance = useCallback(() => {
    goTo((indexRef.current + 1) % SLIDES.length);
  }, [goTo]);

  useEffect(() => {
    const onVis = () => setDocHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ---- scroll -------------------------------------------------------------
  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ["start start", "end start"],
  });

  // o relógio do reel é a animação CSS da barra de progresso (jdsc-fill):
  // animationPlayState pausado = reel pausado; onAnimationEnd = avança.
  // prefers-reduced-motion mata a animação via CSS → autoplay morre de graça.
  // Sem pausa por hover nem por scroll: as fotos seguem trocando até durante
  // a saída (pedido do usuário).
  const paused = !introDone || reduced || docHidden;

  // ---- tabelas de scrub ---------------------------------------------------
  // stops explícitos em 0 E 1 em TODOS os arrays: Motion v12 promove pra
  // WAAPI/ViewTimeline e preenche keyframes ausentes com o valor base.
  // reduzido: exit vira o crossfade simples de hoje (cardOpacity + uiOpacity).
  const photoY = useTransform(
    scrollYProgress,
    [0, 1],
    reduced ? ["0%", "0%"] : isMobile ? ["0%", "-5%"] : ["0%", "-10%"],
  );
  const cardScale = useTransform(
    scrollYProgress,
    [0, 0.3, 0.52, 1],
    reduced ? [1, 1, 1, 1] : [1, 1, 0.86, 0.86],
  );
  const cardRadius = useTransform(
    scrollYProgress,
    [0, 0.3, 0.52, 1],
    reduced ? ["0px", "0px", "0px", "0px"] : ["0px", "0px", "20px", "20px"],
  );
  // 0.60→1 empurra +10svh pra baixo: a cópia coberta recua mais devagar que o
  // scroll — pista de profundidade enquanto o Marquee cruza por cima
  const cardY = useTransform(
    scrollYProgress,
    [0, 0.3, 0.52, 0.6, 1],
    reduced
      ? ["0svh", "0svh", "0svh", "0svh", "0svh"]
      : ["0svh", "0svh", "-4svh", "-4svh", "10svh"],
  );
  const cardOpacity = useTransform(
    scrollYProgress,
    [0, 0.5, 0.8, 1],
    reduced ? [1, 1, 0, 0] : [1, 1, 1, 1],
  );
  const frameOpacity = useTransform(
    scrollYProgress,
    [0, 0.34, 0.5, 1],
    reduced ? [0, 0, 0, 0] : [0, 0, 1, 1],
  );
  const dimOpacity = useTransform(
    scrollYProgress,
    [0, 0.55, 0.9, 1],
    reduced ? [0, 0, 0, 0] : [0, 0, 0.55, 0.55],
  );
  // a UI sai ANTES do card terminar de encolher — a foto é a última coisa.
  // FORMA DE FUNÇÃO de propósito: opacity em forma de array era promovida a
  // ViewTimeline/WAAPI junto com o y e os keyframes de opacity se perdiam
  // (ficava travada no valor base 1 — os CTAs nunca sumiam no scroll). A
  // forma de função força o caminho JS por frame, como o markOpacity.
  const uiOpacity = useTransform(scrollYProgress, (p) =>
    reduced
      ? transform(p, [0, 0.35, 0.675, 1], [1, 0, 0, 0])
      : transform(p, [0, 0.26, 0.44, 1], [1, 1, 0, 0]),
  );
  const uiY = useTransform(
    scrollYProgress,
    [0, 0.26, 0.44, 1],
    reduced ? [0, 0, 0, 0] : [0, 0, -40, -40],
  );
  // CTAs somem JÁ no começo do scroll (pedido do usuário) + pointer-events
  // desligado pra não sobrar link invisível clicável
  const ctaOpacity = useTransform(scrollYProgress, (p) =>
    transform(p, [0, 0.04, 0.16, 1], [1, 1, 0, 0]),
  );
  const ctaY = useTransform(
    scrollYProgress,
    [0, 0.04, 0.16, 1],
    reduced ? [0, 0, 0, 0] : [0, 0, -24, -24],
  );
  const ctaPointer = useTransform(scrollYProgress, (p) =>
    p > 0.14 ? ("none" as const) : ("auto" as const),
  );

  // ---- wordmark blend-safe ------------------------------------------------
  // o mix-blend-difference NÃO pode ter ancestral com transform/opacity/filter
  // (stacking context isola o blend) — então entrada + scrub viram MotionValues
  // combinados aplicados NO PRÓPRIO elemento; o cluster é um div puro.
  const introMv = useMotionValue(0);
  useEffect(() => {
    if (!introDone) return;
    if (reduced) {
      introMv.set(1);
      return;
    }
    const controls = animate(introMv, 1, {
      duration: 0.9,
      ease: EASE_OUT,
      delay: 0.1,
    });
    return () => controls.stop();
  }, [introDone, reduced, introMv]);

  const markOpacity = useTransform(
    [introMv, scrollYProgress],
    (latest: number[]) => {
      const [e, p] = latest;
      const scrub = reduced
        ? transform(p, [0, 0.35, 1], [1, 0, 0])
        : transform(p, [0, 0.26, 0.44, 1], [1, 1, 0, 0]);
      return e * scrub;
    },
  );
  const markY = useTransform(
    [introMv, scrollYProgress],
    (latest: number[]) => {
      const [e, p] = latest;
      if (reduced) return 0;
      return (1 - e) * 30 + transform(p, [0, 0.26, 0.44, 1], [0, 0, -40, -40]);
    },
  );

  // barra corre push + hold; o drift dura o mesmo ciclo
  const fillMs = HOLD_MS + PUSH_MS;

  return (
    <div ref={runwayRef} className="relative z-0 h-[220vh]">
      <style>{`
        @keyframes jdsc-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes jdsc-drift { from { transform: scale(1); } to { transform: scale(1.045); } }
        .jdsc-drift-anim { animation: jdsc-drift ${fillMs}ms linear forwards; }
        @media (prefers-reduced-motion: reduce) {
          .jdsc-fill, .jdsc-drift-anim { animation: none !important; }
        }
      `}</style>

      {/* palco = quadro de paste-up preto que o encolhimento revela.
          Filhos empilham por ordem de DOM (z-index auto de propósito: qualquer
          stacking context entre o wordmark e o card mataria o difference). */}
      <div
        className="sticky top-0 h-svh overflow-hidden bg-jd-black"
        role="region"
        aria-roledescription="carousel"
        aria-label="fotos da banda"
      >
        {/* card: dono de tudo que é fotográfico; encolhe até virar cópia */}
        <motion.div
          style={{
            scale: cardScale,
            y: cardY,
            borderRadius: cardRadius,
            opacity: cardOpacity,
          }}
          className="absolute inset-0 overflow-hidden bg-jd-black will-change-transform"
        >
          {/* pilha do push (parallax de scroll aplicado lá dentro; a linha de
              corte fica fora dele) */}
          <HeroSessaoCarousel
            index={index}
            prev={prev}
            cycle={stamp}
            paused={paused}
            introDone={introDone}
            reduced={reduced}
            isMobile={isMobile}
            parallaxY={photoY}
            onExitComplete={() => setPrev(null)}
          />

          {/* duotone azul — achata a luminância, parte do sistema de leitura */}
          <div
            className="absolute inset-0 bg-jd-blue/10 mix-blend-color"
            aria-hidden
          />
          {/* scrims LOCAIS no lugar do dim global: topo fino pro Nav, base
              onde o cluster mora */}
          <div
            className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-jd-black/50 to-transparent"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[52svh] bg-gradient-to-t from-jd-black/85 via-jd-black/45 via-50% to-transparent"
            aria-hidden
          />
          {/* poça de sombra atrás do wordmark — o difference falhava em foto
              cinza-média/clara (virava dourado lamacento); com o wordmark
              sólido, é isto que garante a leitura em QUALQUER foto */}
          <div
            aria-hidden
            className="absolute bottom-[16svh] left-1/2 h-[46svh] w-[120vw] -translate-x-1/2"
            style={{
              background:
                "radial-gradient(ellipse 45% 50% at 50% 55%, rgba(31,31,31,0.6), transparent 72%)",
            }}
          />
          {/* véu: a cópia escurece conforme Marquee/Shows a cobrem */}
          <motion.div
            style={{ opacity: dimOpacity }}
            className="pointer-events-none absolute inset-0 bg-jd-black"
            aria-hidden
          />
        </motion.div>

        {/* moldura creme + sombra dura azul — irmã do card (a sombra vazaria
            do overflow-hidden), rastreia o mesmo transform via MotionValues */}
        <motion.div
          style={{
            scale: cardScale,
            y: cardY,
            borderRadius: cardRadius,
            opacity: frameOpacity,
            boxShadow: "8px 8px 0 0 var(--jd-blue)",
          }}
          className="pointer-events-none absolute inset-0 border-2 border-jd-cream/90"
          aria-hidden
        />

        {/* legenda editorial dessincronizada, fora do cluster central */}
        <motion.div
          style={{ opacity: uiOpacity }}
          className="absolute left-6 top-24"
        >
          <AnimatePresence initial={false}>
            {introDone && (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { delay: 0.35, duration: 0.5, ease: EASE_OUT }
                }
                className="absolute left-0 top-0 block w-max font-lunaquete text-sm italic text-jd-cream/70"
              >
                {SLIDES[index].caption}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* cluster: div puro; scrubs vão em cada filho */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-6 pb-10 md:gap-8 md:pb-14">
          {/* wordmark sólido — o mix-blend-difference era ilegível em fotos
              cinza-média/claras; creme + poça de scrim lê em todas */}
          <motion.span
            style={{ opacity: markOpacity, y: markY }}
            className="mask-mark mask-logo block h-[24vw] max-h-48 w-[86vw] max-w-2xl text-jd-cream drop-shadow-[0_4px_32px_rgba(31,31,31,0.85)]"
            role="img"
            aria-label="Jardim Depressa"
          />

          {/* CTAs: somem logo no início do scroll (scrub dedicado) */}
          <motion.div
            style={{ opacity: ctaOpacity, y: ctaY, pointerEvents: ctaPointer }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={introDone ? { opacity: 1, y: 0 } : {}}
              transition={reduced ? { duration: 0 } : { ...RISE, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-3 px-4 font-miltorn text-xs uppercase tracking-[0.25em] md:gap-4"
            >
              {/* CTAs em P&B: papel sobre a foto / texto sublinhado */}
              <a
                href={links.spotify}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-jd-cream px-7 py-3.5 text-jd-black transition-transform hover:scale-105"
              >
                Ouvir no Spotify
              </a>
              {nextShow && (
                // CTA do show como botão de texto — sublinhado, sem pílula
                <a
                  href={nextShow.tickets ?? "#shows"}
                  target={nextShow.tickets ? "_blank" : undefined}
                  rel="noreferrer"
                  className="py-3.5 text-center text-jd-cream underline decoration-jd-cream/40 underline-offset-4 transition-colors hover:decoration-jd-cream"
                >
                  {nextShow.city} ·{" "}
                  {new Date(nextShow.date + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                    { day: "2-digit", month: "short" },
                  )}{" "}
                  — Ingressos
                </a>
              )}
            </motion.div>
          </motion.div>

          {/* cromo do reel: só os ticks-relógio (sem contador nem botão de pausa) */}
          <motion.div style={{ opacity: uiOpacity, y: uiY }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={introDone ? { opacity: 1 } : {}}
              transition={reduced ? { duration: 0 } : { ...RISE, delay: 0.45 }}
              className="flex items-center gap-2"
            >
              {SLIDES.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`ir para foto ${i + 1} de ${SLIDES.length}`}
                  aria-current={i === index || undefined}
                  className="group flex h-6 w-8 items-center"
                >
                  <span className="relative block h-[2px] w-full overflow-hidden rounded-full bg-jd-cream/25 transition-colors group-hover:bg-jd-cream/40">
                    {i === index && (
                      <span
                        key={stamp}
                        onAnimationEnd={(e) => {
                          if (e.animationName === "jdsc-fill" && !reduced) {
                            advance();
                          }
                        }}
                        className="jdsc-fill absolute inset-0 origin-left rounded-full bg-jd-cream"
                        style={{
                          transform: "scaleX(0)",
                          animation: `jdsc-fill ${fillMs}ms linear forwards`,
                          animationPlayState: paused ? "paused" : "running",
                        }}
                      />
                    )}
                  </span>
                </button>
              ))}
            </motion.div>
          </motion.div>

          {/* dica de scroll — herda o scrub da UI pelo wrapper */}
          <motion.div style={{ opacity: uiOpacity, y: uiY }}>
            <motion.span
              initial={{ opacity: 0 }}
              animate={
                introDone
                  ? reduced
                    ? { opacity: 0.5 }
                    : { opacity: 0.5, y: [0, 8, 0] }
                  : { opacity: 0 }
              }
              transition={{
                opacity: { duration: 0.8, delay: 0.6 },
                y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
              }}
              className="block font-lunaquete text-sm italic"
            >
              role para entrar no jardim
            </motion.span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
