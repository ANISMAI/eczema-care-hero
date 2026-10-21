import { CHARACTERS, NPC_WALKER_SHEETS, type CharacterSheet } from "../data/assets";
import { handSvg } from "./case/HandArt";

// Small looping animations for the "How to play" cards, made from the game's own sprites and
// art (no video files, no text inside, so they work in every language). Each returns the HTML
// for one 16:9-ish stage; the motion lives in title.css (.hs-*).

const SPRITE_H = 76; // on-screen height of a walking figure

/** A walking figure: one row of a walk sheet, cycling stand → step → stand → step. */
function walker(sheet: CharacterSheet, dir: "down" | "left" | "right" | "up", cls: string): string {
  const s = SPRITE_H / sheet.frameHeight;
  const fw = sheet.frameWidth * s;
  const style =
    `--fw:${fw}px;width:${fw}px;height:${SPRITE_H}px;` +
    `background-image:url('${sheet.url}');background-size:${fw * 3}px auto;` +
    `background-position-y:${-sheet.rows[dir] * SPRITE_H}px`;
  return `<span class="hs-sprite ${cls}" style="${style}"></span>`;
}

const doctor = () => CHARACTERS[0].sheet;
const amina = () => NPC_WALKER_SHEETS.amina;

const face = (src: string, cls = "") => `<span class="hs-face ${cls}"><img src="${src}" alt="" /></span>`;

export function howToScene(n: number): string {
  switch (n) {
    // 1. walking: the joystick tilts, the doctor walks across the tiles
    case 1:
      return `<div class="hs-stage hs-floor">
        ${walker(doctor(), "right", "hs-walk-across")}
        <span class="hs-joy"><span class="hs-joy-thumb"></span></span>
        <span class="hs-mapchip">🗺️</span>
      </div>`;
    // 2. calling a patient: the desk rings, the patient walks over
    case 2:
      return `<div class="hs-stage hs-floor">
        <span class="hs-desk"></span>
        <span class="hs-bubble hs-call">📢</span>
        ${walker(amina(), "right", "hs-walk-in")}
      </div>`;
    // 3. care: the cream tool smooths gently over the hand, which gets a soft sheen
    case 3:
      return `<div class="hs-stage hs-soft">
        <div class="hs-hand">${handSvg()}<span class="hs-sheen"></span><span class="hs-finger"></span></div>
        <span class="hs-tool">🧴</span>
        <span class="hs-check">✓</span>
      </div>`;
    // 4. the queue: patience rings drain green → orange; the first patient is called in
    case 4:
      return `<div class="hs-stage hs-soft">
        <div class="hs-queue">
          ${face("assets/portraits/amina.webp", "q1")}
          ${face("assets/portraits/daniel.webp", "q2")}
          ${face("assets/portraits/wong.webp", "q3")}
        </div>
        <span class="hs-bubble hs-come">🙂</span>
      </div>`;
    // 5. helping out: an orange ! bounces, a box drops into the empty slot, coins pop
    case 5:
      return `<div class="hs-stage hs-soft">
        <div class="hs-shelf"><span>🧤</span><span>🩹</span><span class="hs-slot"></span><span>🧻</span></div>
        <span class="hs-alert">!</span>
        <span class="hs-box">🧴</span>
        <span class="hs-coins">+15 🪙</span>
      </div>`;
    // 6. end of the day: the clock runs to 5, the sky turns to sunset, stars appear
    default:
      return `<div class="hs-stage hs-sky">
        <span class="hs-sun"></span>
        <span class="hs-clock"><span class="hs-hand-h"></span><span class="hs-hand-m"></span></span>
        <span class="hs-stars">⭐⭐⭐</span>
      </div>`;
  }
}
