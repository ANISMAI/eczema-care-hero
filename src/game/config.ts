import Phaser from "phaser";
import BootScene from "../scenes/BootScene";
import ClinicScene from "../scenes/ClinicScene";
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE, viewportSize } from "./display";
import { PAL, toCss } from "../art/palette";

export { GAME_WIDTH, GAME_HEIGHT };

// The canvas fills the whole screen in portrait and landscape. Its backing store is
// RENDER_SCALE times the CSS size (zoom shrinks it back) so art stays sharp on high-DPI phones;
// main.ts resizes it whenever the screen size or orientation changes.
const initial = viewportSize();

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: toCss(PAL.grass),
  antialias: true,
  scale: {
    mode: Phaser.Scale.NONE,
    width: initial.width * RENDER_SCALE,
    height: initial.height * RENDER_SCALE,
    zoom: 1 / RENDER_SCALE,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, ClinicScene],
};
