import { audioEngine } from "./audio";

// Filtered white noise sounded like rain on phone speakers. Use voiced harmonics shaped into
// vowels instead, with irregular syllables, pitch changes and pauses between short phrases.
// There are no words, recordings, speech synthesis calls, or continuous hiss in this crowd.

const VOWELS = [[650, 1100, 2500], [400, 1700, 2600], [350, 900, 2200], [550, 1450, 2400]];

export interface Syllable {
  at: number;
  duration: number;
  pitch: number;
  vowel: number[];
}

/** A phrase has audible articulation and a falling cadence rather than a steady drone. */
export function crowdPhrase(random: () => number = Math.random): Syllable[] {
  const phrase: Syllable[] = [];
  const count = 3 + Math.floor(random() * 4);
  let at = 0;
  for (let i = 0; i < count; i++) {
    const duration = 0.1 + random() * 0.1;
    phrase.push({
      at,
      duration,
      pitch: (0.92 + random() * 0.23) * (i === count - 1 ? 0.88 : 1),
      vowel: VOWELS[Math.floor(random() * VOWELS.length)],
    });
    at += duration + 0.025 + random() * 0.065;
  }
  return phrase;
}

export interface CrowdVoice {
  gain: GainNode;
  speak(): number;
  stop(): void;
}

/** One reusable glottal source and three parallel formants, all routed through Ambience. */
export function crowdVoice(fundamental: number): CrowdVoice | null {
  const e = audioEngine();
  if (!e) return null;
  const { ctx } = e;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(e.buses.ambience);
  const syllables = ctx.createGain();
  syllables.gain.value = 0;
  syllables.connect(gain);
  const source = ctx.createOscillator();
  // A soft, harmonic-rich glottal pulse, without the bright buzz of a plain sawtooth.
  const real = new Float32Array(33);
  const imaginary = new Float32Array(33);
  for (let harmonic = 1; harmonic < imaginary.length; harmonic++) imaginary[harmonic] = 1 / harmonic ** 1.15;
  source.setPeriodicWave(ctx.createPeriodicWave(real, imaginary));
  source.frequency.value = fundamental;
  const bands = VOWELS[0].map((frequency, i) => {
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = [4, 6, 8][i];
    const boost = ctx.createGain();
    boost.gain.value = [7, 4, 2][i];
    source.connect(filter).connect(boost).connect(syllables);
    return { filter, boost };
  });
  source.start();
  return {
    gain,
    speak: () => {
      const now = ctx.currentTime + 0.025;
      const phrase = crowdPhrase();
      syllables.gain.cancelScheduledValues(ctx.currentTime);
      syllables.gain.setValueAtTime(0, ctx.currentTime);
      source.frequency.cancelScheduledValues(ctx.currentTime);
      bands.forEach(({ filter }) => filter.frequency.cancelScheduledValues(ctx.currentTime));
      for (const syllable of phrase) {
        const start = now + syllable.at;
        const end = start + syllable.duration;
        source.frequency.setTargetAtTime(fundamental * syllable.pitch, start, 0.035);
        source.frequency.setTargetAtTime(fundamental * syllable.pitch * 0.94, start + 0.06, 0.06);
        bands.forEach(({ filter }, i) => filter.frequency.setTargetAtTime(syllable.vowel[i], start, 0.025));
        syllables.gain.setValueAtTime(0, start);
        syllables.gain.linearRampToValueAtTime(0.6 + Math.random() * 0.4, start + 0.025);
        syllables.gain.linearRampToValueAtTime(0, end);
      }
      const last = phrase[phrase.length - 1];
      return last.at + last.duration + 0.025;
    },
    stop: () => {
      source.stop();
      source.disconnect();
      bands.forEach(({ filter, boost }) => { filter.disconnect(); boost.disconnect(); });
      syllables.disconnect();
      gain.disconnect();
    },
  };
}
