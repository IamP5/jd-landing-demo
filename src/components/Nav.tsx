"use client";

import { motion } from "motion/react";
import { links } from "@/data/site";
import { useIntro } from "@/components/Intro";
import { getLenis } from "@/lib/lenis";

const items = [
  { label: "Shows", href: "#shows" },
  { label: "Música", href: "#musica" },
  { label: "Merch", href: "#merch" },
  { label: "Quem Somos", href: "#quem-somos" },
];

// expo-out: mesma família do EXPO usado nos scrubs
const SCROLL_OPTS = {
  duration: 1.4,
  easing: (t: number) => 1 - Math.pow(2, -10 * t),
};

// Lenis não intercepta âncoras nativas; scroll manual com fallback nativo
const smoothScrollTo = (target: string | number) => {
  const lenis = getLenis();
  if (lenis?.scrollTo) {
    lenis.scrollTo(target, SCROLL_OPTS);
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
    return;
  }
  document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
};

const handleAnchor =
  (target: string | number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    smoothScrollTo(target);
  };

export default function Nav() {
  const introDone = useIntro();
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={introDone ? { y: 0, opacity: 1 } : {}}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 mix-blend-difference"
    >
      <nav className="flex items-center justify-between px-4 py-4 text-jd-off md:px-10 md:py-5">
        <a
          href="#"
          aria-label="Jardim Depressa — início"
          onClick={handleAnchor(0)}
        >
          <span className="mask-mark mask-monograma block h-8 w-8 md:h-9 md:w-9" />
        </a>
        <ul className="flex items-center gap-4 font-miltorn text-[10px] uppercase tracking-[0.2em] md:gap-10 md:text-xs md:tracking-[0.25em]">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={handleAnchor(item.href)}
                className="group relative py-2 transition-opacity hover:opacity-60"
              >
                {item.label}
                {/* sublinhado cresce da esquerda no hover */}
                <span className="absolute inset-x-0 bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </a>
            </li>
          ))}
          <li>
            <a
              href={links.spotify}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-current px-3 py-2 transition-opacity hover:opacity-60 md:px-4"
            >
              Spotify
            </a>
          </li>
        </ul>
      </nav>
    </motion.header>
  );
}
