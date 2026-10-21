// Room metadata: single typed list driving layout, walls, furniture, mini-map, full map and
// interactions. Keep this as the one source of truth for clinic geometry (per brief section 08).
//
// Layout (portrait, fits a phone screen; the main entrance is at the bottom of the hallway):
//
//   [ Staff Office ]  hall  [ Storage      ]   <- staff area at the back
//   [ Staff Lounge ]  hall  [ Arcade Room  ]
//   [ Care Room    ]  hall  [ Toilet  (1/2)]
//                           [ Surau   (1/2)]
//   [ Consultation ]  hall  [ Pharmacy     ]   <- see the doctor, then collect products
//   [ Reception    ]  hall  [ Waiting Area ]   <- first rooms visitors reach
//                  entrance
//
// Every room opens onto the central hallway through a door on its hallway-facing wall.
// Toilet and Surau are half-height rooms sharing one slot.

import { FURNITURE, type FurnitureKind } from "./furniture";
import { roomName } from "../game/i18n";

export type RoomId =
  | "reception"
  | "waiting"
  | "care"
  | "storage"
  | "arcade"
  | "office"
  | "lounge"
  | "consult"
  | "pharmacy"
  | "toilet"
  | "surau";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export type InteractableKind = "npc" | "object";

export interface InteractableDef {
  id: string;
  kind: InteractableKind;
  label: string;
  icon: string;
  x: number;
  y: number;
  /**
   * Optional size of the object (centred on x/y). When set, `radius` is measured from the
   * object's edge rather than its centre, so long furniture can be used from any side.
   */
  area?: { w: number; h: number } | null;
  radius: number;
  /** How far above x/y the interaction bubble floats (default 62). */
  markerLift?: number;
  /** Only show the bubble while this is the nearest interactable (used for people). */
  markerOnlyWhenNear?: boolean;
  dialogTitle: string;
  dialogText: string;
}

export interface FurnitureDef {
  kind: FurnitureKind;
  /** Centre of the footprint (object layer) or of the graphic (floor/wall layers). */
  x: number;
  y: number;
  /** Colour/style variant, interpreted by the art layer. */
  variant?: number;
}

export type FloorStyle = "wood" | "tile" | "carpet";

export type DoorSide = "top" | "bottom" | "left" | "right";

export interface RoomDef {
  id: RoomId;
  label: string;
  icon: string;
  /** One short, neutral line shown in the full map's detail panel. */
  description: string;
  /** Accent colour used for the mini-map, full map and wall paint. */
  color: number;
  floor: { style: FloorStyle; a: number; b: number };
  bounds: Rect;
  /** Room-local x of the name plaque on the top wall (defaults to the room centre). */
  signX?: number;
  doorSide: DoorSide;
  spawn: Point;
  accessible: boolean;
  furniture: FurnitureDef[];
  interactables: InteractableDef[];
}

export interface WallSegment extends Rect {
  side: DoorSide;
  /**
   * The bottom WALL_FACE px of this segment is the visible end face of a side wall above a
   * door (a door jamb). It is solid and drawn as a painted face, so the wall reads as having
   * height and characters in the doorway don't appear to overlap it.
   */
  jambFace?: boolean;
}

// ---------- Geometry constants ----------

export const WALL_THICKNESS = 16;
/** Visible painted wall face under each top wall (gives the 3/4 top-down look). Solid. */
export const WALL_FACE = 34;
export const DOOR_GAP = 96;
export const PLAYER_RADIUS = 12;

const OX = 40; // outer margin (garden) left/right
const OY = 56; // outer margin top
const ROOM_W = 310;
const ROOM_H = 360;
const HALL_W = 120;
const ROWS = 5;

export const WORLD_BOUNDS: Rect = {
  x: 0,
  y: 0,
  width: OX * 2 + ROOM_W * 2 + HALL_W,
  height: OY + ROOM_H * ROWS + 44,
};

export const HALLWAY: Rect = { x: OX + ROOM_W, y: OY, width: HALL_W, height: ROOM_H * ROWS };

const FACE_MID = WALL_THICKNESS + WALL_FACE / 2; // y offset of wall decor from a room's top

/** Top-left of a room slot. `half` 1 = the lower half of a slot split into two half rooms. */
function origin(col: 0 | 1, row: number, half: 0 | 1 = 0): Point {
  return { x: OX + col * (ROOM_W + HALL_W), y: OY + row * ROOM_H + half * (ROOM_H / 2) };
}

