"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { Product } from "@/data/site";
import Magnetic from "@/components/Magnetic";
import { useFinePointer, useMediaQuery } from "@/lib/media";

/** item da ficha técnica: entra na janela [at, at+0.1] do progresso, em micro-cascata */
function Spec({
  progress,
  at,
  children,
  className,
}: {
  progress: MotionValue<number>;
  at: number;
  children: ReactNode;
  className?: string;
}) {
  // stops explícitos em 0 e 1: o Motion promove opacity pra animação nativa
  // (ViewTimeline) e o WAAPI preenche keyframes ausentes com o valor base —
  // sem o stop final o item desaparecia de novo no fim do runway
  const opacity = useTransform(progress, [0, at, at + 0.12, 1], [0, 0, 1, 1]);
  const y = useTransform(progress, [0, at, at + 0.12, 1], [28, 28, 0, 0]);
  return (
    <motion.div style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}

export default function ProductShowcase({ product }: { product: Product }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const md = useMediaQuery("(min-width: 768px)");
  const pointerOn = fine && !reduce;

  const dark = product.theme === "dark";
  const bg = dark ? "bg-jd-black text-jd-cream" : "bg-jd-cream text-jd-black";
  // vermelho nos dois temas — o azul na camiseta preta destoava (pedido do usuário)
  const accent = "var(--jd-coral)";

  // chegada curta: a camiseta entra grande, assenta e desliza pro lado
  // abrindo espaço pra ficha (no mobile sobe um pouco); tudo termina em
  // p≈0.58 — o resto do runway é folga inerte pra quem passa do ponto
  const scale = useTransform(scrollYProgress, [0, 0.22, 1], [1.5, 1, 1]);
  const shirtY = useTransform(
    scrollYProgress,
    [0, 0.22, 0.4, 1],
    ["10%", "0%", md ? "0%" : "-12%", md ? "0%" : "-12%"],
  );
  const shirtX = useTransform(
    scrollYProgress,
    [0, 0.22, 0.4, 1],
    ["0vw", "0vw", md ? "-17vw" : "0vw", md ? "-17vw" : "0vw"],
  );

  // depois que assenta (p>0.4), o scroll para de mandar e a camiseta
  // passa a "olhar" pro cursor: tilt 3D com mola, gated pelo progresso
  const px = useMotionValue(0); // -0.5..0.5 relativo ao centro do palco
  const py = useMotionValue(0);
  const tiltGate = useTransform(scrollYProgress, [0, 0.4, 0.52, 1], [0, 0, 1, 1]);
  const rawRotY = useTransform(px, [-0.5, 0.5], [-9, 9]);
  const rawRotX = useTransform(py, [-0.5, 0.5], [7, -7]);
  const rotateY = useSpring(
    useTransform([rawRotY, tiltGate], ([r, g]: number[]) => r * g),
    { stiffness: 150, damping: 18, mass: 0.4 },
  );
  const rotateX = useSpring(
    useTransform([rawRotX, tiltGate], ([r, g]: number[]) => r * g),
    { stiffness: 150, damping: 18, mass: 0.4 },
  );

  const onStageMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onStageLeave = () => {
    px.set(0);
    py.set(0);
  };

  // vetor decorativo: parallax de scroll no y, contra-movimento do cursor no x
  const vecY = useTransform(scrollYProgress, [0, 1], ["16%", "-16%"]);
  const vecRotate = useTransform(scrollYProgress, [0, 1], [-8, 10]);
  const vecOpacity = useTransform(scrollYProgress, [0, 0.15, 1], [0, 0.18, 0.18]);
  const vecX = useSpring(useTransform(px, (v) => v * -48), {
    stiffness: 80,
    damping: 20,
  });

  // texto de abertura some quando a ficha chega
  const introOpacity = useTransform(
    scrollYProgress,
    [0, 0.02, 0.08, 0.16, 0.24, 1],
    [0, 0, 1, 1, 0, 0],
  );

  return (
    <div ref={ref} className="relative h-[280vh]">
      <div
        className={`sticky top-0 h-svh overflow-hidden ${bg}`}
        onPointerMove={pointerOn ? onStageMove : undefined}
        onPointerLeave={pointerOn ? onStageLeave : undefined}
      >
        {/* vetor de fundo */}
        <motion.img
          src={product.vector}
          alt=""
          aria-hidden
          style={{ x: vecX, y: vecY, rotate: vecRotate, opacity: vecOpacity }}
          className="absolute left-1/2 top-1/2 h-[95vmin] w-[95vmin] -translate-x-1/2 -translate-y-1/2 object-contain"
        />

        {/* camiseta: scroll (chegada) → flutuação ociosa → tilt de cursor */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ perspective: 1000 }}
        >
          <motion.div style={{ x: shirtX, y: shirtY, scale }}>
            <motion.div
              animate={reduce ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.div
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-[62vmin] w-auto object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.35)] md:h-[68vmin]"
                />
              </motion.div>
            </motion.div>
          </motion.div>
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

        {/* ficha técnica: preço + qualidades + CTA chegam juntos, em onda curta,
            e ficam — é o estado de descanso da seção */}
        <div
          className={`absolute inset-x-4 bottom-[4%] rounded-2xl p-5 text-center backdrop-blur-sm ${
            dark ? "bg-jd-black/60" : "bg-jd-cream/70"
          } md:inset-x-auto md:bottom-auto md:right-[7%] md:top-1/2 md:w-[30%] md:max-w-sm md:-translate-y-1/2 md:rounded-none md:bg-transparent md:p-0 md:text-left md:backdrop-blur-none`}
        >
          <Spec progress={scrollYProgress} at={0.32}>
            <span className="font-fraktur text-5xl md:text-6xl">
              {product.price}
            </span>
          </Spec>
          {product.features.map((f, i) => (
            <Spec
              key={f.title}
              progress={scrollYProgress}
              at={0.35 + i * 0.03}
              className={`mt-3 border-t pt-3 md:mt-4 md:pt-4 ${
                dark ? "border-jd-cream/10" : "border-jd-black/10"
              }`}
            >
              <h4
                className="font-miltorn text-[10px] uppercase tracking-[0.3em] md:text-xs"
                style={{ color: accent }}
              >
                {f.title}
              </h4>
              <p className="mt-1 hidden text-sm leading-relaxed opacity-75 md:block">
                {f.text}
              </p>
            </Spec>
          ))}
          <Spec progress={scrollYProgress} at={0.46} className="mt-5 md:mt-8">
            <Magnetic>
              <a
                href={product.buy ?? "#"}
                className={`inline-block rounded-full px-8 py-4 font-miltorn text-xs uppercase tracking-[0.25em] transition-transform hover:scale-105 ${
                  dark ? "bg-jd-cream text-jd-black" : "bg-jd-black text-jd-cream"
                }`}
              >
                Comprar {product.name}
              </a>
            </Magnetic>
          </Spec>
        </div>
      </div>
    </div>
  );
}
