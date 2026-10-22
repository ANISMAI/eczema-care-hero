// Outfit colours for returning patients: the same person comes back in different clothes,
// made from their one sprite sheet by recolouring only the garment's pixels (skin, hair, face,
// hijab and bags keep their colours). Pure pixel code (no DOM, no Phaser), so it is shared by
// the game (systems/Outfits.ts) and by tests / the preview tool.
//
// A garment is found by its colour (hue range plus saturation and brightness limits), and only
// inside a band of the figure's height (fractions of the frame), which keeps similar colours in
// the face (cheeks, lips) out. Two ways to recolour:
//   shift – coloured cloth: the hue becomes the variant's hue, shading and folds are kept
//   tint  – white cloth: coloured in with the variant's colour, keeping the brightness

export interface OutfitRule {
  /** Garment hue range in degrees (from > to wraps through 0, e.g. reds: [335, 12]). */
  hue: [number, number];
  sat: [number, number];
  val: [number, number];
  /** Rows of a walk frame / sit frame the garment can be in (fractions of the frame height). */
  band: [number, number];
  sitBand: [number, number];
  mode: "shift" | "tint";
}

export interface OutfitVariant {
  /** Target hue in degrees. */
  hue: number;
  /** Saturation scale for "shift" (1 = keep), or the saturation to colour white in for "tint". */
  sat?: number;
  /** Brightness scale (1 = keep). */
  val?: number;
}

export interface OutfitDef {
  /** What changes, for the record ("teal blouse"). */
  garment: string;
  rule: OutfitRule;
  /** Outfit 0 is always the original art; these are outfits 1, 2, 3. */
  variants: OutfitVariant[];
}

// from the shoulders down (high enough to catch the shoulder seen from the side)
const WALK_BAND: [number, number] = [0.46, 0.97];
const SIT_BAND: [number, number] = [0.4, 0.97];

export const OUTFITS: Record<string, OutfitDef> = {
  amina: {
    garment: "teal blouse",
    rule: { hue: [158, 200], sat: [0.18, 1], val: [0.2, 1], band: WALK_BAND, sitBand: SIT_BAND, mode: "shift" },
    variants: [{ hue: 330 }, { hue: 268 }, { hue: 45, sat: 1.1 }],
  },
  daniel: {
    garment: "light blue shirt",
    rule: { hue: [192, 238], sat: [0.12, 1], val: [0.45, 1], band: WALK_BAND, sitBand: SIT_BAND, mode: "shift" },
    variants: [{ hue: 140, sat: 1.5 }, { hue: 0, sat: 1.3 }, { hue: 48, sat: 1.7 }],
  },
  siti: {
    garment: "navy school skirt",
    rule: { hue: [205, 268], sat: [0.25, 1], val: [0.12, 0.85], band: [0.6, 0.97], sitBand: [0.55, 0.97], mode: "shift" },
    variants: [{ hue: 150, val: 1.05 }, { hue: 345, val: 1.05 }, { hue: 275 }],
  },
  sarah: {
    garment: "mustard kurta",
    rule: { hue: [30, 50], sat: [0.68, 1], val: [0.3, 1], band: WALK_BAND, sitBand: SIT_BAND, mode: "shift" },
    variants: [{ hue: 172, sat: 0.6, val: 0.85 }, { hue: 330, sat: 0.8 }, { hue: 210, sat: 0.75 }],
  },
  wong: {
    garment: "beige shirt",
    rule: { hue: [27.5, 40], sat: [0.12, 0.37], val: [0.68, 1], band: [0.46, 0.72], sitBand: [0.4, 0.7], mode: "shift" },
    variants: [{ hue: 205, sat: 1.4 }, { hue: 125, sat: 1.0, val: 0.95 }, { hue: 350, sat: 1.3 }],
  },
  farid: {
    garment: "olive shirt",
    rule: { hue: [42, 90], sat: [0.25, 1], val: [0.15, 1], band: [0.46, 0.97], sitBand: [0.4, 0.97], mode: "shift" },
    variants: [{ hue: 205 }, { hue: 0, sat: 0.9 }, { hue: 285, sat: 0.7 }],
  },
  rohana: {
    garment: "red floral baju kurung",
    rule: { hue: [335, 12], sat: [0.42, 1], val: [0.25, 1], band: [0.47, 0.97], sitBand: [0.4, 0.97], mode: "shift" },
    variants: [{ hue: 205 }, { hue: 130, sat: 0.85 }, { hue: 285 }],
  },
  suresh: {
    garment: "white shirt",
    rule: { hue: [0, 360], sat: [0, 0.12], val: [0.72, 1], band: [0.5, 0.74], sitBand: [0.42, 0.72], mode: "tint" },
    variants: [{ hue: 205, sat: 0.32 }, { hue: 130, sat: 0.28 }, { hue: 15, sat: 0.3 }],
  },
};

/** Number of outfits a patient has (the original plus their variants); 1 if none. */
export function outfitCount(patientId: string): number {
  return 1 + (OUTFITS[patientId]?.variants.length ?? 0);
}

// ---------- colour maths ----------

function toHsv(r: number, g: number, b: number): [number, number, number] {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

function toRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const [r, g, b] = hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x];
  const m = v - c;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function inHue(h: number, [from, to]: [number, number]): boolean {
  return from <= to ? h >= from && h <= to : h >= from || h <= to;
}

/** True if this pixel (at row `y` of a frame `frameHeight` tall) belongs to the garment. */
export function isGarment(r: number, g: number, b: number, y: number, frameHeight: number, rule: OutfitRule, sitting: boolean): boolean {
  const [top, bottom] = sitting ? rule.sitBand : rule.band;
  const f = (y % frameHeight) / frameHeight;
  if (f < top || f > bottom) return false;
  const [h, s, v] = toHsv(r, g, b);
  return inHue(h, rule.hue) && s >= rule.sat[0] && s <= rule.sat[1] && v >= rule.val[0] && v <= rule.val[1];
}

/**
 * Recolours the garment in an RGBA pixel buffer in place (a whole sprite sheet whose frames are
 * `frameHeight` tall). Returns how many pixels changed.
 */
export function recolorPixels(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  frameHeight: number,
  def: OutfitDef,
  variant: OutfitVariant,
  sitting = false
): number {
  let changed = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 8) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (!isGarment(r, g, b, y, frameHeight, def.rule, sitting)) continue;
      const [, s, v] = toHsv(r, g, b);
      const [nr, ng, nb] =
        def.rule.mode === "tint"
          ? toRgb(variant.hue, (variant.sat ?? 0.3) * (0.6 + 0.4 * v), Math.min(1, v * (variant.val ?? 1)))
          : toRgb(variant.hue, Math.min(1, s * (variant.sat ?? 1)), Math.min(1, v * (variant.val ?? 1)));
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
      changed++;
    }
  }
  return changed;
}