/** Builds room-relative helpers so the layout below reads in local coordinates. */
function local(o: Point) {
  return {
    f: (kind: FurnitureKind, dx: number, dy: number, variant?: number): FurnitureDef => ({
      kind,
      x: o.x + dx,
      y: o.y + dy,
      variant,
    }),
    wall: (kind: FurnitureKind, dx: number, variant?: number): FurnitureDef => ({
      kind,
      x: o.x + dx,
      y: o.y + FACE_MID,
      variant,
    }),
    p: (dx: number, dy: number): Point => ({ x: o.x + dx, y: o.y + dy }),
  };
}

// ---------- Rooms ----------

// Visitors enter from the bottom, so the public rooms sit by the entrance and the
// staff-only rooms are at the back.
const O = origin(0, 0);
const S = origin(1, 0);
const L = origin(0, 1);
const A = origin(1, 1);
const C = origin(0, 2);
const T = origin(1, 2);
const Q = origin(1, 2, 1);
const K = origin(0, 3);
const P = origin(1, 3);
const R = origin(0, 4);
const W = origin(1, 4);

function reception() {
  const { f, wall, p } = local(R);
  return {
    furniture: [
      wall("noticeBoard", 258),
      f("rugWelcome", 210, 230),
      f("counter", 140, 120),
      f("plant", 36, 70),
      f("plant", 270, 70),
      f("waterCooler", 36, 220),
      f("chair", 60, 330, 1),
      f("chair", 96, 330, 1),
      f("chair", 132, 330, 1),
      f("plant", 272, 326),
    ],
    interactable: { x: R.x + 140, y: R.y + 120 },
    spawn: p(255, 180),
  };
}

function waiting() {
  const { f, wall, p } = local(W);
  return {
    furniture: [
      wall("picture", 52),
      wall("tv", 262),
      // rows of waiting chairs facing the TV wall, with a walkway from the door on the left and
      // between the rows (seat positions in WAITING_SEATS below)
      ...WAITING_ROWS.flatMap((y) => WAITING_COLS.map((x) => f("chair", x, y, 3))),
      f("plant", 36, 70),
      f("plant", 36, 322),
    ],
    spawn: p(55, 180),
  };
}

/** Waiting Area chair grid (room-local centres): 4 rows x 5 chairs. */
const WAITING_COLS = [120, 156, 192, 228, 264];
const WAITING_ROWS = [120, 188, 256, 324];
/** Feet of someone seated on chair (col, row): just in front of the chair. */
export function waitingSeat(col: number, row: number): Point {
  return { x: W.x + WAITING_COLS[col], y: W.y + WAITING_ROWS[row] + 12 };
}

function care() {
  const { f, wall, p } = local(C);
  return {
    furniture: [
      wall("picture", 52, 1),
      wall("clock", 262),
      f("bed", 70, 150),
      f("cabinet", 140, 110),
      f("sink", 252, 68),
      f("stool", 130, 236),
      f("cabinet", 252, 322),
      f("plant", 36, 322),
    ],
    interactable: { x: C.x + 70, y: C.y + 150 },
    spawn: p(255, 180),
  };
}

function storage() {
  const { f, p } = local(S);
  return {
    furniture: [
      f("shelf", 64, 67),
      f("shelf", 246, 67),
      f("shelfSide", 276, 215),
      f("boxes", 40, 318),
      f("trolley", 120, 318),
      f("boxes", 200, 318),
      f("boxes", 238, 318),
    ],
    interactable: { x: S.x + 64, y: S.y + 67 },
    spawn: p(55, 180),
  };
}

function office() {
  const { f, wall, p } = local(O);
  return {
    furniture: [
      wall("whiteboard", 62),
      f("officeChair", 150, 84),
      f("desk", 150, 110),
      f("bookshelf", 36, 150),
      f("plant", 36, 330),
      f("roundTable", 110, 290),
      f("chair", 66, 290, 2),
      f("chair", 154, 290, 2),
      f("plant", 272, 326),
    ],
    interactable: { x: O.x + 150, y: O.y + 110 },
    spawn: p(255, 180),
  };
}

function arcade() {
  const { f, p } = local(A);
  return {
    furniture: [
      f("rugStar", 165, 205),
      f("arcade", 166, 65, 0),
      f("arcade", 216, 65, 1),
      f("claw", 268, 75),
      f("arcadeDoor", 279, 236),
      f("beanbag", 80, 312, 0),
      f("beanbag", 130, 318, 1),
      f("arcade", 252, 322, 2),
    ],
    interactable: { x: A.x + 279, y: A.y + 236 },
    spawn: p(55, 180),
  };
}

