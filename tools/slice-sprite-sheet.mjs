// Node.js port of tools/slice-sprite-sheet.py (same steps, same output), for machines without
// Python. Slices an AI-generated character sheet into a clean, aligned, transparent spritesheet.
//
// Input: a grid of figures (any spacing; figures are detected automatically) on a white or
// transparent background. Layouts used in this project:
//   walkers  --rows 4 --cols 3   rows front / left / right / back, cols stand / step / step
//   idle     --rows 1 --cols 3   one character, three poses facing front
//   seated   --rows 2 --cols 3   one character per row, three poses each
//
// Output: one .webp spritesheet with equal-size frames, every figure's bottom on a shared
// baseline and its head centred in the frame (so animation doesn't wobble), plus a preview PNG.
// Stray specks and faint halos left by AI background removal are cleaned up. All figures share
// one scale, so relative sizes are kept.
//
// usage:
//   node tools/slice-sprite-sheet.mjs <input> <output.webp> <preview.png> [--rows 4] [--cols 3] [--height 168]
//        [--mirror-steps 0,3]
// Then copy the printed numbers into src/data/assets.ts.
//
// --mirror-steps  walk sheets only: for the listed rows (0 = front, 3 = back), build the second
//                 step frame (column 3) by mirroring the first (column 2). Fixes AI sheets where
//                 both step frames move the same leg. Only for front/back views (a mirrored side
//                 view would face the other way) and characters with nothing held on one side.

import sharp from "sharp";

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? Number(argv[i + 1]) : def;
};
const [SRC, OUT, PREVIEW] = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
const ROWS = opt("rows", 4);
const COLS = opt("cols", 3);
const TARGET_CONTENT_H = opt("height", 168);
const PAD = 6;
const mirrorAt = argv.indexOf("--mirror-steps");
const MIRROR_ROWS = mirrorAt >= 0 ? argv[mirrorAt + 1].split(",").map(Number) : [];
if (!SRC || !OUT || !PREVIEW) {
  console.error("usage: node tools/slice-sprite-sheet.mjs <input> <output.webp> <preview.png> [--rows 4] [--cols 3] [--height 168]");
  process.exit(1);
}

