"use client";

import PanelStack, { type PanelDef } from "@/components/PanelStack";
import MerchIntro from "@/components/MerchIntro";
import MerchMorph, { Watermark } from "@/components/MerchMorph";
import ProductShowcase from "@/components/ProductShowcase";
import { products, type Product } from "@/data/site";

/* O capítulo de merch como UM pôster só, em três poses.

   Não existe troca de seção aqui dentro. A abertura ("Merch"), a camiseta preta
   e a camiseta branca acontecem todas no mesmo painel, sobre o mesmo fundo preto
   e a mesma marca d'água — que nunca sai da tela, e é justamente o que costura
   as três. O scroll não corta: ele troca o que está EM CIMA do fundo.

     intro    o letreiro se monta
     compose  o letreiro sai e a camiseta sobe por baixo, com o vetor dela
     morph    o creme sobe POR DENTRO do preto e a camiseta muda de cor no lugar

   Antes a abertura era um painel próprio e a camiseta subia por cima dela numa
   cortina — dois pretos idênticos deslizando um sobre o outro, que o olho lia
   como "acabou uma seção, começou outra". A cortina continua existindo, mas só
   pra quem é mesmo outra coisa: a seção seguinte (presskit) cobrindo a pilha.

   Ver MerchMorph pra varredura e PanelStack pra mecânica dos atos. */

/** painel de produto avulso, no formato cortina (só entra se houver 3+ produtos) */
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

/* A varredura só faz sentido entre um produto escuro e um claro — é o contraste
   que dá o que varrer. Sem par, o segundo cai na pilha como painel-cortina. */
const morphable = Boolean(first && second && first.theme !== second.theme);
const trailing = morphable ? rest : [second, ...rest].filter(Boolean);

const opening: PanelDef = {
  id: morphable ? `merch-${first.id}-${second.id}` : `merch-${first.id}`,
  // o painel é o mundo de SAÍDA; na varredura, o de chegada é uma camada dentro dele
  className: "bg-jd-black text-jd-cream",
  acts: morphable ? ["intro", "compose", "morph"] : ["intro", "compose"],
  // na varredura a marca d'água vem de dentro do MerchMorph, que precisa dela nos
  // dois mundos (uma em cada lado da emenda) e afunda cada uma no seu ritmo
  background: morphable ? undefined : (p) => <Watermark life={p.life} />,
  content: (p) => (
    <>
      {morphable ? (
        <MerchMorph from={first} to={second} progress={p} />
      ) : (
        <ProductShowcase product={first} progress={p} />
      )}
      <MerchIntro {...p} />
    </>
  ),
};

const panels: PanelDef[] = [opening, ...trailing.map(curtainPanel)];

export default function MerchChapter() {
  return <PanelStack id="merch" panels={panels} />;
}
