import { PHASE5_SCENARIOS, PLAN_RECALL, PLAN_RECALL_FALLBACK } from "./scenarios";
import { personalityOf, type GreetingPattern } from "./personalities";
import type { PatientRecord } from "../../systems/PatientHistory";
import type { CaseTemplate } from "../../mission/types";

// Phase 5 choices for one visit, as pure functions of the patient's record (no DOM, no storage),
// so they are easy to test and the same visit always gets the same lines after a reload.

const BY_ID = new Map(PHASE5_SCENARIOS.map((s) => [s.id, s]));
const S01 = "s01-dry-itchy";
const S02 = "s02-worsening";
const S03 = "s03-follow-up";

/** Which scenario a doctor patient comes with today (weighted, never the same as last time if avoidable). */
export function pickScenario(patientId: string, record: PatientRecord | null, random: () => number = Math.random): string {
  const p = personalityOf(patientId);
  const options: [string, number][] = [];
  if (p?.signature) options.push([p.signature, 5]);
  options.push([S01, p?.signature ? 2 : 4]);
  options.push([S02, p?.archetype === "concerned" ? 3 : 1]);
  // a follow-up only when an earlier visit was actually recorded and asked them to come back
  if (record && record.priorVisitCount > 0 && record.followUpFlag) options.push([S03, 4]);
  const last = record?.lastScenarioIds[0];
  const fresh = options.filter(([id]) => id !== last);
  const pool = fresh.length ? fresh : options;
  let r = random() * pool.reduce((sum, [, w]) => sum + w, 0);
  for (const [id, w] of pool) if ((r -= w) < 0) return id;
  return pool[pool.length - 1][0];
}

/** The next wording index after `last` (cycles, so adjacent visits differ when there are two or more). */
function nextIndex(last: number | undefined, count: number): number {
  return count < 2 ? 0 : ((last ?? -1) + 1) % count;
}

export interface VisitFlavor {
  pattern: GreetingPattern;
  /** Key of the greeting used ("<pattern>.<index>"), saved so the next visit picks another. */
  greetingKey: string | null;
  greeting: string | null;
  introIndex: number;
  /** The scenario's opening line for this visit ({lastPlan} filled in for a follow-up). */
  intro: string;
  /** No comedic reactions (serious scenario). */
  serious: boolean;
  intensity: 1 | 2 | 3;
}

/**
 * Lines for one visit: the continuity greeting (first visit / recognises the doctor or follow-up /
 * casual repeat) and the scenario's opening line. Returning-patient wording is only used when an
 * earlier visit was recorded.
 */
export function visitFlavor(patientId: string, template: CaseTemplate, record: PatientRecord | null, doctor: { id: string | null; name: string }): VisitFlavor {
  const p = personalityOf(patientId);
  const seen = !!record && record.priorVisitCount > 0;
  const pattern: GreetingPattern = !seen
    ? "first"
    : template.id === S03 || (record.lastDoctorId !== null && record.lastDoctorId === doctor.id)
      ? "return"
      : "casual";
  let greeting: string | null = null;
  let greetingKey: string | null = null;
  if (p) {
    const lines = p.greetings[pattern];
    const lastIndex = record?.lastGreeting?.startsWith(`${pattern}.`) ? Number(record.lastGreeting.split(".")[1]) : undefined;
    const i = nextIndex(lastIndex, lines.length);
    greetingKey = `${pattern}.${i}`;
    greeting = lines[i].replaceAll("{doctor}", doctor.name);
  }
  const intros = [template.interview.intro, ...(template.interview.introVariants ?? [])];
  const introIndex = nextIndex(record?.lastIntro[template.id], intros.length);
  const recall = (record?.lastCarePlanSummaryKey && PLAN_RECALL[record.lastCarePlanSummaryKey]) || PLAN_RECALL_FALLBACK;
  return {
    pattern,
    greetingKey,
    greeting,
    introIndex,
    intro: intros[introIndex].replaceAll("{lastPlan}", recall),
    serious: template.mood === "serious",
    intensity: p?.intensity ?? 1,
  };
}

/** Phase 5 scenario by id. */
export function scenario(id: string): CaseTemplate | undefined {
  return BY_ID.get(id);
}

/** Does finishing this visit ask the patient to come back for a check? (referrals go elsewhere) */
export function asksFollowUp(template: CaseTemplate): boolean {
  return template.outcome !== "referral";
}
