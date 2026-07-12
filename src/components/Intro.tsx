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
 * (SSR, sem flash), segura ~1s e sai em colunas que sobem em cascata com uma
 * folha teal por baixo — efeito de "descolar o papel da prensa".
 * O resto do site lê `useIntro()` pra disparar suas entradas em sincronia.
 */
const IntroContext = createContext(false);
export const useIntro = () => useContext(IntroContext);

const EASE = [0.76, 0, 0.24, 1] as const;
const COLUMNS = 5;
const WIPE_START = 1.05; // segundos de "respiro" antes da cortina subir
const TOTAL_MS = 2200;
const REDUCED_MS = 600;

function Curtain() {
  return (
    <div className="fixed inset-0 z-[80]" aria-hidden>
      {/* folha teal por baixo — segundo tempo do wipe */}
      <motion.div
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 0.7, delay: WIPE_START + 0.28, ease: EASE }}
        className="absolute inset-0 origin-top bg-jd-teal motion-reduce:hidden"
      />
      {/* colunas pretas subindo em cascata */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: COLUMNS }, (_, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 1 }}
            animate={{ scaleY: 0 }}
            transition={{
              duration: 0.65,
              delay: WIPE_START + i * 0.07,
              ease: EASE,
            }}
            className="h-full flex-1 origin-top bg-jd-black motion-reduce:hidden"
          />
        ))}
      </div>
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
          className="block h-px w-28 origin-left bg-jd-coral"
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
