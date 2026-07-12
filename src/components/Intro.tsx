"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import { getLenis } from "@/lib/lenis";

/**
 * Abertura do site: primeiro frame já pinta a cortina preta com o monograma
 * (SSR, sem flash), segura ~1s e sai como duas folhas que a prensa puxa pra
 * cima — a preta primeiro com uma linha de corte cream varrendo na borda,
 * o papel cru logo atrás (mesma gramática de fotocopiadora dos carrosséis
 * do hero). O resto do site lê `useIntro()` pra disparar suas entradas.
 */
const IntroContext = createContext(false);
export const useIntro = () => useContext(IntroContext);

// mesma curva PUSH dos carrosséis do hero
const EASE = [0.77, 0, 0.18, 1] as const;
const WIPE_START = 1.05; // segundos de "respiro" antes da cortina subir
const TOTAL_MS = 2200;
const REDUCED_MS = 600;

function Curtain() {
  return (
    <div className="fixed inset-0 z-[80]" aria-hidden>
      {/* papel cru por baixo — segundo tempo do wipe, com hairline de corte */}
      <motion.div
        initial={{ y: "0%" }}
        animate={{ y: "-100%" }}
        transition={{ duration: 0.7, delay: WIPE_START + 0.22, ease: EASE }}
        className="absolute inset-0 bg-jd-cream motion-reduce:hidden"
      >
        <span className="absolute inset-x-0 bottom-0 h-px bg-jd-black/25" />
      </motion.div>
      {/* folha preta da prensa sobe inteira; a linha de corte cream na borda
          inferior varre a tela junto, como o cut line do carrossel */}
      <motion.div
        initial={{ y: "0%" }}
        animate={{ y: "-100%" }}
        transition={{ duration: 0.65, delay: WIPE_START, ease: EASE }}
        className="absolute inset-0 bg-jd-black motion-reduce:hidden"
      >
        <span className="absolute inset-x-0 bottom-0 h-[2px] bg-jd-cream" />
      </motion.div>
      {/* fallback com movimento reduzido: fade simples */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="absolute inset-0 hidden bg-jd-black motion-reduce:block"
      />
      {/* monograma + linha de medida */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3, delay: WIPE_START - 0.15 }}
        className="absolute inset-0 flex flex-col items-center justify-center gap-8"
      >
        <motion.span
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
          className="mask-mark mask-monograma block h-[26vmin] w-[25vmin] text-jd-cream"
        />
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: WIPE_START - 0.2, ease: "easeInOut", delay: 0.15 }}
          className="block h-px w-28 origin-left bg-jd-cream/70"
        />
      </motion.div>
    </div>
  );
}

export default function IntroProvider({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.classList.add("intro-lock");
    // Lenis chega alguns frames depois — insiste até travar
    const hold = setInterval(() => getLenis()?.stop(), 100);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = setTimeout(
      () => {
        clearInterval(hold);
        document.documentElement.classList.remove("intro-lock");
        getLenis()?.start();
        setDone(true);
      },
      reduced ? REDUCED_MS : TOTAL_MS,
    );
    return () => {
      clearTimeout(timer);
      clearInterval(hold);
      document.documentElement.classList.remove("intro-lock");
      getLenis()?.start();
    };
  }, []);

  return (
    <IntroContext.Provider value={done}>
      {children}
      {!done && <Curtain />}
    </IntroContext.Provider>
  );
}
