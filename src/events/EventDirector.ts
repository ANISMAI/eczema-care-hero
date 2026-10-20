import Phaser from "phaser";
import EventNotice from "../ui/events/EventNotice";
import { EVENTS, getEvent } from "./registry";
import { eventConfig, type EventConfig } from "../data/gameplay";
import { makeWorldTag } from "../art/tags";
import type { CaseStatus } from "../mission/types";
import type { InteractableDef, RoomId } from "../data/rooms";
import type { ClinicEventDef, EventOutcome, EventPanel } from "./types";

// Simple, transparent scheduler for optional clinic events (revised brief, section 07):
//  - an event can only be offered at a safe trigger point (right after a patient step), never
//    during one, and its notice waits until no panel is open
//  - at most one active event, at most maxEventsPerShift per shift, no same type back to back
//  - Later / Dismiss are always allowed; unanswered events expire quietly with no penalty
// State is saved so an event survives leaving a room, closing panels and a refresh.

const STORAGE_KEY = "eczema-care-hero-events-v1";
const VERSION = 1;
const LIFT = 62;

interface ActiveEvent {
  id: string;
  status: "available" | "accepted";
  seed: number;
  /** Play time left before it expires (ms). */
  remainingMs: number;
}

interface EventState {
  version: number;
  shift: number;
  offered: number;
  lastId: string | null;
  active: ActiveEvent | null;
  log: { id: string; outcome: "resolved" | "dismissed" | "expired"; shift: number }[];
}

function fresh(shift: number): EventState {
  return { version: VERSION, shift, offered: 0, lastId: null, active: null, log: [] };
}

export interface EventHost {
  scene: Phaser.Scene;
  uiRoot: HTMLElement;
  hudRoot: HTMLElement;
  lock(): void;
  unlock(): void;
  toast(text: string): void;
  findInteractable(id: string): InteractableDef | undefined;
  /** Walk the player to an interactable (or the room if it's not found). */
  walkTo(target: InteractableDef | null, room: RoomId): void;
  reward(coins: number, xp: number): void;
  /** An event was completed (for effects in the world, e.g. a tray is clean again). */
  resolved(id: string): void;
}

export default class EventDirector {
  private host: EventHost;
  private config: EventConfig = eventConfig();
  private state: EventState;
  private panels = new Map<string, EventPanel>();
  private notice: EventNotice;
  private tag: Phaser.GameObjects.Container;
  /** Countdown before a newly offered event's notice appears (not saved). */
  private noticeIn = -1;

  constructor(host: EventHost, shift: number) {
    this.host = host;
    this.state = this.load(shift);
    this.notice = new EventNotice(host.hudRoot, {
      onGo: () => this.goToActive(),
      onDismiss: () => this.finish("dismissed"),
    });
    this.tag = makeWorldTag(host.scene, "!", 0xf5a524, 28);
    // a saved event comes back quietly as a chip
    const def = this.activeDef();
    if (def) this.notice.show(def, false);
    this.commit();
  }

