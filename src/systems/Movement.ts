import Phaser from "phaser";
import Player from "../entities/Player";

const SPEED = 180;

/** Combines virtual-joystick and keyboard input into 8-direction player velocity. */
export default class MovementSystem {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { w: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key };
  private joystickVector: { x: number; y: number } = { x: 0, y: 0 };
  private player: Player;

  constructor(scene: Phaser.Scene, player: Player) {
    this.player = player;
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      w: scene.input.keyboard!.addKey("W"),
      a: scene.input.keyboard!.addKey("A"),
      s: scene.input.keyboard!.addKey("S"),
      d: scene.input.keyboard!.addKey("D"),
    };
  }

  setJoystickVector(x: number, y: number): void {
    this.joystickVector = { x, y };
  }

  update(): void {
    let vx = this.joystickVector.x;
    let vy = this.joystickVector.y;

    if (vx === 0 && vy === 0) {
      if (this.cursors.left?.isDown || this.wasd.a.isDown) vx -= 1;
      if (this.cursors.right?.isDown || this.wasd.d.isDown) vx += 1;
      if (this.cursors.up?.isDown || this.wasd.w.isDown) vy -= 1;
      if (this.cursors.down?.isDown || this.wasd.s.isDown) vy += 1;
    }

    const len = Math.hypot(vx, vy);
    if (len > 1) {
      vx /= len;
      vy /= len;
    }

    this.player.setVelocity(vx * SPEED, vy * SPEED);
  }
}
