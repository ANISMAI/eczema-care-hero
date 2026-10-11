import Phaser from "phaser";
import {
  HALLWAY,
  WALL_FACE,
  WALL_THICKNESS,
  WORLD_BOUNDS,
  getDoorCenter,
  type FloorStyle,
  type Rect,
  type RoomDef,
  type WallSegment,
} from "../data/rooms";
import { FONT_FAMILY, RENDER_SCALE } from "../game/display";
import { PAL, groundShadow, rr, seeded, shade, toCss } from "./palette";

// Floors, walls, garden, signage and interaction markers for the clinic.

const WALL_CAP = 0xe6d8c6;
const WALL_CAP_LINE = 0xd2c0a9;
export const HALLWAY_FLOOR = { style: "tile" as FloorStyle, a: 0xf8f2e9, b: 0xf0e7da };
export const HALLWAY_WALL = 0xf0e2cf;

export function textStyle(
  size: number,
  color: string,
  weight = "700"
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    fontStyle: weight,
    color,
    resolution: RENDER_SCALE * 1.5,
  };
}

// ---------- Ground ----------

export function drawGarden(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(-200);
  const { width, height } = WORLD_BOUNDS;
  g.fillStyle(PAL.grass, 1);
  g.fillRect(0, 0, width, height);

  const rand = seeded(7);
  for (let i = 0; i < 260; i++) {
    const x = rand() * width;
    const y = rand() * height;
    g.fillStyle(PAL.grassDot, 1);
    g.fillEllipse(x, y, 6, 3);
  }

  // entrance path from the hallway's front door to the bottom edge
  const pathX = HALLWAY.x + HALLWAY.width / 2;
  const pathTop = HALLWAY.y + HALLWAY.height;
  rr(g, pathX - 34, pathTop - 4, 68, height - pathTop + 10, 10, 0xeee3d3);
  for (let y = pathTop + 6; y < height; y += 16) {
    g.fillStyle(0xe2d4c0, 1);
    g.fillRoundedRect(pathX - 26, y, 22, 10, 4);
    g.fillRoundedRect(pathX + 4, y + 4, 22, 10, 4);
  }

  // bushes and flowers around the building
  const bush = (x: number, y: number, s: number) => {
    groundShadow(g, x, y + s * 0.6, s * 2.4, s * 0.8);
    g.fillStyle(PAL.leafDark, 1);
    g.fillCircle(x - s * 0.7, y, s * 0.8);
    g.fillCircle(x + s * 0.7, y, s * 0.8);
    g.fillCircle(x, y - s * 0.5, s);
    g.fillStyle(PAL.leaf, 1);
    g.fillCircle(x - s * 0.5, y - s * 0.2, s * 0.55);
    g.fillCircle(x + s * 0.3, y - s * 0.6, s * 0.5);
  };
  const flower = (x: number, y: number, c: number) => {
    g.fillStyle(c, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.fillCircle(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.4);
    }
    g.fillStyle(PAL.yellow, 1);
    g.fillCircle(x, y, 1.8);
  };

  for (let x = 30; x < width; x += 70) bush(x + rand() * 20, 22 + rand() * 8, 12 + rand() * 5);
  for (let y = 120; y < height - 60; y += 110) {
    bush(18, y + rand() * 30, 11);
    bush(width - 18, y + rand() * 30, 11);
  }
  const flowerColors = [PAL.pinkDark, 0xffffff, PAL.lavenderDark, PAL.peachDark];
  for (let i = 0; i < 40; i++) {
    const side = i % 4;
    const x = side === 0 ? rand() * 30 + 4 : side === 1 ? width - rand() * 30 - 4 : rand() * width;
    const y = side < 2 ? 60 + rand() * (height - 120) : side === 2 ? 40 + rand() * 12 : height - 30 + rand() * 20;
    if (Math.abs(x - pathX) < 40 && y > pathTop) continue;
    flower(x, y, flowerColors[i % flowerColors.length]);
  }
  for (const x of [pathX - 64, pathX + 64]) bush(x, height - 18, 12);
}

