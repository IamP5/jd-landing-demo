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
      options={{
        lerp: 0.09,
        wheelMultiplier: 1,
        autoRaf: false,
        /* syncTouch: o Lenis passa a DIRIGIR o toque em vez de deixar o scroll
           nativo rolar. É o que faz o snap da PanelStack existir no celular —
           o Snap escuta `virtual-scroll`, que só é emitido quando o Lenis está
           no comando do gesto. Sem isto, o merch no mobile tem inércia nativa
           e nenhum snap.

           O preço é global (vale pra página inteira, não só pro merch): a
           inércia deixa de ser a do sistema e passa a ser simulada, o que no
           iOS costuma ser o ponto de atrito — barra de endereço, rubber-band
           nas pontas, e a rolagem podendo parecer "escorregadia" perto do topo
           e do rodapé. Se incomodar, é só apagar as três linhas abaixo: o site
           volta ao toque nativo e o snap simplesmente dorme no celular. */
        syncTouch: true,
        syncTouchLerp: 0.075, // padrão do Lenis; menor = mais "pesado"
        touchInertiaExponent: 1.7, // padrão; menor = a inércia morre mais cedo
      }}
      ref={ref}
    >
      {children}
    </ReactLenis>
  );
}
