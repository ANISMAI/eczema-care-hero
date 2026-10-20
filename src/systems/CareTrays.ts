import Phaser from "phaser";
import TrayCleanPanel from "../ui/events/TrayCleanPanel";
import { TRAYS } from "../data/gameplay";
import type { InteractableDef } from "../data/rooms";

// Care trays in the Care Room (a recurring background job). Each care session uses one clean
// tray. Nurse Amy cleans used trays on her own, one at a time; when she is busy (the
// "tray-cleaning" event is waiting) she stops, and the doctor can clean one at the sink instead.
// The doctor can also clean a tray any time without being asked (no reward). Nothing can get
// stuck: Amy always gets to the trays eventually once she is free. There is no display in the
// world; the Care Room treatment screen shows how many clean trays are left.

const STORAGE_KEY = "eczema-care-hero-trays-v1";
const SINK = "care-sink";

export type TrayState = "clean" | "dirty";

interface Saved {
  trays: TrayState[];
  /** Amy's progress on the tray she is cleaning (ms of play time). */
  amyMs: number;
}

export interface TrayHost {
  scene: Phaser.Scene;
  uiRoot: HTMLElement;
  lock(): void;
  unlock(): void;
  toast(text: string): void;
  findInteractable(id: string): InteractableDef | undefined;
  /** True while Amy is busy (the tray-cleaning event is waiting for the doctor). */
  amyBusy(): boolean;
}

export default class CareTrays {
  private host: TrayHost;
  private trays: TrayState[];
  private amyMs = 0;
  private panel: TrayCleanPanel;
  private saveIn = 0;

  constructor(host: TrayHost) {
    this.host = host;
    const saved = this.load();
    this.trays = saved.trays;
    this.amyMs = saved.amyMs;
    this.panel = new TrayCleanPanel(host.uiRoot);
  }

  private load(): Saved {
    const fresh = { trays: Array<TrayState>(TRAYS.count).fill("clean"), amyMs: 0 };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fresh;
      const s = JSON.parse(raw) as Saved;
      if (!Array.isArray(s.trays) || s.trays.length !== TRAYS.count || !s.trays.every((t) => t === "clean" || t === "dirty")) return fresh;
      return { trays: s.trays, amyMs: Number(s.amyMs) || 0 };
    } catch {
      return fresh;
    }
  }

  private save(): void {
    this.saveIn = 0;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ trays: this.trays, amyMs: this.amyMs } satisfies Saved));
    } catch {
      // storage unavailable: trays reset on reload
    }
  }

  get clean(): number {
    return this.trays.filter((t) => t === "clean").length;
  }

  get dirty(): number {
    return this.trays.length - this.clean;
  }

  /** Seconds until Amy finishes the tray she is cleaning (null if she isn't cleaning). */
  amyEta(): number | null {
    if (!this.dirty || this.host.amyBusy()) return null;
    return Math.ceil((TRAYS.amyCleanMs - this.amyMs) / 1000);
  }

  /** A care session used a tray. Returns false if there was no clean one. */
  use(): boolean {
    const i = this.trays.indexOf("clean");
    if (i < 0) return false;
    this.trays[i] = "dirty";
    this.save();
    return true;
  }

  /** One dirty tray becomes clean (the doctor or Amy cleaned it). */
  cleanOne(): void {
    const i = this.trays.indexOf("dirty");
    if (i < 0) return;
    this.trays[i] = "clean";
    this.amyMs = 0;
    this.save();
  }

  /** New shift: the evening team cleaned everything. */
  reset(): void {
    this.trays = this.trays.map(() => "clean");
    this.amyMs = 0;
    this.save();
  }

  /** Every frame. Amy cleans while she's free and no panel is open. */
  update(deltaMs: number, locked: boolean): void {
    if (locked || !this.dirty || this.host.amyBusy()) return;
    this.amyMs += deltaMs;
    if (this.amyMs >= TRAYS.amyCleanMs) {
      this.cleanOne();
      this.host.toast("✨  Nurse Amy cleaned a care tray");
      return;
    }
    this.saveIn += deltaMs;
    if (this.saveIn > 2000) this.save();
  }

  // ---------- the sink / rack ----------

  actionLabel(item: InteractableDef): string | null {
    if (item.id !== SINK) return null;
    return this.dirty ? "🧽 Clean a tray" : "🧺 Tray rack";
  }

  /** Doctor uses the sink outside of an event: clean a tray (no reward) or see the rack. */
  handle(item: InteractableDef): boolean {
    if (item.id !== SINK) return false;
    this.host.lock();
    if (!this.dirty) {
      this.panelLine();
      return true;
    }
    this.panel.open(Math.floor(Math.random() * 1024), { coins: 0, xp: 0 }, (outcome) => {
      this.host.unlock();
      if (outcome === "resolved") {
        this.cleanOne();
        this.host.toast("✨  Tray cleaned. Thanks, doctor!");
      }
    });
    return true;
  }

  private panelLine(): void {
    this.host.unlock();
    this.host.toast(`🧺  ${this.clean} of ${this.trays.length} trays clean. All good!`);
  }

  /** Line for a care session that can't start: no clean tray. */
  noTrayMessage(): string {
    const eta = this.amyEta();
    return eta !== null
      ? `All the care trays are being cleaned. Nurse Amy will have one ready in about ${eta}s, or you can clean one yourself at the sink.`
      : "All the care trays are used and Nurse Amy is busy. Could you clean one at the sink?";
  }
}
