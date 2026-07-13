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
import type { PanelProgress } from "@/components/PanelStack";
import Magnetic from "@/components/Magnetic";
import { useFinePointer, useMediaQuery } from "@/lib/media";

/* Painel de produto da PanelStack: o sticky, a cor de fundo e a recuada são
   dela. Aqui mora a coreografia, em três profundidades:

     funda  — marca d'água (camada de fundo da própria PanelStack)
     média  — o vetor (sol / príncipe), pendurado no `life`
     perto  — a camiseta e a ficha, penduradas no `compose`

   As camadas fundas ANDAM PRA BAIXO enquanto a página sobe (é o -50→+50 do
   artigo): quanto menos uma camada acompanha o scroll, mais longe ela parece.
   Os stops do `compose` são o runway inteiro da montagem — antes eram frações
   de um container de 280vh que terminava em ~0.58 e deixava folga inerte. */

/** item da ficha técnica: entra na janela [at, at+0.15] do compose, em micro-cascata */
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
  // stops explícitos em 0 e 1 — ver nota do MerchIntro sobre WAAPI
  const opacity = useTransform(progress, [0, at, at + 0.15, 1], [0, 0, 1, 1]);
  const y = useTransform(progress, [0, at, at + 0.15, 1], [28, 28, 0, 0]);
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
  const opacity = useTransform(life, [0, 0.15, 1], [0, 0.18, 0.18]);
  // contra-movimento do cursor: o vetor foge de leve pro lado oposto
  const x = useSpring(useTransform(pointerX, (v) => v * -48), {
    stiffness: 80,
    damping: 20,
  });

  return (
    <motion.img
      src={product.vector}
      alt=""
      aria-hidden
      style={{ x, y, rotate, opacity }}
      className="absolute left-1/2 top-1/2 h-[95vmin] w-[95vmin] -translate-x-1/2 -translate-y-1/2 object-contain"
    />
  );
}

export default function ProductShowcase({
  product,
  progress,
}: {
  product: Product;
  progress: PanelProgress;
}) {
  const { compose, life } = progress;
  // -0.5..0.5 relativo ao centro do palco
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const md = useMediaQuery("(min-width: 768px)");
  const pointerOn = fine && !reduce;

  const dark = product.theme === "dark";
  // vermelho nos dois temas — o azul na camiseta preta destoava (pedido do usuário)
  const accent = "var(--jd-coral)";

  // chegada: a camiseta entra grande, assenta e desliza pro lado abrindo espaço
  // pra ficha (no mobile sobe um pouco)
  const scale = useTransform(compose, [0, 0.38, 1], [1.5, 1, 1]);
  const shirtY = useTransform(
    compose,
    [0, 0.38, 0.69, 1],
    ["10%", "0%", md ? "0%" : "-12%", md ? "0%" : "-12%"],
  );
  const shirtX = useTransform(
    compose,
    [0, 0.38, 0.69, 1],
    ["0vw", "0vw", md ? "-17vw" : "0vw", md ? "-17vw" : "0vw"],
  );

  // depois que assenta, o scroll para de mandar e a camiseta passa a "olhar"
  // pro cursor: tilt 3D com mola, liberado pelo progresso
  const tiltGate = useTransform(compose, [0, 0.69, 0.9, 1], [0, 0, 1, 1]);
  const rawRotY = useTransform(pointerX, [-0.5, 0.5], [-9, 9]);
  const rawRotX = useTransform(pointerY, [-0.5, 0.5], [7, -7]);
  const rotateY = useSpring(
    useTransform([rawRotY, tiltGate], ([r, g]: number[]) => r * g),
    { stiffness: 150, damping: 18, mass: 0.4 },
  );
  const rotateX = useSpring(
    useTransform([rawRotX, tiltGate], ([r, g]: number[]) => r * g),
    { stiffness: 150, damping: 18, mass: 0.4 },
  );

  const onStageMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    pointerX.set((e.clientX - r.left) / r.width - 0.5);
    pointerY.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onStageLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  // texto de abertura some quando a ficha chega
  const introOpacity = useTransform(
    compose,
    [0, 0.03, 0.14, 0.28, 0.41, 1],
    [0, 0, 1, 1, 0, 0],
  );

  return (
    <div
      className="absolute inset-0"
      onPointerMove={pointerOn ? onStageMove : undefined}
      onPointerLeave={pointerOn ? onStageLeave : undefined}
    >
      <ProductBackdrop product={product} life={life} pointerX={pointerX} />

      {/* camiseta: scroll (chegada) → flutuação ociosa → tilt de cursor */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: 1000 }}
      >
        <motion.div style={{ x: shirtX, y: shirtY, scale }}>
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
                className="h-[62vmin] w-auto object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.35)] md:h-[68vmin]"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* abertura */}
      <motion.div
        style={{ opacity: introOpacity }}
        className="absolute inset-x-0 top-[12%] text-center"
      >
        <h3 className="font-fraktur text-5xl md:text-7xl">{product.name}</h3>
        <p className="mt-3 font-lunaquete text-xl italic opacity-70">
          {product.tagline}
        </p>
      </motion.div>

      {/* ficha técnica: preço + qualidades + CTA chegam juntos, em onda curta,
          e ficam — é o estado de descanso do painel, onde o snap pousa */}
      <div
        className={`absolute inset-x-4 bottom-[4%] rounded-2xl p-5 text-center backdrop-blur-sm ${
          dark ? "bg-jd-black/60" : "bg-jd-cream/70"
        } md:inset-x-auto md:bottom-auto md:right-[7%] md:top-1/2 md:w-[30%] md:max-w-sm md:-translate-y-1/2 md:rounded-none md:bg-transparent md:p-0 md:text-left md:backdrop-blur-none`}
      >
        <Spec progress={compose} at={0.55}>
          <span className="font-fraktur text-5xl md:text-6xl">
            {product.price}
          </span>
        </Spec>
        {product.features.map((f, i) => (
          <Spec
            key={f.title}
            progress={compose}
            at={0.6 + i * 0.05}
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
            <p className="mt-1 hidden text-sm leading-relaxed opacity-75 md:block">
              {f.text}
            </p>
          </Spec>
        ))}
        <Spec progress={compose} at={0.8} className="mt-5 md:mt-8">
          <Magnetic>
            <a
              href={product.buy ?? "#"}
              className={`inline-block rounded-full px-8 py-4 font-miltorn text-xs uppercase tracking-[0.25em] transition-transform hover:scale-105 ${
                dark ? "bg-jd-cream text-jd-black" : "bg-jd-black text-jd-cream"
              }`}
            >
              Comprar {product.name}
            </a>
          </Magnetic>
        </Spec>
      </div>
    </div>
  );
}
