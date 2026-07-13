"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
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

   espaçador = COMPOSE + HOLD. O último leva +100 pra segurar o painel pinado
   enquanto a seção seguinte (fora da pilha) sobe por cima dele.
--------------------------------------------------------------------------- */

/** scroll pinado em que a composição do painel se monta */
export const COMPOSE_SVH = 60;
/** descanso na pose, antes da próxima cortina começar */
export const HOLD_SVH = 24;
/** o painel seguinte sobe uma tela inteira por cima — é o tamanho do painel */
export const CURTAIN_SVH = 100;
/** espaçador entre painéis */
export const SPACER_SVH = COMPOSE_SVH + HOLD_SVH;
/** espaçador depois do último painel: segura o pin durante a cortina de saída */
export const TAIL_SVH = SPACER_SVH + CURTAIN_SVH;

/** margem negativa que a seção seguinte precisa pra subir por cima do último painel */
export const NEXT_SECTION_PULL = `-${CURTAIN_SVH}svh`;

/** os três tempos de um painel, como MotionValues — o conteúdo pluga direto no useTransform */
export type PanelProgress = {
  /** 0→1 enquanto o painel, já pinado, monta a composição */
  compose: MotionValue<number>;
  /** 0→1 enquanto o painel SEGUINTE sobe por cima — é a recuada */
  cover: MotionValue<number>;
  /** 0→1 da hora que aparece até ficar coberto — o tempo lento, pro parallax de fundo */
  life: MotionValue<number>;
};

export type PanelDef = {
  id: string;
  /** cor sólida do painel (ex.: "bg-jd-black text-jd-cream") */
  className: string;
  /** camada mais funda: anda devagar, é o que dá profundidade */
  background?: (p: PanelProgress) => ReactNode;
  /** primeiro plano */
  content: (p: PanelProgress) => ReactNode;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

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
        cover: motionValue(0),
        life: motionValue(0),
      })),
    [panels],
  );

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // sem movimento: cada painel já nasce composto, sem recuo e sem snap
      progress.forEach((p) => {
        p.compose.set(1);
        p.cover.set(0);
        p.life.set(0.5);
      });
      return;
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
      tops = markRefs.current.map((m) =>
        m ? m.getBoundingClientRect().top + window.scrollY : 0,
      );
      // um frame por painel: a pose, no fim do COMPOSE
      frames = tops.map((t) => t + (COMPOSE_SVH / 100) * unit);
      // e o frame da seção seguinte, quando ela termina de cobrir o último painel
      const last = tops[tops.length - 1];
      if (last !== undefined) {
        frames.push(last + ((CURTAIN_SVH + SPACER_SVH) / 100) * unit);
      }
    };

    const update = () => {
      if (!unit) return;
      const y = window.scrollY;
      const composePx = (COMPOSE_SVH / 100) * unit;
      const spacerPx = (SPACER_SVH / 100) * unit;
      for (let i = 0; i < progress.length; i++) {
        const top = tops[i];
        const p = progress[i];
        // pinado, montando a composição
        p.compose.set(clamp01((y - top) / composePx));
        // o painel seguinte subindo por cima: começa quando o hold acaba
        p.cover.set(clamp01((y - (top + spacerPx)) / unit));
        // vida inteira: entra por baixo (−1 tela) e sai coberto (+1 tela)
        p.life.set(clamp01((y - (top - unit)) / (2 * unit + spacerPx)));
      }
    };

    /* --- snap: só dentro deste capítulo -------------------------------------
       O snap é `mandatory`, então ele SEMPRE puxa pro frame mais próximo quando
       o scroll para. Isso é ótimo aqui (a pilha é uma sequência de pôsteres) e
       péssimo nas seções editoriais — Música tem 234vh de conteúdo e o hero
       219vh; puxar alguém que parou pra ler seria hostil. Por isso o snap é
       ligado/desligado na fronteira da pilha, e não no site inteiro.        */
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

    const stopWaiting = onLenisReady((lenis) => {
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
  }, [progress]);

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
  // o fundo anda MENOS que o primeiro plano: é essa diferença que lê como distância
  const bgY = useTransform(progress.life, [0, 1], ["-9%", "9%"]);

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
        {/* camada funda */}
        <motion.div style={{ y: bgY }} className="absolute -inset-y-[12%] inset-x-0">
          {panel.background?.(progress)}
        </motion.div>

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
        style={{ height: `${last ? TAIL_SVH : SPACER_SVH}svh` }}
      />
    </>
  );
}