function lounge() {
  const { f, wall, p } = local(L);
  return {
    furniture: [
      wall("clock", 52),
      wall("tv", 255),
      f("rugWelcome", 130, 175, 1),
      f("sofa", 130, 95),
      f("coffeeTable", 130, 182),
      f("coffeeMachine", 60, 300),
      f("fridge", 130, 300),
      f("roundTable", 230, 300),
      f("chair", 190, 300, 1),
      f("chair", 270, 300, 1),
      f("plant", 36, 232),
    ],
    interactable: { x: L.x + 60, y: L.y + 300 },
    spawn: p(255, 180),
  };
}

function consult() {
  const { f, wall, p } = local(K);
  return {
    furniture: [
      wall("picture", 52, 1),
      f("officeChair", 150, 84),
      f("desk", 150, 110),
      f("stool", 122, 168),
      f("stool", 178, 168),
      f("bed", 60, 270),
      f("cabinet", 252, 322),
      f("plant", 190, 326),
      f("plant", 272, 252),
    ],
    interactable: { x: K.x + 150, y: K.y + 110 },
    spawn: p(255, 180),
  };
}

function pharmacy() {
  const { f, p } = local(P);
  return {
    furniture: [
      f("shelf", 64, 67),
      f("shelf", 246, 67),
      f("pharmacyCounter", 190, 160),
      f("bench", 190, 322),
      f("plant", 276, 260),
      f("plant", 36, 322),
    ],
    interactable: { x: P.x + 190, y: P.y + 160 },
    spawn: p(55, 180),
  };
}

function toilet() {
  const { f, wall, p } = local(T);
  return {
    furniture: [
      wall("mirror", 252),
      f("stall", 116, 67),
      f("stall", 184, 67),
      f("sink", 252, 68),
      f("bin", 286, 150),
      f("plant", 36, 150),
    ],
    interactable: { x: T.x + 252, y: T.y + 68 },
    spawn: p(60, 105),
  };
}

function surau() {
  const { f, wall, p } = local(Q);
  return {
    furniture: [
      wall("picture", 128, 2),
      f("prayerMat", 150, 112),
      f("prayerMat", 200, 112),
      f("prayerMat", 250, 112),
      f("prayerRack", 222, 62),
      f("shoeRack", 40, 152),
    ],
    interactable: { x: Q.x + 222, y: Q.y + 62 },
    spawn: p(70, 105),
  };
}

const r = reception();
const w = waiting();
const c = care();
const s = storage();
const o = office();
const a = arcade();

const l = lounge();
const k = consult();
const ph = pharmacy();
const t = toilet();
const q = surau();

const ROOM_SIZE = { width: ROOM_W, height: ROOM_H };
const HALF_SIZE = { width: ROOM_W, height: ROOM_H / 2 };

