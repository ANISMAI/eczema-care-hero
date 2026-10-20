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

/**
 * Care trays (Care Room): each care session uses one clean tray. Nurse Amy cleans used trays
 * on her own; sometimes she is busy and asks the doctor (an optional event).
 */
export const TRAYS = {
  count: 3,
  /** Play time Amy needs to clean one tray (ms, paused while panels are open). */
  amyCleanMs: 40 * 1000,
  /** Chance that Amy is busy when a tray gets used, so she asks the doctor for help. */
  amyBusyChance: 0.5,
};

/** Same URL override as events: `?events=always` makes Amy always busy, `off` never. */
export function amyBusyChance(): number {
  const mode = new URLSearchParams(window.location.search).get("events");
  return mode === "always" ? 1 : mode === "off" ? 0 : TRAYS.amyBusyChance;
}

/**
 * Phase 3: the living clinic. Visitors arrive all day (no daily quota), paced and capped so a
 * phone player isn't overwhelmed. Times are in-game minutes unless they say ms (real play time,
 * paused while panels are open).
 */
export const CLINIC = {
  /** First possible arrival and last arrival cut-off (minutes since midnight). */
  firstArrivalAt: 8 * 60 + 2,
  lastArrivalAt: 16 * 60 + 15,
  /**
   * Time between arrivals, picked at random in this range. The brief suggests 30–60, but the
   * clock runs 30 game minutes per real minute, so that meant one visitor every 1–2 real
   * minutes and a clinic that felt empty. 12–25 ≈ one every 25–50 real seconds; the caps
   * below still stop it from piling up.
   */
  arrivalEvery: { min: 12, max: 25 },
  /** Retry delay when the clinic is at capacity. */
  retryWhenFull: 3,
  /** Doctor patients registered or waiting (they each need a waiting seat). */
  maxDoctorWaiting: 3,
  /** Visitors being served by Nurul / Grace at once. */
  maxNpcService: 2,
  /** Chance an arrival needs the doctor (else a routine Nurul / Grace visit). */
  doctorShare: 0.6,
  /** Patience of a waiting doctor patient: picked per visitor in this range (ms). */
  patienceMs: { min: 3 * 60 * 1000, max: 5 * 60 * 1000 },
  /** How long Nurul takes to register someone, and a staff member's reply stays up (ms). */
  registerMs: 2600,
  serviceMs: 3200,
};

/**
 * Testing override: `?clinic=busy` brings the first visitor in at once and makes arrivals
 * frequent (5–10 in-game minutes), to try the queue and caps quickly. Caps are unchanged.
 */
export function clinicConfig(): typeof CLINIC {
  const busy = new URLSearchParams(window.location.search).get("clinic") === "busy";
  return busy ? { ...CLINIC, firstArrivalAt: 8 * 60, arrivalEvery: { min: 5, max: 10 } } : CLINIC;
}
