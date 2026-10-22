import { audioEngine, type AudioLoop } from "./audio";

// The supplied clinic recording replaces the synthetic voices. Decode once, overlap its tail
// with its head, then loop a single buffer: no MP3 restart gap, timers, or growing source pool.

let recording: AudioBuffer | null = null;
let loading = false;
let retryAt = 0;

/** Equal-power overlap hides the cut; the loop boundary follows adjacent original samples. */
export function crossfadeLoop(channels: readonly Float32Array[], sampleRate: number): Float32Array<ArrayBuffer>[] {
  const frames = channels[0]?.length ?? 0;
  if (frames < 8) return channels.map((samples) => samples.slice());
  let peak = 0;
  for (const samples of channels) for (const value of samples) peak = Math.max(peak, Math.abs(value));
  // Remove only almost-silent padding at the recording's ends, never pauses inside the room.
  const threshold = Math.max(0.00005, peak * 0.005);
  const audible = (frame: number) => channels.some((samples) => Math.abs(samples[frame]) > threshold);
  let start = 0;
  let end = frames;
  while (start < end && !audible(start)) start++;
  while (end > start && !audible(end - 1)) end--;
  if (end - start < 8) return channels.map((samples) => samples.slice());
  const length = end - start;
  const overlap = Math.max(2, Math.min(Math.round(sampleRate * 1.2), Math.floor(length / 4)));
  const middle = length - 2 * overlap;
  const result = channels.map((samples) => {
    const output = new Float32Array(length - overlap);
    output.set(samples.subarray(start + overlap, end - overlap));
    for (let i = 0; i < overlap; i++) {
      const angle = i / (overlap - 1) * Math.PI / 2;
      output[middle + i] = samples[end - overlap + i] * Math.cos(angle)
        + samples[start + i] * Math.sin(angle);
    }
    return output;
  });
  // Correlated material can gain up to 3 dB in an equal-power overlap; retain headroom.
  let mixedPeak = 0;
  for (const samples of result) for (const value of samples) mixedPeak = Math.max(mixedPeak, Math.abs(value));
  if (mixedPeak > 0.98) {
    for (const samples of result) for (let i = 0; i < samples.length; i++) samples[i] *= 0.98 / mixedPeak;
  }
  return result;
}

/** Fetch and decode only after audio is unlocked and the open clinic needs crowd sound. */
export function crowdLoop(): AudioLoop | null {
  const e = audioEngine();
  if (!e) return null;
  if (!recording) {
    if (!loading && Date.now() >= retryAt) {
      loading = true;
      void (async () => {
        const response = await fetch(`${import.meta.env.BASE_URL}sound/busy%20clinic.mp3`);
        if (!response.ok) throw new Error("Clinic ambience unavailable");
        const decoded = await e.ctx.decodeAudioData(await response.arrayBuffer());
        const channels = crossfadeLoop(Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i)), decoded.sampleRate);
        // This recording is very quiet. Set a consistent source level, then let the clinic
        // mix keep it soft relative to dialogue/chimes, with peak headroom for the overlap.
        let energy = 0;
        let peak = 0;
        for (const samples of channels) for (const value of samples) {
          energy += value * value;
          peak = Math.max(peak, Math.abs(value));
        }
        const rms = Math.sqrt(energy / (channels.length * channels[0].length));
        const level = rms > 0 ? Math.min(16, 0.12 / rms, 0.8 / peak) : 1;
        for (const samples of channels) for (let i = 0; i < samples.length; i++) samples[i] *= level;
        const buffer = e.ctx.createBuffer(channels.length, channels[0].length, decoded.sampleRate);
        channels.forEach((samples, i) => buffer.copyToChannel(samples, i));
        recording = buffer;
      })().catch(() => {
        retryAt = Date.now() + 30000; // a temporary connection failure must not spam requests
      }).finally(() => { loading = false; });
    }
    return null;
  }
  const source = e.ctx.createBufferSource();
  source.buffer = recording;
  source.loop = true;
  const gain = e.ctx.createGain();
  gain.gain.value = 0;
  source.connect(gain).connect(e.buses.ambience);
  source.start();
  return { gain, stop: () => { source.stop(); source.disconnect(); gain.disconnect(); } };
}
