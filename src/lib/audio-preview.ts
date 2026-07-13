"use client";

import { useSyncExternalStore } from "react";
import gsap from "gsap";

/** Um único <audio> pra página toda: tocar uma prévia pausa a anterior.
 *  O grafo de áudio também mora aqui: createMediaElementSource é porta de mão
 *  única — uma vez por elemento, pra sempre, e a segunda chamada joga
 *  InvalidStateError. Nada disso pode nascer num useEffect. */

type State = {
  src: string | null;
  playing: boolean;
  progress: number;
  /** o grafo já existe (houve pelo menos um play). Só então as camadas visuais montam. */
  armed: boolean;
};

const IDLE: State = { src: null, playing: false, progress: 0, armed: false };

let el: HTMLAudioElement | null = null;
let state: State = IDLE;
const listeners = new Set<() => void>();

/** recorte SEM o progress: `progress` muda ~4x/s e re-renderizaria a seção Música
 *  inteira (e as duas capas) a cada timeupdate. Quem só quer saber "quem toca"
 *  recebe um objeto com identidade estável entre os avanços do progresso. */
type Now = { src: string | null; playing: boolean; armed: boolean };
const NOW_IDLE: Now = { src: null, playing: false, armed: false };
let now: Now = NOW_IDLE;

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  if (
    state.src !== now.src ||
    state.playing !== now.playing ||
    state.armed !== now.armed
  ) {
    now = { src: state.src, playing: state.playing, armed: state.armed };
  }
  listeners.forEach((l) => l());
}

/* ────────────────────────────── frame ────────────────────────────── */

export type Frame = {
  /** 0..1, já normalizados contra piso/teto adaptativos */
  level: number;
  bass: number;
  mid: number;
  treble: number;
  /** ataque de grave (onset): 0 na maioria dos quadros, estoura na batida */
  kick: number;
  /** 48 faixas log 40Hz..12kHz, 0..255 */
  spec: Uint8Array;
  /** 64 amostras no tempo, 128 = silêncio */
  wave: Uint8Array;
};

const SPEC_BANDS = 48;
const WAVE_POINTS = 64;

/** objeto único, mutado no lugar: zero alocação por quadro */
const frame: Frame = {
  level: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  kick: 0,
  spec: new Uint8Array(SPEC_BANDS),
  wave: new Uint8Array(WAVE_POINTS).fill(128),
};
const frameListeners = new Set<(f: Frame) => void>();

/* ────────────────────────────── grafo ────────────────────────────── */

let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let graphFailed = false;

let freq = new Uint8Array(0);
let time = new Uint8Array(0);
/** [lo,hi) por faixa do espectro, já recortado contra frequencyBinCount */
let specRanges = new Int32Array(0);
const specRaw = new Float32Array(SPEC_BANDS);
let cuts = { bass0: 0, bass1: 0, mid1: 0, tre1: 0 };
let waveStep = 1;

/* ─────────────────────── movimento reduzido ──────────────────────── */

let motionMq: MediaQueryList | null = null;

function motionOk() {
  if (typeof window === "undefined") return false;
  if (!motionMq) {
    motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // ligar "reduzir movimento" no meio da faixa tem que parar o loop na hora
    motionMq.addEventListener("change", () => {
      if (motionMq?.matches) stopLoop();
    });
  }
  return !motionMq.matches;
}

/* ─────────────────────── normalização adaptativa ──────────────────── */

type Norm = { lo: number; hi: number };

const nBass: Norm = { lo: 0, hi: 0.2 };
const nMid: Norm = { lo: 0, hi: 0.2 };
const nTre: Norm = { lo: 0, hi: 0.2 };
let specMax = 0.15;
let bassSlow = 0;

