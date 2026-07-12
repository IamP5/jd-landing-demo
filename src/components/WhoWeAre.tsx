"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { links } from "@/data/site";
import ExpandableImage from "@/components/ExpandableImage";

/**
 * Presskit vertical "Quem Somos": capítulos de texto e foto alternando lados
 * num ritmo editorial (técnicas do Codrops: wipe de clip-path que retoca ao
 * reentrar, linhas de texto subindo mascaradas, parallax dentro do quadro e
 * lista de faixas em onda senoidal). Conteúdo 100% verificado — ver
 * research_jd/STORYTELLING.md.
 */

const EXPO = [0.19, 1, 0.22, 1] as const;

const riseIn = {
  hidden: { opacity: 0, y: 36 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EXPO },
  },
};

/** Foto com reveal de baixo pra cima + contra-movimento interno + expansão */
function StoryPhoto({
  src,
  alt,
  caption,
  className,
  aspect,
  speed = 1,
  position = "object-center",
}: {
  src: string;
  alt: string;
  caption: string;
  className?: string;
  aspect: string;
  speed?: number;
  /** classe de object-position pra enquadrar o assunto da foto */
  position?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`${-5 * speed}%`, `${5 * speed}%`],
  );

  return (
    // o clip-path anima num filho: se ficasse no elemento observado, o
    // IntersectionObserver veria área 0 e o whileInView nunca dispararia
    <motion.figure
      ref={ref}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.25 }}
      className={className}
    >
      <motion.div
        variants={{
          hidden: { clipPath: "inset(100% 0% 0% 0%)" },
          show: {
            clipPath: "inset(0% 0% 0% 0%)",
            transition: { duration: 1.1, ease: EXPO },
          },
        }}
      >
        <ExpandableImage
          src={src}
          alt={alt}
          caption={caption}
          frameClassName={`${aspect} w-full`}
          imgStyle={{ y }}
          imgClassName={`h-[114%] w-full object-cover transition-[filter] duration-700 hover:grayscale-0 md:grayscale ${position}`}
        />
      </motion.div>
      <motion.figcaption
        variants={riseIn}
        className="mt-3 flex items-baseline justify-between px-1"
      >
        <span className="font-fraktur text-xl text-jd-cream md:text-2xl">
          {caption}
        </span>
        <span className="font-miltorn text-[10px] uppercase tracking-[0.3em] text-jd-blue">
          ampliar +
        </span>
      </motion.figcaption>
    </motion.figure>
  );
}

/** Bloco de texto do capítulo: eyebrow + título mascarado + corpo */
function ChapterText({
  num,
  title,
  body,
  className,
}: {
  num: string;
  title: string;
  body: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.4 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
      className={className}
    >
      <motion.span
        variants={riseIn}
        className="block font-miltorn text-xs uppercase tracking-[0.35em] text-jd-coral"
      >
        {num}
      </motion.span>
      <h3 className="mt-4 overflow-hidden">
        <motion.span
          variants={{
            hidden: { y: "110%" },
            show: { y: "0%", transition: { duration: 0.75, ease: EXPO } },
          }}
          className="block font-fraktur text-4xl leading-tight text-jd-cream md:text-5xl lg:text-6xl"
        >
          {title}
        </motion.span>
      </h3>
      <motion.p
        variants={riseIn}
        className="mt-6 max-w-prose text-base leading-relaxed text-jd-cream/80 md:text-lg"
      >
        {body}
      </motion.p>
    </motion.div>
  );
}

/** Citação de imprensa em destaque */
function PressQuote({
  text,
  source,
  className,
}: {
  text: string;
  source: string;
  className?: string;
}) {
  return (
    <motion.blockquote
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.5 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
      className={`text-center ${className ?? ""}`}
    >
      <motion.p
        variants={riseIn}
        className="mx-auto max-w-3xl font-lunaquete text-2xl italic leading-snug text-jd-cream md:text-4xl"
      >
        “{text}”
      </motion.p>
      <motion.footer
        variants={riseIn}
        className="mt-6 font-miltorn text-[10px] uppercase tracking-[0.3em] text-jd-blue"
      >
        {source}
      </motion.footer>
    </motion.blockquote>
  );
}

