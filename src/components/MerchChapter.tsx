"use client";

import PanelStack, { type PanelDef } from "@/components/PanelStack";
import MerchIntro from "@/components/MerchIntro";
import MerchMorph, { Watermark } from "@/components/MerchMorph";
import ProductShowcase from "@/components/ProductShowcase";
import { products, type Product } from "@/data/site";

/* O capítulo de merch como uma pilha de pôsteres.

   A intro é uma cortina clássica: a camiseta preta sobe POR CIMA dela, que
   afunda pra trás (recuo + véu).

   O par de camisetas, não. Ali o preto e o creme são o mesmo painel: o creme
   sobe POR DENTRO do preto e a camiseta muda de cor no lugar, sem sair do
   lugar. Ver MerchMorph — é lá que mora a varredura. */

/** painel de produto avulso, no formato cortina (não usado com só duas camisetas) */
const curtainPanel = (product: Product): PanelDef => ({
  id: product.id,
  className:
    product.theme === "dark"
      ? "bg-jd-black text-jd-cream"
      : "bg-jd-cream text-jd-black",
  background: (p) => <Watermark life={p.life} />,
  content: (p) => <ProductShowcase product={product} progress={p} />,
});

const [first, second, ...rest] = products;

/* A fusão só faz sentido entre um produto escuro e um claro — é o contraste que
   dá o que varrer. Sem par, cada produto vira um painel-cortina normal. */
const morphable =
  first && second && first.theme !== second.theme;

const panels: PanelDef[] = [
  {
    id: "merch-intro",
    className: "bg-jd-black text-jd-cream",
    background: (p) => <Watermark life={p.life} />,
    content: (p) => <MerchIntro {...p} />,
  },
  ...(morphable
    ? [
        {
          id: `${first.id}--${second.id}`,
          // o painel é o mundo de SAÍDA; o de chegada é uma camada dentro dele
          className: "bg-jd-black text-jd-cream",
          morph: true,
          content: (p) => (
            <MerchMorph from={first} to={second} progress={p} />
          ),
        } satisfies PanelDef,
        ...rest.map(curtainPanel),
      ]
    : products.map(curtainPanel)),
];

export default function MerchChapter() {
  return <PanelStack id="merch" panels={panels} />;
}
