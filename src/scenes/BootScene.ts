import Phaser from "phaser";
import { FONT_FAMILY } from "../game/display";
import { ALL_SHEETS, WALK_SHEETS } from "../data/assets";

/**
 * Boot step: loads any image assets listed in src/data/assets.ts. Everything else is vector
 * Graphics drawn in src/art/, and anything that fails to load falls back to that art.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`[assets] could not load ${file.key} (${file.url}) — using placeholder art`);
    });

    for (const sheet of ALL_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
  }

  create(): void {
    this.createCharacterAnims();

    // Give the (optional) web font a moment so in-world labels don't render in a fallback face.
    const ready = document.fonts?.load(`800 12px ${FONT_FAMILY}`) ?? Promise.resolve();
    Promise.race([ready, new Promise((r) => setTimeout(r, 800))]).finally(() => {
      this.scene.start("ClinicScene");
    });
  }

  /** Walk cycle per direction: stand → step A → stand → step B. */
  private createCharacterAnims(): void {
    for (const sheet of WALK_SHEETS) {
      if (!this.textures.exists(sheet.key)) continue;
      for (const [dir, row] of Object.entries(sheet.rows)) {
        const first = row * 3;
        this.anims.create({
          key: `${sheet.key}-walk-${dir}`,
          frames: this.anims.generateFrameNumbers(sheet.key, { frames: [first, first + 1, first, first + 2] }),
          frameRate: sheet.frameRate,
          repeat: -1,
        });
      }
    }
  }
}
