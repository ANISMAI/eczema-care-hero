import { REWARDS } from "../data/gameplay";

// Local progression (revised Phase 2 brief, section 08): shift count, XP / level, and three
// separate reward ledgers that never mix:
//   care points   – patient care, the main score (a future fair leaderboard would use these)
//   event rewards – coins + XP from optional clinic events
//   arcade coins  – from the existing mini-games (not wired up yet), never part of care ranking
// Saved to localStorage under its own key. Nothing is sent anywhere.

const STORAGE_KEY = "eczema-care-hero-progress-v1";
const VERSION = 1;

export interface ShiftTally {
  care: number;
  caseXp: number;
  eventCoins: number;
  eventXp: number;
  arcadeCoins: number;
  casesCompleted: number;
  eventsResolved: number;
  /** Phase 3 clinic traffic. */
  doctorArrivals: number;
  doctorLeft: number;
  doctorRebooked: number;
  serviceArrivals: number;
  serviceServed: number;
  /** Each doctor patient helped today, for the end-of-day summary. */
  visits: VisitRecord[];
}

/** One completed doctor visit, as the end-of-day summary lists it. */
export interface VisitRecord {
  name: string;
  portrait: string;
  title: string;
  points: number;
  maxPoints: number;
  takeaway: string;
}

export type VisitStat = "doctorArrivals" | "doctorLeft" | "doctorRebooked" | "serviceArrivals" | "serviceServed";

export interface ProgressState {
  version: number;
  shift: number;
  /** The shift has been closed and its summary is showing (survives a refresh). */
  shiftEnded: boolean;
  xp: number;
  coins: number;
  arcadeCoins: number;
  careTotal: number;
  current: ShiftTally;
}

function emptyTally(): ShiftTally {
  return {
    care: 0,
    caseXp: 0,
    eventCoins: 0,
    eventXp: 0,
    arcadeCoins: 0,
    casesCompleted: 0,
    eventsResolved: 0,
    doctorArrivals: 0,
    doctorLeft: 0,
    doctorRebooked: 0,
    serviceArrivals: 0,
    serviceServed: 0,
    visits: [],
  };
}

function fresh(): ProgressState {
  return { version: VERSION, shift: 1, shiftEnded: false, xp: 0, coins: 0, arcadeCoins: 0, careTotal: 0, current: emptyTally() };
}

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw) as ProgressState;
    if (s?.version !== VERSION || !(s.shift >= 1)) return fresh();
    return { ...fresh(), ...s, current: { ...emptyTally(), ...s.current } };
  } catch {
    return fresh();
  }
}

export type ProgressListener = (p: Readonly<ProgressState>) => void;

export default class Progress {
  private state = load();
  private listeners: ProgressListener[] = [];

  get snapshot(): Readonly<ProgressState> {
    return this.state;
  }

  get shift(): number {
    return this.state.shift;
  }

  get level(): number {
    return 1 + Math.floor(this.state.xp / REWARDS.xpPerLevel);
  }

  onChange(fn: ProgressListener): void {
    this.listeners.push(fn);
    fn(this.state);
  }

  /** Care points from patient care (main score). */
  addCare(points: number): void {
    this.state.careTotal += points;
    this.state.current.care += points;
    this.commit();
  }

  /** A patient case was completed. */
  completeCase(xp: number): void {
    this.state.xp += xp;
    this.state.current.caseXp += xp;
    this.state.current.casesCompleted += 1;
    this.commit();
  }

  /** Bonus from an optional clinic event: coins + XP, never care points. */
  addEventReward(coins: number, xp: number): void {
    this.state.coins += coins;
    this.state.xp += xp;
    this.state.current.eventCoins += coins;
    this.state.current.eventXp += xp;
    this.state.current.eventsResolved += 1;
    this.commit();
  }

  /** For the arcade mini-games once they are connected; kept apart from care ranking. */
  addArcadeCoins(coins: number): void {
    this.state.arcadeCoins += coins;
    this.state.coins += coins;
    this.state.current.arcadeCoins += coins;
    this.commit();
  }

  /** A doctor visit was completed: kept for the end-of-day summary (no extra score). */
  recordVisit(v: VisitRecord): void {
    this.state.current.visits = [...this.state.current.visits, v];
    this.commit();
  }

  /** Clinic traffic counters for the shift summary (no score attached). */
  countVisit(stat: VisitStat): void {
    this.state.current[stat] += 1;
    this.commit();
  }

  /** Closes the current shift; the tally stays readable for the summary. */
  endShift(): void {
    if (this.state.shiftEnded) return;
    this.state.shiftEnded = true;
    this.commit();
  }

  /** Starts the next shift with an empty tally. */
  startNextShift(): void {
    this.state.shift += 1;
    this.state.shiftEnded = false;
    this.state.current = emptyTally();
    this.commit();
  }

  private commit(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // storage unavailable: progress lasts for this session only
    }
    for (const fn of this.listeners) fn(this.state);
  }
}
