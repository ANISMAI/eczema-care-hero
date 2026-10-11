import Phaser from "phaser";
import { PAL, shade } from "./palette";
import type Player from "../entities/Player";
import type { Point } from "../data/rooms";

// Small in-world animations for the toilet: the cubicle door swinging open / shut while the
// doctor walks in or out, and water running from the sink tap.

const wait = (scene: Phaser.Scene, ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, () => r()));

function tween(scene: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  return new Promise((resolve) => scene.tweens.add({ ...cfg, onComplete: () => resolve() }));
}

/** Door panel drawn over the cubicle; `bottom` is the cubicle's floor line (centre x). */
function makeDoor(scene: Phaser.Scene, bottom: Point): Phaser.GameObjects.Container {
  const panel = 0xdcd5ec;
  const g = scene.add.graphics();
  // drawn from the hinge (left edge, x = 0) so scaleX swings it open
  g.fillStyle(panel, 1);
  g.fillRoundedRect(0, -76, 48, 72, 3);
  g.lineStyle(2, shade(panel, -0.35), 1);
  g.strokeRoundedRect(0, -76, 48, 72, 3);
  g.fillStyle(0xffffff, 0.35);
  g.fillRect(2, -74, 4, 66);
  g.fillStyle(PAL.lavenderDark, 1);
  g.fillRect(38, -44, 4, 10);
  const occupied = scene.add.graphics();
  occupied.fillStyle(0xe8586f, 1);
  occupied.fillCircle(40, -52, 2.5);
  occupied.setVisible(false);

  // inside of the cubicle, seen while the door is open
  const inside = scene.add.graphics();
  const ink = 0x3d3550;
  inside.fillStyle(0xeef1f7, 1);
  inside.fillRect(0, -76, 48, 72);
  inside.lineStyle(1, 0xd6dce8, 1);
  for (let y = -66; y < -4; y += 10) inside.lineBetween(0, y, 48, y);
  for (let x = 12; x < 48; x += 12) inside.lineBetween(x, -76, x, -4);
  inside.fillStyle(0xdfe4ee, 1);
  inside.fillRect(0, -16, 48, 12); // floor
  inside.fillStyle(0x3d3550, 0.12);
  inside.fillRect(0, -76, 48, 5); // shadow under the top
  // cistern + bowl
  inside.fillStyle(0xffffff, 1);
  inside.lineStyle(1.5, ink, 1);
  inside.fillRoundedRect(15, -58, 20, 13, 3);
  inside.strokeRoundedRect(15, -58, 20, 13, 3);
  inside.fillStyle(0xa7b6c9, 1);
  inside.fillRect(31, -55, 3, 2); // flush lever
  inside.fillStyle(0xffffff, 1);
  inside.fillRoundedRect(17, -45, 16, 6, 2);
  inside.strokeRoundedRect(17, -45, 16, 6, 2);
  inside.fillEllipse(25, -29, 22, 16);
  inside.strokeEllipse(25, -29, 22, 16);
  inside.fillStyle(0xcfe8f6, 1);
  inside.fillEllipse(25, -29, 13, 8); // water
  inside.lineStyle(2, 0xbba8e5, 1);
  inside.strokeEllipse(25, -29, 18, 12); // seat
  inside.fillStyle(0xffffff, 1);
  inside.lineStyle(1.2, ink, 1);
  inside.fillRect(22, -21, 6, 7); // pedestal
  inside.strokeRect(22, -21, 6, 7);
  // tissue roll on the right wall (the door hinges on the left), paper hanging down
  inside.fillStyle(0xa7b6c9, 1);
  inside.fillRect(36, -50, 9, 2); // holder
  inside.fillStyle(0xffffff, 1);
  inside.lineStyle(1.2, ink, 1);
  inside.fillCircle(40.5, -45, 4.5);
  inside.strokeCircle(40.5, -45, 4.5);
  inside.fillStyle(0xd6dce8, 1);
  inside.fillCircle(40.5, -45, 1.5);
  inside.fillStyle(0xffffff, 1);
  inside.fillRect(36, -45, 3.5, 13);
  inside.lineStyle(0.8, 0xc4ccd9, 1);
  inside.strokeRect(36, -45, 3.5, 13);
  inside.lineBetween(36, -37, 39.5, -37);

  const c = scene.add.container(bottom.x - 24, bottom.y, [inside, g, occupied]).setDepth(bottom.y + 1);
  c.setData("door", g);
  c.setData("occupied", occupied);
  return c;
}

