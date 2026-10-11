import Phaser from "phaser";
import { FURNITURE, type FurnitureKind } from "../data/furniture";
import type { FurnitureDef } from "../data/rooms";
import { PAL, groundShadow, outline, rr, shade, star } from "./palette";
import { addBaked } from "./bake";

// Placeholder furniture art, drawn as vector Graphics so it stays crisp at any zoom.
//
// Coordinate convention for each drawer:
//   object layer -> (0, 0) is the bottom-centre of the collision footprint; draw upwards.
//   floor / wall -> (0, 0) is the centre of the graphic.
//
// Each kind/variant is drawn once into a shared texture (see bake.ts). To use real sprites
// later, replace the addBaked() calls in createFurniture() with
// `scene.add.image(x, bottom, key).setOrigin(0.5, 1)` — positions and depth stay the same.

type G = Phaser.GameObjects.Graphics;
type Drawer = (g: G, variant: number) => void;

const CHAIR_COLORS = [PAL.mint, PAL.peach, PAL.lavender, PAL.sky];
const ARCADE_COLORS = [PAL.pink, PAL.skyDark, PAL.yellow];
const BEANBAG_COLORS = [PAL.yellow, PAL.mint];
const ITEM_COLORS = [PAL.sky, PAL.pink, PAL.yellow, PAL.mint, PAL.sky, PAL.peach, PAL.lavender];

/** White product box with a coloured label band, like boxed supplies on a pharmacy shelf. */
function supplyBox(g: G, x: number, bottom: number, w: number, h: number, label: number): void {
  rr(g, x, bottom - h, w, h, 1.5, 0xffffff, PAL.steelDark, 1.2);
  g.fillStyle(label, 1);
  g.fillRect(x + 1, bottom - h + h * 0.35, w - 2, Math.max(3, h * 0.3));
}

function shelfUnit(g: G, w: number): void {
  const h = 80;
  groundShadow(g, 0, -2, w + 8, 12, 0.2);
  rr(g, -w / 2, -h, w, h, 3, PAL.steel, PAL.steelDark);
  rr(g, -w / 2 + 4, -h + 4, w - 8, h - 8, 2, 0xe9edf2);
  const boards = [-h + 28, -h + 52, -6];
  boards.forEach((by, level) => {
    let x = -w / 2 + 7;
    let i = level * 2;
    while (x < w / 2 - 16) {
      const color = ITEM_COLORS[i % ITEM_COLORS.length];
      const iw = 9 + ((i * 7) % 3) * 3;
      const ih = 13 + ((i * 5) % 3) * 3;
      if (i % 4 === 3) {
        // coloured storage bin
        rr(g, x, by - ih + 4, iw + 4, ih - 4, 2, color, color, 1.2);
        x += iw + 7;
      } else {
        supplyBox(g, x, by, iw, ih, color);
        x += iw + 3;
      }
      i++;
    }
    g.fillStyle(PAL.steelDark, 1);
    g.fillRect(-w / 2 + 4, by, w - 8, 3);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(-w / 2 + 4, by, w - 8, 1);
  });
  // uprights
  g.fillStyle(shade(PAL.steelDark, -0.1), 1);
  g.fillRect(-w / 2, -h, 3, h);
  g.fillRect(w / 2 - 3, -h, 3, h);
}

