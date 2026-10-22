import { CASE_001 } from "./case001";
import { CASE_ITCHY_PATCH } from "./itchyPatch";
import { CASE_FOLLOW_UP } from "./followUp";
import { PHASE5_SCENARIOS } from "../phase5/scenarios";
import type { PatientIdentity } from "../patients";
import type { CaseDefinition, CaseTemplate } from "../../mission/types";

/**
 * Every doctor visit template, by id. Phase 5 visits are picked from PHASE5_SCENARIOS
 * (data/phase5/select.ts); the Phase 2–3 templates stay registered for Day 1's first patient
 * (case001), saved cases and the dev panel.
 */
export const CASE_TEMPLATES: Record<string, CaseTemplate> = Object.fromEntries(
  [CASE_001, CASE_ITCHY_PATCH, CASE_FOLLOW_UP, ...PHASE5_SCENARIOS].map((t) => [t.id, t])
);

/** Replaces `{name}` / `{portrait}` in every string of a value (deep copy). */
function fill<T>(value: T, name: string, portrait: string): T {
  if (typeof value === "string") return value.replaceAll("{name}", name).replaceAll("{portrait}", portrait) as T;
  if (Array.isArray(value)) return value.map((v) => fill(v, name, portrait)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, name, portrait)])) as T;
  }
  return value;
}

/** A template filled in for one patient. */
export function buildCase(templateId: string, patient: PatientIdentity): CaseDefinition {
  const t = CASE_TEMPLATES[templateId];
  return {
    ...fill(t, patient.name, patient.portrait),
    patient: { name: patient.name, fullName: patient.fullName, age: patient.age, portrait: patient.portrait },
  };
}
