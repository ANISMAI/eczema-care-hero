import Phaser from "phaser";
import { textStyle } from "./environment";
import { PAL } from "./palette";

/**
 * A small bobbing pill with a pointer, floated above an interactable: "NEXT" for the patient
 * case, "!" for an optional clinic event. Hidden until positioned.
 */
export function makeWorldTag(scene: Phaser.Scene, label: string, color: number, width = 54): Phaser.GameObjects.Container {
  const hw = width / 2;
  const bg = scene.add.graphics();
  bg.fillStyle(PAL.shadow, 0.3);
  bg.fillRoundedRect(-hw, -9, width, 21, 10);
  bg.fillStyle(color, 1);
  bg.fillRoundedRect(-hw, -11, width, 21, 10);
  bg.lineStyle(2, 0xffffff, 1);
  bg.strokeRoundedRect(-hw, -11, width, 21, 10);
  bg.fillStyle(color, 1);
  bg.fillTriangle(-6, 9, 6, 9, 0, 16);
  const text = scene.add.text(0, -1, label, textStyle(label.length > 1 ? 10 : 14, "#ffffff", "900")).setOrigin(0.5);
  const bob = scene.add.container(0, 0, [bg, text]);
  scene.tweens.add({ targets: bob, y: -6, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  return scene.add.container(0, 0, [bob]).setDepth(6100).setVisible(false);
}
