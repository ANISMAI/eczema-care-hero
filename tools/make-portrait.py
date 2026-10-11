"""Make a sharp head-and-shoulders portrait (for staff ID cards) from an AI source sheet.

The in-game spritesheets are small (180 px frames), so they look blurry when shown large in the
UI. This cuts the portrait straight from the full-size source sheet instead, using the slicer
for clean-up and alignment, then keeps the top part of one frame.

usage:
  pip install pillow numpy scipy
  python tools/make-portrait.py <source sheet> <out.webp> [--rows 4] [--cols 3] [--frame 0]
      [--keep 0.6]

--frame  which frame to use (0 = first row, first column: the front-facing idle pose)
--keep   fraction of the frame height to keep from the top (0.6 = head and shoulders)
"""
import argparse
import os
import subprocess
import sys
import tempfile

from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("out")
ap.add_argument("--rows", type=int, default=4)
ap.add_argument("--cols", type=int, default=3)
ap.add_argument("--frame", type=int, default=0)
ap.add_argument("--keep", type=float, default=0.6)
args = ap.parse_args()

HEIGHT = 520  # figure height before cropping; the portrait ends up ~330 px tall

slicer = os.path.join(os.path.dirname(os.path.abspath(__file__)), "slice-sprite-sheet.py")
with tempfile.TemporaryDirectory() as tmp:
    sheet_path = os.path.join(tmp, "sheet.webp")
    out = subprocess.run(
        [sys.executable, slicer, args.src, sheet_path, os.path.join(tmp, "p.png"),
         "--rows", str(args.rows), "--cols", str(args.cols), "--height", str(HEIGHT)],
        check=True, capture_output=True, text=True,
    ).stdout
    fw = int(out.split("frameWidth ")[1].split(",")[0])
    fh = int(out.split("frameHeight ")[1].split(",")[0])
    sheet = Image.open(sheet_path).convert("RGBA")
    r, c = divmod(args.frame, args.cols)
    frame = sheet.crop((c * fw, r * fh, (c + 1) * fw, (r + 1) * fh))

top = frame.getbbox()[1]  # first non-transparent row (top of the head)
crop = frame.crop((0, max(0, top - 8), fw, max(0, top - 8) + round(fh * args.keep)))
crop.save(args.out, "WEBP", quality=90, alpha_quality=100, method=6)
print(f"portrait {crop.size[0]}x{crop.size[1]} -> {args.out}")
