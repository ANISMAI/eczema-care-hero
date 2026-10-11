import Phaser from "phaser";
import Player from "../entities/Player";
import { PLAYER_WALK_SPEED } from "../data/assets";

const SPEED = PLAYER_WALK_SPEED;

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

  /** True while the player is pushing the joystick or a movement key. */
  hasInput(): boolean {
    const { x, y } = this.read();
    return x !== 0 || y !== 0;
  }

  update(): void {
    const { x, y } = this.read();
    this.player.setVelocity(x * SPEED, y * SPEED);
  }

  private read(): { x: number; y: number } {
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

    return { x: vx, y: vy };
  }
}
