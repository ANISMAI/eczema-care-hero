import Phaser from "phaser";
import EventNotice from "../ui/events/EventNotice";
import { EVENTS, getEvent } from "./registry";
import EventSchedule, { type ScheduleState } from "./EventSchedule";
import IncidentArt from "./IncidentArt";
import { eventConfig, type EventConfig } from "../data/gameplay";
import { makeWorldTag } from "../art/tags";
import { t } from "../game/i18n";
import type { CaseStatus } from "../mission/types";
import type { InteractableDef, RoomId } from "../data/rooms";
import type { ClinicEventDef, EventOutcome, EventPanel } from "./types";

const STORAGE_KEY = "eczema-care-hero-events-v1";
const VERSION = 2;
const LIFT = 62;

interface ActiveEvent {
  id: string;
  status: "pending" | "available" | "accepted";
  seed: number;
  remainingMs: number;
}

interface EventState {
  version: number;
  shift: number;
  schedule: ScheduleState;
  active: ActiveEvent | null;
  log: { id: string; outcome: "resolved" | "dismissed" | "expired"; shift: number }[];
}

export interface EventHost {
  scene: Phaser.Scene;
  uiRoot: HTMLElement;
  hudRoot: HTMLElement;
  lock(): void;
  unlock(): void;
  toast(text: string): void;
  findInteractable(id: string): InteractableDef | undefined;
  walkTo(target: InteractableDef | null, room: RoomId): void;
  reward(coins: number, xp: number): void;
  resolved(id: string): void;
  minutes(): number;
  shiftActive(): boolean;
  canNotify(): boolean;
  eligible(id: string): boolean;
}

/** One optional incident at a time, with safe notifications and repeatable game-time scheduling. */
export default class EventDirector {
  private host: EventHost;
  private config: EventConfig = eventConfig();
  private state: EventState;
  private schedule: EventSchedule;
  private panels = new Map<string, EventPanel>();
  private notice: EventNotice;
  private tag: Phaser.GameObjects.Container;
  private art: IncidentArt;
  private noticeIn = -1;
  private saveIn = 0;
  private ended = false;
  private enabled = new URLSearchParams(window.location.search).get("events") !== "off";
  // Reproducible QA: ?events=always&event=cockroach-panic (or printer-panic).
  // Selectors still obey eligibility, cooldowns, and scene safety.
  private forcedId = new URLSearchParams(window.location.search).get("event") ?? undefined;

  constructor(host: EventHost, shift: number) {
    this.host = host;
    this.state = this.load(shift);
    this.schedule = new EventSchedule(this.config, 480, this.state.schedule);
    this.notice = new EventNotice(host.hudRoot, {
      onGo: () => this.goToActive(),
      onDismiss: () => {
        if (this.host.canNotify() && this.state.active?.status === "available") this.finish("dismissed");
      },
    });
    this.tag = makeWorldTag(host.scene, "!", 0xf5a524, 28);
    this.tag.setVisible(false);
    this.art = new IncidentArt(host.scene, host.findInteractable("office-printer"), host.findInteractable("lounge-coffee"));
    if (this.state.active) this.noticeIn = this.config.noticeDelayMs;
    this.commit();
  }

  private fresh(shift: number): EventState {
    return { version: VERSION, shift, schedule: new EventSchedule(this.config).state, active: null, log: [] };
  }

