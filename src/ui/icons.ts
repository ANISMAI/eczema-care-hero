// Hand-drawn SVG icons in the clinic's style (soft dark outline, pastel fills, a white
// highlight), used instead of emoji so they look the same on every phone and match the art.
// Each icon is drawn in a 48 x 48 box; size it with CSS (the <svg> fills its parent).

const INK = "#3d3550";
const line = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;

const svg = (body: string) => `<svg class="ico" viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;

export type IconName =
  | "soap"
  | "water"
  | "towel"
  | "cream"
  | "hot"
  | "scented"
  | "scrub"
  | "lens"
  | "phone"
  | "basket";

const ICONS: Record<IconName, string> = {
  // a bar of gentle soap with bubbles
  soap:
    `<ellipse cx="24" cy="38" rx="15" ry="3" fill="#000" opacity="0.08"/>` +
    `<rect x="9" y="22" width="28" height="15" rx="7" fill="#d9ccf7" ${line}/>` +
    `<rect x="13" y="25" width="12" height="3" rx="1.5" fill="#fff" opacity="0.8"/>` +
    `<circle cx="33" cy="14" r="6" fill="#eaf6ff" ${line}/><circle cx="21" cy="12" r="4" fill="#eaf6ff" ${line}/>` +
    `<circle cx="38" cy="22" r="3" fill="#eaf6ff" ${line}/><circle cx="31.5" cy="12.5" r="1.6" fill="#fff"/>`,
  // a clear water drop
  water:
    `<path d="M24 6 C 30 15, 37 22, 37 30 A 13 13 0 0 1 11 30 C 11 22, 18 15, 24 6 Z" fill="#8fd0f5" ${line}/>` +
    `<path d="M17 29 a7 7 0 0 0 5 8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  // a folded soft towel
  towel:
    `<rect x="9" y="12" width="30" height="26" rx="5" fill="#ffd4e2" ${line}/>` +
    `<path d="M9 20 h30" ${line} fill="none"/>` +
    `<rect x="13" y="26" width="22" height="3" rx="1.5" fill="#fff" opacity="0.8"/>` +
    `<rect x="13" y="32" width="14" height="2.5" rx="1.25" fill="#f5a6c0"/>`,
  // a fragrance-free pump bottle (no flower, plain label)
  cream:
    `<rect x="20" y="4" width="8" height="6" rx="1.5" fill="#cfd6df" ${line}/>` +
    `<path d="M28 7 h6" ${line}/>` +
    `<rect x="18" y="10" width="12" height="6" rx="2" fill="#e6ebf1" ${line}/>` +
    `<rect x="12" y="16" width="24" height="27" rx="8" fill="#ffffff" ${line}/>` +
    `<rect x="16" y="25" width="16" height="10" rx="3" fill="#bfeedd"/>` +
    `<path d="M20 30 l2.5 2.5 l5 -5" fill="none" stroke="#1b8565" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<rect x="15" y="19" width="3" height="18" rx="1.5" fill="#fff" opacity="0.9"/>`,
  // a hot (red) drop with steam
  hot:
    `<path d="M24 12 C 29 19, 35 25, 35 31 A 11 11 0 0 1 13 31 C 13 25, 19 19, 24 12 Z" fill="#ff8a65" ${line}/>` +
    `<path d="M15 9 q3 -3 0 -6 M24 8 q3 -3 0 -6 M33 9 q3 -3 0 -6" fill="none" stroke="#ff8a65" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M18 30 a6 6 0 0 0 4 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  // a scented lotion bottle with a flower
  scented:
    `<rect x="19" y="5" width="10" height="7" rx="2" fill="#f5a6c0" ${line}/>` +
    `<path d="M14 18 q0 -6 10 -6 q10 0 10 6 v19 a6 6 0 0 1 -6 6 h-8 a6 6 0 0 1 -6 -6 Z" fill="#ffe1ec" ${line}/>` +
    `<g transform="translate(24 28)"><circle r="3.4" cy="-4.5" fill="#f0679e"/><circle r="3.4" cx="4.3" cy="-1.4" fill="#f0679e"/><circle r="3.4" cx="2.6" cy="3.6" fill="#f0679e"/><circle r="3.4" cx="-2.6" cy="3.6" fill="#f0679e"/><circle r="3.4" cx="-4.3" cy="-1.4" fill="#f0679e"/><circle r="2.2" fill="#f9c833"/></g>` +
    `<path d="M33 8 l2 -2 M36 12 l3 -1" stroke="#f0679e" stroke-width="2.2" stroke-linecap="round"/>`,
  // a rough sponge
  scrub:
    `<path d="M10 18 q2 -8 14 -7 q12 -1 14 7 q3 9 -1 16 q-4 5 -13 4 q-10 1 -13 -4 q-4 -7 -1 -16 Z" fill="#f9c833" ${line}/>` +
    `<circle cx="18" cy="20" r="2.4" fill="#cf9810"/><circle cx="28" cy="18" r="2" fill="#cf9810"/><circle cx="31" cy="28" r="2.6" fill="#cf9810"/>` +
    `<circle cx="20" cy="30" r="2" fill="#cf9810"/><circle cx="25" cy="25" r="1.6" fill="#cf9810"/>` +
    `<path d="M14 16 q4 -3 9 -3" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`,
  lens:
    `<path d="M30 30 L41 41" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M30 30 L41 41" stroke="#8f6ee0" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="20" cy="20" r="12" fill="#eaf6ff" ${line}/>` +
    `<path d="M14 16 a7 7 0 0 1 6 -4" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  phone:
    `<rect x="14" y="5" width="20" height="38" rx="5" fill="#8f6ee0" ${line}/>` +
    `<rect x="17" y="10" width="14" height="24" rx="2" fill="#eaf6ff"/>` +
    `<circle cx="24" cy="38.5" r="1.8" fill="#fff"/>`,
  basket:
    `<path d="M12 18 q12 -14 24 0" fill="none" ${line}/>` +
    `<path d="M7 18 h34 l-4 20 a3 3 0 0 1 -3 2.5 h-20 a3 3 0 0 1 -3 -2.5 Z" fill="#e4b97f" ${line}/>` +
    `<path d="M13 25 h22 M14 31 h20" stroke="#a8763c" stroke-width="2" stroke-linecap="round"/>`,
};

export function icon(name: IconName): string {
  return svg(ICONS[name]);
}

/** The patient's face for the comfort meter: uncomfortable → okay → happy, or wincing. */
export type Mood = "sore" | "okay" | "happy" | "wince";

export function face(mood: Mood): string {
  const eyes: Record<Mood, string> = {
    sore: `<path d="M14 20 q3 -3 7 -1 M34 20 q-3 -3 -7 -1" fill="none" ${line}/><circle cx="18" cy="25" r="2" fill="${INK}"/><circle cx="30" cy="25" r="2" fill="${INK}"/>`,
    okay: `<circle cx="18" cy="22" r="2.4" fill="${INK}"/><circle cx="30" cy="22" r="2.4" fill="${INK}"/>`,
    happy: `<path d="M14 23 q4 -5 8 0 M26 23 q4 -5 8 0" fill="none" ${line}/>`,
    wince: `<path d="M14 19 l6 4 l-6 4 M34 19 l-6 4 l6 4" fill="none" ${line}/>`,
  };
  const mouth: Record<Mood, string> = {
    sore: `<path d="M18 34 q6 -5 12 0" fill="none" ${line}/>`,
    okay: `<path d="M18 32 q6 3 12 0" fill="none" ${line}/>`,
    happy: `<path d="M16 30 q8 9 16 0 Z" fill="#f0679e" ${line}/>`,
    wince: `<path d="M17 33 q3.5 -3 7 0 q3.5 3 7 0" fill="none" ${line}/>`,
  };
  const blush = mood === "happy" || mood === "okay" ? `<ellipse cx="12" cy="29" rx="3.5" ry="2" fill="#f5a6c0"/><ellipse cx="36" cy="29" rx="3.5" ry="2" fill="#f5a6c0"/>` : "";
  const sweat = mood === "wince" || mood === "sore" ? `<path d="M38 12 q3 4 0 6 q-3 -2 0 -6 Z" fill="#8fd0f5" stroke="${INK}" stroke-width="1.6"/>` : "";
  const skin = mood === "wince" ? "#ffc9a8" : "#ffd9b8";
  return svg(`<circle cx="24" cy="25" r="18" fill="${skin}" ${line}/>` + blush + eyes[mood] + mouth[mood] + sweat);
}
