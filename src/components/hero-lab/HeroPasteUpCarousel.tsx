"use client";

import { motion, type Variants } from "motion/react";

/** push "parallax vertical" — mesma curva do power4.inOut */
export const PUSH = { duration: 1.2, ease: [0.77, 0, 0.18, 1] as const };

export type HeroPasteUpSlide = {
  src: string;
  caption: string;
  /** âncora de corte do object-position (fotos 3:2 cortam feio no retrato) */
  pos: string;
};

type Props = {
  slides: readonly HeroPasteUpSlide[];
  index: number;
  /** slide saindo durante um push; null = nenhum push ativo */
  prev: number | null;
  /** relógio de autoplay rodando (drift pausa junto) */
  running: boolean;
  reduced: boolean;
  introDone: boolean;
  /** slide "exiting" terminou de sair — pai limpa prev */
  onExitComplete: () => void;
};

// slides: entra por baixo (y 100% → 0) enquanto a img interna contra-move
// (-15% → 0); o que sai sobe (0 → -100%) com a img indo a +15%. Ociosos
// estacionam em y:100% com visibility hidden (snap de volta com duration 0).
// Sob reduced-motion vira crossfade de 0.25s (troca manual via segmentos).
function slideVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0, visibility: "hidden", transition: { duration: 0.25 } },
      active: { opacity: 1, visibility: "visible", transition: { duration: 0.25 } },
      exiting: { opacity: 0, visibility: "hidden", transition: { duration: 0.25 } },
    };
  }
  return {
    hidden: { y: "100%", visibility: "hidden", transition: { duration: 0 } },
    active: { y: "0%", visibility: "visible", transition: PUSH },
    exiting: { y: "-100%", visibility: "visible", transition: PUSH },
  };
}

function counterVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { y: "0%", transition: { duration: 0 } },
      active: { y: "0%", transition: { duration: 0 } },
      exiting: { y: "0%", transition: { duration: 0 } },
    };
  }
  return {
    hidden: { y: "-15%", transition: { duration: 0 } },
    active: { y: "0%", transition: PUSH },
    exiting: { y: "15%", transition: PUSH },
  };
}

export default function HeroPasteUpCarousel({
  slides,
  index,
  prev,
  running,
  reduced,
  introDone,
  onExitComplete,
}: Props) {
  const slideV = slideVariants(reduced);
  const counterV = counterVariants(reduced);

  return (
    <>
      {slides.map((s, i) => {
        const state = i === index ? "active" : i === prev ? "exiting" : "hidden";
        const inPush = prev !== null && (i === index || i === prev);
        const imgClass = `h-full w-full object-cover ${s.pos} opacity-80 grayscale`;
        return (
          <motion.div
            key={s.src}
            variants={slideV}
            initial={i === 0 ? "active" : "hidden"}
            animate={state}
            onAnimationComplete={(def) => {
              if (def === "exiting") onExitComplete();
            }}
            style={{
              zIndex: i === index ? 2 : i === prev ? 1 : 0,
              // will-change só nos dois slides de um push ativo — nunca nos 4
              // persistentemente (memória do compositor no Safari mobile)
              willChange: inPush ? "transform" : undefined,
            }}
            className="absolute inset-0 overflow-hidden"
            role="group"
            aria-roledescription="slide"
            aria-label={`foto ${i + 1} de ${slides.length}`}
          >
            {/* driftWrap — vida do slide: scale 1 → 1.05 durante o hold (CSS,
                pausa junto com o relógio via animationPlayState); some quando o
                slide volta a "hidden", então reativa do zero na próxima vez */}
            <div
              className="jdpu-drift-anim h-full w-full"
              style={
                (i === index || i === prev) && !reduced
                  ? {
                      animation: "jdpu-drift 3300ms linear 1200ms forwards",
                      animationPlayState: running ? "running" : "paused",
                    }
                  : undefined
              }
            >
              {/* camada do contra-movimento (variants) separada do settle de
                  entrada — nunca combinar os dois transforms num nó só */}
              <motion.div variants={counterV} className="h-[118%] w-full">
                {i === 0 ? (
                  <motion.img
                    src={s.src}
                    alt=""
                    initial={reduced ? false : { scale: 1.3 }}
                    animate={introDone ? { scale: 1 } : {}}
                    transition={{ duration: 1.5, ease: [0.33, 1, 0.68, 1] }}
                    loading="eager"
                    fetchPriority="high"
                    className={imgClass}
                  />
                ) : (
                  // todos ficam montados + eager: preload garantido, sem flash
                  <img src={s.src} alt="" loading="eager" className={imgClass} />
                )}
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
}
