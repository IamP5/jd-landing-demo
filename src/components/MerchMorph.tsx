"use client";

import { useEffect, useMemo } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { DeepLayer, type PanelProgress } from "@/components/PanelStack";
import ProductShowcase, { type Tilt } from "@/components/ProductShowcase";
import { useFinePointer } from "@/lib/media";
import type { Product } from "@/data/site";

/* ---------------------------------------------------------------------------
   A troca de camiseta como uma varredura, não como uma cortina.

   Entre os dois produtos NÃO existe corte de painel: existe UM painel com dois
   mundos empilhados no mesmo lugar. O mundo creme sobe POR DENTRO do preto,
   revelado de baixo pra cima por uma franja macia.

   O truque todo depende de uma coisa: as duas camisetas ocupam exatamente a
   mesma caixa (mesma altura em vmin, mesmo centro, mesmo deslocamento pra
   esquerda), e a ficha técnica também. Então a linha que sobe não lê como
   "uma camada passando na frente da outra" — lê como A MESMA camiseta mudando
   de cor, e o mesmo preço trocando de valor, enquanto o mundo debaixo deles
   vira do avesso. Camiseta e ficha ficam cravadas; só o mundo anda.

   Duas peças fazem isso acontecer:

   1. O mundo creme já nasce PRONTO (compose travado em 1). Ele não se monta de
      novo — a camiseta não entra voando, o preço não sobe. Ele é uma pose
      congelada, alinhada pixel a pixel com a pose em que o mundo preto acabou
      de descansar. Se ele se animasse, a emenda mostraria a camiseta em duas
      escalas diferentes ao mesmo tempo e a ilusão morreria.

   2. A revelação é feita por TRANSFORM, não por height/clip animado. O invólucro
      desce/sobe e o conteúdo faz o contra-movimento exato — a janela de recorte
      desliza, o conteúdo dentro dela fica parado. Tudo no compositor, sem
      recalcular máscara nem layout a cada frame.

   E a profundidade (que é o ponto do capítulo inteiro): as camadas FUNDAS de
   cada mundo andam pouco — a preta afunda 7%, a creme assenta de 7% — enquanto
   a emenda atravessa a tela inteira. A camiseta, plano perto, não anda nada.
   É a diferença de velocidade entre os planos que o olho lê como distância.
--------------------------------------------------------------------------- */

/** altura da franja em que uma cor derrete na outra (em svh) — corte seco, de
    serigrafia: só o suficiente pra tirar o serrilhado da linha. Subir pra ~6 dá
    uma dissolução macia; a partir daí a estampa da camiseta preta começa a
    fantasmar por cima da branca. */
const FEATHER_SVH = 3;
/** o corte precisa varrer a tela inteira + a franja pra sumir/cobrir de vez */
const TRAVEL_SVH = 100 + FEATHER_SVH;

/* Máscara ESTÁTICA, presa ao topo do invólucro — como o invólucro é que se move,
   a franja viaja junto com a linha de corte sem nunca ser recalculada.
   A porcentagem é relativa ao invólucro (TRAVEL_SVH de altura), não ao painel. */
const FEATHER_PCT = ((FEATHER_SVH / TRAVEL_SVH) * 100).toFixed(2);
const WIPE_MASK = `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgb(0,0,0) ${FEATHER_PCT}%)`;

/** a mola do tilt — a mesma nos dois mundos, senão eles não giram juntos */
const MOLA = { stiffness: 150, damping: 18, mass: 0.4 };

/** o monograma quase invisível, à deriva — a camada mais funda de todo painel */
export function Watermark({ life }: { life: MotionValue<number> }) {
  const rotate = useTransform(life, [0, 1], [-6, 6]);
  return (
    <motion.div
      aria-hidden
      style={{ rotate }}
      className="mask-mark mask-monograma absolute left-1/2 top-1/2 h-[130vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2 opacity-[0.045]"
    />
  );
}

