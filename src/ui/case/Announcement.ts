import { el } from "./Overlay";
import { play } from "../../game/audio";

/** Clinic PA announcement: a banner across the top with a two-tone chime. */
export default class Announcement {
  private root: HTMLDivElement;
  private text: HTMLSpanElement;
  private timer = 0;

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
    play(soft ? "softChime" : "chime");
  }
}
