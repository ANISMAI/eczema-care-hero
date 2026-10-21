import { el } from "./Overlay";
import { soundOn } from "../../game/settings";

/** Clinic PA announcement: a banner across the top with a two-tone chime. */
export default class Announcement {
  private root: HTMLDivElement;
  private text: HTMLSpanElement;
  private timer = 0;
  private audio: AudioContext | null = null;

  constructor(parent: HTMLElement) {
    this.root = el("div", "announcement");
    this.root.setAttribute("role", "status");
    this.root.setAttribute("aria-live", "polite");
    this.text = el("span", "announcement-text");
    this.root.append(el("span", "announcement-icon", "📢"), this.text);
    parent.appendChild(this.root);
  }

  /** `soft`: gentler chime and colour (prayer-time reminders). */
  show(message: string, ms = 4200, soft = false): void {
    this.root.classList.toggle("soft", soft);
    this.text.textContent = message;
    this.root.classList.remove("show");
    void this.root.offsetWidth;
    this.root.classList.add("show");
    this.chime(soft);
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.root.classList.remove("show"), ms);
  }

  /** "Ding-dong" made with the Web Audio API (no sound file needed). */
  private chime(soft = false): void {
    if (!soundOn()) return; // Settings: sound off
    try {
      this.audio ??= new AudioContext();
      const ctx = this.audio;
      const now = ctx.currentTime;
      (soft ? [523.3, 659.3] : [880, 698.5]).forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t0 = now + i * 0.42;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(soft ? 0.08 : 0.18, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.95);
      });
    } catch {
      // audio unavailable: the banner alone is enough
    }
  }
}
