"use client";

import { useEffect, useRef } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// expõe a instância para debug/anchor scroll (o pacote lenis já declara window.lenis com outro tipo)
const exposeLenis = (lenis: unknown) => {
  (window as unknown as Record<string, unknown>).lenis = lenis;
};

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<LenisRef>(null);

  // ponte única Lenis ↔ GSAP: um só frame loop para o site inteiro
  useEffect(() => {
    let bridged = false;
    const tick = (time: number) => {
      ref.current?.lenis?.raf(time * 1000);
    };
    const id = setInterval(() => {
      const lenis = ref.current?.lenis;
      if (lenis && !bridged) {
        bridged = true;
        exposeLenis(lenis);
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        clearInterval(id);
      }
    }, 100);
    return () => {
      clearInterval(id);
      gsap.ticker.remove(tick);
      exposeLenis(undefined);
    };
  }, []);

  return (
    <ReactLenis
      root
      options={{ lerp: 0.09, wheelMultiplier: 1, autoRaf: false }}
      ref={ref}
    >
      {children}
    </ReactLenis>
  );
}
