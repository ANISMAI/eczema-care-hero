// Furniture catalog: gameplay-relevant data only (collision footprint + render layer).
// How each kind *looks* lives in src/art/furniture.ts so art can be swapped without
// touching collisions or room layout.

export type FurnitureKind =
  | "counter"
  | "plant"
  | "chair"
  | "bench"
  | "coffeeTable"
  | "waterCooler"
  | "bed"
  | "cabinet"
  | "sink"
  | "stool"
  | "shelf"
  | "shelfWide"
  | "shelfSide"
  | "boxes"
  | "trolley"
  | "desk"
  | "officeChair"
  | "bookshelf"
  | "roundTable"
  | "arcade"
  | "arcadeDoor"
  | "claw"
  | "beanbag"
  | "rugWelcome"
  | "rugStar"
  | "mat"
  | "tv"
  | "clock"
  | "noticeBoard"
  | "whiteboard"
  | "picture"
  | "sofa"
  | "coffeeMachine"
  | "fridge"
  | "pharmacyCounter"
  | "stall"
  | "mirror"
  | "bin"
  | "prayerMat"
  | "prayerRack"
  | "shoeRack";

/**
 * floor  – drawn flat under everything, never blocks movement (rugs, mats)
 * wall   – hung on a wall face, never blocks movement (clocks, TVs, boards)
 * object – stands on the floor, depth-sorted with the player, blocks movement if it has a footprint
 */
export type FurnitureLayer = "floor" | "wall" | "object";

export interface FurnitureSpec {
  layer: FurnitureLayer;
  /** Solid collision box (w x h), centred on the furniture's x/y. null = walk-through. */
  footprint: { w: number; h: number } | null;
}

export const FURNITURE: Record<FurnitureKind, FurnitureSpec> = {
  counter: { layer: "object", footprint: { w: 150, h: 40 } },
  plant: { layer: "object", footprint: { w: 24, h: 18 } },
  chair: { layer: "object", footprint: { w: 26, h: 20 } },
  bench: { layer: "object", footprint: { w: 110, h: 26 } },
  coffeeTable: { layer: "object", footprint: { w: 80, h: 34 } },
  waterCooler: { layer: "object", footprint: { w: 26, h: 20 } },
  bed: { layer: "object", footprint: { w: 70, h: 124 } },
  cabinet: { layer: "object", footprint: { w: 40, h: 28 } },
  sink: { layer: "object", footprint: { w: 84, h: 32 } },
  stool: { layer: "object", footprint: { w: 20, h: 16 } },
  shelf: { layer: "object", footprint: { w: 96, h: 34 } },
  shelfWide: { layer: "object", footprint: { w: 110, h: 34 } },
  shelfSide: { layer: "object", footprint: { w: 36, h: 110 } },
  boxes: { layer: "object", footprint: { w: 36, h: 30 } },
  trolley: { layer: "object", footprint: { w: 50, h: 30 } },
  desk: { layer: "object", footprint: { w: 120, h: 44 } },
  officeChair: { layer: "object", footprint: null },
  bookshelf: { layer: "object", footprint: { w: 36, h: 104 } },
  roundTable: { layer: "object", footprint: { w: 56, h: 40 } },
  arcade: { layer: "object", footprint: { w: 44, h: 30 } },
  arcadeDoor: { layer: "object", footprint: { w: 30, h: 96 } },
  claw: { layer: "object", footprint: { w: 46, h: 34 } },
  beanbag: { layer: "object", footprint: { w: 36, h: 24 } },
  rugWelcome: { layer: "floor", footprint: null },
  rugStar: { layer: "floor", footprint: null },
  mat: { layer: "floor", footprint: null },
  tv: { layer: "wall", footprint: null },
  clock: { layer: "wall", footprint: null },
  noticeBoard: { layer: "wall", footprint: null },
  whiteboard: { layer: "wall", footprint: null },
  picture: { layer: "wall", footprint: null },
  sofa: { layer: "object", footprint: { w: 120, h: 34 } },
  coffeeMachine: { layer: "object", footprint: { w: 70, h: 34 } },
  fridge: { layer: "object", footprint: { w: 36, h: 30 } },
  pharmacyCounter: { layer: "object", footprint: { w: 170, h: 40 } },
  stall: { layer: "object", footprint: { w: 64, h: 34 } },
  mirror: { layer: "wall", footprint: null },
  bin: { layer: "object", footprint: { w: 18, h: 14 } },
  prayerMat: { layer: "floor", footprint: null },
  prayerRack: { layer: "object", footprint: { w: 100, h: 24 } },
  shoeRack: { layer: "object", footprint: { w: 44, h: 20 } },
};