/**
 * Door opens, the doctor walks in (enter) or out (exit), door closes.
 * `inside` is where the doctor stands inside the cubicle, `outside` in front of it.
 */
export async function stallSequence(
  scene: Phaser.Scene,
  player: Player,
  bottom: Point,
  outside: Point,
  enter: boolean
): Promise<void> {
  const door = makeDoor(scene, bottom);
  const inside = { x: bottom.x, y: bottom.y - 6 };
  // let the tween move the avatar (physics would fight it), restored at the end
  player.body.moves = false;
  if (!enter) {
    player.teleportTo(inside.x, inside.y);
    player.setVisible(false);
  }
  // only the door leaf (and its occupied light) swings; the inside stays put
  const leaf = [door.getData("door"), door.getData("occupied")];
  await tween(scene, { targets: leaf, scaleX: 0.12, duration: 280, ease: "Sine.easeOut" });
  if (enter) {
    player.face("up", true); // walk into the cubicle
    await tween(scene, { targets: player, x: inside.x, y: inside.y, duration: 420, ease: "Sine.easeInOut" });
    player.face("down");
    player.body.reset(inside.x, inside.y);
    player.setVisible(false);
  } else {
    player.setVisible(true);
    player.face("down", true); // walk out facing forward
    await tween(scene, { targets: player, x: outside.x, y: outside.y, duration: 420, ease: "Sine.easeInOut" });
    player.face("down");
    player.body.reset(outside.x, outside.y);
  }
  (door.getData("occupied") as Phaser.GameObjects.Graphics).setVisible(enter);
  await tween(scene, { targets: leaf, scaleX: 1, duration: 260, ease: "Sine.easeIn" });
  await wait(scene, 150);
  door.destroy();
  player.body.moves = true;
}

/** Water runs from the sink tap for `ms`; `bottom` is the sink's floor line (centre x). */
export async function runTap(scene: Phaser.Scene, bottom: Point, ms: number): Promise<void> {
  const spout = { x: bottom.x - 6, y: bottom.y - 53 };
  const basinY = bottom.y - 41;
  const stream = scene.add.graphics().setDepth(bottom.y + 2);
  const drops: Phaser.GameObjects.Arc[] = [];
  let t = 0;
  const timer = scene.time.addEvent({
    delay: 50,
    loop: true,
    callback: () => {
      t += 1;
      stream.clear();
      stream.fillStyle(0x3d9be0, 0.9);
      stream.fillRoundedRect(spout.x - 3 + Math.sin(t) * 0.5, spout.y, 6, basinY - spout.y, 3);
      stream.fillStyle(0xbfe6fb, 0.9);
      stream.fillRect(spout.x - 1, spout.y, 2, basinY - spout.y);
      stream.fillStyle(0xffffff, 0.9);
      stream.fillRect(spout.x - 1, spout.y + ((t * 3) % 10), 2, 3);
      // splash
      stream.lineStyle(2, 0x5fb0ea, 0.9);
      stream.strokeEllipse(spout.x, basinY, 14 + (t % 3) * 4, 5 + (t % 3));
      if (t % 2 === 0) {
        const d = scene.add.circle(spout.x + (Math.random() - 0.5) * 16, basinY - 1, 2, 0x7fc4ef).setDepth(bottom.y + 3);
        drops.push(d);
        scene.tweens.add({ targets: d, y: basinY - 5 - Math.random() * 4, alpha: 0, duration: 380, onComplete: () => d.destroy() });
      }
    },
  });
  await wait(scene, ms);
  timer.remove();
  stream.destroy();
  drops.forEach((d) => d.active && d.destroy());
}
