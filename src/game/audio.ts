import { audioOn, onAudioSettings, type AudioBus } from "./settings";

// One gesture-unlocked synth serves the whole game. Persistent beds reuse nodes; short sounds
// share a noise buffer, have a voice budget, and disconnect themselves when their envelope ends.

export type Effect = "chime" | "softChime" | "beep" | "trill" | "click" | "good" | "gentle"
  | "coin" | "fanfare" | "pop" | "door" | "whoosh" | "water" | "box" | "signature"
  | "printer" | "scuttle" | "tick" | "chair" | "footsteps" | "paper" | "bell" | "giggle" | "phone";

/** Monotonic milliseconds, injected by callers so throttling also runs in Node tests. */
export class EffectLimiter {
  private last = new Map<string, number>();

  allow(name: string, now: number, gap = 80): boolean {
    if (now - (this.last.get(name) ?? -Infinity) < gap) return false;
    this.last.set(name, now);
    return true;
  }
}

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  buses: Record<AudioBus, GainNode>;
  title: GainNode;
  noise: AudioBuffer;
}

const VOLUMES: Record<AudioBus, number> = { ambience: 0.7, effects: 0.8, music: 0.42 };
const limiter = new EffectLimiter();
let engine: Engine | null = null;
let prepared = false;
let unlocked = false;
let voices = 0;
let effectSerial = 0;
let titleWanted = false;
let titleStep = 0;
let nextNote = 0;
let titleTimer = 0;

function syncSettings(): void {
  if (!engine) return;
  for (const bus of ["ambience", "effects", "music"] as const) {
    ramp(engine.buses[bus].gain, audioOn(bus) ? VOLUMES[bus] : 0, 0.025);
  }
  if (!audioOn("effects") && typeof window !== "undefined") window.speechSynthesis?.cancel();
}

/** Smooth control-rate changes without accumulating automation every animation frame. */
export function ramp(param: AudioParam, value: number, seconds = 0.5): void {
  if (!engine) return;
  const now = engine.ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value, now, Math.max(0.008, seconds / 3));
}

/** Never creates a context outside a real user gesture. Unsupported audio stays silent. */
export function audioEngine(): Engine | null {
  return engine?.ctx.state === "running" && !document.hidden ? engine : null;
}

function unlock(): void {
  if (document.hidden) return;
  try {
    if (!engine) {
      const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) return;
      const ctx = new Audio();
      const master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      const buses = {} as Record<AudioBus, GainNode>;
      for (const bus of ["ambience", "effects", "music"] as const) {
        buses[bus] = ctx.createGain();
        buses[bus].gain.value = audioOn(bus) ? VOLUMES[bus] : 0;
        buses[bus].connect(master);
      }
      const title = ctx.createGain();
      title.gain.value = 0;
      title.connect(buses.music);
      const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      engine = { ctx, master, buses, title, noise };
      syncSettings();
    }
    unlocked = true;
    // A silent sample started inside the gesture also unlocks older iOS Web Audio versions.
    const sample = engine.ctx.createBufferSource();
    sample.buffer = engine.ctx.createBuffer(1, 1, engine.ctx.sampleRate);
    sample.connect(engine.master);
    sample.onended = () => sample.disconnect();
    sample.start();
    void engine.ctx.resume().then(() => {
      if (titleWanted && engine) ramp(engine.title.gain, 1, 1.2);
    }).catch(() => { /* the next gesture retries an interrupted mobile context */ });
  } catch {
    // The visual game remains usable if the device cannot provide audio.
  }
}

export function prepareAudio(): void {
  if (prepared || typeof window === "undefined") return;
  prepared = true;
  const gesture = () => { if (!engine || engine.ctx.state !== "running") unlock(); };
  window.addEventListener("pointerdown", gesture, true);
  window.addEventListener("keydown", gesture, true);
  onAudioSettings(syncSettings);
  document.addEventListener("visibilitychange", () => {
    if (!engine) return;
    engine.master.gain.setValueAtTime(document.hidden ? 0 : 0.8, engine.ctx.currentTime);
    if (document.hidden) {
      window.speechSynthesis?.cancel();
      void engine.ctx.suspend().catch(() => {});
    } else if (unlocked) {
      nextNote = engine.ctx.currentTime + 0.08;
      void engine.ctx.resume().catch(() => {});
    }
  });
  // Capture the path before a panel replaces its buttons; let event-specific sounds win.
  document.addEventListener("click", (event) => {
    const path = event.composedPath();
    const button = path.find((el) => el instanceof HTMLButtonElement) as HTMLButtonElement | undefined;
    if (!button || button.disabled || button.dataset.audio === "own") return;
    if (!path.some((el) => el instanceof HTMLElement && (el.id === "ui-root" || el.classList.contains("title-screen")))) return;
    const before = effectSerial;
    queueMicrotask(() => { if (before === effectSerial) play("click"); });
  }, true);
}

