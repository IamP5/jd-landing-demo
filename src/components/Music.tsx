"use client";

import { useRef, useState, type PointerEvent } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { links } from "@/data/site";
import { useFinePointer } from "@/lib/media";

const EXPO = [0.19, 1, 0.22, 1] as const;

type Release = {
  title: string;
  type: string;
  year: string;
  cover: string;
  url: string;
};

const releases: Release[] = [
  {
    title: "Diabo",
    type: "Single",
    year: "2026",
    cover: "/brand/capa-diabo.jpg",
    url: links.diabo,
  },
  {
    title: "Em Seu Lugar",
    type: "Single",
    year: "2026",
    cover: "/brand/capa-em-seu-lugar.jpg",
    url: links.spotify,
  },
];

const epTracks = ["Seu Nome", "Sobre o Que Costumávamos Pensar?", "Azul", "Abutre"];

/** capa com tilt 3D + brilho que corre contra o cursor, como luz numa capa laminada */
function TiltCover({
  release,
  y,
  className,
}: {
  release: Release;
  y: MotionValue<string>;
  className?: string;
}) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(mx, [0, 1], [-9, 9]), {
    stiffness: 200,
    damping: 20,
  });
  const rotateX = useSpring(useTransform(my, [0, 1], [9, -9]), {
    stiffness: 200,
    damping: 20,
  });
  const sheenX = useTransform(mx, [0, 1], [110, -10]);
  const sheenY = useTransform(my, [0, 1], [110, -10]);
  const sheen = useMotionTemplate`radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(246,247,247,0.16), transparent 55%)`;
  const active = fine && !reduce;

  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
    setHover(false);
  };

  return (
    <motion.div style={{ y }} className={className}>
      <a
        href={release.url}
        target="_blank"
        rel="noreferrer"
        className="group block"
        onPointerMove={active ? onMove : undefined}
        onPointerEnter={active ? () => setHover(true) : undefined}
        onPointerLeave={active ? onLeave : undefined}
      >
        {/* whileInView fica no elemento SEM clip (IO nunca dispara se o próprio
            elemento observado nasce com clip-path 100%); o clip anima no filho */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, amount: 0.3 }}
          style={{ perspective: 1000 }}
        >
          <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          >
            <motion.div
              variants={{
                hidden: { clipPath: "inset(100% 0% 0% 0%)" },
                show: { clipPath: "inset(0% 0% 0% 0%)" },
              }}
              transition={{ duration: 1.1, ease: EXPO }}
              className="relative aspect-square overflow-hidden"
            >
              <img
                src={release.cover}
                alt={`Capa de ${release.title}`}
                className="h-full w-full object-cover"
              />
              <motion.div
                aria-hidden
                style={{ background: sheen }}
                animate={{ opacity: hover ? 1 : 0 }}
                transition={{ duration: 0.35 }}
                className="pointer-events-none absolute inset-0 mix-blend-screen"
              />
            </motion.div>
          </motion.div>
        </motion.div>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="font-fraktur text-3xl text-jd-cream md:text-4xl">
              {release.title}
            </h3>
            <p className="mt-1 font-miltorn text-[10px] uppercase tracking-[0.25em] text-jd-cream/50">
              {release.type} — {release.year}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-jd-cream/80 px-4 py-2 font-miltorn text-[10px] uppercase tracking-[0.25em] text-jd-cream transition-colors group-hover:bg-jd-cream group-hover:text-jd-black">
            Ouvir ↗
          </span>
        </div>
      </a>
    </motion.div>
  );
}

export default function Music() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // três velocidades: capa grande desce devagar, capa pequena sobe contra,
  // título fantasma afunda atrás — profundidade em vez de grade
  const yBig = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);
  const ySmall = useTransform(scrollYProgress, [0, 1], ["14%", "-14%"]);
  const yGhost = useTransform(scrollYProgress, [0, 1], ["-4%", "22%"]);

  return (
    <section
      id="musica"
      ref={ref}
      className="relative overflow-hidden bg-jd-black px-6 pb-16 pt-16 md:px-10 md:pb-20 md:pt-20"
    >
      <h2 className="font-fraktur text-6xl text-jd-cream md:text-8xl">
        Música
      </h2>
      <p className="mt-4 max-w-md text-lg text-jd-cream/60">
        Os últimos lançamentos, direto do jardim.
      </p>

      <div className="relative mt-16 md:mt-24">
        {/* título fantasma gigante atrás da capa em destaque */}
        <motion.span
          aria-hidden
          style={{
            y: yGhost,
            WebkitTextStroke: "1px rgba(239,238,234,0.18)",
            color: "transparent",
          }}
          className="pointer-events-none absolute -top-[0.55em] left-[-2vw] z-0 select-none font-fraktur text-[26vw] leading-none md:text-[18vw]"
        >
          Diabo
        </motion.span>

        <TiltCover
          release={releases[0]}
          y={yBig}
          className="relative z-10 w-[82vw] max-w-3xl md:w-[52vw]"
        />
        <TiltCover
          release={releases[1]}
          y={ySmall}
          className="relative z-20 ml-auto mt-16 w-[64vw] max-w-md md:absolute md:-bottom-[9vw] md:right-[3vw] md:mt-0 md:w-[28vw]"
        />
      </div>

      {/* EP de estreia — verso de encarte: título de arquivo em escala
          editorial + tracklist numerada com reveal escalonado, na mesma
          régua das capas (a faixa achatada de antes não conversava com a seção) */}
      <motion.a
        href={links.spotify}
        target="_blank"
        rel="noreferrer"
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.35 }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
        }}
        className="group relative mt-24 block border-y border-jd-cream/15 py-10 md:mt-[12vw] md:py-14"
      >
        {/* eco fantasma em contorno, rimando com o "Diabo" gigante lá em cima */}
        <span
          aria-hidden
          style={{
            WebkitTextStroke: "1px rgba(239,238,234,0.12)",
            color: "transparent",
          }}
          className="pointer-events-none absolute -top-[0.18em] right-[-5vw] z-0 select-none font-fraktur text-[26vw] leading-none md:text-[15vw]"
        >
          JD.
        </span>

        <div className="relative z-10 grid gap-10 md:grid-cols-[minmax(0,24rem)_1fr] md:gap-16">
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EXPO } },
            }}
            className="flex flex-col items-start justify-between gap-8"
          >
            <div>
              <span className="font-fraktur text-7xl leading-none text-jd-cream md:text-8xl">
                «JD.»
              </span>
              <p className="mt-4 font-miltorn text-[10px] uppercase tracking-[0.3em] text-jd-cream/50">
                EP de estreia — 2024 · 4 faixas
              </p>
            </div>
            <span className="rounded-full border border-jd-cream/80 px-4 py-2 font-miltorn text-[10px] uppercase tracking-[0.25em] text-jd-cream transition-colors group-hover:bg-jd-cream group-hover:text-jd-black">
              Ouvir ↗
            </span>
          </motion.div>

          <ol className="self-center">
            {epTracks.map((t, i) => (
              <motion.li
                key={t}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EXPO } },
                }}
                className="flex items-baseline gap-5 border-b border-jd-cream/10 py-4 transition-transform duration-500 first:border-t hover:translate-x-2 md:gap-8"
              >
                <span className="font-miltorn text-[10px] tracking-[0.25em] text-jd-cream/40">
                  0{i + 1}
                </span>
                <span className="text-lg text-jd-cream/90 md:text-xl">{t}</span>
              </motion.li>
            ))}
          </ol>
        </div>
      </motion.a>
    </section>
  );
}
