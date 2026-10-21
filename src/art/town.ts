import { PAL, outline, shade, toCss } from "./palette";

// The town seen from above (title screen), drawn as one SVG in the clinic's style: flat pastel
// fills, darker outlines of the same hue, soft ground shadows, round leafy trees. Buildings are
// seen at a gentle 3/4 angle: front wall plus the top of the roof. The clinic stands in the
// middle; the title zooms into its door (TOWN.door) when the player presses Play.

const SIZE = 1200;
const c = toCss;
const o = (color: number) => c(outline(color));

/** Small deterministic random, so the town looks the same every time. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Pieces are drawn back to front by the y of where they touch the ground. */
type Piece = { y: number; svg: string };

const shadowEl = (x: number, y: number, rx: number, ry: number, a = 0.18) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c(PAL.shadow)}" opacity="${a}"/>`;

// ---------- trees, bushes, flowers ----------

function tree(x: number, y: number, s: number, rand: () => number): Piece {
  const leaves: [number, number, number][] = [
    [-0.55, -1.25, 0.55],
    [0.55, -1.3, 0.55],
    [0, -1.75, 0.62],
    [-0.25, -1.45, 0.5],
    [0.3, -1.05, 0.5],
  ];
  const dark = rand() < 0.25 ? 0x3f9e3c : PAL.leafDark;
  const light = rand() < 0.25 ? 0x6cc75c : PAL.leaf;
  let svg = shadowEl(x, y, s * 0.9, s * 0.28);
  svg += `<rect x="${x - s * 0.12}" y="${y - s * 0.75}" width="${s * 0.24}" height="${s * 0.78}" rx="${s * 0.08}" fill="${c(PAL.woodDark)}" stroke="${o(PAL.woodDark)}" stroke-width="2"/>`;
  svg += `<g fill="${o(dark)}">${leaves.map(([lx, ly, r]) => `<circle cx="${x + lx * s}" cy="${y + ly * s}" r="${r * s + 2.5}"/>`).join("")}</g>`;
  svg += `<g fill="${c(dark)}">${leaves.map(([lx, ly, r]) => `<circle cx="${x + lx * s}" cy="${y + ly * s}" r="${r * s}"/>`).join("")}</g>`;
  svg += `<g fill="${c(light)}">${leaves.map(([lx, ly, r]) => `<circle cx="${x + lx * s - s * 0.08}" cy="${y + ly * s - s * 0.1}" r="${r * s * 0.55}"/>`).join("")}</g>`;
  return { y, svg };
}

function bush(x: number, y: number, s: number, flowers: number | null): Piece {
  let svg = shadowEl(x, y + s * 0.15, s * 1.2, s * 0.35, 0.15);
  const blobs: [number, number, number][] = [
    [-0.6, -0.35, 0.6],
    [0.6, -0.35, 0.6],
    [0, -0.7, 0.72],
  ];
  svg += `<g fill="${o(PAL.leafDark)}">${blobs.map(([bx, by, r]) => `<circle cx="${x + bx * s}" cy="${y + by * s}" r="${r * s + 2}"/>`).join("")}</g>`;
  svg += `<g fill="${c(PAL.leafDark)}">${blobs.map(([bx, by, r]) => `<circle cx="${x + bx * s}" cy="${y + by * s}" r="${r * s}"/>`).join("")}</g>`;
  svg += `<circle cx="${x - s * 0.2}" cy="${y - s * 0.85}" r="${s * 0.35}" fill="${c(PAL.leaf)}"/>`;
  if (flowers !== null) {
    for (const [fx, fy] of [[-0.6, -0.5], [0.15, -0.95], [0.65, -0.4]]) {
      svg += `<circle cx="${x + fx * s}" cy="${y + fy * s}" r="${s * 0.16}" fill="${c(flowers)}"/><circle cx="${x + fx * s}" cy="${y + fy * s}" r="${s * 0.07}" fill="${c(PAL.yellow)}"/>`;
    }
  }
  return { y, svg };
}

