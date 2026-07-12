"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const LINE = Array(4).fill("Jardim Depressa").join(" • ") + " • ";
const SUBLINE = Array(8).fill("música • loja • shows").join("  —  ") + "  —  ";

export default function Marquee() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          motionOk: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
          touch: "(hover: none)",
        },
        (ctx) => {
          const { motionOk, touch } = ctx.conditions as {
            motionOk: boolean;
            touch: boolean;
          };
          if (!motionOk) return;

          // loop perpétuo: as duas metades do track são idênticas, -50% = seam invisível
          const main = gsap.to(".marquee-main", {
            xPercent: -50,
            ease: "none",
            duration: 18,
            repeat: -1,
          });
          const sub = gsap.to(".marquee-sub", {
            xPercent: -50,
            ease: "none",
            duration: 30,
            repeat: -1,
          });
          sub.timeScale(-1);

          // direção e velocidade do scroll dirigem o loop (padrão Osmo)
          const cap = touch ? 3 : 4;
          ScrollTrigger.create({
            trigger: scope.current,
            start: "top bottom",
            end: "bottom top",
            onUpdate: (self) => {
              const boost =
                1 + Math.min(Math.abs(self.getVelocity()) / 2000, cap);
              const dir = self.direction === 1 ? 1 : -1;
              gsap.to(main, {
                timeScale: dir * boost,
                duration: 0.3,
                overwrite: true,
              });
              gsap.to(sub, {
                timeScale: -dir * boost,
                duration: 0.3,
                overwrite: true,
              });
            },
          });
        },
      );
    },
    { scope },
  );

  return (
    <div
      ref={scope}
      className="relative -rotate-2 overflow-hidden bg-jd-coral py-6 text-jd-black"
    >
      <p
        className="marquee-main flex w-max whitespace-nowrap font-fraktur text-5xl leading-none md:text-7xl"
        aria-hidden
      >
        <span>{LINE}</span>
        <span>{LINE}</span>
      </p>
      <p
        className="marquee-sub mt-3 flex w-max whitespace-nowrap font-miltorn text-lg uppercase tracking-[0.4em] opacity-70"
        aria-hidden
      >
        <span>{SUBLINE}</span>
        <span>{SUBLINE}</span>
      </p>
      <span className="sr-only">Jardim Depressa — música, loja, shows</span>
    </div>
  );
}
