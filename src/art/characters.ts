import Phaser from "phaser";
import { PAL, rr, shade } from "./palette";

// Placeholder chibi characters drawn with vector Graphics.
// (0, 0) is the point between the character's feet; everything is drawn upwards.

type G = Phaser.GameObjects.Graphics;

export type Facing = "down" | "up" | "side";

const HAIR = 0x6b4a3a;
const COAT = 0xffffff;
const COAT_LINE = 0xc9d2e3;
const SCRUBS = PAL.mintDark;

function cheeks(g: G, xs: number[], y: number): void {
  g.fillStyle(0xff9fb0, 0.55);
  for (const x of xs) g.fillCircle(x, y, 2.6);
}

/** Staff avatar (the player): white coat over mint scrubs. Side view faces right. */
export function drawStaff(g: G, facing: Facing): void {
  g.clear();

  // legs
  g.fillStyle(0x5a6684, 1);
  if (facing === "side") {
    g.fillRoundedRect(-5, -10, 6, 10, 2);
    g.fillRoundedRect(1, -10, 6, 10, 2);
  } else {
    g.fillRoundedRect(-8, -10, 6, 10, 2);
    g.fillRoundedRect(2, -10, 6, 10, 2);
  }

  // coat + arms
  if (facing === "side") {
    rr(g, -9, -28, 18, 20, 7, COAT, COAT_LINE);
    rr(g, -2, -24, 7, 12, 3, shade(COAT, -0.04), COAT_LINE, 1.5);
  } else {
    g.fillStyle(COAT, 1);
    g.fillRoundedRect(-15, -25, 6, 12, 3);
    g.fillRoundedRect(9, -25, 6, 12, 3);
    rr(g, -11, -28, 22, 20, 7, COAT, COAT_LINE);
    if (facing === "down") {
      g.fillStyle(SCRUBS, 1);
      g.fillTriangle(-5, -28, 5, -28, 0, -17);
      g.fillStyle(PAL.pink, 1);
      g.fillRect(4, -22, 4, 5); // name badge
    }
  }

  // head
  const hy = -38;
  g.fillStyle(PAL.skin, 1);
  g.fillCircle(0, hy, 12);
  g.lineStyle(1.5, PAL.skinLine, 1);
  g.strokeCircle(0, hy, 12);

  g.fillStyle(HAIR, 1);
  if (facing === "down") {
    g.slice(0, hy, 13, Math.PI, 0, false);
    g.fillPath();
    g.fillEllipse(-9, hy - 1, 7, 12);
    g.fillEllipse(9, hy - 1, 7, 12);
    g.fillStyle(PAL.ink, 1);
    g.fillCircle(-4.5, hy + 2, 2);
    g.fillCircle(4.5, hy + 2, 2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-4, hy + 1.3, 0.7);
    g.fillCircle(5, hy + 1.3, 0.7);
    cheeks(g, [-7.5, 7.5], hy + 6);
  } else if (facing === "up") {
    g.fillCircle(0, hy, 13);
    g.fillCircle(0, hy - 12, 5); // bun
  } else {
    g.slice(0, hy, 13, Math.PI * 0.95, Math.PI * 0.1, false);
    g.fillPath();
    g.fillEllipse(-8, hy + 1, 10, 16);
    g.fillStyle(PAL.ink, 1);
    g.fillCircle(6, hy + 2, 2);
    cheeks(g, [7], hy + 6);
  }

  // mint hair clip
  g.fillStyle(PAL.mint, 1);
  g.fillCircle(facing === "side" ? -3 : -7, hy - 9, 2.8);
}

const PATIENT_STYLES = [
  { shirt: PAL.lavender, hair: 0x3d2b25 },
  { shirt: PAL.peach, hair: 0xb0703d },
  { shirt: PAL.sky, hair: 0x2b2b3a },
];

/** Seated visitor facing the camera; meant to sit on a chair. */
export function drawPatient(g: G, variant: number): void {
  const s = PATIENT_STYLES[variant % PATIENT_STYLES.length];
  g.clear();

  // knees + shoes poking forward
  g.fillStyle(0x7d8aa6, 1);
  g.fillRoundedRect(-8, -12, 7, 8, 2);
  g.fillRoundedRect(1, -12, 7, 8, 2);
  g.fillStyle(PAL.ink, 1);
  g.fillEllipse(-4.5, -3, 8, 4);
  g.fillEllipse(4.5, -3, 8, 4);

  rr(g, -10, -27, 20, 17, 7, s.shirt, shade(s.shirt, -0.25));

  const hy = -36;
  g.fillStyle(PAL.skin, 1);
  g.fillCircle(0, hy, 11);
  g.lineStyle(1.5, PAL.skinLine, 1);
  g.strokeCircle(0, hy, 11);

  g.fillStyle(s.hair, 1);
  g.slice(0, hy, 12, Math.PI, 0, false);
  g.fillPath();
  if (variant % 2 === 0) {
    g.fillEllipse(-9, hy + 2, 6, 14);
    g.fillEllipse(9, hy + 2, 6, 14);
  }

  g.fillStyle(PAL.ink, 1);
  g.fillCircle(-4, hy + 2, 1.8);
  g.fillCircle(4, hy + 2, 1.8);
  g.lineStyle(1.5, PAL.ink, 1);
  g.beginPath();
  g.arc(0, hy + 5, 2.5, 0.2, Math.PI - 0.2, false);
  g.strokePath();
  cheeks(g, [-7, 7], hy + 5);
}
