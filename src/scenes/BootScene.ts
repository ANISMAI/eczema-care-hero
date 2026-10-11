import Phaser from "phaser";

/**
 * Generates all placeholder art at runtime (colored shapes) so Phase 1 ships with
 * zero external image assets. Replace each generateTexture call with a loaded
 * spritesheet/image in a later phase — see README "Replacing placeholder art".
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.makePlayerBody();
    this.makePlayerArrow();
    this.makeMarker("npc-marker", 0xef6c9b);
    this.makeMarker("object-marker", 0x4a90d9);
    this.makeWallTexture();

    this.scene.start("ClinicScene");
  }

  private makePlayerBody(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x2c7a7b, 1);
    g.fillCircle(18, 18, 18);
    g.lineStyle(3, 0xffffff, 1);
    g.strokeCircle(18, 18, 18);
    g.generateTexture("player-body", 36, 36);
    g.destroy();
  }

  private makePlayerArrow(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(6, 0, 12, 10, 0, 10);
    g.generateTexture("player-arrow", 12, 10);
    g.destroy();
  }

  private makeMarker(key: string, color: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, 40, 40, 10);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeRoundedRect(0, 0, 40, 40, 10);
    g.generateTexture(key, 40, 40);
    g.destroy();
  }

  private makeWallTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x4a3f6b, 1);
    g.fillRect(0, 0, 16, 16);
    g.generateTexture("wall", 16, 16);
    g.destroy();
  }
}
