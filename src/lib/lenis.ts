import type Lenis from "lenis";

// window.lenis é exposto pelo SmoothScroll; pode existir com outro formato
// durante o boot, então valida a forma antes de usar
type LenisScrollTo = (
  target: number | string | HTMLElement,
  options?: Record<string, unknown>
) => void;

/**
 * Roda `cb` assim que a instância real do Lenis existir (o SmoothScroll monta
 * depois dos filhos). Devolve um cancelador — chame-o no cleanup do efeito.
 * Quem precisa da instância crua (o Snap, por ex.) usa isto; quem só quer
 * stop/start/scrollTo usa o getLenis() guardado abaixo.
 */
export const onLenisReady = (cb: (lenis: Lenis) => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  let cancelled = false;
  const poll = window.setInterval(() => {
    const l = (window as unknown as { lenis?: Lenis }).lenis;
    // `raf` é o método que só a instância real tem — serve de prova de forma
    if (!cancelled && l && typeof l.raf === "function") {
      window.clearInterval(poll);
      cb(l);
    }
  }, 100);
  return () => {
    cancelled = true;
    window.clearInterval(poll);
  };
};

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