interface Envelope { peak?: number; attack?: number; delay?: number; endFreq?: number; bus?: AudioBus; target?: AudioNode }

function envelope(e: Engine, source: OscillatorNode | AudioBufferSourceNode, duration: number, options: Envelope, filter?: BiquadFilterNode): () => void {
  const gain = e.ctx.createGain();
  const start = e.ctx.currentTime + (options.delay ?? 0);
  const end = start + duration;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(options.peak ?? 0.06, start + Math.min(duration / 3, options.attack ?? 0.012));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  if (filter) source.connect(filter).connect(gain);
  else source.connect(gain);
  gain.connect(options.target ?? e.buses[options.bus ?? "effects"]);
  voices++;
  source.onended = () => {
    voices--;
    source.disconnect();
    filter?.disconnect();
    gain.disconnect();
  };
  source.start(start);
  source.stop(end + 0.02);
  return () => { try { source.stop(); } catch { /* already ended */ } };
}

export function tone(freq: number, duration: number, type: OscillatorType = "sine", options: Envelope = {}): () => void {
  const e = audioEngine();
  if (!e || voices >= 32 || !audioOn(options.bus ?? "effects")) return () => {};
  const osc = e.ctx.createOscillator();
  osc.type = type;
  const start = e.ctx.currentTime + (options.delay ?? 0);
  osc.frequency.setValueAtTime(freq, start);
  if (options.endFreq) osc.frequency.exponentialRampToValueAtTime(options.endFreq, start + duration);
  return envelope(e, osc, duration, options);
}

export function noise(duration: number, filter: { frequency: number; type?: BiquadFilterType; q?: number }, options: Envelope = {}): () => void {
  const e = audioEngine();
  if (!e || voices >= 32 || !audioOn(options.bus ?? "effects")) return () => {};
  const source = e.ctx.createBufferSource();
  source.buffer = e.noise;
  source.loop = true;
  const band = e.ctx.createBiquadFilter();
  band.type = filter.type ?? "bandpass";
  band.frequency.value = filter.frequency;
  band.Q.value = filter.q ?? 1;
  return envelope(e, source, duration, options, band);
}

/** Returns a cancellation handle (the incoming phone stops as soon as it is answered). */
export function play(name: Effect, bus: AudioBus = "effects", level = 1): () => void {
  if (!audioEngine() || !audioOn(bus) || voices > 22 || !limiter.allow(name, performance.now(), name === "signature" ? 130 : 80)) return () => {};
  effectSerial++;
  const stops: (() => void)[] = [];
  const notes = (freqs: number[], duration = 0.18, gap = 0.09, peak = 0.07, type: OscillatorType = "sine") => {
    freqs.forEach((freq, i) => stops.push(tone(freq, duration, type, { bus, peak: peak * level, delay: i * gap })));
  };
  const hiss = (duration: number, frequency: number, peak = 0.08, q = 1) => {
    stops.push(noise(duration, { frequency, q }, { bus, peak: peak * level }));
  };
  switch (name) {
    case "chime": notes([880, 698.5], 0.9, 0.42, 0.18); break;
    case "softChime": notes([523.3, 659.3], 0.9, 0.42, 0.08); break;
    case "beep": notes([1046.5, 1568], 0.25, 0.12, 0.12); break;
    case "trill": notes([940, 1180], 0.28, 0.32, 0.09); break;
    case "click": notes([740], 0.055, 0, 0.035); break;
    case "good": notes([1047, 1319, 1568], 0.18, 0.07, 0.055); break;
    case "gentle": notes([392, 349], 0.16, 0.1, 0.04); break;
    case "coin": notes([1319, 1760, 2093], 0.22, 0.08, 0.065); break;
    case "fanfare": notes([523, 659, 784, 1047], 0.23, 0.1, 0.065, "triangle"); break;
    case "pop": stops.push(tone(660, 0.12, "sine", { bus, peak: 0.07 * level, endFreq: 1100 })); break;
    case "door": notes([1175, 880], 0.27, 0.16, 0.06); break;
    case "whoosh": hiss(0.4, 950, 0.12); break;
    case "water": hiss(0.6, 2400, 0.13, 0.4); break;
    case "box": hiss(0.38, 700, 0.13); notes([160], 0.1, 0, 0.045, "triangle"); break;
    case "signature": hiss(0.075, 2900, 0.045); break;
    case "printer": hiss(0.5, 900, 0.065, 3); notes([130, 155, 130], 0.14, 0.15, 0.025, "triangle"); break;
    case "scuttle": notes([180, 220, 195, 245], 0.05, 0.07, 0.035, "triangle"); hiss(0.24, 1700, 0.035); break;
    case "tick": notes([880, 1175], 0.1, 0.06, 0.05); break;
    case "chair": hiss(0.45, 410, 0.055, 4); break;
    case "footsteps": notes([100, 85, 100], 0.08, 0.16, 0.045, "triangle"); break;
    case "paper": hiss(0.32, 1800, 0.06, 0.5); break;
    case "bell": notes([1568, 2093], 0.4, 0.01, 0.035); break;
    case "giggle": notes([430, 580, 510], 0.11, 0.13, 0.035, "triangle"); break;
    case "phone": notes([940, 1180], 0.19, 0.26, 0.035); break;
  }
  return () => stops.forEach((stop) => stop());
}

