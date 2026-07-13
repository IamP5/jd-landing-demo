"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  motion,
  motionValue,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { onLenisReady } from "@/lib/lenis";
import { criarSnapContinuo } from "@/lib/snap-continuo";

/* ---------------------------------------------------------------------------
   Pilha de painéis grudados (sticky stack)

   Os painéis são IRMÃOS DIRETOS da pilha — cada um `sticky top-0 h-svh`, com
   um espaçador entre eles. É isso que dá a cortina de graça: um sticky só
   solta quando o BLOCO PAI acaba, então o painel N continua pinado enquanto o
   painel N+1 sobe por cima (irmão posterior pinta em cima). Se cada painel
   fosse embrulhado num `relative` próprio, o pai dele acabaria junto e os dois
   nunca se sobreporiam — daí a lista achatada aqui embaixo.

   Cada painel é uma sequência de ATOS. Um ato é um trecho de scroll pinado em
   que alguma coisa se monta, e todo ato termina num HOLD — a pose onde o snap
   pousa. Um painel comum tem um ato só:

     |<-- CORTINA 100 -->|<-- COMPOSE -->|<-- HOLD -->|<-- CORTINA 100 -->|
      painel sobe por      pinado:         a pose       o próximo sobe
      cima do anterior     a composição    (o snap      por cima deste
                           se monta        pousa aqui)  (este recua)

   Painéis com mais de um ato não são cortados nem cobertos por dentro: eles se
   TRANSFORMAM. É o que o merch faz — abertura, camiseta preta e camiseta branca
   são três poses do MESMO pôster, sem nenhuma emenda de seção entre elas:

     |<-- INTRO -->|<-HOLD->|<-- COMPOSE -->|<-HOLD->|<-- MORPH -->|<-HOLD->|
      o título        pose    o título sai     pose    a varredura    pose
      se monta       (snap)   e o produto     (snap)   troca o mundo (snap)
                              sobe por baixo           sob o objeto

   espaçador = a soma dos atos (com seus holds). O último painel leva +100 pra
   segurar o pin enquanto a seção seguinte (fora da pilha) sobe por cima dele.

   Unidade: svh, não vh — os painéis são h-svh, e misturar as duas dessincroniza
   a conta no mobile, onde a barra do navegador mexe no vh.
--------------------------------------------------------------------------- */

/** os atos que um painel pode ter, e quanto scroll pinado cada um custa (svh) */
export const ACT_SVH = {
  /** a abertura do capítulo se monta (o letreiro) */
  intro: 60,
  /* 84, e não 60: neste ato acontece TUDO — o letreiro sai, a camiseta sobe, o
     volume assenta, o vetor chega, o nome do produto entra e sai, a camiseta
     desliza e uma ficha de cinco itens cai em cascata. Em 60svh isso era um
     amontoado: a camiseta subia mais de 2,8px por pixel de scroll, o que o olho
     lê como teleporte, não como subida. O `morph` ao lado tem 120svh pra
     carregar uma varredura e mais nada.

     Alargar o ato alarga o vão entre duas poses do snap — o que só não piora o
     tranco porque a duração do snap agora cresce com a RAIZ da distância (ver
     snap-continuo.ts). Com o snap antigo, de duração fixa, isto teria AUMENTADO
     a violência do salto em ~29%. Os dois andam juntos. */
  compose: 84,
  /** a varredura que troca o mundo por baixo do objeto — mais lenta, pra pesar */
  morph: 120,
} as const;

export type ActName = keyof typeof ACT_SVH;

/** descanso na pose, entre um ato e o próximo */
export const HOLD_SVH = 24;
/** o painel seguinte sobe uma tela inteira por cima — é o tamanho do painel */
export const CURTAIN_SVH = 100;

/** margem negativa que a seção seguinte precisa pra subir por cima do último painel */
export const NEXT_SECTION_PULL = `-${CURTAIN_SVH}svh`;

const DEFAULT_ACTS: ActName[] = ["compose"];

