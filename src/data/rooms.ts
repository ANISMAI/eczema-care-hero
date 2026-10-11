// Room metadata: single typed list driving layout, walls, mini-map, full map and interactions.
// Keep this as the one source of truth for clinic geometry (per brief section 08).

export type RoomId =
  | "reception"
  | "waiting"
  | "care"
  | "storage"
  | "arcade"
  | "office";

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
  x: number;
  y: number;
  radius: number;
  dialogTitle: string;
  dialogText: string;
}

export type DoorSide = "top" | "bottom";

export interface RoomDef {
  id: RoomId;
  label: string;
  color: number;
  bounds: Rect;
  doorSide: DoorSide;
  spawn: Point;
  accessible: boolean;
  interactables: InteractableDef[];
}

export const WALL_THICKNESS = 16;
export const DOOR_GAP = 100;

const ROOM_W = 280;
const ROOM_H = 260;
const ROW1_Y = 40;
const ROW2_Y = 380;
const COL_X = [40, 360, 680];

export const WORLD_BOUNDS: Rect = { x: 0, y: 0, width: 1000, height: 700 };

export const ROOMS: RoomDef[] = [
  {
    id: "reception",
    label: "Reception",
    color: 0xffe3d1,
    bounds: { x: COL_X[0], y: ROW1_Y, width: ROOM_W, height: ROOM_H },
    doorSide: "bottom",
    spawn: { x: COL_X[0] + ROOM_W / 2, y: ROW1_Y + ROOM_H - 40 },
    accessible: true,
    interactables: [
      {
        id: "reception-desk",
        kind: "object",
        label: "Reception Desk",
        x: COL_X[0] + ROOM_W / 2,
        y: ROW1_Y + 70,
        radius: 60,
        dialogTitle: "Reception Desk",
        dialogText: "Registration coming soon.",
      },
    ],
  },
  {
    id: "waiting",
    label: "Waiting Area",
    color: 0xd9f2e6,
    bounds: { x: COL_X[1], y: ROW1_Y, width: ROOM_W, height: ROOM_H },
    doorSide: "bottom",
    spawn: { x: COL_X[1] + ROOM_W / 2, y: ROW1_Y + ROOM_H - 40 },
    accessible: true,
    interactables: [
      {
        id: "waiting-npc",
        kind: "npc",
        label: "Waiting Patient",
        x: COL_X[1] + ROOM_W / 2,
        y: ROW1_Y + 70,
        radius: 60,
        dialogTitle: "Waiting Patient",
        dialogText: "\"Hope it's not too long a wait today!\"",
      },
    ],
  },
  {
    id: "care",
    label: "Care Room",
    color: 0xdbe9ff,
    bounds: { x: COL_X[2], y: ROW1_Y, width: ROOM_W, height: ROOM_H },
    doorSide: "bottom",
    spawn: { x: COL_X[2] + ROOM_W / 2, y: ROW1_Y + ROOM_H - 40 },
    accessible: true,
    interactables: [
      {
        id: "care-bed",
        kind: "object",
        label: "Care Bed",
        x: COL_X[2] + ROOM_W / 2,
        y: ROW1_Y + 70,
        radius: 60,
        dialogTitle: "Care Bed",
        dialogText: "A tidy care bed, ready for future consultations.",
      },
    ],
  },
  {
    id: "office",
    label: "Staff Office",
    color: 0xf3e3ff,
    bounds: { x: COL_X[0], y: ROW2_Y, width: ROOM_W, height: ROOM_H },
    doorSide: "top",
    spawn: { x: COL_X[0] + ROOM_W / 2, y: ROW2_Y + 40 },
    accessible: true,
    interactables: [
      {
        id: "office-desk",
        kind: "object",
        label: "Staff Desk",
        x: COL_X[0] + ROOM_W / 2,
        y: ROW2_Y + ROOM_H - 70,
        radius: 60,
        dialogTitle: "Staff Desk",
        dialogText: "Mission list and career ranks coming soon.",
      },
    ],
  },
  {
    id: "storage",
    label: "Storage",
    color: 0xfff3c4,
    bounds: { x: COL_X[1], y: ROW2_Y, width: ROOM_W, height: ROOM_H },
    doorSide: "top",
    spawn: { x: COL_X[1] + ROOM_W / 2, y: ROW2_Y + 40 },
    accessible: true,
    interactables: [
      {
        id: "storage-shelf",
        kind: "object",
        label: "Supply Shelf",
        x: COL_X[1] + ROOM_W / 2,
        y: ROW2_Y + ROOM_H - 70,
        radius: 60,
        dialogTitle: "Supply Shelf",
        dialogText: "Stock management coming soon.",
      },
    ],
  },
  {
    id: "arcade",
    label: "Arcade Room",
    color: 0xffd9e8,
    bounds: { x: COL_X[2], y: ROW2_Y, width: ROOM_W, height: ROOM_H },
    doorSide: "top",
    spawn: { x: COL_X[2] + ROOM_W / 2, y: ROW2_Y + 40 },
    accessible: true,
    interactables: [
      {
        id: "arcade-entrance",
        kind: "object",
        label: "Arcade Entrance",
        x: COL_X[2] + ROOM_W / 2,
        y: ROW2_Y + ROOM_H - 70,
        radius: 60,
        dialogTitle: "Arcade Entrance",
        dialogText: "Grow Bloom, Catch the Gust and Delivery Dash open here soon.",
      },
    ],
  },
];

export function getRoomById(id: RoomId): RoomDef {
  const room = ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`Unknown room id: ${id}`);
  return room;
}

/** Returns the wall rectangles for a room, leaving a door gap on doorSide. */
export function getRoomWalls(room: RoomDef): Rect[] {
  const { x, y, width, height } = room.bounds;
  const t = WALL_THICKNESS;
  const gap = DOOR_GAP;
  const walls: Rect[] = [
    { x, y, width, height: t }, // top
    { x, y: y + height - t, width, height: t }, // bottom
    { x, y, width: t, height }, // left
    { x: x + width - t, y, width: t, height }, // right
  ];

  const gapStart = x + (width - gap) / 2;
  if (room.doorSide === "top") {
    walls[0] = { x, y, width: gapStart - x, height: t };
    walls.push({ x: gapStart + gap, y, width: x + width - (gapStart + gap), height: t });
  } else {
    walls[1] = { x, y: y + height - t, width: gapStart - x, height: t };
    walls.push({
      x: gapStart + gap,
      y: y + height - t,
      width: x + width - (gapStart + gap),
      height: t,
    });
  }
  return walls;
}

/** Finds which room (if any) contains the given world point. */
export function findRoomAt(x: number, y: number): RoomDef | null {
  for (const room of ROOMS) {
    const b = room.bounds;
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
      return room;
    }
  }
  return null;
}
