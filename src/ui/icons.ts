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
  | "basket"
  | "gloves"
  | "plaster"
  | "gauze"
  | "cream-tub"
  | "mask"
  | "sunscreen"
  | "cotton-pads"
  | "sanitiser";

const ICONS: Record<IconName, string> = {
  gloves:
    `<path d="M16 42v-6L7 25c-2-3 2-7 5-4l4 4V13a3 3 0 0 1 6 0v10V8a3 3 0 0 1 6 0v15V11a3 3 0 0 1 6 0v14V18a3 3 0 0 1 6 0v13q0 5-6 8v3Z" fill="#8bc8ec" ${line}/>` +
    `<path d="M17 36h17" fill="none" ${line}/><path d="M19 29v3m5-5v5" stroke="#eaf8ff" stroke-width="2.5" stroke-linecap="round"/>`,
  plaster:
    `<g transform="rotate(-35 24 24)"><rect x="5" y="15" width="38" height="18" rx="7" fill="#edba88" ${line}/>` +
    `<rect x="17" y="17" width="14" height="14" rx="3" fill="#fff3e5" ${line}/>` +
    `<g fill="#a7734d"><circle cx="11" cy="21" r="1.3"/><circle cx="11" cy="27" r="1.3"/><circle cx="37" cy="21" r="1.3"/><circle cx="37" cy="27" r="1.3"/></g></g>`,
  gauze:
    `<path d="M11 12h18v27H7v-8h4Z" fill="#fffdf5" ${line}/>` +
    `<path d="M13 18h10m-10 5h10m-10 5h10m-12 6h12" stroke="#c8d1dc" stroke-width="1.5"/>` +
    `<ellipse cx="29" cy="25.5" rx="11" ry="14.5" fill="#f4f0e7" ${line}/><ellipse cx="29" cy="25.5" rx="4" ry="7" fill="#c8c5c3" ${line}/>` +
    `<path d="M24 16q5-4 9 1" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`,
  "cream-tub":
    `<path d="M9 19h30v16q0 7-15 7T9 35Z" fill="#c5ecdf" ${line}/>` +
    `<rect x="7" y="11" width="34" height="11" rx="4" fill="#73b4b5" ${line}/><path d="M12 15h24" stroke="#d9f5ef" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="14" y="26" width="20" height="10" rx="2" fill="#fff"/><path d="M21 31h6m-3-3v6" stroke="#559c9c" stroke-width="2" stroke-linecap="round"/>`,
  mask:
    `<path d="M10 18C0 13 1 32 11 32m27-14c10-5 9 14-1 14" fill="none" ${line}/>` +
    `<path d="M10 14q14 4 28 0v19q-14 9-28 0Z" fill="#9dd7eb" ${line}/>` +
    `<path d="M15 21q9 3 18 0m-18 6q9 3 18 0m-16 6q7 2 14 0" fill="none" stroke="#5f9fb9" stroke-width="2" stroke-linecap="round"/>`,
  sunscreen:
    `<path d="M12 7h24l-3 29H15Z" fill="#ffe3a0" ${line}/><path d="M13 13h22" fill="none" ${line}/>` +
    `<rect x="15" y="36" width="18" height="7" rx="2" fill="#f7b75d" ${line}/>` +
    `<circle cx="24" cy="24" r="5" fill="#f2a638"/><path d="M24 15v2m0 14v2m-9-9h2m14 0h2m-15-6 1.5 1.5m9 9L30 30m-12 0 1.5-1.5m9-9L30 18" stroke="#d98c25" stroke-width="2" stroke-linecap="round"/>`,
  "cotton-pads":
    `<ellipse cx="24" cy="33" rx="17" ry="9" fill="#e6e5ed" ${line}/><ellipse cx="24" cy="26" rx="17" ry="9" fill="#f3edf5" ${line}/>` +
    `<ellipse cx="24" cy="19" rx="17" ry="10" fill="#fffafc" ${line}/><path d="M14 19q10-9 20 0m-18 5q8-5 16 0" fill="none" stroke="#e5dbe7" stroke-width="1.8" stroke-linecap="round"/>`,
  sanitiser:
    `<path d="M21 5h15v5H25v5" fill="#b9c8da" ${line}/><rect x="18" y="12" width="12" height="7" rx="2" fill="#d4dfeb" ${line}/>` +
    `<rect x="11" y="19" width="26" height="24" rx="6" fill="#a8dce7" ${line}/><rect x="15" y="25" width="18" height="12" rx="3" fill="#effafd"/>` +
    `<path d="M24 27q-7 8 0 8q7 0 0-8Z" fill="#67a9c3"/><path d="M15 23v12" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
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
