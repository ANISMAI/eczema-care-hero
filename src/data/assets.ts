// Image assets that replace the built-in vector placeholder art.
// Anything listed here is loaded in BootScene; if a file is missing or fails to load,
// the game falls back to the vector drawing (or leaves that NPC out), so art can be swapped in
// gradually.
//
// Files live in /public, so the URL is the path under public/ (copied as-is into dist/).
// Every sheet is produced from an AI source sheet in art-source/characters/ with
// tools/slice-sprite-sheet.py, which prints frameWidth / frameHeight / contentHeight / padding.

export type CharacterDirection = "down" | "left" | "right" | "up";

/** A grid of equal-size frames, 3 per row, each figure standing on the frame's baseline. */
export interface SheetDef {
  /** Phaser texture key. */
  key: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
  /** Transparent margin below the feet in each frame (px). */
  padding: number;
  /** Height of the tallest figure in the sheet (px) — scaled to displayHeight in game. */
  contentHeight: number;
  /** On-screen height of that tallest figure in world units (a standing doctor is 64). */
  displayHeight: number;
}

/** Walk-cycle sheet: one row per facing direction; each row is stand, step A, step B. */
export interface CharacterSheet extends SheetDef {
  rows: Record<CharacterDirection, number>;
  /** Walk cycle speed (frames per second) at `walkSpeed`; it scales with the actual speed. */
  frameRate: number;
  /** Movement speed (world units / s) the frame rate is tuned for. */
  walkSpeed: number;
}

/** The player's normal walking speed (world units / s). A doctor is 64 units tall. */
export const PLAYER_WALK_SPEED = 115;

const FRAME = { frameHeight: 180, padding: 6, contentHeight: 168 } as const;
const WALKER = {
  ...FRAME,
  displayHeight: 64,
  rows: { down: 0, left: 1, right: 2, up: 3 },
  frameRate: 7,
  walkSpeed: PLAYER_WALK_SPEED,
} as const;

// ---------- Playable characters ----------

export type CharacterId = "doctor-hijab" | "doctor-man";

export interface PlayableCharacter {
  id: CharacterId;
  /** Shown on the character-select screen. */
  label: string;
  sheet: CharacterSheet;
  /** Sitting in prayer (doa) on the surau mat: frame 0 hands raised, frame 1 hands in lap. */
  pray: SheetDef;
}

/**
 * Playable characters, in the order shown on the select screen.
 *   doctor-hijab: doctor-hijab-walk-sheet.webp (blue) -> tools/recolor-fabric.py
 *                 -> doctor-hijab-lavender-walk-sheet.webp -> slicer -> doctor-hijab-walk.webp
 *   doctor-man:   doctor-man-walk-sheet.webp -> slicer -> doctor-man-walk.webp
 */
export const CHARACTERS: PlayableCharacter[] = [
  {
    id: "doctor-hijab",
    label: "Female Doctor",
    sheet: { key: "char-doctor-hijab", url: "assets/characters/doctor-hijab-walk.webp", frameWidth: 110, ...WALKER },
    pray: { key: "pray-doctor-hijab", url: "assets/characters/doctor-hijab-pray.webp", frameWidth: 110, ...FRAME, displayHeight: 50 },
  },
  {
    id: "doctor-man",
    label: "Male Doctor",
    sheet: { key: "char-doctor-man", url: "assets/characters/doctor-man-walk.webp", frameWidth: 112, ...WALKER },
    pray: { key: "pray-doctor-man", url: "assets/characters/doctor-man-pray.webp", frameWidth: 100, ...FRAME, displayHeight: 50 },
  },
];

export function getCharacter(id: string | undefined): PlayableCharacter | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

// ---------- NPC sheets ----------

/** Walking NPCs (same 4 x 3 layout as the doctors). */
export const NPC_WALKER_SHEETS = {
  nurseMan: {
    key: "npc-nurse-man",
    url: "assets/characters/nurse-man-walk.webp",
    frameWidth: 110,
    ...WALKER,
    displayHeight: 62,
  },
  amina: {
    key: "npc-amina-walk",
    url: "assets/characters/amina-walk.webp",
    frameWidth: 108,
    ...WALKER,
    displayHeight: 60,
  },
  nurseWoman: {
    key: "npc-nurse-woman",
    url: "assets/characters/nurse-woman-walk.webp",
    frameWidth: 112,
    ...WALKER,
    displayHeight: 60,
  },
} satisfies Record<string, CharacterSheet>;

/**
 * Stationary NPCs: 3 poses per row (0 = idle, 1 = blink, 2 = action), one character per row.
 * Seated sheets are scaled so a seated adult is ~48 units tall; the child stays smaller because
 * the slicer keeps relative sizes within a sheet.
 */
export const NPC_POSE_SHEETS = {
  receptionist: { key: "npc-receptionist", url: "assets/characters/receptionist.webp", frameWidth: 108, ...FRAME, displayHeight: 62 },
  specialist: { key: "npc-specialist", url: "assets/characters/specialist.webp", frameWidth: 96, ...FRAME, displayHeight: 64 },
  aminaSit: { key: "npc-amina-sit", url: "assets/characters/amina-sit.webp", frameWidth: 96, ...FRAME, displayHeight: 48 },
  pharmacist: { key: "npc-pharmacist", url: "assets/characters/pharmacist.webp", frameWidth: 106, ...FRAME, displayHeight: 62 },
  storekeeper: { key: "npc-storekeeper", url: "assets/characters/storekeeper.webp", frameWidth: 94, ...FRAME, displayHeight: 64 },
  motherSon: { key: "npc-mother-son", url: "assets/characters/patients-mother-son.webp", frameWidth: 94, ...FRAME, displayHeight: 48 },
  teenYouth: { key: "npc-teen-youth", url: "assets/characters/patients-teen-youth.webp", frameWidth: 112, ...FRAME, displayHeight: 48 },
  elderly: { key: "npc-elderly", url: "assets/characters/patients-elderly.webp", frameWidth: 112, ...FRAME, displayHeight: 50 },
} satisfies Record<string, SheetDef>;

/** Every spritesheet BootScene should load. */
export const ALL_SHEETS: SheetDef[] = [
  ...CHARACTERS.flatMap((c) => [c.sheet, c.pray]),
  ...Object.values(NPC_WALKER_SHEETS),
  ...Object.values(NPC_POSE_SHEETS),
];

/** Sheets that get directional walk animations. */
export const WALK_SHEETS: CharacterSheet[] = [...CHARACTERS.map((c) => c.sheet), ...Object.values(NPC_WALKER_SHEETS)];
