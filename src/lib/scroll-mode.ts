import { useSyncExternalStore } from "react";

/* TEMP: A/B do scroll do capítulo de merch — remover junto com o ScrollLab
   quando a escolha estiver feita.

   `snap`  — o scroll assenta sozinho na pose mais próxima quando você para
             (mandatory, só dentro da pilha de painéis; ver PanelStack)
   `livre` — ninguém puxa nada: o scroll para onde você parou

   Mora fora do React de propósito. Quem consome de verdade é o efeito da
   PanelStack, que fala com o Lenis Snap na mão, sem re-renderizar — o hook
   abaixo existe só pro botão saber qual pílula está acesa. */

export type ScrollMode = "snap" | "livre";

export const SCROLL_MODES: ScrollMode[] = ["snap", "livre"];

const STORAGE_KEY = "jd-scroll-mode";
const DEFAULT: ScrollMode = "snap";

// null = ainda não lemos o storage (no servidor nunca lemos)
let mode: ScrollMode | null = null;
const listeners = new Set<() => void>();

export const getScrollMode = (): ScrollMode => {
  if (mode) return mode;
  if (typeof window === "undefined") return DEFAULT;
  mode = window.localStorage.getItem(STORAGE_KEY) === "livre" ? "livre" : DEFAULT;
  return mode;
};

export const setScrollMode = (next: ScrollMode) => {
  if (getScrollMode() === next) return;
  mode = next;
  window.localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((notify) => notify());
};

/** avisa quando o modo muda; devolve o cancelador (chame no cleanup do efeito) */
export const onScrollModeChange = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** O snapshot do servidor é sempre o default: o HTML é gerado antes de existir
    localStorage. Se o usuário tinha escolhido `livre`, o useSyncExternalStore
    re-renderiza sozinho logo depois da hidratação — é pra isso que ele serve. */
export const useScrollMode = (): ScrollMode =>
  useSyncExternalStore(onScrollModeChange, getScrollMode, () => DEFAULT);
