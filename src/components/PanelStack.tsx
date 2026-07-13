"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { motion, motionValue, useTransform, type MotionValue } from "motion/react";
import Snap from "lenis/snap";
import { onLenisReady } from "@/lib/lenis";

/* ---------------------------------------------------------------------------
   Pilha de painéis grudados (sticky stack)

   Os painéis são IRMÃOS DIRETOS da pilha — cada um `sticky top-0 h-svh`, com
   um espaçador entre eles. É isso que dá a cortina de graça: um sticky só
   solta quando o BLOCO PAI acaba, então o painel N continua pinado enquanto o
   painel N+1 sobe por cima (irmão posterior pinta em cima). Se cada painel
   fosse embrulhado num `relative` próprio, o pai dele acabaria junto e os dois
   nunca se sobreporiam — daí a lista achatada aqui embaixo.

   Orçamento de scroll de cada painel (em svh — svh e não vh porque os painéis
   são h-svh; misturar as duas unidades dessincroniza a conta no mobile, onde a
   barra do navegador muda o vh):

     |<-- CORTINA 100 -->|<-- COMPOSE -->|<-- HOLD -->|<-- CORTINA 100 -->|
      painel sobe por      pinado:         a pose       o próximo sobe
      cima do anterior     a composição    (o snap      por cima deste
                           se monta        pousa aqui)  (este recua)

   Um painel `morph` tem DOIS atos em vez de um — ele não é coberto pelo
   seguinte, ele se transforma por dentro (ver MerchMorph):

     |<-- COMPOSE -->|<-- HOLD -->|<-- MORPH -->|<-- HOLD -->|
      pose A           snap        a varredura   pose B
                                   troca o mundo (snap)
                                   sob o objeto

   espaçador = a soma dos atos. O último painel leva +100 pra segurar o pin
   enquanto a seção seguinte (fora da pilha) sobe por cima dele.
--------------------------------------------------------------------------- */

/** scroll pinado em que a composição do painel se monta */
export const COMPOSE_SVH = 60;
/** descanso na pose, antes do próximo ato começar */
export const HOLD_SVH = 24;
/** o painel seguinte sobe uma tela inteira por cima — é o tamanho do painel */
export const CURTAIN_SVH = 100;
/** a varredura de um painel `morph`: um pouco mais lenta que o scroll, pra pesar */
export const MORPH_SVH = 120;

/** margem negativa que a seção seguinte precisa pra subir por cima do último painel */
export const NEXT_SECTION_PULL = `-${CURTAIN_SVH}svh`;

