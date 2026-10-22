import { audioEngine, audioLoop, play, ramp, type AudioLoop, type Effect } from "../game/audio";
import { crowdVoice, type CrowdVoice } from "../game/crowd";
import type { RoomId } from "../data/rooms";

// Clinic sound is a room, never a soundtrack. Update control values four times a second;
// the audio graph supplies smooth ramps. Voiced phrases leave gaps; no AC or noise bed.

export function murmurVolume(visitors: number, open = true): number {
  if (!open || !Number.isFinite(visitors) || visitors <= 0) return 0;
  return Math.min(0.075, 0.018 * Math.sqrt(visitors));
}

export function roomMix(room: RoomId | null): { crowd: number; arcade: number } {
  switch (room) {
    case "reception": case "waiting": return { crowd: 1, arcade: 0 };
    case "consult": case "care": return { crowd: 0.35, arcade: 0 };
    case "office": case "surau": case "lounge": case "toilet": return { crowd: 0.1, arcade: 0 };
    case "arcade": return { crowd: 0.3, arcade: 1 };
    default: return { crowd: 0.55, arcade: 0 };
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
  voice: typeof crowdVoice;
  ramp: typeof ramp;
  play: typeof play;
}

const SOUNDS: Effect[] = ["chair", "footsteps", "paper", "bell", "giggle", "phone"];

export default class Ambience {
  private audio: AmbienceAudio;
  private motor: AudioLoop | null = null;
  private crowd: { voice: CrowdVoice; nextIn: number }[] = [];
  private elapsed = 0;
  private randomIn = 6 + Math.random() * 8;
  private arcadeIn = 3;

  constructor(audio: AmbienceAudio = { ready: () => !!audioEngine(), loop: audioLoop, voice: crowdVoice, ramp, play }) {
    this.audio = audio;
  }

  update(delta: number, state: SoundscapeState): void {
    if (state.title) { this.stop(); return; }
    if (!this.audio.ready()) return;
    this.elapsed += Math.min(delta, 500);
    if (this.elapsed < 250) return;
    const seconds = this.elapsed / 1000;
    this.elapsed = 0;
    if (!this.motor) {
      this.motor = this.audio.loop("effects", 95);
      if (!this.motor) return;
      for (const pitch of [145, 185, 225]) {
        const voice = this.audio.voice(pitch);
        if (!voice) { this.stop(); return; }
        this.crowd.push({ voice, nextIn: Math.random() * 1.2 });
      }
    }
    const mix = roomMix(state.room);
    const panel = state.panel ? 0.7 : 1;
    const volume = murmurVolume(state.visitors, state.open) * mix.crowd * panel;
    for (const [i, speaker] of this.crowd.entries()) {
      const active = state.open && state.visitors > i;
      this.audio.ramp(speaker.voice.gain.gain, active ? volume : 0, 1.5);
      speaker.nextIn -= seconds;
      if (active && speaker.nextIn <= 0) {
        // Pause between utterances; busier clinics have more overlapping conversations.
        speaker.nextIn = speaker.voice.speak() + 0.6 + Math.random() * 1.4;
      }
    }
    const moving = state.riding && state.speed > 3 && !state.panel;
    this.audio.ramp(this.motor.gain.gain, moving ? 0.018 : 0, 0.2);
    this.audio.ramp(this.motor.oscillator!.frequency, 95 + Math.min(1, state.speed / 330) * 50, 0.3);
    if (!state.open) return;
    this.randomIn -= seconds;
    this.arcadeIn -= seconds;
    if (this.randomIn <= 0) {
      this.randomIn = 6 + Math.random() * 8;
      this.audio.play(SOUNDS[Math.floor(Math.random() * SOUNDS.length)], "ambience", 0.9 * mix.crowd * panel);
    }
    if (this.arcadeIn <= 0) {
      this.arcadeIn = 2.5 + Math.random() * 2;
      if (mix.arcade) this.audio.play("beep", "ambience", 0.12 * panel);
    }
  }

  stop(): void {
    this.motor?.stop();
    this.motor = null;
    this.crowd.forEach(({ voice }) => voice.stop());
    this.crowd = [];
  }
}
