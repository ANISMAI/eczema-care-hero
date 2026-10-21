import { PAL, outline, shade, toCss } from "./palette";

// Small side-view vehicles for the title-screen town, in the clinic's style (flat pastel fills,
// darker outlines of the same hue). Each is drawn facing right with its wheels touching y = 0
// and centred on x = 0; the traffic layer mirrors it to drive left.

const c = toCss;
const o = (color: number) => c(outline(color));

export type VehicleKind = "car" | "moto" | "ambulance";

export interface VehicleArt {
  svg: string;
  /** Length in viewBox units (for spacing). */
  length: number;
}

/** A wheel whose spokes turn (CSS .tv-spin). */
function wheel(x: number, r: number): string {
  return (
    `<circle cx="${x}" cy="${-r}" r="${r}" fill="${c(PAL.ink)}"/>` +
    `<circle cx="${x}" cy="${-r}" r="${r * 0.48}" fill="${c(PAL.steel)}"/>` +
    `<g class="tv-spin" style="transform-origin:${x}px ${-r}px">` +
    `<line x1="${x - r * 0.42}" y1="${-r}" x2="${x + r * 0.42}" y2="${-r}" stroke="${c(PAL.steelDark)}" stroke-width="1.6"/>` +
    `<line x1="${x}" y1="${-r - r * 0.42}" x2="${x}" y2="${-r + r * 0.42}" stroke="${c(PAL.steelDark)}" stroke-width="1.6"/></g>`
  );
}

const shadow = (len: number) => `<ellipse cx="0" cy="1" rx="${len * 0.52}" ry="5" fill="${c(PAL.shadow)}" opacity="0.2"/>`;

function car(color: number): VehicleArt {
  const glass = "#cfe8fb";
  let body = "";
  // cabin (behind the body), with two windows and a pillar
  body += `<path d="M-24 -24 L-16 -42 Q-14 -45 -10 -45 L14 -45 Q18 -45 20 -42 L30 -24 Z" fill="${c(color)}" stroke="${o(color)}" stroke-width="2.5" stroke-linejoin="round"/>`;
  body += `<path d="M-18 -25 L-12 -39 L-2 -39 L-2 -25 Z" fill="${glass}"/>`;
  body += `<path d="M2 -25 L2 -39 L14 -39 L23 -25 Z" fill="${glass}"/>`;
  body += `<line x1="-14" y1="-37" x2="-8" y2="-37" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`;
  // lower body
  body += `<rect x="-46" y="-28" width="92" height="22" rx="9" fill="${c(color)}" stroke="${o(color)}" stroke-width="2.5"/>`;
  body += `<rect x="-42" y="-22" width="84" height="3" rx="1.5" fill="${c(shade(color, 0.35))}"/>`;
  body += `<line x1="-2" y1="-26" x2="-2" y2="-10" stroke="${o(color)}" stroke-width="1.5" opacity="0.6"/>`;
  body += `<rect x="6" y="-20" width="7" height="2.5" rx="1.2" fill="${o(color)}" opacity="0.7"/>`;
  // lights and bumpers
  body += `<rect x="38" y="-24" width="8" height="6" rx="2.5" fill="#fff3b8" stroke="${o(color)}" stroke-width="1.5"/>`;
  body += `<rect x="-46" y="-24" width="6" height="6" rx="2" fill="${c(PAL.pink)}"/>`;
  body += `<rect x="-48" y="-11" width="96" height="5" rx="2.5" fill="${c(PAL.steel)}" stroke="${c(PAL.steelDark)}" stroke-width="1.2"/>`;
  return {
    length: 96,
    svg: shadow(96) + `<g class="tv-bob">${body}</g>` + wheel(-26, 9) + wheel(26, 9),
  };
}

