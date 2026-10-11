import Phaser from "phaser";
import { PAL, outline, shade } from "./palette";

// Placeholder chibi characters drawn with vector Graphics, with dark cartoon outlines.
// (0, 0) is the point between the character's feet; everything is drawn upwards.

type G = Phaser.GameObjects.Graphics;

export type Facing = "down" | "up" | "side";

const INK = PAL.ink;
const LINE = 1.8;
const HAIR = 0x3a2a24;
const COAT = 0xffffff;
const SCRUBS = 0x2b7fd4;
const PANTS = 0x2a3f6e;

/** Rounded rect with an ink outline. */
function part(g: G, x: number, y: number, w: number, h: number, r: number, fill: number): void {
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(LINE, INK, 1);
  g.strokeRoundedRect(x, y, w, h, r);
}

function circle(g: G, x: number, y: number, r: number, fill: number): void {
  g.fillStyle(fill, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(LINE, INK, 1);
  g.strokeCircle(x, y, r);
}

/** Big friendly eyes with a white sparkle. */
function eye(g: G, x: number, y: number): void {
  g.fillStyle(INK, 1);
  g.fillEllipse(x, y, 4.4, 5.2);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x + 0.8, y - 1.2, 1);
}

function cheeks(g: G, xs: number[], y: number): void {
  g.fillStyle(0xff8a9a, 0.55);
  for (const x of xs) g.fillEllipse(x, y, 5, 3);
}

/** Hair cap over the top of the head, outlined. */
function hairCap(g: G, cx: number, cy: number, r: number, start: number, end: number): void {
  g.fillStyle(HAIR, 1);
  g.slice(cx, cy, r, start, end, false);
  g.fillPath();
  g.lineStyle(LINE, INK, 1);
  g.beginPath();
  g.arc(cx, cy, r, start, end, false);
  g.strokePath();
}

/** Staff avatar (the player): white coat over blue scrubs. Side view faces right. */
export function drawStaff(g: G, facing: Facing): void {
  g.clear();

  // shoes + legs
  if (facing === "side") {
    part(g, -5, -11, 6, 10, 2, PANTS);
    part(g, 1, -11, 6, 10, 2, PANTS);
    part(g, -5, -3, 8, 4, 2, INK);
    part(g, 1, -3, 9, 4, 2, INK);
  } else {
    part(g, -8, -11, 7, 10, 2, PANTS);
    part(g, 1, -11, 7, 10, 2, PANTS);
    part(g, -9, -3, 8, 4, 2, INK);
    part(g, 1, -3, 8, 4, 2, INK);
  }

  // coat, arms, scrubs
  if (facing === "side") {
    part(g, -9, -29, 18, 21, 6, COAT);
    part(g, -1, -25, 7, 13, 3, shade(COAT, -0.05));
    circle(g, 2.5, -11, 2.6, PAL.skin);
  } else {
    part(g, -15, -26, 6, 13, 3, COAT);
    part(g, 9, -26, 6, 13, 3, COAT);
    circle(g, -12, -12, 2.6, PAL.skin);
    circle(g, 12, -12, 2.6, PAL.skin);
    part(g, -11, -29, 22, 21, 6, COAT);
    if (facing === "down") {
      g.fillStyle(SCRUBS, 1);
      g.fillTriangle(-5, -29, 5, -29, 0, -18);
      g.lineStyle(1.2, INK, 1);
      g.lineBetween(0, -18, 0, -9);
      part(g, 3, -24, 5, 6, 1, PAL.sky); // ID badge
      g.fillStyle(PAL.pink, 1);
      g.fillRect(-8, -23, 1.5, 6); // pen in pocket
    }
  }

  // head
  const hy = -40;
  circle(g, 0, hy, 12.5, PAL.skin);

  if (facing === "down") {
    hairCap(g, 0, hy - 1, 13.5, Math.PI * 1.02, Math.PI * 1.98);
    g.fillStyle(HAIR, 1);
    g.fillEllipse(-10, hy, 6, 13);
    g.fillEllipse(10, hy, 6, 13);
    g.fillTriangle(-9, hy - 9, 2, hy - 9, -6, hy - 3); // fringe
    eye(g, -4.5, hy + 2);
    eye(g, 4.5, hy + 2);
    g.lineStyle(1.4, INK, 1);
    g.beginPath();
    g.arc(0, hy + 6, 2.4, 0.25, Math.PI - 0.25, false);
    g.strokePath();
    cheeks(g, [-8, 8], hy + 6);
  } else if (facing === "up") {
    circle(g, 0, hy - 1, 13.5, HAIR);
    circle(g, 0, hy - 13, 5, HAIR); // bun
  } else {
    hairCap(g, 0, hy - 1, 13.5, Math.PI * 0.95, Math.PI * 1.95);
    g.fillStyle(HAIR, 1);
    g.fillEllipse(-8, hy + 1, 11, 17);
    eye(g, 6, hy + 2);
    cheeks(g, [7.5], hy + 6.5);
  }

  // hair clip
  circle(g, facing === "side" ? -3 : -7, hy - 10, 2.6, PAL.pink);
}

const PATIENT_STYLES = [
  { shirt: 0x8f6ee0, hair: 0x2a1f1b },
  { shirt: 0xf5973f, hair: 0x8a4f22 },
  { shirt: 0x2fb38a, hair: 0x1f1f2b },
];

/** Seated visitor facing the camera; meant to sit on a chair. */
export function drawPatient(g: G, variant: number): void {
  const st = PATIENT_STYLES[variant % PATIENT_STYLES.length];
  g.clear();

  // knees + shoes poking forward
  part(g, -8, -12, 7, 8, 2, 0x4a5a7a);
  part(g, 1, -12, 7, 8, 2, 0x4a5a7a);
  part(g, -9, -5, 8, 4, 2, INK);
  part(g, 1, -5, 8, 4, 2, INK);

  part(g, -10, -27, 20, 17, 6, st.shirt);
  g.fillStyle(shade(st.shirt, 0.3), 1);
  g.fillRect(-6, -25, 12, 2);
  circle(g, -11, -14, 2.6, PAL.skin);
  circle(g, 11, -14, 2.6, PAL.skin);

  const hy = -37;
  circle(g, 0, hy, 11.5, PAL.skin);

  g.fillStyle(st.hair, 1);
  g.slice(0, hy - 1, 12.5, Math.PI * 1.02, Math.PI * 1.98, false);
  g.fillPath();
  g.lineStyle(LINE, outline(st.hair), 1);
  g.beginPath();
  g.arc(0, hy - 1, 12.5, Math.PI * 1.02, Math.PI * 1.98, false);
  g.strokePath();
  if (variant % 2 === 0) {
    g.fillStyle(st.hair, 1);
    g.fillEllipse(-9.5, hy + 2, 6, 15);
    g.fillEllipse(9.5, hy + 2, 6, 15);
  }

  eye(g, -4, hy + 2);
  eye(g, 4, hy + 2);
  g.lineStyle(1.4, INK, 1);
  g.beginPath();
  g.arc(0, hy + 5.5, 2.4, 0.2, Math.PI - 0.2, false);
  g.strokePath();
  cheeks(g, [-7.5, 7.5], hy + 6);
}