function flower(x: number, y: number, color: number): string {
  let svg = "";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    svg += `<circle cx="${x + Math.cos(a) * 4}" cy="${y + Math.sin(a) * 4}" r="3.2" fill="${c(color)}"/>`;
  }
  return svg + `<circle cx="${x}" cy="${y}" r="2.4" fill="${c(PAL.yellow)}"/>`;
}

// ---------- buildings ----------

interface HouseOpts {
  wall?: number;
  roof: number;
  floors?: number;
  chimney?: boolean;
  awning?: number;
  sign?: string;
  door?: number;
}

/** A cottage seen at 3/4: front wall (door, windows) and the top of the roof. */
function house(x: number, base: number, w: number, opt: HouseOpts): Piece {
  const wall = opt.wall ?? 0xfff6e8;
  const floors = opt.floors ?? 1;
  const wallH = floors === 1 ? w * 0.55 : w * 0.78;
  const top = base - wallH;
  const over = w * 0.1;
  const roofH = w * 0.42;
  const inset = w * 0.2;
  const L = x - w / 2;
  const R = x + w / 2;
  let svg = shadowEl(x, base + 3, w * 0.62, 11);

  // wall + a darker plinth
  svg += `<rect x="${L}" y="${top}" width="${w}" height="${wallH}" rx="4" fill="${c(wall)}" stroke="${o(wall)}" stroke-width="3"/>`;
  svg += `<rect x="${L + 2}" y="${base - 9}" width="${w - 4}" height="7" fill="${c(shade(wall, -0.12))}"/>`;

  // windows
  const win = (wx: number, wy: number, ww: number, wh: number) =>
    `<rect x="${wx - ww / 2}" y="${wy}" width="${ww}" height="${wh}" rx="3" fill="#cfe8fb" stroke="${o(wall)}" stroke-width="2.5"/>` +
    `<line x1="${wx}" y1="${wy + 2}" x2="${wx}" y2="${wy + wh - 2}" stroke="#ffffff" stroke-width="2"/>` +
    `<rect x="${wx - ww / 2 - 2}" y="${wy + wh - 1}" width="${ww + 4}" height="5" rx="2" fill="${c(PAL.woodDeep)}"/>` +
    `<circle cx="${wx - ww / 4}" cy="${wy + wh - 2}" r="2.6" fill="${c(PAL.pink)}"/><circle cx="${wx + ww / 4}" cy="${wy + wh - 2}" r="2.6" fill="${c(PAL.yellow)}"/>`;
  const ww = w * 0.2;
  const wh = w * 0.17;
  const lowY = base - wallH * (floors === 1 ? 0.72 : 0.42);
  svg += win(x - w * 0.29, lowY, ww, wh) + win(x + w * 0.29, lowY, ww, wh);
  if (floors > 1) svg += win(x - w * 0.29, top + wallH * 0.14, ww, wh) + win(x, top + wallH * 0.14, ww, wh) + win(x + w * 0.29, top + wallH * 0.14, ww, wh);

  // door
  const dw = w * 0.2;
  const dh = Math.min(wallH * 0.55, w * 0.32);
  const door = opt.door ?? PAL.woodDark;
  svg += `<rect x="${x - dw / 2}" y="${base - dh}" width="${dw}" height="${dh}" rx="${dw / 2.4}" fill="${c(door)}" stroke="${o(door)}" stroke-width="2.5"/>`;
  svg += `<circle cx="${x + dw * 0.25}" cy="${base - dh * 0.45}" r="2.4" fill="${c(PAL.yellow)}"/>`;

  // awning over the door (shops)
  if (opt.awning !== undefined) {
    const aw = w * 0.5;
    const ay = base - dh - 12;
    svg += `<path d="M${x - aw / 2} ${ay} h${aw} l6 14 h${-aw - 12} z" fill="${c(opt.awning)}" stroke="${o(opt.awning)}" stroke-width="2.5" stroke-linejoin="round"/>`;
    for (let i = 1; i < 5; i += 2) svg += `<path d="M${x - aw / 2 + (aw / 5) * i} ${ay} l${-1.2} 14 h${aw / 5} l1.2 -14 z" fill="#ffffff" opacity="0.7"/>`;
  }

  // roof: the visible top as a trapezoid, a darker eave, tile rows and a light ridge
  const eave = top + 4;
  const roof = opt.roof;
  svg += `<polygon points="${L - over},${eave} ${R + over},${eave} ${R + over - inset},${eave - roofH} ${L - over + inset},${eave - roofH}" fill="${c(roof)}" stroke="${o(roof)}" stroke-width="3" stroke-linejoin="round"/>`;
  for (let k = 1; k <= 3; k++) {
    const t = k / 4;
    const yy = eave - roofH * t;
    const lx = L - over + inset * t;
    const rx = R + over - inset * t;
    svg += `<line x1="${lx + 3}" y1="${yy}" x2="${rx - 3}" y2="${yy}" stroke="${c(shade(roof, -0.14))}" stroke-width="2"/>`;
  }
  svg += `<line x1="${L - over + inset + 4}" y1="${eave - roofH + 3}" x2="${R + over - inset - 4}" y2="${eave - roofH + 3}" stroke="${c(shade(roof, 0.35))}" stroke-width="4" stroke-linecap="round"/>`;
  svg += `<rect x="${L - over}" y="${eave - 2}" width="${w + over * 2}" height="8" rx="3" fill="${c(shade(roof, -0.25))}" stroke="${o(roof)}" stroke-width="2.5"/>`;
  if (opt.sign) {
    // shop board standing on the front edge of the roof
    const sy = eave - roofH * 0.62;
    svg += `<rect x="${x - w * 0.3}" y="${sy}" width="${w * 0.6}" height="20" rx="6" fill="#ffffff" stroke="${o(opt.awning ?? PAL.woodDark)}" stroke-width="2.5"/>`;
    svg += `<text x="${x}" y="${sy + 15}" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="12.5" letter-spacing="1" fill="${c(PAL.ink)}">${opt.sign}</text>`;
  }
  if (opt.chimney) {
    const cx = x + w * 0.24;
    svg += `<rect x="${cx}" y="${eave - roofH - 10}" width="${w * 0.1}" height="${roofH * 0.55}" rx="2" fill="#d9826a" stroke="${o(0xd9826a)}" stroke-width="2.5"/>`;
  }
  return { y: base, svg };
}