export const ROOMS: RoomDef[] = [
  {
    id: "reception",
    label: "Reception",
    icon: "🛎️",
    description: "Front desk where visitors check in.",
    color: 0xf07f2e,
    floor: { style: "wood", a: 0xe9c08c, b: 0xb98a52 },
    bounds: { ...R, ...ROOM_SIZE },
    doorSide: "right",
    spawn: r.spawn,
    accessible: true,
    furniture: r.furniture,
    interactables: [
      {
        id: "reception-desk",
        kind: "object",
        label: "Reception Desk",
        icon: "🛎️",
        ...r.interactable,
        area: FURNITURE.counter.footprint,
        radius: 36,
        dialogTitle: "Receptionist",
        dialogText: "\"Welcome to the clinic! Let me know if you need anything.\"",
      },
    ],
  },
  {
    id: "waiting",
    label: "Waiting Area",
    icon: "🛋️",
    description: "A cosy spot for visitors to relax.",
    color: 0x1fa67a,
    floor: { style: "tile", a: 0xf3e9db, b: 0xd9c7ac },
    bounds: { ...W, ...ROOM_SIZE },
    doorSide: "left",
    spawn: w.spawn,
    accessible: true,
    furniture: w.furniture,
    // the seated visitors are interactable; they are defined in npcs.ts
    interactables: [],
  },
  {
    id: "care",
    label: "Care Room",
    icon: "🧴",
    description: "A calm, tidy room for hands-on care.",
    color: 0x2f7fe0,
    floor: { style: "tile", a: 0xe9eff5, b: 0xc5d1de },
    bounds: { ...C, ...ROOM_SIZE },
    doorSide: "right",
    spawn: c.spawn,
    accessible: true,
    furniture: c.furniture,
    interactables: [
      {
        id: "care-bed",
        kind: "object",
        label: "Care Bed",
        icon: "🛏️",
        ...c.interactable,
        area: FURNITURE.bed.footprint,
        radius: 36,
        dialogTitle: "Care Bed",
        dialogText: "A tidy care bed, ready for the next patient.",
      },
      {
        // care trays are cleaned here and kept on the rack beside it (systems/CareTrays.ts)
        id: "care-sink",
        kind: "object",
        label: "Tray rack & sink",
        icon: "🧽",
        x: C.x + 252,
        y: C.y + 68,
        area: FURNITURE.sink.footprint,
        radius: 36,
        dialogTitle: "Tray rack",
        dialogText: "Clean care trays wait here for the next patient.",
      },
    ],
  },
  {
    id: "storage",
    label: "Storage",
    icon: "📦",
    description: "Shelves of neatly stacked supplies.",
    color: 0xe5a417,
    floor: { style: "tile", a: 0xdfe3e8, b: 0xb9c1cb },
    bounds: { ...S, ...ROOM_SIZE },
    doorSide: "left",
    spawn: s.spawn,
    accessible: true,
    furniture: s.furniture,
    interactables: [
      {
        id: "storage-shelf",
        kind: "object",
        label: "Supply Shelf",
        icon: "📦",
        ...s.interactable,
        area: FURNITURE.shelf.footprint,
        radius: 36,
        dialogTitle: "Supply Shelf",
        dialogText: "Every box is labelled by item, so restocking is easy.",
      },
    ],
  },
  {
    id: "office",
    label: "Staff Office",
    icon: "📋",
    description: "Where the team plans the day.",
    color: 0x7a55d6,
    floor: { style: "carpet", a: 0x8a9bb8, b: 0x7a8ba8 },
    bounds: { ...O, ...ROOM_SIZE },
    signX: 222,
    doorSide: "right",
    spawn: o.spawn,
    accessible: true,
    furniture: o.furniture,
    interactables: [
      {
        id: "office-desk",
        kind: "object",
        label: "Staff Desk",
        icon: "📋",
        ...o.interactable,
        area: FURNITURE.desk.footprint,
        radius: 36,
        dialogTitle: "Staff Desk",
        dialogText: "The shift board. End your shift here when you're ready.",
      },
    ],
  },
  {
    id: "arcade",
    label: "Arcade Room",
    icon: "🕹️",
    description: "Take a break with mini-games.",
    color: 0xe8457c,
    floor: { style: "carpet", a: 0x3b2f6b, b: 0x54468f },
    bounds: { ...A, ...ROOM_SIZE },
    signX: 80,
    doorSide: "left",
    spawn: a.spawn,
    accessible: true,
    furniture: a.furniture,
    interactables: [
      {
        id: "arcade-entrance",
        kind: "object",
        label: "Arcade Entrance",
        icon: "🕹️",
        ...a.interactable,
        area: FURNITURE.arcadeDoor.footprint,
        radius: 36,
        dialogTitle: "Arcade Entrance",
        dialogText: "Grow Bloom, Catch the Gust and Delivery Dash open here soon.",
      },
    ],
  },
  {
    id: "consult",
    label: "Consultation",
    icon: "🩺",
    description: "Where doctors meet patients one to one.",
    color: 0x14a3a8,
    floor: { style: "tile", a: 0xedf3f3, b: 0xc9d8d8 },
    bounds: { ...K, ...ROOM_SIZE },
    signX: 226,
    doorSide: "right",
    spawn: k.spawn,
    accessible: true,
    furniture: k.furniture,
    interactables: [
      {
        id: "consult-desk",
        kind: "object",
        label: "Doctor's Desk",
        icon: "🩺",
        ...k.interactable,
        area: FURNITURE.desk.footprint,
        radius: 36,
        dialogTitle: "Doctor's Desk",
        dialogText: "Dr. Lim's desk: patient notes, a lamp and a tidy pen pot.",
      },
    ],
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    icon: "💊",
    description: "Collect products after your consultation.",
    color: 0xa07ee0,
    floor: { style: "tile", a: 0xf4eefb, b: 0xdcd0ee },
    bounds: { ...P, ...ROOM_SIZE },
    doorSide: "left",
    spawn: ph.spawn,
    accessible: true,
    furniture: ph.furniture,
    interactables: [
      {
        id: "pharmacy-counter",
        kind: "object",
        label: "Pharmacy Counter",
        icon: "💊",
        ...ph.interactable,
        area: FURNITURE.pharmacyCounter.footprint,
        radius: 36,
        markerLift: 100, // just above the pharmacist's head, below the name plaque
        dialogTitle: "Pharmacist",
        dialogText: "\"Hello! I check every item against the doctor's card before it's handed over.\"",
      },
    ],
  },
  {
    id: "toilet",
    label: "Toilet",
    icon: "🚻",
    description: "Clean restrooms for everyone.",
    color: 0x2aa9d6,
    floor: { style: "tile", a: 0xe8f1f5, b: 0xc3d6df },
    bounds: { ...T, ...HALF_SIZE },
    signX: 52,
    doorSide: "left",
    spawn: t.spawn,
    accessible: true,
    furniture: t.furniture,
    interactables: [
      {
        id: "toilet-stall",
        kind: "object",
        label: "Toilet",
        icon: "🚻",
        x: T.x + 116,
        y: T.y + 67,
        area: FURNITURE.stall.footprint,
        radius: 30,
        markerLift: 70,
        dialogTitle: "Toilet",
        dialogText: "",
      },
      {
        id: "toilet-sink",
        kind: "object",
        label: "Sink",
        icon: "🧼",
        ...t.interactable,
        area: FURNITURE.sink.footprint,
        radius: 36,
        dialogTitle: "Sink",
        dialogText: "Remember to wash your hands!",
      },
    ],
  },
  {
    id: "surau",
    label: "Surau",
    icon: "🕌",
    description: "A quiet space for prayer.",
    color: 0x2e8f57,
    floor: { style: "carpet", a: 0x5f9f74, b: 0x528f66 },
    bounds: { ...Q, ...HALF_SIZE },
    signX: 58,
    doorSide: "left",
    spawn: q.spawn,
    accessible: true,
    furniture: q.furniture,
    interactables: [
      {
        id: "surau-mat",
        kind: "object",
        label: "Prayer mat",
        icon: "🕌",
        x: Q.x + 200,
        y: Q.y + 112,
        radius: 40,
        markerLift: 30,
        dialogTitle: "Surau",
        dialogText: "A quiet space for prayer. Please keep your voice low.",
      },
    ],
  },
  {
    id: "lounge",
    label: "Staff Lounge",
    icon: "☕",
    description: "Where the team takes a break.",
    color: 0xb8763e,
    floor: { style: "wood", a: 0xe2c49a, b: 0xb48c5c },
    bounds: { ...L, ...ROOM_SIZE },
    doorSide: "right",
    spawn: l.spawn,
    accessible: true,
    furniture: l.furniture,
    interactables: [
      {
        id: "lounge-coffee",
        kind: "object",
        label: "Coffee Machine",
        icon: "☕",
        ...l.interactable,
        area: FURNITURE.coffeeMachine.footprint,
        radius: 36,
        dialogTitle: "Coffee Machine",
        dialogText: "Break time! Resting here will restore your energy in a later update.",
      },
    ],
  },
];

