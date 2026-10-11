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
import { PAL, groundShadow, outline, rr, seeded, shade, toCss } from "./palette";
import { addBaked } from "./bake";

// Floors, walls, garden, signage and interaction markers for the clinic.

const WALL_CAP = 0xd3dae3;
const WALL_CAP_LINE = 0x8794a8;
const WALL_PAINT = 0xfbf7f0;
const SIGN_FILL = 0x23364f;
const SIGN_EDGE = 0x4d6a8f;
export const HALLWAY_FLOOR = { style: "tile" as FloorStyle, a: 0xf3e9db, b: 0xdccab0 };
/** Accent colour for the hallway's wall trim. */
export const HALLWAY_WALL = 0x2f66c4;

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
  addBaked(scene, "garden", 0, 0, (g) => {
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
    rr(g, pathX - 34, pathTop - 4, 68, height - pathTop + 10, 6, 0xd9d3c9);
    for (let y = pathTop + 6; y < height; y += 16) {
      g.fillStyle(0xc4bcae, 1);
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
  }, 1).setDepth(-200);
}

export function drawFloor(
  scene: Phaser.Scene,
  rect: Rect,
  floor: { style: FloorStyle; a: number; b: number }
): void {
  addBaked(scene, `floor-${rect.x}-${rect.y}`, 0, 0, (g) => {
    const { x, y, width, height } = rect;
    g.fillStyle(floor.a, 1);
    g.fillRect(x, y, width, height);

    if (floor.style === "wood") {
      const rowH = 16;
      for (let row = 0, ry = y; ry < y + height; row++, ry += rowH) {
        // alternate plank tones, then dark seams
        const tone = row % 3 === 1 ? shade(floor.a, -0.04) : row % 3 === 2 ? shade(floor.a, 0.05) : floor.a;
        g.fillStyle(tone, 1);
        g.fillRect(x, ry, width, rowH);
        g.fillStyle(floor.b, 1);
        g.fillRect(x, ry + rowH - 1.5, width, 1.5);
        for (let sx = x + (row % 2) * 44 + 20; sx < x + width; sx += 88) g.fillRect(sx, ry, 1.5, rowH);
      }
    } else if (floor.style === "tile") {
      const s = 32;
      for (let ty = y, row = 0; ty < y + height; ty += s, row++) {
        for (let tx = x, col = 0; tx < x + width; tx += s, col++) {
          if ((row * 7 + col * 3) % 5 === 0) {
            g.fillStyle(shade(floor.a, -0.025), 1);
            g.fillRect(tx, ty, Math.min(s, x + width - tx), Math.min(s, y + height - ty));
          }
        }
      }
      g.fillStyle(floor.b, 1);
      for (let tx = x + s; tx < x + width; tx += s) g.fillRect(tx - 0.75, y, 1.5, height);
      for (let ty = y + s; ty < y + height; ty += s) g.fillRect(x, ty - 0.75, width, 1.5);
    } else {
      g.fillStyle(floor.b, 1);
      const s = 12;
      for (let ty = y + 4, row = 0; ty < y + height; ty += s, row++) {
        for (let tx = x + 4 + (row % 2) * (s / 2); tx < x + width; tx += s) g.fillRect(tx, ty, 2, 2);
      }
    }

    // glossy light reflections, as if from ceiling lights
    if (floor.style !== "carpet") {
      const top = y + WALL_THICKNESS + WALL_FACE;
      for (const fx of [0.28, 0.72]) {
        const bx = x + width * fx;
        for (let k = 0; k < 5; k++) {
          g.fillStyle(0xffffff, 0.07);
          g.fillRect(bx - 18 + k * 3, top + 10 + k * 14, 36 - k * 6, height * 0.55 - k * 22);
        }
      }
    }

    // shadow cast by the top wall onto the floor
    g.fillStyle(PAL.shadow, 0.12);
    g.fillRect(x, y + WALL_THICKNESS + WALL_FACE, width, 6);
    g.fillStyle(PAL.shadow, 0.06);
    g.fillRect(x, y + WALL_THICKNESS + WALL_FACE + 6, width, 6);
  }).setDepth(-100);
}

