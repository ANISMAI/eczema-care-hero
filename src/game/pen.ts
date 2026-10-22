import { audioEngine } from "./audio";
import { audioOn } from "./settings";

// A pen glides across paper; retriggering short noise bursts made it sound like typing.
// Keep one soft filtered source per signature pad and smoothly follow actual stroke motion.

export interface PenSound {
  move(speed: number): void;
  stop(): void;
  destroy(): void;
}

export function createPenSound(): PenSound {
  let graph: { ctx: AudioContext; source: AudioBufferSourceNode; band: BiquadFilterNode; low: BiquadFilterNode; gain: GainNode } | null = null;
  let disposed = false;

  const hold = (param: AudioParam, now: number) => {
    if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(now);
    else {
      const value = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(value, now);
    }
  };
  const stop = () => {
    if (!graph) return;
    const now = graph.ctx.currentTime;
    hold(graph.gain.gain, now);
    graph.gain.gain.setTargetAtTime(0, now, 0.008);
  };

  return {
    move: (speed) => {
      if (disposed) return;
      const e = audioEngine();
      if (!e || !audioOn("effects") || !Number.isFinite(speed) || speed < 0.015) { stop(); return; }
      if (!graph) {
        const source = e.ctx.createBufferSource();
        source.buffer = e.noise;
        source.loop = true;
        const band = e.ctx.createBiquadFilter();
        band.type = "bandpass";
        band.Q.value = 0.45;
        const low = e.ctx.createBiquadFilter();
        low.type = "lowpass";
        low.frequency.value = 3600;
        const gain = e.ctx.createGain();
        gain.gain.value = 0;
        source.connect(band).connect(low).connect(gain).connect(e.buses.effects);
        source.onended = () => { source.disconnect(); band.disconnect(); low.disconnect(); gain.disconnect(); };
        source.start();
        graph = { ctx: e.ctx, source, band, low, gain };
      }
      const now = graph.ctx.currentTime;
      const motion = Math.min(1, speed / 2);
      graph.band.frequency.setTargetAtTime(1100 + motion * 800, now, 0.04);
      hold(graph.gain.gain, now);
      graph.gain.gain.setTargetAtTime(0.012 + Math.sqrt(motion) * 0.012, now, 0.02);
      // Pointer events stop when a finger rests: fade naturally without a polling timer.
      graph.gain.gain.setTargetAtTime(0, now + 0.06, 0.025);
    },
    stop,
    destroy: () => {
      if (disposed) return;
      disposed = true;
      stop();
      if (graph) graph.source.stop(graph.ctx.currentTime + 0.04);
    },
  };
}
