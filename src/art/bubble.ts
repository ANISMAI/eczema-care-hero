import Phaser from "phaser";
import { textStyle } from "./environment";
import { PAL } from "./palette";

/**
 * A small speech bubble over someone's head for background chatter (visitors and staff talking
 * to each other). Purely visual: never takes input focus. Fades out after `ms`.
 */
export function speechBubble(scene: Phaser.Scene, x: number, y: number, text: string, ms: number, staff = false): Phaser.GameObjects.Container {
  const label = scene.add.text(0, 0, text, { ...textStyle(9, "#23364f", "800"), wordWrap: { width: 120 }, align: "center" }).setOrigin(0.5);
  const w = Math.max(40, label.width + 14);
  const h = label.height + 10;
  const g = scene.add.graphics();
  g.fillStyle(PAL.shadow, 0.2);
  g.fillRoundedRect(-w / 2, -h / 2 + 2, w, h, 8);
  g.fillStyle(staff ? 0xeef5ff : 0xffffff, 1);
  g.lineStyle(1.5, staff ? 0x2f7fe0 : 0xb9c3cf, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  g.fillStyle(staff ? 0xeef5ff : 0xffffff, 1);
  g.fillTriangle(-5, h / 2 - 1, 5, h / 2 - 1, 0, h / 2 + 6);
  const box = scene.add.container(x, y - h / 2 - 6, [g, label]).setDepth(6050).setAlpha(0);
  scene.tweens.add({ targets: box, alpha: 1, y: box.y - 4, duration: 180 });
  scene.time.delayedCall(ms, () => {
    scene.tweens.add({ targets: box, alpha: 0, duration: 250, onComplete: () => box.destroy() });
  });
  return box;
}
