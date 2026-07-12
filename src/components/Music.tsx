"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { links } from "@/data/site";

const releases = [
  {
    title: "Diabo",
    cover: "/brand/capa-diabo.png",
    url: links.spotify,
  },
  {
    title: "Em Seu Lugar",
    cover: "/brand/capa-em-seu-lugar.png",
    url: links.spotify,
  },
];

export default function Music() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // capas em velocidades diferentes = parallax
  const yA = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const yB = useTransform(scrollYProgress, [0, 1], [160, -40]);
  const titleY = useTransform(scrollYProgress, [0, 1], [40, -40]);
  // contra-movimento da arte dentro do quadro (profundidade)
  const innerY = useTransform(scrollYProgress, [0, 1], ["-8%", "0%"]);

  return (
    <section id="musica" ref={ref} className="relative bg-jd-black px-6 py-32 md:px-10">
      <motion.h2
        style={{ y: titleY }}
        className="font-fraktur text-6xl text-jd-cream md:text-8xl"
      >
        Música
      </motion.h2>
      <p className="mt-4 max-w-md text-lg text-jd-cream/60">
        Os últimos lançamentos, direto do jardim.
      </p>

      <div className="mt-20 grid gap-16 md:grid-cols-2 md:gap-10">
        {releases.map((r, i) => (
          <motion.a
            key={r.title}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            style={{ y: i === 0 ? yA : yB }}
            whileHover={{ scale: 1.03, rotate: i === 0 ? -1.5 : 1.5 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="group block"
          >
            <div className="aspect-square overflow-hidden">
              <motion.img
                src={r.cover}
                alt={`Capa de ${r.title}`}
                style={{ y: innerY }}
                className="h-[116%] w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="mt-5 flex items-center justify-between">
              <h3 className="font-fraktur text-3xl text-jd-cream">{r.title}</h3>
              <span className="font-miltorn text-xs uppercase tracking-[0.25em] text-jd-teal group-hover:underline">
                Ouvir ↗
              </span>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