function resetNorms() {
  nBass.lo = nMid.lo = nTre.lo = 0;
  nBass.hi = nMid.hi = nTre.hi = 0.2;
  specMax = 0.15;
  bassSlow = 0;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** getByteFrequencyData é mapeado em dB: num master comprimido o valor cru fica
 *  colado no topo a faixa inteira — sem piso/teto adaptativos não existe batida,
 *  só um zoom travado. Teto sobe rápido e cai devagar; piso, o contrário. */
function normalize(n: Norm, raw: number) {
  if (raw > n.hi) n.hi += (raw - n.hi) * 0.4;
  else n.hi += (raw - n.hi) * 0.0025;
  if (raw < n.lo) n.lo += (raw - n.lo) * 0.4;
  else n.lo += (raw - n.lo) * 0.0012;

  const span = n.hi - n.lo;
  if (span < 0.05) return 0; // trecho parado: descansa em vez de amplificar ruído
  return clamp01((raw - n.lo) / span);
}

/** ataque rápido, queda lenta — é isso que faz virar bumbo e não gelatina */
const env = (prev: number, raw: number) =>
  prev + (raw - prev) * (raw > prev ? 0.5 : 0.12);

/* ─────────────────────────── construção ──────────────────────────── */

function ensureGraph(a: HTMLAudioElement) {
  if (ctx || graphFailed) return;
  // com "reduzir movimento" nada é analisado: o áudio segue pelo caminho direto
  // do <audio>, que no iOS também é o canal de mídia (imune à chave de silencioso)
  if (!motionOk()) return;

  try {
    ctx = new AudioContext();

    // iOS: Web Audio cai no canal ambiente e some com a chave de silencioso
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "playback";

    const source = ctx.createMediaElementSource(a);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;
    analyser.minDecibels = -85;
    analyser.maxDecibels = -25;

    source.connect(analyser);
    // sem esta linha o elemento sai do caminho direto pro alto-falante:
    // silêncio total com a UI dizendo que está tocando
    analyser.connect(ctx.destination);

    const bins = analyser.frequencyBinCount;
    freq = new Uint8Array(bins);
    time = new Uint8Array(analyser.fftSize);
    waveStep = Math.max(1, Math.floor(analyser.fftSize / WAVE_POINTS));

    // 48000 na maioria dos aparelhos — chutar 44100 desloca todas as bandas
    const bw = ctx.sampleRate / analyser.fftSize;
    const at = (hz: number) =>
      Math.min(bins - 1, Math.max(0, Math.round(hz / bw)));

    cuts = { bass0: at(20), bass1: at(250), mid1: at(4000), tre1: at(12000) };

    specRanges = new Int32Array(SPEC_BANDS * 2);
    for (let i = 0; i < SPEC_BANDS; i++) {
      const lo = at(40 * Math.pow(300, i / SPEC_BANDS));
      const hi = Math.min(
        bins,
        Math.max(lo + 1, at(40 * Math.pow(300, (i + 1) / SPEC_BANDS))),
      );
      specRanges[i * 2] = lo;
      specRanges[i * 2 + 1] = hi;
    }

    document.addEventListener("visibilitychange", onVisible);
    set({ armed: true });
  } catch {
    graphFailed = true;
    ctx = null;
    analyser = null;
  }
}

function onVisible() {
  if (document.visibilityState !== "visible") return;
  // o iOS suspende o contexto em segundo plano: voltar sem isto = UI tocando, sem som
  if (ctx && ctx.state !== "running" && el && !el.paused) void ctx.resume();
}

/* ──────────────────────────── o loop ─────────────────────────────── */

let ticking = false;
let releasing = false;
/** ~20 quadros (≈330ms) até o detector de ataque valer — ver tick() */
const WARMUP = 20;
let warmup = 0;

function avgBytes(from: number, to: number) {
  if (to <= from) return 0;
  let s = 0;
  for (let i = from; i < to; i++) s += freq[i];
  return s / ((to - from) * 255);
}

function emit() {
  frameListeners.forEach((l) => l(frame));
}

function tick() {
  const an = analyser;
  if (!an) return;

  if (releasing) {
    // cauda: tudo desce até o repouso em vez de congelar no meio do salto
    frame.bass *= 0.86;
    frame.mid *= 0.86;
    frame.treble *= 0.86;
    frame.kick *= 0.8;
    frame.level = frame.bass * 0.5 + frame.mid * 0.35 + frame.treble * 0.15;
    for (let i = 0; i < SPEC_BANDS; i++) frame.spec[i] = frame.spec[i] * 0.86;
    for (let i = 0; i < WAVE_POINTS; i++)
      frame.wave[i] = 128 + (frame.wave[i] - 128) * 0.86;
    emit();
    if (frame.level < 0.004) finishStop();
    return;
  }

  an.getByteFrequencyData(freq);
  an.getByteTimeDomainData(time);

  // faixas semiabertas: nenhum bin conta duas vezes
  frame.bass = env(frame.bass, normalize(nBass, avgBytes(cuts.bass0, cuts.bass1)));
  frame.mid = env(frame.mid, normalize(nMid, avgBytes(cuts.bass1, cuts.mid1)));
  frame.treble = env(frame.treble, normalize(nTre, avgBytes(cuts.mid1, cuts.tre1)));
  frame.level = frame.bass * 0.5 + frame.mid * 0.35 + frame.treble * 0.15;

  // onset: fluxo positivo do grave. Fica em 0 quase sempre — é o que separa
  // "batida" de "volume".
  // Os primeiros quadros não valem: o analisador ainda devolve silêncio e o
  // piso/teto adaptativo ainda não convergiu, então o grave salta de 0 a 1 de
  // uma vez — sem esta janela de aquecimento TODA prévia começaria com um
  // "soco" falso que não existe na música
  if (warmup < WARMUP) {
    warmup++;
    bassSlow = frame.bass; // acompanha sem gerar ataque
    frame.kick = 0;
  } else {
    const flux = Math.max(0, frame.bass - bassSlow);
    bassSlow = bassSlow * 0.8 + frame.bass * 0.2;
    frame.kick = Math.max(
      frame.kick * 0.86,
      flux > 0.05 ? Math.min(1, flux * 4) : 0,
    );
  }

  let peak = 0;
  for (let i = 0; i < SPEC_BANDS; i++) {
    const v = avgBytes(specRanges[i * 2], specRanges[i * 2 + 1]);
    specRaw[i] = v;
    if (v > peak) peak = v;
  }
  specMax += (peak - specMax) * (peak > specMax ? 0.5 : 0.002);
  const gain = 255 / Math.max(0.08, specMax);
  for (let i = 0; i < SPEC_BANDS; i++)
    frame.spec[i] = Math.min(255, specRaw[i] * gain);

  for (let i = 0; i < WAVE_POINTS; i++) frame.wave[i] = time[i * waveStep];

  emit();
}

function startLoop() {
  if (!analyser || !motionOk()) return;
  releasing = false; // retomar durante a cauda: volta a ser ao vivo, sem brigar
  warmup = 0; // toda partida (inclusive troca de faixa) reaquece o detector
  if (ticking) return;
  ticking = true;
  // sem um segundo requestAnimationFrame: o site já tem um só frame loop
  // (SmoothScroll roda o Lenis dentro do gsap.ticker)
  gsap.ticker.add(tick);
}

function stopLoop() {
  if (!ticking) return;
  releasing = true;
}

function finishStop() {
  gsap.ticker.remove(tick);
  ticking = false;
  releasing = false;
  frame.level = frame.bass = frame.mid = frame.treble = frame.kick = 0;
  frame.spec.fill(0);
  frame.wave.fill(128);
  resetNorms();
  emit(); // um último quadro zerado: tudo descansa
}

/* ─────────────────────────── elemento ────────────────────────────── */

function audio(): HTMLAudioElement {
  if (el) return el;
  el = new Audio();
  el.preload = "none";
  el.addEventListener("play", () => {
    set({ playing: true });
    startLoop();
  });
  el.addEventListener("pause", () => {
    set({ playing: false });
    stopLoop();
  });
  el.addEventListener("ended", () => {
    set({ playing: false, progress: 0 });
    stopLoop();
  });
  el.addEventListener("timeupdate", () => {
    const d = el!.duration;
    set({ progress: Number.isFinite(d) && d > 0 ? el!.currentTime / d : 0 });
  });
  // arquivo faltando ou formato sem suporte: volta ao repouso em vez de travar o
  // botão. `armed` não volta atrás — o grafo, uma vez criado, é pra sempre
  el.addEventListener("error", () => {
    set({ src: null, playing: false, progress: 0 });
    stopLoop();
  });
  return el;
}

function play(a: HTMLAudioElement) {
  // resume() sem await: um await entre o clique e o play() perde o gesto no Safari
  if (ctx && ctx.state !== "running") void ctx.resume();
  void a.play().catch(() => set({ playing: false }));
}

function toggle(src: string) {
  const a = audio();
  ensureGraph(a); // só daqui: é um clique de verdade, nunca no prerender

  if (state.src === src) {
    if (a.paused) play(a);
    else a.pause();
    return;
  }

  a.pause();
  a.src = src;
  a.currentTime = 0;
  set({ src, progress: 0 });
  play(a);
}

/* ──────────────────────────── API ────────────────────────────────── */

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** fan-out do único frame loop. Nunca passa por setState: React não re-renderiza
 *  a 60fps. Quem consome escreve direto em ref/canvas/style. */
export function subscribeFrame(fn: (f: Frame) => void) {
  frameListeners.add(fn);
  return () => {
    frameListeners.delete(fn);
  };
}

export function usePreview(src: string) {
  const s = useSyncExternalStore(subscribe, () => state, () => IDLE);

  const mine = s.src === src;
  return {
    playing: mine && s.playing,
    progress: mine ? s.progress : 0,
    /** o áudio é deste card E existe analisador pra alimentar o desenho */
    owns: mine && s.armed,
    toggle: () => toggle(src),
  };
}

/** estado discreto: quem toca agora + se o grafo já existe (sem o progress) */
export function useNowPlaying() {
  return useSyncExternalStore(subscribe, () => now, () => NOW_IDLE);
}