const DRAW: Record<FurnitureKind, Drawer> = {
  counter: (g) => {
    groundShadow(g, 0, -1, 162, 14, 0.2);
    rr(g, -75, -42, 150, 42, 4, 0xe8ecf1, PAL.steelDark);
    g.fillStyle(PAL.skyDark, 1);
    g.fillRect(-74, -10, 148, 8);
    g.lineStyle(1.5, PAL.steelDark, 1);
    g.lineBetween(-25, -40, -25, -10);
    g.lineBetween(25, -40, 25, -10);
    rr(g, -78, -64, 156, 26, 4, PAL.wood, PAL.woodDark);
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(-74, -61, 148, 4);
    // monitor + keyboard
    g.fillStyle(PAL.ink, 1);
    g.fillRect(36, -64, 6, 6);
    rr(g, 20, -90, 38, 28, 3, 0x2b3240, PAL.ink);
    rr(g, 23, -87, 32, 21, 2, 0x5fb8f0);
    g.fillStyle(0xffffff, 0.5);
    g.fillTriangle(25, -85, 36, -85, 25, -72);
    rr(g, 14, -57, 30, 7, 1.5, 0x3a4252, PAL.ink, 1);
    // papers, pen pot, bell
    rr(g, -24, -60, 22, 15, 1, 0xffffff, PAL.steelDark, 1);
    rr(g, -2, -66, 9, 12, 2, PAL.sky, PAL.skyDark, 1.5);
    g.fillStyle(PAL.yellowDark, 1);
    g.fillEllipse(-52, -51, 18, 7);
    g.fillStyle(PAL.yellow, 1);
    g.slice(-52, -52, 8, Math.PI, 0, false);
    g.fillPath();
    g.lineStyle(1.5, outline(PAL.yellow), 1);
    g.beginPath();
    g.arc(-52, -52, 8, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(-55, -56, 2);
  },

  plant: (g) => {
    groundShadow(g, 0, -1, 30, 9, 0.2);
    const leaves: [number, number, number][] = [
      [-9, -30, 9],
      [9, -31, 9],
      [0, -42, 10],
      [-4, -36, 8],
      [5, -26, 8],
    ];
    g.fillStyle(outline(PAL.leafDark), 1);
    for (const [x, y, r] of leaves) g.fillCircle(x, y, r + 1.5);
    g.fillStyle(PAL.leafDark, 1);
    for (const [x, y, r] of leaves) g.fillCircle(x, y, r);
    g.fillStyle(PAL.leaf, 1);
    for (const [x, y, r] of leaves) g.fillCircle(x - 1.5, y - 2, r * 0.6);
    rr(g, -11, -20, 22, 20, 4, 0xffffff, PAL.steelDark);
    rr(g, -13, -22, 26, 6, 3, 0xf1f4f7, PAL.steelDark);
    g.fillStyle(PAL.steel, 1);
    g.fillRect(-9, -8, 18, 2);
  },

  chair: (g, v) => {
    const c = CHAIR_COLORS[v % CHAIR_COLORS.length];
    groundShadow(g, 0, -1, 28, 7);
    g.fillStyle(shade(c, -0.35), 1);
    g.fillRect(-11, -6, 3, 6);
    g.fillRect(8, -6, 3, 6);
    rr(g, -13, -34, 26, 15, 6, shade(c, -0.08), shade(c, -0.3));
    rr(g, -13, -20, 26, 15, 5, c, shade(c, -0.3));
  },

  bench: (g) => {
    groundShadow(g, 0, -1, 116, 9);
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(-50, -8, 4, 8);
    g.fillRect(46, -8, 4, 8);
    rr(g, -55, -26, 110, 20, 8, PAL.mint, PAL.mintDark);
    g.lineStyle(2, shade(PAL.mint, -0.15), 1);
    g.lineBetween(-18, -24, -18, -8);
    g.lineBetween(18, -24, 18, -8);
  },

  coffeeTable: (g) => {
    groundShadow(g, 0, -1, 86, 10);
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(-34, -10, 4, 10);
    g.fillRect(30, -10, 4, 10);
    rr(g, -40, -40, 80, 32, 8, PAL.wood, PAL.woodDark);
    g.fillStyle(PAL.pink, 1);
    g.fillRoundedRect(-30, -35, 22, 16, 2);
    g.fillStyle(PAL.sky, 1);
    g.fillRoundedRect(-4, -34, 20, 14, 2);
    rr(g, 22, -40, 10, 14, 3, PAL.cream, PAL.creamLine, 1);
    g.fillStyle(PAL.pinkDark, 1);
    g.fillCircle(27, -43, 4);
  },

  waterCooler: (g) => {
    groundShadow(g, 0, -1, 28, 7);
    rr(g, -12, -30, 24, 30, 4, 0xf4f6fa, 0xc9cfdb);
    g.fillStyle(0x7fbfe6, 1);
    g.fillCircle(-4, -20, 2.5);
    g.fillStyle(PAL.pinkDark, 1);
    g.fillCircle(4, -20, 2.5);
    rr(g, -9, -56, 18, 28, 7, 0xbfe4f8, 0x7fbfe6);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(-5, -50, 3, 16);
  },

  bed: (g) => {
    groundShadow(g, 0, -2, 78, 12);
    rr(g, -37, -136, 74, 14, 6, PAL.sky, PAL.skyDark);
    rr(g, -35, -126, 70, 126, 10, 0xffffff, 0xbfcfe2);
    rr(g, -30, -120, 60, 114, 8, 0xe9f2fb);
    rr(g, -24, -114, 48, 22, 9, 0xffffff, 0xd5e2f0);
    rr(g, -30, -72, 60, 66, 8, PAL.mint, PAL.mintDark);
    rr(g, -30, -72, 60, 12, 6, shade(PAL.mint, 0.35), PAL.mintDark);
  },

  cabinet: (g) => {
    groundShadow(g, 0, -1, 44, 8);
    rr(g, -20, -44, 40, 44, 6, PAL.cream, PAL.creamLine);
    g.lineStyle(1.5, outline(PAL.creamLine), 1);
    g.lineBetween(-16, -28, 16, -28);
    g.lineBetween(-16, -14, 16, -14);
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(-4, -36, 8, 3);
    g.fillRect(-4, -22, 8, 3);
    g.fillRect(-4, -9, 8, 3);
    rr(g, -10, -54, 14, 10, 3, PAL.pink, PAL.pinkDark, 1.5);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(-3, -55, 8, 4);
  },

  sink: (g) => {
    groundShadow(g, 0, -1, 90, 9);
    rr(g, -42, -36, 84, 36, 6, PAL.cream, PAL.creamLine);
    g.lineStyle(1.5, outline(PAL.creamLine), 1);
    g.lineBetween(0, -30, 0, -4);
    rr(g, -44, -52, 88, 20, 6, 0xe6eef6, 0xbccbdc);
    g.fillStyle(0xcfe3f3, 1);
    g.fillEllipse(-12, -42, 34, 12);
    g.fillStyle(0xa7b6c9, 1);
    g.fillRect(-14, -56, 4, 9);
    g.fillRect(-14, -56, 9, 3);
    rr(g, 20, -62, 10, 16, 3, PAL.mint, PAL.mintDark, 1.5);
    rr(g, 32, -58, 8, 12, 3, PAL.peach, PAL.peachDark, 1.5);
  },

  stool: (g) => {
    groundShadow(g, 0, -1, 22, 6);
    g.fillStyle(0xa7b6c9, 1);
    g.fillRect(-2, -12, 4, 12);
    g.fillStyle(PAL.sky, 1);
    g.fillEllipse(0, -15, 22, 12);
    g.lineStyle(2, outline(PAL.skyDark), 1);
    g.strokeEllipse(0, -15, 22, 12);
  },

  shelf: (g) => shelfUnit(g, 96),
  shelfWide: (g) => shelfUnit(g, 110),

  shelfSide: (g) => {
    groundShadow(g, 0, -2, 42, 10, 0.2);
    rr(g, -18, -114, 36, 114, 3, PAL.steel, PAL.steelDark);
    for (let i = 0; i < 6; i++) {
      const c = ITEM_COLORS[(i + 2) % ITEM_COLORS.length];
      supplyBox(g, -13, -95 + i * 17, 26, 13, c);
    }
  },

  boxes: (g) => {
    groundShadow(g, 0, -1, 40, 8);
    rr(g, -18, -30, 36, 30, 4, 0xecc594, 0xc99a64);
    g.fillStyle(0xf6dcb6, 1);
    g.fillRect(-3, -30, 6, 30);
    rr(g, -14, -52, 28, 24, 4, 0xf2d0a3, 0xc99a64);
    g.fillStyle(0xfae6c8, 1);
    g.fillRect(-3, -52, 6, 24);
  },

  trolley: (g) => {
    groundShadow(g, 0, -1, 54, 8);
    g.fillStyle(0x7d8aa6, 1);
    g.fillCircle(-20, -3, 3.5);
    g.fillCircle(20, -3, 3.5);
    g.fillRect(-23, -40, 3, 34);
    g.fillRect(20, -40, 3, 34);
    rr(g, -25, -14, 50, 7, 3, 0xd6dde9, 0xa7b6c9, 1.5);
    rr(g, -25, -40, 50, 9, 3, 0xd6dde9, 0xa7b6c9, 1.5);
    rr(g, -18, -54, 14, 14, 2, PAL.sky, PAL.skyDark, 1.5);
    rr(g, -2, -50, 16, 10, 2, PAL.yellow, PAL.yellowDark, 1.5);
    rr(g, -14, -26, 26, 12, 2, PAL.pink, PAL.pinkDark, 1.5);
  },

  desk: (g) => {
    groundShadow(g, 0, -1, 128, 12);
    rr(g, -60, -40, 120, 40, 6, PAL.woodDeep, 0xb58e65);
    g.lineStyle(1.5, outline(0xb58e65), 1);
    g.lineBetween(20, -34, 20, -4);
    g.fillStyle(0xb58e65, 1);
    g.fillRect(36, -24, 10, 3);
    rr(g, -62, -64, 124, 26, 6, PAL.wood, PAL.woodDark);
    // laptop
    rr(g, -18, -88, 34, 22, 3, 0x5a6684);
    rr(g, -15, -85, 28, 16, 2, 0xb6e3f5);
    rr(g, -22, -66, 42, 8, 3, 0xc9d2e3, 0xa7b6c9, 1);
    // papers + mug
    rr(g, -52, -60, 20, 14, 2, 0xffffff, 0xd9d9e3, 1);
    rr(g, -49, -63, 20, 14, 2, 0xffffff, 0xd9d9e3, 1);
    rr(g, 30, -62, 11, 12, 3, PAL.peach, PAL.peachDark, 1.5);
  },

  officeChair: (g) => {
    groundShadow(g, 0, -1, 30, 7);
    g.fillStyle(0x7d8aa6, 1);
    g.fillCircle(-10, -3, 2.5);
    g.fillCircle(10, -3, 2.5);
    g.fillRect(-2, -12, 4, 10);
    rr(g, -12, -36, 24, 16, 7, shade(PAL.skyDark, 0.15), shade(PAL.skyDark, -0.25));
    rr(g, -14, -22, 28, 12, 6, PAL.skyDark, shade(PAL.skyDark, -0.25));
  },

  bookshelf: (g) => {
    groundShadow(g, 0, -2, 40, 8);
    rr(g, -18, -108, 36, 108, 6, PAL.wood, PAL.woodDark);
    let y = -102;
    let i = 0;
    while (y < -10) {
      const c = ITEM_COLORS[i % ITEM_COLORS.length];
      const bh = 6 + (i % 3) * 2;
      rr(g, -13 + (i % 2) * 3, y, 23, bh, 2, c, shade(c, -0.25), 1);
      y += bh + 2;
      i++;
    }
  },

  roundTable: (g) => {
    groundShadow(g, 0, -1, 56, 10);
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(-3, -16, 6, 14);
    g.fillStyle(PAL.cream, 1);
    g.fillEllipse(0, -24, 60, 34);
    g.lineStyle(2, outline(PAL.creamLine), 1);
    g.strokeEllipse(0, -24, 60, 34);
    rr(g, -6, -36, 12, 12, 3, PAL.sky, PAL.skyDark, 1.5);
    g.fillStyle(PAL.leaf, 1);
    g.fillCircle(-3, -39, 4);
    g.fillCircle(3, -40, 4);
    g.fillStyle(PAL.peach, 1);
    g.fillCircle(-16, -22, 4);
    g.fillCircle(15, -20, 4);
  },

  arcade: (g, v) => {
    const c = ARCADE_COLORS[v % ARCADE_COLORS.length];
    const d = shade(c, -0.25);
    groundShadow(g, 0, -1, 48, 9);
    rr(g, -22, -78, 44, 78, 8, c, d);
    rr(g, -22, -84, 44, 12, 6, shade(c, 0.4), d);
    rr(g, -17, -68, 34, 26, 4, PAL.ink);
    rr(g, -14, -65, 28, 20, 3, 0x9ff0d6);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(-9, -58, 4, 4);
    g.fillStyle(PAL.pinkDark, 1);
    g.fillRect(4, -53, 4, 4);
    rr(g, -20, -38, 40, 12, 4, shade(c, 0.35), d, 1.5);
    g.fillStyle(PAL.ink, 1);
    g.fillRect(-11, -40, 2, 6);
    g.fillStyle(0xff7a8a, 1);
    g.fillCircle(-10, -41, 3);
    g.fillStyle(PAL.yellow, 1);
    g.fillCircle(5, -32, 2.5);
    g.fillStyle(0x7fd1ff, 1);
    g.fillCircle(12, -32, 2.5);
  },

  arcadeDoor: (g) => {
    g.fillStyle(PAL.pink, 0.28);
    g.fillRoundedRect(-22, -108, 44, 112, 14);
    rr(g, -15, -100, 30, 100, 9, PAL.lavenderDark, 0x8a63cc);
    rr(g, -10, -94, 20, 88, 6, 0xffd6e7);
    const stripes = [0xffbcd6, 0xe7d4ff, 0xfff0b3];
    for (let i = 0; i < 8; i++) {
      g.fillStyle(stripes[i % stripes.length], 1);
      g.fillRect(-10, -90 + i * 10, 20, 5);
    }
    star(g, 0, -50, 7, 0xffffff);
  },

  claw: (g) => {
    groundShadow(g, 0, -1, 50, 9);
    rr(g, -23, -30, 46, 30, 6, PAL.pink, PAL.pinkDark);
    g.fillStyle(PAL.ink, 1);
    g.fillRect(8, -22, 10, 6);
    g.fillStyle(0xdff4ff, 0.85);
    g.fillRoundedRect(-21, -80, 42, 50, 6);
    g.lineStyle(2, outline(0x9cc8e8), 1);
    g.strokeRoundedRect(-21, -80, 42, 50, 6);
    g.fillStyle(PAL.yellow, 1);
    g.fillCircle(-11, -38, 6);
    g.fillStyle(PAL.mint, 1);
    g.fillCircle(1, -36, 6);
    g.fillStyle(PAL.lavender, 1);
    g.fillCircle(11, -39, 6);
    g.lineStyle(1.5, outline(0x7d8aa6), 1);
    g.lineBetween(2, -78, 2, -62);
    g.lineBetween(2, -62, -3, -56);
    g.lineBetween(2, -62, 7, -56);
    rr(g, -23, -88, 46, 11, 5, PAL.yellow, PAL.yellowDark);
  },

  beanbag: (g, v) => {
    const c = BEANBAG_COLORS[v % BEANBAG_COLORS.length];
    groundShadow(g, 0, -1, 44, 9);
    g.fillStyle(c, 1);
    g.fillEllipse(0, -14, 44, 30);
    g.lineStyle(2, outline(shade(c, -0.25)), 1);
    g.strokeEllipse(0, -14, 44, 30);
    g.fillStyle(shade(c, 0.4), 1);
    g.fillEllipse(-6, -19, 18, 10);
  },

  rugWelcome: (g) => {
    rr(g, -62, -42, 124, 84, 10, 0x2d4f8f, PAL.ink);
    g.lineStyle(3, 0x6f9be0, 1);
    g.strokeRoundedRect(-54, -34, 108, 68, 7);
    star(g, 0, 0, 11, PAL.yellow);
  },

  rugStar: (g) => {
    rr(g, -72, -52, 144, 104, 26, 0x6a4fc4, PAL.lavenderDark);
    g.lineStyle(3, 0x22d3ee, 0.9);
    g.strokeRoundedRect(-64, -44, 128, 88, 20);
    star(g, -36, -14, 9, PAL.yellow);
    star(g, 30, -20, 7, PAL.pink);
    star(g, 4, 16, 11, 0xffffff);
    star(g, 42, 22, 6, PAL.yellow);
    star(g, -44, 24, 6, PAL.pink);
  },

  mat: (g) => {
    rr(g, -42, -16, 84, 32, 6, 0x3a4252, PAL.ink);
    g.lineStyle(2, 0x6b7586, 1);
    for (let x = -30; x <= 30; x += 12) g.lineBetween(x, -10, x, 10);
  },

  tv: (g) => {
    rr(g, -34, -19, 68, 38, 6, PAL.ink);
    rr(g, -30, -15, 60, 30, 4, 0xbfe9f7);
    g.fillStyle(PAL.yellow, 1);
    g.fillCircle(16, -6, 5);
    g.fillStyle(PAL.leaf, 1);
    g.fillEllipse(-12, 15, 46, 22);
    g.fillStyle(PAL.leafDark, 1);
    g.fillEllipse(14, 16, 36, 16);
  },

  clock: (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(0, 0, 11);
    g.lineStyle(2.5, outline(PAL.creamLine), 1);
    g.strokeCircle(0, 0, 11);
    g.lineStyle(2, PAL.ink, 1);
    g.lineBetween(0, 0, 0, -7);
    g.lineBetween(0, 0, 5, 2);
    g.fillStyle(PAL.pinkDark, 1);
    g.fillCircle(0, 0, 1.8);
  },

  noticeBoard: (g) => {
    rr(g, -32, -17, 64, 34, 4, 0xe9c194, 0xc39e74);
    const notes: [number, number, number][] = [
      [-25, -11, PAL.yellow],
      [-6, -9, PAL.pink],
      [12, -12, PAL.sky],
      [-18, 3, PAL.mint],
      [6, 2, 0xffffff],
    ];
    for (const [x, y, c] of notes) {
      g.fillStyle(c, 1);
      g.fillRect(x, y, 14, 11);
      g.fillStyle(0xff7a8a, 1);
      g.fillCircle(x + 7, y + 1, 1.6);
    }
  },

  whiteboard: (g) => {
    rr(g, -36, -18, 72, 36, 4, 0xffffff, 0xbfcbd8);
    g.lineStyle(2, PAL.mintDark, 1);
    g.lineBetween(-28, -9, 6, -9);
    g.lineStyle(2, PAL.pinkDark, 1);
    g.lineBetween(-28, -1, -2, -1);
    g.lineStyle(2, PAL.skyDark, 1);
    g.lineBetween(-28, 7, 12, 7);
    g.lineStyle(2, PAL.yellowDark, 1);
    g.strokeCircle(22, -2, 7);
    g.fillStyle(0xbfcbd8, 1);
    g.fillRect(-20, 16, 40, 3);
  },

  picture: (g, v) => {
    rr(g, -20, -16, 40, 32, 3, PAL.wood, PAL.woodDark);
    rr(g, -16, -12, 32, 24, 2, v === 1 ? 0xfde7ef : 0xe3f3fb);
    if (v === 1) {
      g.fillStyle(PAL.leafDark, 1);
      g.fillRect(-1, -2, 2, 12);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.fillStyle(PAL.pinkDark, 1);
        g.fillCircle(Math.cos(a) * 4, -4 + Math.sin(a) * 4, 3);
      }
      g.fillStyle(PAL.yellow, 1);
      g.fillCircle(0, -4, 2.5);
    } else {
      g.fillStyle(PAL.yellow, 1);
      g.fillCircle(8, -5, 4);
      g.fillStyle(PAL.leaf, 1);
      g.fillTriangle(-16, 12, -4, -4, 8, 12);
      g.fillStyle(PAL.leafDark, 1);
      g.fillTriangle(-2, 12, 8, 2, 16, 12);
    }
  },
};

/** Draws one furniture item into the scene and depth-sorts it. */
export function createFurniture(scene: Phaser.Scene, item: FurnitureDef): Phaser.GameObjects.Image {
  const spec = FURNITURE[item.kind];
  const variant = item.variant ?? 0;
  const draw = (g: G) => DRAW[item.kind](g, variant);
  const key = `furniture-${item.kind}-${variant}`;

  if (spec.layer === "floor") return addBaked(scene, key, item.x, item.y, draw).setDepth(-50);
  // Wall decor sits above the wall face it hangs on, below anything standing in the room.
  if (spec.layer === "wall") return addBaked(scene, key, item.x, item.y, draw).setDepth(item.y + 20);
  const bottom = item.y + (spec.footprint ? spec.footprint.h / 2 : 0);
  return addBaked(scene, key, item.x, bottom, draw).setDepth(bottom);
}
