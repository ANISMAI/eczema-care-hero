"""Recolour light/medium blue fabric (e.g. a hijab) on a character sheet to another hue.

Only pixels that are blue, moderately saturated and not dark are changed, so navy clothing,
dark outlines, white coats and skin stay untouched; folds and shading are preserved.

usage:
  pip install pillow numpy
  python tools/recolor-fabric.py <input> <output.webp> [target_hue_deg] [sat_mul] [val_mul]

The doctor's lavender hijab was made with:
  python tools/recolor-fabric.py src/assets/characters/doctor-hijab-walk-sheet.webp       src/assets/characters/doctor-hijab-lavender-walk-sheet.webp 275 0.5 1.2
Then slice the result with tools/slice-sprite-sheet.py.
"""
import sys

import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
target_h = float(sys.argv[3]) if len(sys.argv) > 3 else 275
sat_mul = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
val_mul = float(sys.argv[5]) if len(sys.argv) > 5 else 1.2

im = Image.open(src).convert("RGBA")
a = np.asarray(im).astype(np.float64)
rgb = a[:, :, :3] / 255
mx, mn = rgb.max(2), rgb.min(2)
d = mx - mn
v = mx
s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
h = np.zeros_like(mx)
m = d > 1e-6
h = np.where(m & (mx == r), ((g - b) / np.maximum(d, 1e-6)) % 6, h)
h = np.where(m & (mx == g), (b - r) / np.maximum(d, 1e-6) + 2, h)
h = np.where(m & (mx == b), (r - g) / np.maximum(d, 1e-6) + 4, h)
h = h * 60

# dusty-blue fabric: blue hue, moderate saturation, not dark (navy stays)
mask = (h > 195) & (h < 238) & (s > 0.12) & (s < 0.8) & (v > 0.42) & (a[..., 3] > 0)
# soft edge between the band and its surroundings
w = np.clip((v - 0.42) / 0.08, 0, 1) * mask

nh = np.full_like(h, target_h) + (h - 216) * 0.6  # keep a little of the original hue variation
ns = np.clip(s * sat_mul, 0, 1)
nv = np.clip(v * val_mul, 0, 1)

c = nv * ns
hp = (nh % 360) / 60
x = c * (1 - np.abs(hp % 2 - 1))
z = np.zeros_like(c)
conds = [hp < 1, hp < 2, hp < 3, hp < 4, hp < 5, hp >= 5]
rgbs = [(c, x, z), (x, c, z), (z, c, x), (z, x, c), (x, z, c), (c, z, x)]
nr = np.select(conds, [t[0] for t in rgbs])
ng = np.select(conds, [t[1] for t in rgbs])
nb = np.select(conds, [t[2] for t in rgbs])
mm = nv - c
new = np.dstack([nr + mm, ng + mm, nb + mm])

res = rgb * (1 - w[..., None]) + new * w[..., None]
outa = np.dstack([res * 255, a[..., 3]]).clip(0, 255).astype(np.uint8)
Image.fromarray(outa, "RGBA").save(out, "WEBP", lossless=True)
print("recoloured pixels:", int(mask.sum()))
