"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { links, upcomingShows } from "@/data/site";

export default function Events() {
  const shows = upcomingShows();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section
      id="shows"
      ref={ref}
      className="relative overflow-hidden bg-jd-black px-6 py-32 md:px-10"
    >
      {/* atmosfera: foto de show ao fundo, neblina de palco */}
      <motion.img
        src="/photos/live-fog.jpg"
        alt=""
        aria-hidden
        style={{ y: bgY }}
        className="absolute inset-0 h-[120%] w-full object-cover opacity-25 grayscale"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-jd-black via-jd-black/60 to-jd-black" />

      <h2 className="relative font-fraktur text-6xl text-jd-cream md:text-8xl">Shows</h2>

      {shows.length === 0 ? (
        <div className="relative mt-16 max-w-lg">
          <p className="text-xl text-jd-cream/70">
            Nenhum show marcado no momento. Siga a banda pra saber primeiro.
          </p>
          <a
            href={links.instagram}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-block rounded-full border border-jd-teal px-7 py-3.5 font-miltorn text-xs uppercase tracking-[0.25em] text-jd-teal transition-colors hover:bg-jd-teal hover:text-jd-black"
          >
            Seguir no Instagram
          </a>
        </div>
      ) : (
        <ul className="relative mt-16">
          {shows.map((show, i) => {
            const d = new Date(show.date + "T12:00:00");
            return (
              <motion.li
                key={show.date + show.city}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="group border-t border-jd-cream/15 last:border-b"
              >
                <a
                  href={show.tickets ?? "#"}
                  target={show.tickets ? "_blank" : undefined}
                  rel="noreferrer"
                  className="flex flex-wrap items-baseline justify-between gap-4 py-8 transition-transform duration-500 group-hover:translate-x-3"
                >
                  <span className="font-fraktur text-3xl text-jd-coral md:text-4xl">
                    {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                  <span className="text-2xl font-medium text-jd-cream md:text-3xl">
                    {show.city}
                    <span className="ml-3 text-lg italic text-jd-cream/50">
                      {show.venue}
                    </span>
                  </span>
                  <span className="font-miltorn text-xs uppercase tracking-[0.25em] text-jd-teal opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Ingressos ↗
                  </span>
                </a>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
