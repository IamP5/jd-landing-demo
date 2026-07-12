"use client";

import { useState } from "react";
import { motion, type MotionValue, type Variants } from "motion/react";

export type SessaoSlide = { src: string; caption: string; pos: string };

export const SLIDES: SessaoSlide[] = [
  {
    src: "/photos/hero-test-wa0024.jpg",
    caption: "a prece",
    pos: "object-[50%_25%]",
  },
  {
    src: "/photos/hero-test-xcx.jpg",
    caption: "a roda",
    pos: "object-[50%_30%]",
  },
  {
    src: "/photos/hero-test-wa0012.jpg",
    caption: "o canto",
    pos: "object-[50%_30%]",
  },
];

/** push horizontal — power4.inOut, a mesma gramática da variante colagem */
export const PUSH_MS = 1300;
const PUSH = { duration: PUSH_MS / 1000, ease: [0.77, 0, 0.18, 1] as const };

type Props = {
  index: number;
  /** slide saindo durante um push; null = nenhum push ativo */
  prev: number | null;
  /** re-arma drift/linha de corte a cada troca */
  cycle: number;
  /** pausa o drift junto com o relógio do reel */
  paused: boolean;
  introDone: boolean;
  reduced: boolean;
  isMobile: boolean;
  /** parallax vertical de scroll (aplicado aqui pra linha de corte ficar fora) */
  parallaxY: MotionValue<string>;
  /** slide "exiting" terminou de sair — pai limpa prev */
  onExitComplete: () => void;
};

/**
 * Pilha de slides em push horizontal com contra-movimento (±14%, ±10% mobile):
 * o que entra desliza da direita enquanto a img interna contra-move; o que sai
 * vai pra esquerda; ociosos estacionam em x:100% com visibility hidden (snap
 * duration 0). Uma linha de corte "fotocopiadora" acompanha a borda do push.
 * Eixos separados: tempo = horizontal (push), scroll = vertical (parallax).
 * Sob reduced-motion vira crossfade 0.4s só-opacity.
 */
export default function HeroSessaoCarousel({
  index,
  prev,
  cycle,
  paused,
  introDone,
  reduced,
  isMobile,
  parallaxY,
  onExitComplete,
}: Props) {
  // settle 1.3→1 do slide 1 só toca uma vez — remount do driftWrap não repete
  const [settled, setSettled] = useState(false);
  const shift = isMobile ? 10 : 14;

  const slideVariants: Variants = reduced
    ? {
        hidden: { x: "0%", opacity: 0, visibility: "hidden", transition: { duration: 0.4 } },
        active: { x: "0%", opacity: 1, visibility: "visible", transition: { duration: 0.4 } },
        exiting: { x: "0%", opacity: 0, visibility: "visible", transition: { duration: 0.4 } },
      }
    : {
        hidden: { x: "100%", opacity: 1, visibility: "hidden", transition: { duration: 0 } },
        active: { x: "0%", opacity: 1, visibility: "visible", transition: PUSH },
        exiting: { x: "-100%", opacity: 1, visibility: "visible", transition: PUSH },
      };

  const innerVariants: Variants = reduced
    ? {
        hidden: { x: "0%", transition: { duration: 0 } },
        active: { x: "0%", transition: { duration: 0 } },
        exiting: { x: "0%", transition: { duration: 0 } },
      }
    : {
        hidden: { x: `${-shift}%`, transition: { duration: 0 } },
        active: { x: "0%", transition: PUSH },
        exiting: { x: `${shift}%`, transition: PUSH },
      };

  return (
    <>
      {/* parallax só vertical de scroll — o push mora nos filhos */}
      <motion.div style={{ y: parallaxY }} className="absolute inset-0">
        {SLIDES.map((s, i) => {
          const isActive = i === index;
          const state = isActive ? "active" : i === prev ? "exiting" : "hidden";
          const inPush = prev !== null && (i === index || i === prev);
          const imgClass = `h-full w-full object-cover ${s.pos} opacity-80 grayscale`;
          return (
            <motion.div
              key={s.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${SLIDES.length}`}
              aria-hidden={!isActive}
              initial={i === 0 ? "active" : "hidden"}
              animate={state}
              variants={slideVariants}
              onAnimationComplete={(def) => {
                if (def === "exiting" && i === prev) onExitComplete();
              }}
              style={{
                zIndex: isActive ? 2 : i === prev ? 1 : 0,
                // will-change só nos dois slides de um push ativo — nunca nos 4
                willChange: inPush ? "transform" : undefined,
              }}
              className="absolute inset-0 overflow-hidden"
            >
              {/* inner h-[112%]: cobre o frame mesmo com o parallax de -10% */}
              <motion.div
                initial={i === 0 ? "active" : "hidden"}
                animate={state}
                variants={innerVariants}
                className={`absolute top-0 h-[112%] ${
                  isMobile ? "-left-[15%] w-[130%]" : "-left-[20%] w-[140%]"
                }`}
              >
                {/* driftWrap — vida do slide durante o hold (CSS, re-armado por
                    ativação; pausa junto com o relógio via animationPlayState) */}
                <div
                  key={`drift-${i}-${isActive ? cycle : "off"}`}
                  className={`h-full w-full ${isActive && !reduced ? "jdsc-drift-anim" : ""}`}
                  style={{ animationPlayState: paused ? "paused" : "running" }}
                >
                  {i === 0 && !reduced ? (
                    <motion.img
                      src={s.src}
                      alt=""
                      initial={settled ? false : { scale: 1.3 }}
                      animate={introDone ? { scale: 1 } : {}}
                      transition={{ duration: 1.5, ease: [0.33, 1, 0.68, 1] }}
                      onAnimationComplete={() => setSettled(true)}
                      loading="eager"
                      fetchPriority="high"
                      className={imgClass}
                    />
                  ) : (
                    // todos montados + eager: preload garantido, sem flash
                    <img src={s.src} alt="" loading="eager" className={imgClass} />
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* linha de corte — barra de scan cruzando o frame a cada push */}
      {!reduced && prev !== null && (
        <motion.div
          key={`cut-${cycle}`}
          aria-hidden
          initial={{ x: 0 }}
          animate={{ x: "-100vw" }}
          transition={PUSH}
          className="absolute inset-y-0 left-full z-[5] w-[3px] bg-jd-cream/90"
        />
      )}
    </>
  );
}
