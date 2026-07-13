"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  AnimatePresence,
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
import { subscribeFrame, usePreview, useNowPlaying } from "@/lib/audio-preview";

const EXPO = [0.19, 1, 0.22, 1] as const;

type Release = {
  title: string;
  type: string;
  year: string;
  cover: string;
  url: string;
  /** prévia em public/audio — omitir esconde o botão de play */
  preview?: string;
};

const releases: Release[] = [
  {
    title: "Diabo",
    type: "Single",
    year: "2026",
    cover: "/brand/capa-diabo.jpg",
    url: links.diabo,
    preview: "/audio/diabo.mp3",
  },
  {
    title: "Em Seu Lugar",
    type: "Single",
    year: "2026",
    cover: "/brand/capa-em-seu-lugar.jpg",
    url: links.spotify,
    preview: "/audio/em-seu-lugar.mp3",
  },
];

const epTracks = ["Seu Nome", "Sobre o Que Costumávamos Pensar?", "Azul", "Abutre"];

const RING = 2 * Math.PI * 21; // r=21 no <circle> abaixo
const WAVE_POINTS = 32;

/** botão sobre a capa: o progresso continua sendo informação discreta (React, ~4x/s);
 *  o contorno e o halo respondem ao analisador direto no DOM, sem render a 60fps */
