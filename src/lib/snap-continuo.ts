import type Lenis from "lenis";

/* Um snap que não dá tranco — e que não desfaz o gesto de ninguém.

   Isto substitui o `lenis/snap`. Não é NIH: o plugin tem quatro defeitos, os
   quatro lidos no pacote instalado e os quatro medidos no app rodando.

   1. TRANCO. O easing padrão que usávamos, `t => 1 - (1-t)^4`, tem derivada 4
      em t=0 — velocidade MÁXIMA no primeiro frame. E o `Animate.fromTo` do
      Lenis faz `this.from = this.value = from; this.currentTime = 0`: a
      velocidade que estava entrando é jogada fora. Medido: a página vinha a
      ~36 px/s (o usuário parou) e o snap arrancava a ~2.000 px/s. Em um frame.

   2. ALVO ERRADO. Ele decide por `lenis.scroll + e.deltaY`. Mas o Lenis JÁ
      somou esse delta em `targetScroll` no instante do evento — o delta conta
      duas vezes. Na roda dá um viés de alguns svh; no toque o último evento é o
      `touchend`, cujo delta é `sign(v)·|v|^1.7`, e um flick vira um viés enorme.

   3. DURAÇÃO FIXA. 0,9s tanto pra correção de 30px quanto pro salto de 1093px.
      A curta arrasta, a longa é um foguete.

   4. SEM DIREÇÃO. Em `mandatory` o limiar de distância é +infinito, então ele
      DESFAZ o gesto: você rola pra frente, para, e ele te devolve pra trás.

   Aqui: o alvo sai de `targetScroll` (que É o pouso projetado do gesto — a
   inércia do flick já vem embutida de graça), a duração cresce com a RAIZ da
   distância, a curva parte do repouso e chega no repouso, e existe um teto de
   quanto o snap pode remar contra a intenção do leitor.

   O portão é timer CURTO **mais** um gate de velocidade que REAGENDA. Os dois,
   e não um: timer sozinho dispara com o trackpad ainda em inércia; gate sozinho
   dispara no meio de uma rolagem lenta e contínua. */