/** os tempos de um painel, como MotionValues — o conteúdo pluga direto no useTransform */
export type PanelProgress = {
  /** 0→1 enquanto o painel, já pinado, monta a composição */
  compose: MotionValue<number>;
  /** 0→1 na varredura interna (só em painel `morph`; nos outros fica em 0) */
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
  /** dá ao painel um segundo ato: `morph` vira um tempo próprio entre duas poses */
  morph?: boolean;
  /** camada mais funda: anda devagar, é o que dá profundidade */
  background?: (p: PanelProgress) => ReactNode;
  /** primeiro plano */
  content: (p: PanelProgress) => ReactNode;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** runway pinado de um painel, sem contar a cortina de saída */
const actsSvh = (panel: PanelDef) =>
  panel.morph
    ? COMPOSE_SVH + HOLD_SVH + MORPH_SVH + HOLD_SVH
    : COMPOSE_SVH + HOLD_SVH;

/** espaçador que segue o painel no fluxo (o último segura o pin na cortina de saída) */
const spacerSvh = (panel: PanelDef, last: boolean) =>
  actsSvh(panel) + (last ? CURTAIN_SVH : 0);

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
      // sem coreografia: cada painel já nasce composto e sem recuo.
      // O `morph` continua vindo do scroll — ele não é enfeite, é o que faz o
      // segundo produto EXISTIR; congelado, um dos dois ficaria escondido pra
      // sempre embaixo do outro.
      progress.forEach((p) => {
        p.compose.set(1);
        p.cover.set(0);
        p.life.set(0.5);
      });
    }

    // a unidade é a ALTURA REAL DO PAINEL (100svh em px), não window.innerHeight:
    // é ela que os espaçadores em svh acompanham quando a barra do mobile mexe
    let unit = 0;
    let tops: number[] = [];
    let frames: number[] = [];

    const measure = () => {
      const first = panelRefs.current[0];
      if (!first) return;
      unit = first.offsetHeight;
      const svh = unit / 100;
      tops = markRefs.current.map((m) =>
        m ? m.getBoundingClientRect().top + window.scrollY : 0,
      );

      // um frame por POSE — o painel morph tem duas (antes e depois da varredura)
      frames = [];
      panels.forEach((panel, i) => {
        frames.push(tops[i] + COMPOSE_SVH * svh);
        if (panel.morph) {
          frames.push(
            tops[i] + (COMPOSE_SVH + HOLD_SVH + MORPH_SVH) * svh,
          );
        }
      });
      // e o frame da seção seguinte, quando ela termina de cobrir o último painel
      const i = panels.length - 1;
      frames.push(tops[i] + (CURTAIN_SVH + actsSvh(panels[i])) * svh);
    };

    const update = () => {
      if (!unit) return;
      const y = window.scrollY;
      const svh = unit / 100;
      for (let i = 0; i < progress.length; i++) {
        const top = tops[i];
        const p = progress[i];
        const acts = actsSvh(panels[i]) * svh;

        if (panels[i].morph) {
          // a varredura interna: começa quando o hold da primeira pose acaba
          const from = top + (COMPOSE_SVH + HOLD_SVH) * svh;
          p.morph.set(clamp01((y - from) / (MORPH_SVH * svh)));
        }

        if (reduce) continue;

        // pinado, montando a composição
        p.compose.set(clamp01((y - top) / (COMPOSE_SVH * svh)));
        // o painel seguinte subindo por cima: começa quando os atos acabam
        p.cover.set(clamp01((y - (top + acts)) / unit));
        // vida inteira: entra por baixo (−1 tela) e sai coberto (+1 tela)
        p.life.set(clamp01((y - (top - unit)) / (2 * unit + acts)));
      }
    };

    /* --- snap: só dentro deste capítulo -------------------------------------
       O snap é `mandatory`, então ele SEMPRE puxa pro frame mais próximo quando
       o scroll para. Isso é ótimo aqui (a pilha é uma sequência de pôsteres) e
       péssimo nas seções editoriais — Música tem 234vh de conteúdo e o hero
       219vh; puxar alguém que parou pra ler seria hostil. Por isso o snap é
       ligado/desligado na fronteira da pilha, e não no site inteiro.

       Num painel morph isso ainda ganha um bônus: como as duas poses são frames
       e a varredura não é, ninguém consegue estacionar com a emenda parada no
       meio da tela — ou o mundo é preto, ou é creme.                          */
    let snap: Snap | undefined;
    let removeSnaps: (() => void)[] = [];
    let inRegion = false;

    const syncFrames = () => {
      if (!snap) return;
      removeSnaps.forEach((off) => off());
      removeSnaps = frames.map((f) => snap!.add(f));
    };

    const syncRegion = () => {
      if (!snap || !unit || frames.length === 0) return;
      const y = window.scrollY;
      const next = y >= tops[0] && y <= frames[frames.length - 1];
      if (next === inRegion) return;
      inRegion = next;
      if (next) snap.start();
      else snap.stop();
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
          snap = new Snap(lenis, {
            type: "mandatory",
            debounce: 500,
            duration: 0.9,
            // quártica: sai rápido e assenta — o "decidido" que a landing pede
            easing: (t) => 1 - Math.pow(1 - t, 4),
          });
          snap.stop(); // nasce dormindo; só acorda dentro da pilha
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
      removeSnaps.forEach((off) => off());
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
