"use client";

import { motion, useTransform } from "motion/react";
import type { PanelProgress } from "@/components/PanelStack";

/* Divisor de capítulo: anuncia a entrada na área de merch.

   Agora é um painel da PanelStack — quem dá o `sticky`, o fundo e a recuada é
   ela. Aqui só mora a coreografia, pendurada no `compose`: 0→1 é o runway
   inteiro da montagem (antes era ~metade de um container de 130vh, com folga
   inerte depois; o snap comeu essa folga).

   Todos os keyframes têm stop explícito em 0 e 1: o Motion promove opacity pra
   animação nativa e o WAAPI preenche keyframe ausente com o valor base — sem o
   stop final o elemento voltaria ao início no fim do runway. */

export default function MerchIntro({ compose }: PanelProgress) {
  // eyebrow chega primeiro, discreto
  const eyebrowOpacity = useTransform(compose, [0, 0.2, 1], [0, 1, 1]);
  const eyebrowY = useTransform(compose, [0, 0.2, 1], [16, 0, 0]);

  // título sobe mascarado (pai overflow-hidden) e assenta com leve escala
  const titleY = useTransform(
    compose,
    [0, 0.04, 0.55, 1],
    ["110%", "110%", "0%", "0%"],
  );
  const titleScale = useTransform(compose, [0, 0.04, 0.7, 1], [1.08, 1.08, 1, 1]);

  // eco fantasma em contorno aparece por último, atrás do título
  const ghostOpacity = useTransform(compose, [0, 0.4, 0.72, 1], [0, 0, 1, 1]);
  const ghostY = useTransform(
    compose,
    [0, 0.4, 0.72, 1],
    ["6%", "6%", "0%", "0%"],
  );

  // fio horizontal abre do centro junto com o eyebrow
  const ruleScaleX = useTransform(compose, [0, 0.07, 0.43, 1], [0, 0, 1, 1]);

  return (
    <div className="relative flex h-full flex-col items-center justify-center">
      <motion.p
        style={{ opacity: eyebrowOpacity, y: eyebrowY }}
        className="font-miltorn text-[10px] uppercase tracking-[0.3em] text-jd-blue md:text-xs"
      >
        vista o jardim
      </motion.p>

      <div className="relative mt-4 md:mt-6">
        {/* eco em contorno, deslocado atrás do título sólido */}
        <motion.span
          aria-hidden
          style={{
            opacity: ghostOpacity,
            y: ghostY,
            WebkitTextStroke: "1px rgba(239,238,234,0.18)",
            color: "transparent",
          }}
          className="pointer-events-none absolute left-[0.04em] top-[0.05em] z-0 select-none font-fraktur text-[22vw] leading-none md:text-[18vw]"
        >
          Merch
        </motion.span>

        {/* máscara do rise: overflow-hidden no pai, y anima no filho */}
        <div className="relative z-10 overflow-hidden">
          <motion.h2
            style={{ y: titleY, scale: titleScale }}
            className="font-fraktur text-[22vw] leading-none text-jd-cream md:text-[18vw]"
          >
            Merch
          </motion.h2>
        </div>
      </div>

      <motion.div
        aria-hidden
        style={{ scaleX: ruleScaleX }}
        className="mt-8 h-px w-40 bg-jd-cream/25 md:mt-12 md:w-64"
      />

      <motion.p
        style={{ opacity: ghostOpacity }}
        className="mt-6 max-w-xs text-center text-sm text-jd-cream/50 md:text-base"
      >
        Peças pra levar o jardim com você.
      </motion.p>
    </div>
  );
}
