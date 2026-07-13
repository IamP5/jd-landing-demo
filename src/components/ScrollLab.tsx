"use client";

// TEMP: A/B do scroll do merch — remover junto com src/lib/scroll-mode.ts
// quando a escolha estiver feita (e aí o modo vencedor vira o fixo na PanelStack)

import { SCROLL_MODES, setScrollMode, useScrollMode } from "@/lib/scroll-mode";

/* Só a pilha de painéis do merch tem snap — nas seções editoriais ele nunca
   ligou (puxar quem parou pra ler o texto de Música seria hostil). Então este
   botão só muda o comportamento lá dentro; no resto da página os dois modos são
   a mesma coisa. Vale rolar até o merch pra comparar.

   Sob `prefers-reduced-motion` o snap nem chega a existir — o Lenis não anima
   scroll de ninguém que pediu menos movimento — e aí o A/B fica inerte. */

const HINT: Record<string, string> = {
  snap: "o scroll assenta sozinho na pose mais próxima quando você para",
  livre: "o scroll para onde você parou",
};

export default function ScrollLab() {
  const mode = useScrollMode();

  return (
    <div className="fixed bottom-12 left-4 z-[80] flex items-center gap-2 font-miltorn text-[9px] uppercase tracking-[0.2em]">
      <span className="text-jd-cream/40">scroll:</span>
      {SCROLL_MODES.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setScrollMode(m)}
          title={HINT[m]}
          aria-pressed={mode === m}
          className={`rounded-full border px-3 py-1.5 transition-colors ${
            mode === m
              ? "border-jd-cream bg-jd-cream text-jd-black"
              : "border-jd-cream/30 bg-jd-black/60 text-jd-cream/60 hover:border-jd-cream"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
