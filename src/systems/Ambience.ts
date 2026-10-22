import { audioEngine, audioLoop, play, ramp, type AudioLoop, type Effect } from "../game/audio";
import type { RoomId } from "../data/rooms";

// Clinic sound is a room, never a soundtrack. Update control values four times a second;
// the audio graph supplies smooth ramps and keeps the same noise/hum nodes while playing.

export function murmurVolume(visitors: number, open = true): number {
  if (!open || !Number.isFinite(visitors) || visitors <= 0) return 0;
  return Math.min(0.075, 0.018 * Math.sqrt(visitors));
}

export function roomMix(room: RoomId | null): { crowd: number; room: number; arcade: number } {
  switch (room) {
    case "reception": case "waiting": return { crowd: 1, room: 1, arcade: 0 };
    case "consult": case "care": return { crowd: 0.35, room: 0.8, arcade: 0 };
    case "office": case "surau": case "lounge": case "toilet": return { crowd: 0.1, room: 0.65, arcade: 0 };
    case "arcade": return { crowd: 0.3, room: 0.8, arcade: 1 };
    default: return { crowd: 0.55, room: 0.85, arcade: 0 };
  }
}

interface SoundscapeState {
  title: boolean;
  open: boolean;
  visitors: number;
  room: RoomId | null;
  panel: boolean;
  riding: boolean;
  speed: number;
}

/** A narrow audio boundary also lets tests exercise transitions without a browser. */
export interface AmbienceAudio {
  ready(): boolean;
  loop: typeof audioLoop;
  ramp: typeof ramp;
  play: typeof play;
}

const SOUNDS: Effect[] = ["chair", "footsteps", "paper", "bell", "giggle", "phone"];

export default class Ambience {
  private audio: AmbienceAudio;
  private loops: AudioLoop[] = [];
  private elapsed = 0;
  private randomIn = 6 + Math.random() * 14;
  private movementIn = 0;
  private crowdKey = "";
  private arcadeIn = 3;

  constructor(audio: AmbienceAudio = { ready: () => !!audioEngine(), loop: audioLoop, ramp, play }) {
    this.audio = audio;
  }

  update(delta: number, state: SoundscapeState): void {
    if (state.title) { this.stop(); return; }
    if (!this.audio.ready()) return;
    this.elapsed += Math.min(delta, 500);
    if (this.elapsed < 250) return;
    const seconds = this.elapsed / 1000;
    this.elapsed = 0;
    if (!this.loops.length) {
      // Air, AC hum, three speech-like bands, and the hoverboard motor.
      const defs: ["ambience" | "effects", number, boolean][] = [
        ["ambience", 3200, true], ["ambience", 60, false],
        ["ambience", 340, true], ["ambience", 730, true], ["ambience", 1250, true],
        ["effects", 95, false],
      ];
      for (const [bus, frequency, noisy] of defs) {
        const loop = this.audio.loop(bus, frequency, noisy);
        if (!loop) { this.stop(); return; }
        this.loops.push(loop);
      }
    }
    const mix = roomMix(state.room);
    const panel = state.panel ? 0.7 : 1;
    // Before opening, only a near-silent AC bed; no crowd or random room noises.
    const air = (state.open ? 0.009 : 0.0012) * mix.room * panel;
    this.audio.ramp(this.loops[0].gain.gain, air, 1.5);
    this.audio.ramp(this.loops[1].gain.gain, air * 0.45, 1.5);
    this.movementIn -= seconds;
    const crowdKey = `${state.open}:${state.visitors}:${state.room}:${state.panel}`;
    if (this.movementIn <= 0 || this.crowdKey !== crowdKey) {
      this.crowdKey = crowdKey;
      this.movementIn = 1.5;
      const volume = murmurVolume(state.visitors, state.open) * mix.crowd * panel;
      for (let i = 2; i < 5; i++) {
        this.audio.ramp(this.loops[i].gain.gain, volume * (0.55 + Math.random() * 0.45), 1.5);
        this.audio.ramp(this.loops[i].filter!.frequency, [340, 730, 1250][i - 2] * (0.8 + Math.random() * 0.4), 1.5);
      }
    }
    const moving = state.riding && state.speed > 3 && !state.panel;
    this.audio.ramp(this.loops[5].gain.gain, moving ? 0.018 : 0, 0.2);
    this.audio.ramp(this.loops[5].oscillator!.frequency, 95 + Math.min(1, state.speed / 330) * 50, 0.3);
    if (!state.open) return;
    this.randomIn -= seconds;
    this.arcadeIn -= seconds;
    if (this.randomIn <= 0) {
      this.randomIn = 6 + Math.random() * 14;
      this.audio.play(SOUNDS[Math.floor(Math.random() * SOUNDS.length)], "ambience", 0.45 * mix.crowd * panel);
    }
    if (this.arcadeIn <= 0) {
      this.arcadeIn = 2.5 + Math.random() * 2;
      if (mix.arcade) this.audio.play("beep", "ambience", 0.12 * panel);
    }
  }

  stop(): void {
    this.loops.forEach((loop) => loop.stop());
    this.loops = [];
    this.movementIn = 0;
    this.crowdKey = "";
  }
}