// room names in the player's language (plaques, maps, toasts)
for (const room of ROOMS) room.label = roomName(room.id, room.label);

/** Hallway decoration (plants, runner rug ends, entrance mat). */
export const HALLWAY_FURNITURE: FurnitureDef[] = [
  { kind: "plant", x: HALLWAY.x + 18, y: HALLWAY.y + WALL_THICKNESS + WALL_FACE + 14 },
  { kind: "plant", x: HALLWAY.x + HALL_W - 18, y: HALLWAY.y + WALL_THICKNESS + WALL_FACE + 14 },
  { kind: "mat", x: HALLWAY.x + HALL_W / 2, y: HALLWAY.y + HALLWAY.height - 36 },
  { kind: "plant", x: HALLWAY.x + 18, y: HALLWAY.y + HALLWAY.height - 32 },
  { kind: "plant", x: HALLWAY.x + HALL_W - 18, y: HALLWAY.y + HALLWAY.height - 32 },
];

// ---------- Lookups ----------

export function getRoomById(id: RoomId): RoomDef {
  const room = ROOMS.find((rm) => rm.id === id);
  if (!room) throw new Error(`Unknown room id: ${id}`);
  return room;
}

/** Centre of a room's door gap, on the wall line. */
export function getDoorCenter(room: RoomDef): Point {
  const { x, y, width, height } = room.bounds;
  switch (room.doorSide) {
    case "left":
      return { x: x + WALL_THICKNESS / 2, y: y + height / 2 };
    case "right":
      return { x: x + width - WALL_THICKNESS / 2, y: y + height / 2 };
    case "top":
      return { x: x + width / 2, y: y + WALL_THICKNESS / 2 };
    case "bottom":
      return { x: x + width / 2, y: y + height - WALL_THICKNESS / 2 };
  }
}