/** The clinic: a bigger two-storey house with a lavender roof, a gable sign and glass doors. */
function clinic(x: number, base: number): { piece: Piece; door: { x: number; y: number } } {
  const w = 270;
  const h = house(x, base, w, { wall: 0xffffff, roof: PAL.lavender, floors: 2, door: PAL.sky });
  let svg = h.svg;
  const wallH = w * 0.78;
  const top = base - wallH;
  // central gable with the heart-and-cross sign
  const gw = 112;
  const gy = top + 6;
  svg += `<polygon points="${x - gw / 2},${gy} ${x + gw / 2},${gy} ${x},${gy - 74}" fill="#ffffff" stroke="${o(PAL.lavender)}" stroke-width="3" stroke-linejoin="round"/>`;
  svg += `<polyline points="${x - gw / 2 - 6},${gy + 2} ${x},${gy - 80} ${x + gw / 2 + 6},${gy + 2}" fill="none" stroke="${c(PAL.lavenderDark)}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
  svg += `<circle cx="${x}" cy="${gy - 26}" r="22" fill="${c(PAL.pink)}" stroke="#ffffff" stroke-width="3"/>`;
  svg += `<path d="M${x - 5} ${gy - 39} h10 v8 h8 v10 h-8 v8 h-10 v-8 h-8 v-10 h8 z" fill="#ffffff"/>`;
  // name board above the door
  svg += `<rect x="${x - 62}" y="${base - wallH * 0.47}" width="124" height="24" rx="8" fill="${c(PAL.lavender)}" stroke="#ffffff" stroke-width="3"/>`;
  svg += `<text x="${x}" y="${base - wallH * 0.47 + 17}" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="15" letter-spacing="2" fill="#ffffff">CLINIC</text>`;
  // glass double door + steps
  const dw = 58;
  const dh = 60;
  svg += `<rect x="${x - dw / 2}" y="${base - dh}" width="${dw}" height="${dh}" rx="6" fill="#cfe8fb" stroke="${o(PAL.sky)}" stroke-width="3"/>`;
  svg += `<line x1="${x}" y1="${base - dh + 3}" x2="${x}" y2="${base - 2}" stroke="${o(PAL.sky)}" stroke-width="2.5"/>`;
  svg += `<rect x="${x - 40}" y="${base - 2}" width="80" height="9" rx="3" fill="#e6e1d8" stroke="${o(0xe6e1d8)}" stroke-width="2"/>`;
  // planters either side of the door
  for (const s of [-1, 1]) {
    svg += `<rect x="${x + s * 58 - 12}" y="${base - 18}" width="24" height="18" rx="4" fill="#ffffff" stroke="${c(PAL.steelDark)}" stroke-width="2"/>`;
    svg += `<circle cx="${x + s * 58}" cy="${base - 24}" r="11" fill="${c(PAL.leafDark)}"/><circle cx="${x + s * 58 - 3}" cy="${base - 27}" r="6" fill="${c(PAL.leaf)}"/>`;
  }
  return { piece: { y: base, svg }, door: { x, y: base - dh / 2 } };
}

// ---------- town furniture ----------

function lamp(x: number, y: number): Piece {
  return {
    y,
    svg:
      shadowEl(x, y, 8, 3) +
      `<rect x="${x - 2.5}" y="${y - 46}" width="5" height="46" rx="2" fill="${c(PAL.ink)}"/>` +
      `<circle cx="${x}" cy="${y - 50}" r="12" fill="${c(PAL.yellow)}" opacity="0.25"/>` +
      `<rect x="${x - 6}" y="${y - 58}" width="12" height="12" rx="3" fill="#fff3b8" stroke="${c(PAL.ink)}" stroke-width="2.5"/>`,
  };
}

function bench(x: number, y: number): Piece {
  const wood = PAL.wood;
  return {
    y,
    svg:
      shadowEl(x, y + 2, 26, 5, 0.15) +
      `<rect x="${x - 24}" y="${y - 20}" width="48" height="8" rx="3" fill="${c(wood)}" stroke="${o(wood)}" stroke-width="2"/>` +
      `<rect x="${x - 26}" y="${y - 10}" width="52" height="9" rx="3" fill="${c(wood)}" stroke="${o(wood)}" stroke-width="2"/>` +
      `<rect x="${x - 21}" y="${y - 2}" width="4" height="6" fill="${c(PAL.woodDark)}"/><rect x="${x + 17}" y="${y - 2}" width="4" height="6" fill="${c(PAL.woodDark)}"/>`,
  };
}

function fence(x1: number, x2: number, y: number): Piece {
  let svg = `<rect x="${x1}" y="${y - 16}" width="${x2 - x1}" height="5" rx="2" fill="${c(PAL.wood)}" stroke="${o(PAL.wood)}" stroke-width="1.5"/>`;
  svg += `<rect x="${x1}" y="${y - 8}" width="${x2 - x1}" height="5" rx="2" fill="${c(PAL.wood)}" stroke="${o(PAL.wood)}" stroke-width="1.5"/>`;
  for (let px = x1; px <= x2; px += 22) svg += `<rect x="${px - 3}" y="${y - 22}" width="7" height="24" rx="2" fill="${c(PAL.woodDeep)}" stroke="${o(PAL.wood)}" stroke-width="1.5"/>`;
  return { y, svg };
}

function fountain(x: number, y: number): Piece {
  return {
    y: y + 20,
    svg:
      shadowEl(x, y + 22, 52, 12, 0.14) +
      `<ellipse cx="${x}" cy="${y + 6}" rx="50" ry="26" fill="${c(PAL.steel)}" stroke="${c(PAL.steelDark)}" stroke-width="3"/>` +
      `<ellipse cx="${x}" cy="${y + 2}" rx="40" ry="19" fill="#8fd0f5"/>` +
      `<ellipse cx="${x - 10}" cy="${y - 2}" rx="14" ry="5" fill="#ffffff" opacity="0.6"/>` +
      `<rect x="${x - 7}" y="${y - 26}" width="14" height="28" rx="5" fill="${c(PAL.steel)}" stroke="${c(PAL.steelDark)}" stroke-width="2.5"/>` +
      `<ellipse cx="${x}" cy="${y - 26}" rx="16" ry="6" fill="#bfe6fb" stroke="${c(PAL.steelDark)}" stroke-width="2"/>` +
      `<path d="M${x} ${y - 30} q-12 -14 -20 8 M${x} ${y - 30} q12 -14 20 8" stroke="#8fd0f5" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  };
}

