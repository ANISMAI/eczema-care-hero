// Node.js port of tools/make-portrait.py: a sharp head-and-shoulders portrait (staff ID cards,
// patient queue and dialogs) from an AI source sheet.
//
// The in-game spritesheets are small (180 px frames), so they look blurry when shown large in
// the UI. This cuts the portrait straight from the full-size source sheet instead, using the
// slicer for clean-up and alignment, then keeps the top part of one frame.
//
// usage:
//   node tools/make-portrait.mjs <source sheet> <out.webp> [--rows 4] [--cols 3] [--frame 0] [--keep 0.6]
//
// --frame  which frame to use (0 = first row, first column: the front-facing idle pose)
// --keep   fraction of the frame height to keep from the top (0.6 = head and shoulders)

import sharp from "sharp";
import { execFileSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? Number(argv[i + 1]) : def;
};
const [SRC, OUT] = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
const ROWS = opt("rows", 4);
const COLS = opt("cols", 3);
const FRAME = opt("frame", 0);
const KEEP = opt("keep", 0.6);
sharp.cache(false); // otherwise Windows keeps the temp sheet open and the folder cannot be removed

const HEIGHT = 520; // figure height before cropping; the portrait ends up ~330 px tall

const slicer = path.join(path.dirname(fileURLToPath(import.meta.url)), "slice-sprite-sheet.mjs");
const tmp = mkdtempSync(path.join(tmpdir(), "portrait-"));
try {
  const sheetPath = path.join(tmp, "sheet.webp");
  const out = execFileSync(
    process.execPath,
    [slicer, SRC, sheetPath, path.join(tmp, "p.png"), "--rows", String(ROWS), "--cols", String(COLS), "--height", String(HEIGHT)],
    { encoding: "utf8" }
  );
  const fw = Number(out.split("frameWidth ")[1].split(",")[0]);
  const fh = Number(out.split("frameHeight ")[1].split(",")[0]);
  const r = Math.floor(FRAME / COLS);
  const c = FRAME % COLS;
  const { data, info } = await sharp(sheetPath)
    .extract({ left: c * fw, top: r * fh, width: fw, height: fh })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // first non-transparent row (top of the head)
  let top = 0;
  find: for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 0) {
        top = y;
        break find;
      }
  const y0 = Math.max(0, top - 8);
  const h = Math.min(info.height - y0, Math.round(fh * KEEP));
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: 0, top: y0, width: fw, height: h })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(OUT);
  console.log(`portrait ${fw}x${h} -> ${OUT}`);
} finally {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    // a leftover temp folder is harmless
  }
}
