import type { SheetDef } from "../data/assets";

/**
 * Shows one frame of a spritesheet as a CSS background, scaled so the whole frame is
 * `height` px tall. Sheets have 3 frames per row. The element's size is set to one frame;
 * `--fw` holds the scaled frame width for CSS walk-cycle animations.
 */
export function spritePortrait(el: HTMLElement, sheet: SheetDef, frame: number, height: number): void {
  const s = height / sheet.frameHeight;
  const fw = sheet.frameWidth * s;
  el.style.setProperty("--fw", `${fw}px`);
  el.style.width = `${fw}px`;
  el.style.height = `${height}px`;
  el.style.backgroundImage = `url("${sheet.url}")`;
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundSize = `${fw * 3}px auto`;
  el.style.backgroundPosition = `${-(frame % 3) * fw}px ${-Math.floor(frame / 3) * height}px`;
}
