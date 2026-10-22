import Phaser from "phaser";
import { gameConfig } from "./game/config";
import { RENDER_SCALE, viewportSize } from "./game/display";
import "./style.css";
import "./ui/case/case.css";
import "./ui/case/care.css";
import "./ui/case/reactions.css";
import "./ui/title.css";
import "./ui/howto.css";
import "./ui/briefing.css";
import "./ui/clockin.css";
import "./ui/phone.css";
import "./ui/events/incident.css";
import TitleScreen from "./ui/TitleScreen";
import { resetAllProgress } from "./game/settings";
import { prepareAudio } from "./game/audio";
import { prepareVoice } from "./game/voice";

// `?reset=1`: wipe this game's saved progress (all its localStorage keys) and start over.
// The flag is removed from the address bar so a later reload doesn't wipe again.
const params = new URLSearchParams(window.location.search);
if (params.has("reset")) {
  resetAllProgress();
  params.delete("reset");
  const rest = params.toString();
  window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash);
}

prepareAudio();

// Opening clouds + title, on screen from the very first frame (covers asset loading too)
new TitleScreen(document.getElementById("game-container")!);

const game = new Phaser.Game(gameConfig);
// spoken queue numbers: start loading voices and unlock speech on the first tap
prepareVoice();

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
