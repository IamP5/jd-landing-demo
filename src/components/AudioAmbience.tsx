"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import gsap from "gsap";
import { subscribeFrame, useNowPlaying } from "@/lib/audio-preview";

/** Véu global — só existe depois do primeiro play.
 *
 *  Toda seção pinta fundo opaco, então nada atrás do conteúdo aparece: a única
 *  camada que funciona no site inteiro é uma camada FIXA POR CIMA, com blend
 *  (é o que .grain e a Nav já fazem).
 *
 *  z-55 é obrigatório: abaixo de 50 a Nav (mix-blend-difference) diferencia
 *  contra este véu e inverte as letras do menu na batida; acima de 60 ele
 *  cobriria o grão. */
export default function AudioAmbience() {
  const { armed, playing } = useNowPlaying();
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!armed || reduce) return;
    const node = ref.current;
    if (!node) return;

    const grain = document.querySelector<HTMLElement>(".grain");
    let bucket = -1;

    const off = subscribeFrame((f) => {
      // as vars vivem na PRÓPRIA camada (folha da árvore): escrever no :root
      // invalidaria o estilo do documento inteiro a cada quadro
      node.style.setProperty("--jd-bass", f.bass.toFixed(2));
      node.style.setProperty("--jd-tre", f.treble.toFixed(2));

      // o grão engrossa em 4 degraus — rima com o steps(4) da tremida e evita
      // repintar uma camada fixa de tela cheia 60x por segundo
      if (grain) {
        const b = Math.min(3, Math.floor(f.level * 4));
        if (b !== bucket) {
          bucket = b;
          grain.style.opacity = String(0.05 + b * 0.02);
        }
      }
    });

    return () => {
      off();
      node.style.removeProperty("--jd-bass");
      node.style.removeProperty("--jd-tre");
      grain?.style.removeProperty("opacity");
    };
  }, [armed, reduce]);

  useEffect(() => {
    if (!armed || reduce) return;
    const node = ref.current;
    if (!node) return;
    const tw = gsap.to(node, {
      opacity: playing ? 1 : 0,
      duration: playing ? 0.9 : 1.2,
      ease: playing ? "power2.out" : "power2.in",
      overwrite: true,
    });
    return () => {
      tw.kill();
    };
  }, [armed, playing, reduce]);

  if (!armed || reduce) return null;
  return <div ref={ref} className="ambience" aria-hidden />;
}
