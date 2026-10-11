import Phaser from "phaser";

/** Player avatar: a body sprite plus a rotating arrow that snaps to 8 facing directions. */
export default class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  private arrow: Phaser.GameObjects.Image;
  private lastFacingAngle = -90; // facing up by default

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const bodySprite = scene.add.image(0, 0, "player-body");
    this.arrow = scene.add.image(0, -22, "player-arrow");
    this.arrow.setRotation(Phaser.Math.DegToRad(this.lastFacingAngle + 90));

    this.add([bodySprite, this.arrow]);
    this.setSize(36, 36);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCircle(16, -16, -16);
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
    const snapped = Math.round(rawAngle / 45) * 45;
    this.lastFacingAngle = snapped;
    this.arrow.setRotation(Phaser.Math.DegToRad(snapped + 90));
  }

  teleportTo(x: number, y: number): void {
    this.setPosition(x, y);
    this.body.reset(x, y);
  }
}