function pond(x: number, y: number): Piece {
  let svg = `<ellipse cx="${x}" cy="${y}" rx="120" ry="62" fill="#6fb1d9" stroke="#4b8fbf" stroke-width="4"/>`;
  svg += `<ellipse cx="${x}" cy="${y - 4}" rx="108" ry="52" fill="#8fd0f5"/>`;
  svg += `<ellipse cx="${x - 30}" cy="${y - 18}" rx="40" ry="8" fill="#ffffff" opacity="0.45"/>`;
  for (const [lx, ly] of [[40, 10], [-55, 18], [70, -20]]) {
    svg += `<circle cx="${x + lx}" cy="${y + ly}" r="10" fill="${c(PAL.leaf)}" stroke="${o(PAL.leaf)}" stroke-width="2"/>`;
    svg += `<circle cx="${x + lx + 3}" cy="${y + ly - 3}" r="3" fill="${c(PAL.pink)}"/>`;
  }
  // little wooden pier
  svg += `<rect x="${x - 16}" y="${y + 30}" width="32" height="42" rx="3" fill="${c(PAL.wood)}" stroke="${o(PAL.wood)}" stroke-width="2.5"/>`;
  for (let k = 1; k < 5; k++) svg += `<line x1="${x - 14}" y1="${y + 30 + k * 8}" x2="${x + 14}" y2="${y + 30 + k * 8}" stroke="${o(PAL.wood)}" stroke-width="1.5"/>`;
  return { y: y - 60, svg };
}

