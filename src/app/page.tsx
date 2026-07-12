import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Music from "@/components/Music";
import WhoWeAre from "@/components/WhoWeAre";
import ProductShowcase from "@/components/ProductShowcase";
import Events from "@/components/Events";
import Footer from "@/components/Footer";
import { products } from "@/data/site";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Marquee />
      <Music />
      <section id="loja">
        {products.map((p) => (
          <ProductShowcase key={p.id} product={p} />
        ))}
      </section>
      <Events />
      <WhoWeAre />
      <Footer />
    </main>
  );
}
