import Phaser from "phaser";
import type { InteractableDef } from "../data/rooms";

/** One printer and one reusable effect object; no particle emitters or new collisions. */
export default class IncidentArt {
  private effects: Phaser.GameObjects.Graphics;
  private printer?: InteractableDef;
  private coffee?: InteractableDef;
  private elapsed = 0;
  private frame = -1;
  private lastId: string | null = null;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(scene: Phaser.Scene, printer?: InteractableDef, coffee?: InteractableDef) {
    this.printer = printer;
    this.coffee = coffee;
    if (printer) {
      const g = scene.add.graphics().setPosition(printer.x, printer.y).setDepth(printer.y + 12);
      g.fillStyle(0x40536c).fillRoundedRect(-22, -24, 44, 30, 5);
      g.fillStyle(0xc8d5e5).fillRoundedRect(-20, -23, 40, 22, 4);
      g.fillStyle(0xffffff).fillRect(-12, -38, 24, 16);
      g.lineStyle(1, 0x91a4bb).lineBetween(-8, -33, 8, -33).lineBetween(-8, -29, 8, -29);
      g.fillStyle(0x27354a).fillRoundedRect(-14, -6, 28, 6, 2);
      g.fillStyle(0x69cfaf).fillCircle(13, -16, 2.5);
    }
    this.effects = scene.add.graphics();
  }

  update(deltaMs: number, id: string | null, paused: boolean): void {
    if (id === null && this.lastId === null) return;
    if (!paused && !this.reduced) this.elapsed += deltaMs;
    const frame = Math.floor(this.elapsed / 160);
    if (this.lastId === id && this.frame === frame) return;
    this.lastId = id;
    this.frame = frame;
    const g = this.effects.clear();
    if (id === "cockroach-panic" && this.coffee) {
      const x = this.coffee.x + 16 + Math.sin(frame * 0.7) * 10;
      const y = this.coffee.y + 28 + Math.cos(frame * 0.9) * 5;
      g.setDepth(y + 2);
      g.lineStyle(1.5, 0x62432f);
      for (let i = -1; i <= 1; i++) {
        g.lineBetween(x - 3, y + i * 3, x - 8, y + i * 5);
        g.lineBetween(x + 3, y + i * 3, x + 8, y + i * 5);
      }
      g.fillStyle(0xb98758).fillEllipse(x, y, 9, 14);
      g.fillStyle(0xd4aa76).fillCircle(x, y - 7, 4);
    } else if (id === "printer-panic" && this.printer) {
      g.setDepth(this.printer.y + 13);
      for (let i = 0; i < 4; i++) {
        const step = (frame + i * 3) % 12;
        const x = this.printer.x - 24 + i * 14;
        const y = this.printer.y + 3 + step * 2;
        g.fillStyle(0xffffff, 0.9).fillRect(x, y, 9, 12);
        g.lineStyle(1, 0x9eb0c7).lineBetween(x + 2, y + 4, x + 7, y + 4);
      }
    }
  }
}