export function drawFloor(
  scene: Phaser.Scene,
  rect: Rect,
  floor: { style: FloorStyle; a: number; b: number }
): void {
  const g = scene.add.graphics().setDepth(-100);
  const { x, y, width, height } = rect;
  g.fillStyle(floor.a, 1);
  g.fillRect(x, y, width, height);
  g.fillStyle(floor.b, 1);

  if (floor.style === "wood") {
    const rowH = 18;
    for (let row = 0, ry = y; ry < y + height; row++, ry += rowH) {
      g.fillRect(x, ry + rowH - 2, width, 2);
      for (let sx = x + (row % 2) * 40; sx < x + width; sx += 80) g.fillRect(sx, ry, 2, rowH - 2);
    }
  } else if (floor.style === "tile") {
    const s = 30;
    for (let ty = y, row = 0; ty < y + height; ty += s, row++) {
      for (let tx = x, col = 0; tx < x + width; tx += s, col++) {
        if ((row + col) % 2 === 0) g.fillRect(tx, ty, Math.min(s, x + width - tx), Math.min(s, y + height - ty));
      }
    }
  } else {
    const s = 16;
    for (let ty = y + 6, row = 0; ty < y + height; ty += s, row++) {
      for (let tx = x + 6 + (row % 2) * (s / 2); tx < x + width; tx += s) g.fillCircle(tx, ty, 1.6);
    }
  }

  // soft shadow cast by the top wall onto the floor
  g.fillStyle(PAL.shadow, 0.07);
  g.fillRect(x, y + WALL_THICKNESS + WALL_FACE, width, 8);
}

/** Long runner rug down the centre of the hallway. */
export function drawHallwayRunner(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(-60);
  const top = HALLWAY.y + WALL_THICKNESS + WALL_FACE + 40;
  const bottom = HALLWAY.y + HALLWAY.height - 70;
  const cx = HALLWAY.x + HALLWAY.width / 2;
  rr(g, cx - 26, top, 52, bottom - top, 10, 0xfde3d3);
  g.lineStyle(2, 0xffffff, 0.8);
  g.strokeRoundedRect(cx - 20, top + 6, 40, bottom - top - 12, 7);
  for (let yy = top + 30; yy < bottom - 20; yy += 60) {
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(cx, yy, 3);
  }
}

// ---------- Walls ----------

export function drawWall(scene: Phaser.Scene, seg: WallSegment, faceColor: number): void {
  if (seg.width <= 0 || seg.height <= 0) return;
  const g = scene.add.graphics().setDepth(seg.y + seg.height);
  const t = WALL_THICKNESS;
  const capH = seg.side === "top" ? t : seg.height;

  if (seg.side === "top") {
    const fy = seg.y + t;
    g.fillStyle(faceColor, 1);
    g.fillRect(seg.x, fy, seg.width, WALL_FACE);
    g.fillStyle(shade(faceColor, 0.35), 1);
    g.fillRect(seg.x, fy, seg.width, 3);
    g.fillStyle(shade(faceColor, -0.06), 1);
    g.fillRect(seg.x, fy + WALL_FACE - 13, seg.width, 9);
    g.fillStyle(shade(faceColor, -0.2), 1);
    g.fillRect(seg.x, fy + WALL_FACE - 4, seg.width, 4);
  }

  g.fillStyle(WALL_CAP, 1);
  g.fillRect(seg.x, seg.y, seg.width, capH);
  g.lineStyle(1, WALL_CAP_LINE, 1);
  g.strokeRect(seg.x + 0.5, seg.y + 0.5, seg.width - 1, capH - 1);
}

