// window.lenis é exposto pelo SmoothScroll; pode existir com outro formato
// durante o boot, então valida a forma antes de usar
type LenisScrollTo = (
  target: number | string | HTMLElement,
  options?: Record<string, unknown>
) => void;

type LenisGuarded = {
  stop: () => void;
  start: () => void;
  scrollTo?: LenisScrollTo;
};

export const getLenis = (): LenisGuarded | undefined => {
  if (typeof window === "undefined") return undefined;
  const l = (
    window as unknown as {
      lenis?: { stop?: unknown; start?: unknown; scrollTo?: unknown };
    }
  ).lenis;
  if (!l || typeof l.stop !== "function" || typeof l.start !== "function")
    return undefined;
  // bind preserva o `this` da instância real (métodos dependem do estado interno)
  const guarded: LenisGuarded = {
    stop: (l.stop as () => void).bind(l),
    start: (l.start as () => void).bind(l),
  };
  // scrollTo só entra quando a instância realmente o tem
  if (typeof l.scrollTo === "function")
    guarded.scrollTo = l.scrollTo.bind(l) as LenisScrollTo;
  return guarded;
};
