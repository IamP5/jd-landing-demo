"use client";

import { motion } from "motion/react";
import { links } from "@/data/site";
import { useIntro } from "@/components/Intro";

const items = [
  { label: "Música", href: "#musica" },
  { label: "Loja", href: "#loja" },
  { label: "Shows", href: "#shows" },
  { label: "Quem Somos", href: "#quem-somos" },
];

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
        <a href="#" aria-label="Jardim Depressa — início">
          <span className="mask-mark mask-monograma block h-8 w-8 md:h-9 md:w-9" />
        </a>
        <ul className="flex items-center gap-4 font-miltorn text-[10px] uppercase tracking-[0.2em] md:gap-10 md:text-xs md:tracking-[0.25em]">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="py-2 transition-opacity hover:opacity-60"
              >
                {item.label}
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