/** Splits one wall into two segments around a centred door gap. */
function splitForDoor(seg: WallSegment, horizontal: boolean): WallSegment[] {
  if (horizontal) {
    const gapStart = seg.x + (seg.width - DOOR_GAP) / 2;
    return [
      { ...seg, width: gapStart - seg.x },
      { ...seg, x: gapStart + DOOR_GAP, width: seg.x + seg.width - (gapStart + DOOR_GAP) },
    ];
  }
  const gapStart = seg.y + (seg.height - DOOR_GAP) / 2;
  return [
    { ...seg, height: gapStart - seg.y + WALL_FACE, jambFace: true },
    { ...seg, y: gapStart + DOOR_GAP, height: seg.y + seg.height - (gapStart + DOOR_GAP) },
  ];
}

/** Returns a room's wall segments (top wall includes its painted face), with a door gap. */
export function getRoomWalls(room: RoomDef): WallSegment[] {
  const { x, y, width, height } = room.bounds;
  const t = WALL_THICKNESS;
  const sides: WallSegment[] = [
    { side: "top", x, y, width, height: t + WALL_FACE },
    { side: "bottom", x, y: y + height - t, width, height: t },
    { side: "left", x, y, width: t, height },
    { side: "right", x: x + width - t, y, width: t, height },
  ];
  return sides.flatMap((seg) =>
    seg.side === room.doorSide ? splitForDoor(seg, seg.side === "top" || seg.side === "bottom") : [seg]
  );
}

/** The hallway's own end walls (its long sides are the rooms' walls). */
export function getHallwayWalls(): WallSegment[] {
  const { x, y, width, height } = HALLWAY;
  return [
    { side: "top", x, y, width, height: WALL_THICKNESS + WALL_FACE },
    { side: "bottom", x, y: y + height - WALL_THICKNESS, width, height: WALL_THICKNESS },
  ];
}

export function getAllWalls(): WallSegment[] {
  return [...ROOMS.flatMap(getRoomWalls), ...getHallwayWalls()];
}

/** Solid furniture rectangles (world space). */
export function getFurnitureSolids(): Rect[] {
  const all = [...ROOMS.flatMap((rm) => rm.furniture), ...HALLWAY_FURNITURE];
  return all.flatMap((item) => {
    const spec = FURNITURE[item.kind];
    if (spec.layer !== "object" || !spec.footprint) return [];
    const { w, h } = spec.footprint;
    return [{ x: item.x - w / 2, y: item.y - h / 2, width: w, height: h }];
  });
}

/** Finds which room (if any) contains the given world point. Hallway returns null. */
export function findRoomAt(x: number, y: number): RoomDef | null {
  for (const room of ROOMS) {
    const b = room.bounds;
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
      return room;
    }
  }
  return null;
}

function circleHitsRect(cx: number, cy: number, radius: number, rect: Rect): boolean {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < radius * radius;
}

/**
 * True if a body of `radius` at (x, y) touches no wall or furniture, with its centre inside the
 * building. Unlike isWalkable() the body may straddle a room and the hallway, i.e. stand in a
 * doorway — used for path finding.
 */
export function bodyFits(x: number, y: number, radius = PLAYER_RADIUS): boolean {
  const inside = [...ROOMS.map((rm) => rm.bounds), HALLWAY].some(
    (b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
  );
  if (!inside) return false;
  blockers ??= [...getAllWalls(), ...getFurnitureSolids()];
  return !blockers.some((rect) => circleHitsRect(x, y, radius, rect));
}

let blockers: Rect[] | undefined;

/**
 * True if a player standing at (x, y) would be inside the building and not overlapping
 * any wall or furniture. Used to validate saves and spawn points.
 */
export function isWalkable(x: number, y: number, radius = PLAYER_RADIUS): boolean {
  const insideBuilding = [...ROOMS.map((rm) => rm.bounds), HALLWAY].some(
    (b) => x - radius >= b.x && x + radius <= b.x + b.width && y - radius >= b.y && y + radius <= b.y + b.height
  );
  if (!insideBuilding) return false;
  return ![...getAllWalls(), ...getFurnitureSolids()].some((rect) => circleHitsRect(x, y, radius, rect));
}
