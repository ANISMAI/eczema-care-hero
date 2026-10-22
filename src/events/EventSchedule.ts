import type { EventConfig } from "../data/gameplay";
import type { ClinicEventDef } from "./types";

type Candidate = Pick<ClinicEventDef, "id" | "room" | "random" | "category">;

export interface ScheduleState {
  nextAt: number;
  nextCheckAt: number;
  cooldownUntil: Record<string, number>;
  occurrences: Record<string, number>;
  lastId: string | null;
  pending: string[];
  tutorialPending: boolean;
  opportunityPending: boolean;
}

/** Scheduling only: game minutes, bounded requests, no DOM or patient-state mutation. */
export default class EventSchedule {
  readonly state: ScheduleState;
  private config: EventConfig;
  private random: () => number;

  constructor(config: EventConfig, startAt = 480, saved?: ScheduleState, random = Math.random) {
    this.config = config;
    this.random = random;
    this.state = saved ?? {
      nextAt: startAt + this.cooldown(), nextCheckAt: startAt,
      cooldownUntil: {}, occurrences: {}, lastId: null, pending: [], tutorialPending: false, opportunityPending: false,
    };
  }

  private cooldown(): number {
    const { min, max } = this.config.globalCooldownMinutes;
    return min + this.random() * (max - min);
  }

  request(id: string): void {
    if (!this.state.pending.includes(id)) this.state.pending.push(id);
  }

  requestTutorial(): void {
    this.state.tutorialPending = true;
  }

  requestOpportunity(): void {
    this.state.opportunityPending = true;
  }

  /** Call only when the scene is safe and there is no active incident. */
  draw<T extends Candidate>(now: number, definitions: T[], eligible: (def: T) => boolean, forcedId?: string): T | null {
    const s = this.state;
    // A dirty-tray request disappears once Amy has cleaned the tray herself.
    s.pending = s.pending.filter(id => definitions.some(d => d.id === id && eligible(d)));
    if (now < s.nextAt || now < s.nextCheckAt) return null;
    s.nextCheckAt = now + this.config.retryMinutes;
    const ready = definitions.filter(d => eligible(d) && now >= (s.cooldownUntil[d.id] ?? 0));
    const requested = ready.find(d => s.pending.includes(d.id));
    if (requested && (requested.id !== s.lastId || !ready.some(d => d.id !== s.lastId && d.random !== false))) return requested;
    if (!s.tutorialPending && !s.opportunityPending && this.random() >= this.config.probability) return null;
    let pool = ready.filter(d => d.random !== false && (this.config.perEvent[d.id]?.weight ?? 0) > 0);
    if (forcedId) return pool.find(d => d.id === forcedId) ?? null;
    // The existing tutorial may guarantee routine help, never a comedy incident.
    if (s.tutorialPending) pool = pool.filter(d => d.category !== "comedy");
    const otherType = pool.filter(d => d.id !== s.lastId);
    if (otherType.length) pool = otherType;
    const lastRoom = definitions.find(d => d.id === s.lastId)?.room;
    const otherRoom = pool.filter(d => d.room !== lastRoom);
    if (otherRoom.length) pool = otherRoom;
    const total = pool.reduce((sum, d) => sum + this.config.perEvent[d.id].weight, 0);
    let pick = this.random() * total;
    return pool.find(d => (pick -= this.config.perEvent[d.id].weight) < 0) ?? pool.at(-1) ?? null;
  }

  activated(id: string, now: number): void {
    const s = this.state;
    s.nextAt = now + this.cooldown();
    s.nextCheckAt = s.nextAt;
    s.cooldownUntil[id] = now + (this.config.perEvent[id]?.cooldownMinutes ?? 120);
    s.occurrences[id] = (s.occurrences[id] ?? 0) + 1;
    s.lastId = id;
    s.pending = s.pending.filter(p => p !== id);
    s.tutorialPending = false;
    s.opportunityPending = false;
  }

  /** Request an event and let it be drawn at once (skips the global cooldown this time). */
  requestNow(id: string, now: number): void {
    this.request(id);
    this.state.nextAt = Math.min(this.state.nextAt, now);
    this.state.nextCheckAt = Math.min(this.state.nextCheckAt, now);
  }

  clearPending(): void {
    this.state.pending = [];
    this.state.tutorialPending = false;
    this.state.opportunityPending = false;
  }
}
