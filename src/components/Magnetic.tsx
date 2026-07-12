"use client";

import { type PointerEvent, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useFinePointer } from "@/lib/media";

/**
 * Botão magnético (padrão Codrops MagneticButtons): a zona de padding em volta
 * faz o papel do raio de atração; dentro dela o filho é puxado 0.35x em
 * direção ao cursor e volta de mola ao sair.
 */
export default function Magnetic({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const sy = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });
  const active = fine && !reduce;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div
      className={`-m-6 inline-block p-6 ${className ?? ""}`}
      onPointerMove={active ? onMove : undefined}
      onPointerLeave={active ? reset : undefined}
    >
      <motion.div style={{ x: sx, y: sy }}>{children}</motion.div>
    </div>
  );
}