/** Threshold strip and door posts, plus a wayfinding sign in the hallway. */
export function drawDoor(scene: Phaser.Scene, room: RoomDef): void {
  const door = getDoorCenter(room);
  const g = scene.add.graphics().setDepth(-40);
  const vertical = room.doorSide === "left" || room.doorSide === "right";
  const half = 48;

  g.fillStyle(shade(room.color, 0.45), 1);
  if (vertical) g.fillRect(door.x - WALL_THICKNESS / 2, door.y - half, WALL_THICKNESS, half * 2);
  else g.fillRect(door.x - half, door.y - WALL_THICKNESS / 2, half * 2, WALL_THICKNESS);

  const posts = scene.add.graphics().setDepth(door.y + half + 1);
  posts.fillStyle(shade(room.color, -0.15), 1);
  if (vertical) {
    posts.fillRoundedRect(door.x - 9, door.y - half - 6, 18, 8, 3);
    posts.fillRoundedRect(door.x - 9, door.y + half - 2, 18, 8, 3);
  }

  // Hallway sign: rooms on the left are signed just above their door, rooms on the right
  // just below theirs, so facing doors never share a sign position.
  const onLeft = room.doorSide === "right";
  const sx = HALLWAY.x + HALLWAY.width / 2;
  const sy = door.y + (onLeft ? -half - 22 : half + 22);
  const text = onLeft ? `◀ ${room.icon} ${room.label}` : `${room.label} ${room.icon} ▶`;
  hangingSign(scene, sx, sy, text, room.color, 10.5);
}

function hangingSign(scene: Phaser.Scene, cx: number, cy: number, text: string, color: number, size: number): void {
  const label = scene.add
    .text(cx, cy, text, textStyle(size, toCss(PAL.ink), "800"))
    .setOrigin(0.5)
    .setDepth(5001);
  const w = label.width + 18;
  const h = size + 13;
  const g = scene.add.graphics().setDepth(5000);
  g.fillStyle(PAL.shadow, 0.15);
  g.fillRoundedRect(cx - w / 2, cy - h / 2 + 2, w, h, h / 2);
  rr(g, cx - w / 2, cy - h / 2, w, h, h / 2, 0xffffff, color, 2.5);
}

/** Name plaque hung on the room's top wall face. */
export function drawRoomPlaque(scene: Phaser.Scene, room: RoomDef): void {
  const cx = room.bounds.x + (room.signX ?? room.bounds.width / 2);
  const cy = room.bounds.y + WALL_THICKNESS + WALL_FACE / 2 - 1;
  hangingSign(scene, cx, cy, `${room.icon}  ${room.label}`, room.color, 12);
}

// ---------- Interaction marker ----------

export interface Marker {
  container: Phaser.GameObjects.Container;
  setActive(active: boolean): void;
}

/** Floating bubble above an interactable; bobs gently and highlights when in range. */
export function createMarker(scene: Phaser.Scene, x: number, y: number, isNpc: boolean): Marker {
  const bubble = scene.add.graphics();
  const draw = (active: boolean) => {
    const fill = active ? PAL.mintDark : 0xffffff;
    const line = active ? 0xffffff : PAL.mintDark;
    bubble.clear();
    bubble.fillStyle(PAL.shadow, 0.15);
    bubble.fillCircle(0, 2, 12);
    bubble.fillStyle(fill, 1);
    bubble.fillTriangle(-5, 8, 5, 8, 0, 15);
    bubble.fillCircle(0, 0, 12);
    bubble.lineStyle(2.5, line, 1);
    bubble.strokeCircle(0, 0, 12);
  };
  draw(false);

  const glyph = scene.add.text(0, isNpc ? -3 : 0, isNpc ? "…" : "!", textStyle(14, toCss(PAL.mintDark), "900"));
  glyph.setOrigin(0.5);

  const container = scene.add.container(x, y, [bubble, glyph]).setDepth(6000);
  scene.tweens.add({
    targets: container,
    y: y - 5,
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  let current = false;
  return {
    container,
    setActive(active: boolean) {
      if (active === current) return;
      current = active;
      draw(active);
      glyph.setColor(active ? "#ffffff" : toCss(PAL.mintDark));
      container.setScale(active ? 1.2 : 1);
    },
  };
}
