"use client";

import { type PointerEvent, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { Product } from "@/data/site";
import { useStillness, type PanelProgress } from "@/components/PanelStack";
import { ASSENTA, DESLIZA, linear, POUSA, REVELA, SOBE } from "@/lib/ease";
import Magnetic from "@/components/Magnetic";
import { useFinePointer, useMediaQuery } from "@/lib/media";

/* Painel de produto da PanelStack: o sticky, a cor de fundo e a recuada são
   dela. Aqui mora a coreografia, em três profundidades:

     funda  — marca d'água (fica no painel; atravessa o capítulo inteiro)
     média  — o vetor (sol / príncipe)
     perto  — a camiseta e a ficha

   O produto CHEGA POR BAIXO; a marca d'água não — ela já estava lá na abertura e
   continua onde estava. É essa permanência que faz a entrada ler como "o mesmo
   pôster mudando de assunto", e não como uma seção nova entrando.

   TODA trilha aqui passa `ease`. Sem isso o `useTransform` interpola LINEAR
   entre keyframes, e o resultado é velocidade constante com degrau em cada
   parada — foi o que medimos: a camiseta subia a −1300px/unidade, cravado, e
   parava de vez no meio do ato. Objeto nenhum se move assim.

   Cuidado ao mexer: toda trilha termina com stop explícito em `compose = 1`, no
   valor de POSE. É essa invariante que segura o registro pixel-a-pixel das duas
   camisetas na varredura (ver MerchMorph) — o mundo de chegada recebe um compose
   constante em 1, então os dois só coincidem se a pose final for idêntica. */

/** item da ficha: DUAS janelas, a opacidade fechando antes do y.
    Follow-through dentro do próprio item — ele já está legível enquanto os
    últimos pixels ainda assentam. Uma janela só, linear, fazia os cinco itens
    lerem como uma tabela sendo pintada de cima pra baixo. */
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
  const still = useStillness(progress);
  // stops explícitos em 0 e 1 — ver nota do MerchIntro sobre WAAPI
  const opacity = useTransform(progress, [0, at, at + 0.13, 1], [0, 0, 1, 1], {
    ease: [linear, REVELA, linear],
  });
  const y = useTransform(still, [0, at, at + 0.16, 1], [28, 28, 0, 0], {
    ease: [linear, POUSA, linear],
  });
  return (
    <motion.div style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}

/** camada média: o vetor decorativo, à deriva pela vida inteira do painel */
function ProductBackdrop({
  product,
  life,
  pointerX,
}: {
  product: Product;
  life: MotionValue<number>;
  pointerX: MotionValue<number>;
}) {
  const y = useTransform(life, [0, 1], ["-14%", "14%"]);
  const rotate = useTransform(life, [0, 1], [-8, 10]);
  // contra-movimento do cursor: o vetor foge de leve pro lado oposto
  const x = useSpring(
    useTransform(pointerX, (v) => v * -48),
    { stiffness: 80, damping: 20 },
  );

  return (
    <motion.img
      src={product.vector}
      alt=""
      aria-hidden
      style={{ x, y, rotate }}
      className="absolute left-1/2 top-1/2 h-[95vmin] w-[95vmin] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.18]"
    />
  );
}

const MOLA = { stiffness: 150, damping: 18, mass: 0.4 };

/** O tilt de cursor, quando ele vem DE FORA (a varredura precisa que as duas
    camisetas girem juntas — ver MerchMorph). Sem isto, cada mundo tinha o seu
    ponteiro, e a máscara do corte fazia só um dos dois receber o pointermove:
    a metade de cima girava, a de baixo ficava reta, e a emenda denunciava que
    são duas camisetas. */
export type Tilt = {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
};

export default function ProductShowcase({
  product,
  progress,
  swap,
  tilt,
}: {
  product: Product;
  progress: PanelProgress;
  /* Opacidade do bloco que TROCA em vez de varrer (só o painel-morfose passa).

     A camiseta e o preço atravessam o corte: são a mesma caixa e o mesmo texto
     nos dois produtos, então a emenda passando por eles lê como recolorir. As
     qualidades, não — são prosas diferentes, e dissolver dois textos diferentes
     vira sopa em qualquer franja. Então elas saem e entram fora de fase com a
     varredura, e nunca coexistem na emenda. */
  swap?: MotionValue<number>;
  /** ponteiro e molas compartilhados; ausente = este painel cuida do seu */
  tilt?: Tilt;
}) {
  const { compose, life } = progress;
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const md = useMediaQuery("(min-width: 768px)");
  const pointerOn = fine && !reduce;
  // sob reduce o produto ainda CHEGA (o compose diz quando), mas já chega posto:
  // aparece em fade, sem subir, escalar nem deslizar
  const enter = useStillness(compose);

  // ponteiro próprio — usado só quando ninguém emprestou um (painel avulso)
  const ownX = useMotionValue(0);
  const ownY = useMotionValue(0);
  const ownRotY = useSpring(useTransform(ownX, [-0.5, 0.5], [-9, 9]), MOLA);
  const ownRotX = useSpring(useTransform(ownY, [-0.5, 0.5], [7, -7]), MOLA);

  const pointerX = tilt?.pointerX ?? ownX;
  const rawRotY = tilt?.rotateY ?? ownRotY;
  const rawRotX = tilt?.rotateX ?? ownRotX;

  const dark = product.theme === "dark";
  // vermelho nos dois temas — o azul na camiseta preta destoava (pedido do usuário)
  const accent = "var(--jd-coral)";

  /* A CHEGADA DA CAMISETA. Três defeitos medidos, os três corrigidos aqui.

     (a) ELA CHEGAVA NO ESCURO. A opacidade só fechava em 0.34 e a subida acabava
         em 0.42: dos 542px de escalada, o usuário via os últimos 103px. Lia como
         um pop porque ERA um pop. Agora ela está sólida em 0.10, com a maior
         parte da subida ainda por fazer e o corpo ainda cortado pela borda de
         baixo — visivelmente ENTRANDO.

     (b) O COTOVELO. Em 0.42 o vetor de velocidade ia de (0, −1300) pra (−940, 0)
         num frame: 90° de virada, os dois eixos cruzando zero, a camiseta PARAVA
         e voltava a andar de lado. Agora o deslize arranca em 0.38 com a subida
         ainda viva até 0.68 — 0,30 de ato com os dois eixos andando juntos. O
         caminho vira um arco, que é o que um objeto com massa desenha.

     (c) NÃO TINHA PESO. Nada assentava depois de nada. Agora a ordem é: posição
         (0.68) → volume (0.72) → deslize (0.74) → vetor de fundo (0.80) → ficha
         → tilt (0.92). A massa chega atrasada, que é o que follow-through quer
         dizer.

     O sobre-passo de −1,2% no desktop é o pouso: ela passa 6px do lugar e volta.
     No mobile o percurso é 150% e não 105% — lá a camiseta é pequena em relação
     ao painel, e a 105% ela já nascia INTEIRA dentro do quadro: não havia entrada
     nenhuma pra ver, só um fade. */
  const shirtY = useTransform(
    enter,
    [0, 0.55, 0.68, 1],
    md
      ? ["92%", "-1.2%", "0%", "0%"]
      : ["150%", "-13.2%", "-12%", "-12%"],
    { ease: [SOBE, ASSENTA, linear] },
  );

  const shirtX = useTransform(
    enter,
    [0, 0.38, 0.74, 1],
    md ? ["0vw", "0vw", "-17vw", "-17vw"] : ["0vw", "0vw", "0vw", "0vw"],
    { ease: [linear, DESLIZA, linear] },
  );

  // o volume assenta DEPOIS da posição: ela pousa e o corpo ainda está encolhendo
  const scale = useTransform(
    enter,
    [0, 0.72, 1],
    md ? [1.06, 1, 1] : [1.2, 1, 1],
    { ease: [SOBE, linear] },
  );

  /* A atmosfera acende antes do objeto, e o objeto tem opacidade PRÓPRIA — é o
     que deixa a camiseta ficar sólida cedo sem arrastar o vetor de fundo junto. */
  const stageOpacity = useTransform(compose, [0, 0.02, 0.08, 1], [0, 0, 1, 1], {
    ease: [linear, REVELA, linear],
  });
  const shirtOpacity = useTransform(compose, [0, 0.03, 0.1, 1], [0, 0, 1, 1], {
    ease: [linear, REVELA, linear],
  });
  // o vidro do card mobile chega logo antes do preço (0.46), não com a camiseta
  const cardChrome = useTransform(compose, [0, 0.38, 0.48, 1], [0, 0, 1, 1], {
    ease: [linear, REVELA, linear],
  });

  /* Paralaxe de CURVA, não só de percurso: o vetor é o ÚLTIMO a assentar (0.80).
     Antes ele parava em 0.50 e a camiseta em 0.42 — quase juntos, o que ANULAVA
     a profundidade que este arquivo alegava estar criando. */
  const vectorY = useTransform(enter, [0, 0.8, 1], ["38%", "0%", "0%"], {
    ease: [SOBE, linear],
  });

  // depois que assenta, o scroll para de mandar e a camiseta passa a "olhar"
  // pro cursor: tilt 3D com mola, liberado quando o deslize pousa
  const tiltGate = useTransform(compose, [0, 0.76, 0.92, 1], [0, 0, 1, 1], {
    ease: [linear, SOBE, linear],
  });
  const rotateY = useTransform(
    [rawRotY, tiltGate],
    ([r, g]: number[]) => r * g,
  );
  const rotateX = useTransform(
    [rawRotX, tiltGate],
    ([r, g]: number[]) => r * g,
  );

  const onStageMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    ownX.set((e.clientX - r.left) / r.width - 0.5);
    ownY.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onStageLeave = () => {
    ownX.set(0);
    ownY.set(0);
  };
  // com tilt emprestado, quem escuta o ponteiro é o dono dele
  const escutaPonteiro = pointerOn && !tilt;

  /* Aqui existia um terceiro letreiro — nome do produto + tagline — que subia,
     descansava e saía no meio do `compose`. Ele quebrava o ato em dois: você lia
     "Merch", lia "Camiseta Sol", e SÓ ENTÃO via a camiseta. Três textos pra
     chegar num objeto. Agora o ato tem um gesto só: o letreiro do capítulo sai e
     a peça ocupa o lugar dele. O nome não se perde — ele está no CTA ("Comprar
     Camiseta Sol"), onde é informação, não cerimônia. */

  return (
    <div
      className="absolute inset-0"
      onPointerMove={escutaPonteiro ? onStageMove : undefined}
      onPointerLeave={escutaPonteiro ? onStageLeave : undefined}
    >
      {/* o produto e o vetor dele são um objeto só: sobem juntos pra dentro do
          quadro, deixando pra trás a marca d'água — que não é deles, é do painel */}
      <motion.div style={{ opacity: stageOpacity }} className="absolute inset-0">
        <motion.div style={{ y: vectorY }} className="absolute inset-0">
          <ProductBackdrop product={product} life={life} pointerX={pointerX} />
        </motion.div>

        {/* camiseta: scroll (chegada) → flutuação ociosa → tilt de cursor */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ perspective: 1000 }}
        >
          <motion.div
            style={{ x: shirtX, y: shirtY, scale, opacity: shirtOpacity }}
          >
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
                  /* Caixa FIXA, e `object-fill` em vez de `object-contain`.

                     As duas fotos são recortes justos da peça, e a peça tem
                     proporção diferente em cada uma (0,938 contra 0,883). Com
                     largura automática elas renderizavam com 26px de diferença —
                     e aí, na varredura, a silhueta da "mesma" camiseta dava um
                     degrau de 13px de cada lado ao cruzar a emenda. Forçar a
                     mesma caixa estica cada uma ~3%, o que ninguém enxerga numa
                     camiseta, e alinha o contorno, que é o que a ilusão vende. */
                  className="h-[62vmin] w-[56vmin] object-fill drop-shadow-[0_40px_80px_rgba(0,0,0,0.35)] md:h-[68vmin] md:w-[62vmin]"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* ficha técnica: preço + qualidades + CTA chegam em onda curta e ficam —
          é o estado de descanso do painel, onde o snap pousa */}
      <div className="absolute inset-x-4 bottom-[4%] rounded-2xl p-5 text-center md:inset-x-auto md:bottom-auto md:right-[7%] md:top-1/2 md:w-[30%] md:max-w-sm md:-translate-y-1/2 md:rounded-none md:p-0 md:text-left">
        {/* O VIDRO do card (só existe no mobile, onde a ficha se apoia sobre a
            arte). Ele é móvel da FICHA, não do palco: chega junto com o preço.
            Pendurado no palco, ele acendia junto com a camiseta — e aí a camiseta,
            que agora sobe de fora da tela, passava POR TRÁS dele e era engolida
            por uma laje borrada no meio da subida. */}
        <motion.div
          aria-hidden
          style={{ opacity: cardChrome }}
          className={`absolute inset-0 -z-10 rounded-2xl backdrop-blur-sm md:hidden ${
            dark ? "bg-jd-black/60" : "bg-jd-cream/70"
          }`}
        />
        <Spec progress={compose} at={0.46}>
          <span className="font-fraktur text-5xl md:text-6xl">
            {product.price}
          </span>
        </Spec>

        <motion.div style={{ opacity: swap }}>
          {product.features.map((f, i) => (
            <Spec
              key={f.title}
              progress={compose}
              at={0.52 + i * 0.05}
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
              {/* duas linhas SEMPRE, mesmo quando a prosa cabe em uma: é o que
                  mantém as duas fichas com a mesma altura. Como o card é
                  centrado, um bloco a mais de linha num produto empurrava tudo
                  ~12px pra baixo e tirava o preço de registro entre os mundos —
                  e aí a varredura mostrava dois "R$ 89" desencontrados. */}
              <p className="mt-1 hidden text-sm leading-relaxed opacity-75 md:block md:min-h-[2lh]">
                {f.text}
              </p>
            </Spec>
          ))}
          <Spec progress={compose} at={0.72} className="mt-5 md:mt-8">
            <Magnetic>
              <a
                href={product.buy ?? "#"}
                className={`inline-block rounded-full px-8 py-4 font-miltorn text-xs uppercase tracking-[0.25em] transition-transform hover:scale-105 ${
                  dark
                    ? "bg-jd-cream text-jd-black"
                    : "bg-jd-black text-jd-cream"
                }`}
              >
                Comprar {product.name}
              </a>
            </Magnetic>
          </Spec>
        </motion.div>
      </div>
    </div>
  );
}