function ambulance(): VehicleArt {
  const white = 0xffffff;
  let body = "";
  body += `<rect x="-52" y="-50" width="76" height="44" rx="8" fill="${c(white)}" stroke="${o(PAL.steel)}" stroke-width="2.5"/>`;
  body += `<path d="M24 -36 L40 -36 Q46 -36 49 -30 L54 -18 L54 -8 Q54 -6 52 -6 L24 -6 Z" fill="${c(white)}" stroke="${o(PAL.steel)}" stroke-width="2.5" stroke-linejoin="round"/>`;
  body += `<path d="M28 -32 L40 -32 Q44 -32 46 -28 L50 -19 L28 -19 Z" fill="#cfe8fb"/>`;
  // stripe and the red cross
  body += `<rect x="-50" y="-20" width="102" height="5" fill="${c(PAL.pink)}"/>`;
  body += `<rect x="-19" y="-44" width="8" height="22" rx="1.5" fill="${c(PAL.pink)}"/><rect x="-26" y="-37" width="22" height="8" rx="1.5" fill="${c(PAL.pink)}"/>`;
  // flashing light bar
  body += `<rect x="-6" y="-57" width="20" height="7" rx="3" fill="${c(PAL.steel)}"/>`;
  body += `<rect class="tv-flash a" x="-5" y="-56" width="8" height="5" rx="2" fill="#ff5a6e"/>`;
  body += `<rect class="tv-flash b" x="5" y="-56" width="8" height="5" rx="2" fill="#5aa6ff"/>`;
  body += `<rect x="48" y="-16" width="6" height="5" rx="2" fill="#fff3b8"/>`;
  body += `<rect x="-54" y="-11" width="110" height="5" rx="2.5" fill="${c(PAL.steel)}" stroke="${c(PAL.steelDark)}" stroke-width="1.2"/>`;
  return {
    length: 110,
    svg: shadow(110) + `<g class="tv-bob">${body}</g>` + wheel(-30, 9.5) + wheel(34, 9.5),
  };
}

/** A delivery rider on a scooter, with a coloured box on the back. */
function moto(color: number, helmet: number): VehicleArt {
  let body = "";
  // delivery box
  body += `<rect x="-26" y="-46" width="20" height="18" rx="3" fill="${c(color)}" stroke="${o(color)}" stroke-width="2"/>`;
  body += `<rect x="-22" y="-40" width="12" height="3" rx="1.5" fill="#ffffff" opacity="0.8"/>`;
  // scooter body
  body += `<path d="M-22 -14 Q-22 -26 -8 -26 L8 -26 L16 -12 L22 -12 L26 -30 L30 -30 L26 -8 L-20 -8 Z" fill="${c(PAL.sky)}" stroke="${o(PAL.sky)}" stroke-width="2" stroke-linejoin="round"/>`;
  body += `<rect x="24" y="-36" width="10" height="4" rx="2" fill="${c(PAL.ink)}"/>`;
  body += `<circle cx="31" cy="-27" r="2.5" fill="#fff3b8"/>`;
  // rider
  body += `<path d="M-6 -27 L4 -27 L10 -18 L4 -16 Z" fill="${c(PAL.ink)}"/>`;
  body += `<rect x="-8" y="-46" width="14" height="20" rx="5" fill="${c(shade(color, -0.1))}" stroke="${o(color)}" stroke-width="2"/>`;
  body += `<path d="M4 -42 L20 -34" stroke="${c(PAL.skin)}" stroke-width="4" stroke-linecap="round"/>`;
  body += `<circle cx="0" cy="-54" r="9" fill="${c(PAL.skin)}" stroke="${c(PAL.skinLine)}" stroke-width="1.5"/>`;
  body += `<path d="M-10 -55 Q-10 -66 1 -66 Q11 -66 11 -55 Z" fill="${c(helmet)}" stroke="${o(helmet)}" stroke-width="2"/>`;
  body += `<rect x="3" y="-58" width="9" height="4" rx="2" fill="#cfe8fb" opacity="0.9"/>`;
  return {
    length: 62,
    svg: shadow(62) + `<g class="tv-bob">${body}</g>` + wheel(-16, 8) + wheel(22, 8),
  };
}

const CAR_COLORS = [PAL.pink, PAL.sky, PAL.yellow, PAL.mint, PAL.peach, PAL.lavender];
const BOX_COLORS = [PAL.pink, PAL.yellow, PAL.mint, PAL.peach];

/** A random vehicle: mostly cars, some delivery riders, now and then an ambulance. */
export function randomVehicle(rand: () => number = Math.random): { kind: VehicleKind; art: VehicleArt; speed: number } {
  const r = rand();
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  if (r < 0.1) return { kind: "ambulance", art: ambulance(), speed: 165 };
  if (r < 0.38) return { kind: "moto", art: moto(pick(BOX_COLORS), pick(CAR_COLORS)), speed: 175 };
  return { kind: "car", art: car(pick(CAR_COLORS)), speed: 120 + rand() * 35 };
}
