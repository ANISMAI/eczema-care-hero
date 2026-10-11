import Phaser from "phaser";
import BootScene from "../scenes/BootScene";
import ClinicScene from "../scenes/ClinicScene";

// Reference portrait size per brief (390 x 844 CSS px); Scale.FIT scales to the real
// device size without cropping, letterboxing instead of stretching.
export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#1b1230",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
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
