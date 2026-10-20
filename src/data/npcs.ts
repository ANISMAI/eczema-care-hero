// Clinic NPCs: who they are, where they stand or sit, how they behave and what they say.
// Positions are given relative to a room's top-left corner (see `at`), like furniture in
// rooms.ts. Dialogue is friendly and non-clinical (Phase 1 content rules).

import { NPC_POSE_SHEETS, NPC_WALKER_SHEETS, type CharacterSheet, type SheetDef } from "./assets";
import { HALLWAY, getRoomById, type InteractableDef, type Point, type RoomId } from "./rooms";

/**
 * idle    – blinks now and then
 * fidget  – blinks, and now and then plays its action pose (phone, fan, newspaper...)
 * greeter – blinks, and waves (action pose) when the player comes close
 */
export type PoseBehavior = "idle" | "fidget" | "greeter";

export interface PoseNpcDef {
  id: string;
  sheet: SheetDef;
  /** Row of the sheet holding this character (0 = first). */
  row: number;
  /** Where the feet / bottom of the figure touch the floor. Depth sorts from here. */
  feet: Point;
  behavior: PoseBehavior;
  /** Solid box around the feet so the player can't walk through (standing NPCs only). */
  solid?: { w: number; h: number };
  /** Spoken lines; omit for NPCs whose interaction lives on furniture (e.g. reception desk). */
  talk?: InteractableDef;
  /** Seated vector placeholder to draw if the sheet failed to load. */
  fallbackVariant?: number;
}

export interface WalkerNpcDef {
  id: string;
  sheet: CharacterSheet;
  /** Points walked back and forth (ping-pong), in world coordinates. */
  path: Point[];
  speed: number;
  /** Pause at each end of the path (ms). */
  pause: number;
  /** Mutable: x/y follow the walker every frame. */
  talk: InteractableDef;
}

function at(room: RoomId, dx: number, dy: number): Point {
  const b = getRoomById(room).bounds;
  return { x: b.x + dx, y: b.y + dy };
}

function person(id: string, name: string, icon: string, line: string, pos: Point, lift = 52): InteractableDef {
  return {
    id,
    kind: "npc",
    label: name,
    icon,
    x: pos.x,
    y: pos.y,
    radius: 44,
    markerLift: lift,
    markerOnlyWhenNear: true,
    dialogTitle: name,
    dialogText: `"${line}"`,
  };
}

/** A seated visitor on the waiting-room chair whose footprint centre is (dx, dy). */
function seated(
  id: string,
  sheet: SheetDef,
  row: number,
  dx: number,
  dy: number,
  front: number,
  name: string,
  icon: string,
  line: string,
  fallbackVariant: number
): PoseNpcDef {
  const seat = at("waiting", dx, dy);
  return {
    id,
    sheet,
    row,
    feet: { x: seat.x, y: seat.y + front },
    behavior: "fidget",
    talk: person(id, name, icon, line, seat),
    fallbackVariant,
  };
}

const S = NPC_POSE_SHEETS;
const CHAIR = 12; // feet land just in front of a chair's footprint

export const POSE_NPCS: PoseNpcDef[] = [
  {
    id: "receptionist",
    sheet: S.receptionist,
    row: 0,
    // behind the left end of the counter; the counter itself is drawn in front of her
    feet: at("reception", 85, 98),
    behavior: "greeter",
  },
  {
    id: "specialist",
    sheet: S.specialist,
    row: 0,
    // beside the consultation desk
    feet: at("consult", 236, 160),
    behavior: "fidget",
    solid: { w: 28, h: 14 },
    talk: person(
      "specialist",
      "Dr. Lim",
      "🩺",
      "Hello! I'm Dr. Lim, the clinic's skin specialist. Bring me your patients' findings any time.",
      at("consult", 236, 150),
      78
    ),
  },
  {
    id: "pharmacist",
    sheet: S.pharmacist,
    row: 0,
    // behind the pharmacy counter, seen through its clear screen
    feet: at("pharmacy", 190, 122),
    behavior: "greeter",
  },
  {
    id: "storekeeper",
    sheet: S.storekeeper,
    row: 0,
    feet: at("storage", 150, 150),
    behavior: "fidget",
    solid: { w: 28, h: 14 },
    talk: person(
      "storekeeper",
      "Encik Ravi",
      "📦",
      "Every shelf is stocked and labelled. I'll give you a shout if we run low!",
      at("storage", 150, 140),
      78
    ),
  },
  seated("visitor-mother", S.motherSon, 0, 120, 120, CHAIR, "Puan Aisyah", "👩", "We came a little early today. These seats are so comfy!", 0),
  seated("visitor-son", S.motherSon, 1, 156, 120, CHAIR, "Adam", "👦", "Can I play in the Arcade Room later? Pleeease?", 1),
  seated("visitor-teen", S.teenYouth, 0, 228, 120, CHAIR, "Mei Ling", "🎧", "Oh, hi doctor! I'm just catching up with my friends.", 2),
  seated("visitor-youth", S.teenYouth, 1, 264, 120, CHAIR, "Arjun", "🎵", "Sorry, I had my music on! Nice and calm in here.", 1),
  seated("visitor-paati", S.elderly, 0, 228, 324, CHAIR, "Paati Lakshmi", "👵", "Such a peaceful place. You young doctors work so hard!", 0),
  seated("visitor-tokwan", S.elderly, 1, 264, 324, CHAIR, "Tok Wan Ismail", "👴", "I always come early so I can read the newspaper here.", 2),
];

const hallX = HALLWAY.x + HALLWAY.width / 2 + 18;

export const WALKER_NPCS: WalkerNpcDef[] = [
  {
    id: "nurse-jason",
    sheet: NPC_WALKER_SHEETS.nurseMan,
    path: [
      { x: hallX, y: HALLWAY.y + 170 },
      { x: hallX, y: HALLWAY.y + HALLWAY.height - 110 },
    ],
    speed: 62,
    pause: 1800,
    talk: person("nurse-jason", "Nurse Jason", "🩺", "Busy day today! Let me know if you need a hand.", { x: 0, y: 0 }, 72),
  },
  {
    id: "nurse-amy",
    sheet: NPC_WALKER_SHEETS.nurseWoman,
    // keeps clear of the spot by the bed where case patients stand
    path: [at("care", 255, 150), at("care", 255, 280), at("care", 95, 280)],
    speed: 55,
    pause: 2200,
    talk: person("nurse-amy", "Nurse Amy", "💜", "The care room is tidy and ready for the day.", { x: 0, y: 0 }, 70),
  },
];

/** Every NPC conversation, for the interaction system. */
export const NPC_INTERACTABLES: InteractableDef[] = [
  ...POSE_NPCS.flatMap((n) => (n.talk ? [n.talk] : [])),
  ...WALKER_NPCS.map((n) => n.talk),
];