/** Lista de faixas em onda: cada linha desloca em seno conforme o scroll */
const faixas = [
  { name: "Seu Nome", meta: "EP «JD.» · 2024" },
  { name: "Sobre o Que Costumávamos Pensar?", meta: "EP «JD.» · 2024" },
  { name: "Azul", meta: "EP «JD.» · 2024" },
  { name: "Abutre", meta: "EP «JD.» · 2024" },
  { name: "Em Seu Lugar", meta: "single · 2026" },
  { name: "Diabo", meta: "single · 2026" },
];

function WaveLine({
  faixa,
  i,
  progress,
}: {
  faixa: (typeof faixas)[number];
  i: number;
  progress: MotionValue<number>;
}) {
  const ref = useRef<HTMLLIElement>(null);
  // onda: fase por índice + progresso do bloco (adaptação do dual-wave do Codrops)
  const x = useTransform(
    progress,
    (p) => Math.sin(0.9 * i + p * Math.PI * 2 - Math.PI / 2) * 56,
  );
  // foco: linha acende quando cruza a faixa central da viewport
  const { scrollYProgress: lineProgress } = useScroll({
    target: ref,
    offset: ["start 78%", "start 30%"],
  });
  const opacity = useTransform(lineProgress, [0, 0.55, 1], [0.28, 1, 0.35]);

  return (
    <motion.li ref={ref} style={{ x, opacity }} className="mx-auto w-max max-w-full text-center">
      <span className="font-fraktur text-3xl text-jd-cream md:text-5xl">
        {faixa.name}
      </span>
      <span className="ml-4 font-miltorn text-[10px] uppercase tracking-[0.3em] text-jd-blue">
        {faixa.meta}
      </span>
    </motion.li>
  );
}

function FaixasWave() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  return (
    <div ref={ref} className="overflow-hidden py-[4vh] text-center">
      <span className="font-miltorn text-xs uppercase tracking-[0.35em] text-jd-coral">
        04 · as faixas
      </span>
      <ul className="mt-10 flex flex-col gap-4 md:gap-5">
        {faixas.map((f, i) => (
          <WaveLine key={f.name} faixa={f} i={i} progress={scrollYProgress} />
        ))}
      </ul>
    </div>
  );
}

/** Créditos da banda */
const members = [
  { name: "Luís Petrachin", role: "guitarra e voz" },
  { name: "Danilo Bento", role: "guitarra, voz e produção" },
  { name: "Bruno «Tuba» Dominicheli", role: "baixo" },
  { name: "Raphael Vale", role: "bateria" },
];

function Credits() {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.4 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      className="grid grid-cols-2 gap-x-6 gap-y-10 text-center md:grid-cols-4"
    >
      {members.map((m) => (
        <motion.div key={m.name} variants={riseIn}>
          <p className="font-fraktur text-2xl text-jd-cream md:text-3xl">
            {m.name}
          </p>
          <p className="mt-2 font-miltorn text-[10px] uppercase tracking-[0.3em] text-jd-blue">
            {m.role}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Foto revelada pela máscara de sol que cresce com o scroll (abertura) */
function SunReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // stops explícitos em 0 e 1: sem eles, animações promovidas pra nativo
  // (ViewTimeline) voltam pro valor base fora do range declarado
  const maskSize = useTransform(
    scrollYProgress,
    [0, 0.05, 0.85, 1],
    ["24vmin", "24vmin", "500vmax", "500vmax"],
  );
  const titleOpacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.3, 1],
    [0, 1, 0, 0],
  );
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);

  return (
    <div ref={ref} className="relative h-[250vh] bg-jd-black">
      <div className="sticky top-0 h-svh overflow-hidden">
        <motion.div
          style={{
            maskImage: "url(/brand/sol.svg)",
            WebkitMaskImage: "url(/brand/sol.svg)",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskSize,
            WebkitMaskSize: maskSize,
          }}
          className="absolute inset-0"
        >
          <motion.img
            src="/photos/promo-cobogo-2.jpg"
            alt="Jardim Depressa em frente a um muro de cobogó"
            style={{ scale: photoScale }}
            className="h-full w-full object-cover grayscale"
          />
          <div className="absolute inset-0 bg-jd-coral/15 mix-blend-color" />
        </motion.div>

        <motion.div
          style={{ opacity: titleOpacity }}
          className="absolute inset-x-0 top-[14%] text-center"
        >
          <p className="font-miltorn text-xs uppercase tracking-[0.35em] text-jd-blue">
            presskit
          </p>
          <h2 className="mt-3 font-fraktur text-6xl text-jd-cream md:text-8xl">
            Quem Somos
          </h2>
        </motion.div>
      </div>
    </div>
  );
}

