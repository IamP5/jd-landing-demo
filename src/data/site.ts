export const links = {
  spotify: "https://open.spotify.com/artist/7ip9XxRZdSEORKwzpUarZK",
  instagram: "https://www.instagram.com/jardimdepressa/",
  youtube: "https://youtube.com/@jardimdepressa",
  /** smart-link do single Diabo (Tratore) — mesmo link da bio do Instagram */
  diabo: "https://tratore.ffm.to/jddiabo",
};

export type Show = {
  date: string; // ISO — ex.: "2026-08-15"
  city: string;
  venue: string;
  tickets?: string;
};

// MOCK: shows de exemplo pra visualizar a UI — trocar pelos reais antes de publicar.
// Datas passadas somem sozinhas da página; array vazio mostra o convite pro Instagram.
export const shows: Show[] = [
  {
    date: "2026-08-15",
    city: "São Paulo",
    venue: "Casa Rockambole",
    tickets: "https://example.com/ingressos",
  },
  {
    date: "2026-09-04",
    city: "São Paulo",
    venue: "A Porta Maldita",
    tickets: "https://example.com/ingressos",
  },
  {
    date: "2026-10-10",
    city: "Curitiba",
    venue: "92 Graus",
  },
];

export function upcomingShows(now = new Date()): Show[] {
  return shows
    .filter((s) => new Date(s.date + "T23:59:59") >= now)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type Product = {
  id: string;
  name: string;
  tagline: string;
  price: string;
  image: string;
  /** vetor decorativo que flutua atrás da camiseta.

      Usa as versões `-fundo`: a arte original traz a lettering ("Jardim
      Depressa" no sol, o monograma JD em rosa no príncipe), que a camiseta já
      estampa na frente — repetir isso gigante no fundo só suja a leitura. Os
      arquivos originais seguem em public/brand/, intactos. */
  vector: string;
  theme: "light" | "dark";
  features: { title: string; text: string }[];
  buy?: string;
};

export const products: Product[] = [
  {
    id: "tee-sol",
    name: "Camiseta Sol",
    tagline: "O sol que te encara de volta.",
    price: "R$ 89",
    image: "/products/tee-preta.png",
    vector: "/brand/sol-fundo.svg",
    theme: "dark",
    features: [
      {
        title: "Serigrafia artesanal",
        text: "Estampa em duas cores — rosa e turquesa — puxada à mão, tela por tela.",
      },
      {
        title: "100% algodão pesado",
        text: "Malha encorpada, modelagem reta. Feita pra durar mais que o hype.",
      },
      {
        title: "Arte original da banda",
        text: "O sol de olhos abertos do universo visual de Jardim Depressa.",
      },
    ],
  },
  {
    id: "tee-principe",
    name: "Camiseta Príncipe",
    tagline: "Um príncipe em seu jardim de nuvens.",
    price: "R$ 89",
    image: "/products/tee-branca.png",
    vector: "/brand/principe-fundo.svg",
    theme: "light",
    features: [
      {
        title: "Ilustração xilogravura",
        text: "Traço de gravura antiga com o monograma JD em rosa sobreposto.",
      },
      {
        title: "Base branca, tinta à base d'água",
        text: "Toque macio, sem plastificado. Respira com você no show.",
      },
      {
        title: "Edição limitada",
        text: "Tiragem curta. Acabou, acabou — igual bis de show.",
      },
    ],
  },
];