const { data: src, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const N = W * H;
const rgba = new Uint8ClampedArray(src);
const solid = new Uint8Array(N);

let transparent = 0;
for (let p = 0; p < N; p++) if (src[p * 4 + 3] < 10) transparent++;

if (transparent / N > 0.2) {
  // already transparent: solid parts only for detection; soft edges are kept below
  for (let p = 0; p < N; p++) solid[p] = src[p * 4 + 3] > 60 ? 1 : 0;
} else {
  // white background: remove near-white pixels connected to the image border, with a soft,
  // un-blended alpha on the anti-aliased rim
  const minc = new Uint8Array(N);
  for (let p = 0; p < N; p++) minc[p] = Math.min(src[p * 4], src[p * 4 + 1], src[p * 4 + 2]);
  const bg = new Uint8Array(N);
  const stack = [];
  const push = (p) => {
    if (!bg[p] && minc[p] > 232) {
      bg[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < W; x++) push(x), push((H - 1) * W + x);
  for (let y = 0; y < H; y++) push(y * W), push(y * W + W - 1);
  while (stack.length) {
    const p = stack.pop();
    const x = p % W;
    if (x > 0) push(p - 1);
    if (x < W - 1) push(p + 1);
    if (p >= W) push(p - W);
    if (p < N - W) push(p + W);
  }
  // distance to the background (chamfer, ~Euclidean) for the 2.5px rim
  const dist = new Float32Array(N).fill(1e9);
  for (let p = 0; p < N; p++) if (bg[p]) dist[p] = 0;
  const D = Math.SQRT2;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (x > 0) dist[p] = Math.min(dist[p], dist[p - 1] + 1);
      if (y > 0) dist[p] = Math.min(dist[p], dist[p - W] + 1);
      if (x > 0 && y > 0) dist[p] = Math.min(dist[p], dist[p - W - 1] + D);
      if (x < W - 1 && y > 0) dist[p] = Math.min(dist[p], dist[p - W + 1] + D);
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      const p = y * W + x;
      if (x < W - 1) dist[p] = Math.min(dist[p], dist[p + 1] + 1);
      if (y < H - 1) dist[p] = Math.min(dist[p], dist[p + W] + 1);
      if (x < W - 1 && y < H - 1) dist[p] = Math.min(dist[p], dist[p + W + 1] + D);
      if (x > 0 && y < H - 1) dist[p] = Math.min(dist[p], dist[p + W - 1] + D);
    }
  for (let p = 0; p < N; p++) {
    if (bg[p]) {
      rgba[p * 4 + 3] = 0;
      continue;
    }
    let a = 1;
    if (dist[p] <= 2.5) {
      a = Math.min(1, Math.max(0, (255 - minc[p]) / (255 - 70)));
      const a3 = Math.max(a, 1e-3);
      for (let c = 0; c < 3; c++) rgba[p * 4 + c] = (src[p * 4 + c] - 255 * (1 - a3)) / a3;
    }
    rgba[p * 4 + 3] = a * 255;
    solid[p] = rgba[p * 4 + 3] > 60 ? 1 : 0;
  }
}

// ---------- connected components (4-connectivity, like scipy's default) ----------

const lab = new Int32Array(N);
const comps = [null]; // id -> { area, y0, y1, x0, x1 } (stop values exclusive)
for (let p0 = 0; p0 < N; p0++) {
  if (!solid[p0] || lab[p0]) continue;
  const id = comps.length;
  const c = { area: 0, y0: H, y1: 0, x0: W, x1: 0 };
  const stack = [p0];
  lab[p0] = id;
  while (stack.length) {
    const p = stack.pop();
    const x = p % W;
    const y = (p - x) / W;
    c.area++;
    if (y < c.y0) c.y0 = y;
    if (y + 1 > c.y1) c.y1 = y + 1;
    if (x < c.x0) c.x0 = x;
    if (x + 1 > c.x1) c.x1 = x + 1;
    const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
    for (const q of nb) {
      if (q >= 0 && solid[q] && !lab[q]) {
        lab[q] = id;
        stack.push(q);
      }
    }
  }
  comps.push(c);
}

/** 4-neighbour dilation, `iterations` times (scipy binary_dilation default structure). */
function dilate(mask, w, h, iterations) {
  let cur = mask;
  for (let it = 0; it < iterations; it++) {
    const next = new Uint8Array(cur);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (cur[p]) continue;
        if ((x > 0 && cur[p - 1]) || (x < w - 1 && cur[p + 1]) || (y > 0 && cur[p - w]) || (y < h - 1 && cur[p + w])) next[p] = 1;
      }
    cur = next;
  }
  return cur;
}

// 1) components -> grid cells (by bounding-box centre); per cell keep the main figure and the
//    pieces touching it
const byCell = new Map();
for (let id = 1; id < comps.length; id++) {
  const c = comps[id];
  if (c.area < 40) continue;
  const cy = (c.y0 + c.y1) / 2;
  const cx = (c.x0 + c.x1) / 2;
  const key = `${Math.min(ROWS - 1, Math.floor(cy / (H / ROWS)))},${Math.min(COLS - 1, Math.floor(cx / (W / COLS)))}`;
  if (!byCell.has(key)) byCell.set(key, []);
  byCell.get(key).push(id);
}
const cells = new Map();
const keepIds = new Set();
for (const [key, ids] of byCell) {
  ids.sort((a, b) => comps[b].area - comps[a].area);
  const main = comps[ids[0]];
  const m = 8;
  const box = [main.y0 - m, main.x0 - m, main.y1 + m, main.x1 + m];
  const kept = [ids[0]];
  for (const id of ids.slice(1)) {
    const c = comps[id];
    const touches = c.y0 < box[2] && c.y1 > box[0] && c.x0 < box[3] && c.x1 > box[1];
    if (touches && c.area >= main.area * 0.004) kept.push(id);
  }
  kept.forEach((id) => keepIds.add(id));
  cells.set(key, kept);
}
const missing = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!cells.has(`${r},${c}`)) missing.push(`(${r},${c})`);
if (missing.length) {
  console.error(`no figure found in cells ${missing.join(" ")}; check --rows/--cols`);
  process.exit(1);
}

// keep the soft anti-aliased edge around kept figures, drop everything else (specks, halos)
const keptMask = new Uint8Array(N);
for (let p = 0; p < N; p++) if (keepIds.has(lab[p])) keptMask[p] = 1;
const edge = dilate(keptMask, W, H, 2);
for (let p = 0; p < N; p++) if (!edge[p]) rgba[p * 4] = rgba[p * 4 + 1] = rgba[p * 4 + 2] = rgba[p * 4 + 3] = 0;

