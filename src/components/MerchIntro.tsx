"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

// divisor de capítulo: anuncia a entrada na área de merch.
// runway curto — o reveal começa assim que a seção fixa (nada de tela
// preta parada) e tudo assenta em p≈0.5; o resto é folga inerte.
// todos os keyframes têm stops explícitos em 0 e 1 (WAAPI preenche
// keyframes ausentes com o valor base e o elemento voltaria ao início).
export default function MerchIntro() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // eyebrow chega primeiro, discreto
  const eyebrowOpacity = useTransform(
    scrollYProgress,
    [0, 0.14, 1],
    [0, 1, 1],
  );
  const eyebrowY = useTransform(
    scrollYProgress,
    [0, 0.14, 1],
    [16, 0, 0],
  );

  // título sobe mascarado (pai overflow-hidden) e assenta com leve escala
  const titleY = useTransform(
    scrollYProgress,
    [0, 0.02, 0.38, 1],
    ["110%", "110%", "0%", "0%"],
  );
  const titleScale = useTransform(
    scrollYProgress,
    [0, 0.02, 0.5, 1],
    [1.08, 1.08, 1, 1],
  );

  // eco fantasma em contorno aparece por último, atrás do título
  const ghostOpacity = useTransform(
    scrollYProgress,
    [0, 0.28, 0.5, 1],
    [0, 0, 1, 1],
  );
  const ghostY = useTransform(
    scrollYProgress,
    [0, 0.28, 0.5, 1],
    ["6%", "6%", "0%", "0%"],
  );

  // fio horizontal abre do centro junto com o eyebrow
  const ruleScaleX = useTransform(
    scrollYProgress,
    [0, 0.05, 0.3, 1],
    [0, 0, 1, 1],
  );

  return (
    <section id="merch" ref={ref} className="relative h-[130vh]">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden bg-jd-black text-jd-cream">
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
    </section>
  );
}
