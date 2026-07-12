"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type MotionStyle } from "motion/react";
import { getLenis } from "@/lib/lenis";

/**
 * Foto que expande pra quase tela cheia com transição de elemento
 * compartilhado (layoutId). No quadro ela vive em p&b com parallax;
 * expandida, ganha cor. Fecha com clique ou Esc.
 * O overlay vai num portal pro body — ancestrais com transform
 * quebrariam o position:fixed.
 */
export default function ExpandableImage({
  src,
  alt,
  caption,
  frameClassName,
  imgClassName,
  imgStyle,
}: {
  src: string;
  alt: string;
  caption?: string;
  frameClassName?: string;
  imgClassName?: string;
  imgStyle?: MotionStyle;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    getLenis()?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      getLenis()?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ampliar foto: ${alt}`}
        className={`block cursor-zoom-in overflow-hidden ${frameClassName ?? ""}`}
      >
        <motion.img
          layoutId={`expand-${src}`}
          src={src}
          alt={alt}
          style={imgStyle}
          className={imgClassName}
        />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-[70] flex cursor-zoom-out flex-col items-center justify-center gap-4 p-4 md:p-10"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 bg-jd-black/95"
                />
                <motion.img
                  layoutId={`expand-${src}`}
                  src={src}
                  alt={alt}
                  initial={{ filter: "grayscale(1)" }}
                  animate={{ filter: "grayscale(0)" }}
                  exit={{ filter: "grayscale(1)" }}
                  transition={{
                    layout: { type: "spring", stiffness: 210, damping: 26 },
                    filter: { duration: 0.6 },
                  }}
                  className="relative max-h-[86svh] max-w-[94vw] object-contain"
                />
                {caption && (
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.25, duration: 0.4 }}
                    className="relative font-fraktur text-2xl text-jd-cream md:text-3xl"
                  >
                    {caption}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