/** os tempos de um painel, como MotionValues — o conteúdo pluga direto no useTransform */
export type PanelProgress = {
  /** 0→1 na abertura do capítulo (fica em 0 em painel sem o ato `intro`) */
  intro: MotionValue<number>;
  /** 0→1 enquanto o painel, já pinado, monta a composição */
  compose: MotionValue<number>;
  /** 0→1 na varredura interna (fica em 0 em painel sem o ato `morph`) */
  morph: MotionValue<number>;
  /** 0→1 enquanto o painel SEGUINTE sobe por cima — é a recuada */
  cover: MotionValue<number>;
  /** 0→1 da hora que aparece até ficar coberto — o tempo lento, pro parallax de fundo */
  life: MotionValue<number>;
};

export type PanelDef = {
  id: string;
  /** cor sólida do painel (ex.: "bg-jd-black text-jd-cream") */
  className: string;
  /** os atos pinados, em ordem. Default: um `compose` só. */
  acts?: ActName[];
  /** camada mais funda: anda devagar, é o que dá profundidade */
  background?: (p: PanelProgress) => ReactNode;
  /** primeiro plano */
  content: (p: PanelProgress) => ReactNode;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const actsOf = (panel: PanelDef) => panel.acts ?? DEFAULT_ACTS;

/** runway pinado de um painel: os atos com seus holds, sem a cortina de saída */
const actsSvh = (panel: PanelDef) =>
  actsOf(panel).reduce((sum, act) => sum + ACT_SVH[act] + HOLD_SVH, 0);

/** espaçador que segue o painel no fluxo (o último segura o pin na cortina de saída) */
const spacerSvh = (panel: PanelDef, last: boolean) =>
  actsSvh(panel) + (last ? CURTAIN_SVH : 0);

/** O mesmo ato, mas incapaz de mexer nada de lugar.
 *
 *  Sob `prefers-reduced-motion` os atos CONTINUAM vindo do scroll (ver a nota no
 *  update() — congelá-los esconderia conteúdo pra sempre), mas quem os consome
 *  precisa parar de pendurar transform neles: só opacidade. Este hook devolve o
 *  ato já na pose final, uma constante — pendure aqui tudo que é movimento
 *  (escala, deslize, cascata) e pendure no ato cru tudo que é presença. */
export function useStillness(act: MotionValue<number>) {
  const reduce = useReducedMotion();
  const posed = useMotionValue(1);
  return reduce ? posed : act;
}

/** O mesmo, mas para trilhas de SAÍDA.
 *
 *  `useStillness` congela o ato em 1 — a pose final. Numa trilha de saída a pose
 *  final é o estado de ter ido embora, então congelar em 1 deixa o elemento
 *  parado FORA do lugar: era o que acontecia com o letreiro "Merch", que sob
 *  reduced-motion vivia 7% acima da posição dele. Aqui a constante é 0: repouso.
 *  A opacidade continua pendurada no ato cru, então ele ainda some — só não sai
 *  do lugar. */
export function useRest(act: MotionValue<number>) {
  const reduce = useReducedMotion();
  const resting = useMotionValue(0);
  return reduce ? resting : act;
}

/** camada funda de um painel: anda MENOS que o primeiro plano — é essa diferença que lê como distância */
export function DeepLayer({
  life,
  children,
}: {
  life: MotionValue<number>;
  children: ReactNode;
}) {
  const y = useTransform(life, [0, 1], ["-9%", "9%"]);
  return (
    <motion.div style={{ y }} className="absolute inset-x-0 -inset-y-[12%]">
      {children}
    </motion.div>
  );
}

export default function PanelStack({
  id,
  panels,
}: {
  /** âncora do capítulo — a Nav rola pra cá, que é onde o primeiro painel pina */
  id?: string;
  panels: PanelDef[];
}) {
  const markRefs = useRef<(HTMLDivElement | null)[]>([]);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // criados uma vez e alimentados pelo loop de scroll; o React não re-renderiza
  const progress = useMemo<PanelProgress[]>(
    () =>
      panels.map(() => ({
        intro: motionValue(0),
        compose: motionValue(0),
        morph: motionValue(0),
        cover: motionValue(0),
        life: motionValue(0),
      })),
    [panels],
  );

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // enfeite congela: o painel não recua e as camadas fundas não vagueiam.
      // Os ATOS, não — eles continuam vindo do scroll (ver update()).
      progress.forEach((p) => {
        p.cover.set(0);
        p.life.set(0.5);
      });
    }

    // a unidade é a ALTURA REAL DO PAINEL (100svh em px), não window.innerHeight:
    // é ela que os espaçadores em svh acompanham quando a barra do mobile mexe
    let unit = 0;
    let tops: number[] = [];
    let frames: number[] = [];
    let regionTop = 0;

    const measure = () => {
      const first = panelRefs.current[0];
      if (!first) return;
      unit = first.offsetHeight;
      const svh = unit / 100;
      tops = markRefs.current.map((m) =>
        m ? m.getBoundingClientRect().top + window.scrollY : 0,
      );

      // um frame por POSE: cada ato termina numa, e o hold é a margem em volta
      frames = [];
      panels.forEach((panel, i) => {
        let acc = 0;
        for (const act of actsOf(panel)) {
          frames.push(tops[i] + (acc + ACT_SVH[act]) * svh);
          acc += ACT_SVH[act] + HOLD_SVH;
        }
      });
      // e o frame da seção seguinte, quando ela termina de cobrir o último painel
      const i = panels.length - 1;
      frames.push(tops[i] + (CURTAIN_SVH + actsSvh(panels[i])) * svh);

      /* A região do snap NÃO começa no topo do painel.

         Ela começava, e isso era uma emboscada: o primeiro frame fica um ato
         inteiro adiante, então quem cruzava a borda do capítulo e parava era
         arremessado pra frente sem ter pedido nada. Pôr um frame no topo seria
         pior ainda — ali o painel é preto puro (o letreiro ainda em opacidade 0),
         uma pose vazia e obrigatória.

         Meio ato adiante é a fronteira honesta: quem chega aqui já está dentro
         do capítulo de propósito, e o frame mais próximo é sempre o primeiro. */
      regionTop = frames[0] - 0.5 * ACT_SVH[actsOf(panels[0])[0]] * svh;
    };

    const update = () => {
      if (!unit) return;
      const y = window.scrollY;
      const svh = unit / 100;
      for (let i = 0; i < progress.length; i++) {
        const top = tops[i];
        const p = progress[i];

        /* Os atos vêm do scroll SEMPRE, inclusive sob reduced-motion: eles não
           são enfeite, são o que faz cada conteúdo EXISTIR (a abertura, uma
           camiseta, a outra). Congelados, dois dos três ficariam escondidos pra
           sempre embaixo do que sobrou. Quem tira o movimento são os componentes
           — sob reduce eles penduram só opacidade nos atos, nunca transform
           (ver useStillness). O que congela de verdade aqui é o enfeite: `cover`
           e `life`. */
        let acc = 0;
        for (const act of actsOf(panels[i])) {
          p[act].set(clamp01((y - (top + acc * svh)) / (ACT_SVH[act] * svh)));
          acc += ACT_SVH[act] + HOLD_SVH;
        }

        if (reduce) continue;

        const acts = actsSvh(panels[i]) * svh;
        // o painel seguinte subindo por cima: começa quando os atos acabam
        p.cover.set(clamp01((y - (top + acts)) / unit));
        // vida inteira: entra por baixo (−1 tela) e sai coberto (+1 tela)
        p.life.set(clamp01((y - (top - unit)) / (2 * unit + acts)));
      }
    };

    /* --- snap: só dentro deste capítulo -------------------------------------
       O snap sempre assenta na pose mais próxima quando o scroll para. Isso é
       ótimo aqui (a pilha é uma sequência de pôsteres) e péssimo nas seções
       editoriais — Música tem 234vh de conteúdo e o hero 219vh; puxar alguém que
       parou pra ler seria hostil. Por isso ele é ligado e desligado na fronteira
       da pilha, e não no site inteiro.

       Num painel morph ainda vem um bônus: as duas poses são frames e a
       varredura não é, então ninguém consegue estacionar com a emenda parada no
       meio da tela — ou o mundo é preto, ou é creme.

       A física dele (curva, duração, alvo, direção) mora em snap-continuo.ts —
       é lá que está o porquê de não ser mais o `lenis/snap`.                   */
    let snap: ReturnType<typeof criarSnapContinuo> | undefined;

    const syncFrames = () => snap?.setFrames(frames, unit);

    // o snap está aceso enquanto o leitor está DENTRO da pilha, e só lá
    const syncRegion = () => {
      if (!snap || !unit || frames.length === 0) return;
      const y = window.scrollY;
      snap.setEnabled(y >= regionTop && y <= frames[frames.length - 1]);
    };

    const remeasure = () => {
      measure();
      update();
      syncFrames();
      syncRegion();
    };

    remeasure();

    // a altura da página muda em runtime (variante do hero, presskit abrindo):
    // observar o body cobre os dois casos; o resize da janela cobre o resto
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);
    window.addEventListener("resize", remeasure);

    const stopWaiting = reduce
      ? () => {}
      : onLenisReady((lenis) => {
          snap = criarSnapContinuo(lenis); // nasce dormindo; só acorda na pilha
          syncFrames();
          syncRegion();
        });

    const onScroll = () => {
      update();
      syncRegion();
    };
    // Lenis dirige o scroll nativo da janela — o evento nativo já basta
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", remeasure);
      ro.disconnect();
      stopWaiting();
      snap?.destroy();
    };
  }, [panels, progress]);

  return (
    // z-0 abre um contexto de empilhamento: os painéis sticky ficam contidos
    // aqui dentro e a seção seguinte (z maior) passa por cima de todos eles
    <div id={id} className="relative z-0 bg-jd-black">
      {panels.map((panel, i) => (
        <PanelBlock
          key={panel.id}
          panel={panel}
          progress={progress[i]}
          index={i}
          last={i === panels.length - 1}
          markRef={(el) => {
            markRefs.current[i] = el;
          }}
          panelRef={(el) => {
            panelRefs.current[i] = el;
          }}
        />
      ))}
    </div>
  );
}