function field(x: number, y: number, w: number, h: number): Piece {
  let svg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#b8814c" stroke="${o(0xb8814c)}" stroke-width="3"/>`;
  for (let ry = y + 18; ry < y + h - 8; ry += 22) {
    for (let rx = x + 16; rx < x + w - 10; rx += 18) {
      svg += `<path d="M${rx} ${ry + 8} l-5 -14 M${rx} ${ry + 8} l0 -16 M${rx} ${ry + 8} l5 -14" stroke="${c(PAL.yellowDark)}" stroke-width="3" stroke-linecap="round"/>`;
      svg += `<circle cx="${rx}" cy="${ry - 8}" r="4" fill="${c(PAL.yellow)}"/>`;
    }
  }
  return { y: y - 200, svg };
}

// ---------- the town ----------

export interface Town {
  svg: string;
  size: number;
  /** Clinic front door (viewBox units): where Play zooms in. */
  door: { x: number; y: number };
}

export function buildTown(): Town {
  const rand = seeded(11);
  const pieces: Piece[] = [];

  // ground: grass with darker dots and a few flowers
  let ground = `<rect width="${SIZE}" height="${SIZE}" fill="${c(PAL.grass)}"/>`;
  for (let i = 0; i < 420; i++) ground += `<ellipse cx="${rand() * SIZE}" cy="${rand() * SIZE}" rx="6" ry="3" fill="${c(PAL.grassDot)}"/>`;
  for (let i = 0; i < 60; i++) ground += flower(rand() * SIZE, rand() * SIZE, [PAL.pink, 0xffffff, PAL.lavender, PAL.yellow][i % 4]);

  // sandy paths: a darker edge under a lighter top, plus pebbles
  const roads = [
    "M600 860 C 600 960, 560 1060, 585 1220",
    "M-20 800 C 180 770, 360 810, 505 772",
    "M695 772 C 840 810, 1020 770, 1220 800",
    "M235 790 C 222 640, 214 470, 252 340 C 285 240, 410 205, 600 205 C 790 205, 915 240, 948 340 C 986 470, 978 640, 965 790",
    "M600 205 L 600 -20",
    "M380 1000 C 450 980, 520 990, 590 1010",
    "M610 1010 C 720 990, 800 1000, 880 1020",
  ];
  const sand = 0xefdcae;
  let paths = roads.map((d) => `<path d="${d}" fill="none" stroke="${o(sand)}" stroke-width="58" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>`).join("");
  paths += `<ellipse cx="600" cy="770" rx="140" ry="92" fill="${o(sand)}" opacity="0.55"/>`;
  paths += roads.map((d) => `<path d="${d}" fill="none" stroke="${c(sand)}" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
  paths += `<ellipse cx="600" cy="770" rx="132" ry="85" fill="${c(sand)}"/>`;
  paths += `<rect x="568" y="640" width="64" height="70" fill="${c(sand)}"/>`;

  // the clinic at the centre, facing the plaza and its fountain
  const cl = clinic(600, 648);
  pieces.push(cl.piece, fountain(600, 768));
  pieces.push(lamp(498, 720), lamp(702, 720), bench(470, 812), bench(730, 812));
  pieces.push(bush(452, 648, 18, PAL.pink), bush(748, 648, 18, PAL.lavender));

  // houses around it
  pieces.push(house(360, 520, 128, { roof: PAL.pink, chimney: true }));
  pieces.push(house(840, 520, 128, { roof: PAL.sky, chimney: true }));
  pieces.push(house(110, 600, 120, { roof: PAL.peach, chimney: true }));
  pieces.push(house(1090, 600, 120, { roof: PAL.pink }));
  pieces.push(house(400, 170, 120, { roof: PAL.peach, chimney: true }));
  pieces.push(house(800, 170, 120, { roof: PAL.sky }));
  pieces.push(house(330, 960, 140, { roof: PAL.sky, awning: PAL.mint, sign: "PHARMACY", wall: 0xf3fbf7 }));
  pieces.push(house(870, 960, 140, { roof: PAL.peach, awning: PAL.pink, sign: "BAKERY", wall: 0xfff3e0 }));
  pieces.push(house(130, 380, 110, { roof: PAL.sky }));
  pieces.push(house(1070, 380, 110, { roof: PAL.peach, chimney: true }));
  pieces.push(fence(285, 430, 560), fence(770, 915, 560));

  // farm field, pond, park benches and lamps along the roads
  pieces.push(field(40, 880, 200, 120));
  pieces.push(pond(1010, 1050));
  pieces.push(lamp(270, 720), lamp(930, 720), lamp(560, 930), lamp(640, 930), bench(470, 1080));

  // trees: a forest border and a few in the gaps
  const spots: [number, number][] = [];
  for (let x = -20; x <= SIZE + 20; x += 70) spots.push([x + rand() * 30, 60 + rand() * 30], [x + rand() * 30, SIZE - 10 + rand() * 20]);
  for (let y = 120; y < SIZE - 40; y += 80) spots.push([10 + rand() * 30, y + rand() * 30], [SIZE - 10 - rand() * 30, y + rand() * 30]);
  spots.push([600, 330], [520, 300], [680, 300], [470, 380], [730, 380], [250, 860], [960, 870], [470, 1170], [730, 1180], [200, 250], [1000, 250], [300, 690], [900, 690]);
  for (const [x, y] of spots) pieces.push(tree(x, y, 30 + rand() * 14, rand));
  for (const [x, y, col] of [[520, 980, PAL.pink], [680, 980, PAL.yellow], [200, 700, PAL.lavender], [1000, 700, PAL.pink], [300, 420, PAL.yellow], [900, 420, PAL.lavender]] as [number, number, number][]) {
    pieces.push(bush(x, y, 15, col));
  }

  pieces.sort((a, b) => a.y - b.y);
  const svg =
    `<svg class="town-svg" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    ground +
    paths +
    pieces.map((p) => p.svg).join("") +
    `</svg>`;
  return { svg, size: SIZE, door: cl.door };
}
