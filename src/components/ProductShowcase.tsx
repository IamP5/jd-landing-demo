"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import type { Product } from "@/data/site";

function Feature({
  progress,
  range,
  side,
  title,
  text,
  accent,
  dark,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  side: "left" | "right";
  title: string;
  text: string;
  accent: string;
  dark: boolean;
}) {
  const [start, end] = range;
  const mid = (start + end) / 2;
  const opacity = useTransform(
    progress,
    [start, start + 0.04, mid, end],
    [0, 1, 1, 0],
  );
  const y = useTransform(progress, [start, start + 0.06], [40, 0]);

  return (
    <motion.div
      style={{ opacity, y }}
      className={`absolute inset-x-4 bottom-[9%] rounded-2xl p-5 text-center backdrop-blur-sm ${
        dark ? "bg-jd-black/60" : "bg-jd-cream/70"
      } md:inset-x-auto md:bottom-auto md:top-1/2 md:w-72 md:-translate-y-1/2 md:rounded-none md:bg-transparent md:p-0 md:backdrop-blur-none ${
        side === "left"
          ? "md:left-[10%] md:text-left"
          : "md:right-[10%] md:text-right"
      }`}
    >
      <h4
        className="font-miltorn text-xs uppercase tracking-[0.3em]"
        style={{ color: accent }}
      >
        {title}
      </h4>
      <p className="mt-3 text-base leading-relaxed opacity-80 md:text-lg">
        {text}
      </p>
    </motion.div>
  );
}

export default function ProductShowcase({ product }: { product: Product }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const dark = product.theme === "dark";
  const bg = dark ? "bg-jd-black text-jd-cream" : "bg-jd-cream text-jd-black";
  const accent = dark ? "var(--jd-teal)" : "var(--jd-coral)";

  // a camiseta chega enorme (zoom Apple), assenta, gira em pseudo-3D e recua pro CTA
  const scale = useTransform(scrollYProgress, [0, 0.22, 0.85, 1], [2.1, 1, 1, 0.9]);
  const rotateY = useTransform(scrollYProgress, [0.25, 0.5, 0.75], [-16, 0, 16]);
  const rotateX = useTransform(scrollYProgress, [0.25, 0.5, 0.75], [4, 0, 4]);
  const shirtY = useTransform(scrollYProgress, [0, 0.22], ["12%", "0%"]);

  // vetor decorativo flutuando atrás, em parallax contrário
  const vecY = useTransform(scrollYProgress, [0, 1], ["20%", "-20%"]);
  const vecRotate = useTransform(scrollYProgress, [0, 1], [-8, 14]);
  const vecOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 0.18, 0.18, 0]);

  // texto de abertura e CTA final
  const introOpacity = useTransform(scrollYProgress, [0.02, 0.1, 0.2, 0.28], [0, 1, 1, 0]);
  const ctaOpacity = useTransform(scrollYProgress, [0.85, 0.93], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.85, 0.93], [30, 0]);

  const stages: [number, number][] = [
    [0.3, 0.45],
    [0.48, 0.63],
    [0.66, 0.81],
  ];

  return (
    <div ref={ref} className="relative h-[420vh]">
      <div className={`sticky top-0 h-svh overflow-hidden ${bg}`}>
        {/* vetor de fundo */}
        <motion.img
          src={product.vector}
          alt=""
          aria-hidden
          style={{ y: vecY, rotate: vecRotate, opacity: vecOpacity }}
          className="absolute left-1/2 top-1/2 h-[95vmin] w-[95vmin] -translate-x-1/2 -translate-y-1/2 object-contain"
        />

        {/* camiseta */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ perspective: 1200 }}
        >
          <motion.img
            src={product.image}
            alt={product.name}
            style={{ scale, rotateY, rotateX, y: shirtY }}
            className="h-[72vmin] w-auto object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.35)]"
          />
        </div>

        {/* abertura */}
        <motion.div
          style={{ opacity: introOpacity }}
          className="absolute inset-x-0 top-[12%] text-center"
        >
          <h3 className="font-fraktur text-5xl md:text-7xl">{product.name}</h3>
          <p className="mt-3 font-lunaquete text-xl italic opacity-70">
            {product.tagline}
          </p>
        </motion.div>

        {/* features em etapas, alternando lados */}
        {product.features.map((f, i) => (
          <Feature
            key={f.title}
            progress={scrollYProgress}
            range={stages[i] ?? [0.66, 0.81]}
            side={i % 2 === 0 ? "left" : "right"}
            title={f.title}
            text={f.text}
            accent={accent}
            dark={dark}
          />
        ))}

        {/* CTA final */}
        <motion.div
          style={{ opacity: ctaOpacity, y: ctaY }}
          className="absolute inset-x-0 bottom-[10%] flex flex-col items-center gap-5"
        >
          <span className="font-fraktur text-4xl">{product.price}</span>
          <a
            href={product.buy ?? "#"}
            className={`rounded-full px-8 py-4 font-miltorn text-xs uppercase tracking-[0.25em] transition-transform hover:scale-105 ${
              dark ? "bg-jd-teal text-jd-black" : "bg-jd-black text-jd-cream"
            }`}
          >
            Comprar {product.name}
          </a>
        </motion.div>
      </div>
    </div>
  );
}
