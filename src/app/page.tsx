import Nav from "@/components/Nav";
// TEMP: HeroLab substitui <Hero /> + <Marquee /> enquanto testamos as 3
// variantes do hero — depois da escolha, volta Hero/Marquee e remove hero-lab/
import HeroLab from "@/components/hero-lab/HeroLab";
import Music from "@/components/Music";
import WhoWeAre from "@/components/WhoWeAre";
import ProductShowcase from "@/components/ProductShowcase";
import MerchIntro from "@/components/MerchIntro";
import Events from "@/components/Events";
import Footer from "@/components/Footer";
import { products } from "@/data/site";

export default function Home() {
  return (
    <main>
      <Nav />
      <HeroLab />
      <Events />
      <Music />
      <MerchIntro />
      {products.map((p) => (
        <ProductShowcase key={p.id} product={p} />
      ))}
      <WhoWeAre />
      <Footer />
    </main>
  );
}