// 2) crop each frame; anchor = bottom of figure + head centre (top 35% of the figure)
const frames = new Map();
for (const [key, ids] of cells) {
  const set = new Set(ids);
  let y0 = H, y1 = 0, x0 = W, x1 = 0;
  for (const id of ids) {
    const c = comps[id];
    y0 = Math.min(y0, c.y0);
    y1 = Math.max(y1, c.y1);
    x0 = Math.min(x0, c.x0);
    x1 = Math.max(x1, c.x1);
  }
  y0 = Math.max(0, y0 - 2);
  x0 = Math.max(0, x0 - 2);
  y1 = Math.min(H, y1 + 2);
  x1 = Math.min(W, x1 + 2);
  const cw = x1 - x0;
  const ch = y1 - y0;
  // only this figure's pixels (a neighbour's limb may poke into the box)
  const own0 = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (set.has(lab[(y0 + y) * W + x0 + x])) own0[y * cw + x] = 1;
  const own = dilate(own0, cw, ch, 2);
  const crop = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      if (!own[y * cw + x]) continue;
      const s = ((y0 + y) * W + x0 + x) * 4;
      const d = (y * cw + x) * 4;
      crop[d] = rgba[s];
      crop[d + 1] = rgba[s + 1];
      crop[d + 2] = rgba[s + 2];
      crop[d + 3] = rgba[s + 3];
    }
  const headRows = Math.max(1, Math.floor(ch * 0.35));
  let hx0 = Infinity, hx1 = -Infinity;
  for (let y = 0; y < headRows; y++)
    for (let x = 0; x < cw; x++)
      if (crop[(y * cw + x) * 4 + 3] > 40) {
        hx0 = Math.min(hx0, x);
        hx1 = Math.max(hx1, x);
      }
  const anchorX = Number.isFinite(hx0) ? (hx0 + hx1) / 2 : cw / 2;
  frames.set(key, { crop, w: cw, h: ch, anchorX });
}

// optional: second step frame = mirror of the first (head stays on the same anchor)
for (const r of MIRROR_ROWS) {
  const f = frames.get(`${r},1`);
  if (!f || COLS < 3) continue;
  const flipped = Buffer.alloc(f.crop.length);
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) f.crop.copy(flipped, (y * f.w + (f.w - 1 - x)) * 4, (y * f.w + x) * 4, (y * f.w + x) * 4 + 4);
  frames.set(`${r},2`, { crop: flipped, w: f.w, h: f.h, anchorX: f.w - f.anchorX });
}

const all = [...frames.values()];
const scale = TARGET_CONTENT_H / Math.max(...all.map((f) => f.h));
const left = Math.max(...all.map((f) => f.anchorX)) * scale;
const right = Math.max(...all.map((f) => f.w - f.anchorX)) * scale;
let FW = Math.ceil(left + right) + PAD * 2;
let FH = TARGET_CONTENT_H + PAD * 2;
FW += FW % 2;
FH += FH % 2;

const layers = [];
for (const [key, f] of frames) {
  const [r, c] = key.split(",").map(Number);
  const w = Math.max(1, Math.round(f.w * scale));
  const h = Math.max(1, Math.round(f.h * scale));
  const img = await sharp(f.crop, { raw: { width: f.w, height: f.h, channels: 4 } }).resize(w, h, { kernel: "lanczos3" }).png().toBuffer();
  layers.push({ input: img, left: c * FW + PAD + Math.round(left - f.anchorX * scale), top: r * FH + FH - PAD - h });
}
const blank = { create: { width: FW * COLS, height: FH * ROWS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } };
const sheet = await sharp(blank).composite(layers).png().toBuffer();
await sharp(sheet).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(OUT);

// preview on a floor-coloured background with frame guides (red frames, blue baseline)
const guides = [];
for (let r = 0; r < ROWS; r++)
  for (let c = 0; c < COLS; c++) {
    const svg = `<svg width="${FW}" height="${FH}" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="${FW - 1}" height="${FH - 1}" fill="none" stroke="rgb(200,120,120)"/><line x1="0" y1="${FH - PAD}" x2="${FW}" y2="${FH - PAD}" stroke="rgb(80,160,230)"/></svg>`;
    guides.push({ input: Buffer.from(svg), left: c * FW, top: r * FH });
  }
await sharp({ create: { width: FW * COLS, height: FH * ROWS, channels: 4, background: { r: 243, g: 233, b: 219, alpha: 1 } } })
  .composite([{ input: sheet }, ...guides])
  .png()
  .toBuffer()
  .then((b) => sharp(b).resize(FW * COLS * 2, FH * ROWS * 2, { kernel: "nearest" }).toFile(PREVIEW));

console.log(`frameWidth ${FW}, frameHeight ${FH}, contentHeight ${TARGET_CONTENT_H}, padding ${PAD}, sheet ${FW * COLS}x${FH * ROWS}`);