function PlayButton({ src, title }: { src: string; title: string }) {
  const { playing, progress, owns, toggle } = usePreview(src);
  const fine = useFinePointer();
  const reduce = useReducedMotion() ?? false;
  const waveRef = useRef<SVGPathElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!owns || reduce) return;
    const path = waveRef.current;
    const halo = haloRef.current;
    const off = subscribeFrame((f) => {
      if (path) {
        let d = "";
        for (let i = 0; i < WAVE_POINTS; i++) {
          const a = (i / WAVE_POINTS) * Math.PI * 2;
          const sample = (f.wave[i * 2] + f.wave[i * 2 + 1]) / 2;
          const r = 18.5 + ((sample - 128) / 128) * 1.4;
          const x = 24 + Math.cos(a) * r;
          const y = 24 + Math.sin(a) * r;
          d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
        }
        path.setAttribute("d", `${d}Z`);
        path.style.opacity =
          f.level > 0.004 ? Math.min(0.6, 0.14 + f.level * 0.5).toFixed(2) : "0";
      }
      if (halo) {
        halo.style.transform = `scale(${(1 + f.kick * 0.11).toFixed(3)})`;
        halo.style.opacity =
          f.level > 0.004
            ? Math.min(0.38, f.level * 0.24 + f.kick * 0.16).toFixed(2)
            : "0";
      }
    });

    // troca, pausa completa ou unmount não podem congelar um frame reativo
    return () => {
      off();
      path?.setAttribute("d", "");
      if (path) path.style.opacity = "0";
      if (halo) {
        halo.style.removeProperty("transform");
        halo.style.opacity = "0";
      }
    };
  }, [owns, reduce]);

  const interactive = fine && !reduce;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
      <motion.button
        type="button"
        onClick={toggle}
        aria-label={`${playing ? "Pausar" : "Tocar"} prévia de ${title}`}
        aria-pressed={playing}
        whileHover={
          interactive ? { scale: 1.06 } : undefined
        }
        whileTap={!reduce ? { scale: 0.96 } : undefined}
        transition={{ type: "spring", stiffness: 320, damping: 24, mass: 0.6 }}
        /* O vidro quase sem cor deixa a própria capa preencher o controle. O blend
           mantém o ícone legível tanto no papel claro quanto no miolo escuro. */
        className="pointer-events-auto relative grid h-16 w-16 place-items-center rounded-full border border-jd-cream/70 bg-jd-black/10 text-jd-cream shadow-[0_8px_32px_rgba(0,0,0,0.18)] mix-blend-difference backdrop-blur-[3px] backdrop-saturate-150 transition-colors hover:bg-jd-cream/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jd-cream md:h-20 md:w-20"
      >
        <span
          ref={haloRef}
          aria-hidden
          style={{ opacity: 0 }}
          className="pointer-events-none absolute -inset-[6px] rounded-full border border-jd-cream/60 will-change-[transform,opacity]"
        />

        <svg
          aria-hidden
          viewBox="0 0 48 48"
          className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
        >
        <path
          ref={waveRef}
          d=""
          fill="none"
          stroke="currentColor"
          strokeWidth={0.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0 }}
        />
        <circle
          cx="24"
          cy="24"
          r="21"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={RING}
          strokeDashoffset={RING * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-200 ease-linear motion-reduce:transition-none"
        />
        </svg>

        <AnimatePresence initial={false}>
          <motion.span
            key={playing ? "pause" : "play"}
            aria-hidden
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.82 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 grid place-items-center"
          >
            {playing ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 md:h-6 md:w-6">
                <rect x="6" y="4" width="4" height="16" rx="0.5" />
                <rect x="14" y="4" width="4" height="16" rx="0.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-5 w-5 md:h-6 md:w-6">
                <path d="M7 4.5v15l13-7.5-13-7.5Z" />
              </svg>
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

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
  const now = useNowPlaying();
  const imgRef = useRef<HTMLImageElement>(null);
  const bassLightRef = useRef<HTMLDivElement>(null);
  const trebleLightRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  // "mine" = o áudio é desta capa; "owns" = ...e o analisador existe pra desenhar.
  // Separar os dois importa: com movimento reduzido o grafo nunca nasce, e usar
  // owns aqui apagaria as DUAS capas, inclusive a que está tocando
  const mine = !!release.preview && now.src === release.preview;
  const owns = mine && now.armed;
  const dim = now.playing && now.src !== null && !mine; // a outra se recolhe: a música escolheu

  // a capa respira DENTRO do próprio quadro (o box do card não se mexe).
  // A escala vai no <img>, nunca num nó que já carrega rotateX/rotateY
  useEffect(() => {
    if (!owns || reduce) return;
    const img = imgRef.current;
    const bassLight = bassLightRef.current;
    const trebleLight = trebleLightRef.current;
    const flash = flashRef.current;
    if (!img || !bassLight || !trebleLight || !flash) return;
    const off = subscribeFrame((f) => {
      img.style.transform = `scale(${(1 + f.kick * 0.035).toFixed(4)})`;
      bassLight.style.opacity = Math.min(0.72, f.bass * 0.56 + f.kick * 0.18).toFixed(3);
      bassLight.style.transform = `translate3d(${(-5 + f.mid * 8).toFixed(2)}%, ${(5 - f.bass * 8).toFixed(2)}%, 0) scale(${(0.96 + f.bass * 0.16).toFixed(3)})`;
      trebleLight.style.opacity = Math.min(0.6, f.treble * 0.48 + f.level * 0.1).toFixed(3);
      trebleLight.style.transform = `translate3d(${(5 - f.treble * 10).toFixed(2)}%, ${(-5 + f.mid * 8).toFixed(2)}%, 0) scale(${(0.96 + f.treble * 0.12).toFixed(3)})`;
      flash.style.opacity = Math.min(0.28, f.kick * 0.22).toFixed(3);
    });
    // idem: sem isto a capa que perde a posse fica ampliada até o fim da sessão
    return () => {
      off();
      img.style.transform = "";
      for (const light of [bassLight, trebleLight, flash]) {
        light.style.opacity = "0";
        light.style.transform = "";
      }
    };
  }, [owns, reduce]);

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

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
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
    <motion.div
      style={{ y, opacity: dim ? 0.55 : 1 }}
      className={`${className ?? ""} transition-opacity duration-700`}
    >
      {/* o link vira overlay esticado (z-10) em vez de embrulhar o card: botão
          dentro de <a> é HTML inválido e o clique no play viraria navegação */}
      <div
        className="group relative"
        onPointerMove={active ? onMove : undefined}
        onPointerEnter={active ? () => setHover(true) : undefined}
        onPointerLeave={active ? onLeave : undefined}
      >
        {/* z-20: a capa passa a ficar ACIMA do link esticado, senão o botão de play
            — agora filho de um nó com transform, ou seja, preso no contexto de
            empilhamento dele — cairia embaixo do <a> e o clique viraria navegação.
            pointer-events-none devolve o clique da ARTE ao link; só o botão
            reativa o ponteiro. Assim ele é parte do card e ninguém perde nada */}
        <div className="pointer-events-none relative z-20">
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
                  ref={imgRef}
                  src={release.cover}
                  alt={`Capa de ${release.title}`}
                  className="h-full w-full object-cover will-change-transform [backface-visibility:hidden]"
                />
                {/* Três luzes pintadas sobre a fotografia: graves aquecem a base,
                    agudos atravessam o alto e o ataque abre um flash curto. */}
                <div
                  ref={bassLightRef}
                  aria-hidden
                  style={{
                    opacity: 0,
                    background:
                      "radial-gradient(circle at 28% 76%, rgba(236,96,96,0.95) 0%, rgba(236,96,96,0.38) 28%, transparent 68%)",
                  }}
                  className="pointer-events-none absolute -inset-[18%] mix-blend-screen will-change-[transform,opacity]"
                />
                <div
                  ref={trebleLightRef}
                  aria-hidden
                  style={{
                    opacity: 0,
                    background:
                      "radial-gradient(ellipse at 74% 22%, rgba(125,155,255,0.9) 0%, rgba(125,155,255,0.32) 32%, transparent 70%)",
                  }}
                  className="pointer-events-none absolute -inset-[18%] mix-blend-screen will-change-[transform,opacity]"
                />
                <div
                  ref={flashRef}
                  aria-hidden
                  style={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 bg-jd-off mix-blend-overlay will-change-[opacity]"
                />
                {/* o brilho é a língua do cursor; a resposta da música agora fica
                    por cima das luzes para continuar legível durante a reprodução */}
                <motion.div
                  aria-hidden
                  style={{ background: sheen }}
                  animate={{ opacity: hover ? 1 : 0 }}
                  transition={{ duration: 0.35 }}
                  className="pointer-events-none absolute inset-0 mix-blend-screen"
                />

                {/* o botão mora DENTRO da capa: inclina no tilt, entra junto no
                    reveal e nunca mais descola quando o mouse passa */}
                {release.preview && (
                  <PlayButton src={release.preview} title={release.title} />
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

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

        <a
          href={release.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Ouvir ${release.title} (${release.type}, ${release.year})`}
          className="absolute inset-0 z-10"
        />
      </div>
    </motion.div>
  );
}

export default function Music() {
  const ref = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const now = useNowPlaying();
  const reduceMotion = useReducedMotion() ?? false;

  // a blackletter fantasma pisca com a faixa. Repintar um texto de 26vw é caro:
  // só escreve quando o degrau muda de verdade (poucas vezes por segundo)
  useEffect(() => {
    if (!now.armed || !now.src || reduceMotion) return;
    const g = ghostRef.current;
    if (!g) return;
    let step = -1;
    const off = subscribeFrame((f) => {
      const s = Math.round((0.18 + f.level * 0.3) / 0.04);
      if (s === step) return;
      step = s;
      g.style.setProperty("--ghost", (s * 0.04).toFixed(2));
    });
    return () => {
      off();
      g.style.removeProperty("--ghost");
    };
  }, [now.armed, now.src, reduceMotion]);

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
          ref={ghostRef}
          aria-hidden
          style={{
            y: yGhost,
            WebkitTextStroke: "1px rgb(239 238 234 / var(--ghost, 0.18))",
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