export default function MerchMorph({
  from,
  to,
  progress,
}: {
  /** o mundo que se monta e depois é varrido (camiseta preta) */
  from: Product;
  /** o mundo que sobe por dentro, já pronto (camiseta branca) */
  to: Product;
  progress: PanelProgress;
}) {
  const { life, morph } = progress;
  const reduce = useReducedMotion();
  const fine = useFinePointer();

  // o mundo de chegada não tem coreografia: ele É a pose final, o tempo todo
  const posed = useMotionValue(1);
  const toProgress = useMemo<PanelProgress>(
    () => ({ ...progress, compose: posed }),
    [progress, posed],
  );

  /* UM ponteiro, DUAS camisetas.

     Cada ProductShowcase costumava ter o seu pointerX/pointerY e as suas molas,
     alimentados por um onPointerMove no palco dele. Só que a máscara do mundo
     creme também recorta o hit-testing: acima da linha de corte o cursor acerta
     o mundo preto, abaixo dela acerta o creme — e o que perde recebe
     `pointerleave` e devolve a rotação a zero. Resultado, medido com a emenda na
     tela: a metade de cima em `matrix3d(...)` e a de baixo em `none`. As duas
     metades da "mesma" camiseta giravam diferente, e a ilusão morria.

     As molas nascem aqui e são as MESMAS nos dois mundos. O portão do tilt
     continua sendo de cada um (ele só abre quando aquela camiseta assenta), mas
     durante a varredura os dois valem 1 exato — os dois recebem compose = 1 —,
     então as duas giram idênticas.

     E o listener é no window, sem `getBoundingClientRect`: o palco é um
     `sticky top-0 h-svh`, e enquanto está pinado (que é o único momento em que o
     tilt existe) ele É o viewport. Antes eram dois `getBoundingClientRect()` por
     pointermove dentro de uma subárvore com transform e perspective, no mesmo
     frame em que o Motion escreve transforms — leitura de layout forçada. */
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-9, 9]), MOLA);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [7, -7]), MOLA);
  const tilt = useMemo<Tilt>(
    () => ({ pointerX, pointerY, rotateX, rotateY }),
    [pointerX, pointerY, rotateX, rotateY],
  );

  const pointerOn = fine && !reduce;
  useEffect(() => {
    if (!pointerOn) return;
    const mover = (e: globalThis.PointerEvent) => {
      pointerX.set(e.clientX / window.innerWidth - 0.5);
      pointerY.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", mover, { passive: true });
    return () => window.removeEventListener("pointermove", mover);
  }, [pointerOn, pointerX, pointerY]);

  /* Sob reduced-motion a varredura não pode varrer — mas ela é a única porta pro
     segundo produto, então não pode simplesmente sumir. Vira o mesmo gesto sem
     deslocamento: o mundo creme já nasce cobrindo o quadro inteiro e só ACENDE
     por cima do preto, ainda comandado pelo scroll. Sem franja, sem corte
     andando, sem os planos fundos se cruzando. */

  // a linha de corte, em svh a partir do fundo do painel: TRAVEL → 0
  const cut = useTransform(morph, [0, 1], [TRAVEL_SVH, 0]);
  const wrapY = useTransform(cut, (v) => (reduce ? "0svh" : `${v}svh`));
  // contra-movimento: o conteúdo não anda junto com a janela de recorte
  const holdY = useTransform(cut, (v) => (reduce ? "0svh" : `${-v}svh`));
  const wrapOpacity = useTransform(
    morph,
    [0, 0.12, 0.88, 1],
    reduce ? [0, 0, 1, 1] : [1, 1, 1, 1],
  );

  // parallax ATRAVESSANDO a emenda: o fundo preto afunda, o creme assenta
  const deepOut = useTransform(morph, [0, 1], ["0%", reduce ? "0%" : "7%"]);
  const deepIn = useTransform(morph, [0, 1], [reduce ? "0%" : "-7%", "0%"]);

  // as qualidades TROCAM, fora de fase com a emenda, em vez de dissolver uma na
  // outra (ver a nota do `swap` no ProductShowcase). Saem antes de o corte
  // chegar nelas, voltam depois que ele passa — nunca coexistem.
  const swapOut = useTransform(morph, [0.08, 0.38], [1, 0]);
  const swapIn = useTransform(morph, [0.62, 0.92], [0, 1]);

  return (
    <>
      {/* mundo de saída — preto. Monta-se normalmente com o `compose`. */}
      <motion.div style={{ y: deepOut }} className="absolute inset-0">
        <DeepLayer life={life}>
          <Watermark life={life} />
        </DeepLayer>
      </motion.div>
      <ProductShowcase
        product={from}
        progress={progress}
        swap={swapOut}
        tilt={tilt}
      />

      {/* mundo de chegada — creme. Sobe por dentro, revelado pela franja.
          Mais alto que o painel: a franja mora na sobra de cima, então quando o
          corte chega ao fim ela já saiu de cena e o creme cobre 100% sólido. */}
      <motion.div
        style={{
          y: wrapY,
          opacity: wrapOpacity,
          height: `${TRAVEL_SVH}svh`,
          maskImage: reduce ? undefined : WIPE_MASK,
          WebkitMaskImage: reduce ? undefined : WIPE_MASK,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        }}
        className="absolute inset-x-0 bottom-0 bg-jd-cream text-jd-black"
      >
        <motion.div
          style={{ y: holdY }}
          className="absolute inset-x-0 bottom-0 h-svh"
        >
          <motion.div style={{ y: deepIn }} className="absolute inset-0">
            <DeepLayer life={life}>
              <Watermark life={life} />
            </DeepLayer>
          </motion.div>
          <ProductShowcase
            product={to}
            progress={toProgress}
            swap={swapIn}
            tilt={tilt}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
