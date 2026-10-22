// Tunable rewards, clinic flow and Phase 4 optional-event scheduling. Everything a
// designer may want to adjust lives here; nothing else hard-codes rewards or event odds.

import type { CaseStatus } from "../mission/types";

/** Nine hours on the clock take nine minutes of active play; panels still pause time. */
export const TIME = {
  gameMinutesPerRealMinute: 60,
  /**
   * 7:45–8:00 (after clocking in) runs slower, so the meeting and the opening checklist fit:
   * 0.2 × 60 = 12 game minutes a minute, about 75 s of play. Once the whole checklist is done
   * the clock goes at normal speed, so nobody waits around for 8:00.
   */
  morningSpeed: 0.2,
} as const;

export const TRAVEL = {
  autoSpeed: 145,
  visitorSpeed: 105,
  stuckMs: 900,
  maxReplans: 2,
} as const;

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
  /** Finishing the whole morning checklist before opening (coins + XP, never care points). */
  morningPrep: { coins: 20, xp: 10 },
  /** XP needed per level. */
  xpPerLevel: 100,
} as const;

export interface EventConfig {
  /** Chance that an event is offered at each safe trigger point. */
  probability: number;
  /** In-game minutes between activations; no per-shift quota. */
  globalCooldownMinutes: { min: number; max: number };
  retryMinutes: number;
  perEvent: Record<string, { weight: number; cooldownMinutes: number }>;
  repeatDialogue: "cycle" | "random";
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
  globalCooldownMinutes: { min: 45, max: 90 },
  retryMinutes: 10,
  perEvent: {
    "registration-error": { weight: 8, cooldownMinutes: 120 },
    "low-stock": { weight: 8, cooldownMinutes: 120 },
    "pharmacy-check": { weight: 8, cooldownMinutes: 120 },
    "pharmacy-shelf": { weight: 8, cooldownMinutes: 120 },
    "tray-cleaning": { weight: 0, cooldownMinutes: 90 },
    "cockroach-panic": { weight: 1, cooldownMinutes: 180 },
    "printer-panic": { weight: 1, cooldownMinutes: 180 },
    "morning-delivery": { weight: 0, cooldownMinutes: 600 },
  },
  repeatDialogue: "cycle",
  triggerOn: ["ACCEPTED", "INTERVIEWED", "DOCTOR_REVIEWED", "CARE_COMPLETED", "COMPLETED"],
  tutorial: { shifts: [1], at: "INTERVIEWED" },
  expireMs: 4 * 60 * 1000,
  noticeDelayMs: 1500,
};

/**
 * Testing override from the URL: `?events=always` guarantees eligible event draws
 * (still respects cooldowns and safety), `?events=off` suppresses optional events.
 */
export function eventConfig(): EventConfig {
  const mode = new URLSearchParams(window.location.search).get("events");
  if (mode === "always") return { ...EVENT_CONFIG, probability: 1 };
  if (mode === "off") return { ...EVENT_CONFIG, probability: 0, tutorial: { ...EVENT_CONFIG.tutorial, shifts: [] } };
  return EVENT_CONFIG;
}

/** Short, accessible interactions; no time pressure or failure penalty. */
export const COMEDY = {
  printerStopMs: 1800,
  printerSheets: 4,
  paperCollectMs: 280,
  staffResolveMs: 30000,
} as const;

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
  firstArrivalAt: 8 * 60 + 1,
  lastArrivalAt: 16 * 60 + 15,
  /**
   * At the current clock speed, 8–14 game minutes are 8–14 seconds of active play.
   * Keep the existing capacity limits so frequent arrivals do not overwhelm the queue.
   */
  arrivalEvery: { min: 8, max: 14 },
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
  /** Doctor patients already queuing at the door when the clinic opens (day 1: the minimum). */
  morningQueue: { min: 2, max: 3 },
};

/**
 * Testing override: `?clinic=busy` brings the first visitor in at once and makes arrivals
 * frequent (5–10 in-game minutes), to try the queue and caps quickly. Caps are unchanged.
 */
export function clinicConfig(): typeof CLINIC {
  const busy = new URLSearchParams(window.location.search).get("clinic") === "busy";
  return busy ? { ...CLINIC, firstArrivalAt: 8 * 60, arrivalEvery: { min: 5, max: 10 } } : CLINIC;
}
