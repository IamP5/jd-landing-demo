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

/**
 * Foto revelada pela máscara do monograma JD, que cresce com o scroll até abrir
 * o quadro inteiro — o mesmo gesto do sol, agora com as letras da marca.
 *
 * Uma marca é traço, não disco: ampliada a partir do centro geométrico, as
 * contraformas do J e do D seguem recortando a foto por maior que ela fique — o
 * centro do monograma cai justo no vão entre as duas letras. O zoom precisa ser
 * ancorado DENTRO da tinta pra fechar o quadro.
 *
 * Só que a âncora do zoom é a MESMA propriedade que posiciona a marca
 * (mask-position), então ancorar na tinta com um `43,1% 42,2%` jogava o JD pra
 * fora do centro da tela. Daí a máscara ter um SVG só dela: monograma-mask.svg é
 * o monograma com o viewBox expandido simetricamente em volta do ponto de tinta
 * mais grossa (maior círculo inscrito, achado por transformada de distância).
 * Nesse SVG a tinta grossa cai exatamente em 50% 50% — então `center` centraliza
 * a marca E ancora o zoom na tinta de uma vez só. Regenerar com a fórmula do
 * comentário no topo do arquivo gerado, se o monograma mudar.
 *
 * Tamanho final: raio inscrito de 5,07% da largura da máscara contra 0,707 tela
 * até o canto (âncora no centro) → a máscara precisa de ~14 telas (~1395vmax).
 * MASK_TO leva a 2000vmax de folga. O traço grosso do monograma sai barato: o
 * logotipo tipográfico, de haste fina (raio 1,46%), pedia 6500vmax pro mesmo.
 * (Cuidado: vmax é 1% da viewport, não uma tela — 160vmax dá 2% de tinta, não 2×.)
 */
const MASK_SRC = "url(/brand/monograma-mask.svg)";
const MASK_ANCHOR = "center";
const MASK_FROM = "22vmax";
const MASK_TO = "2000vmax";

/**
 * Sobra um resíduo: no SVG padded quem está no centro é a TINTA, e o desenho fica
 * 6,1% / 6,8% pra direita e pra baixo dela — o JD nasceria fora do eixo da tela.
 * (Não dá pra resolver na mask-position: ela é, ao mesmo tempo, o lugar da marca e
 * o ponto fixo do zoom. Em % a única posição que centraliza o desenho é 50%, e aí
 * o ponto fixo volta a ser o vão entre as letras — o caso que nunca fecha.)
 * Então a camada mascarada nasce empurrada de volta pro centro e o empurrão morre
 * nos primeiros 20% do scroll, quando a marca já cresceu e o que importa é a
 * âncora. Enquanto o nudge existe a máscara ainda é pequena, então a foto (que
 * anda junto) nunca deixa borda aparecendo. Valores = desvio × MASK_FROM.
 */
const MARK_NUDGE = "translate(-1.33vmax, -1.59vmax)";
const MARK_CENTERED = "translate(0vmax, 0vmax)";

/**
 * Enquanto o logotipo é pequeno, as letras caem justo em cima das roupas pretas
 * da foto — tinta escura sobre fundo escuro, nome ilegível. Então a foto entra
 * com os pretos levantados (contraste comprimido + brilho), o que faz o nome ler
 * como cinza-médio contra o jd-black. A gradação volta ao normal conforme a
 * máscara abre: quando o quadro toma a tela inteira, a foto está intacta.
 */
const PHOTO_LIFTED = "grayscale(1) contrast(0.72) brightness(1.75)";
const PHOTO_NEUTRAL = "grayscale(1) contrast(1) brightness(1)";

function MarkReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // stops explícitos em 0 e 1: sem eles, animações promovidas pra nativo
  // (ViewTimeline) voltam pro valor base fora do range declarado.
  // Mesma unidade nas duas pontas — o motion reaproveita o template da primeira
  // string, então misturar vmin com vmax faria o fim virar vmin escondido.
  //
  // Os stops crescem em progressão geométrica (~×2,9 por trecho): o zoom é
  // percebido em escala log, e uma rampa linear até 2000 queimaria o momento em
  // que o monograma ainda se lê como marca já nos primeiros 5% do scroll.
  const maskSize = useTransform(
    scrollYProgress,
    [0, 0.05, 0.28, 0.5, 0.68, 0.84, 1],
    [MASK_FROM, MASK_FROM, "68vmax", "210vmax", "650vmax", MASK_TO, MASK_TO],
  );
  // a gradação levantada só serve enquanto o nome é pequeno; some junto com ele
  const photoFilter = useTransform(
    scrollYProgress,
    [0, 0.4, 1],
    [PHOTO_LIFTED, PHOTO_NEUTRAL, PHOTO_NEUTRAL],
  );
  const titleOpacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.3, 1],
    [0, 1, 0, 0],
  );
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);
  // o nudge morre cedo: a partir daí quem manda é a âncora de tinta (ver MARK_NUDGE)
  const markNudge = useTransform(
    scrollYProgress,
    [0, 0.2, 1],
    [MARK_NUDGE, MARK_CENTERED, MARK_CENTERED],
  );

  return (
    <div ref={ref} className="relative h-[250vh] bg-jd-black">
      <div className="sticky top-0 h-svh overflow-hidden">
        <motion.div style={{ transform: markNudge }} className="absolute inset-0">
          <motion.div
            style={{
              maskImage: MASK_SRC,
              WebkitMaskImage: MASK_SRC,
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: MASK_ANCHOR,
              WebkitMaskPosition: MASK_ANCHOR,
              maskSize,
              WebkitMaskSize: maskSize,
            }}
            className="absolute inset-0"
          >
            {/* o grayscale mora no filter animado — a classe do Tailwind seria
                sobrescrita pelo style inline de qualquer jeito */}
            <motion.img
              src="/photos/hero-test-xcx.jpg"
              alt="Os quatro integrantes do Jardim Depressa reunidos em retrato de estúdio"
              style={{ scale: photoScale, filter: photoFilter }}
              className="h-full w-full object-cover"
            />
          </motion.div>
        </motion.div>

        <motion.div
          style={{ opacity: titleOpacity }}
          className="absolute inset-x-0 top-[14%] text-center"
        >
          <p className="font-miltorn text-xs uppercase tracking-[0.35em] text-jd-coral">
            presskit
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/** Convite compacto: cita a abertura do MarkReveal (logotipo estático) + CTA */
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
      {/* mesma máscara do MarkReveal, mas com tamanho fixo — é o truque de
          continuidade: o frame inicial do scrub é idêntico a este */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1, transition: { duration: 1.1, ease: EXPO } }}
        viewport={{ once: false, amount: 0.3 }}
        style={{ transform: MARK_NUDGE }}
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
            maskImage: MASK_SRC,
            WebkitMaskImage: MASK_SRC,
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: MASK_ANCHOR,
            WebkitMaskPosition: MASK_ANCHOR,
            maskSize: MASK_FROM,
            WebkitMaskSize: MASK_FROM,
          }}
          className="absolute inset-0"
        >
          {/* mesma gradação levantada do primeiro frame do scrub */}
          <img
            src="/photos/hero-test-xcx.jpg"
            alt="Os quatro integrantes do Jardim Depressa reunidos em retrato de estúdio"
            style={{ filter: PHOTO_LIFTED }}
            className="h-full w-full object-cover"
          />
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
          className="font-miltorn text-xs uppercase tracking-[0.35em] text-jd-coral"
        >
          presskit
        </motion.p>
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

  // após montar a história, leva o scroll pro topo do MarkReveal pra que o
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
        <MarkReveal />

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
