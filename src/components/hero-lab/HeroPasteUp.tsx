"use client";

// Hero "Paste-Up" — foto como impresso, nome como tira de masthead.
// Quadro de colagem de zine: as 4 fotos rodam full-bleed e claras num carrossel
// de "parallax push" vertical, enquanto o wordmark nunca toca a foto — vive como
// tinta preta numa tira de papel creme inclinada (-2°, rimando com o Marquee
// coral). Na saída por scroll a foto encolhe num impresso com borda e sombra
// azul deslocada, a tira creme sai na horizontal como uma linha de letreiro e o
// Marquee (via SEAM_CLASS no harness) sobe por cima da emenda.

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { links, upcomingShows } from "@/data/site";
import { useIntro } from "@/components/Intro";
import { useMediaQuery } from "@/lib/media";
import HeroPasteUpCarousel, {
  PUSH,
  type HeroPasteUpSlide,
} from "./HeroPasteUpCarousel";

/** o harness aplica isto no wrapper do <Marquee /> logo após o hero: a tira
 *  coral cruza o impresso encolhido na mesma altura das outras variantes */
export const SEAM_CLASS = "relative z-10 -mt-[18svh] md:-mt-[22svh]";

const RISE = { duration: 0.9, ease: [0.33, 1, 0.68, 1] as const };

const SLIDES: readonly HeroPasteUpSlide[] = [
  { src: "/photos/hero-test-xcx.jpg", caption: "a roda", pos: "object-[50%_30%]" },
  { src: "/photos/hero-test-wa0024.jpg", caption: "a prece", pos: "object-[50%_25%]" },
  { src: "/photos/hero-test-wa0012.jpg", caption: "o canto", pos: "object-[50%_30%]" },
];

const HOLD_MS = 3300;

