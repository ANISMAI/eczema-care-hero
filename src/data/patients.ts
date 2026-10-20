import { NPC_POSE_SHEETS, NPC_WALKER_SHEETS, type CharacterSheet, type SheetDef } from "./assets";

// Phase 3: eight reusable patient identities. Who a person is (here) is kept separate from why
// they come (data/visits.ts), so the same person can come for a consultation one day and to
// collect an item another day. One identity is never in the clinic twice at the same time.
//
// Art: sheets sliced from art-source/characters/patient-<id>-*-sheet.webp with
// tools/slice-sprite-sheet.mjs, portraits made with tools/make-portrait.mjs. A person without
// finished art borrows Amina's sprites with a colour tint, an emoji portrait and a name tag
// (placeholder). To swap in real art: add the sliced sheets to data/assets.ts, point `walk` /
// `sit` at them, set the portrait, and remove `tint`.

export interface PatientIdentity {
  id: string;
  name: string;
  fullName: string;
  age: number;
  /** Portrait image URL, or an emoji placeholder. */
  portrait: string;
  walk: CharacterSheet;
  sit: SheetDef;
  /** Placeholder colour tint over borrowed sprites (remove once real art exists). */
  tint?: number;
}

const W = NPC_WALKER_SHEETS;
const P = NPC_POSE_SHEETS;

export const PATIENTS: PatientIdentity[] = [
  { id: "amina", name: "Amina", fullName: "Amina binti Yusof", age: 30, portrait: "assets/portraits/amina.webp", walk: W.amina, sit: P.aminaSit },
  { id: "daniel", name: "Daniel", fullName: "Daniel Tan", age: 28, portrait: "assets/portraits/daniel.webp", walk: W.daniel, sit: P.danielSit },
  { id: "siti", name: "Siti", fullName: "Siti Mariam binti Ahmad", age: 14, portrait: "assets/portraits/siti.webp", walk: W.siti, sit: P.sitiSit },
  { id: "sarah", name: "Sarah", fullName: "Sarah Devi", age: 40, portrait: "assets/portraits/sarah.webp", walk: W.sarah, sit: P.sarahSit },
  { id: "wong", name: "Uncle Wong", fullName: "Wong Kah Seng", age: 68, portrait: "assets/portraits/wong.webp", walk: W.wong, sit: P.wongSit },
  { id: "farid", name: "Farid", fullName: "Farid bin Hassan", age: 35, portrait: "assets/portraits/farid.webp", walk: W.farid, sit: P.faridSit },
  { id: "rohana", name: "Mak Cik Rohana", fullName: "Rohana binti Ismail", age: 60, portrait: "assets/portraits/rohana.webp", walk: W.rohana, sit: P.rohanaSit },
  { id: "suresh", name: "Suresh", fullName: "Suresh Kumar", age: 45, portrait: "assets/portraits/suresh.webp", walk: W.suresh, sit: P.sureshSit },
];

export function getPatient(id: string): PatientIdentity | undefined {
  return PATIENTS.find((p) => p.id === id);
}