/** Convite compacto: cita a abertura do SunReveal (sol estático) + CTA */
function Invitation({
  entered,
  onEnter,
}: {
  entered: boolean;
  onEnter: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-svh overflow-hidden bg-jd-black">
      {/* mesma máscara do SunReveal, mas com tamanho fixo — é o truque de
          continuidade: o frame inicial do scrub é idêntico a este */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1, transition: { duration: 1.1, ease: EXPO } }}
        viewport={{ once: false, amount: 0.3 }}
        className="absolute inset-0"
      >
        <motion.div
          animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 7, repeat: Infinity, ease: "easeInOut" }
          }
          style={{
            maskImage: "url(/brand/sol.svg)",
            WebkitMaskImage: "url(/brand/sol.svg)",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskSize: "24vmin",
            WebkitMaskSize: "24vmin",
          }}
          className="absolute inset-0"
        >
          <img
            src="/photos/promo-cobogo-2.jpg"
            alt="Jardim Depressa em frente a um muro de cobogó"
            className="h-full w-full object-cover grayscale"
          />
          <div className="absolute inset-0 bg-jd-coral/15 mix-blend-color" />
        </motion.div>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.3 }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.1 } },
        }}
        className="absolute inset-x-0 top-[14%] text-center"
      >
        <motion.p
          variants={riseIn}
          className="font-miltorn text-xs uppercase tracking-[0.35em] text-jd-blue"
        >
          presskit
        </motion.p>
        <motion.h2
          variants={riseIn}
          className="mt-3 font-fraktur text-6xl text-jd-cream md:text-8xl"
        >
          Quem Somos
        </motion.h2>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.3 }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
        }}
        className="absolute inset-x-0 bottom-[12%] flex flex-col items-center gap-7 px-5 text-center"
      >
        <motion.p
          variants={riseIn}
          className="font-lunaquete text-xl italic text-jd-cream/85 md:text-2xl"
        >
          tem uma história plantada aqui.
        </motion.p>
        <motion.button
          variants={riseIn}
          type="button"
          aria-expanded={entered}
          onClick={onEnter}
          className="rounded-full border border-jd-cream/80 px-7 py-3.5 font-miltorn text-xs uppercase tracking-[0.25em] text-jd-cream transition-colors hover:bg-jd-cream hover:text-jd-black"
        >
          entrar no jardim
        </motion.button>
      </motion.div>
    </div>
  );
}