function PanelBlock({
  panel,
  progress,
  index,
  last,
  markRef,
  panelRef,
}: {
  panel: PanelDef;
  progress: PanelProgress;
  index: number;
  last: boolean;
  markRef: (el: HTMLDivElement | null) => void;
  panelRef: (el: HTMLDivElement | null) => void;
}) {
  // recuada: o painel coberto afunda e escurece — é o que vira o corte
  // preto↔creme em profundidade, em vez de uma emenda deslizando
  const scale = useTransform(progress.cover, [0, 1], [1, 0.92]);
  const veil = useTransform(progress.cover, [0, 1], [0, 0.5]);

  return (
    <>
      {/* marco de altura zero: fica exatamente no topo de fluxo do painel
          (o painel é sticky, não dá pra medir a posição dele depois de pinado) */}
      <div ref={markRef} aria-hidden className="h-0" />

      <motion.div
        ref={panelRef}
        style={{ scale, zIndex: index + 1 }}
        className={`sticky top-0 h-svh overflow-hidden ${panel.className}`}
      >
        {panel.background && (
          <DeepLayer life={progress.life}>{panel.background(progress)}</DeepLayer>
        )}

        {/* primeiro plano */}
        {panel.content(progress)}

        {/* véu da recuada: escurece o painel enquanto ele afunda pra trás */}
        <motion.div
          aria-hidden
          style={{ opacity: veil }}
          className="pointer-events-none absolute inset-0 bg-jd-black"
        />
      </motion.div>

      <div
        aria-hidden
        style={{ height: `${spacerSvh(panel, last)}svh` }}
      />
    </>
  );
}