// Eight bars at 96 BPM. A short look-ahead clock stays musical without per-frame allocation.
const MELODY = [0, 4, 7, 12, 7, 4, 2, 4, 5, 9, 12, 9, 7, 5, 4, 2,
  4, 7, 11, 14, 12, 7, 4, 7, 2, 5, 9, 12, 11, 7, 2, -1,
  0, 4, 7, 12, 16, 12, 7, 4, 5, 9, 12, 14, 12, 9, 5, 4,
  7, 11, 14, 19, 14, 11, 7, 5, 4, 7, 12, 7, 4, 2, 0, -1];
const CHORDS = [[0, 4, 7], [-7, -3, 0], [-5, -1, 2], [-7, -3, 0], [0, 4, 7], [-7, -3, 0], [-5, -1, 2], [0, 4, 7]];
const hz = (semitone: number) => 261.63 * 2 ** (semitone / 12);

function scheduleTitle(): void {
  const e = audioEngine();
  if (!e || !titleWanted) return;
  if (nextNote < e.ctx.currentTime) nextNote = e.ctx.currentTime + 0.04;
  while (nextNote < e.ctx.currentTime + 0.16) {
    const delay = nextNote - e.ctx.currentTime;
    const note = MELODY[titleStep % MELODY.length];
    if (note >= 0) tone(hz(note + 12), 0.38, "sine", { bus: "music", target: e.title, delay, peak: 0.075 });
    if (titleStep % 8 === 0) {
      for (const n of CHORDS[Math.floor(titleStep / 8) % 8]) {
        tone(hz(n), 0.85, "triangle", { bus: "music", target: e.title, delay, peak: 0.023, attack: 0.035 });
      }
    }
    titleStep++;
    nextNote += 60 / 96 / 2;
  }
}

export function titleMusic(on: boolean): void {
  titleWanted = on;
  if (engine) ramp(engine.title.gain, on ? 1 : 0, on ? 1.2 : 0.45);
  window.clearInterval(titleTimer);
  titleTimer = 0;
  if (on) {
    titleStep = 0;
    nextNote = engine?.ctx.currentTime ?? 0;
    titleTimer = window.setInterval(scheduleTitle, 100);
  }
}

export function shiftJingle(): void {
  titleMusic(false);
  if (!audioEngine() || !audioOn("music")) return;
  [0, 4, 7, 12, 7, 12, 16, 12].forEach((n, i) => {
    tone(hz(n), i === 7 ? 0.75 : 0.3, "triangle", { bus: "music", delay: i * 0.26, peak: 0.065 });
  });
}

/** Persistent loops are owned by the scene, muted by buses, and disposed on scene shutdown. */
export interface AudioLoop {
  gain: GainNode;
  filter?: BiquadFilterNode;
  oscillator?: OscillatorNode;
  stop(): void;
}

export function audioLoop(bus: AudioBus, frequency: number, noisy = false): AudioLoop | null {
  const e = audioEngine();
  if (!e) return null;
  const gain = e.ctx.createGain();
  gain.gain.value = 0;
  gain.connect(e.buses[bus]);
  const source = noisy ? e.ctx.createBufferSource() : e.ctx.createOscillator();
  let filter: BiquadFilterNode | undefined;
  if ("buffer" in source) {
    source.buffer = e.noise;
    source.loop = true;
    source.playbackRate.value = 0.9 + Math.random() * 0.2;
    filter = e.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    source.connect(filter).connect(gain);
  } else {
    source.type = "sine";
    source.frequency.value = frequency;
    source.connect(gain);
  }
  source.start();
  return { gain, filter, oscillator: "frequency" in source ? source : undefined, stop: () => {
    source.stop(); source.disconnect(); filter?.disconnect(); gain.disconnect();
  } };
}