export default function WhoWeAre() {
  const [entered, setEntered] = useState(false);
  const storyRef = useRef<HTMLDivElement>(null);

  // após montar a história, leva o scroll pro topo do SunReveal pra que o
  // scrub comece do início
  useEffect(() => {
    if (!entered) return;
    const raf = requestAnimationFrame(() => {
      const el = storyRef.current;
      if (!el) return;
      const lenis = (window as unknown as { lenis?: unknown }).lenis as
        | {
            resize?: () => void;
            scrollTo?: (target: HTMLElement, opts?: { duration?: number }) => void;
          }
        | undefined;
      // com wrapper=window o Lenis só re-mede a página no resize da janela;
      // a história adiciona ~9k px e o limite interno fica velho — a roda
      // (virtualizada) travava no fim da altura antiga. Força a re-medição.
      lenis?.resize?.();
      if (typeof lenis?.scrollTo === "function")
        lenis.scrollTo(el, { duration: 1.2 });
      else el.scrollIntoView({ behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [entered]);

  if (!entered) {
    return (
      <section id="quem-somos" aria-label="Quem somos — presskit da banda">
        <Invitation entered={entered} onEnter={() => setEntered(true)} />
      </section>
    );
  }

  return (
    <section id="quem-somos" aria-label="Quem somos — presskit da banda">
      <motion.div
        ref={storyRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EXPO }}
      >
        <SunReveal />

        <div className="bg-jd-black px-5 py-[14vh] md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-y-[18vh] md:gap-y-[26vh]">
          {/* 01 — origem */}
          <div className="grid grid-cols-12 items-center gap-x-6 gap-y-10">
            <ChapterText
              num="01 · origem"
              title="Grande São Paulo, 2022"
              body={
                <>
                  O Jardim Depressa nasceu em 2022, fundado por Luís Petrachin e
                  Danilo Bento. Com Bruno «Tuba» Dominicheli no baixo e Raphael
                  Vale na bateria, virou um quarteto dividido entre Osasco e a
                  Zona Sul de São Paulo.
                </>
              }
              className="col-span-12 md:col-span-5"
            />
            <StoryPhoto
              src="/photos/promo-flag.jpg"
              alt="Os quatro integrantes do Jardim Depressa com a bandeira da banda"
              caption="quatro do jardim"
              aspect="aspect-[4/3]"
              className="col-span-12 md:col-span-7"
            />
            <StoryPhoto
              src="/photos/promo-steps.jpg"
              alt="A banda sentada numa escadaria"
              caption="degraus"
              aspect="aspect-[3/4]"
              speed={1.6}
              className="col-span-8 col-start-3 md:col-span-3 md:col-start-2"
            />
          </div>

          {/* 02 — o som */}
          <div className="grid grid-cols-12 items-center gap-x-6 gap-y-10">
            <StoryPhoto
              src="/photos/promo-mosaic-1.jpg"
              alt="A banda em frente a uma parede de pastilhas"
              caption="pastilha & preto"
              aspect="aspect-[4/5]"
              className="col-span-12 md:col-span-6"
            />
            <ChapterText
              num="02 · o som"
              title="Barulho que aprende a falar"
              body={
                <>
                  Rock alternativo atravessado por post-punk, psicodelia e
                  shoegaze. Guitarras que conversam entre si, bateria em tensão
                  constante e vozes que chegam de longe — entre Radiohead,
                  Pixies, Smashing Pumpkins e Giovani Cidreira.
                </>
              }
              className="col-span-12 md:col-span-5 md:col-start-8"
            />
          </div>

          <PressQuote
            text="Eles constroem paisagens emocionais onde o barulho também aprende a falar."
            source="Ivan J Gorini · Divergent Beats"
          />

          {/* 03 — EP JD. */}
          <div className="grid grid-cols-12 items-center gap-x-6 gap-y-10">
            <ChapterText
              num="03 · a estreia"
              title="EP «JD.» — 2024"
              body={
                <>
                  A estreia saiu em 22 de maio de 2024: quatro faixas gravadas
                  com a urgência de quem precisava existir em disco. «Eu estava
                  louco para ter uma obra para chamar de minha», lembra Luís.
                </>
              }
              className="col-span-12 md:col-span-5 md:col-start-8 md:row-start-1"
            />
            <StoryPhoto
              src="/photos/promo-door.jpg"
              alt="A banda na porta de número 350"
              caption="nº 350"
              aspect="aspect-[3/4]"
              className="col-span-10 md:col-span-4 md:col-start-2 md:row-start-1"
            />
          </div>

          {/* 04 — faixas em onda */}
          <FaixasWave />

          {/* 05 — Em Seu Lugar */}
          <div className="grid grid-cols-12 items-center gap-x-6 gap-y-10">
            <ChapterText
              num="05 · novo capítulo"
              title="Em Seu Lugar — 2026"
              body={
                <>
                  O primeiro single do segundo EP abriu uma fase mais densa e
                  introspectiva. Danilo assume o vocal pela primeira vez — na
                  banda, quem escreveu, canta — numa música sobre atravessar a
                  depressão e descobrir que tudo passa. Mixagem e master de
                  Alejandra Luciani.
                </>
              }
              className="col-span-12 md:col-span-5"
            />
            <StoryPhoto
              src="/photos/promo-street.jpg"
              alt="A banda caminhando de costas numa rua"
              caption="de costas pro medo"
              aspect="aspect-[4/3]"
              className="col-span-12 md:col-span-7"
            />
          </div>

          {/* 06 — Diabo */}
          <div className="grid grid-cols-12 items-center gap-x-6 gap-y-10">
            <StoryPhoto
              src="/photos/promo-alley.jpg"
              alt="A banda num beco estreito"
              caption="beco de casa"
              aspect="aspect-[4/5]"
              className="col-span-12 md:col-span-6"
            />
            <ChapterText
              num="06 · o lado escuro"
              title="Diabo — 2026 👹"
              body={
                <>
                  O lado mais pesado do jardim: pós-punk, tensão em camadas e um
                  final que explode depois do verso «Isso acaba aqui.» A
                  crítica chamou de um single imenso — não é apenas uma canção,
                  é uma experiência.
                </>
              }
              className="col-span-12 md:col-span-5 md:col-start-8"
            />
          </div>

          <PressQuote
            text="«Diabo» não tenta impressionar pela força. Impressiona porque sabe exatamente quando ser delicado e quando explodir."
            source="Divergent Beats · julho de 2026"
          />

          {/* 07 — ao vivo */}
          <div className="grid grid-cols-12 items-center gap-x-6 gap-y-10">
            <StoryPhoto
              src="/photos/live-stage.jpg"
              alt="A banda no palco sob luz de show"
              caption="luz de palco"
              aspect="aspect-video"
              className="col-span-12 md:col-span-8 md:col-start-1"
            />
            <ChapterText
              num="07 · ao vivo"
              title="Nenhum setlist igual"
              body={
                <>
                  Do primeiro show na Casa Rockambole à Porta Maldita: passagens
                  introspectivas, jams psicodélicas e catarse coletiva. No
                  palco, o plano dito em voz alta: «em 2024 nós lançamos quatro
                  músicas e em 2026 serão cinco novas».
                </>
              }
              className="col-span-12 md:col-span-4 md:col-start-9"
            />
          </div>

          {/* céu aberto — respiro full-bleed */}
          <StoryPhoto
            src="/photos/promo-sky.jpg"
            alt="A banda vista de baixo contra o céu"
            caption="céu aberto"
            aspect="aspect-[16/9] md:aspect-[21/9]"
            speed={1.4}
            position="object-bottom"
            className="col-span-12"
          />

          {/* 08 — créditos + fechamento */}
          <div className="flex flex-col items-center gap-16">
            <Credits />
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: false, amount: 0.5 }}
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.12 } },
              }}
              className="flex flex-col items-center gap-8 text-center"
            >
              <motion.h3
                variants={riseIn}
                className="font-fraktur text-5xl text-jd-cream md:text-7xl"
              >
                Vem pro jardim.
              </motion.h3>
              <motion.p variants={riseIn} className="max-w-md text-jd-cream/70">
                Tem mais singles e um EP novo a caminho.
              </motion.p>
              <motion.div
                variants={riseIn}
                className="flex flex-wrap items-center justify-center gap-3 font-miltorn text-xs uppercase tracking-[0.25em] md:gap-4"
              >
                <a
                  href={links.spotify}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-jd-cream px-7 py-3.5 text-jd-black transition-transform hover:scale-105"
                >
                  Ouvir no Spotify
                </a>
                <a
                  href={links.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-jd-cream/80 px-7 py-3.5 text-jd-cream transition-colors hover:bg-jd-cream hover:text-jd-black"
                >
                  Seguir no Instagram
                </a>
              </motion.div>
            </motion.div>
          </div>
        </div>
        </div>
      </motion.div>
    </section>
  );
}
