import Phaser from "phaser";
import { FONT_FAMILY } from "../game/display";

/**
 * Boot step. Phase 1 ships with zero image assets — all art is vector Graphics drawn in
 * src/art/. When real sprites arrive, load them here in preload() (see README).
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    // Give the (optional) web font a moment so in-world labels don't render in a fallback face.
    const ready = document.fonts?.load(`800 12px ${FONT_FAMILY}`) ?? Promise.resolve();
    Promise.race([ready, new Promise((r) => setTimeout(r, 800))]).finally(() => {
      this.scene.start("ClinicScene");
    });
  }
}