  private load(shift: number): EventState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fresh(shift);
      const s = { ...fresh(shift), ...JSON.parse(raw) } as EventState;
      if (s.version !== VERSION || s.shift !== shift) return { ...fresh(shift), log: s.log ?? [] };
      if (s.active && !getEvent(s.active.id)) s.active = null;
      // an event panel open at refresh time goes back to "available"
      if (s.active) s.active.status = "available";
      return s;
    } catch {
      return fresh(shift);
    }
  }

  private commit(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // storage unavailable: events last for this session only
    }
  }

  private activeDef(): ClinicEventDef | null {
    return this.state.active ? getEvent(this.state.active.id) ?? null : null;
  }

  // ---------- scheduling ----------

  /** Safe trigger point: the patient case just reached `status`. May offer one event. */
  trigger(status: CaseStatus, shift: number): void {
    const c = this.config;
    if (!c.triggerOn.includes(status) || this.state.active) return;
    if (this.state.offered >= c.maxEventsPerShift) return;
    const tutorial = c.tutorial.shifts.includes(shift) && this.state.offered === 0 && status === c.tutorial.at;
    if (!tutorial && Math.random() >= c.probability) return;

    // avoid the same type (and, when possible, the same room) twice in a row
    const random = EVENTS.filter((e) => e.random !== false);
    const lastRoom = getEvent(this.state.lastId ?? "")?.room;
    const otherType = random.filter((e) => e.id !== this.state.lastId);
    const otherRoom = otherType.filter((e) => e.room !== lastRoom);
    const pool = otherRoom.length ? otherRoom : otherType.length ? otherType : random;
    this.start(pool[Math.floor(Math.random() * pool.length)]);
  }

  /**
   * Offers a specific event because of game state (not chance), e.g. a used care tray while
   * Amy is busy. Same rules: one active at a time, counts toward the per-shift cap.
   * Returns false if it couldn't be offered.
   */
  offer(id: string): boolean {
    const def = getEvent(id);
    if (!def || this.state.active || this.state.offered >= this.config.maxEventsPerShift) return false;
    this.start(def);
    return true;
  }

  isActive(id: string): boolean {
    return this.state.active?.id === id;
  }

  private start(def: ClinicEventDef): void {
    this.state.active = { id: def.id, status: "available", seed: Math.floor(Math.random() * 1024), remainingMs: this.config.expireMs };
    this.state.offered += 1;
    this.state.lastId = def.id;
    this.noticeIn = this.config.noticeDelayMs;
    this.commit();
  }

  /** Every frame. `locked`: a panel or cut-scene is open (notices wait, expiry pauses). */
  update(deltaMs: number, locked: boolean): void {
    const def = this.activeDef();
    const a = this.state.active;
    if (!def || !a) {
      this.tag.setVisible(false);
      return;
    }
    if (!locked && this.noticeIn >= 0) {
      this.noticeIn -= deltaMs;
      if (this.noticeIn < 0) this.notice.show(def, true);
    }
    if (!locked && a.status === "available" && this.noticeIn < 0) {
      a.remainingMs -= deltaMs;
      if (a.remainingMs <= 0) {
        this.host.toast(def.expired);
        this.finish("expired");
        return;
      }
    }
    const target = this.target();
    this.tag.setVisible(!!target && this.noticeIn < 0);
    if (target) this.tag.setPosition(target.x, target.y - (target.markerLift ?? LIFT) - 2);
  }

  // ---------- queries for the HUD, maps and interaction ----------

  /** Room marked with "!" on the mini map and full map. */
  markerRoom(): RoomId | null {
    return this.state.active && this.noticeIn < 0 ? this.activeDef()?.room ?? null : null;
  }

  target(): InteractableDef | null {
    const def = this.activeDef();
    if (!def) return null;
    for (const id of def.targets) {
      const item = this.host.findInteractable(id);
      if (item) return item;
    }
    return null;
  }

  private isTarget(item: InteractableDef): ClinicEventDef | null {
    const def = this.activeDef();
    return def && this.state.active?.status === "available" && def.targets.includes(item.id) ? def : null;
  }

  actionLabel(item: InteractableDef): string | null {
    return this.isTarget(item)?.actionLabel ?? null;
  }

  /** Opens the event panel if `item` is where the active event happens. */
  handle(item: InteractableDef): boolean {
    const def = this.isTarget(item);
    const a = this.state.active;
    if (!def || !a) return false;
    a.status = "accepted";
    this.noticeIn = -1;
    this.commit();
    this.notice.compact(def);
    let panel = this.panels.get(def.id);
    if (!panel) {
      panel = def.createPanel(this.host.uiRoot);
      this.panels.set(def.id, panel);
    }
    this.host.lock();
    panel.open(a.seed, def.rewards, (outcome) => {
      this.host.unlock();
      this.finish(outcome);
    });
    return true;
  }

  goToActive(): void {
    const def = this.activeDef();
    if (def) this.host.walkTo(this.target(), def.room);
  }

  /** Lifecycle end (or "later": back to available). */
  private finish(outcome: EventOutcome | "expired"): void {
    const def = this.activeDef();
    const a = this.state.active;
    if (!def || !a) return;
    if (outcome === "later") {
      a.status = "available";
      this.notice.show(def, false);
      this.commit();
      return;
    }
    if (outcome === "resolved") {
      this.host.reward(def.rewards.coins, def.rewards.xp);
      this.host.toast(`🎉  +${def.rewards.coins} 🪙  +${def.rewards.xp} XP`);
      this.host.resolved(def.id);
    }
    if (outcome === "dismissed") this.host.toast("👌  No problem, someone else will handle it");
    this.state.log = [...this.state.log, { id: def.id, outcome, shift: this.state.shift }].slice(-20);
    this.state.active = null;
    this.noticeIn = -1;
    this.notice.hide();
    this.tag.setVisible(false);
    this.commit();
  }

  /** Shift over: an unanswered event quietly expires. */
  endShift(): void {
    if (this.state.active) this.finish("expired");
  }

  startShift(shift: number): void {
    this.state = { ...fresh(shift), log: this.state.log };
    this.noticeIn = -1;
    this.notice.hide();
    this.commit();
  }
}