/** Coloured wayfinding guide lines down the hallway floor, like in real clinics. */
export function drawHallwayRunner(scene: Phaser.Scene): void {
  addBaked(scene, "hallway-runner", 0, 0, (g) => {
    const top = HALLWAY.y + WALL_THICKNESS + WALL_FACE + 30;
    const bottom = HALLWAY.y + HALLWAY.height - 70;
    const cx = HALLWAY.x + HALLWAY.width / 2;
    rr(g, cx - 10, top, 7, bottom - top, 3.5, PAL.sky);
    rr(g, cx + 3, top, 7, bottom - top, 3.5, PAL.yellow);
  }).setDepth(-60);
}

// ---------- Walls ----------

export function drawWall(scene: Phaser.Scene, seg: WallSegment, accent: number): void {
  if (seg.width <= 0 || seg.height <= 0) return;
  addBaked(scene, `wall-${seg.side}-${seg.x}-${seg.y}-${seg.width}x${seg.height}`, 0, 0, (g) => {
    const t = WALL_THICKNESS;
    const capH = seg.side === "top" ? t : seg.jambFace ? seg.height - WALL_FACE : seg.height;

    if (seg.jambFace) {
      // end face of the wall above a door, painted like the room's top wall face
      const fy = seg.y + capH;
      const F = WALL_FACE;
      g.fillStyle(WALL_PAINT, 1);
      g.fillRect(seg.x, fy, seg.width, F);
      g.fillStyle(shade(accent, 0.25), 1);
      g.fillRect(seg.x, fy + F - 15, seg.width, 11);
      g.fillStyle(accent, 1);
      g.fillRect(seg.x, fy + F - 18, seg.width, 3);
      g.fillStyle(outline(accent), 1);
      g.fillRect(seg.x, fy + F - 4, seg.width, 4);
      g.lineStyle(1.5, WALL_CAP_LINE, 1);
      g.strokeRect(seg.x + 0.75, fy, seg.width - 1.5, F - 0.75);
    }

    if (seg.side === "top") {
      const fy = seg.y + t;
      const F = WALL_FACE;
      // painted wall, coloured chair rail, lower panel, skirting board
      g.fillStyle(WALL_PAINT, 1);
      g.fillRect(seg.x, fy, seg.width, F);
      g.fillStyle(PAL.shadow, 0.1);
      g.fillRect(seg.x, fy, seg.width, 3);
      g.fillStyle(shade(accent, 0.25), 1);
      g.fillRect(seg.x, fy + F - 15, seg.width, 11);
      g.fillStyle(accent, 1);
      g.fillRect(seg.x, fy + F - 18, seg.width, 3);
      g.fillStyle(outline(accent), 1);
      g.fillRect(seg.x, fy + F - 4, seg.width, 4);
    }

    g.fillStyle(WALL_CAP, 1);
    g.fillRect(seg.x, seg.y, seg.width, capH);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(seg.x, seg.y, seg.width, 2);
    g.lineStyle(1.5, WALL_CAP_LINE, 1);
    g.strokeRect(seg.x + 0.75, seg.y + 0.75, seg.width - 1.5, capH - 1.5);
  }).setDepth(seg.y + seg.height);
}

/** Threshold strip and door posts. Rooms are named by the plaque on their own wall. */
export function drawDoor(scene: Phaser.Scene, room: RoomDef): void {
  const door = getDoorCenter(room);
  const vertical = room.doorSide === "left" || room.doorSide === "right";
  const half = 48;
  addBaked(scene, `door-${room.id}`, 0, 0, (g) => {
    g.fillStyle(0xb9c2cf, 1);
    if (vertical) g.fillRect(door.x - WALL_THICKNESS / 2, door.y - half, WALL_THICKNESS, half * 2);
    else g.fillRect(door.x - half, door.y - WALL_THICKNESS / 2, half * 2, WALL_THICKNESS);
  }).setDepth(-40);

  addBaked(scene, `door-posts-${room.id}`, 0, 0, (posts) => {
    posts.fillStyle(room.color, 1);
    if (vertical) posts.fillRoundedRect(door.x - 9, door.y + half - 2, 18, 8, 3);
  }).setDepth(door.y + half + 1);
}

