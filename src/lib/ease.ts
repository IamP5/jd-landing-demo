import { cubicBezier, easeInOut, easeOut } from "motion/react";

/* As curvas do capítulo de merch.

   Elas moram FORA de qualquer componente porque são puras: o `interpolate` do
   Motion pré-gera os misturadores a partir delas. Identidade estável, zero
   alocação por render.

   DUAS PEGADINHAS desta API, as duas já custaram caro:

   1. Em `useTransform` o `ease` é `EasingFunction` — uma FUNÇÃO. Não é o `ease`
      de `transition`, que aceita string. `ease: "easeOut"` e `ease: [.22,1,.36,1]`
      não compilam, e em runtime viram "a is not a function". Sempre função.

   2. A lista precisa ter EXATAMENTE `range.length - 1` itens — um por TRECHO,
      não um por keyframe. Se vier curta, o Motion completa com `noop`, e os
      trechos que sobraram voltam a ser LINEARES em silêncio. Por isso o
      preenchedor `linear` aparece explícito em toda trilha: ele é o que diz
      "aqui é platô mesmo", em vez de ser um esquecimento. */

/** platô: o trecho em que nada deve acontecer (antes de entrar, depois de pousar) */
export const linear = (t: number) => t;

/** SUBIDA — easeOut, v(0)=1,72 e v(1)=0.
    A camiseta CHEGA JÁ ANDANDO (uma curva com v(0)=0 a faria materializar parada
    no quadro, sem entrada) e POUSA MORTA. É o perfil de um objeto que vinha de
    fora de cena e freia sozinho. */
export const SOBE = easeOut;

/** volta do sobre-passo: entra parada (casa com o v(1)=0 do SOBE) e sai parada */
export const ASSENTA = easeInOut;

/** DESLIZE lateral: v(0)=0 e v(1)=0. Precisa arrancar do zero porque nasce POR
    CIMA da subida, que ainda está viva — se arrancasse com velocidade, somaria
    um tranco no meio de um movimento que já existe. */
export const DESLIZA = cubicBezier(0.5, 0, 0.2, 1);

/** REVELA (expo-out): despeja a opacidade cedo e não arrasta o rabo.
    Fade que termina rápido é o que deixa uma coisa "chegar" em vez de "surgir". */
export const REVELA = cubicBezier(0.22, 1, 0.36, 1);

/** pouso de texto: firme, sem quicar */
export const POUSA = cubicBezier(0.16, 0.84, 0.24, 1);

/** SAÍDA (a "emphasized accelerate" do Material): v(0)=0, v(1) alto — sai
    ACELERANDO. Quem está sendo substituído por baixo tem que ler como indo
    embora, não como um dimmer sendo baixado. */
export const SAI = cubicBezier(0.3, 0, 0.8, 0.15);
