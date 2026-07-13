"use client";

import { motion, useTransform } from "motion/react";
import PanelStack, { type PanelDef, type PanelProgress } from "@/components/PanelStack";
import MerchIntro from "@/components/MerchIntro";
import ProductShowcase from "@/components/ProductShowcase";
import { products } from "@/data/site";

/* O capítulo de merch como uma pilha de pôsteres: intro preta, camiseta preta,
   camiseta creme. Os cortes preto↔creme, que antes eram uma emenda deslizando
   na velocidade do scroll, agora acontecem em profundidade — o painel que sai
   fica pinado e AFUNDA (recuo + véu) enquanto o próximo sobe por cima. */

/** camada mais funda de todo painel: o monograma, quase invisível, à deriva */
function Watermark({ life }: PanelProgress) {
  const rotate = useTransform(life, [0, 1], [-6, 6]);
  return (
    <motion.div
      aria-hidden
      style={{ rotate }}
      className="mask-mark mask-monograma absolute left-1/2 top-1/2 h-[130vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2 opacity-[0.045]"
    />
  );
}

const panels: PanelDef[] = [
  {
    id: "merch-intro",
    className: "bg-jd-black text-jd-cream",
    background: (p) => <Watermark {...p} />,
    content: (p) => <MerchIntro {...p} />,
  },
  ...products.map(
    (product): PanelDef => ({
      id: product.id,
      className:
        product.theme === "dark"
          ? "bg-jd-black text-jd-cream"
          : "bg-jd-cream text-jd-black",
      background: (p) => <Watermark {...p} />,
      content: (p) => <ProductShowcase product={product} progress={p} />,
    }),
  ),
];

export default function MerchChapter() {
  return <PanelStack id="merch" panels={panels} />;
}
