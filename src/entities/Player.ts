import Phaser from "phaser";
import { drawStaff, type Facing } from "../art/characters";
import { PAL } from "../art/palette";
import { PLAYER_RADIUS } from "../data/rooms";
import type { CharacterDirection, CharacterSheet } from "../data/assets";

/**
 * Player avatar. The container's position is the point between the feet, which is also the
 * centre of the circular collision body. Facing is tracked in 8 directions (lastFacingAngle)
 * and shown with the nearest of 4 directions.
 *
 * Uses the chosen character's walk-cycle spritesheet when it loaded, otherwise the vector
 * placeholder. The character can be swapped at any time with setCharacter().
 */
export default class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  private sheet: CharacterSheet | null = null;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private vector: Phaser.GameObjects.Graphics | null = null;
  private direction: CharacterDirection = "down";
  private walkTime = 0;
  private wasMoving = false;
  lastFacingAngle = 90; // facing down by default

  constructor(scene: Phaser.Scene, x: number, y: number, sheet: CharacterSheet | null) {
    super(scene, x, y);

    const shadow = scene.add.graphics();
    shadow.fillStyle(PAL.shadow, 0.22);
    shadow.fillEllipse(0, 1, 30, 10);
    this.add(shadow);
    this.setCharacter(sheet);

    this.setSize(PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCircle(PLAYER_RADIUS);
    this.body.setCollideWorldBounds(true);
  }

  /** Switches the avatar's art, keeping position and facing. */
  setCharacter(sheet: CharacterSheet | null): void {
    this.sprite?.destroy();
    this.vector?.destroy();
    this.sprite = null;
    this.vector = null;

    if (sheet && this.scene.textures.exists(sheet.key)) {
      this.sheet = sheet;
      this.sprite = this.scene.add.sprite(0, 2, sheet.key, sheet.rows[this.direction] * 3);
      this.sprite.setOrigin(0.5, (sheet.frameHeight - sheet.padding) / sheet.frameHeight);
      this.sprite.setScale(sheet.displayHeight / sheet.contentHeight);
      this.add(this.sprite);
    } else {
      this.sheet = null;
      this.vector = this.scene.add.graphics();
      this.drawVector();
      this.add(this.vector);
    }
    this.wasMoving = true; // re-apply the idle frame / walk state on the next tick
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

    const dir: CharacterDirection =
      Math.abs(vx) > Math.abs(vy) * 1.2 ? (vx < 0 ? "left" : "right") : vy < 0 ? "up" : "down";
    if (dir === this.direction) return;
    this.direction = dir;
    if (this.vector) this.drawVector();
  }

  private drawVector(): void {
    if (!this.vector) return;
    const facing: Facing = this.direction === "left" || this.direction === "right" ? "side" : this.direction;
    drawStaff(this.vector, facing);
    this.vector.setScale(this.direction === "left" ? -1 : 1, 1);
  }

  /** Walk animation + depth sorting; call once per frame. */
  tick(deltaMs: number): void {
    const moving = this.body.velocity.lengthSq() > 1;

    if (this.sprite && this.sheet) {
      if (moving) {
        this.sprite.anims.play(`${this.sheet.key}-walk-${this.direction}`, true);
      } else if (this.wasMoving) {
        this.sprite.anims.stop();
        this.sprite.setFrame(this.sheet.rows[this.direction] * 3);
      }
    } else if (this.vector) {
      if (moving) {
        this.walkTime += deltaMs;
        const phase = this.walkTime / 90;
        this.vector.y = -Math.abs(Math.sin(phase)) * 3;
        this.vector.rotation = Math.sin(phase) * 0.06;
      } else {
        this.walkTime = 0;
        this.vector.y = 0;
        this.vector.rotation = 0;
      }
    }

    this.wasMoving = moving;
    this.setDepth(this.y + PLAYER_RADIUS);
  }

  teleportTo(x: number, y: number): void {
    this.setPosition(x, y);
    this.body.reset(x, y);
  }
}