/** Dark navy pill sign with white capitals and a thin room-colour accent underline. */
function hangingSign(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  text: string,
  accent: number,
  size: number,
  depth = 5000
): void {
  const label = scene.add
    .text(cx, cy - 0.5, text, { ...textStyle(size, "#ffffff", "900"), letterSpacing: 0.6 })
    .setOrigin(0.5)
    .setDepth(depth + 0.5);
  const w = label.width + 22;
  const h = size + 14;
  addBaked(scene, `sign-${cx}-${cy}-${w}`, 0, 0, (g) => {
    g.fillStyle(PAL.shadow, 0.3);
    g.fillRoundedRect(cx - w / 2, cy - h / 2 + 2.5, w, h, h / 2);
    rr(g, cx - w / 2, cy - h / 2, w, h, h / 2, SIGN_FILL);
    g.lineStyle(2, SIGN_EDGE, 1);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.fillStyle(accent, 1);
    g.fillRoundedRect(cx - w / 2 + h / 2, cy + h / 2 - 4, w - h, 2, 1);
  }).setDepth(depth);
}

/** Name plaque hung on the room's top wall face. */
export function drawRoomPlaque(scene: Phaser.Scene, room: RoomDef): void {
  const cx = room.bounds.x + (room.signX ?? room.bounds.width / 2);
  const cy = room.bounds.y + WALL_THICKNESS + WALL_FACE / 2 - 1;
  hangingSign(scene, cx, cy, room.label.toUpperCase(), room.color, 11.5);
}

// ---------- Interaction marker ----------

export interface Marker {
  container: Phaser.GameObjects.Container;
  setActive(active: boolean): void;
  setPosition(x: number, y: number): void;
  /** Hide regardless of state (e.g. while a quest tag takes its place). */
  setHidden(hidden: boolean): void;
}

/**
 * Floating bubble above an interactable; bobs gently and highlights when in range.
 * `onlyWhenNear` hides it unless active (used for people, so a full waiting room isn't
 * covered in bubbles).
 */
export function createMarker(scene: Phaser.Scene, x: number, y: number, isNpc: boolean, onlyWhenNear = false): Marker {
  const bubble = (active: boolean) =>
    addBaked(scene, active ? "marker-active" : "marker-idle", 0, 0, (g) => {
      g.fillStyle(PAL.shadow, 0.3);
      g.fillCircle(0, 3, 12);
      g.fillStyle(PAL.ink, 1);
      g.fillTriangle(-6.5, 8, 6.5, 8, 0, 17);
      g.fillCircle(0, 0, 13.5);
      g.fillStyle(active ? PAL.peach : PAL.yellow, 1);
      g.fillTriangle(-4.5, 8, 4.5, 8, 0, 14);
      g.fillCircle(0, 0, 11.5);
      g.fillStyle(0xffffff, 0.45);
      g.fillEllipse(-4, -5, 8, 4);
    });
  const idle = bubble(false);
  const lit = bubble(true).setVisible(false);

  const glyph = scene.add.text(0, isNpc ? -3 : 0.5, isNpc ? "…" : "!", textStyle(15, toCss(PAL.ink), "900"));
  glyph.setOrigin(0.5);

  const bob = scene.add.container(0, 0, [idle, lit, glyph]);
  const container = scene.add.container(x, y, [bob]).setDepth(6000).setVisible(!onlyWhenNear);
  scene.tweens.add({ targets: bob, y: -5, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

  let current = false;
  let hidden = false;
  const applyVisibility = () => container.setVisible(!hidden && (!onlyWhenNear || current));
  return {
    container,
    setActive(active: boolean) {
      if (active === current) return;
      current = active;
      idle.setVisible(!active);
      lit.setVisible(active);
      container.setScale(active ? 1.25 : 1);
      applyVisibility();
    },
    setHidden(h: boolean) {
      if (h === hidden) return;
      hidden = h;
      applyVisibility();
    },
    setPosition(nx: number, ny: number) {
      container.setPosition(nx, ny);
    },
  };
}
