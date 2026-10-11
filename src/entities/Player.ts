import Phaser from "phaser";
import { drawStaff, type Facing } from "../art/characters";
import { PAL } from "../art/palette";
import { PLAYER_RADIUS } from "../data/rooms";

/**
 * Player avatar. The container's position is the point between the feet, which is also the
 * centre of the circular collision body. Facing is tracked in 8 directions (lastFacingAngle)
 * and shown with the nearest of the down / up / side drawings.
 */
export default class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  private sprite: Phaser.GameObjects.Graphics;
  private facing: Facing = "down";
  private flipped = false;
  private walkTime = 0;
  lastFacingAngle = 90; // facing down by default

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const shadow = scene.add.graphics();
    shadow.fillStyle(PAL.shadow, 0.18);
    shadow.fillEllipse(0, 2, 26, 9);

    this.sprite = scene.add.graphics();
    drawStaff(this.sprite, this.facing);

    this.add([shadow, this.sprite]);
    this.setSize(PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCircle(PLAYER_RADIUS);
    this.body.setCollideWorldBounds(true);
  }

  setVelocity(vx: number, vy: number): void {
    this.body.setVelocity(vx, vy);
    if (vx !== 0 || vy !== 0) {
      this.updateFacing(vx, vy);
    }
  }

  private updateFacing(vx: number, vy: number): void {
    const rawAngle = Phaser.Math.RadToDeg(Math.atan2(vy, vx));
    this.lastFacingAngle = Math.round(rawAngle / 45) * 45;

    const facing: Facing = Math.abs(vx) > Math.abs(vy) * 1.2 ? "side" : vy < 0 ? "up" : "down";
    const flipped = facing === "side" && vx < 0;
    if (facing !== this.facing) {
      this.facing = facing;
      drawStaff(this.sprite, facing);
    }
    if (flipped !== this.flipped) {
      this.flipped = flipped;
      this.sprite.setScale(flipped ? -1 : 1, 1);
    }
  }

  /** Walk bob + depth sorting; call once per frame. */
  tick(deltaMs: number): void {
    const moving = this.body.velocity.lengthSq() > 1;
    if (moving) {
      this.walkTime += deltaMs;
      const phase = this.walkTime / 90;
      this.sprite.y = -Math.abs(Math.sin(phase)) * 3;
      this.sprite.rotation = Math.sin(phase) * 0.06;
    } else {
      this.walkTime = 0;
      this.sprite.y = 0;
      this.sprite.rotation = 0;
    }
    this.setDepth(this.y + PLAYER_RADIUS);
  }

  teleportTo(x: number, y: number): void {
    this.setPosition(x, y);
    this.body.reset(x, y);
  }
}
