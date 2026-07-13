"use client";

import { motion, useTransform } from "motion/react";
import { useRest, useStillness, type PanelProgress } from "@/components/PanelStack";
import { ASSENTA, linear, SAI } from "@/lib/ease";

/* Abertura do capítulo de merch — e NÃO uma seção própria.

   Ela divide o painel com as camisetas: mesmo fundo preto, mesma marca d'água,
   mesmo pôster. Por isso não existe cortina aqui. O letreiro se monta no ato
   `intro`, descansa na pose, e depois SAI durante o `compose` — o mesmo ato em
   que a camiseta sobe por baixo pra ocupar o lugar dele. Quem entra não cobre
   quem sai: um cede o quadro pro outro, com o fundo intacto embaixo dos dois.

   Todos os keyframes têm stop explícito em 0 e 1: o Motion promove opacity pra
   animação nativa e o WAAPI preenche keyframe ausente com o valor base — sem o
   stop final o elemento voltaria ao início no fim do runway. */

export default function MerchIntro({ intro, compose }: PanelProgress) {
  // opacidade pendura no ato cru; transform pendura no ato "parado" — sob
  // reduced-motion o letreiro aparece e some em fade, sem subir nem escalar
  const rise = useStillness(intro);
  // useRest, e não useStillness: numa trilha de SAÍDA a "pose final" é o estado
  // de ter ido embora — congelar nela deixava o letreiro parado 7% acima do
  // lugar dele sob reduced-motion. Aqui o congelado é o repouso.
  const leave = useRest(compose);

  // eyebrow chega primeiro, discreto
  const eyebrowOpacity = useTransform(intro, [0, 0.2, 1], [0, 1, 1]);
  const eyebrowY = useTransform(rise, [0, 0.2, 1], [16, 0, 0]);

  // título sobe mascarado (pai overflow-hidden) e assenta com leve escala
  const titleY = useTransform(
    rise,
    [0, 0.04, 0.55, 1],
    ["110%", "110%", "0%", "0%"],
  );
  const titleScale = useTransform(rise, [0, 0.04, 0.7, 1], [1.08, 1.08, 1, 1]);

  // eco fantasma em contorno aparece por último, atrás do título
  const ghostOpacity = useTransform(intro, [0, 0.4, 0.72, 1], [0, 0, 1, 1]);
  const ghostY = useTransform(rise, [0, 0.4, 0.72, 1], ["6%", "6%", "0%", "0%"]);

  // fio horizontal abre do centro junto com o eyebrow
  const ruleOpacity = useTransform(intro, [0, 0.07, 0.43, 1], [0, 0, 1, 1]);
  const ruleScaleX = useTransform(rise, [0, 0.07, 0.43, 1], [0, 0, 1, 1]);

  /* A SAÍDA — que antes não era uma saída, era um apagão.

     A opacidade do bloco inteiro caía de 1 a 0 entre compose 0.02 e 0.13, com
     REVELA (expo-out, que já despeja um quarto no primeiro décimo). São 11% de um
     ato de 84svh: uns 90px de scroll. A palavra não ia embora — ela PISCAVA. E
     como o corpo mal andava (−9%), não sobrava gesto nenhum pra ler.

     Agora o letreiro sai em DUAS velocidades, e é essa separação que faz a coisa
     virar contínua:

     · o cerimonial (o eyebrow, o fio, a linha de apoio) libera o quadro cedo e
       rápido — é ornamento, e ornamento que insiste vira sujeira;

     · a PALAVRA fica sozinha e então SOBE, ENCOLHE e se dissolve, tudo junto e
       tudo ACELERANDO (SAI parte do repouso e termina em velocidade máxima). Ela
       está em movimento no instante exato em que desaparece — é isso que faz o
       olho ler "foi embora" em vez de "foi apagada". Encolher enquanto sobe é o
       que a manda pro FUNDO, e não pra fora: ela recua, e a camiseta ocupa a
       profundidade que ela desocupou.

     A janela é generosa de propósito (0.08 → 0.32, ~20svh) porque ela agora
     ATRAVESSA a chegada da camiseta em vez de fugir dela. Em 0.10 a peça já está
     sólida, ainda lá embaixo, subindo POR TRÁS do letreiro; em 0.30 ela está
     quase no centro e o letreiro já é fantasma. Os dois se cruzam, em sentidos
     opostos de profundidade. O cruzamento É a costura entre os atos — antes havia
     um buraco entre eles, e buraco o olho lê como corte. */
  /* ASSENTA (easeInOut) nas DUAS opacidades, e não REVELA. Numa dissolução as
     duas pontas precisam ser invisíveis: expo-out numa trilha 1→0 despeja metade
     do valor no primeiro quinto da janela — é literalmente o apagão que estamos
     matando, e ele reaparece em qualquer elemento onde a gente o deixar. */
  const chromeOut = useTransform(compose, [0, 0.02, 0.16, 1], [1, 1, 0, 0], {
    ease: [linear, ASSENTA, linear],
  });
  const wordOut = useTransform(compose, [0, 0.08, 0.32, 1], [1, 1, 0, 0], {
    ease: [linear, ASSENTA, linear],
  });

  /* Amplitude calibrada pelo que se VÊ, não pelo que está escrito.

     SAI é ease-in: ele guarda a maior parte do percurso pro final. Só que o final
     acontece com a palavra já em opacidade 0 — na primeira medição, dos −18% e
     dos 14% de encolhimento o usuário via 71px e 7%. Metade do gesto era gasta no
     escuro.

     A janela visível (0.08→0.32) cobre ~52% da curva. Então a amplitude é o dobro
     do que se quer ENXERGAR: −30% e 0.76 entregam ~115px de subida e ~12% de
     encolhimento até o instante em que ela some — e o excedente é o que garante
     que ela ainda esteja ACELERANDO quando desaparece, em vez de estacionar e
     esperar o fade terminar. */
  const outY = useTransform(
    leave,
    [0, 0.02, 0.36, 1],
    ["0%", "0%", "-30%", "-30%"],
    { ease: [linear, SAI, linear] },
  );
  const outScale = useTransform(
    leave,
    [0, 0.02, 0.36, 1],
    [1, 1, 0.76, 0.76],
    { ease: [linear, SAI, linear] },
  );

  /* A entrada e a saída moram em ATOS diferentes (`intro` e `compose`), então
     nenhum elemento pode pendurar a opacidade só numa das duas — o produto das
     duas é a opacidade de verdade. O bloco raiz não pode carregar isso: opacidade
     multiplica pra baixo na árvore, e uma opacidade de raiz que zera em 0.12
     levaria a palavra junto por mais que ela quisesse ficar. */
  const eyebrowFade = useTransform(
    [eyebrowOpacity, chromeOut],
    ([entra, sai]: number[]) => entra * sai,
  );
  const ruleFade = useTransform(
    [ruleOpacity, chromeOut],
    ([entra, sai]: number[]) => entra * sai,
  );
  const supportFade = useTransform(
    [ghostOpacity, chromeOut],
    ([entra, sai]: number[]) => entra * sai,
  );

  return (
    // pointer-events-none: mesmo em opacity 0 a abertura continua por cima do
    // palco do produto, e engoliria o hover da camiseta e do botão
    <motion.div
      style={{ y: outY, scale: outScale }}
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
    >
      <motion.p
        style={{ opacity: eyebrowFade, y: eyebrowY }}
        className="font-miltorn text-[10px] uppercase tracking-[0.3em] text-jd-blue md:text-xs"
      >
        vista o jardim
      </motion.p>

      {/* a palavra: título sólido + eco em contorno saem como um corpo só, e é
          este invólucro que segura a dissolução longa deles */}
      <motion.div
        style={{ opacity: wordOut }}
        className="relative mt-4 md:mt-6"
      >
        {/* eco em contorno, deslocado atrás do título sólido */}
        <motion.span
          aria-hidden
          style={{
            opacity: ghostOpacity,
            y: ghostY,
            WebkitTextStroke: "1px rgba(239,238,234,0.18)",
            color: "transparent",
          }}
          className="pointer-events-none absolute left-[0.04em] top-[0.05em] z-0 select-none font-fraktur text-[22vw] leading-none md:text-[18vw]"
        >
          Merch
        </motion.span>

        {/* máscara do rise: overflow-hidden no pai, y anima no filho */}
        <div className="relative z-10 overflow-hidden">
          <motion.h2
            style={{ y: titleY, scale: titleScale }}
            className="font-fraktur text-[22vw] leading-none text-jd-cream md:text-[18vw]"
          >
            Merch
          </motion.h2>
        </div>
      </motion.div>

      <motion.div
        aria-hidden
        style={{ opacity: ruleFade, scaleX: ruleScaleX }}
        className="mt-8 h-px w-40 bg-jd-cream/25 md:mt-12 md:w-64"
      />

      <motion.p
        style={{ opacity: supportFade }}
        className="mt-6 max-w-xs text-center text-sm text-jd-cream/50 md:text-base"
      >
        Peças pra levar o jardim com você.
      </motion.p>
    </motion.div>
  );
}
