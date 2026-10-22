// Phase 5 returning patients (brief section 6): a small saved record per patient id.
//
// Transaction boundary (brief section 9): visits finished during today's shift are kept as
// "pending" and only become committed when the shift is completed (summary). Leaving mid-shift
// restarts the day and the pending records are dropped, together with the day's points and
// coins. Choices made today (which scenario, which greeting) look at committed + pending, so a
// patient who comes twice in one day doesn't repeat themselves either.

const STORAGE_KEY = "eczema-care-hero-patient-history-v1";
const VERSION = 1;

export interface PatientRecord {
  patientId: string;
  priorVisitCount: number;
  /** Most recent first, at most 3. */
  lastScenarioIds: string[];
  /** The last visit asked them to come back for a check (follow-up eligible). */
  followUpFlag: boolean;
  lastCarePlanSummaryKey: string | null;
  lastSeenShift: number;
  /** Playable character id of the doctor who saw them last. */
  lastDoctorId: string | null;
  /** Last greeting / opening-line wording used, so the next visit picks another one. */
  lastGreeting: string | null;
  lastIntro: Record<string, number>;
  /** Clothes colour worn last time (the next visit wears the next one). */
  lastOutfit?: number;
}

interface HistoryState {
  version: number;
  committed: Record<string, PatientRecord>;
  pending: Record<string, PatientRecord>;
}

/** What one completed visit adds to a patient's record. */
export interface VisitEntry {
  scenarioId: string;
  planKey: string | null;
  followUp: boolean;
  shift: number;
  doctorId: string | null;
  greeting: string | null;
  introIndex: number;
  outfit?: number;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export default class PatientHistory {
  private state: HistoryState;
  private store: KeyValueStore | null;

  constructor(store: KeyValueStore | null = defaultStore()) {
    this.store = store;
    this.state = this.load();
  }

  private load(): HistoryState {
    try {
      const s = JSON.parse(this.store?.getItem(STORAGE_KEY) ?? "null") as HistoryState | null;
      if (s?.version === VERSION && s.committed && s.pending) return s;
    } catch {
      // unreadable: start with no history
    }
    return { version: VERSION, committed: {}, pending: {} };
  }

  private save(): void {
    try {
      this.store?.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // storage unavailable: history lasts for this session only
    }
  }

  /** The patient's record including today's (uncommitted) visits, or null if never seen. */
  get(patientId: string): PatientRecord | null {
    return this.state.pending[patientId] ?? this.state.committed[patientId] ?? null;
  }

  /** A completed doctor visit (never called for someone who left before being seen). */
  record(patientId: string, v: VisitEntry): void {
    const prev = this.get(patientId);
    this.state.pending[patientId] = {
      patientId,
      priorVisitCount: (prev?.priorVisitCount ?? 0) + 1,
      lastScenarioIds: [v.scenarioId, ...(prev?.lastScenarioIds ?? [])].slice(0, 3),
      followUpFlag: v.followUp,
      lastCarePlanSummaryKey: v.planKey,
      lastSeenShift: v.shift,
      lastDoctorId: v.doctorId,
      lastGreeting: v.greeting,
      lastIntro: { ...(prev?.lastIntro ?? {}), [v.scenarioId]: v.introIndex },
      lastOutfit: v.outfit ?? prev?.lastOutfit,
    };
    this.save();
  }

  /** The shift was completed: today's visits become part of the saved history. */
  commit(): void {
    this.state.committed = { ...this.state.committed, ...this.state.pending };
    this.state.pending = {};
    this.save();
  }

  /** The shift was left unfinished and restarts: today's visits are forgotten. */
  discardPending(): void {
    this.state.pending = {};
    this.save();
  }

  /** Committed records only (for tests and the dev panel). */
  committedOf(patientId: string): PatientRecord | null {
    return this.state.committed[patientId] ?? null;
  }
}
