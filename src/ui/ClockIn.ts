import { soundOn } from "../game/settings";
import { t } from "../game/i18n";

// "Start shift" moment: the screen dims and a fingerprint scanner clocks the doctor in (ridges
// draw in under a moving scan line, then turn green with a tick and a soft beep). About 2.6 s;
// a tap skips it. Resolves when the screen has faded back to the clinic.

const RIDGES = [
  // elliptical arcs around the core, inner to outer (a 100 x 120 box)
  "M50 52 a6 8 0 1 1 -0.1 0",
  "M38 58 a12 15 0 0 1 24 -6",
  "M32 66 a18 22 0 0 1 36 -10 l0 12",
  "M27 74 a23 28 0 0 1 46 -8 l0 14",
  "M23 84 a27 34 0 0 1 54 -10 l-1 18",
  "M20 92 a30 40 0 0 1 60 -12 l-2 16",
  "M22 104 c-3 -10 -4 -24 0 -36",
  "M78 102 c3 -8 4 -20 1 -32",
  "M30 34 a30 30 0 0 1 40 0",
  "M24 44 a36 34 0 0 1 52 0",
];

const SCAN_MS = 1500;
const DONE_MS = 900;

function beep(): void {
  if (!soundOn()) return;
  try {
    const ctx = new AudioContext();
    [1046.5, 1568].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    // audio unavailable: the tick is enough
  }
}

export function playClockIn(parent: HTMLElement, doctor: string, time: string): Promise<void> {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.createElement("div");
  root.className = "clockin";
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  const ridges = RIDGES.map((d, i) => `<path d="${d}" style="--i:${i}" />`).join("");
  root.innerHTML = `
    <div class="ci-device">
      <div class="ci-pad">
        <svg class="ci-print" viewBox="0 0 100 120" aria-hidden="true">${ridges}</svg>
        <span class="ci-scan"></span>
        <span class="ci-tick">✓</span>
      </div>
      <span class="ci-light"></span>
    </div>
    <div class="ci-text">
      <strong class="ci-status">${t("clockin.scanning")}</strong>
      <span class="ci-who">${doctor} · ${time}</span>
    </div>
    <span class="ci-skip">${t("clockin.skip")}</span>`;
  parent.append(root);

  return new Promise((resolve) => {
    let finished = false;
    const timers: number[] = [];
    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach((id) => window.clearTimeout(id));
      root.classList.add("out");
      window.setTimeout(() => {
        root.remove();
        resolve();
      }, 450);
    };
    const done = () => {
      root.classList.add("done");
      root.querySelector(".ci-status")!.textContent = t("clockin.done");
      beep();
      timers.push(window.setTimeout(finish, DONE_MS));
    };
    root.addEventListener("click", () => {
      if (!root.classList.contains("done")) done();
      finish();
    });
    requestAnimationFrame(() => root.classList.add("in"));
    timers.push(window.setTimeout(done, reduced ? 200 : SCAN_MS));
  });
}
