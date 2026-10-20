import Phaser from "phaser";
import { gameConfig } from "./game/config";
import { RENDER_SCALE, viewportSize } from "./game/display";
import "./style.css";
import "./ui/case/case.css";
import "./ui/case/care.css";

// `?reset=1`: wipe this game's saved progress (all its localStorage keys) and start over.
// The flag is removed from the address bar so a later reload doesn't wipe again.
const params = new URLSearchParams(window.location.search);
if (params.has("reset")) {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("eczema-care-hero"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // storage unavailable: nothing to wipe
  }
  params.delete("reset");
  const rest = params.toString();
  window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash);
}

const game = new Phaser.Game(gameConfig);

// Keep the canvas matched to the screen on rotation / window resize.
let pending = 0;
const fitToScreen = () => {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(() => {
    const { width, height } = viewportSize();
    game.scale.resize(width * RENDER_SCALE, height * RENDER_SCALE);
  });
};
window.addEventListener("resize", fitToScreen);
window.addEventListener("orientationchange", fitToScreen);
window.visualViewport?.addEventListener("resize", fitToScreen);

// Dev-only handle for debugging/perf checks from the browser console (stripped from builds).
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
