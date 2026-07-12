"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { links } from "@/data/site";

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["30%", "0%"]);

  return (
    <footer
      ref={ref}
      className="relative overflow-hidden bg-jd-coral px-6 pb-10 pt-24 text-jd-black md:px-10"
    >
      <motion.span
        style={{ y }}
        className="mask-mark mask-logo mx-auto block h-[22vw] w-full"
        role="img"
        aria-label="Jardim Depressa"
      />
      <div className="mt-16 flex flex-wrap items-center justify-between gap-6 font-miltorn text-xs uppercase tracking-[0.25em]">
        <div className="flex gap-6">
          <a href={links.spotify} target="_blank" rel="noreferrer" className="hover:underline">
            Spotify
          </a>
          <a href={links.instagram} target="_blank" rel="noreferrer" className="hover:underline">
            Instagram
          </a>
          <a href={links.youtube} target="_blank" rel="noreferrer" className="hover:underline">
            YouTube
          </a>
        </div>
        <span className="opacity-60">
          © {new Date().getFullYear()} Jardim Depressa
        </span>
      </div>
    </footer>
  );
}
