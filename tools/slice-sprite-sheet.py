"""Slice an AI-generated character sheet into a clean, aligned, transparent spritesheet.

Input: a grid of figures (any spacing; figures are detected automatically) on a white or
transparent background. Common layouts used in this project:
  walkers  --rows 4 --cols 3   rows front / left / right / back, cols stand / step / step
  idle     --rows 1 --cols 3   one character, three poses facing front
  seated   --rows 2 --cols 3   one character per row, three poses each

Output: one .webp spritesheet with equal-size frames, every figure's bottom on a shared
baseline and its head centred in the frame (so animation doesn't wobble), plus a preview PNG.
Stray specks, brush marks and faint halos left by AI background removal are cleaned up.
All figures share one scale, so relative sizes (e.g. a child next to an adult) are kept.

usage:
  pip install pillow numpy scipy
  python tools/slice-sprite-sheet.py <input> <output.webp> <preview.png> [--rows 4] [--cols 3]
      [--height 168]

After running, copy the numbers it prints into src/data/assets.ts.
"""
import argparse

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("out")
ap.add_argument("preview")
ap.add_argument("--rows", type=int, default=4)
ap.add_argument("--cols", type=int, default=3)
ap.add_argument("--height", type=int, default=168, help="tallest figure height in the output (px)")
args = ap.parse_args()
ROWS, COLS, TARGET_CONTENT_H = args.rows, args.cols, args.height
PAD = 6

im = Image.open(args.src).convert("RGBA")
src = np.asarray(im)
rgb = src[:, :, :3].astype(np.int32)
H, W = rgb.shape[:2]
minc = rgb.min(axis=2)

if (src[:, :, 3] < 10).mean() > 0.2:
    # Already transparent. Solid parts only for detection; soft edges are restored below.
    rgba = src.copy()
    solid = src[:, :, 3] > 60
else:
    # White background: remove near-white pixels connected to the image border,
    # with a soft, un-blended alpha on the anti-aliased rim.
    near_white = minc > 232
    lab, _ = ndimage.label(near_white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(border))
    dist = ndimage.distance_transform_edt(fg)
    rim = fg & (dist <= 2.5)
    alpha = fg.astype(np.float64)
    alpha[rim] = np.clip((255 - minc) / (255 - 70), 0, 1)[rim]
    col = rgb.astype(np.float64)
    a3 = np.clip(alpha, 1e-3, 1)[:, :, None]
    col = np.where(rim[:, :, None], np.clip((col - 255 * (1 - a3)) / a3, 0, 255), col)
    rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
    solid = rgba[:, :, 3] > 60

# 1) components -> grid cells (by centroid); per cell keep the main figure and pieces touching it
lab, n = ndimage.label(solid)
objs = ndimage.find_objects(lab)
areas = ndimage.sum(solid, lab, range(1, n + 1))
by_cell = {}
for i, sl in enumerate(objs, start=1):
    if sl is None or areas[i - 1] < 40:
        continue
    ys, xs = sl
    cy, cx = (ys.start + ys.stop) / 2, (xs.start + xs.stop) / 2
    cell = (min(ROWS - 1, int(cy / (H / ROWS))), min(COLS - 1, int(cx / (W / COLS))))
    by_cell.setdefault(cell, []).append((areas[i - 1], i, sl))

keep_ids = []
cells = {}
for cell, comps in by_cell.items():
    comps.sort(reverse=True)
    main_area, main_id, (mys, mxs) = comps[0]
    m = 8
    box = [mys.start - m, mxs.start - m, mys.stop + m, mxs.stop + m]
    ids = [main_id]
    for area, i, (ys, xs) in comps[1:]:
        touches = ys.start < box[2] and ys.stop > box[0] and xs.start < box[3] and xs.stop > box[1]
        if touches and area >= main_area * 0.004:
            ids.append(i)
    keep_ids += ids
    cells[cell] = ids
missing = [(r, c) for r in range(ROWS) for c in range(COLS) if (r, c) not in cells]
assert not missing, f"no figure found in cells {missing}; check --rows/--cols"

kept = np.isin(lab, keep_ids)
# keep the soft anti-aliased edge around kept figures, drop everything else (specks, halos)
edge = ndimage.binary_dilation(kept, iterations=2)
rgba[~edge] = 0

# 2) crop each frame; anchor = bottom of figure + head centre (top 35% of the figure)
frames = {}
for cell, ids in cells.items():
    mask = np.isin(lab, ids)
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    y0, x0 = max(0, y0 - 2), max(0, x0 - 2)
    y1, x1 = min(H, y1 + 2), min(W, x1 + 2)
    crop = rgba[y0:y1, x0:x1].copy()
    # only this figure's pixels (a neighbour's limb may poke into the box)
    own = ndimage.binary_dilation(mask, iterations=2)[y0:y1, x0:x1]
    crop[~own] = 0
    a = crop[:, :, 3] > 40
    head = a[: max(1, int(a.shape[0] * 0.35))]
    hx = np.nonzero(head.any(axis=0))[0]
    anchor_x = (hx.min() + hx.max()) / 2 if len(hx) else crop.shape[1] / 2
    frames[cell] = (crop, anchor_x)

scale = TARGET_CONTENT_H / max(f[0].shape[0] for f in frames.values())
left = max(f[1] for f in frames.values()) * scale
right = max((f[0].shape[1] - f[1]) for f in frames.values()) * scale
FW = int(np.ceil(left + right)) + PAD * 2
FH = TARGET_CONTENT_H + PAD * 2
FW += FW % 2
FH += FH % 2

sheet = Image.new("RGBA", (FW * COLS, FH * ROWS), (0, 0, 0, 0))
for (r, c), (crop, ax) in frames.items():
    img = Image.fromarray(crop, "RGBA")
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    img = img.resize((w, h), Image.LANCZOS)
    sheet.alpha_composite(img, (c * FW + PAD + round(left - ax * scale), r * FH + FH - PAD - h))

sheet.save(args.out, "WEBP", quality=92, alpha_quality=100, method=6)

# preview on a floor-coloured background with frame guides
prev = Image.new("RGBA", sheet.size, (243, 233, 219, 255))
prev.alpha_composite(sheet)
d = ImageDraw.Draw(prev)
for r in range(ROWS):
    for c in range(COLS):
        d.rectangle([c * FW, r * FH, (c + 1) * FW - 1, (r + 1) * FH - 1], outline=(200, 120, 120, 255))
        d.line([c * FW, (r + 1) * FH - PAD, (c + 1) * FW, (r + 1) * FH - PAD], fill=(80, 160, 230, 255))
prev = prev.resize((prev.width * 2, prev.height * 2), Image.NEAREST)
prev.save(args.preview)
print(f"frameWidth {FW}, frameHeight {FH}, contentHeight {TARGET_CONTENT_H}, padding {PAD}, sheet {sheet.size}")
