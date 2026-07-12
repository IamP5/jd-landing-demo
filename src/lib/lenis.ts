// window.lenis é exposto pelo SmoothScroll; pode existir com outro formato
// durante o boot, então valida a forma antes de usar
export const getLenis = () => {
  if (typeof window === "undefined") return undefined;
  const l = (window as unknown as { lenis?: { stop?: unknown; start?: unknown } })
    .lenis;
  return l && typeof l.stop === "function" && typeof l.start === "function"
    ? (l as { stop: () => void; start: () => void })
    : undefined;
};
