import Phaser from "phaser";

// Soft pastel palette shared by all placeholder art. Swap these to re-theme the clinic.
export const PAL = {
  ink: 0x3d3550,
  cream: 0xfffaf3,
  creamLine: 0xd8c8b4,
  wood: 0xeccba3,
  woodDark: 0xc9a57c,
  woodDeep: 0xd9b48b,
  mint: 0xa8e0cf,
  mintDark: 0x6fbfa6,
  peach: 0xffcfb3,
  peachDark: 0xf0a987,
  pink: 0xf7b6c8,
  pinkDark: 0xe58aa6,
  sky: 0xbfe0f7,
  skyDark: 0x8ec3e8,
  lavender: 0xd9c8f2,
  lavenderDark: 0xb39ae0,
  yellow: 0xffe08a,
  yellowDark: 0xf2c25a,
  leaf: 0x8fd19e,
  leafDark: 0x67b67c,
  skin: 0xffdcc5,
  skinLine: 0xe8b99c,
  grass: 0xcfe8c3,
  grassDot: 0xbcdcae,
  shadow: 0x3d3550,
};

/** Lighten (amount > 0) or darken (amount < 0) a 0xRRGGBB colour. amount in -1..1. */
export function shade(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const f = (c: number) =>
    Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

export function toCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

type G = Phaser.GameObjects.Graphics;

/** Filled rounded rect with optional outline. */
export function rr(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: number,
  stroke?: number,
  strokeWidth = 2
): void {
  const radius = Math.min(r, w / 2, h / 2);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  if (stroke !== undefined) {
    g.lineStyle(strokeWidth, stroke, 1);
    g.strokeRoundedRect(x, y, w, h, radius);
  }
}

/** Soft ground shadow ellipse centred at (x, y). */
export function groundShadow(g: G, x: number, y: number, w: number, h = 10, alpha = 0.13): void {
  g.fillStyle(PAL.shadow, alpha);
  g.fillEllipse(x, y, w, h);
}

/** Five-pointed star centred at (cx, cy). */
export function star(g: G, cx: number, cy: number, outer: number, color: number): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? outer : outer * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad));
  }
  g.fillStyle(color, 1);
  g.fillPoints(pts, true);
}

/** Tiny deterministic PRNG so decorative scatter is identical on every load. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