const clamp = (lo: number, v: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** A curva: power3-out ao quadrado.
 *
 *    E(t) = (1 − (1−t)³)²
 *    E(0)=0 · E(1)=1 · E'(0)=0 · E'(1)=0 · E'(t) ≥ 0 (monótona: nunca desanda)
 *    pico de velocidade = 1,954× a média
 *
 *  As duas pontas em ZERO é o ponto inteiro: o snap só dispara depois que o
 *  scroll assentou, então ele nasce de velocidade ~0 — e uma curva que arranca
 *  em degrau a partir do repouso é exatamente o tranco que estamos matando. */
const CURVA = (t: number) => {
  const r = 1 - (1 - t) ** 3;
  return r * r;
};

/** silêncio de INPUT que já conta como "a mão parou" (era 500ms) */
const QUIETO_MS = 150;
/** o scroll assentou? `lenis.velocity` é px por FRAME — 0,35 ≈ 21 px/s a 60Hz */
const V_REPOUSO = 0.35;

/** duração = K·√(distância / altura-do-painel), em segundos.
    Raiz, não linear: a duração PERCEBIDA de um salto cresce com a raiz da
    distância — um pulo 4× maior deve durar ~2× mais, não 4×. */
const T_K = 0.85;
const T_MIN = 0.3; // abaixo disso o snap lê como corte, não como movimento
const T_MAX = 1.05; // acima disso o leitor sente que perdeu o controle da página

/** 4px não é um pulo, é arredondamento — não paga uma animação */
const MORTO_PX = 5;

/** quanto o snap pode DESFAZER do gesto antes de desistir e ir junto com ele.
    Em `mandatory` isso era infinito: meio vão pra trás, contra a leitura. */
const RESIST_FRAC = 0.35;

/** Se o último gesto do usuário é mais velho que isto, o scroll que está
    acontecendo é de OUTRO (a âncora da Nav, o teclado, a barra de rolagem) —
    não é nosso pra sequestrar. É o que impede o snap de comer o `scrollTo` de
    1,4s da Nav: durante um scroll programático o Lenis mantém
    `targetScroll === animatedScroll` a cada frame, então qualquer portão que
    olhasse só pra posição ficaria aberto o voo inteiro. */
const GESTO_VALIDO_MS = 1200;

export function criarSnapContinuo(lenis: Lenis) {
  let frames: number[] = [];
  let unit = 0;
  let ligado = false;
  let dir = 1;
  let dedo = false;
  let ultimoGesto = 0;
  let timer = 0;

  /* Flag de toque própria, em vez do `isTouching` do Lenis: ele não escuta
     `touchcancel` (o iOS cancela o toque em swipe de borda, notificação,
     chamada), e ficaria presa em `true` — o snap morreria em silêncio. */
  const pega = () => {
    dedo = true;
  };
  const solta = () => {
    dedo = false;
  };

  const agendar = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(decidir, QUIETO_MS);
  };

  function decidir() {
    if (!ligado || !unit || frames.length === 0) return;

    // dedo ainda na tela: o Lenis emite `virtual-scroll` já no `touchstart`.
    // Com 500ms de debounce isso passava batido; com 150ms, snaparia embaixo do dedo.
    if (dedo) return agendar();

    // o gesto acabou, mas a INÉRCIA pode não ter. Reagenda até o scroll assentar.
    if (Math.abs(lenis.velocity) > V_REPOUSO) return agendar();

    // o scroll em curso não é de um gesto — é da Nav, do teclado, de outra coisa
    if (performance.now() - ultimoGesto > GESTO_VALIDO_MS) return;

    const y = lenis.animatedScroll;
    // ONDE O GESTO IA PARAR, não onde o scroll está agora: o Lenis persegue o
    // `targetScroll` por amortecimento, e a projeção da inércia já está lá.
    const pouso = lenis.targetScroll;

    let i = 0;
    for (let k = 1; k < frames.length; k++) {
      if (Math.abs(frames[k] - pouso) < Math.abs(frames[i] - pouso)) i = k;
    }

    /* DIRECIONAL. O snap pode ASSENTAR o gesto; nunca DESFAZÊ-LO além do teto.
       Se o frame mais próximo ficou longe demais ATRÁS de onde o leitor decidiu
       ir, vai-se pro próximo no sentido dele. E se não há próximo (ele está
       saindo da pilha), o snap simplesmente SAI DA FRENTE. */
    const resist = RESIST_FRAC * unit;
    if ((frames[i] - pouso) * dir < -resist) {
      const proximo = i + dir;
      if (frames[proximo] === undefined) return;
      i = proximo;
    }

    const alvo = frames[i];
    const distancia = Math.abs(alvo - y);
    if (distancia < MORTO_PX) return;

    /* `duration` + `easing` (e não `lerp`): só este ramo pousa EXATO no alvo.
       O ramo `lerp` do Lenis encerra por arredondamento, com folga de 1px — e
       ainda arrancaria com velocidade proporcional à distância, que é o tranco
       de novo, por outro caminho. */
    lenis.scrollTo(alvo, {
      duration: clamp(T_MIN, T_K * Math.sqrt(distancia / unit), T_MAX),
      easing: CURVA,
      userData: { initiator: "snap" },
    });
  }

  const desligarVirtual = lenis.on("virtual-scroll", ({ deltaY }) => {
    /* deltaY === 0 chega de verdade: `touchstart` e o `touchend` de um toque
       parado emitem zero. Sem este filtro, um toque em cima de uma pose podia
       ser lido como gesto e saltar pro vizinho. */
    if (deltaY === 0) return;
    dir = Math.sign(deltaY);
    ultimoGesto = performance.now();
    if (ligado) agendar();
  });

  window.addEventListener("touchstart", pega, { passive: true });
  window.addEventListener("touchend", solta, { passive: true });
  window.addEventListener("touchcancel", solta, { passive: true });

  return {
    /** as poses e a altura do painel — a PanelStack já é dona dessa medição */
    setFrames(novosFrames: number[], novaUnidade: number) {
      frames = novosFrames;
      unit = novaUnidade;
    },
    setEnabled(on: boolean) {
      ligado = on;
      if (!on) window.clearTimeout(timer);
    },
    destroy() {
      window.clearTimeout(timer);
      desligarVirtual();
      window.removeEventListener("touchstart", pega);
      window.removeEventListener("touchend", solta);
      window.removeEventListener("touchcancel", solta);
    },
  };
}
