// Stylised back-of-hand illustration for the inspection and moisturiser activities.
// Drawn as SVG in a 0..100 box so hotspots and the application zone can use percentages.
// Skin signs are deliberately soft and non-graphic (brief section 05): a few light flakes,
// a faint pink tint and a subtle texture — no wounds, cracks or oozing.

const INK = "#3d3550";
const SKIN = "#f2c6a2";
const SKIN_SHADE = "#e3ad86";
const SLEEVE = "#7fc8c0";

// one outline for the whole hand: stroke every shape first, then fill them all on top
const SHAPES = `
  <rect x="30" y="7" width="10" height="32" rx="5"/>
  <rect x="41" y="2" width="10" height="36" rx="5"/>
  <rect x="52" y="6" width="10" height="33" rx="5"/>
  <rect x="63" y="14" width="9" height="26" rx="4.5"/>
  <ellipse cx="23" cy="56" rx="6" ry="14" transform="rotate(-28 23 56)"/>
  <rect x="28" y="30" width="45" height="44" rx="11"/>
  <rect x="36" y="64" width="30" height="28" rx="4"/>`;

/** The three skin signs drawn on the hand, and roughly where they are (0..100 box). */
export type HandSign = "flakes" | "redness" | "texture";
export const SIGN_AT: Record<HandSign, { x: number; y: number }> = {
  flakes: { x: 50, y: 31 },
  redness: { x: 42, y: 58 },
  texture: { x: 58, y: 80 },
};

/** The sign nearest to a point (used to show only the signs a case talks about). */
export function nearestSign(x: number, y: number): HandSign {
  return (Object.keys(SIGN_AT) as HandSign[]).reduce((best, k) =>
    Math.hypot(SIGN_AT[k].x - x, SIGN_AT[k].y - y) < Math.hypot(SIGN_AT[best].x - x, SIGN_AT[best].y - y) ? k : best
  );
}

export function handSvg(options: { signs?: boolean; only?: HandSign[] } = {}): string {
  const signs = options.signs !== false;
  const show = (k: HandSign) => !options.only || options.only.includes(k);
  const flakes = [
    [44, 31],
    [47, 28],
    [50, 32],
    [53, 29],
    [56, 33],
    [48, 35],
  ]
    .map(([x, y]) => `<path d="M${x} ${y} l2.4 -0.8" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.9"/>`)
    .join("");
  const texture = Array.from({ length: 5 }, (_, i) => {
    const x = 52 + i * 2.6;
    return `<path d="M${x} 77 l2 5 M${x + 2} 77 l-2 5" stroke="${SKIN_SHADE}" stroke-width="0.7" opacity="0.8"/>`;
  }).join("");

  return `
<svg class="hand-svg" viewBox="0 0 100 100" aria-hidden="true">
  <rect x="30" y="86" width="42" height="16" rx="3" fill="${SLEEVE}" stroke="${INK}" stroke-width="1.6"/>
  <g fill="${INK}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round">${SHAPES}</g>
  <g fill="${SKIN}">${SHAPES}</g>
  <path d="M41 30 q4 2 0 4 M52 31 q4 2 0 4 M62 32 q4 2 0 4" stroke="${SKIN_SHADE}" stroke-width="0.9" fill="none"/>
  <ellipse cx="36" cy="6" rx="2.6" ry="1.8" fill="#fbe3d3"/>
  <ellipse cx="46" cy="2.5" rx="2.6" ry="1.6" fill="#fbe3d3"/>
  <ellipse cx="57" cy="5" rx="2.6" ry="1.8" fill="#fbe3d3"/>
  <ellipse cx="67.5" cy="13.5" rx="2.4" ry="1.6" fill="#fbe3d3"/>
  ${
    signs
      ? `<g class="hand-signs">
    ${show("flakes") ? flakes : ""}
    ${show("redness") ? '<ellipse cx="42" cy="58" rx="7" ry="5" fill="#ef8f8f" opacity="0.28"/>' : ""}
    ${show("texture") ? texture : ""}
  </g>`
      : ""
  }
  <rect x="30" y="86" width="42" height="3" fill="#ffffff" opacity="0.35"/>
</svg>`;
}

/**
 * Running water for a rinse (Care Room and the tray sink): a tap at the top, a stream falling
 * onto the middle, a few drops and a soft splash. Shown while the element has the class "on".
 */
export const WATER_HTML =
  '<span class="w-tap"><span class="w-spout"></span></span>' +
  '<span class="w-stream"></span>' +
  '<span class="w-drop d1"></span><span class="w-drop d2"></span><span class="w-drop d3"></span><span class="w-drop d4"></span>' +
  '<span class="w-splash"></span>';

/** Area of the back of the hand used by the moisturiser activity (in the 0..100 box). */
export const APPLY_ZONE = { cx: 50, cy: 52, rx: 18, ry: 16 };

/** The SVG sits inset 6% inside its square stage (see .hand-svg); converts box units to stage %. */
export const toStage = (v: number) => 6 + v * 0.88;
export const toStageSize = (v: number) => v * 0.88;

/** APPLY_ZONE in stage percentages. */
export const STAGE_ZONE = {
  cx: toStage(APPLY_ZONE.cx),
  cy: toStage(APPLY_ZONE.cy),
  rx: toStageSize(APPLY_ZONE.rx),
  ry: toStageSize(APPLY_ZONE.ry),
};