  private load(shift: number): EventState {
    const initial = this.fresh(shift);
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as EventState | null;
      if (!s) return initial;
      if (s.version !== VERSION || s.shift !== shift || !s.schedule ||
          !Number.isFinite(s.schedule.nextAt) || !Number.isFinite(s.schedule.nextCheckAt) ||
          !s.schedule.cooldownUntil || !s.schedule.occurrences || !Array.isArray(s.schedule.pending)) {
        return { ...initial, log: Array.isArray(s.log) ? s.log.slice(-30) : [] };
      }
      if (s.active && (!getEvent(s.active.id) || !Number.isFinite(s.active.remainingMs))) s.active = null;
      if (s.active) s.active.status = "pending";
      if (!this.enabled) s.active = null;
      s.log = Array.isArray(s.log) ? s.log.slice(-30) : [];
      return s;
    } catch {
      return initial;
    }
  }

  private commit(): void {
    this.saveIn = 0;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage unavailable: the shift still works in memory.
    }
  }

  private activeDef(): ClinicEventDef | null {
    const def = this.state.active ? getEvent(this.state.active.id) : undefined;
    if (!def) return null;
    const occurrence = this.schedule.state.occurrences[def.id] ?? 1;
    const repeats = def.repeatNotices;
    if (occurrence <= 1 || !repeats?.length) return def;
    const index = this.config.repeatDialogue === "cycle" ? occurrence - 2 : this.state.active!.seed;
    return { ...def, notice: repeats[index % repeats.length] };
  }

  private eligible(def: ClinicEventDef): boolean {
    return this.host.eligible(def.id) && def.targets.some(id => !!this.host.findInteractable(id));
  }

  /** Patient-step triggers request a future safe opportunity, never open a panel. */
  trigger(status: CaseStatus, shift: number): void {
    if (!this.enabled || this.ended || !this.host.shiftActive() || !this.config.triggerOn.includes(status)) return;
    const first = Object.values(this.schedule.state.occurrences).every(n => n === 0);
    if (first && this.config.tutorial.shifts.includes(shift) && status === this.config.tutorial.at) {
      this.schedule.requestTutorial();
      this.commit();
    } else if (!this.state.active && Math.random() < this.config.probability) {
      this.schedule.requestOpportunity();
      this.commit();
    }
  }

  /** A condition-driven request waits safely and drops out when no longer needed. */
  offer(id: string): boolean {
    const def = getEvent(id);
    if (!this.enabled || this.ended || !this.host.shiftActive() || !def || !this.eligible(def)) return false;
    if (this.isActive(id)) return true;
    this.schedule.request(id);
    this.commit();
    return true;
  }

  isActive(id: string): boolean {
    return this.state.active?.id === id;
  }

  private start(def: ClinicEventDef): void {
    this.schedule.activated(def.id, this.host.minutes());
    this.state.active = { id: def.id, status: "pending", seed: Math.floor(Math.random() * 1024), remainingMs: this.config.expireMs };
    this.noticeIn = this.config.noticeDelayMs;
    this.commit();
  }

  update(deltaMs: number, locked: boolean): void {
    const running = this.enabled && !this.ended && this.host.shiftActive();
    const now = this.host.minutes();
    if (running && now >= 1020) this.endShift();
    const safe = running && !this.ended && !locked && this.host.canNotify() && now < 1020;
    if (safe && !this.state.active) {
      const def = this.schedule.draw(now, EVENTS, d => this.eligible(d), this.forcedId);
      if (def) this.start(def);
    }
    const a = this.state.active;
    const def = this.activeDef();
    if (a && def && !this.eligible(def)) {
      this.finish("expired");
      this.art.update(deltaMs, null, locked);
      return;
    }
    if (a && def && safe && a.status === "pending") {
      this.noticeIn -= deltaMs;
      if (this.noticeIn <= 0) {
        this.noticeIn = -1;
        a.status = "available";
        this.notice.show(def, true);
        this.commit();
      }
    }
    if (a && def && running && !locked && a.status === "available") {
      a.remainingMs -= deltaMs;
      if (a.remainingMs <= 0) {
        this.finish("expired");
      }
    }
    const target = this.target();
    const visible = !!this.state.active && this.state.active.status !== "pending";
    this.tag.setVisible(visible && !!target && !locked);
    if (target) this.tag.setPosition(target.x, target.y - (target.markerLift ?? LIFT) - 2);
    this.art.update(deltaMs, visible ? this.state.active?.id ?? null : null, locked);
    if (running && !locked) {
      this.saveIn += deltaMs;
      if (this.saveIn >= 2000) this.commit();
    }
  }

  markerRoom(): RoomId | null {
    return this.state.active && this.state.active.status !== "pending" ? this.activeDef()?.room ?? null : null;
  }

  target(): InteractableDef | null {
    const def = this.activeDef();
    if (!def) return null;
    for (const id of def.targets) {
      const target = this.host.findInteractable(id);
      if (target) return target;
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

  /** Dev: open an event's panel right away (skips the schedule and the usual checks). */
  devOpen(id: string): boolean {
    const def = getEvent(id);
    if (!def) return false;
    const a = { id, status: "accepted" as const, seed: Math.floor(Math.random() * 1024), remainingMs: this.config.expireMs };
    this.state.active = a;
    this.notice.hide();
    let panel = this.panels.get(def.id);
    if (!panel) {
      panel = def.createPanel(this.host.uiRoot);
      this.panels.set(def.id, panel);
    }
    this.host.lock();
    panel.open(a.seed, def.rewards, (outcome) => {
      this.host.unlock();
      if (this.state.active === a) this.finish(outcome);
    }, this.schedule.state.occurrences[def.id]);
    return true;
  }

  handle(item: InteractableDef): boolean {
    const def = this.isTarget(item);
    const a = this.state.active;
    if (!def || !a || !this.host.shiftActive() || !this.host.canNotify()) return false;
    a.status = "accepted";
    this.commit();
    this.notice.hide();
    let panel = this.panels.get(def.id);
    if (!panel) {
      panel = def.createPanel(this.host.uiRoot);
      this.panels.set(def.id, panel);
    }
    this.host.lock();
    panel.open(a.seed, def.rewards, outcome => {
      if (this.state.active !== a) return;
      this.host.unlock();
      if (!this.host.shiftActive() || this.host.minutes() >= 1020) this.finish("expired");
      else this.finish(outcome);
    }, this.schedule.state.occurrences[def.id]);
    return true;
  }

  goToActive(): void {
    const def = this.activeDef();
    if (def && this.state.active?.status === "available" && this.host.canNotify()) this.host.walkTo(this.target(), def.room);
  }

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
    // Invalidate callbacks before closing a panel: lifecycle cancellation cannot award.
    this.state.active = null;
    const panel = this.panels.get(a.id);
    if (panel?.isOpen) {
      panel.close();
      this.host.unlock();
    }
    if (outcome === "resolved") {
      this.host.reward(def.rewards.coins, def.rewards.xp);
      this.host.toast(`🎉  +${def.rewards.coins} 🪙  +${def.rewards.xp} XP`);
      this.host.resolved(def.id);
    }
    if (outcome === "dismissed") this.host.toast(t("event.staffHandles"));
    if (outcome === "expired" && !this.ended) this.host.toast(def.expired);
    this.state.log = [...this.state.log, { id: def.id, outcome, shift: this.state.shift }].slice(-30);
    this.noticeIn = -1;
    this.notice.hide();
    this.tag.setVisible(false);
    this.art.update(0, null, true);
    this.commit();
  }

  endShift(): void {
    this.ended = true;
    this.schedule.clearPending();
    if (this.state.active) this.finish("expired");
    this.notice.hide();
    this.tag.setVisible(false);
    this.art.update(0, null, true);
    this.commit();
  }

  startShift(shift: number): void {
    this.endShift();
    this.state = { ...this.fresh(shift), log: this.state.log };
    this.schedule = new EventSchedule(this.config, 480, this.state.schedule);
    this.ended = false;
    this.noticeIn = -1;
    this.commit();
  }
}
