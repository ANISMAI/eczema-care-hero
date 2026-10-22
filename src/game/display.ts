// Reference (CSS-pixel) design size — portrait phone per the brief. The canvas itself always
// fills the screen, in portrait or landscape; this is only the size the layout is tuned for.
export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

/**
 * The canvas backing store is the screen size multiplied by this factor and the camera is
 * zoomed by the same amount, so vector art and text stay sharp on high-DPI phones.
 * Capped at 2 to keep low-end WebViews fast.
 */
export const RENDER_SCALE = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));

/** Current screen size in CSS pixels (falls back to the design size if not yet laid out). */
export function viewportSize(): { width: number; height: number } {
  const el = document.getElementById("app");
  return {
    width: el?.clientWidth || window.innerWidth || GAME_WIDTH,
    height: el?.clientHeight || window.innerHeight || GAME_HEIGHT,
  };
}

/** World pixels the play camera aims to show across the screen's short side. */
const VIEW_SHORT_SIDE = 480;
/** Never zoom in further than this (very large screens). */
const MAX_VIEW_ZOOM = 1.8;

/**
 * Extra camera zoom on big screens, on top of RENDER_SCALE. A phone shows about one screen of
 * clinic around the doctor (1x); a tablet or iPad would show far more and make everyone tiny,
 * so the camera moves in until the short side shows about VIEW_SHORT_SIDE world pixels.
 */
export function viewZoom(): number {
  const { width, height } = viewportSize();
  return Math.min(MAX_VIEW_ZOOM, Math.max(1, Math.min(width, height) / VIEW_SHORT_SIDE));
}

export const FONT_FAMILY = "'Nunito', 'Segoe UI', system-ui, -apple-system, sans-serif";
