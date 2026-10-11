// Room metadata: single typed list driving layout, walls, furniture, mini-map, full map and
// interactions. Keep this as the one source of truth for clinic geometry (per brief section 08).
//
// Layout (portrait, fits a phone screen):
//
//   [ Reception ]  hall  [ Waiting Area ]
//   [ Care Room ]  hall  [ Storage      ]
//   [ Staff Off.]  hall  [ Arcade Room  ]
//
// Every room opens onto the central hallway through a door on its hallway-facing wall.

import { FURNITURE, type FurnitureKind } from "./furniture";

export type RoomId = "reception" | "waiting" | "care" | "storage" | "arcade" | "office";

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

export interface NpcDef {
  x: number;
  y: number;
  variant: number;
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
  npcs: NpcDef[];
  interactables: InteractableDef[];
}

export interface WallSegment extends Rect {
  side: DoorSide;
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

export const WORLD_BOUNDS: Rect = {
  x: 0,
  y: 0,
  width: OX * 2 + ROOM_W * 2 + HALL_W,
  height: OY + ROOM_H * 3 + 44,
};

export const HALLWAY: Rect = { x: OX + ROOM_W, y: OY, width: HALL_W, height: ROOM_H * 3 };

const FACE_MID = WALL_THICKNESS + WALL_FACE / 2; // y offset of wall decor from a room's top

function origin(col: 0 | 1, row: 0 | 1 | 2): Point {
  return { x: OX + col * (ROOM_W + HALL_W), y: OY + row * ROOM_H };
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

const R = origin(0, 0);
const W = origin(1, 0);
const C = origin(0, 1);
const S = origin(1, 1);
const O = origin(0, 2);
const A = origin(1, 2);

function reception() {
  const { f, wall, p } = local(R);
  return {
    furniture: [
      wall("clock", 60),
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
      f("chair", 120, 120, 0),
      f("chair", 156, 120, 0),
      f("chair", 192, 120, 0),
      f("chair", 228, 120, 0),
      f("chair", 264, 120, 0),
      f("coffeeTable", 190, 228),
      f("bench", 190, 322),
      f("plant", 36, 70),
      f("plant", 36, 322),
      f("plant", 276, 200),
    ],
    npcs: [
      { ...p(192, 120), variant: 0 },
      { ...p(120, 120), variant: 1 },
    ],
    interactable: { x: W.x + 192, y: W.y + 120 },
    spawn: p(55, 180),
  };
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

const r = reception();
const w = waiting();
const c = care();
const s = storage();
const o = office();
const a = arcade();

const ROOM_SIZE = { width: ROOM_W, height: ROOM_H };

export const ROOMS: RoomDef[] = [
  {
    id: "reception",
    label: "Reception",
    icon: "🛎️",
    description: "Front desk where visitors check in.",
    color: 0xffc9a8,
    floor: { style: "wood", a: 0xf6e3c9, b: 0xe9cfae },
    bounds: { ...R, ...ROOM_SIZE },
    doorSide: "right",
    spawn: r.spawn,
    accessible: true,
    furniture: r.furniture,
    npcs: [],
    interactables: [
      {
        id: "reception-desk",
        kind: "object",
        label: "Reception Desk",
        icon: "🛎️",
        ...r.interactable,
        area: FURNITURE.counter.footprint,
        radius: 36,
        dialogTitle: "Reception Desk",
        dialogText: "Registration coming soon.",
      },
    ],
  },
  {
    id: "waiting",
    label: "Waiting Area",
    icon: "🛋️",
    description: "A cosy spot for visitors to relax.",
    color: 0xa9dfc8,
    floor: { style: "tile", a: 0xe6f5ee, b: 0xd8efe3 },
    bounds: { ...W, ...ROOM_SIZE },
    doorSide: "left",
    spawn: w.spawn,
    accessible: true,
    furniture: w.furniture,
    npcs: w.npcs,
    interactables: [
      {
        id: "waiting-npc",
        kind: "npc",
        label: "Visitor",
        icon: "🙂",
        ...w.interactable,
        radius: 64,
        dialogTitle: "Friendly Visitor",
        dialogText: "\"Hi there! Lovely day, isn't it? I like how bright and calm it is in here.\"",
      },
    ],
  },
  {
    id: "care",
    label: "Care Room",
    icon: "🧴",
    description: "A calm, tidy room for future care sessions.",
    color: 0xb8d5f3,
    floor: { style: "tile", a: 0xeaf2fb, b: 0xdde9f7 },
    bounds: { ...C, ...ROOM_SIZE },
    doorSide: "right",
    spawn: c.spawn,
    accessible: true,
    furniture: c.furniture,
    npcs: [],
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
        dialogText: "A tidy care bed, ready for future sessions.",
      },
    ],
  },
  {
    id: "storage",
    label: "Storage",
    icon: "📦",
    description: "Shelves of neatly stacked supplies.",
    color: 0xf5dc96,
    floor: { style: "wood", a: 0xf7ecd4, b: 0xeadbb8 },
    bounds: { ...S, ...ROOM_SIZE },
    doorSide: "left",
    spawn: s.spawn,
    accessible: true,
    furniture: s.furniture,
    npcs: [],
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
        dialogText: "Stock management coming soon.",
      },
    ],
  },
  {
    id: "office",
    label: "Staff Office",
    icon: "📋",
    description: "Where the team plans the day.",
    color: 0xd6c4f0,
    floor: { style: "carpet", a: 0xeee6f8, b: 0xe1d5f2 },
    bounds: { ...O, ...ROOM_SIZE },
    signX: 222,
    doorSide: "right",
    spawn: o.spawn,
    accessible: true,
    furniture: o.furniture,
    npcs: [],
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
        dialogText: "Mission list and career ranks coming soon.",
      },
    ],
  },
  {
    id: "arcade",
    label: "Arcade Room",
    icon: "🕹️",
    description: "Take a break with mini-games.",
    color: 0xf5b3cb,
    floor: { style: "carpet", a: 0xfbe6ee, b: 0xf5d3e0 },
    bounds: { ...A, ...ROOM_SIZE },
    signX: 80,
    doorSide: "left",
    spawn: a.spawn,
    accessible: true,
    furniture: a.furniture,
    npcs: [],
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
];

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
    { ...seg, height: gapStart - seg.y },
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
