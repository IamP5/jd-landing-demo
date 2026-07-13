import Nav from "@/components/Nav";
// TEMP: HeroLab substitui <Hero /> + <Marquee /> enquanto testamos as 3
// variantes do hero — depois da escolha, volta Hero/Marquee e remove hero-lab/
import HeroLab from "@/components/hero-lab/HeroLab";
import Music from "@/components/Music";
import WhoWeAre from "@/components/WhoWeAre";
import MerchChapter from "@/components/MerchChapter";
import Events from "@/components/Events";
import Footer from "@/components/Footer";
import { NEXT_SECTION_PULL } from "@/components/PanelStack";

export default function Home() {
  return (
    <main>
      <Nav />
      <HeroLab />
      <Events />
      <Music />
      <MerchChapter />
      {/* a margem negativa faz o presskit subir POR CIMA do último painel de
          merch (que segue pinado, afundando atrás dele) — é a mesma cortina que
          roda entre os painéis, atravessando a fronteira do capítulo.
          z acima da pilha (z-0) e abaixo da Nav (z-50). */}
      <div className="relative z-40" style={{ marginTop: NEXT_SECTION_PULL }}>
        <WhoWeAre />
      </div>
      <Footer />
    </main>
  );
}
