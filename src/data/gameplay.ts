// Tunable gameplay numbers for Phase 2 (revised brief, sections 07 and 08). Everything a
// designer may want to adjust lives here; nothing else hard-codes rewards or event odds.

import type { CaseStatus } from "../mission/types";

/** Rewards. Care points are the main score; event and arcade rewards are kept separate. */
export const REWARDS = {
  /** Finishing a patient case. */
  caseComplete: { care: 100, xp: 25 },
  /** A care interaction done right first time (no wrong picks). No speed bonuses. */
  correctCare: 20,
  /** The same interaction finished after a wrong pick: still rewarded, just less. */
  retriedCare: 10,
  /** Default reward for an optional clinic event (coins + XP, never care points). */
  event: { coins: 15, xp: 5 },
  /** XP needed per level. */
  xpPerLevel: 100,
} as const;

export interface EventConfig {
  /** Chance that an event is offered at each safe trigger point. */
  probability: number;
  maxEventsPerShift: number;
  /** Patient states after which an event may be offered (never during a step). */
  triggerOn: CaseStatus[];
  /** Shifts that guarantee one tutorial event, at the given trigger point. */
  tutorial: { shifts: number[]; at: CaseStatus };
  /** An unanswered event expires after this much play time (ms, paused while panels are open). */
  expireMs: number;
  /** Small pause before the notice appears, so it doesn't land on top of a closing panel. */
  noticeDelayMs: number;
}

export const EVENT_CONFIG: EventConfig = {
  probability: 0.35,
  maxEventsPerShift: 2,
  triggerOn: ["ACCEPTED", "INTERVIEWED", "DOCTOR_REVIEWED", "CARE_COMPLETED", "COMPLETED"],
  tutorial: { shifts: [1], at: "INTERVIEWED" },
  expireMs: 4 * 60 * 1000,
  noticeDelayMs: 1500,
};

/**
 * Testing override from the URL: `?events=always` offers an event at every trigger point
 * (still at most maxEventsPerShift), `?events=off` never offers one.
 */
export function eventConfig(): EventConfig {
  const mode = new URLSearchParams(window.location.search).get("events");
  if (mode === "always") return { ...EVENT_CONFIG, probability: 1 };
  if (mode === "off") return { ...EVENT_CONFIG, probability: 0, tutorial: { ...EVENT_CONFIG.tutorial, shifts: [] } };
  return EVENT_CONFIG;
}