export default function HeroPasteUp() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const introDone = useIntro();
  const reduced = useReducedMotion() ?? false;
  const isMobile = useMediaQuery("(max-width: 767px)");
  const nextShow = upcomingShows()[0];

  // ---- estado do carrossel -------------------------------------------------
  // o reel NÃO pausa por hover nem por scroll: as fotos seguem trocando até
  // durante a saída (pedido do usuário) — só intro, aba oculta e reduced param
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [started, setStarted] = useState(false); // relógio liberado
  const [docHidden, setDocHidden] = useState(false);

  // "começa 3s depois do introDone": 1.8s aqui + 1.2s de delay CSS do fill/drift
  // (o delay conta como duração de push nos ciclos seguintes)
  useEffect(() => {
    if (!introDone) return;
    const t = setTimeout(() => setStarted(true), 1800);
    return () => clearTimeout(t);
  }, [introDone]);

  useEffect(() => {
    const onVis = () => setDocHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const running = started && introDone && !docHidden && !reduced;

  const goTo = (next: number) => {
    if (next === index) return;
    setPrev(index);
    setIndex(next);
  };
  const advance = () => goTo((index + 1) % SLIDES.length);

  // no mobile os ticks somem (display:none mata a animação-relógio do fill),
  // então o autoplay vira um timer com o mesmo ciclo: push (1.2s) + hold
  useEffect(() => {
    if (!isMobile || !running) return;
    const t = setTimeout(() => {
      setPrev(index);
      setIndex((index + 1) % SLIDES.length);
    }, 1200 + HOLD_MS);
    return () => clearTimeout(t);
  }, [isMobile, running, index]);

  // ---- scroll / saída ------------------------------------------------------
  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ["start start", "end start"],
  });

  // TODAS as tabelas de scrub carregam stops explícitos em 0 E 1 — Motion v12
  // promove pra WAAPI/ViewTimeline e preenche keyframes ausentes com o valor
  // base (não "simplificar"). Sob reduced-motion vira o fade plano de hoje.
  const hintOpacity = useTransform(
    scrollYProgress,
    reduced ? [0, 0.35, 1] : [0, 0.06, 0.14, 1],
    reduced ? [1, 0, 0] : [1, 1, 0, 0],
  );
  const frameScale = useTransform(
    scrollYProgress,
    [0, 0.18, 0.5, 1],
    reduced ? [1, 1, 1, 1] : [1, 1, 0.85, 0.85],
  );
  const frameY = useTransform(
    scrollYProgress,
    [0, 0.18, 0.5, 1],
    reduced ? ["0%", "0%", "0%", "0%"] : ["0%", "0%", "-3%", "-3%"],
  );
  const frameRadius = useTransform(
    scrollYProgress,
    [0, 0.18, 0.5, 1],
    reduced ? ["0px", "0px", "0px", "0px"] : ["0px", "0px", "16px", "16px"],
  );
  // fallback reduced: some por opacidade como o hero atual
  const frameOpacity = useTransform(
    scrollYProgress,
    [0, 0.5, 0.8, 1],
    reduced ? [1, 1, 0, 0] : [1, 1, 1, 1],
  );
  const ringOpacity = useTransform(
    scrollYProgress,
    [0, 0.26, 0.42, 1],
    reduced ? [0, 0, 0, 0] : [0, 0, 1, 1],
  );
  const slidesParallaxY = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    reduced
      ? ["0%", "0%", "0%"]
      : isMobile
        ? ["0%", "-3%", "-3%"]
        : ["0%", "-6%", "-6%"],
  );
  // saída dura da tira: desliza pra ESQUERDA sem fade (mecânica de zine);
  // reduced usa o fade plano de UI de hoje
  const plateX = useTransform(
    scrollYProgress,
    [0, 0.36, 0.5, 1],
    reduced ? ["0vw", "0vw", "0vw", "0vw"] : ["0vw", "0vw", "-115vw", "-115vw"],
  );
  const plateOpacity = useTransform(
    scrollYProgress,
    [0, 0.35, 1],
    reduced ? [1, 0, 0] : [1, 1, 1],
  );

  return (
    <div ref={runwayRef} className="relative z-0 h-[200vh]">
      <style>{`
        @keyframes jdpu-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes jdpu-drift { from { transform: scale(1); } to { transform: scale(1.05); } }
        @media (prefers-reduced-motion: reduce) {
          .jdpu-fill-anim, .jdpu-drift-anim { animation: none !important; }
        }
      `}</style>

      <div className="sticky top-0 h-svh overflow-hidden bg-jd-black">
        {/* carimbo de monograma no quadro preto — só aparece quando o impresso encolhe */}
        <span
          aria-hidden
          className="mask-mark mask-monograma absolute left-1/2 top-1/2 h-[70vmin] w-[67vmin] -translate-x-1/2 -translate-y-1/2 text-jd-cream/[0.06]"
        />

        {/* frameWrapper — a janela que vira impresso (scale/y do scrub aqui) */}
        <motion.div
          style={{ scale: frameScale, y: frameY, opacity: frameOpacity }}
          className="absolute inset-0 will-change-transform"
        >
          {/* placa azul deslocada = adesivo colado (herda o scale do pai) */}
          <motion.div
            aria-hidden
            style={{ opacity: ringOpacity }}
            className="absolute inset-0 translate-x-3 translate-y-3 rounded-[16px] bg-jd-blue"
          />
          {/* clipChild — borderRadius scrubado num FILHO, nunca no observado */}
          <motion.div
            style={{ borderRadius: frameRadius }}
            className="absolute inset-0 overflow-hidden bg-jd-black"
            role="region"
            aria-roledescription="carousel"
            aria-label="Fotos da banda Jardim Depressa"
          >
            {/* slidesTrack — parallax de scroll, isolado dos transforms do push */}
            <motion.div style={{ y: slidesParallaxY }} className="absolute inset-0">
              <HeroPasteUpCarousel
                slides={SLIDES}
                index={index}
                prev={prev}
                running={running}
                reduced={reduced}
                introDone={introDone}
                onExitComplete={() => setPrev(null)}
              />
            </motion.div>

            {/* linha de corte — barra de scan de fotocopiadora acompanhando a
                borda de entrada do impresso a cada push */}
            {prev !== null && !reduced && (
              <motion.div
                key={`cut-${index}`}
                aria-hidden
                initial={{ y: "0svh" }}
                animate={{ y: "-100svh" }}
                transition={PUSH}
                className="absolute inset-x-0 top-full z-[5] h-[3px] bg-jd-cream"
              />
            )}

            {/* duotone azul — achata a luminância, parte do sistema de legibilidade */}
            <div aria-hidden className="absolute inset-0 bg-jd-blue/10 mix-blend-color" />
            {/* scrims locais (dentro do clip: encolhem junto com o impresso) */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-[28%] bg-gradient-to-b from-jd-black/60 to-transparent"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-jd-black/80 via-jd-black/30 to-transparent"
            />
            {/* borda creme do impresso */}
            <motion.div
              aria-hidden
              style={{ opacity: ringOpacity }}
              className="pointer-events-none absolute inset-0 rounded-[16px] border-2 border-jd-cream/80"
            />
          </motion.div>
        </motion.div>

        {/* tira de masthead — tinta preta em papel creme, -2° rimando com o
            Marquee coral; legível sobre QUALQUER foto pra sempre (~12.6:1) */}
        <motion.div
          style={{ x: plateX, rotate: -2, opacity: plateOpacity }}
          className="absolute bottom-12 left-[-6vw] z-10 w-[112vw] bg-jd-cream px-[8vw] py-3 md:bottom-[5.5rem] md:py-5"
        >
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={introDone ? { opacity: 1, y: 0 } : {}}
            transition={{ ...RISE, delay: 0.1 }}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 md:gap-x-8 md:gap-y-3"
          >
            <span
              className="mask-mark mask-logo block h-10 w-[8.125rem] shrink-0 text-jd-black md:h-20 md:w-[16.25rem]"
              role="img"
              aria-label="Jardim Depressa"
            />
            {/* CTAs — tinta preta no papel, morando dentro da tira */}
            <div className="flex flex-col items-start gap-0.5 font-miltorn text-[10px] uppercase tracking-[0.25em] md:flex-row md:flex-wrap md:items-center md:gap-4 md:text-[11px]">
              <a
                href={links.spotify}
                target="_blank"
                rel="noreferrer"
                className="py-1 text-xs text-jd-black underline decoration-jd-black underline-offset-4 transition-colors hover:decoration-jd-black/60 md:rounded-full md:bg-jd-black md:px-6 md:py-3 md:text-[11px] md:text-jd-cream md:no-underline md:transition-transform md:hover:scale-105"
              >
                Ouvir no Spotify
              </a>
              {nextShow && (
                // CTA do show como botão de texto — sublinhado, sem pílula
                <a
                  href={nextShow.tickets ?? "#shows"}
                  target={nextShow.tickets ? "_blank" : undefined}
                  rel="noreferrer"
                  className="py-1 text-left text-jd-black underline decoration-jd-black/40 underline-offset-4 transition-colors hover:decoration-jd-black md:py-3 md:text-center"
                >
                  {nextShow.city} ·{" "}
                  {new Date(nextShow.date + "T12:00:00").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}{" "}
                  — Ingressos
                </a>
              )}
            </div>
            <div className="hidden flex-col items-start gap-1 md:flex">
              {/* progresso segmentado — mobília de zine, tinta no papel
                  (só no desktop: no mobile o autoplay roda por timer) */}
              <div className="flex items-center gap-1.5">
                {SLIDES.map((s, i) => (
                  <button
                    key={s.src}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`foto ${i + 1} de ${SLIDES.length}`}
                    aria-current={i === index}
                    className="py-3"
                  >
                    <span className="block h-[2px] w-8 bg-jd-black/20 md:w-10">
                      {i === index &&
                        (reduced ? (
                          <span className="block h-full w-full bg-jd-black" />
                        ) : (
                          // relógio do autoplay: o fill (delay 1.2s = duração
                          // do push) avança o slide no onAnimationEnd
                          <span
                            key={`fill-${index}`}
                            onAnimationEnd={advance}
                            className="jdpu-fill-anim block h-full w-full origin-left scale-x-0 bg-jd-black"
                            style={{
                              animation: `jdpu-fill ${HOLD_MS}ms linear 1200ms forwards`,
                              animationPlayState: running ? "running" : "paused",
                            }}
                          />
                        ))}
                    </span>
                  </button>
                ))}
              </div>
              {/* legenda — flip 0.2s DEPOIS do push começar (camadas dessincronizadas) */}
              <div className="relative h-5 w-56 overflow-hidden">
                <AnimatePresence initial={false}>
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: reduced ? 0 : 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduced ? 0 : -10 }}
                    transition={{
                      duration: reduced ? 0.25 : 0.3,
                      delay: reduced ? 0 : 0.2,
                      ease: [0.33, 1, 0.68, 1],
                    }}
                    className="absolute inset-0 font-lunaquete text-sm italic leading-5 text-jd-black/70"
                  >
                    {SLIDES[index].caption}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* hint — abaixo da tira, na faixa de scrim */}
        <div className="absolute inset-x-0 bottom-5 z-20 flex flex-col items-center md:bottom-8">
          <motion.span style={{ opacity: hintOpacity }} className="block">
            <motion.span
              initial={reduced ? false : { opacity: 0 }}
              animate={
                introDone
                  ? reduced
                    ? { opacity: 0.5 }
                    : { opacity: 0.5, y: [0, 8, 0] }
                  : {}
              }
              transition={{
                opacity: { duration: 0.8, delay: 0.6 },
                y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
              }}
              className="block font-lunaquete text-sm italic"
            >
              role para entrar no jardim
            </motion.span>
          </motion.span>
        </div>
      </div>
    </div>
  );
}
